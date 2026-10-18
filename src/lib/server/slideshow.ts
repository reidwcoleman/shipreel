import "server-only";
import { execFile } from "node:child_process";
import fsp from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { VideoSpec } from "@/remotion/spec";
import { FPS } from "@/remotion/spec";
import { layoutScenes } from "@/remotion/timeline";
import { probe } from "./media";
import { APP_ROOT, paths } from "./store";

const run = promisify(execFile);

/**
 * The MP4 of a carousel, built from its rendered stills the way TikTok plays photo mode: each slide
 * full width on a 9:16 black frame (3:4 slides letterboxed, 9:16 screenshots full screen), a quick
 * horizontal swipe into each slide on its beat (the spec's scene timing, already beat-synced in
 * formats.ts withMusic), the bed under it, loudness-normalised to −14 LUFS.
 *
 * Text and photos stay pixel-identical to the carousel stills, which is the point: the video and the
 * photo post are the same creative.
 */

/** Slideshows without voice or word captions are posted as photo-mode videos built from their stills. */
export function photoModeMp4(spec: VideoSpec): boolean {
  return spec.kind === "slideshow" && !spec.voiceover && !spec.captions && spec.overlays.length === 0;
}

const XFADE: Record<string, string> = { "slide-left": "slideleft", "slide-up": "slideup", fade: "fade", zoom: "zoomin", whip: "slideright" };

function audioFile(projectId: string, src?: string): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("music:")) return path.join(APP_ROOT, "public", "music", `${src.slice(6)}.mp3`);
  if (src.startsWith("asset:")) return path.join(paths.assets(projectId), path.basename(src.slice(6)));
  return undefined;
}

export async function composeSlideshow(projectId: string, spec: VideoSpec, stills: string[], out: string): Promise<void> {
  const { timed, totalFrames } = layoutScenes(spec.scenes);
  const total = totalFrames / FPS;
  const W = 1080;
  const H = 1920;
  const args: string[] = ["-v", "error", "-y"];
  timed.forEach((t, i) => args.push("-loop", "1", "-framerate", String(FPS), "-t", (t.frames / FPS + 0.12).toFixed(3), "-i", stills[i]));
  const music = audioFile(projectId, spec.audio?.src);
  const hasMusic = !!music && (await fsp.access(music).then(() => true).catch(() => false));
  if (hasMusic) args.push("-ss", String(spec.audio?.startFrom ?? 0), "-i", music!);

  const f: string[] = [];
  // Every still: full width, centred on black (TikTok photo mode), square pixels, 30 fps.
  timed.forEach((_, i) => f.push(`[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=${FPS},format=yuv420p[s${i}]`));
  let last = "s0";
  for (let i = 1; i < timed.length; i++) {
    const t = timed[i];
    // The swipe starts where the scene starts in the Remotion timeline (on the beat) and lasts its overlap.
    const dur = Math.max(2, t.enterFrames || 6) / FPS;
    const kind = XFADE[t.scene.transition] ?? (t.scene.transition === "cut" || t.scene.transition === "punch" ? "fade" : "slideleft");
    const d = t.scene.transition === "cut" || t.scene.transition === "punch" ? 2 / FPS : dur;
    const next = `x${i}`;
    f.push(`[${last}][s${i}]xfade=transition=${kind}:duration=${d.toFixed(3)}:offset=${(t.from / FPS).toFixed(3)}[${next}]`);
    last = next;
  }
  if (hasMusic) {
    const vol = spec.audio?.volume ?? 0.6;
    const fadeOut = spec.audio?.fadeOut === false ? "" : `,afade=t=out:st=${Math.max(0, total - 0.9).toFixed(3)}:d=0.9`;
    f.push(`[${timed.length}:a]atrim=0:${total.toFixed(3)},asetpts=PTS-STARTPTS,volume=${vol},afade=t=in:d=0.15${fadeOut},loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]`);
  }
  args.push("-filter_complex", f.join(";"), "-map", `[${last}]`);
  if (hasMusic) args.push("-map", "[a]", "-c:a", "aac", "-b:a", "256k");
  args.push("-t", total.toFixed(3), "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-r", String(FPS), "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-movflags", "+faststart", out);
  await run("ffmpeg", args, { maxBuffer: 1 << 24 });
  const info = await probe(out);
  if (!info.durationSec) throw new Error("slideshow video came out empty");
}
