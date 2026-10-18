#!/usr/bin/env node
// shipreel: drive the local Shipreel app from a terminal, a script, or an agent's Bash tool.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { APP_ROOT, BASE, boot, CHROME_PLATFORMS, get, handoff, patch, post, postKit, projectId, put, readJsonFile, readyVideos, ShipreelError, waitPost, waitRender, waitRun } from "./lib.mjs";

const HELP = `shipreel: marketing videos for your app, from the terminal (talks to the Shipreel app at ${BASE})

Usage: shipreel <command> [options]

  start [--dev]                      Start the Shipreel app (http://localhost:4747)
  open                               Open Shipreel in your browser
  status                             Active product, agents and posting setup
  products                           List products          use <id>   Switch the active product
  brief                              Print the active product brief (JSON)
  formats                            Video formats, hot ones first
  hooks [--family reveal]            Hooks filled in for your product
  ideas [--count 10] [--engine instant|claude|codex] [--focus "new feature"]
  make <format> [--hook "…"]         Build a video from a format (prints its id and editor link)
  clone <url>                        Rebuild a viral TikTok/Reel/Short's format for your app (Claude)
  videos                             List videos
  spec <video> [--set spec.json]     Print (or replace) a video's JSON spec
  edit <video> "instruction" [--engine claude|codex]   Let an agent edit the video (waits)
  render <video> [--wait]            Render the MP4 (--wait prints the file path)
  post <video> [--at next|now|2026-10-20T19:00] [--now] [--platforms tiktok,instagram]
               [--provider upload-post|bluesky|webhook|browser|manual] [--no-draft]
  posts                              Upcoming and recent posts
  post-status <post>                 One post's status, results and log

Posting by hand (easiest first):
  ready                              Rendered videos with no post yet, with captions
  kit <video> [--platform tiktok]    MP4 path, cover and the caption for each platform
  phone <video> [--photos] [--platform tiktok] [--dry-run]
                                     AirDrop to your iPhone (or save to Photos), caption copied
  upload-page <video> --platform tiktok
                                     Open the web upload page, caption copied, MP4 shown in Finder
  chrome <video> --platform tiktok [--auto-post]
                                     Fill the upload in Shipreel's Chrome window; stops before Post
  queue <video> [<video>…] [--per-day 1] [--platforms …] [--provider …]
                                     Spread videos across the next days at your posting times
  connect                            Test Upload-Post and Bluesky (posts nothing)

Review & auto-post (approve in the Shipreel Mac app; Postbox posts it):
  create "3 videos about …" [--count 3] [--formats a,b]
                                     Claude makes, renders and submits videos to Review (streams its output)
  review [--status pending|approved|rejected|revising|all]
                                     What's waiting for you (and what was approved, with post status)
  submit <video>                     Put a video in Review
  approve <video> [--when now|next-slot|ISO] [--platforms tiktok,youtube] [--dry-run]
  revise <video> "make the hook shorter"     Claude edits, re-renders, back to pending
  reject <video> ["why"]   reopen <video>
  postbox                            Postbox daemon, Chrome extension and accounts
  mcp                                How to add Shipreel to Claude Code or Codex as an MCP server

Options: --project <id> targets a product other than the active one. --json prints raw JSON.
Env: SHIPREEL_URL (default http://localhost:4747)
`;

// `shipreel ready | head` closes the pipe early: that's fine, not a crash.
process.stdout.on("error", (e) => (e.code === "EPIPE" ? process.exit(0) : undefined));

function parse(argv) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      if (v !== undefined) opt[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith("--")) opt[k] = argv[++i];
      else opt[k] = true;
    } else pos.push(a);
  }
  return { pos, opt };
}

const dim = (s) => (process.stdout.isTTY ? `\x1b[2m${s}\x1b[0m` : s);
const bold = (s) => (process.stdout.isTTY ? `\x1b[1m${s}\x1b[0m` : s);
const green = (s) => (process.stdout.isTTY ? `\x1b[32m${s}\x1b[0m` : s);
const out = (data, opt, pretty) => (opt.json ? console.log(JSON.stringify(data, null, 2)) : pretty(data));

