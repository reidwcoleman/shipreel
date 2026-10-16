import { bad, body, handle, json } from "@/lib/server/http";
import { cloneFromUrl } from "@/lib/server/tasks";

export const dynamic = "force-dynamic";
/** Paste a viral video link; Claude rebuilds its format for this product. Returns the agent run. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const b = await body<{ url?: string }>(req);
  if (!b.url?.trim()) return bad("Paste a link to the video.");
  return json(await cloneFromUrl(id, b.url.trim()));
});
