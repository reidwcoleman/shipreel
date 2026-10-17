import { HOOKS, rankHooks, scoreHookFor } from "@/framework/hooks";
import { fillHook, FORMAT_MAP } from "@/framework/formats";
import { bad, handle, json } from "@/lib/server/http";
import { getProject } from "@/lib/server/projects";

export const dynamic = "force-dynamic";
/** Family names from before the pattern library (the CLI/MCP may still send them). */
const OLD_FAMILIES: Record<string, string> = { reveal: "curiosity", forbidden: "curiosity", "time-shock": "before-after", listicle: "list", mistakes: "pain", "social-proof": "proof", "build-in-public": "build", story: "confession", challenge: "build" };
/**
 * The hook library with templates filled in for this product and scored by the linter (for the CLI,
 * MCP and agents). `?format=<id>` returns that format's ranked hooks instead; `?family=` filters.
 */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const project = await getProject(id);
  if (!project) return bad("project not found", 404);
  const url = new URL(req.url);
  const format = url.searchParams.get("format");
  if (format) {
    if (!FORMAT_MAP[format]) return bad("unknown format", 400);
    return json(rankHooks(format, project).map((h) => ({ text: h.text, template: h.template, family: h.pattern, score: h.score, reasons: h.reasons })));
  }
  const raw = url.searchParams.get("family");
  const family = raw ? (OLD_FAMILIES[raw] ?? raw) : null;
  return json(
    HOOKS.filter((h) => !family || h.family === family)
      .map((h) => {
        const filled = h.kind === "template" ? fillHook(h.text, project, {}, h.formats[0]) : h.text;
        return { ...h, filled, score: h.kind === "template" && filled ? scoreHookFor(filled, project, h.formats[0]).score : undefined };
      })
      .filter((h) => h.filled)
      .sort((a, b) => (b.score ?? b.strength * 18) - (a.score ?? a.strength * 18)),
  );
});