async function main() {
  const { pos, opt } = parse(process.argv.slice(2));
  const [cmd, ...args] = pos;
  switch (cmd) {
    case undefined:
    case "help":
    case "-h":
      console.log(HELP);
      return;

    case "start": {
      // Production server when a build exists (fast); `--dev` for hot reload while hacking on Shipreel.
      const built = existsSync(path.join(APP_ROOT, ".next", "BUILD_ID"));
      const mode = opt.dev || !built ? "dev" : "start";
      console.log(dim(`Starting Shipreel (${mode === "dev" ? "development" : "production"}) at http://localhost:4747 …${!built && !opt.dev ? "  Tip: npm run build once for a faster app." : ""}`));
      // Loopback only: the API can run agents and post for you, so other devices on the network can't reach it.
      const child = spawn("npx", ["next", mode, "-H", "127.0.0.1", "-p", "4747"], { cwd: APP_ROOT, stdio: "inherit" });
      child.on("exit", (code) => process.exit(code ?? 0));
      return;
    }

    case "open": {
      spawn("open", [BASE], { stdio: "ignore", detached: true }).unref();
      return;
    }

    case "status": {
      const b = await boot();
      const active = b.projects.find((p) => p.id === b.activeProjectId);
      out(b, opt, () => {
        console.log(`${bold("Shipreel")} ${dim(BASE)}`);
        console.log(`Product   ${active ? `${active.name} ${dim(`(${active.id})`)}` : "none yet"}`);
        for (const a of b.agents) console.log(`${a.engine === "claude" ? "Claude   " : "Codex    "} ${a.installed ? green(a.version ?? "installed") : dim(a.note ?? "not installed")}${a.loggedIn === false ? " (not signed in)" : ""}${b.settings.engine === a.engine ? dim("  ← default") : ""}`);
        console.log(`Posting   ${b.publishers.filter((p) => p.ok).map((p) => p.label).join(", ") || "manual only"}`);
      });
      return;
    }

    case "products": {
      const b = await boot();
      out(b.projects, opt, (ps) => ps.forEach((p) => console.log(`${p.id === b.activeProjectId ? green("●") : " "} ${p.id.padEnd(22)} ${p.name} ${dim(p.oneLiner ?? "")}`)));
      return;
    }

    case "use": {
      if (!args[0]) throw new ShipreelError("Which product? (shipreel products)");
      await patch(`/api/projects/${args[0]}`, { activate: true });
      console.log(`Active product: ${args[0]}`);
      return;
    }

    case "brief": {
      const pid = await projectId(opt.project);
      const { project } = await get(`/api/projects/${pid}`);
      console.log(JSON.stringify(project, null, 2));
      return;
    }

    case "formats": {
      const fw = await get("/api/framework");
      const order = { hot: 0, steady: 1, saturated: 2 };
      const list = [...fw.formats].sort((a, b) => order[a.status] - order[b.status]);
      out(list, opt, (fs) => fs.forEach((f) => console.log(`${f.status === "hot" ? green("hot ") : f.status === "saturated" ? dim("sat ") : "    "} ${f.id.padEnd(20)} ${f.name.padEnd(24)} ${dim(f.tagline)}`)));
      return;
    }

    case "hooks": {
      const pid = await projectId(opt.project);
      const hooks = await get(`/api/projects/${pid}/hooks${opt.family ? `?family=${encodeURIComponent(opt.family)}` : ""}`);
      out(hooks, opt, (hs) => hs.slice(0, Number(opt.limit ?? 40)).forEach((h) => console.log(`${"●".repeat(h.strength).padEnd(5)} ${h.filled} ${dim(`[${h.family}${h.kind === "example" ? ", real" : ""}]`)}`)));
      return;
    }

    case "ideas": {
      const pid = await projectId(opt.project);
      const engine = opt.engine ?? "instant";
      const res = await post(`/api/projects/${pid}/ideas`, { engine, count: Number(opt.count ?? 10), focus: opt.focus });
      if (res.run) {
        process.stderr.write(dim(`${engine === "codex" ? "Codex" : "Claude"} is writing ideas (run ${res.run.id})…\n`));
        const run = await waitRun(res.run.id, { onEvent: (e) => e.kind === "tool" && process.stderr.write(dim(`  ${e.tool} ${e.detail ?? ""}\n`)) });
        if (run.status !== "done") throw new ShipreelError(run.error ?? "The agent didn't finish.");
        const all = await get(`/api/projects/${pid}/ideas`);
        const ids = new Set(run.output?.ideaIds ?? []);
        return out(all.filter((i) => ids.has(i.id)), opt, printIdeas);
      }
      out(res.ideas ?? [], opt, printIdeas);
      return;
    }

    case "make": {
      const pid = await projectId(opt.project);
      if (!args[0]) throw new ShipreelError("Which format? (shipreel formats)");
      const v = await post(`/api/projects/${pid}/videos`, { formatId: args[0], hook: opt.hook });
      out(v, opt, () => {
        console.log(`${green("Made")} ${v.id}  ${v.spec.title}`);
        console.log(dim(`Edit: ${BASE}/edit/${pid}/${v.id}`));
      });
      return;
    }

    case "clone": {
      const pid = await projectId(opt.project);
      if (!args[0]) throw new ShipreelError("Usage: shipreel clone <tiktok/reel/short url>");
      const run = await post(`/api/projects/${pid}/clone`, { url: args[0] });
      process.stderr.write(dim(`Claude is studying the video (run ${run.id})…\n`));
      const done = await waitRun(run.id, { onEvent: (e) => e.kind === "tool" && process.stderr.write(dim(`  ${e.tool} ${e.detail ?? ""}\n`)) });
      if (done.status !== "done") throw new ShipreelError(done.error ?? "Cloning failed.");
      console.log(`${green("Cloned")} → ${BASE}/edit/${pid}/${done.output?.videoId}`);
      return;
    }

    case "videos": {
      const pid = await projectId(opt.project);
      const vs = await get(`/api/projects/${pid}/videos`);
      out(vs, opt, (list) => list.forEach((v) => console.log(`${v.id.padEnd(16)} ${(v.status === "rendered" ? green("rendered") : v.status).padEnd(v.status === "rendered" ? 17 : 9)} ${v.spec.formatId.padEnd(20)} ${v.spec.title}`)));
      return;
    }

    case "spec": {
      const pid = await projectId(opt.project);
      if (!args[0]) throw new ShipreelError("Which video? (shipreel videos)");
      if (opt.set) {
        const spec = await readJsonFile(path.resolve(String(opt.set)));
        const v = await put(`/api/projects/${pid}/videos/${args[0]}`, { spec });
        console.log(`${green("Saved")} ${v.id} (${v.spec.scenes.length} scenes)`);
        return;
      }
      const v = await get(`/api/projects/${pid}/videos/${args[0]}`);
      console.log(JSON.stringify(v.spec, null, 2));
      return;
    }

    case "edit": {
      const pid = await projectId(opt.project);
      const [vid, ...rest] = args;
      const instruction = rest.join(" ").trim();
      if (!vid || !instruction) throw new ShipreelError('Usage: shipreel edit <video> "make the hook punchier"');
      const run = await post(`/api/projects/${pid}/videos/${vid}/ai`, { instruction, engine: opt.engine });
      process.stderr.write(dim(`${run.engine === "codex" ? "Codex" : "Claude"} is editing (run ${run.id})…\n`));
      const done = await waitRun(run.id, { onEvent: (e) => e.kind === "tool" && process.stderr.write(dim(`  ${e.tool} ${e.detail ?? ""}\n`)) });
      if (done.status !== "done") throw new ShipreelError(done.error ?? "The edit failed.");
      console.log(`${green("Edited")} ${vid}. Open: ${BASE}/edit/${pid}/${vid}`);
      return;
    }

    case "render": {
      const pid = await projectId(opt.project);
      if (!args[0]) throw new ShipreelError("Which video?");
      await post(`/api/projects/${pid}/videos/${args[0]}/render`, { force: !!opt.force });
      if (!opt.wait) return console.log(`Rendering ${args[0]}… (add --wait to block until done)`);
      const v = await waitRender(pid, args[0]);
      const where = await get("/api/framework?paths=1");
      console.log(path.join(where.workspace, "projects", pid, v.render.file));
      return;
    }

    case "post": {
      const pid = await projectId(opt.project);
      if (!args[0]) throw new ShipreelError("Which video?");
      const p = await post(`/api/projects/${pid}/posts`, {
        videoId: args[0],
        scheduledAt: opt.now ? "now" : opt.at ?? "next",
        platforms: opt.platforms ? String(opt.platforms).split(",") : undefined,
        provider: opt.provider,
        asDraft: opt["no-draft"] ? false : undefined,
      });
      out(p, opt, () => console.log(`${green("Scheduled")} ${p.id} for ${new Date(p.scheduledAt).toLocaleString()} → ${p.platforms.join(", ")} via ${p.provider}${p.asDraft ? " (TikTok as draft)" : ""}`));
      return;
    }

    case "posts": {
      const pid = await projectId(opt.project);
      const ps = await get(`/api/projects/${pid}/posts`);
      out(ps, opt, (list) => list.forEach((p) => console.log(`${new Date(p.scheduledAt).toLocaleString().padEnd(24)} ${p.status.padEnd(10)} ${p.platforms.join(",").padEnd(24)} ${p.videoId}${p.metrics?.views != null ? dim(`  ${p.metrics.views.toLocaleString()} views`) : ""}`)));
      return;
    }

    case "post-status": {
      const pid = await projectId(opt.project);
      if (!args[0]) throw new ShipreelError("Which post? (shipreel posts --json)");
      const p = (await get(`/api/projects/${pid}/posts`)).find((x) => x.id === args[0]);
      if (!p) throw new ShipreelError(`Post ${args[0]} not found`);
      out(p, opt, () => printPost(p, 12));
      return;
    }

    case "ready": {
      const pid = await projectId(opt.project);
      const list = await readyVideos(pid);
      if (opt.json) {
        const kits = await Promise.all(list.map((v) => postKit(pid, v.id)));
        return console.log(JSON.stringify(kits, null, 2));
      }
      if (!list.length) return console.log("Nothing ready: every rendered video already has a post. (shipreel videos)");
      for (const v of list) {
        const k = await postKit(pid, v.id);
        console.log(`${bold(v.id)}  ${v.spec.title}${k.stale ? dim("  (changed since render)") : ""}`);
        console.log(dim(`  ${k.file}`));
        console.log(`  ${k.captions.tiktok.replace(/\n/g, " ").slice(0, 160)}`);
      }
      return;
    }

    case "kit": {
      const pid = await projectId(opt.project);
      if (!args[0]) throw new ShipreelError("Which video?");
      const k = await postKit(pid, args[0]);
      out(k, opt, () => {
        if (!k.ready) console.log(k.file ? "Changed since the last render: shipreel render <video> --wait" : "Not rendered yet: shipreel render <video> --wait");
        if (k.file) console.log(`${bold("File")}   ${k.file}`);
        if (k.cover) console.log(`${bold("Cover")}  ${k.cover}`);
        const ps = opt.platform ? [String(opt.platform)] : Object.keys(k.captions);
        for (const p of ps) console.log(`\n${bold(p)}  ${dim(k.uploadPages[p] ?? "")}\n${k.captions[p] ?? ""}`);
      });
      return;
    }

    case "phone": {
      const pid = await projectId(opt.project);
      if (!args[0]) throw new ShipreelError("Which video?");
      const r = await handoff(pid, args[0], opt.photos ? "photos" : "airdrop", { platform: opt.platform ?? "tiktok", dryRun: !!opt["dry-run"] });
      out(r, opt, () => console.log(`${green("✓")} ${r.detail}${r.copied ? ` ${dim("Caption copied.")}` : ""}`));
      return;
    }

    case "upload-page":
    case "open-upload": {
      const pid = await projectId(opt.project);
      if (!args[0]) throw new ShipreelError("Which video?");
      const r = await handoff(pid, args[0], "open", { platform: opt.platform ?? "tiktok" });
      out(r, opt, () => console.log(`${green("✓")} ${r.detail}\n${dim(r.url)}`));
      return;
    }

    case "chrome": {
      const pid = await projectId(opt.project);
      const platform = String(opt.platform ?? "tiktok");
      if (!args[0]) throw new ShipreelError("Which video?");
      if (!CHROME_PLATFORMS.includes(platform)) throw new ShipreelError(`Chrome uploads cover ${CHROME_PLATFORMS.join(", ")}. Try: shipreel upload-page ${args[0]} --platform ${platform}`);
      const p = await post(`/api/projects/${pid}/posts`, { videoId: args[0], platforms: [platform], scheduledAt: "now", provider: "browser", autoPost: !!opt["auto-post"] });
      process.stderr.write(dim(`Filling in ${platform} in Shipreel's Chrome window (post ${p.id})…\n`));
      const done = await waitPost(pid, p.id, { onLog: (l) => !/^Scheduled for/.test(l) && process.stderr.write(dim(`  ${l}\n`)) });
      out(done, opt, () => printPost(done, 0));
      return;
    }

    case "queue": {
      const pid = await projectId(opt.project);
      const ids = args.length ? args : (await readyVideos(pid)).map((v) => v.id);
      if (!ids.length) throw new ShipreelError("Nothing to queue: no rendered videos without a post.");
      const ps = await post(`/api/projects/${pid}/posts/batch`, {
        videoIds: ids,
        perDay: Number(opt["per-day"] ?? 1),
        platforms: opt.platforms ? String(opt.platforms).split(",") : undefined,
        provider: opt.provider,
        asDraft: opt["no-draft"] ? false : undefined,
      });
      out(ps, opt, () => ps.forEach((p) => console.log(`${green("Scheduled")} ${new Date(p.scheduledAt).toLocaleString().padEnd(24)} ${p.videoId}  → ${p.platforms.join(",")} via ${p.provider}`)));
      return;
    }

    case "connect": {
      const [up, bsky] = await Promise.all([post("/api/publishers", { action: "test-upload-post" }), post("/api/publishers", { action: "test-bluesky" })]);
      out({ uploadPost: up, bluesky: bsky }, opt, () => {
        console.log(`${bold("Upload-Post")}  ${up.ok ? green(up.message) : up.message}`);
        console.log(`${bold("Bluesky")}      ${bsky.ok ? green(bsky.message) : bsky.message}`);
        if (!up.ok) console.log(dim(`Set up: ${BASE}/settings#connect`));
      });
      return;
    }

    case "create": {
      const prompt = args.join(" ").trim();
      if (!prompt) throw new ShipreelError('Usage: shipreel create "2 videos about the new widget" [--count 2] [--formats found-this]');
      const { runId } = await post("/api/create", { prompt, projectId: opt.project, count: opt.count ? Number(opt.count) : undefined, formats: opt.formats ? String(opt.formats).split(",") : undefined });
      process.stderr.write(dim(`Claude is making videos (run ${runId}); they land in Review.\n`));
      let seen = 0;
      for (;;) {
        const r = await get(`/api/create/${runId}`);
        const lines = r.output ? r.output.split("\n") : [];
        for (const l of lines.slice(seen)) console.log(l);
        seen = lines.length;
        if (r.status !== "running") {
          console.log(`${r.status === "done" ? green("Done") : "Failed"}: ${r.videoIds.length ? r.videoIds.join(", ") : "no videos"}${r.videoIds.length ? dim("  (shipreel review)") : ""}`);
          if (r.status !== "done") process.exitCode = 1;
          return;
        }
        await new Promise((res) => setTimeout(res, 1500));
      }
    }

    case "review": {
      const q = new URLSearchParams({ status: String(opt.status ?? "pending") });
      if (opt.project) q.set("projectId", String(opt.project));
      const r = await get(`/api/review?${q}`);
      out(r, opt, () => {
        console.log(dim(Object.entries(r.counts).map(([k, v]) => `${k} ${v}`).join(" · ")));
        if (!r.items.length) return console.log("Nothing here.");
        for (const i of r.items) {
          console.log(`${bold(i.videoId)}  ${i.review.status.padEnd(9)} ${i.formatId.padEnd(16)} ${i.hook.replace(/\s+/g, " ").slice(0, 70)}${dim(`  ${i.projectId}`)}`);
          if (i.review.note) console.log(dim(`  note: ${i.review.note.replace(/\s+/g, " ").slice(0, 120)}`));
          if (i.post) console.log(dim(`  post ${i.post.id}: ${i.post.status}${i.post.dryRun ? " (dry run)" : ""} ${new Date(i.post.scheduledAt).toLocaleString()}`));
        }
      });
      return;
    }

    case "submit":
    case "approve":
    case "revise":
    case "reject":
    case "reopen": {
      const pid = await projectId(opt.project);
      const [vid, ...rest] = args;
      if (!vid) throw new ShipreelError(`Usage: shipreel ${cmd} <video>`);
      const note = rest.join(" ").trim();
      if (cmd === "revise" && !note) throw new ShipreelError('Usage: shipreel revise <video> "what to change"');
      const b =
        cmd === "approve"
          ? { action: "approve", when: opt.when ?? "now", platforms: opt.platforms ? String(opt.platforms).split(",") : undefined, dryRun: !!opt["dry-run"] }
          : cmd === "revise" || cmd === "reject"
            ? { action: cmd, note: note || undefined }
            : { action: cmd };
      const r = await post(`/api/review/${pid}/${vid}`, b);
      out(r, opt, () => {
        console.log(`${green(r.review.status)}  ${r.videoId}  ${r.title}`);
        if (r.post) console.log(dim(`  post ${r.post.id}: ${r.post.status}${r.post.dryRun ? " (dry run)" : ""} → ${r.post.platforms.join(", ")} at ${new Date(r.post.scheduledAt).toLocaleString()}`));
        if (r.review.status === "revising") console.log(dim("  Claude is applying the note; it re-renders and comes back as pending."));
      });
      return;
    }

    case "postbox": {
      const st = await get("/api/postbox");
      out(st, opt, () => {
        console.log(`${bold("Postbox")}    ${st.daemon ? green("running") : "not running"} ${dim(st.dashboardUrl)}`);
        console.log(`${bold("Extension")}  ${st.extension ? green("connected") : "not connected (turn it on in Chrome)"}`);
        for (const a of st.accounts) console.log(`  ${a.connected ? green("✓") : a.connected === null ? "?" : "✗"} ${a.name}`);
      });
      return;
    }

    case "mcp": {
      const mcp = path.join(APP_ROOT, "bin", "shipreel-mcp.mjs");
      console.log(`Claude Code:  claude mcp add shipreel -- node ${mcp}`);
      console.log(`Codex:        codex mcp add shipreel -- node ${mcp}`);
      console.log(`Claude Desktop: add to ~/Library/Application Support/Claude/claude_desktop_config.json →`);
      console.log(dim(JSON.stringify({ mcpServers: { shipreel: { command: process.execPath, args: [mcp] } } }, null, 2)));
      console.log(dim("Then ask: “make a TikTok about the feature I just shipped and schedule it for tonight”."));
      return;
    }

    default:
      throw new ShipreelError(`Unknown command "${cmd}". Run: shipreel help`);
  }
}

function printPost(p, logLines) {
  console.log(`${bold(p.id)}  ${p.status}  ${new Date(p.scheduledAt).toLocaleString()}  ${p.platforms.join(",")} via ${p.provider}`);
  for (const r of p.results ?? []) console.log(`  ${r.ok ? green("✓") : r.mode === "manual" ? "→" : "✗"} ${r.platform}: ${r.ok ? r.url ?? r.mode ?? "ok" : r.error}${r.screenshot ? dim(` (screenshot: ${r.screenshot})`) : ""}`);
  if (logLines) for (const l of p.log.slice(-logLines)) console.log(dim(`  ${l}`));
}

function printIdeas(ideas) {
  if (!ideas.length) return console.log("No ideas came back.");
  for (const i of ideas) console.log(`${String(i.score).padStart(3)}  ${i.hook}  ${dim(`[${i.formatId}] ${i.id}`)}`);
}

main().catch((e) => {
  console.error(e instanceof ShipreelError ? e.message : e);
  process.exit(1);
});
