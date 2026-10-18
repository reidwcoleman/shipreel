import { handle, json } from "@/lib/server/http";
import { postboxStatus } from "@/lib/server/postbox";

export const dynamic = "force-dynamic";

/** Postbox daemon, Chrome extension and account status (starts the daemon if it isn't running). */
export const GET = handle(async () => json(await postboxStatus()));
