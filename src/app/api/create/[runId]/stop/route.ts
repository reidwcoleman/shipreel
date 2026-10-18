import { bad, handle, json } from "@/lib/server/http";
import { cancelRun } from "@/lib/server/agents";
import { getCreate } from "@/lib/server/create";

export const dynamic = "force-dynamic";

export const POST = handle(async (_req: Request, ctx: { params: Promise<{ runId: string }> }) => {
  const { runId } = await ctx.params;
  if (!(await getCreate(runId))) return bad("run not found", 404);
  await cancelRun(runId);
  return json({ ok: true });
});
