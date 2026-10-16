import fsp from "node:fs/promises";
import path from "node:path";
import { bad, body, handle, json } from "@/lib/server/http";
import { getProject } from "@/lib/server/projects";
import { paths } from "@/lib/server/store";
import { ensureMemory } from "@/lib/server/tasks";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const project = await getProject(id);
  if (!project) return bad("project not found", 404);
  return json({ markdown: await ensureMemory(project) });
});
export const PUT = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const b = await body<{ markdown: string }>(req);
  await fsp.writeFile(path.join(paths.project(id), "memory.md"), b.markdown ?? "");
  return json({ ok: true });
});
