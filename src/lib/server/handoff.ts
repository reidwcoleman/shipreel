import "server-only";
import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { Platform, Post, PostKit, VideoDoc } from "@/lib/types";
import { BROWSER_PLATFORMS } from "./browser-upload";
import { getVideo } from "./projects";
import { captionFor } from "./publishers";
import { specHash } from "./render";
import { APP_ROOT, paths } from "./store";

/**
 * The hand-off side of posting: everything for getting a finished MP4 onto a platform yourself, in
 * one click each. AirDrop to your iPhone (post from the app with a trending sound), save to Photos
 * (iCloud syncs it), or open the platform's upload page with the caption copied and the file shown.
 */

const run = promisify(execFile);


export const UPLOAD_PAGES: Partial<Record<Platform, string>> = {
  tiktok: "https://www.tiktok.com/tiktokstudio/upload",
  instagram: "https://www.instagram.com/",
  youtube: "https://www.youtube.com/upload",
  x: "https://x.com/compose/post",
  threads: "https://www.threads.com/",
  bluesky: "https://bsky.app/",
  linkedin: "https://www.linkedin.com/feed/?shareActive=true",
  facebook: "https://www.facebook.com/reels/create",
  pinterest: "https://www.pinterest.com/pin-creation-tool/",
};

const HAND_PLATFORMS: Platform[] = ["tiktok", "instagram", "youtube", "x", "threads", "bluesky", "linkedin"];

const blankPost = (captions: Post["captions"] = {}) => ({ captions }) as Post;

export function captionsFor(video: VideoDoc, overrides: Post["captions"] = {}): Partial<Record<Platform, string>> {
  return Object.fromEntries(HAND_PLATFORMS.map((p) => [p, overrides[p]?.trim() ? overrides[p]! : captionFor(blankPost(), video, p)]));
}

export async function loadVideo(projectId: string, videoId: string): Promise<VideoDoc> {
  const v = await getVideo(projectId, videoId);
  if (!v) throw new Error("video not found");
  return v;
}

export function renderedFile(projectId: string, video: VideoDoc): string | null {
  if (!video.render?.file) return null;
  const f = path.join(paths.project(projectId), video.render.file);
  return fs.existsSync(f) ? f : null;
}

export async function postKit(projectId: string, videoId: string): Promise<PostKit> {
  const video = await loadVideo(projectId, videoId);
  const file = renderedFile(projectId, video);
  const stale = !!file && video.render?.specHash !== specHash(video.spec);
  const media = (rel: string) => `/api/media/${projectId}/${rel.split("/").map(encodeURIComponent).join("/")}`;
  const cover = video.render?.thumb ? path.join(paths.project(projectId), video.render.thumb) : undefined;
  return {
    projectId,
    videoId,
    title: video.spec.title,
    ready: !!file && !stale && video.status === "rendered",
    stale,
    file: file ?? undefined,
    url: file ? media(video.render!.file) : undefined,
    cover: cover && fs.existsSync(cover) ? cover : undefined,
    coverUrl: cover && fs.existsSync(cover) ? media(video.render!.thumb!) : undefined,
    durationSec: video.render?.durationSec,
    sizeBytes: video.render?.sizeBytes,
    captions: captionsFor(video),
    uploadPages: UPLOAD_PAGES,
    browserPlatforms: BROWSER_PLATFORMS,
    soundTip: video.spec.meta.soundTip,
  };
}

// ── Clipboard ────────────────────────────────────────────────────────────────────

export function copyToClipboard(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (process.platform !== "darwin") return reject(new Error("Copying from the server needs macOS."));
    const p = spawn("pbcopy", [], { stdio: ["pipe", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += String(d)));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(err.trim() || `pbcopy exited ${code}`))));
    p.stdin.end(text);
  });
}

// ── AirDrop (compiled Swift helper: NSSharingService .sendViaAirDrop) ────────────────

const AIRDROP_SRC = path.join(APP_ROOT, "scripts", "airdrop.swift");
const AIRDROP_BIN = path.join(paths.bin(), "shipreel-airdrop");

async function airdropHelper(): Promise<string[]> {
  const src = await fsp.stat(AIRDROP_SRC).catch(() => null);
  if (!src) throw new Error(`The AirDrop helper source is missing (${path.relative(APP_ROOT, AIRDROP_SRC)}).`);
  const bin = await fsp.stat(AIRDROP_BIN).catch(() => null);
  if (bin && bin.mtimeMs >= src.mtimeMs) return [AIRDROP_BIN];
  await fsp.mkdir(paths.bin(), { recursive: true });
  try {
    await run("swiftc", ["-O", AIRDROP_SRC, "-o", AIRDROP_BIN], { timeout: 180_000 });
    return [AIRDROP_BIN];
  } catch (e) {
    const msg = (e as { stderr?: string }).stderr ?? (e as Error).message;
    if (/ENOENT|not found|xcrun: error/i.test(msg)) throw new Error("AirDrop needs Apple's command line tools. Run `xcode-select --install` in Terminal once, then try again.");
    throw new Error(`Couldn't build the AirDrop helper: ${msg.split("\n")[0].slice(0, 300)}`);
  }
}

