import { bad, handle, json } from "@/lib/server/http";
import { createVideo, getVideo } from "@/lib/server/projects";

export const dynamic = "force-dynamic";
export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string; vid: string }> }) => {
  const { id, vid } = await ctx.params;
  const doc = await getVideo(id, vid);
  if (!doc) return bad("video not found", 404);
  return json(await createVideo(id, { ...doc.spec, title: `${doc.spec.title} (copy)` }, doc.source), 201);
});
