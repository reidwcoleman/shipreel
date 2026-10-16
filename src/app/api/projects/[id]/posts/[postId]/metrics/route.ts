import { body, handle, json } from "@/lib/server/http";
import { recordMetrics, updatePost } from "@/lib/server/posts";
import type { PostMetrics } from "@/lib/types";

export const dynamic = "force-dynamic";
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string; postId: string }> }) => {
  const { id, postId } = await ctx.params;
  const b = await body<Omit<PostMetrics, "updatedAt"> & { markPosted?: boolean }>(req);
  const { markPosted, ...metrics } = b;
  if (markPosted) await updatePost(id, postId, { status: "posted" });
  return json(await recordMetrics(id, postId, metrics));
});
