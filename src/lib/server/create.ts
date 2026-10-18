import "server-only";
import path from "node:path";
import type { RunEvent } from "@/lib/types";
import { FORMAT_MAP } from "@/framework/formats";
import { getRun, startRun } from "./agents";
import { activeProject, getProject, getVideo, patchVideo } from "./projects";
import { serverOrigin } from "./render";
import { APP_ROOT, emit, now, paths, readJson, safeId, updateJson } from "./store";

/**
 * "Make me 3 videos about …" from the Mac app's Create box: Claude Code runs headless in the Shipreel
 * folder with the Shipreel MCP server, makes and renders the videos, and puts each one in Review.
 * It never posts: approving is the user's call, in the Mac app.
 */

export type CreateRun = {
  id: string;
  status: "running" | "done" | "failed";
  prompt: string;
  startedAt: string;
  endedAt?: string;
  output: string;
  videoIds: string[];
};

type Sidecar = { prompt: string; projectId: string; count: number; formats: string[]; videoIds: string[]; startedAt: string };

const sidecar = (runId: string) => path.join(paths.runs(), `${safeId(runId)}.create.json`);

/** Tools the run may not touch: anything that posts, schedules, approves or rewrites the brief. */
const BLOCKED = ["post_now", "schedule_post", "schedule_batch", "browser_upload", "send_to_phone", "open_upload", "review_decision", "update_brief", "log_results"].map((t) => `mcp__shipreel__${t}`);

export async function startCreate(input: { prompt: string; projectId?: string; count?: number; formats?: string[]; origin?: string }): Promise<{ runId: string }> {
  const ask = input.prompt?.trim();
  if (!ask) throw new Error("Say what to make (prompt).");
  const project = input.projectId ? await getProject(input.projectId) : await activeProject();
  if (!project) throw new Error(input.projectId ? "project not found" : "No product yet. Add one in Shipreel first.");
  const count = Math.max(1, Math.min(10, Math.round(Number(input.count) || 1)));
  const formats = (input.formats ?? []).filter((f) => FORMAT_MAP[f]);
  const unknown = (input.formats ?? []).filter((f) => !FORMAT_MAP[f]);
  if (unknown.length) throw new Error(`Unknown format${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}`);
  const origin = input.origin ?? serverOrigin();

  const prompt = `You are making short-form marketing videos (TikTok, Reels, Shorts) for ${project.name} with Shipreel, through the Shipreel MCP tools (mcp__shipreel__*). Product id: "${project.id}" (pass it as "project" to every tool).

The user asked:
"""
${ask}
"""

Do this:
1. Read the product brief with get_brief, and memory.md at ${path.join(paths.project(project.id), "memory.md")} if it exists. Never invent numbers, users or testimonials.
2. Make exactly ${count} video${count > 1 ? "s" : ""}${formats.length ? ` using ${formats.length === 1 ? "this format" : "these formats"}: ${formats.join(", ")}` : " in whichever formats fit the request best (list_formats; prefer \"hot\" ones; vary them if making several)"}. For each: create_video with a format and a specific hook (list_hooks helps); if the copy needs tailoring, get_framework, get_video, then update_video with the complete edited spec.
3. Render each one with render_video (wait: true). If a render fails, fix the spec and render again once.
4. Put each rendered video in Review with submit_for_review.

Rules: never post, schedule or approve anything; the user watches each video in the Shipreel Mac app's Review and approves it there, and Postbox posts what they approve. Don't edit files. Be quick: no extra variations beyond ${count}.
Finish with one line per video: its id, format and hook.`;

  const startedAt = now();
  const toolNames = new Map<string, string>();
  let runId = "";
  const ids: string[] = [];
  const track = async (vid: string) => {
    if (!/^v_[a-z0-9]+$/.test(vid) || ids.includes(vid)) return;
    ids.push(vid);
    // Made by Claude, whatever route the MCP tool took.
    await patchVideo(project.id, vid, { source: "claude" }).catch(() => undefined);
    if (runId) await updateJson<Sidecar | null>(sidecar(runId), null, (cur) => (cur ? { ...cur, videoIds: [...ids] } : cur));
  };

  const run = await startRun({
    engine: "claude",
    kind: "video",
    title: `Create: ${ask.slice(0, 50)}`,
    projectId: project.id,
    prompt,
    cwd: APP_ROOT,
    mcpConfig: { mcpServers: { shipreel: { type: "stdio", command: process.execPath, args: [path.join(APP_ROOT, "bin", "shipreel-mcp.mjs")], env: { SHIPREEL_URL: origin } } } },
    allowedTools: ["mcp__shipreel"],
    disallowedTools: [...BLOCKED, "Bash", "Edit", "Write", "MultiEdit", "NotebookEdit"],
    toolResults: true,
    onMessage: (msg) => {
      const content = ((msg.message as { content?: unknown[] })?.content ?? []) as Record<string, unknown>[];
      for (const c of content) {
        if (msg.type === "assistant" && c.type === "tool_use") {
          const name = String(c.name).replace(/^mcp__shipreel__/, "");
          toolNames.set(String(c.id), name);
          const vid = (c.input as { video?: unknown } | undefined)?.video;
          if (name === "submit_for_review" && typeof vid === "string") void track(vid);
        } else if (msg.type === "user" && c.type === "tool_result" && !c.is_error) {
          const name = toolNames.get(String(c.tool_use_id));
          if (name !== "create_video" && name !== "clone_video") continue;
          const text = typeof c.content === "string" ? c.content : JSON.stringify(c.content);
          const m = /"(?:id|video)\\?"\s*:\s*\\?"(v_[a-z0-9]+)/.exec(text);
          if (m) void track(m[1]);
        }
      }
    },
    onResult: async () => {
      // Safety net: anything it made and rendered is in Review even if it forgot submit_for_review.
      for (const vid of ids) {
        const d = await getVideo(project.id, vid);
        if (d && !d.review && d.status === "rendered" && d.render?.file) {
          await patchVideo(project.id, vid, { review: { status: "pending", at: now() }, reviewOnRender: undefined });
          emit({ type: "review", projectId: project.id, videoId: vid, status: "pending" });
        }
      }
      return { projectId: project.id, notes: [] };
    },
  });
  runId = run.id;
  await updateJson<Sidecar | null>(sidecar(run.id), null, () => ({ prompt: ask, projectId: project.id, count, formats, videoIds: [...ids], startedAt }));
  return { runId: run.id };
}

