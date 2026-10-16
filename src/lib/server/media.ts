import "server-only";
import { execFile } from "node:child_process";
import fsp from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { Asset, AssetRole } from "@/lib/types";
import { emit, now, paths, readJson, updateJson } from "./store";

const run = promisify(execFile);

export const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".json": "application/json",
  ".zip": "application/zip",
};

export function kindOf(file: string): Asset["kind"] | null {
  const ext = path.extname(file).toLowerCase();
  if ([".mp4", ".m4v", ".mov", ".webm"].includes(ext)) return "video";
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) return "image";
  if ([".mp3", ".m4a", ".wav", ".aac", ".ogg"].includes(ext)) return "audio";
  return null;
}

type Probe = { width?: number; height?: number; durationSec?: number; vcodec?: string };

export async function probe(file: string): Promise<Probe> {
  try {
    const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height:format=duration", "-of", "json", file]);
    const j = JSON.parse(stdout) as { streams?: { codec_type: string; codec_name: string; width?: number; height?: number }[]; format?: { duration?: string } };
    const v = j.streams?.find((s) => s.codec_type === "video");
    const d = Number(j.format?.duration);
    return { width: v?.width, height: v?.height, vcodec: v?.codec_name, durationSec: Number.isFinite(d) ? d : undefined };
  } catch {
    return {};
  }
}

function uniqueName(dir: string, name: string): Promise<string> {
  const ext = path.extname(name);
  const base =
    path
      .basename(name, ext)
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "file";
  return (async () => {
    let n = 0;
    for (;;) {
      const candidate = `${base}${n ? `-${n}` : ""}${ext.toLowerCase()}`;
      try {
        await fsp.access(path.join(dir, candidate));
        n++;
      } catch {
        return candidate;
      }
    }
  })();
}

/** Save an uploaded/downloaded file as a project asset: normalise video to H.264, make a thumbnail. */
export async function addAsset(projectId: string, originalName: string, data: Buffer): Promise<Asset> {
  const dir = paths.assets(projectId);
  await fsp.mkdir(dir, { recursive: true });
  const kind = kindOf(originalName);
  if (!kind) throw new Error(`Unsupported file type: ${path.extname(originalName) || originalName}`);
  let file = await uniqueName(dir, originalName);
  let full = path.join(dir, file);
  await fsp.writeFile(full, data);

  let info = kind === "audio" ? await probe(full) : await probe(full);
  if (kind === "video" && (info.vcodec !== "h264" || path.extname(file) !== ".mp4")) {
    // Players and the renderer both like H.264 MP4 best (HEVC .mov from iPhones is hit-and-miss in Chrome).
    const mp4 = await uniqueName(dir, `${path.basename(file, path.extname(file))}.mp4`);
    const out = path.join(dir, mp4);
    try {
      await run(
        "ffmpeg",
        ["-v", "error", "-y", "-i", full, "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", "-vf", "scale='min(1920,iw)':-2", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "160k", out],
        { maxBuffer: 1 << 24 },
      );
      await fsp.rm(full, { force: true });
      file = mp4;
      full = out;
      info = await probe(full);
    } catch (e) {
      console.warn("[media] transcode failed, keeping original", e);
    }
  }

  let thumb: string | undefined;
  if (kind !== "audio") {
    thumb = `.thumbs/${path.basename(file, path.extname(file))}.jpg`;
    await fsp.mkdir(path.join(dir, ".thumbs"), { recursive: true });
    try {
      const at = kind === "video" ? Math.min(1, (info.durationSec ?? 1) / 3).toFixed(2) : "0";
      await run("ffmpeg", ["-v", "error", "-y", ...(kind === "video" ? ["-ss", at] : []), "-i", full, "-frames:v", "1", "-vf", "scale=480:-2", "-q:v", "4", path.join(dir, thumb)]);
    } catch {
      thumb = undefined;
    }
  }

  const stat = await fsp.stat(full);
  const asset: Asset = {
    file,
    kind,
    role: guessRole(originalName, kind, info.width, info.height),
    name: originalName,
    width: info.width,
    height: info.height,
    durationSec: info.durationSec,
    sizeBytes: stat.size,
    thumb,
    createdAt: now(),
  };
  await updateJson<Asset[]>(paths.assetsIndex(projectId), [], (cur) => [asset, ...cur.filter((a) => a.file !== file)]);
  emit({ type: "project", projectId });
  return asset;
}

