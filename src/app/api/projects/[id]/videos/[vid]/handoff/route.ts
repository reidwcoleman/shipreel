import { bad, body, handle, json } from "@/lib/server/http";
import { airdrop, captionsFor, copyToClipboard, loadVideo, openUploadPage, postKit, renderedFile, saveToPhotos } from "@/lib/server/handoff";
import type { HandoffAction, Platform } from "@/lib/types";
import { PLATFORMS } from "@/remotion/spec";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string; vid: string }> };

/** The post kit: file, cover, per-platform captions and upload pages. */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { id, vid } = await ctx.params;
  return json(await postKit(id, vid));
});

/**
 * One-click hand-offs. Every action copies the caption first (Universal Clipboard carries it to
 * your iPhone), then: airdrop → AirDrop picker with the MP4; photos → import into the "Shipreel"
 * album; open → show the MP4 in Finder and open the platform's upload page; copy → just the caption.
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id, vid } = await ctx.params;
  const b = await body<{ action: HandoffAction; platform?: Platform; caption?: string; dryRun?: boolean }>(req);
  if (!["airdrop", "photos", "open", "copy"].includes(b.action)) return bad("Unknown action. Use airdrop, photos, open or copy.");
  const platform = (b.platform ?? "tiktok") as Platform;
  if (!PLATFORMS.includes(platform)) return bad(`Unknown platform: ${platform}`);
  const video = await loadVideo(id, vid);
  const caption = b.caption?.trim() ? b.caption : (captionsFor(video)[platform] ?? video.spec.title);
  if (b.action === "copy") {
    await copyToClipboard(caption);
    return json({ ok: true, copied: true, detail: "Caption copied." });
  }
  const file = renderedFile(id, video);
  if (!file) return bad("Render the video first.", 409);
  if (b.action === "open") {
    const r = await openUploadPage(file, platform, caption);
    return json({ ok: true, ...r, file, detail: r.copied ? "Caption copied. Drag the MP4 from Finder into the upload page, then paste." : "Drag the MP4 from Finder into the upload page." });
  }
  let copied = false;
  if (!b.dryRun) copied = await copyToClipboard(caption).then(() => true, () => false);
  if (b.action === "airdrop") return json({ ok: true, copied, file, ...(await airdrop(file, { dryRun: b.dryRun })) });
  return json({ ok: true, copied, file, ...(await saveToPhotos(file, { dryRun: b.dryRun })) });
});
