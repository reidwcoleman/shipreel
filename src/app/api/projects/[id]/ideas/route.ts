import { body, handle, json } from "@/lib/server/http";
import { deleteIdeas, listIdeas, updateIdea } from "@/lib/server/projects";
import { generateIdeas } from "@/lib/server/tasks";
import type { AgentEngine, Idea } from "@/lib/types";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => json(await listIdeas((await ctx.params).id)));
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const b = await body<{ engine?: AgentEngine | "instant"; count?: number; formats?: string[]; focus?: string }>(req);
  return json(await generateIdeas(id, b));
});
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const b = await body<{ ideaId: string } & Partial<Idea>>(req);
  const { ideaId, ...patch } = b;
  return json(await updateIdea(id, ideaId, patch));
});
export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const b = await body<{ status?: Idea["status"]; ideaId?: string }>(req);
  await deleteIdeas(id, (i) => (b.ideaId ? i.id === b.ideaId : b.status ? i.status === b.status : false));
  return json({ ok: true });
});
