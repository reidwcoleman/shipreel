import { variationsOf } from "@/framework/ideas";
import { bad, handle, json } from "@/lib/server/http";
import { addIdeas, getProject, listIdeas } from "@/lib/server/projects";

export const dynamic = "force-dynamic";
/** "Make 3 variations of the winner": same format and body, new hook families. */
export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string; ideaId: string }> }) => {
  const { id, ideaId } = await ctx.params;
  const project = await getProject(id);
  const idea = (await listIdeas(id)).find((i) => i.id === ideaId);
  if (!project || !idea) return bad("not found", 404);
  return json(await addIdeas(id, variationsOf(project, idea, 3)));
});
