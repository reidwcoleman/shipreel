import { body, handle, json } from "@/lib/server/http";
import { createPost } from "@/lib/server/posts";
import { getSettings } from "@/lib/server/store";
import { ideaToVideo } from "@/lib/server/tasks";
import type { AgentEngine } from "@/lib/types";

export const dynamic = "force-dynamic";
/** Swipe right: build the video (instantly or with an agent) and, on autopilot, schedule it. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string; ideaId: string }> }) => {
  const { id, ideaId } = await ctx.params;
  const b = await body<{ engine?: AgentEngine | "instant"; schedule?: boolean }>(req);
  const res = await ideaToVideo(id, ideaId, { engine: b.engine ?? "instant" });
  const settings = await getSettings();
  let post = null;
  if (b.schedule ?? settings.autopilot) post = await createPost({ projectId: id, videoId: res.videoId, scheduledAt: "next" });
  return json({ ...res, post });
});
