import { bad, body, handle, json } from "@/lib/server/http";
import { deleteVideo, getVideo, saveVideoSpec } from "@/lib/server/projects";
import { safeNormalizeSpec } from "@/remotion/spec";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string; vid: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { id, vid } = await ctx.params;
  const doc = await getVideo(id, vid);
  return doc ? json(doc) : bad("video not found", 404);
});
export const PUT = handle(async (req: Request, ctx: Ctx) => {
  const { id, vid } = await ctx.params;
  const b = await body<{ spec: unknown }>(req);
  const check = safeNormalizeSpec({ ...(b.spec as object), id: vid });
  if (!check.ok) return json({ error: "Invalid spec", errors: check.errors }, 422);
  return json(await saveVideoSpec(id, vid, check.spec));
});
export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const { id, vid } = await ctx.params;
  await deleteVideo(id, vid);
  return json({ ok: true });
});
