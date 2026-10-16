import { bad, body, handle, json } from "@/lib/server/http";
import { createPost, deletePost, listPosts, nextFreeSlot, updatePost } from "@/lib/server/posts";
import type { Platform, Post, ProviderId } from "@/lib/types";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  if (url.searchParams.get("nextSlot")) return json({ at: (await nextFreeSlot(id)).toISOString() });
  return json(await listPosts(id));
});
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const b = await body<{ videoId: string; platforms?: Platform[]; scheduledAt?: string; provider?: ProviderId; asDraft?: boolean; captions?: Post["captions"] }>(req);
  if (!b.videoId) return bad("Which video?");
  return json(await createPost({ projectId: id, ...b }), 201);
});
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { postId, ...patch } = await body<{ postId: string } & Partial<Post>>(req);
  if (patch.status === "scheduled") patch.results = [];
  return json(await updatePost(id, postId, patch));
});
export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const b = await body<{ postId: string }>(req);
  await deletePost(id, b.postId);
  return json({ ok: true });
});
