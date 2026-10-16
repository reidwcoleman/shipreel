import { handle, json } from "@/lib/server/http";
import { processPost, updatePost } from "@/lib/server/posts";

export const dynamic = "force-dynamic";
/** Post now (also retries failed posts). */
export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string; postId: string }> }) => {
  const { id, postId } = await ctx.params;
  await updatePost(id, postId, { status: "scheduled", scheduledAt: new Date().toISOString(), results: [] });
  void processPost(id, postId);
  return json({ ok: true });
});
