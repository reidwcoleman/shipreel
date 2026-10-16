import { CameraMotionBlur, Trail } from "@remotion/motion-blur";
import React from "react";
import { AbsoluteFill, Freeze, useCurrentFrame, useRemotionEnvironment } from "remotion";
import { DemoScene } from "./scene";

/**
 * Transition-only motion blur.
 *
 * Same technique as @remotion/motion-blur's <CameraMotionBlur> (N time-shifted copies, each at
 * opacity 1/N, summed with mix-blend-mode: plus-lighter), with three differences that matter for
 * Shipreel:
 *  1. `active` turns it on only for the frames that move fast (a whip, a zoom punch). Off = one copy
 *     at the exact frame, in the same tree slot, so nothing remounts when it switches on.
 *  2. The shutter window is centred on the frame. CameraMotionBlur samples (f, f + 1] - up to one
 *     frame AHEAD - and with shutterAngle 0 it shows frame f + 1.
 *  3. Player-aware: in the live editor the sample count is capped (N copies of the DOM per frame
 *     is too much for real-time playback).
 * Cost: ~samples x the wrapped subtree's paint cost, but only on active frames.
 * Never put <Audio> inside (Freeze stops media clocks); videos inside decode one frame per sample.
 */
export const MotionBlur: React.FC<{
  children: React.ReactNode;
  active?: boolean;
  /** Odd numbers keep a sample exactly on the frame. 5-9 is plenty for 30 fps. */
  samples?: number;
  /** 180 = film look. 270-360 for whips. */
  shutterAngle?: number;
  /** Cap for @remotion/player previews. 1 = no blur in the editor. */
  playerSamples?: number;
}> = ({ children, active = true, samples = 7, shutterAngle = 180, playerSamples = 3 }) => {
  const frame = useCurrentFrame();
  const { isPlayer, isStudio } = useRemotionEnvironment();
  const cap = isPlayer || isStudio ? playerSamples : samples;
  let n = active && shutterAngle > 0 ? Math.max(1, Math.min(samples, cap)) : 1;
  if (n > 1 && n % 2 === 0) n -= 1; // odd => one sample sits on the exact frame
  const span = shutterAngle / 360; // in frames
  // Offsets ordered so index 0 is the exact frame: 0, -d, +d, -2d, +2d ...
  const step = n > 1 ? span / (n - 1) : 0;
  const offsets = Array.from({ length: n }, (_, i) => (i === 0 ? 0 : Math.ceil(i / 2) * step * (i % 2 === 1 ? -1 : 1)));
  return (
    <AbsoluteFill style={{ isolation: "isolate" }}>
      {offsets.map((o, i) => (
        <AbsoluteFill
          key={`s${i}`}
          style={n === 1 ? undefined : { mixBlendMode: "plus-lighter", filter: `opacity(${1 / n})` }}
        >
          <Freeze frame={Math.max(0, frame + o)}>{children}</Freeze>
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};

/** Whole-scene CameraMotionBlur (the official component). Cost ~= samples x. */
export const CameraBlurScene: React.FC<{ samples: number; shutterAngle?: number }> = ({ samples, shutterAngle = 180 }) => (
  <CameraMotionBlur samples={samples} shutterAngle={shutterAngle}>
    <DemoScene />
  </CameraMotionBlur>
);

/** Blur only during the fast pan (frames 30-40) and zoom punch (55-61). */
export const TransitionOnlyBlurScene: React.FC = () => {
  const frame = useCurrentFrame();
  const fast = (frame >= 29 && frame <= 41) || (frame >= 54 && frame <= 62);
  return (
    <MotionBlur active={fast} samples={7} shutterAngle={270}>
      <DemoScene />
    </MotionBlur>
  );
};

/** <Trail>: echo copies behind a moving element (stylised, not photographic). */
export const TrailDemo: React.FC = () => (
  <AbsoluteFill style={{ background: "#0b0b10" }}>
    <Trail layers={6} lagInFrames={0.6} trailOpacity={0.9}>
      <DemoScene />
    </Trail>
  </AbsoluteFill>
);

/** Static content under 10-sample blur: used to measure the colour cost of plus-lighter averaging. */
export const StaticColorProbe: React.FC<{ samples: number }> = ({ samples }) => {
  const swatches = ["#FF3B30", "#34C759", "#0A84FF", "#FFD60A", "#1C1C1E", "#F2F2F7", "#7D3CFF", "#808080"];
  const Inner = () => (
    <AbsoluteFill style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "#000" }}>
      {swatches.map((c) => (
        <div key={c} style={{ background: c }} />
      ))}
    </AbsoluteFill>
  );
  return samples <= 1 ? <Inner /> : <CameraMotionBlur samples={samples} shutterAngle={180}><Inner /></CameraMotionBlur>;
};
