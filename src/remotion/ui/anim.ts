import { interpolate, spring, type SpringConfig } from "remotion";

export const SNAPPY: Partial<SpringConfig> = { damping: 14, stiffness: 180, mass: 0.6 };
export const SMOOTH: Partial<SpringConfig> = { damping: 200, stiffness: 120, mass: 1 };
export const BOUNCY: Partial<SpringConfig> = { damping: 9, stiffness: 160, mass: 0.7 };

export function pop(frame: number, fps: number, delay = 0, config: Partial<SpringConfig> = SNAPPY) {
  return spring({ frame: frame - delay, fps, config });
}

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export function fadeIn(frame: number, start: number, len = 8) {
  return interpolate(frame, [start, start + len], [0, 1], clamp);
}

export function fadeOut(frame: number, end: number, len = 8) {
  return interpolate(frame, [end - len, end], [1, 0], clamp);
}

/** 0→1 eased progress over [start, start+len]. */
export function ease(frame: number, start: number, len: number) {
  const t = interpolate(frame, [start, start + len], [0, 1], clamp);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Deterministic pseudo-random in [0,1) from a seed (renders must be reproducible). */
export function rand(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
