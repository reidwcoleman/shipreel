import fsp from "node:fs/promises";
import path from "node:path";
import { FORMATS } from "@/framework/formats";
import { HOOK_FAMILIES, HOOKS } from "@/framework/hooks";
import { normalizeSound, SOUNDS, type Sound } from "@/framework/sounds";
import { handle, json } from "@/lib/server/http";
import { APP_ROOT, WORKSPACE } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  // Where things live, for the "drive Shipreel from your own agent" instructions.
  if (new URL(req.url).searchParams.has("paths"))
    return json({ workspace: WORKSPACE, appRoot: APP_ROOT, cli: path.join(APP_ROOT, "bin", "shipreel.mjs"), mcp: path.join(APP_ROOT, "bin", "shipreel-mcp.mjs") });
  let trends: { refreshedAt?: string; sounds?: Record<string, unknown>[]; notes?: string } = {};
  try {
    trends = JSON.parse(await fsp.readFile(path.join(WORKSPACE, "trends.json"), "utf8"));
  } catch {
    /* never refreshed */
  }
  const fresh = (trends.sounds ?? []).map((s, i) => normalizeSound({ ...s, as_of: trends.refreshedAt?.slice(0, 10), source: "Refreshed by your agent" }, i)).filter(Boolean) as Sound[];
  const seen = new Set<string>();
  const sounds = [...fresh, ...SOUNDS].filter((s) => {
    const k = `${s.title}|${s.artist}`.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const formats = FORMATS.map(({ build: _build, ...meta }) => meta);
  return json({ formats, hooks: HOOKS, families: HOOK_FAMILIES, sounds, trendsRefreshedAt: trends.refreshedAt ?? null, trendNotes: trends.notes ?? null });
});
