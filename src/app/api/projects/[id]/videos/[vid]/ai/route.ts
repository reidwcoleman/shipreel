import { bad, body, handle, json } from "@/lib/server/http";
import { improveVideo, writeCaptions } from "@/lib/server/tasks";
import type { AgentEngine } from "@/lib/types";

export const dynamic = "force-dynamic";
/** Ask Claude/Codex to edit a video ("make the hook punchier") or write platform captions. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string; vid: string }> }) => {
  const { id, vid } = await ctx.params;
  const b = await body<{ mode?: "edit" | "rewrite" | "captions"; instruction?: string; engine?: AgentEngine }>(req);
  if (b.mode === "captions") return json(await writeCaptions(id, vid, { engine: b.engine }));
  if (b.mode === "rewrite") return json(await improveVideo(id, vid, { engine: b.engine }));
  if (!b.instruction?.trim()) return bad("Tell the agent what to change.");
  return json(await improveVideo(id, vid, { engine: b.engine, instruction: b.instruction.trim() }));
});
