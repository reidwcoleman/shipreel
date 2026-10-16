import { bad, handle, json } from "@/lib/server/http";
import { cancelRun, getRun } from "@/lib/server/agents";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ runId: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { runId } = await ctx.params;
  const r = await getRun(runId);
  return r.run ? json(r) : bad("run not found", 404);
});
export const DELETE = handle(async (_req: Request, ctx: Ctx) => json({ canceled: await cancelRun((await ctx.params).runId) }));
