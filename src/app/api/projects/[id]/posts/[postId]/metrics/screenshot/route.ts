import fsp from "node:fs/promises";
import path from "node:path";
import { bad, handle, json } from "@/lib/server/http";
import { paths } from "@/lib/server/store";
import { readMetricsScreenshot } from "@/lib/server/tasks";

export const dynamic = "force-dynamic";
/** Drop an analytics screenshot; Claude reads the numbers and logs them on the post. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string; postId: string }> }) => {
  const { id, postId } = await ctx.params;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return bad("Attach a screenshot.");
  const ext = (path.extname(file.name) || ".png").toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".webp", ".heic"].includes(ext)) return bad("Use a PNG or JPG screenshot.");
  const dir = path.join(paths.project(id), "analytics");
  await fsp.mkdir(dir, { recursive: true });
  const dest = path.join(dir, `${postId}-${Date.now()}${ext === ".heic" ? ".heic" : ext}`);
  await fsp.writeFile(dest, Buffer.from(await file.arrayBuffer()));
  return json(await readMetricsScreenshot(id, postId, dest));
});
