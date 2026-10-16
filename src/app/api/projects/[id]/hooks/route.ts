import { fillHook } from "@/framework/formats";
import { HOOKS } from "@/framework/hooks";
import { bad, handle, json } from "@/lib/server/http";
import { getProject } from "@/lib/server/projects";

export const dynamic = "force-dynamic";
/** The hook library with templates filled in for this product (for the CLI, MCP and agents). */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const project = await getProject(id);
  if (!project) return bad("project not found", 404);
  const family = new URL(req.url).searchParams.get("family");
  return json(
    HOOKS.filter((h) => !family || h.family === family)
      .sort((a, b) => b.strength - a.strength)
      .map((h) => ({ ...h, filled: h.kind === "template" ? fillHook(h.text, project) : h.text })),
  );
});
