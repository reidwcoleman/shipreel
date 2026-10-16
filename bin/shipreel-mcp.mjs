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
import { BASE, boot, get, patch, post, projectId, put, ShipreelError, waitRender, waitRun } from "./lib.mjs";

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
    description: "Videos for the product with status (draft/rendered), format and title.",
    inputSchema: obj(projectArg),
    run: async ({ project }) => {
      const pid = await projectId(project);
      return (await get(`/api/projects/${pid}/videos`)).map((v) => ({ id: v.id, title: v.spec.title, format: v.spec.formatId, status: v.status, scenes: v.spec.scenes.length, updatedAt: v.updatedAt }));
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
      provider: str("upload-post | bluesky | webhook | manual | claude-chrome"),
      draft: bool("TikTok as draft (default true)"),
      captions: { type: "object", description: "Per-platform captions, e.g. {\"tiktok\": \"…\"}" },
    }, ["video"]),
    run: async ({ project, video, at = "next", platforms, provider, draft, captions }) => {
      const pid = await projectId(project);
      const p = await post(`/api/projects/${pid}/posts`, { videoId: video, scheduledAt: at, platforms, provider, asDraft: draft, captions });
      return { id: p.id, scheduledAt: p.scheduledAt, platforms: p.platforms, provider: p.provider, asDraft: p.asDraft, calendar: `${BASE}/calendar` };
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
        "Shipreel makes short-form marketing videos for the user's app and posts them. Typical flow: get_brief → list_formats/list_hooks → create_video (format + hook) → get_video → edit the spec (read get_framework first) → update_video → render_video → schedule_post. Never invent numbers; TikTok posts go to drafts so the user can add a trending sound.",
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
