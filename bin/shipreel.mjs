#!/usr/bin/env node
// shipreel: drive the local Shipreel app from a terminal, a script, or an agent's Bash tool.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { APP_ROOT, BASE, boot, get, patch, post, projectId, put, readJsonFile, ShipreelError, waitRender, waitRun } from "./lib.mjs";

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
  post <video> [--at next|now|2026-10-20T19:00] [--platforms tiktok,instagram]
               [--provider upload-post|bluesky|webhook|manual] [--no-draft]
  posts                              Upcoming and recent posts
  mcp                                How to add Shipreel to Claude Code or Codex as an MCP server

Options: --project <id> targets a product other than the active one. --json prints raw JSON.
Env: SHIPREEL_URL (default http://localhost:4747)
`;

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
        scheduledAt: opt.at ?? "next",
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

    case "mcp": {
      const mcp = path.join(APP_ROOT, "bin", "shipreel-mcp.mjs");
      console.log(`Claude Code:  claude mcp add shipreel -- node ${mcp}`);
      console.log(`Codex:        codex mcp add shipreel -- node ${mcp}`);
      console.log(dim("Then ask: “make a TikTok about the feature I just shipped and schedule it for tonight”."));
      return;
    }

    default:
      throw new ShipreelError(`Unknown command "${cmd}". Run: shipreel help`);
  }
}

function printIdeas(ideas) {
  if (!ideas.length) return console.log("No ideas came back.");
  for (const i of ideas) console.log(`${String(i.score).padStart(3)}  ${i.hook}  ${dim(`[${i.formatId}] ${i.id}`)}`);
}

main().catch((e) => {
  console.error(e instanceof ShipreelError ? e.message : e);
  process.exit(1);
});
