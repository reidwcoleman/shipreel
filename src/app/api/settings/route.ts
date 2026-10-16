import { body, handle, json } from "@/lib/server/http";
import { getSettings, saveSettings } from "@/lib/server/store";
import type { Settings } from "@/lib/types";

export const dynamic = "force-dynamic";
export const GET = handle(async () => json(await getSettings()));
export const PUT = handle(async (req: Request) => json(await saveSettings(await body<Partial<Settings>>(req))));
