import { bad, body, handle, json } from "@/lib/server/http";
import { listAssets } from "@/lib/server/media";
import { deleteProject, getProject, updateProject } from "@/lib/server/projects";
import { saveSettings } from "@/lib/server/store";
import type { Project } from "@/lib/types";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const project = await getProject(id);
  if (!project) return bad("project not found", 404);
  return json({ project, assets: await listAssets(id) });
});
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const b = await body<Partial<Project> & { activate?: boolean }>(req);
  if (b.activate) {
    await saveSettings({ activeProjectId: id });
    delete b.activate;
    if (Object.keys(b).length === 0) return json(await getProject(id));
  }
  return json(await updateProject(id, b));
});
export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  await deleteProject(id);
  return json({ ok: true });
});
