import "server-only";
import fsp from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { CaptionStyleId, TextStyle, VideoSpec } from "@/remotion/spec";
import { FPS } from "@/remotion/spec";
import { layoutScenes, secToFrames } from "@/remotion/timeline";

/**
 * Render-time text fit. Native app videos put TikTok text straight over the footage or the raw
 * screen; ours used fixed anchors, so a caption could land on the app's own header or a chip row
 * (text on text) or white outline text could sit on a cream screen. This pass renders the video
 * once without text at low resolution, measures how busy and how bright each band of the frame is
 * at the moments a caption shows, then
 *   - slides the caption to the quietest band near where the format wanted it (style.y), and
 *   - swaps white text for the boxed version of the same style when the band is light and busy.
 * Captions that already have a `y` (fitted before, or placed by hand) are left alone.
 */

type Stills = (props: { spec: VideoSpec }, stills: { frame: number; out: string; scale: number; format: "jpeg" }[]) => Promise<void>;

type Target = {
  style: () => TextStyle | undefined;
  set: (s: TextStyle) => void;
  /** Captions fitted together (a list that grows one line per cut keeps one position). */
  also: ((s: TextStyle) => void)[];
  texts: string[];
  frames: number[];
  pos: string;
  /** On screen in the first second: the hook, which has to read instantly. */
  hook?: boolean;
};

// Safe area on a 1080×1920 frame (TikTok's template: 240 top, 660 bottom), as fractions.
const SAFE_TOP = 240 / 1920;
const SAFE_BOTTOM = 1 - 660 / 1920;
const POS: Record<string, number> = { top: 0.08, upper: 0.16, center: 0.5, low: 0.86, lower: 0.78, bottom: 0.95 };
const prefY = (pos: string) => SAFE_TOP + (SAFE_BOTTOM - SAFE_TOP) * (POS[pos] ?? 0.5);

// [size (× width), line height (em), max width (× width), box padding (em)] per style, matching ui/text.tsx.
const METRICS: Partial<Record<CaptionStyleId, [number, number, number, number]>> = {
  "tiktok-classic": [0.06, 1.23, 0.78, 0],
  "tiktok-plain": [0.059, 1.28, 0.7, 0],
  "tiktok-heavy": [0.057, 1.2, 0.78, 0],
  "tiktok-box": [0.046, 1.74, 0.78, 0.27],
  "serif-box": [0.056, 1.74, 0.78, 0.27],
  "serif-white": [0.052, 1.08, 0.78, 0],
};
const BOXED: Partial<Record<CaptionStyleId, CaptionStyleId>> = {
  "tiktok-classic": "tiktok-box",
  "tiktok-plain": "tiktok-box",
  "tiktok-heavy": "tiktok-box",
  "serif-white": "serif-box",
};
const SKIP = new Set<string>(["snapchat"]);

/** Height of a text block as a fraction of a 1920-tall frame (generous: it errs towards more room). */
function textHeight(text: string, style: CaptionStyleId, size?: number): number {
  const [s, lh, maxW, padY] = METRICS[style] ?? [0.06, 1.25, 0.78, 0];
  const px = (size ?? s) * 1080;
  const perLine = Math.max(8, Math.floor((1080 * maxW) / (px * 0.55)));
  const plain = (l: string) => l.replace(/\*/g, "");
  const lines = text.split(/\\n|\n/).reduce((n, l) => n + Math.max(1, Math.ceil(plain(l).length / perLine)), 0);
  return (lines * lh * px + 2 * padY * px) / 1920;
}

/** Per-row edge density (share of pixels on a hard edge) and mean luminance of a still. */
async function profile(file: string): Promise<{ edge: number[]; lum: number[]; bright: number[] }> {
  const { data, info } = await sharp(file).greyscale().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const x0 = Math.round(W * 0.1);
  const x1 = Math.round(W * 0.9);
  const c0 = Math.round(W * 0.2);
  const c1 = Math.round(W * 0.8);
  const edge: number[] = [];
  const lum: number[] = [];
  const bright: number[] = [];
  for (let y = 0; y < H; y++) {
    let e = 0;
    let l = 0;
    let b = 0;
    for (let x = x0; x < x1; x++) {
      const p = data[y * W + x];
      const dx = Math.abs(data[y * W + x + 1] - p);
      const dy = y + 1 < H ? Math.abs(data[(y + 1) * W + x] - p) : 0;
      if (dx + dy > 26) e++;
      // Brightness only where centred text actually sits (the middle 60%).
      if (x >= c0 && x < c1) {
        l += p;
        if (p > 170) b++;
      }
    }
    edge.push(e / (x1 - x0));
    lum.push(l / (c1 - c0) / 255);
    bright.push(b / (c1 - c0));
  }
  return { edge, lum, bright };
}

const bandMean = (rows: number[], a: number, b: number) => {
  const H = rows.length;
  const i0 = Math.max(0, Math.floor(a * H));
  const i1 = Math.min(H, Math.ceil(b * H));
  let s = 0;
  for (let i = i0; i < i1; i++) s += rows[i];
  return i1 > i0 ? s / (i1 - i0) : 0;
};

