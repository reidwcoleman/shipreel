import "server-only";
import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { Post, PostboxPlatform, PostboxStatus, PostResult, PostStatus, VideoDoc } from "@/lib/types";
import { getSettings, now, saveSettings } from "./store";

/**
 * Postbox: the local auto-poster (~/Postbox, launchd agent com.reidcoleman.postbox) that posts to
 * TikTok, YouTube and Instagram through a Chrome extension in the user's own Chrome. Shipreel hands
 * it the rendered MP4; Postbox holds scheduled posts itself, so they go out even when Shipreel is off.
 */
export const POSTBOX_URL = "http://127.0.0.1:4710" as const;
const POSTBOX_HOME = process.env.POSTBOX_HOME ?? path.join(os.homedir(), "Postbox");
export const POSTBOX_PLATFORMS: PostboxPlatform[] = ["tiktok", "youtube", "instagram"];
const LAUNCHD_LABEL = "com.reidcoleman.postbox";

const run = promisify(execFile);

/** One post as Postbox stores it (see ~/Postbox/src/posts.js). */
export type PbPost = {
  id: string;
  status: "queued" | "scheduled" | "running" | "done" | "partial" | "failed" | "cancelled";
  scheduleAt: string | null;
  dryRun: boolean;
  results: Record<string, { status: "queued" | "uploading" | "posted" | "ready" | "failed" | "cancelled"; url?: string; error?: string; note?: string; shot?: string; log?: string[] }>;
};

export async function postboxHealthy(timeoutMs = 1500): Promise<boolean> {
  try {
    const res = await fetch(`${POSTBOX_URL}/api/health`, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

const g = globalThis as unknown as { __shipreelPostboxStart?: Promise<boolean> };

/** Start the daemon if it isn't answering (launchd first, then the way ~/Postbox/mcp.js does it). */
export function ensurePostbox(): Promise<boolean> {
  return (g.__shipreelPostboxStart ??= (async () => {
    if (await postboxHealthy()) return true;
    const uid = process.getuid?.();
    const kicked = uid !== undefined && (await run("launchctl", ["kickstart", `gui/${uid}/${LAUNCHD_LABEL}`]).then(() => true, () => false));
    const server = path.join(POSTBOX_HOME, "src", "server.js");
    if (!kicked && fs.existsSync(server)) {
      const dataDir = path.join(POSTBOX_HOME, "data");
      fs.mkdirSync(dataDir, { recursive: true });
      const log = fs.openSync(path.join(dataDir, "daemon.log"), "a");
      spawn(process.execPath, [server], { cwd: POSTBOX_HOME, detached: true, stdio: ["ignore", log, log] }).unref();
    }
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 250));
      if (await postboxHealthy()) return true;
    }
    return false;
  })().finally(() => setTimeout(() => (g.__shipreelPostboxStart = undefined), 5000)));
}

async function pb<T>(method: string, route: string, body?: unknown, timeoutMs = 15_000): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${POSTBOX_URL}${route}`, {
      method,
      headers: body !== undefined ? { "content-type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new Error(`Postbox isn't answering at ${POSTBOX_URL}. Restart it: launchctl kickstart -k gui/$(id -u)/${LAUNCHD_LABEL}`);
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(`Postbox: ${data.error ?? `HTTP ${res.status}`}`);
  return data;
}

export async function postboxStatus(): Promise<PostboxStatus> {
  const daemon = await ensurePostbox();
  if (!daemon) return { daemon: false, extension: null, accounts: POSTBOX_PLATFORMS.map((id) => ({ id, name: LABEL[id], connected: null })), dashboardUrl: POSTBOX_URL };
  const [ext, accounts] = await Promise.all([
    pb<{ connected: boolean }>("GET", "/api/extension").catch(() => ({ connected: false })),
    pb<{ id: PostboxPlatform; name: string; connected: boolean | null }[]>("GET", "/api/accounts?refresh=1").catch(() => []),
  ]);
  void maybeDefaultToPostbox(true);
  return {
    daemon: true,
    // Contract: null = unknown / the Chrome extension isn't connected.
    extension: ext.connected ? true : null,
    accounts: POSTBOX_PLATFORMS.map((id) => accounts.find((a) => a.id === id) ?? { id, name: LABEL[id], connected: null }),
    dashboardUrl: POSTBOX_URL,
  };
}

const LABEL: Record<PostboxPlatform, string> = { tiktok: "TikTok", youtube: "YouTube", instagram: "Instagram" };

export async function postboxConnect(platform: string): Promise<{ message: string }> {
  if (!POSTBOX_PLATFORMS.includes(platform as PostboxPlatform)) throw new Error(`Postbox posts to ${POSTBOX_PLATFORMS.join(", ")}.`);
  if (!(await ensurePostbox())) throw new Error("Postbox isn't running and didn't start.");
  const r = await pb<{ message?: string }>("POST", `/api/accounts/${platform}/connect`);
  return { message: r.message ?? `Opened ${LABEL[platform as PostboxPlatform]} in your Chrome.` };
}

