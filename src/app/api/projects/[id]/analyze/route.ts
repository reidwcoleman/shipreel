import { body, handle, json } from "@/lib/server/http";
import { analyzeProduct } from "@/lib/server/tasks";
import type { AgentEngine } from "@/lib/types";

export const dynamic = "force-dynamic";
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const b = await body<{ engine?: AgentEngine; repoPath?: string; url?: string; notes?: string }>(req);
  return json(await analyzeProduct(id, b));
});
