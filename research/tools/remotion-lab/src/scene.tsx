import { noise2D } from "@remotion/noise";
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Gradient + three noise-driven blobs (Shipreel's "mesh" backdrop, sub-pixel version). */
export const Backdrop: React.FC<{ hue?: number }> = ({ hue = 265 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / 140;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg in oklch, oklch(0.22 0.06 ${hue}), oklch(0.12 0.03 ${hue + 30}))`, overflow: "hidden" }}>
      {[0, 1, 2].map((i) => {
        const x = 0.5 + 0.4 * noise2D(`x${i}`, t, i * 3.1);
        const y = 0.5 + 0.4 * noise2D(`y${i}`, t + 10, i * 1.7);
        const r = Math.max(width, height) * 0.6;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: r,
              height: r,
              left: 0,
              top: 0,
              // translate3d keeps the drift sub-pixel; never Math.round() animated positions.
              transform: `translate3d(${x * width - r / 2}px, ${y * height - r / 2}px, 0)`,
              borderRadius: "50%",
              background: `radial-gradient(circle, oklch(0.55 0.2 ${hue + i * 40} / 0.55) 0%, transparent 65%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Flat phone frame, same proportions as Shipreel's PhoneFrame. */
export const PhoneFlat: React.FC<{ width: number; children: React.ReactNode }> = ({ width, children }) => {
  const height = width * 2.165;
  const bezel = width * 0.035;
  const radius = width * 0.16;
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: "linear-gradient(145deg, #3a3a3e, #121214 40%, #2a2a2e)",
        padding: bezel,
        boxShadow: `0 ${width * 0.06}px ${width * 0.16}px rgba(0,0,0,0.55)`,
        position: "relative",
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: radius - bezel, overflow: "hidden", background: "#000" }}>{children}</div>
    </div>
  );
};

/**
 * A representative Shipreel-like shot with deliberately FAST motion (a 10-frame pan and a
 * 6-frame zoom punch), so motion blur has something to do. 90 frames at 30 fps.
 * useCurrentFrame() is called INSIDE this component, so it works under <CameraMotionBlur>.
 */
export const DemoScene: React.FC<{ label?: string; hue?: number }> = ({ label = "Ship faster.", hue = 265 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 18 });
  // Fast whip pan between frames 30-40 (the whole content travels ~0.9 W).
  const pan = interpolate(frame, [30, 40], [0, -0.9 * width], { ...clamp, easing: Easing.bezier(0.7, 0, 0.3, 1) });
  const x = frame < 40 ? pan : 0; // hard cut back at 40, like a whip into the next scene
  // Zoom punch 1 -> 1.5 in 6 frames at frame 55.
  const punch = interpolate(frame, [55, 61], [1, 1.5], { ...clamp, easing: Easing.out(Easing.cubic) });
  const phoneW = width * 0.62;
  return (
    <AbsoluteFill>
      <Backdrop hue={hue} />
      <AbsoluteFill style={{ transform: `translate3d(${x}px,0,0) scale(${punch})` }}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: height * 0.04 }}>
          <div style={{ transform: `translate3d(0, ${(1 - enter) * 160}px, 0)` }}>
            <PhoneFlat width={phoneW}>
              <Img src={staticFile("screenshot.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </PhoneFlat>
          </div>
        </AbsoluteFill>
        <AbsoluteFill style={{ alignItems: "center", paddingTop: height * 0.14 }}>
          <div
            style={{
              fontFamily: "Helvetica, Arial, sans-serif",
              fontWeight: 800,
              fontSize: width * 0.09,
              color: "white",
              letterSpacing: "-0.03em",
              transform: `scale(${interpolate(enter, [0, 1], [0.85, 1])})`,
              opacity: enter,
              textShadow: "0 4px 24px rgba(0,0,0,0.35)",
            }}
          >
            {label}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
