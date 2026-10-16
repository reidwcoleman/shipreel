import { execFile } from "node:child_process";
import fsp from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { bad, body, handle, json } from "@/lib/server/http";
import { APP_ROOT, paths, WORKSPACE } from "@/lib/server/store";

export const dynamic = "force-dynamic";
const run = promisify(execFile);
const SAFE_TO_OPEN = new Set([".md", ".json", ".txt", ".mp4", ".mov", ".m4v", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp3", ".m4a", ".wav"]);

/** Reveal a workspace file in Finder, or open a URL in the default browser. */
export const POST = handle(async (req: Request) => {
  const b = await body<{ path?: string; url?: string; reveal?: boolean; projectId?: string; rel?: string }>(req);
  if (b.projectId && b.rel) b.path = path.join(paths.project(b.projectId), b.rel);
  if (b.url) {
    if (!/^https?:\/\//.test(b.url)) return bad("Only web links.");
    await run("open", [b.url]);
    return json({ ok: true });
  }
  if (b.path) {
    const p = path.resolve(b.path);
    const inside = (root: string) => p === root || p.startsWith(root + path.sep);
    if (!inside(WORKSPACE) && !inside(APP_ROOT)) return bad("Outside the workspace.", 403);
    // Opening runs whatever app owns the file, so only plain folders and documents/media open;
    // anything else (scripts, .command files, app bundles) is shown in Finder instead.
    const st = await fsp.stat(p).catch(() => null);
    if (!st) return bad("That file doesn't exist.", 404);
    const ext = path.extname(p).toLowerCase();
    const safe = st.isDirectory() ? ext === "" : SAFE_TO_OPEN.has(ext);
    await run("open", b.reveal || !safe ? ["-R", p] : [p]);
    return json({ ok: true });
  }
  return bad("Nothing to open.");
});
