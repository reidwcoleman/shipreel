import { FPS, type Scene, type Transition, type VideoSpec } from "./spec";

/** Frames a transition into a scene overlaps the previous one. */
export const TRANSITION_FRAMES: Record<Transition, number> = {
  cut: 0,
  punch: 0,
  flash: 0,
  fade: 8,
  "slide-up": 10,
  "slide-left": 10,
  zoom: 9,
  whip: 7,
};

export type TimedScene = {
  scene: Scene;
  index: number;
  /** First frame (absolute) where the scene is visible. */
  from: number;
  /** Visible frames, including the transition-in overlap. */
  frames: number;
  /** Frames of overlap with the previous scene at the start. */
  enterFrames: number;
};

export const secToFrames = (s: number) => Math.max(1, Math.round(s * FPS));

export function transitionFrames(scene: Scene, index: number): number {
  if (index === 0) return 0;
  const t = TRANSITION_FRAMES[scene.transition ?? "cut"] ?? 0;
  // Never overlap more than half of either neighbour.
  return Math.min(t, Math.floor(secToFrames(scene.duration) / 2));
}

/** Lay scenes out on the frame timeline. Transitions eat into the tail of the previous scene. */
export function layoutScenes(scenes: Scene[]): { timed: TimedScene[]; totalFrames: number } {
  const timed: TimedScene[] = [];
  let cursor = 0;
  scenes.forEach((scene, index) => {
    const frames = secToFrames(scene.duration);
    const enter = Math.min(transitionFrames(scene, index), index > 0 ? Math.floor(timed[index - 1].frames / 2) : 0);
    const from = Math.max(0, cursor - enter);
    timed.push({ scene, index, from, frames, enterFrames: enter });
    cursor = from + frames;
  });
  return { timed, totalFrames: Math.max(1, cursor) };
}

export function totalDurationFrames(spec: Pick<VideoSpec, "scenes">): number {
  return layoutScenes(spec.scenes).totalFrames;
}

export function totalDurationSeconds(spec: Pick<VideoSpec, "scenes">): number {
  return totalDurationFrames(spec) / FPS;
}

/** Scene index under an absolute frame (the later scene wins during a transition). */
export function sceneAtFrame(spec: Pick<VideoSpec, "scenes">, frame: number): number {
  const { timed } = layoutScenes(spec.scenes);
  let idx = 0;
  for (const t of timed) if (frame >= t.from) idx = t.index;
  return idx;
}

/** m:ss.d with decimal seconds (0:07.7 = 7.7 s), matching the "7.8s" duration badges. Tenths are floored. */
export function formatTimecode(frames: number, fps = FPS): string {
  const tenths = Math.max(0, Math.floor((frames / fps) * 10 + 1e-6));
  const m = Math.floor(tenths / 600);
  const s = Math.floor((tenths % 600) / 10);
  return `${m}:${String(s).padStart(2, "0")}.${tenths % 10}`;
}
