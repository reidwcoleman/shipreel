import { bad, body, handle, json } from "@/lib/server/http";
import { addAsset, deleteAsset, listAssets, setAssetRole } from "@/lib/server/media";
import type { AssetRole } from "@/lib/types";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => json(await listAssets((await ctx.params).id)));
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) return bad("No files uploaded.");
  const out = [];
  for (const f of files) out.push(await addAsset(id, f.name, Buffer.from(await f.arrayBuffer())));
  return json(out, 201);
});
export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const b = await body<{ file: string }>(req);
  if (!b.file) return bad("Which file?");
  await deleteAsset(id, b.file);
  return json({ ok: true });
});
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const b = await body<{ file: string; role: AssetRole }>(req);
  if (!b.file || !b.role) return bad("file and role required");
  await setAssetRole(id, b.file, b.role);
  return json({ ok: true });
});
