import { bad, body, handle, json } from "@/lib/server/http";
import { createBatch, planSlots } from "@/lib/server/posts";
import type { Platform, ProviderId } from "@/lib/types";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** Preview: ?count=5&perDay=1 → the times a batch would use. */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const u = new URL(req.url).searchParams;
  const count = Math.max(1, Math.min(60, Number(u.get("count") ?? 1)));
  const times = await planSlots(id, count, { perDay: Number(u.get("perDay") ?? 1) });
  return json({ times: times.map((t) => t.toISOString()) });
});

/** Schedule several videos, spread across days at your posting times. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const b = await body<{ videoIds: string[]; platforms?: Platform[]; provider?: ProviderId; asDraft?: boolean; perDay?: number; from?: string }>(req);
  if (!Array.isArray(b.videoIds) || !b.videoIds.length) return bad("Pick at least one video.");
  return json(await createBatch({ projectId: id, ...b }), 201);
});