/**
 * Open the AirDrop picker with the MP4. Resolves once the picker is up (or with the helper's error);
 * the helper keeps running until you pick a device or cancel.
 */
export async function airdrop(file: string, opts: { dryRun?: boolean } = {}): Promise<{ detail: string }> {
  if (process.platform !== "darwin") throw new Error("AirDrop needs a Mac.");
  if (!fs.existsSync(file)) throw new Error("Render the video first.");
  const cmd = await airdropHelper();
  return new Promise((resolve, reject) => {
    const child = spawn(cmd[0], [...cmd.slice(1), ...(opts.dryRun ? ["--dry-run"] : []), file], { stdio: ["ignore", "pipe", "pipe"], detached: !opts.dryRun });
    let out = "";
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    child.stdout.on("data", (d) => {
      out += String(d);
      const line = out.split("\n")[0].trim();
      if (!line) return;
      if (line.startsWith("ERR")) settle(() => reject(new Error(line.slice(4))));
      else if (line === "OK dry-run") settle(() => resolve({ detail: "AirDrop is ready (dry run: nothing was sent)." }));
    });
    child.on("error", (e) => settle(() => reject(e)));
    child.on("close", (code) => settle(() => (code === 0 ? resolve({ detail: out.includes("CANCELED") ? "AirDrop closed." : "Sent." }) : reject(new Error(out.trim() || `AirDrop helper exited ${code}`)))));
    // No error within a moment means the picker is on screen.
    const timer = setTimeout(() => settle(() => resolve({ detail: "Pick your iPhone in the AirDrop window." })), opts.dryRun ? 15_000 : 2500);
    if (!opts.dryRun) child.unref();
  });
}

// ── Photos (AppleScript import into a "Shipreel" album; iCloud Photos syncs it) ──────

const PHOTOS_SCRIPT = path.join(APP_ROOT, "scripts", "photos-import.applescript");

function photosError(raw: string): string {
  if (/-1743|not authori[sz]ed to send apple events/i.test(raw))
    return "macOS blocked Shipreel from using Photos. Open System Settings → Privacy & Security → Automation, find the app Shipreel runs in (Terminal, iTerm, VS Code…) and turn on Photos. Then try again.";
  if (/-1744|-1745|privacy|library access|not allowed/i.test(raw)) return "Photos needs your permission. Open System Settings → Privacy & Security → Photos and allow the app Shipreel runs in. Then try again.";
  if (/-600|isn.t running|application can.t be found/i.test(raw)) return "Photos didn't open. Open the Photos app once (so it finishes setting up its library), then try again.";
  if (/timed out|ETIMEDOUT|SIGTERM/i.test(raw)) return "Photos didn't answer in time. If macOS is asking for permission, allow it, then try again.";
  return `Photos couldn't import the video: ${raw.split("\n").filter(Boolean).at(-1)?.slice(0, 300) ?? raw.slice(0, 300)}`;
}

export async function saveToPhotos(file: string, opts: { dryRun?: boolean; album?: string } = {}): Promise<{ detail: string }> {
  if (process.platform !== "darwin") throw new Error("Saving to Photos needs a Mac.");
  if (!fs.existsSync(file)) throw new Error("Render the video first.");
  if (opts.dryRun) {
    // Compile the script (checks Photos' dictionary) without running it or touching the library.
    const out = path.join(paths.tmp(), `photos-check-${process.pid}.scpt`);
    await fsp.mkdir(paths.tmp(), { recursive: true });
    try {
      await run("osacompile", ["-o", out, PHOTOS_SCRIPT], { timeout: 30_000 });
    } catch (e) {
      throw new Error(photosError((e as { stderr?: string }).stderr ?? (e as Error).message));
    } finally {
      await fsp.rm(out, { recursive: true, force: true }).catch(() => undefined);
    }
    return { detail: "Photos import is ready (dry run: nothing was imported)." };
  }
  try {
    const { stdout } = await run("osascript", [PHOTOS_SCRIPT, file, opts.album ?? "Shipreel"], { timeout: 180_000 });
    if (!stdout.trim().startsWith("OK")) throw new Error(stdout.trim() || "no answer");
    return { detail: `Saved to the "${opts.album ?? "Shipreel"}" album in Photos. With iCloud Photos on, it shows up on your iPhone in a minute or so.` };
  } catch (e) {
    throw new Error(photosError((e as { stderr?: string }).stderr || (e as Error).message));
  }
}

// ── Upload pages (caption copied, file shown in Finder, page opened in your browser) ─

export async function openUploadPage(file: string | null, platform: Platform, caption: string, opts: { reveal?: boolean } = {}): Promise<{ url: string; copied: boolean }> {
  const url = UPLOAD_PAGES[platform];
  if (!url) throw new Error(`No upload page for ${platform}.`);
  let copied = false;
  try {
    await copyToClipboard(caption);
    copied = true;
  } catch {
    /* the page copies on its side too */
  }
  if (process.platform === "darwin") {
    if (file && opts.reveal !== false) await run("open", ["-R", file]).catch(() => undefined);
    await run("open", [url]);
  }
  return { url, copied };
}
