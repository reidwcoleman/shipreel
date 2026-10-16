import { body, handle, json } from "@/lib/server/http";
import { startRender } from "@/lib/server/render";

export const dynamic = "force-dynamic";
/** Starts a render and returns as soon as it has begun; progress arrives over /api/events. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string; vid: string }> }) => {
  const { id, vid } = await ctx.params;
  const b = await body<{ force?: boolean; wait?: boolean }>(req);
  const job = startRender(id, vid, { force: b.force });
  if (b.wait) return json(await job.done);
  job.done.catch(() => undefined);
  // Answer once the video says "rendering" (or needed no render), so a client polling right
  // after this never mistakes the previous render for the new one.
  await job.started;
  return json({ ok: true, started: true });
});