export async function postboxReady(): Promise<{ ok: boolean; reason?: string }> {
  if (!(await ensurePostbox())) return { ok: false, reason: `Postbox isn't running (${POSTBOX_URL}). Start it: launchctl kickstart -k gui/$(id -u)/${LAUNCHD_LABEL}` };
  const accounts = await pb<{ id: string; connected: boolean | null }[]>("GET", "/api/accounts").catch(() => null);
  if (!accounts) return { ok: false, reason: "Postbox didn't answer." };
  if (accounts.every((a) => a.connected === null)) return { ok: true, reason: `Turn on the Postbox Chrome extension so it can post (setup: ${POSTBOX_URL}).` };
  if (!accounts.some((a) => a.connected)) return { ok: true, reason: `No accounts connected in Postbox yet (${POSTBOX_URL}).` };
  return { ok: true };
}

export const postboxGet = (id: string) => pb<PbPost>("GET", `/api/posts/${encodeURIComponent(id)}`);
export const postboxCancel = (id: string) => pb<PbPost>("POST", `/api/posts/${encodeURIComponent(id)}/cancel`);

export function postboxSubmit(input: { file: string; platforms: PostboxPlatform[]; captions: Partial<Record<PostboxPlatform, string>>; title: string; scheduleAt?: string; dryRun?: boolean }): Promise<PbPost> {
  return pb<PbPost>("POST", "/api/posts", { file: input.file, platforms: input.platforms, caption: input.captions.tiktok ?? "", captions: input.captions, title: input.title, privacy: "public", scheduleAt: input.scheduleAt, dryRun: !!input.dryRun });
}

/**
 * Captions Postbox gets: TikTok and Instagram as Shipreel writes them (hashtags included), YouTube's
 * description (the long caption) and its Shorts title. A post's own `postbox.captions` win verbatim.
 */
export function postboxCaptions(
  post: Pick<Post, "captions" | "postbox">,
  video: VideoDoc,
  captionFor: (post: Post, video: VideoDoc, p: "tiktok" | "instagram" | "youtube") => string,
): { tiktok: string; instagram: string; youtube: string; title: string } {
  const p = { captions: post.captions ?? {} } as Post;
  const own = post.postbox?.captions ?? {};
  return {
    tiktok: own.tiktok ?? captionFor(p, video, "tiktok"),
    instagram: own.instagram ?? captionFor(p, video, "instagram"),
    youtube: own.youtube ?? captionFor(p, video, "instagram"),
    title: (post.postbox?.title ?? captionFor(p, video, "youtube")).slice(0, 100),
  };
}

const NEEDS_YOU = /not logged in|not connected|extension|connect the account/i;

/** Postbox's view of a post → Shipreel's status and per-platform results. */
export function mapPostbox(pbPost: PbPost): { status: PostStatus; results: PostResult[] } {
  const results: PostResult[] = [];
  for (const [platform, r] of Object.entries(pbPost.results ?? {})) {
    if (r.status === "queued" || r.status === "uploading") continue;
    const shot = r.shot ? `Screenshot: ${POSTBOX_URL}/shots/${path.basename(r.shot)}` : undefined;
    results.push({
      platform: platform as PostResult["platform"],
      ok: r.status === "posted" || r.status === "ready",
      url: r.url,
      error: r.status === "failed" ? r.error ?? "failed" : r.status === "cancelled" ? "Cancelled" : undefined,
      note: [r.status === "ready" ? "Dry run: filled in Chrome, not posted" : r.note, shot].filter(Boolean).join(" · ") || undefined,
      mode: r.status === "posted" ? "published" : undefined,
      at: now(),
    });
  }
  const failed = results.filter((r) => !r.ok);
  let status: PostStatus;
  switch (pbPost.status) {
    case "scheduled":
      status = "scheduled";
      break;
    case "queued":
    case "running":
      status = "posting";
      break;
    case "done":
      status = pbPost.dryRun ? "needs-you" : "posted";
      break;
    case "partial":
      status = pbPost.dryRun ? "needs-you" : "partial";
      break;
    case "cancelled":
      status = "canceled";
      break;
    default:
      // Nothing posted because an account or the Chrome extension isn't connected: that's on the user, not a crash.
      status = failed.length && failed.every((r) => NEEDS_YOU.test(r.error ?? "")) ? "needs-you" : "failed";
  }
  return { status, results };
}

/** Once: when Postbox answers and the default service is still "manual", make Postbox the default. */
export async function maybeDefaultToPostbox(knownUp = false): Promise<void> {
  if (process.env.SHIPREEL_POSTBOX_DEFAULT === "off") return;
  const s = await getSettings();
  if (s.postboxDefaulted) return;
  if (!knownUp && !(await postboxHealthy())) return;
  await saveSettings(s.defaultProvider === "manual" ? { defaultProvider: "postbox", postboxDefaulted: true } : { postboxDefaulted: true });
}
