import "server-only";
import { execFile } from "node:child_process";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { addAsset, listAssets } from "./media";
import { paths } from "./store";

const run = promisify(execFile);

/**
 * Carousel photos from the project's own b-roll: for every real-life clip, the sharpest, best-exposed
 * frames (cropped to 3:4, the carousel canvas), saved once as photo assets (`photo-<clip>.jpg`, and a
 * second moment `photo-<clip>-b.jpg`). Carousels pick them by file name like any uploaded photo.
 */

/** Sharpness (variance of a Laplacian) × exposure (penalise crushed or blown frames). */
async function score(file: string): Promise<number> {
  const img = sharp(file).greyscale().resize(270, 360, { fit: "cover" });
  const lap = await img
    .clone()
    .convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0] })
    .raw()
    .toBuffer();
  let s = 0;
  let s2 = 0;
  for (const v of lap) {
    s += v;
    s2 += v * v;
  }
  const varLap = s2 / lap.length - (s / lap.length) ** 2;
  const { channels } = await img.stats();
  const mean = channels[0].mean / 255;
  const exposure = 1 - Math.min(1, Math.abs(mean - 0.45) * 2.2);
  return varLap * (0.35 + exposure);
}

async function grab(video: string, at: number, out: string, w: number, h: number) {
  // Crop the 9:16 frame to 3:4 around the centre (a touch high: faces and hands sit above the middle).
  const ch = Math.round((w * 4) / 3);
  const y = Math.max(0, Math.min(h - ch, Math.round((h - ch) * 0.42)));
  const crop = h / w > 1.4 ? `crop=${w}:${ch}:0:${y},` : "";
  await run("ffmpeg", ["-v", "error", "-y", "-ss", at.toFixed(2), "-i", video, "-frames:v", "1", "-vf", `${crop}scale=1080:1440:force_original_aspect_ratio=increase,crop=1080:1440`, "-q:v", "2", out]);
}

const inflight = new Map<string, Promise<number>>();

/** Make sure every b-roll clip has its stills. Returns how many new photos were added. Cheap when cached. */
export function ensureBrollStills(projectId: string): Promise<number> {
  const running = inflight.get(projectId);
  if (running) return running;
  const job = doEnsure(projectId).finally(() => inflight.delete(projectId));
  inflight.set(projectId, job);
  return job;
}

async function doEnsure(projectId: string): Promise<number> {
  const assets = await listAssets(projectId);
  const have = new Set(assets.map((a) => a.file));
  const clips = assets.filter((a) => a.kind === "video" && a.role === "broll" && !/^(ai-|hookclip-)/.test(a.file) && (a.durationSec ?? 0) >= 1.5);
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), "shipreel-stills-"));
  let added = 0;
  try {
    for (const clip of clips) {
      const base = path.basename(clip.file, path.extname(clip.file));
      const want = [`photo-${base}.jpg`, `photo-${base}-b.jpg`].filter((n) => !have.has(n));
      if (!want.length) continue;
      const src = path.join(paths.assets(projectId), clip.file);
      const d = clip.durationSec ?? 4;
      const times = [0.12, 0.28, 0.45, 0.62, 0.8].map((f) => +(f * d).toFixed(2));
      const scored: { at: number; file: string; s: number }[] = [];
      for (const at of times) {
        const f = path.join(tmp, `${base}-${at}.jpg`);
        try {
          await grab(src, at, f, clip.width ?? 1080, clip.height ?? 1920);
          scored.push({ at, file: f, s: await score(f) });
        } catch {
          /* unreadable frame: skip */
        }
      }
      scored.sort((a, b) => b.s - a.s);
      // Two different moments: the best frame, then the best one at least a third of the clip away.
      const picks = [scored[0], scored.find((x) => scored[0] && Math.abs(x.at - scored[0].at) >= d / 3)].filter(Boolean) as typeof scored;
      for (const [i, name] of want.entries()) {
        const pickIdx = name.endsWith("-b.jpg") ? 1 : 0;
        const pk = picks[pickIdx] ?? picks[i];
        if (!pk) continue;
        await addAsset(projectId, name, await fsp.readFile(pk.file));
        have.add(name);
        added++;
      }
    }
  } finally {
    await fsp.rm(tmp, { recursive: true, force: true });
  }
  return added;
}
