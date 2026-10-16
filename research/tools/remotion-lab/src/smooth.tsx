import { noise2D, noise3D } from "@remotion/noise";
import { evolvePath, getLength, getPointAtLength, getTangentAtLength } from "@remotion/paths";
import { makeCircle, Star } from "@remotion/shapes";
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp } from "./scene";

/** Named curves (cubic-bezier) that read as "premium" motion. */
export const EASE = {
  /** Apple-ish decelerate: fast start, long soft landing (UI enters). */
  outExpo: Easing.bezier(0.16, 1, 0.3, 1),
  /** Standard in-out for camera moves. */
  inOutCubic: Easing.bezier(0.65, 0, 0.35, 1),
  /** Whip: hangs, rips through the middle, hangs (transitions). */
  whip: Easing.bezier(0.7, 0, 0.3, 1),
  /** Anticipation: dips back ~6% before going (logo slams, CTA buttons). */
  anticipate: Easing.bezier(0.36, -0.06, 0.2, 1),
  /** Fixed-duration spring as an easing (Remotion 4.0.x): exact length, spring shape. */
  spring200: Easing.spring({ damping: 200 }),
} as const;

/**
 * Organic drift / handheld shake from simplex noise. Deterministic (seeded), sub-pixel, and
 * frame-accurate in both Player and render. amplitude in px, speed in cycles/sec-ish.
 */
export function useNoiseTransform(seed: string, { amplitude = 6, rotate = 0.4, speed = 0.5 } = {}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * speed;
  const x = noise2D(`${seed}x`, t, 0) * amplitude;
  const y = noise2D(`${seed}y`, 0, t) * amplitude;
  const r = noise3D(`${seed}r`, t, t, 0) * rotate;
  // No Math.round: rounding makes slow drifts step in whole pixels (visible judder).
  return `translate3d(${x}px, ${y}px, 0) rotate(${r}deg)`;
}

/** Camera shake with an impact envelope (decays over `decay` frames from `at`). */
export const Shake: React.FC<{ at: number; decay?: number; strength?: number; children: React.ReactNode }> = ({ at, decay = 14, strength = 22, children }) => {
  const frame = useCurrentFrame();
  const env = interpolate(frame, [at, at + decay], [1, 0], { ...clamp, easing: Easing.out(Easing.quad) }) * (frame >= at ? 1 : 0);
  const x = noise2D("shake-x", frame * 0.9, 0) * strength * env;
  const y = noise2D("shake-y", 0, frame * 0.9) * strength * env;
  const r = noise2D("shake-r", frame * 0.7, 3) * 1.2 * env;
  return <AbsoluteFill style={{ transform: `translate3d(${x}px, ${y}px, 0) rotate(${r}deg) scale(${1 + 0.04 * env})` }}>{children}</AbsoluteFill>;
};

/** Hand-drawn underline / arrow that draws itself, with a dot riding the tip. */
export const LineDraw: React.FC<{ d: string; from: number; frames: number; color: string; width: number }> = ({ d, from, frames, color, width }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [from, from + frames], [0, 1], { ...clamp, easing: EASE.outExpo });
  const { strokeDasharray, strokeDashoffset } = evolvePath(progress, d);
  const len = getLength(d);
  const tip = getPointAtLength(d, Math.max(0.001, progress * len));
  const tan = getTangentAtLength(d, Math.max(0.001, progress * len));
  return (
    <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width="100%" height="100%">
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />
      {tip && tan && progress > 0 && progress < 1 ? (
        <circle cx={tip.x + tan.x * 2} cy={tip.y + tan.y * 2} r={width * 0.9} fill={color} />
      ) : null}
    </svg>
  );
};

/** Ring burst + spinning star: @remotion/shapes for crisp vector accents (no images). */
export const Burst: React.FC<{ at: number; color: string; size: number }> = ({ at, color, size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 160 } });
  const ring = makeCircle({ radius: (size / 2) * s });
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={ring.path} transform={`translate(${size / 2 - ring.width / 2} ${size / 2 - ring.height / 2})`} fill="none" stroke={color} strokeWidth={6 * (1 - s) + 1} opacity={1 - s * 0.9} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${s}) rotate(${(1 - s) * -90}deg)` }}>
        <Star points={5} innerRadius={size * 0.12} outerRadius={size * 0.26} fill={color} cornerRadius={size * 0.02} />
      </div>
    </div>
  );
};

export const SmoothDemo: React.FC = () => {
  const { width, height } = useVideoConfig();
  const drift = useNoiseTransform("card", { amplitude: 10, rotate: 0.6, speed: 0.4 });
  const d = `M ${width * 0.2} ${height * 0.55} C ${width * 0.35} ${height * 0.6}, ${width * 0.6} ${height * 0.52}, ${width * 0.8} ${height * 0.56}`;
  return (
    <AbsoluteFill style={{ background: "#0d0d12" }}>
      <Shake at={45}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ transform: drift, padding: 40, borderRadius: 36, background: "#1d1d26", color: "#fff", fontFamily: "Helvetica", fontSize: 72, fontWeight: 800 }}>Organic drift</div>
        </AbsoluteFill>
        <LineDraw d={d} from={10} frames={24} color="#7D3CFF" width={14} />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: height * 0.18 }}>
          <Burst at={45} color="#FFD60A" size={260} />
        </AbsoluteFill>
      </Shake>
    </AbsoluteFill>
  );
};
