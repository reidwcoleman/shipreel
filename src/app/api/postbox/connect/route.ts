import { bad, body, handle, json } from "@/lib/server/http";
import { POSTBOX_PLATFORMS, postboxConnect } from "@/lib/server/postbox";
import type { PostboxPlatform } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Opens the platform's login page in the user's own Chrome (they log in; nothing is typed for them). */
export const POST = handle(async (req: Request) => {
  const b = await body<{ platform?: string }>(req);
  if (!b.platform || !POSTBOX_PLATFORMS.includes(b.platform as PostboxPlatform)) return bad(`platform must be one of ${POSTBOX_PLATFORMS.join(", ")}`);
  return json(await postboxConnect(b.platform));
});
