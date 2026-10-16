import { bad, body, handle, json } from "@/lib/server/http";
import { addAssetFromUrl } from "@/lib/server/media";

export const dynamic = "force-dynamic";
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const b = await body<{ urls?: string[]; url?: string }>(req);
  const urls = b.urls ?? (b.url ? [b.url] : []);
  if (!urls.length) return bad("No URL.");
  const out = [];
  for (const [i, u] of urls.entries()) out.push(await addAssetFromUrl(id, u, urls.length > 1 ? `screenshot-${i + 1}` : undefined));
  return json(out, 201);
});
