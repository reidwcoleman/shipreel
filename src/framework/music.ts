/**
 * Built-in royalty-free music beds (public/music, licenses in public/music/LICENSES.md) and beat
 * sync: viral edits cut on the beat, so formats snap their cut points to the track's beat grid and
 * start the track so its drop lands on the first cut into the product.
 *
 * Pure functions, safe on the client.
 */
import type { SceneInput, VideoSpecInput } from "@/remotion/spec";
import library from "../../public/music/library.json";

export type MusicTrack = {
  id: string;
  title: string;
  artist?: string;
  source?: string;
  sourceUrl?: string;
  license?: string;
  bpm: number;
  /** Seconds into the file of the first downbeat. */
  firstBeat: number;
  /** Seconds into the file of the biggest energy lift in the opening, if any. */
  dropAt?: number | null;
  vibe: string[];
  energy?: number;
  durationSec?: number;
};

export const MUSIC: MusicTrack[] = ((library as unknown as MusicTrack[]) ?? []).filter((t) => t && t.id && t.bpm > 40 && t.bpm < 220);

/** Vibe preference per kind of video, best first. */
export const MUSIC_VIBES: Record<string, string[]> = {
  demo: ["upbeat", "bouncy", "pop", "happy", "hype", "tech"],
  story: ["lofi", "chill", "warm", "acoustic"],
  slideshow: ["lofi", "chill", "aesthetic", "acoustic", "warm"],
  "build-in-public": ["tech", "lofi", "chill", "electronic"],
  listicle: ["upbeat", "bouncy", "pop", "hype"],
  comparison: ["hype", "upbeat", "trap", "phonk", "drop"],
  reaction: ["upbeat", "bouncy", "lofi"],
  skit: ["bouncy", "upbeat", "funny", "pop"],
  family: ["family", "bouncy", "happy", "upbeat", "acoustic", "warm", "pop"],
  emotional: ["cinematic", "emotional", "piano", "warm"],
};

/** The best bed for a list of wanted vibes (stable per seed among equally good matches). */
export function pickMusic(vibes: string[], seed = 0): MusicTrack | undefined {
  if (!MUSIC.length) return undefined;
  const score = (t: MusicTrack) => {
    const tags = t.vibe.map((x) => x.toLowerCase());
    let s = 0;
    vibes.forEach((v, i) => {
      if (tags.some((tag) => tag.includes(v) || v.includes(tag))) s += vibes.length - i;
    });
    return s;
  };
  const ranked = [...MUSIC].sort((a, b) => score(b) - score(a));
  // Rotate among the close matches so a batch of videos doesn't all share one track.
  const top = ranked.slice(0, 3).filter((t) => score(t) > 0);
  if (!top.length) return ranked[0];
  return top[Math.abs(seed) % top.length];
}

export const trackById = (id?: string) => (id ? MUSIC.find((t) => `music:${t.id}` === id || t.id === id) : undefined);

const FPS = 30;
const OVERLAP: Record<string, number> = { cut: 0, punch: 0, flash: 0, fade: 8, "slide-up": 10, "slide-left": 10, zoom: 9, whip: 7 };

/**
 * Snap every cut to the nearest beat and pick the track offset so the drop (or a downbeat) lands on
 * the first cut. Scenes keep at least `minShot` seconds; the last scene ends on a beat.
 */
export function beatSync(spec: VideoSpecInput, track: MusicTrack, opts: { minShot?: number; dropScene?: number } = {}): VideoSpecInput {
  const scenes = spec.scenes.map((s) => ({ ...s })) as SceneInput[];
  if (scenes.length < 2)
    // One shot: nothing to snap, just start the bed on its first downbeat.
    return { ...spec, audio: { ...(spec.audio ?? {}), src: `music:${track.id}`, title: `${track.title}${track.artist ? ` — ${track.artist}` : ""}`, startFrom: +Math.max(0, track.dropAt != null ? track.dropAt - 0.5 : track.firstBeat).toFixed(3), volume: spec.audio?.volume ?? 0.6, fadeOut: true } };
  const period = 60 / track.bpm;
  // Half-beats for fast tracks would be too busy; for slow ones (< 90 bpm) cut on half beats.
  const grid = track.bpm < 90 ? period / 2 : period;
  const minShot = opts.minShot ?? 0.55;
  const overlap = (s: SceneInput, i: number) => (i === 0 ? 0 : Math.min(OVERLAP[s.transition ?? "cut"] ?? 0, Math.floor((s.duration * FPS) / 2)) / FPS);

  // Where each scene currently becomes visible.
  const starts: number[] = [];
  let cursor = 0;
  scenes.forEach((s, i) => {
    const from = Math.max(0, cursor - overlap(s, i));
    starts.push(from);
    cursor = from + s.duration;
  });

  // Track offset: the drop on the reveal cut (default the first cut) if the track has one, else a downbeat on frame 0.
  const firstCut = starts[Math.min(scenes.length - 1, Math.max(1, opts.dropScene ?? 1))];
  let startFrom = Math.max(0, track.firstBeat);
  if (track.dropAt != null && track.dropAt - firstCut >= 0) startFrom = track.dropAt - firstCut;
  // Beat k (video time) = phase + k·grid.
  const phase = (((track.firstBeat - startFrom) % grid) + grid) % grid;
  const snap = (t: number, min: number) => {
    let k = Math.round((t - phase) / grid);
    while (phase + k * grid < min - 1e-6) k++;
    return phase + k * grid;
  };

  const newStarts = [0];
  for (let i = 1; i < scenes.length; i++) newStarts.push(snap(starts[i], newStarts[i - 1] + minShot));
  for (let i = 0; i < scenes.length - 1; i++) {
    const d = newStarts[i + 1] - newStarts[i] + overlap(scenes[i + 1], i + 1);
    scenes[i] = { ...scenes[i], duration: +Math.max(minShot, d).toFixed(3) };
  }
  const last = scenes.length - 1;
  const end = snap(newStarts[last] + scenes[last].duration, newStarts[last] + Math.max(minShot, scenes[last].duration - grid / 2));
  scenes[last] = { ...scenes[last], duration: +(end - newStarts[last]).toFixed(3) };

  return {
    ...spec,
    scenes,
    audio: {
      ...(spec.audio ?? {}),
      src: `music:${track.id}`,
      title: `${track.title}${track.artist ? ` — ${track.artist}` : ""}`,
      startFrom: +startFrom.toFixed(3),
      volume: spec.audio?.volume ?? 0.6,
      fadeOut: true,
    },
  };
}