export async function addAssetFromUrl(projectId: string, url: string, name?: string): Promise<Asset> {
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 Shipreel" } });
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") ?? "";
  const ext = ct.includes("png") ? ".png" : ct.includes("webp") ? ".webp" : ct.includes("jpeg") || ct.includes("jpg") ? ".jpg" : ct.includes("mp4") ? ".mp4" : path.extname(new URL(url).pathname) || ".jpg";
  const base = name ?? (path.basename(new URL(url).pathname, path.extname(new URL(url).pathname)) || "image");
  return addAsset(projectId, `${base}${ext}`, buf);
}

/** Best guess at what a file is, from its name and shape. The user can change it. */
export function guessRole(name: string, kind: Asset["kind"], width?: number, height?: number): AssetRole | undefined {
  const n = name.toLowerCase();
  if (kind === "audio") return "music";
  if (/icon|logo/.test(n)) return "logo";
  if (/simulator|screen|recording|appstore|screenshot|capture|demo/.test(n)) return "screen";
  if (kind === "video" && /broll|b-roll|stock|pexels|mixkit|pixabay|footage|vlog/.test(n)) return "broll";
  // Whole words only for the short ones: "home.png" and "camera-roll.png" are not face cams.
  if (/face|selfie|webcam|talking/.test(n) || /(^|[^a-z])(cam|me)([^a-z]|$)/.test(n)) return "facecam";
  if (kind === "image" && width && height) {
    const r = width / height;
    if (Math.abs(r - 1) < 0.05) return "logo";
    // Phone screenshots are ~9:19.5 (0.46) and almost always PNG; camera photos are 3:4 or 9:16 JPEG/HEIC.
    if (r < 0.5 || (/\.png$/.test(n) && r < 0.8)) return "screen";
  }
  // Vertical camera footage is exactly 9:16; phone screen recordings are ~0.46 (desktop 16:9 recordings stay "screen").
  if (kind === "video" && width && height && Math.abs(width / height - 9 / 16) < 0.01) return "broll";
  return kind === "video" ? "screen" : "photo";
}

export async function setAssetRole(projectId: string, file: string, role: AssetRole): Promise<void> {
  await updateJson<Asset[]>(paths.assetsIndex(projectId), [], (cur) => cur.map((a) => (a.file === file ? { ...a, role } : a)));
  emit({ type: "project", projectId });
}

export async function listAssets(projectId: string): Promise<Asset[]> {
  return readJson<Asset[]>(paths.assetsIndex(projectId), []);
}

export async function deleteAsset(projectId: string, file: string): Promise<void> {
  const safe = path.basename(file);
  await fsp.rm(path.join(paths.assets(projectId), safe), { force: true });
  await fsp.rm(path.join(paths.assets(projectId), ".thumbs", `${path.basename(safe, path.extname(safe))}.jpg`), { force: true });
  await updateJson<Asset[]>(paths.assetsIndex(projectId), [], (cur) => cur.filter((a) => a.file !== safe));
  emit({ type: "project", projectId });
}

/** Resolve a path requested under /api/media/<project>/… to a file inside that project, or null. */
export function resolveProjectFile(projectId: string, rel: string[]): string | null {
  const root = paths.project(projectId);
  const joined = path.join(root, ...rel);
  const normalized = path.normalize(joined);
  if (!normalized.startsWith(root + path.sep)) return null;
  // Asset references in specs are bare file names; map them into assets/.
  if (rel.length === 1 && !["renders", "assets"].includes(rel[0])) return path.join(root, "assets", path.basename(rel[0]));
  return normalized;
}
