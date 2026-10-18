import { bad, body, handle, json, requestOrigin } from "@/lib/server/http";
import { getReviewItem, reviewAction, type ReviewAction } from "@/lib/server/review";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ projectId: string; videoId: string }> };

export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { projectId, videoId } = await ctx.params;
  return json(await getReviewItem(projectId, videoId, requestOrigin(req)));
});

/** approve (posts through Postbox) · revise (the agent edits, it re-renders, back to pending) · reject · reopen. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { projectId, videoId } = await ctx.params;
  const b = await body<ReviewAction>(req);
  if (!["approve", "revise", "reject", "reopen", "submit"].includes(b.action)) return bad('action must be "approve", "revise", "reject" or "reopen".');
  if (b.action === "revise" && !b.note?.trim()) return bad("Say what to change (note).");
  try {
    return json(await reviewAction(projectId, videoId, b, requestOrigin(req)));
  } catch (e) {
    const m = (e as Error).message;
    return bad(m, /not found/i.test(m) ? 404 : /already|still revising|can't be pulled/i.test(m) ? 409 : /must be|say what/i.test(m) ? 400 : 500);
  }
});
