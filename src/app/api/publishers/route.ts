import { body, handle, json } from "@/lib/server/http";
import { PUBLISHER_LIST, uploadPostConnectUrl, uploadPostProfiles } from "@/lib/server/publishers";

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
  const b = await body<{ action: "upload-post-connect"; redirect?: string }>(req);
  if (b.action === "upload-post-connect") return json({ url: await uploadPostConnectUrl(b.redirect ?? "http://localhost:4747/settings?connected=1") });
  return json({ error: "unknown action" }, 400);
});
