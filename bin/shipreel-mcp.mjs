#!/usr/bin/env node
/**
 * Shipreel MCP server (stdio). Lets Claude Code, Codex or any MCP client drive the local Shipreel app:
 * read the framework and brief, write video specs, render, and schedule posts.
 *
 *   claude mcp add shipreel -- node /path/to/shipreel/bin/shipreel-mcp.mjs
 *   codex mcp add shipreel -- node /path/to/shipreel/bin/shipreel-mcp.mjs
 *
 * Needs the Shipreel app running (npm run dev in the app folder, or `shipreel start`).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { BASE, boot, CHROME_PLATFORMS, get, handoff, patch, post, postKit, projectId, put, readyVideos, ShipreelError, UPLOAD_PLATFORMS, waitPost, waitRender, waitRun } from "./lib.mjs";

const VERSION = "0.1.0";

const str = (description, extra = {}) => ({ type: "string", description, ...extra });
const num = (description) => ({ type: "number", description });
const bool = (description) => ({ type: "boolean", description });
const obj = (properties, required = []) => ({ type: "object", properties, required, additionalProperties: false });
const projectArg = { project: str("Product id. Defaults to the active product.") };

const TOOLS = [
  {
    name: "shipreel_status",
    description: "What Shipreel knows right now: the active product, which agents are installed, and which posting services are connected.",
    inputSchema: obj({}),
    run: async () => {
      const b = await boot();
      const active = b.projects.find((p) => p.id === b.activeProjectId);
      return {
        app: BASE,
        activeProduct: active ? { id: active.id, name: active.name, oneLiner: active.oneLiner } : null,
        products: b.projects.map((p) => ({ id: p.id, name: p.name })),
        agents: b.agents,
        posting: b.publishers.map((p) => ({ id: p.id, label: p.label, ready: p.ok, platforms: p.platforms, reason: p.reason })),
        defaultPlatforms: b.settings.defaultPlatforms,
      };
    },
  },
  {
    name: "get_framework",
    description: "The Shipreel framework (FRAMEWORK.md): the VideoSpec JSON reference, every scene type, formats, hook rules, safe zones and honesty rules. Read this before writing or editing a video spec.",
    inputSchema: obj({}),
    run: async () => {
      const where = await get("/api/framework?paths=1");
      return await readFile(path.join(where.workspace, "FRAMEWORK.md"), "utf8");
    },
  },
  {
    name: "get_brief",
    description: "The product brief: pitch, audience, pains, outcomes, features ranked by how good they look on video, proof (real numbers only), tone, brand and links.",
    inputSchema: obj(projectArg),
    run: async ({ project }) => (await get(`/api/projects/${await projectId(project)}`)).project,
  },
  {
    name: "update_brief",
    description: "Update fields of the product brief (shallow merge). Use after reading the codebase to keep features, pains and proof current. Never invent numbers for proof.",
    inputSchema: obj({ ...projectArg, patch: { type: "object", description: "Brief fields to replace, e.g. {\"features\": [...], \"proof\": [...]}" } }, ["patch"]),
    run: async ({ project, patch: p }) => patch(`/api/projects/${await projectId(project)}`, p),
  },
  {
    name: "list_formats",
    description: "Video formats that work for app marketing (status hot/steady/saturated, beats, length, what footage they need, hook examples, sound tip).",
    inputSchema: obj({}),
    run: async () => (await get("/api/framework")).formats,
  },
  {
    name: "list_hooks",
    description: "Hook library, filled in for the product. Families: reveal, pov, forbidden, time-shock, listicle, mistakes, pain, contrarian, social-proof, build-in-public, story, challenge.",
    inputSchema: obj({ ...projectArg, family: str("Only this hook family"), limit: num("Max hooks (default 40)") }),
    run: async ({ project, family, limit }) => {
      const hooks = await get(`/api/projects/${await projectId(project)}/hooks${family ? `?family=${encodeURIComponent(family)}` : ""}`);
      return hooks.slice(0, limit ?? 40).map((h) => ({ hook: h.filled, family: h.family, strength: h.strength, formats: h.formats, kind: h.kind, source: h.source }));
    },
  },
  {
    name: "list_sounds",
    description: "Trending sounds for app content (status, vibe, how creators use them, links). These are added in the TikTok app when posting drafts; never bake copyrighted songs into a video.",
    inputSchema: obj({ status: str("rising | peaking | evergreen | fading") }),
    run: async ({ status }) => (await get("/api/framework")).sounds.filter((s) => !status || s.status === status).slice(0, 40),
  },
  {
    name: "generate_ideas",
    description: "Generate video ideas (hook + format + beats) into the Hook Lab. engine 'instant' uses the template engine (no AI, immediate); 'claude' or 'codex' runs an agent and waits.",
    inputSchema: obj({ ...projectArg, count: num("How many (default 10)"), engine: str("instant | claude | codex", { enum: ["instant", "claude", "codex"] }), focus: str("Optional focus, e.g. a new feature") }),
    run: async ({ project, count, engine = "instant", focus }) => {
      const pid = await projectId(project);
      const res = await post(`/api/projects/${pid}/ideas`, { engine, count: count ?? 10, focus });
      if (!res.run) return res.ideas;
      const run = await waitRun(res.run.id);
      if (run.status !== "done") throw new ShipreelError(run.error ?? "Idea run failed");
      const ids = new Set(run.output?.ideaIds ?? []);
      return (await get(`/api/projects/${pid}/ideas`)).filter((i) => ids.has(i.id));
    },
  },
  {
    name: "create_video",
    description: "Create a video. Either from a format id + hook (Shipreel builds a good template draft with the product's media), or from a complete VideoSpec you wrote (see get_framework). Returns the video id, its spec and the editor link.",
    inputSchema: obj({ ...projectArg, format: str("Format id from list_formats"), hook: str("Hook text for the first frame"), spec: { type: "object", description: "A full VideoSpec (optional; overrides format/hook)" } }),
    run: async ({ project, format, hook, spec }) => {
      const pid = await projectId(project);
      const v = await post(`/api/projects/${pid}/videos`, spec ? { spec } : { formatId: format ?? "hook-demo", hook });
      return { id: v.id, editor: `${BASE}/edit/${pid}/${v.id}`, spec: v.spec };
    },
  },
  {
    name: "clone_video",
    description: "Rebuild the format of a viral TikTok/Reel/Short/X video for the product: Shipreel downloads it, Claude studies the frames, hook, pacing and sound, and creates a new video. Waits for the result.",
    inputSchema: obj({ ...projectArg, url: str("Link to the viral video") }, ["url"]),
    run: async ({ project, url }) => {
      const pid = await projectId(project);
      const run = await post(`/api/projects/${pid}/clone`, { url });
      const done = await waitRun(run.id);
      if (done.status !== "done") throw new ShipreelError(done.error ?? "Cloning failed");
      return { video: done.output?.videoId, editor: `${BASE}/edit/${pid}/${done.output?.videoId}` };
    },
  },
  {
    name: "list_videos",
    description: "Videos for the product with status (draft/rendered), format and title. ready=true lists only rendered videos that have no post yet (ready to post), with their file path and TikTok caption.",
    inputSchema: obj({ ...projectArg, ready: bool("Only rendered videos with no post yet, with file + caption") }),
    run: async ({ project, ready }) => {
      const pid = await projectId(project);
      if (!ready) return (await get(`/api/projects/${pid}/videos`)).map((v) => ({ id: v.id, title: v.spec.title, format: v.spec.formatId, status: v.status, scenes: v.spec.scenes.length, updatedAt: v.updatedAt }));
      const list = await readyVideos(pid);
      return Promise.all(
        list.slice(0, 25).map(async (v) => {
          const k = await postKit(pid, v.id);
          return { id: v.id, title: v.spec.title, format: v.spec.formatId, file: k.file, stale: k.stale, durationSec: k.durationSec, caption: k.captions.tiktok, editor: `${BASE}/edit/${pid}/${v.id}` };
        }),
      );
    },
  },
  {
    name: "get_video",
    description: "A video's full JSON spec (scenes, overlays, audio, captions, meta).",
    inputSchema: obj({ ...projectArg, video: str("Video id") }, ["video"]),
    run: async ({ project, video }) => (await get(`/api/projects/${await projectId(project)}/videos/${video}`)).spec,
  },
  {
    name: "update_video",
    description: "Replace a video's spec with an edited version (validated; errors list the bad fields). Keep scene ids stable. The user sees the change live in the editor.",
    inputSchema: obj({ ...projectArg, video: str("Video id"), spec: { type: "object", description: "The complete updated VideoSpec" } }, ["video", "spec"]),
    run: async ({ project, video, spec }) => {
      const pid = await projectId(project);
      const v = await put(`/api/projects/${pid}/videos/${video}`, { spec });
      return { id: v.id, scenes: v.spec.scenes.length, editor: `${BASE}/edit/${pid}/${v.id}` };
    },
  },
  {
    name: "render_video",
    description: "Render a video to MP4 (or carousel stills). With wait=true, blocks until done and returns the file path.",
    inputSchema: obj({ ...projectArg, video: str("Video id"), wait: bool("Wait for the render (default true)") }, ["video"]),
    run: async ({ project, video, wait = true }) => {
      const pid = await projectId(project);
      await post(`/api/projects/${pid}/videos/${video}/render`, {});
      if (!wait) return { started: true };
      const v = await waitRender(pid, video);
      const where = await get("/api/framework?paths=1");
      return { file: path.join(where.workspace, "projects", pid, v.render.file), durationSec: v.render.durationSec, slides: v.render.slides };
    },
  },
  {
    name: "schedule_post",
    description: "Schedule a video to post. at: 'next' (next open posting slot), 'now', or an ISO time. TikTok goes to drafts by default so the user can add a trending sound in-app.",
    inputSchema: obj({
      ...projectArg,
      video: str("Video id"),
      at: str("next | now | ISO datetime"),
      platforms: { type: "array", items: { type: "string" }, description: "tiktok, instagram, youtube, x, linkedin, threads, bluesky, facebook, pinterest" },
      provider: str("postbox (auto-post through the user's Chrome; holds the post until its time) | upload-post | bluesky | webhook | browser | manual | claude-chrome"),
      draft: bool("TikTok as draft (default true; Postbox has no drafts)"),
      captions: { type: "object", description: "Per-platform captions, e.g. {\"tiktok\": \"…\"}" },
      title: str("YouTube title (Postbox)"),
      dry_run: bool("Postbox: fill every form but stop before the final Post button"),
    }, ["video"]),
    run: async ({ project, video, at = "next", platforms, provider, draft, captions, title, dry_run }) => {
      const pid = await projectId(project);
      const p = await post(`/api/projects/${pid}/posts`, { videoId: video, scheduledAt: at, platforms, provider, asDraft: draft, captions, title, dryRun: dry_run });
      return { id: p.id, scheduledAt: p.scheduledAt, platforms: p.platforms, provider: p.provider, asDraft: p.asDraft, ...(p.postbox ? { postbox: p.postbox } : {}), calendar: `${BASE}/calendar` };
    },
  },
  {
    name: "list_posts",
    description: "Scheduled and past posts with status, results and logged metrics.",
    inputSchema: obj(projectArg),
    run: async ({ project }) => (await get(`/api/projects/${await projectId(project)}/posts`)).map((p) => ({ id: p.id, video: p.videoId, at: p.scheduledAt, status: p.status, platforms: p.platforms, results: p.results, metrics: p.metrics })),
  },
  {
    name: "log_results",
    description: "Record a post's numbers. Shipreel turns them into a verdict (winner/keep/retry/drop) and updates the product's memory.md.",
    inputSchema: obj({ ...projectArg, post: str("Post id"), views: num("Views"), likes: num("Likes"), comments: num("Comments"), shares: num("Shares"), saves: num("Saves"), linkTaps: num("Bio link taps"), installs: num("Installs") }, ["post"]),
    run: async ({ project, post: postId, ...m }) => post(`/api/projects/${await projectId(project)}/posts/${postId}/metrics`, m),
  },
  {
    name: "add_media_from_url",
    description: "Add an image or video to the product's media from a URL (App Store links import the icon and screenshots).",
    inputSchema: obj({ ...projectArg, url: str("http(s) URL") }, ["url"]),
    run: async ({ project, url }) => {
      const pid = await projectId(project);
      if (/apps\.apple\.com/.test(url)) return post("/api/import", { url, projectId: pid, importMedia: true });
      return post(`/api/projects/${pid}/assets/url`, { url });
    },
  },
  // ── Posting: the same routes as the website's Post sheet ─────────────────────
  {
    name: "post_kit",
    description: "Everything needed to post a video by hand: the MP4 path, cover image path, a ready caption per platform (hashtags included; YouTube gets a Shorts title), and each platform's upload page. ready=false means it needs a render first (render_video).",
    inputSchema: obj({ ...projectArg, video: str("Video id") }, ["video"]),
    run: async ({ project, video }) => postKit(await projectId(project), video),
  },
  {
    name: "send_to_phone",
    description: "Send a rendered video to the user's iPhone so they post from the TikTok/Instagram app (best reach: trending sounds, native editor). via=airdrop opens the Mac's AirDrop picker (the user picks their phone); via=photos imports into a 'Shipreel' album in Photos (iCloud syncs it). Both copy the platform's caption to the clipboard (Universal Clipboard pastes it on the phone).",
    inputSchema: obj({ ...projectArg, video: str("Video id"), via: str("airdrop | photos", { enum: ["airdrop", "photos"] }), platform: str("Whose caption to copy (default tiktok)"), caption: str("Caption override"), dry_run: bool("Check it would work without sending or importing") }, ["video"]),
    run: async ({ project, video, via = "airdrop", platform = "tiktok", caption, dry_run }) => handoff(await projectId(project), video, via === "photos" ? "photos" : "airdrop", { platform, caption, dryRun: !!dry_run }),
  },
  {
    name: "open_upload",
    description: "Open a platform's web upload page in the user's browser (TikTok Studio, Instagram, YouTube Studio, X, Threads, Bluesky, LinkedIn), copy that platform's caption to the clipboard and select the MP4 in Finder so they can drag it in.",
    inputSchema: obj({ ...projectArg, video: str("Video id"), platform: str(UPLOAD_PLATFORMS.join(" | ")), caption: str("Caption override") }, ["video", "platform"]),
    run: async ({ project, video, platform, caption }) => handoff(await projectId(project), video, "open", { platform, caption }),
  },
  {
    name: "browser_upload",
    description: `Upload through Shipreel's own Chrome window (no API key; the user logs in there once). Opens the upload page, attaches the MP4, fills the caption, then STOPS before the final Post button so the user confirms (status "needs-you"). auto_post=true presses Post too: only when the user explicitly asked for that. Platforms: ${CHROME_PLATFORMS.join(", ")}. If the user isn't logged in, the window waits ~5 minutes for them to log in. Waits for the result by default.`,
    inputSchema: obj({ ...projectArg, video: str("Video id"), platform: str(CHROME_PLATFORMS.join(" | ")), auto_post: bool("Press the final Post button (default false)"), caption: str("Caption override"), wait: bool("Wait for the result (default true)") }, ["video", "platform"]),
    run: async ({ project, video, platform, auto_post = false, caption, wait = true }) => {
      const pid = await projectId(project);
      if (!CHROME_PLATFORMS.includes(platform)) throw new ShipreelError(`Chrome uploads cover ${CHROME_PLATFORMS.join(", ")}. Use open_upload for ${platform}.`);
      const p = await post(`/api/projects/${pid}/posts`, { videoId: video, platforms: [platform], scheduledAt: "now", provider: "browser", autoPost: !!auto_post, captions: caption ? { [platform]: caption } : undefined });
      if (!wait) return { post: p.id, status: p.status, check: "post_status" };
      const done = await waitPost(pid, p.id);
      return { post: done.id, status: done.status, result: done.results[0] ?? null, log: done.log.slice(-6) };
    },
  },
  {
    name: "post_now",
    description: "Post a video right away through a connected service (Postbox, Upload-Post, Bluesky, webhook) or provider=browser for Shipreel's Chrome window. Renders first if needed. TikTok goes to drafts by default (draft=false to publish) except through Postbox, which posts for real (dry_run=true fills the forms and stops before Post). Only when the user explicitly asked to post.",
    inputSchema: obj({
      ...projectArg,
      video: str("Video id"),
      platforms: { type: "array", items: { type: "string" }, description: "tiktok, instagram, youtube, x, linkedin, threads, bluesky" },
      provider: str("postbox | upload-post | bluesky | webhook | browser | manual (default: the user's default)"),
      draft: bool("TikTok as draft (default true; Postbox has no drafts)"),
      captions: { type: "object", description: "Per-platform captions, e.g. {\"tiktok\": \"…\"}" },
      title: str("YouTube title (Postbox)"),
      dry_run: bool("Postbox: fill every form but stop before the final Post button"),
      wait: bool("Wait for the result (default true)"),
    }, ["video"]),
    run: async ({ project, video, platforms, provider, draft, captions, title, dry_run, wait = true }) => {
      const pid = await projectId(project);
      const p = await post(`/api/projects/${pid}/posts`, { videoId: video, scheduledAt: "now", platforms, provider, asDraft: draft, captions, title, dryRun: dry_run });
      if (!wait) return { post: p.id, status: p.status };
      const done = await waitPost(pid, p.id);
      return { post: done.id, status: done.status, provider: done.provider, results: done.results, log: done.log.slice(-6) };
    },
  },
  {
    name: "schedule_batch",
    description: "Queue several videos across the next days at the user's posting times (Settings → Posting times), at most per_day a day. Returns the planned times.",
    inputSchema: obj({
      ...projectArg,
      videos: { type: "array", items: { type: "string" }, description: "Video ids (list_videos ready=true)" },
      per_day: num("Posts per day (default 1)"),
      platforms: { type: "array", items: { type: "string" }, description: "Default: the user's default platforms" },
      provider: str("postbox | upload-post | bluesky | webhook | browser | manual"),
      draft: bool("TikTok as draft (default true)"),
    }, ["videos"]),
    run: async ({ project, videos, per_day, platforms, provider, draft }) => {
      const pid = await projectId(project);
      const ps = await post(`/api/projects/${pid}/posts/batch`, { videoIds: videos, perDay: per_day ?? 1, platforms, provider, asDraft: draft });
      return ps.map((p) => ({ id: p.id, video: p.videoId, at: p.scheduledAt, platforms: p.platforms, provider: p.provider }));
    },
  },
  {
    name: "post_status",
    description: "One post's status (scheduled, rendering, posting, posted, partial, failed, needs-you), per-platform results (links, errors, failure screenshots) and its log.",
    inputSchema: obj({ ...projectArg, post: str("Post id") }, ["post"]),
    run: async ({ project, post: postId }) => {
      const pid = await projectId(project);
      const p = (await get(`/api/projects/${pid}/posts`)).find((x) => x.id === postId);
      if (!p) throw new ShipreelError(`Post ${postId} not found`);
      return { id: p.id, video: p.videoId, at: p.scheduledAt, status: p.status, provider: p.provider, platforms: p.platforms, results: p.results, log: p.log.slice(-12) };
    },
  },
  // ── Review & auto-post: videos land in the Shipreel Mac app's Review; the user approves; Postbox posts ──
  {
    name: "submit_for_review",
    description: "Put a video in Review, where the user watches it in the Shipreel Mac app and approves it (then Postbox posts it), asks for changes or rejects it. New videos join Review on their own after their first render; call this after rendering anyway. A video that isn't rendered yet joins when its render is done.",
    inputSchema: obj({ ...projectArg, video: str("Video id") }, ["video"]),
    run: async ({ project, video }) => {
      const pid = await projectId(project);
      const r = await post(`/api/review/${pid}/${video}`, { action: "submit" });
      return { video: r.videoId, title: r.title, review: r.review.status, render: r.renderStatus, note: r.renderStatus === "rendered" ? "In Review. The user approves it in the Shipreel Mac app." : "Joins Review when its render is done." };
    },
  },
  {
    name: "list_review",
    description: "Videos in Review: pending (waiting for the user), approved (with their Postbox post status), revising, rejected, or all. Includes counts per status.",
    inputSchema: obj({ project: str("Only this product (default: every product)"), status: str("pending | approved | rejected | revising | all (default pending)", { enum: ["pending", "approved", "rejected", "revising", "all"] }) }),
    run: async ({ project, status = "pending" }) => {
      const q = new URLSearchParams({ status });
      if (project) q.set("projectId", project);
      const r = await get(`/api/review?${q}`);
      return {
        counts: r.counts,
        items: r.items.map((i) => ({ project: i.projectId, video: i.videoId, title: i.title, hook: i.hook, format: i.formatId, review: i.review.status, note: i.review.note, render: i.renderStatus, mp4: i.mp4Url, post: i.post ? { id: i.post.id, status: i.post.status, at: i.post.scheduledAt, dryRun: i.post.dryRun, results: i.post.results } : undefined })),
      };
    },
  },
  {
    name: "review_decision",
    description: "Decide on a video in Review ONLY when the user explicitly told you to in this conversation (\"approve the morning one\", \"ask Claude to shorten it\"). Never approve on your own. approve: posts through Postbox (when: now | next-slot | ISO; dry_run fills the forms and stops before Post). revise: the agent applies the note, it re-renders and comes back as pending. reject: out of the queue. reopen: back to pending (cancels a post that hasn't gone out).",
    inputSchema: obj({
      ...projectArg,
      video: str("Video id"),
      decision: str("approve | revise | reject | reopen", { enum: ["approve", "revise", "reject", "reopen"] }),
      note: str("revise: what to change; reject: why (optional)"),
      when: str("approve: now | next-slot | ISO time (default now)"),
      platforms: { type: "array", items: { type: "string", enum: ["tiktok", "youtube", "instagram"] }, description: "approve: default the user's default platforms" },
      captions: { type: "object", description: "approve: caption overrides {tiktok, instagram, youtube}" },
      youtube_title: str("approve: YouTube title override"),
      dry_run: bool("approve: fill every form but stop before the final Post button"),
    }, ["video", "decision"]),
    run: async ({ project, video, decision, note, when, platforms, captions, youtube_title, dry_run }) => {
      const pid = await projectId(project);
      const body = decision === "approve" ? { action: "approve", when, platforms, captions, youtubeTitle: youtube_title, dryRun: dry_run } : decision === "revise" ? { action: "revise", note } : decision === "reject" ? { action: "reject", note } : { action: "reopen" };
      const r = await post(`/api/review/${pid}/${video}`, body);
      return { video: r.videoId, title: r.title, review: r.review, post: r.post };
    },
  },
  {
    name: "postbox_status",
    description: "Is Postbox (the local auto-poster, http://127.0.0.1:4710) running, is its Chrome extension connected, and which of TikTok, YouTube and Instagram are logged in. Starts Postbox if it's down. Posts nothing.",
    inputSchema: obj({}),
    run: async () => get("/api/postbox"),
  },
  {
    name: "test_connections",
    description: "Check the posting services: which accounts Upload-Post has linked, whether the Bluesky login works, and which services are ready. Posts nothing.",
    inputSchema: obj({}),
    run: async () => {
      const [up, bsky, b] = await Promise.all([post("/api/publishers", { action: "test-upload-post" }), post("/api/publishers", { action: "test-bluesky" }), boot()]);
      return { uploadPost: up, bluesky: bsky, services: b.publishers.map((p) => ({ id: p.id, ready: p.ok, reason: p.reason, platforms: p.platforms })) };
    },
  },
];

// ── JSON-RPC over stdio (newline-delimited) ──────────────────────────────────────

const send = (msg) => process.stdout.write(`${JSON.stringify(msg)}\n`);
const reply = (id, result) => send({ jsonrpc: "2.0", id, result });
const fail = (id, code, message) => send({ jsonrpc: "2.0", id, error: { code, message } });

async function handle(msg) {
  const { id, method, params } = msg;
  if (method === "initialize") {
    return reply(id, {
      protocolVersion: params?.protocolVersion ?? "2025-06-18",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "shipreel", version: VERSION },
      instructions:
        "Shipreel makes short-form marketing videos for the user's app and posts them. Typical flow: get_brief → list_formats/list_hooks → create_video (format + hook) → get_video → edit the spec (read get_framework first) → update_video → render_video → submit_for_review. The user approves in the Shipreel Mac app's Review and Postbox posts it; never call review_decision, post_now or schedule_post unless the user explicitly asked in this conversation. Posting, easiest first: send_to_phone (AirDrop/Photos, user posts from the app with a trending sound), open_upload (web upload page + caption copied), browser_upload (Shipreel's Chrome fills it in and stops before Post), post_now / schedule_post / schedule_batch (connected services). Never press a final Post button unless the user asked. Never invent numbers; TikTok posts go to drafts so the user can add a trending sound.",
    });
  }
  if (method === "notifications/initialized" || method?.startsWith("notifications/")) return;
  if (method === "ping") return reply(id, {});
  if (method === "tools/list") return reply(id, { tools: TOOLS.map(({ run: _run, ...t }) => t) });
  if (method === "tools/call") {
    const tool = TOOLS.find((t) => t.name === params?.name);
    if (!tool) return fail(id, -32602, `Unknown tool: ${params?.name}`);
    try {
      const out = await tool.run(params?.arguments ?? {});
      return reply(id, { content: [{ type: "text", text: typeof out === "string" ? out : JSON.stringify(out, null, 2) }] });
    } catch (e) {
      return reply(id, { content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }], isError: true });
    }
  }
  if (id !== undefined) fail(id, -32601, `Method not found: ${method}`);
}

const rl = readline.createInterface({ input: process.stdin });
let pending = 0;
let closed = false;
rl.on("line", (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return fail(null, -32700, "Parse error");
  }
  pending++;
  handle(msg)
    .catch((e) => msg.id !== undefined && fail(msg.id, -32603, e?.message ?? String(e)))
    .finally(() => {
      pending--;
      if (closed && pending === 0) process.exit(0);
    });
});
// Let in-flight tool calls finish before exiting when the client closes stdin.
rl.on("close", () => {
  closed = true;
  if (pending === 0) process.exit(0);
});
