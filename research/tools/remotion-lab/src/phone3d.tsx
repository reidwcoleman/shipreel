import { noise2D } from "@remotion/noise";
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop, clamp } from "./scene";

/**
 * "Rotato-style" device shot in plain CSS 3D. Works identically in @remotion/player and renders,
 * needs no WebGL / --gl flag, and the screen stays a normal DOM subtree (Img, OffthreadVideo,
 * captions...), so it is crisp: Chrome re-rasterises the screen contents at the projected size.
 *
 * Depth cues that sell it:
 *  - extruded edge: `layers` copies of the body pushed back in Z (cheap: plain rounded rects)
 *  - side band lit from the left, darker on the right (edge colour follows rotateY)
 *  - specular glass sweep: a gradient whose position tracks rotation
 *  - floor shadow: a radial-gradient ellipse (no filter: blur, so ~free) that tightens as it lands
 *  - slow noise float after the spring settles, so no frame is ever static
 */
export const Phone3D: React.FC<{
  width: number;
  rotateY: number;
  rotateX: number;
  rotateZ?: number;
  lift?: number;
  children: React.ReactNode;
  thickness?: number;
  layers?: number;
}> = ({ width, rotateY, rotateX, rotateZ = 0, lift = 0, children, thickness, layers = 14 }) => {
  const height = width * 2.165;
  const radius = width * 0.16;
  const bezel = width * 0.035;
  const depth = thickness ?? width * 0.075;
  // Light comes from the upper left: faces turned to the left are brighter.
  const edgeLight = interpolate(rotateY, [-40, 0, 40], [0.55, 0.32, 0.16], clamp);
  const sweep = interpolate(rotateY, [-35, 35], [-60, 160], clamp); // % position of the specular band
  return (
    <div style={{ width, height, position: "relative", transformStyle: "preserve-3d", transform: `translateY(${-lift}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)` }}>
      {/* Extruded body: back layers first */}
      {Array.from({ length: layers }, (_, i) => {
        const z = -depth * (1 - i / (layers - 1));
        const shade = Math.round(255 * edgeLight * (0.55 + 0.45 * (i / layers)));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: radius,
              background: `rgb(${shade}, ${shade}, ${Math.min(255, shade + 6)})`,
              transform: `translateZ(${z}px)`,
              backfaceVisibility: "hidden",
            }}
          />
        );
      })}
      {/* Front face */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: radius,
          padding: bezel,
          background: "linear-gradient(145deg, #4a4a50, #141416 42%, #2c2c31)",
          boxShadow: `inset 0 0 0 ${width * 0.006}px rgba(255,255,255,0.22), inset 0 0 ${width * 0.02}px rgba(0,0,0,0.6)`,
          transform: "translateZ(0.5px)",
        }}
      >
        <div style={{ width: "100%", height: "100%", borderRadius: radius - bezel, overflow: "hidden", position: "relative", background: "#000" }}>
          {children}
          {/* Dynamic island */}
          <div style={{ position: "absolute", top: width * 0.03, left: "50%", width: width * 0.3, height: width * 0.085, marginLeft: -width * 0.15, borderRadius: width, background: "#000" }} />
          {/* Glass: specular sweep that follows the rotation */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(115deg, transparent ${sweep - 30}%, rgba(255,255,255,0.16) ${sweep}%, transparent ${sweep + 22}%)`,
              mixBlendMode: "screen",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
};

/** Soft floor shadow under a floating device: radial gradients only (GPU-cheap, no filter). */
export const FloorShadow: React.FC<{ width: number; lift: number; rotateY: number }> = ({ width, lift, rotateY }) => {
  const spread = 1 + lift / (width * 0.6);
  const opacity = interpolate(lift, [0, width * 0.5], [0.55, 0.22], clamp);
  return (
    <div
      style={{
        width: width * 1.25 * spread,
        height: width * 0.22 * spread,
        borderRadius: "50%",
        background: `radial-gradient(ellipse at ${50 - rotateY * 0.4}% 50%, rgba(0,0,0,${opacity}) 0%, rgba(0,0,0,${opacity * 0.45}) 40%, transparent 70%)`,
      }}
    />
  );
};

/** Hero device shot: swings in from the side, settles into a 3/4 view, then floats. */
export const Phone3DShot: React.FC<{ src?: string }> = ({ src = staticFile("screenshot.png") }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 90, mass: 1 } });
  const idle = frame / fps;
  const rotateY = interpolate(enter, [0, 1], [-62, -18]) + 3 * noise2D("ry", idle * 0.35, 0);
  const rotateX = interpolate(enter, [0, 1], [24, 9]) + 2 * noise2D("rx", idle * 0.3, 5);
  const rotateZ = interpolate(enter, [0, 1], [-8, -3]);
  const lift = interpolate(enter, [0, 1], [height * 0.25, width * 0.06]) + 10 * noise2D("lift", idle * 0.4, 9);
  const phoneW = width * 0.58;
  return (
    <AbsoluteFill>
      <Backdrop hue={250} />
      <AbsoluteFill style={{ perspective: width * 2.4, perspectiveOrigin: "50% 40%", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", top: height * 0.5 + phoneW * 1.05, transform: "rotateX(80deg)" }}>
          <FloorShadow width={phoneW} lift={lift} rotateY={rotateY} />
        </div>
        <Phone3D width={phoneW} rotateY={rotateY} rotateX={rotateX} rotateZ={rotateZ} lift={lift}>
          <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </Phone3D>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: height * 0.12 }}>
        <div
          style={{
            fontFamily: "Helvetica, Arial, sans-serif",
            fontWeight: 800,
            fontSize: width * 0.08,
            color: "#fff",
            letterSpacing: "-0.03em",
            opacity: interpolate(frame, [8, 18], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }),
          }}
        >
          Your week, planned.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
