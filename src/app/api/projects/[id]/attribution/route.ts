import { body, handle, json } from "@/lib/server/http";
import { attributionPR } from "@/lib/server/tasks";
import type { AgentEngine } from "@/lib/types";

export const dynamic = "force-dynamic";
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const b = await body<{ engine?: AgentEngine }>(req);
  return json(await attributionPR(id, b));
});