function targetsOf(spec: VideoSpec): Target[] {
  const out: Target[] = [];
  const fallback = spec.theme.captionStyle;
  const { timed } = layoutScenes(spec.scenes);
  for (const t of timed) {
    const sc = t.scene;
    if (sc.type !== "media" || !sc.caption?.text) continue;
    if (sc.device !== "none" && sc.device !== "hand") continue;
    const st = sc.caption.style;
    if (st?.y !== undefined || SKIP.has(st?.style ?? fallback)) continue;
    const at = (f: number) => t.from + Math.max(t.enterFrames, Math.min(t.frames - 2, f));
    const lines = sc.lines ?? [];
    const texts = [sc.caption.text, ...lines.map((l) => l.text)];
    const frames = lines.length
      ? [at(Math.round(t.frames * 0.1)), ...lines.map((l) => at(secToFrames(l.at) + 6))]
      : [at(Math.round(t.frames * 0.3)), at(Math.round(t.frames * 0.75))];
    const cap = sc.caption;
    const pos = st?.position ?? "upper";
    const prev = out[out.length - 1];
    const prevText = prev?.texts[prev.texts.length - 1]?.trim();
    if (prev && prev.pos === pos && prevText && sc.caption.text.trim().startsWith(prevText) && (prev.style()?.style ?? fallback) === (st?.style ?? fallback)) {
      prev.texts.push(...texts);
      prev.frames.push(...frames);
      prev.also.push((s) => (cap.style = { ...cap.style, y: s.y, style: s.style }));
      continue;
    }
    out.push({ style: () => cap.style, set: (s) => (cap.style = s), also: [], texts, frames, pos, hook: t.from < FPS });
  }
  for (const o of spec.overlays) {
    if (o.type !== "text" || o.textStyle?.y !== undefined || SKIP.has(o.textStyle?.style ?? fallback)) continue;
    const a = Math.round(o.start * FPS);
    const b = Math.max(a + 1, Math.round(o.end * FPS) - 6);
    out.push({ style: () => o.textStyle, set: (s) => (o.textStyle = s), also: [], texts: [o.text], frames: [a + 10, Math.round((a + b) / 2), b], pos: o.textStyle?.position ?? "center", hook: a < FPS });
  }
  return out;
}

/** The same video with every piece of text removed, so the stills show only what's underneath. */
function textless(spec: VideoSpec): VideoSpec {
  const s = structuredClone(spec);
  s.scenes = s.scenes.map((sc) => (sc.type === "media" ? { ...sc, caption: undefined, lines: [] } : sc));
  s.overlays = s.overlays.filter((o) => o.type !== "text");
  s.captions = undefined;
  return s;
}

/** Returns a spec with fitted captions, or null when there was nothing to fit. */
export async function fitText(dir: string, spec: VideoSpec, stills: Stills): Promise<VideoSpec | null> {
  if (spec.aspect !== "9:16") return null;
  const next = structuredClone(spec);
  const targets = targetsOf(next);
  if (!targets.length) return null;
  const work = path.join(dir, `.fit-${spec.id}-${Date.now()}`);
  await fsp.mkdir(work, { recursive: true });
  try {
    const frames = [...new Set(targets.flatMap((t) => t.frames))].sort((a, b) => a - b);
    const files = new Map(frames.map((f) => [f, path.join(work, `${f}.jpg`)]));
    await stills({ spec: textless(next) }, frames.map((f) => ({ frame: f, out: files.get(f)!, scale: 0.25, format: "jpeg" as const })));
    const profiles = new Map<number, Awaited<ReturnType<typeof profile>>>();
    for (const f of frames) profiles.set(f, await profile(files.get(f)!));

    const fallback = next.theme.captionStyle;
    for (const t of targets) {
      const st = t.style() ?? {};
      const style = (st.style ?? fallback) as CaptionStyleId;
      const h = Math.max(...t.texts.map((x) => textHeight(x, BOXED[style] ?? style, st.size)));
      const pad = 0.018;
      const lo = SAFE_TOP + h / 2;
      const hi = SAFE_BOTTOM - h / 2;
      if (lo >= hi) continue;
      const pref = Math.min(hi, Math.max(lo, prefY(t.pos)));
      const ps = t.frames.map((f) => profiles.get(f)!);
      const busy = (y: number) => {
        const v = ps.map((p) => bandMean(p.edge, y - h / 2 - pad, y + h / 2 + pad));
        return 0.5 * Math.max(...v) + 0.5 * (v.reduce((a, b) => a + b, 0) / v.length);
      };
      let best = pref;
      let bestCost = Infinity;
      for (let y = Math.max(lo, pref - 0.22); y <= Math.min(hi, pref + 0.22) + 1e-6; y += 0.005) {
        const cost = busy(y) + 0.35 * Math.abs(y - pref);
        if (cost < bestCost) {
          bestCost = cost;
          best = y;
        }
      }
      // Only move when it buys real quiet; otherwise keep the format's own anchor.
      const y = busy(best) < busy(pref) * 0.8 ? best : pref;
      const lum = Math.max(...ps.map((p) => bandMean(p.lum, y - h / 2, y + h / 2)));
      const bright = Math.max(...ps.map((p) => bandMean(p.bright, y - h / 2, y + h / 2)));
      const edge = busy(y);
      const boxed = BOXED[style];
      // White text with an outline survives a lot of light behind it; shadow-only white text doesn't.
      const outlined = style === "tiktok-classic" || style === "tiktok-heavy";
      const swap =
        boxed &&
        (outlined
          ? (lum > 0.7 && edge > 0.035) || lum > 0.82 || bright > 0.6
          : // Shadow-only text: the hook keeps it only over a dark, quiet band.
            lum > 0.45 || bright > 0.25 || (t.hook && (lum > 0.3 || edge > 0.04)));
      if (process.env.FIT_DEBUG) console.log(`[fit] ${t.texts[0].slice(0, 28)} y=${y.toFixed(3)} lum=${lum.toFixed(2)} bright=${bright.toFixed(2)} edge=${edge.toFixed(3)}`);
      const fitted = { ...st, y: +y.toFixed(3), ...(swap ? { style: boxed } : {}) };
      t.set(fitted);
      for (const f of t.also) f(fitted);
    }
    return next;
  } finally {
    await fsp.rm(work, { recursive: true, force: true }).catch(() => undefined);
  }
}
