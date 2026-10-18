import { bad, body, handle, json } from "@/lib/server/http";
import { aiStatus, BudgetError, generateHookClip, prepareCarousel } from "@/lib/server/imagegen";
import { getProject, getVideo, saveVideoSpec } from "@/lib/server/projects";
import { packFor } from "@/framework/hooks";

export const dynamic = "force-dynamic";

/** Is the Higgsfield CLI signed in, what one AI photo / hook clip costs, what's been spent of the budget. */
export const GET = handle(async () => json(await aiStatus()));

/**
 * Opt-in generation (Settings → AI images must be on; never over the budget):
 *   { projectId, videoId }            fill a carousel's AI photos now (otherwise it happens at render)
 *   { projectId, hookClip: true, seed? }  add one 3 s AI reaction clip to the project's hook-clip library
 */
export const POST = handle(async (req: Request) => {
  const b = await body<{ projectId?: string; videoId?: string; hookClip?: boolean; seed?: number }>(req);
  if (!b.projectId) return bad("projectId is required");
  try {
    if (b.hookClip) {
      const project = await getProject(b.projectId);
      if (!project) return bad("project not found", 404);
      const file = await generateHookClip(b.projectId, { kind: packFor(project)?.id === "family" ? "family" : "generic", seed: b.seed ?? Date.now() % 1000 });
      return json({ file, status: await aiStatus() });
    }
    if (!b.videoId) return bad("videoId or hookClip is required");
    const doc = await getVideo(b.projectId, b.videoId);
    if (!doc) return bad("video not found", 404);
    const spec = await prepareCarousel(b.projectId, doc.spec);
    return json({ video: spec ? await saveVideoSpec(b.projectId, b.videoId, spec) : doc, status: await aiStatus() });
  } catch (e) {
    if (e instanceof BudgetError) return bad(e.message, 402);
    throw e;
  }
});
