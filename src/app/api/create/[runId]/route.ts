import { bad, handle, json } from "@/lib/server/http";
import { getCreate } from "@/lib/server/create";

export const dynamic = "force-dynamic";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ runId: string }> }) => {
  const r = await getCreate((await ctx.params).runId);
  return r ? json(r) : bad("run not found", 404);
});