/** One terminal-style line (or a few) per run event. */
export function eventLines(e: RunEvent): string[] {
  const tool = (e.tool ?? "").replace(/^mcp__shipreel__/, "");
  switch (e.kind) {
    case "status":
      return [`· ${e.text ?? ""}`];
    case "text":
      return (e.text ?? "").split("\n").filter((l, i, a) => l.trim() || (i > 0 && i < a.length - 1));
    case "tool":
      return [`▸ ${tool}${e.detail ? ` ${e.detail}` : ""}`];
    case "tool-result":
      return e.text?.trim() ? [`  ⎿ ${e.text}`] : [];
    case "error":
      return (e.text ?? "error").split("\n").map((l, i) => (i ? `  ${l}` : `✗ ${l}`));
    case "result":
      return [`✓ ${e.text ?? "Done"}`];
    default:
      return [];
  }
}

export async function getCreate(runId: string): Promise<CreateRun | null> {
  const side = await readJson<Sidecar | null>(sidecar(runId), null);
  if (!side) return null;
  const { run, events } = await getRun(runId);
  if (!run) return null;
  return {
    id: run.id,
    status: run.status === "running" ? "running" : run.status === "done" ? "done" : "failed",
    prompt: side.prompt,
    startedAt: run.startedAt,
    ...(run.endedAt ? { endedAt: run.endedAt } : {}),
    output: events.flatMap(eventLines).join("\n"),
    videoIds: side.videoIds,
  };
}
