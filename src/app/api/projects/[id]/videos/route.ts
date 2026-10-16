import { buildSpec, fillHook, FORMAT_MAP } from "@/framework/formats";
import { bad, body, handle, json } from "@/lib/server/http";
import { listAssets } from "@/lib/server/media";
import { createVideo, getProject, listVideos } from "@/lib/server/projects";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => json(await listVideos((await ctx.params).id)));
/** Create from a full spec, or from a format + hook (instant template). */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const b = await body<{ spec?: unknown; formatId?: string; hook?: string }>(req);
  if (b.spec) return json(await createVideo(id, b.spec, "manual"), 201);
  const project = await getProject(id);
  if (!project) return bad("project not found", 404);
  const media = (await listAssets(id)).map((a) => ({ file: a.file, kind: a.kind, role: a.role, width: a.width, height: a.height, durationSec: a.durationSec }));
  const formatId = b.formatId && FORMAT_MAP[b.formatId] ? b.formatId : "hook-demo";
  // No hook given: use the format's own best hook, filled for this product.
  const hook = b.hook?.trim() || fillHook(FORMAT_MAP[formatId].hooks[0] ?? "I built an app that {does}", project);
  const spec = buildSpec(formatId, { project, hook, media });
  return json(await createVideo(id, spec, "template"), 201);
});
