import { body, handle, json } from "@/lib/server/http";
import { BROWSER_PLATFORMS, closeBrowser, isBrowserPlatform, openLoginWindow } from "@/lib/server/browser-upload";
import { PUBLISHER_LIST, testBluesky, testUploadPost, uploadPostConnectUrl, uploadPostProfiles } from "@/lib/server/publishers";
import { paths } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  if (new URL(req.url).searchParams.has("profiles")) {
    try {
      return json({ profiles: await uploadPostProfiles() });
    } catch (e) {
      return json({ profiles: [], error: (e as Error).message });
    }
  }
  return json(await Promise.all(PUBLISHER_LIST.map(async (p) => ({ id: p.id, label: p.label, blurb: p.blurb, platforms: p.platforms, ...(await p.ready()) }))));
});

export const POST = handle(async (req: Request) => {
  const b = await body<{ action: "upload-post-connect" | "test-upload-post" | "test-bluesky" | "browser-login" | "browser-close"; redirect?: string; platforms?: string[] }>(req);
  if (b.action === "upload-post-connect") return json({ url: await uploadPostConnectUrl(b.redirect ?? "http://localhost:4747/settings?connected=1") });
  if (b.action === "test-upload-post") return json(await testUploadPost());
  if (b.action === "test-bluesky") return json(await testBluesky());
  // Shipreel's own Chrome window: a login tab for each site you're not logged in to yet.
  if (b.action === "browser-login") {
    const platforms = (b.platforms ?? BROWSER_PLATFORMS).filter(isBrowserPlatform);
    return json({ loggedIn: await openLoginWindow(paths.browserProfile(), platforms.length ? platforms : BROWSER_PLATFORMS) });
  }
  if (b.action === "browser-close") {
    await closeBrowser();
    return json({ ok: true });
  }
  return json({ error: "unknown action" }, 400);
});
