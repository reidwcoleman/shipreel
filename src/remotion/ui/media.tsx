import React from "react";
import { AbsoluteFill, Easing, Img, OffthreadVideo, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import type { Background, Callout, Tap, Zoom } from "../spec";
import { clamp } from "./anim";
import { useRender, useResolve } from "./context";

const isVideoUrl = (src: string) => /\.(mp4|mov|webm|m4v|mkv)(\?|$)/i.test(src);

/** Image or video filling its box. Videos are muted unless `volume` > 0. */
export const MediaView: React.FC<{
  src: string;
  kind?: "video" | "image";
  fit?: "cover" | "contain";
  trimStart?: number;
  playbackRate?: number;
  volume?: number;
  style?: React.CSSProperties;
}> = ({ src, kind, fit = "cover", trimStart = 0, playbackRate = 1, volume = 0, style }) => {
  const resolve = useResolve();
  const { fps } = useVideoConfig();
  const url = resolve(src);
  if (!url) return null;
  const video = kind ? kind === "video" : isVideoUrl(url);
  const common: React.CSSProperties = { width: "100%", height: "100%", objectFit: fit, ...style };
  if (video) {
    return (
      <OffthreadVideo
        src={url}
        style={common}
        muted={volume <= 0}
        volume={volume}
        playbackRate={playbackRate}
        trimBefore={Math.round(trimStart * fps)}
        pauseWhenBuffering
      />
    );
  }
  return <Img src={url} style={common} pauseWhenLoading />;
};

/** Slow drifting colour blobs: a free "expensive" background. */
const Mesh: React.FC<{ colors: string[] }> = ({ colors }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / 140;
  return (
    <AbsoluteFill style={{ background: colors[0], overflow: "hidden" }}>
      {colors.slice(1).concat(colors[0]).map((c, i) => {
        const x = 0.5 + 0.42 * noise2D(`x${i}`, t, i * 3.1);
        const y = 0.5 + 0.42 * noise2D(`y${i}`, t + 10, i * 1.7);
        const r = Math.max(width, height) * (0.55 + 0.12 * noise2D(`r${i}`, t, 0));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x * width - r / 2,
              top: y * height - r / 2,
              width: r,
              height: r,
              borderRadius: "50%",
              background: `radial-gradient(circle at 50% 50%, ${c} 0%, ${c}cc 22%, transparent 68%)`,
              opacity: 0.9,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const Backdrop: React.FC<{ bg?: Background; fallback?: string }> = ({ bg, fallback }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { theme } = useRender();
  if (!bg) return <AbsoluteFill style={{ background: fallback ?? theme.bg }} />;
  switch (bg.kind) {
    case "solid":
      return <AbsoluteFill style={{ background: bg.color }} />;
    case "gradient":
      return (
        <AbsoluteFill
          style={{ background: `linear-gradient(${bg.angle ?? 160}deg in oklch, ${bg.from}, ${bg.to})` }}
        />
      );
    case "mesh":
      return <Mesh colors={bg.colors} />;
    case "media": {
      const scale = bg.kenBurns === false ? 1 : interpolate(frame, [0, Math.max(30, durationInFrames)], [1.04, 1.14], clamp);
      return (
        <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
          <AbsoluteFill style={{ transform: `scale(${scale})`, filter: bg.blur ? `blur(${bg.blur}px)` : undefined }}>
            <MediaView src={bg.src} />
          </AbsoluteFill>
          <AbsoluteFill style={{ background: `rgba(0,0,0,${bg.dim ?? 0.25})` }} />
        </AbsoluteFill>
      );
    }
  }
};

/** Animated film grain. Cheap: one SVG noise tile, jittered every frame. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.07 }) => {
  const frame = useCurrentFrame();
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -0.2'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
  );
  const ox = ((frame * 73) % 240) - 120;
  const oy = ((frame * 131) % 240) - 120;
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundPosition: `${ox}px ${oy}px`,
        opacity,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
};

/**
 * Camera zoom progress (0–1) and focus for a list of punch-ins at the current frame. Springs in and
 * out like Screen Studio's auto-zoom: quick to start, soft to land, no hard stop.
 */
export function zoomState(zooms: Zoom[], frame: number, fps: number) {
  let k = 0;
  let scale = 1;
  let x = 0.5;
  let y = 0.5;
  for (const z of zooms) {
    const start = Math.round(z.at * fps);
    const end = start + Math.round((0.45 + z.hold) * fps);
    if (frame < start || frame > end + fps) continue;
    const cfg = { damping: 24, stiffness: 140, mass: 0.9 };
    const kin = spring({ frame: frame - start, fps, config: cfg });
    const kout = spring({ frame: frame - end, fps, config: cfg });
    const kk = Math.max(0, Math.min(1.05, kin - kout));
    if (kk > k) {
      k = kk;
      scale = z.scale;
      x = z.x;
      y = z.y;
    }
  }
  return { k, scale: 1 + (scale - 1) * k, x, y };
}

/** Punch-ins applied to the media itself (full-bleed / framed footage): keeps the focus point in view without showing edges. */
export function zoomTransform(zooms: Zoom[], frame: number, fps: number) {
  const z = zoomState(zooms, frame, fps);
  const fx = 0.5 + (z.x - 0.5) * Math.min(1, z.k);
  const fy = 0.5 + (z.y - 0.5) * Math.min(1, z.k);
  const tx = ((0.5 - fx) * 100 * (z.scale - 1)) / z.scale;
  const ty = ((0.5 - fy) * 100 * (z.scale - 1)) / z.scale;
  return { transform: `scale(${z.scale}) translate(${tx}%, ${ty}%)`, scale: z.scale, tx, ty };
}

/** Screen size of the phone frame for a given outer width. */
export const phoneGeometry = (width: number) => {
  const height = width * 2.17;
  const rim = width * 0.011;
  const bezel = width * 0.024;
  const radius = width * 0.165;
  return { width, height, rim, bezel, radius, inset: rim + bezel, screenW: width - 2 * (rim + bezel), screenH: height - 2 * (rim + bezel) };
};

/**
 * iPhone 17 Pro–style device: brushed titanium rim, thin black bezel, Dynamic Island, side buttons,
 * a faint glass glare and a two-layer soft shadow. Children fill the screen.
 */
export const PhoneFrame: React.FC<{ width: number; children: React.ReactNode; tilt?: number; shadow?: boolean }> = ({ width, children, tilt = 0, shadow = true }) => {
  const g = phoneGeometry(width);
  const button = (side: "left" | "right", top: number, h: number) => (
    <div
      style={{
        position: "absolute",
        [side]: -width * 0.011,
        top: g.height * top,
        width: width * 0.014,
        height: g.height * h,
        borderRadius: width * 0.01,
        background: "linear-gradient(90deg, #4a4b50, #8e8f95 50%, #3d3e42)",
      }}
    />
  );
  return (
    <div
      style={{
        width: g.width,
        height: g.height,
        position: "relative",
        transform: tilt ? `perspective(${width * 6}px) rotateY(${tilt}deg)` : undefined,
      }}
    >
      {button("left", 0.155, 0.045)}
      {button("left", 0.225, 0.075)}
      {button("left", 0.315, 0.075)}
      {button("right", 0.245, 0.11)}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: g.radius,
          padding: g.rim,
          background: "linear-gradient(135deg, #b9babf 0%, #55565b 22%, #2c2d31 48%, #6d6e73 76%, #c4c5ca 100%)",
          boxShadow: shadow
            ? `0 ${width * 0.06}px ${width * 0.14}px rgba(0,0,0,0.5), 0 ${width * 0.015}px ${width * 0.035}px rgba(0,0,0,0.35)`
            : undefined,
        }}
      >
        <div style={{ width: "100%", height: "100%", borderRadius: g.radius - g.rim, background: "#050506", padding: g.bezel }}>
          <div style={{ width: "100%", height: "100%", borderRadius: g.radius - g.inset, overflow: "hidden", position: "relative", background: "#000" }}>
            {children}
            <div
              style={{
                position: "absolute",
                top: width * 0.026,
                left: "50%",
                transform: "translateX(-50%)",
                width: width * 0.3,
                height: width * 0.088,
                borderRadius: width,
                background: "#000",
              }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(118deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 28%, transparent 46%)", pointerEvents: "none" }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export const BrowserFrame: React.FC<{ width: number; height: number; url?: string; children: React.ReactNode }> = ({
  width,
  height,
  url = "yourapp.com",
  children,
}) => {
  const bar = width * 0.075;
  return (
    <div
      style={{
        width,
        height,
        borderRadius: width * 0.03,
        overflow: "hidden",
        background: "#1c1c1f",
        boxShadow: `0 ${width * 0.04}px ${width * 0.12}px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ height: bar, display: "flex", alignItems: "center", gap: bar * 0.18, padding: `0 ${bar * 0.4}px`, background: "#2a2a2e" }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <div key={c} style={{ width: bar * 0.24, height: bar * 0.24, borderRadius: "50%", background: c }} />
        ))}
        <div
          style={{
            flex: 1,
            marginLeft: bar * 0.3,
            height: bar * 0.52,
            borderRadius: bar,
            background: "#1c1c1f",
            color: "#a1a1aa",
            fontSize: bar * 0.3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {url}
        </div>
      </div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>{children}</div>
    </div>
  );
};

/**
 * iOS screen-recording touch indicators: a soft disc presses in at each tap, then a ring ripples out.
 * Drawn inside the media box, so x/y are fractions of the screen.
 */
export const TapRipples: React.FC<{ taps: Tap[]; boxW: number }> = ({ taps, boxW }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = boxW * 0.13;
  return (
    <>
      {taps.map((t, i) => {
        const f = frame - Math.round(t.at * fps) + 4; // the finger lands a few frames before the UI reacts
        if (f < 0 || f > 22) return null;
        const press = spring({ frame: f, fps, config: { damping: 14, stiffness: 420, mass: 0.4 } });
        const disc = interpolate(f, [0, 3, 9, 15], [0, 1, 1, 0], clamp);
        const ring = interpolate(f, [8, 22], [0, 1], clamp);
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: `${t.x * 100}%`,
                top: `${t.y * 100}%`,
                width: d,
                height: d,
                marginLeft: -d / 2,
                marginTop: -d / 2,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255,255,255,0.78) 0%, rgba(235,235,240,0.62) 60%, rgba(220,220,228,0.5) 100%)",
                boxShadow: `0 0 0 ${d * 0.03}px rgba(0,0,0,0.12), 0 ${d * 0.06}px ${d * 0.25}px rgba(0,0,0,0.25)`,
                transform: `scale(${interpolate(press, [0, 1], [1.35, 0.92])})`,
                opacity: disc,
              }}
            />
            {ring > 0 && ring < 1 && (
              <div
                style={{
                  position: "absolute",
                  left: `${t.x * 100}%`,
                  top: `${t.y * 100}%`,
                  width: d,
                  height: d,
                  marginLeft: -d / 2,
                  marginTop: -d / 2,
                  borderRadius: "50%",
                  border: `${d * 0.05}px solid rgba(255,255,255,0.9)`,
                  transform: `scale(${1 + Easing.out(Easing.cubic)(ring) * 1.3})`,
                  opacity: 1 - ring,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

/** Progress (0–1, slight overshoot) of whichever callout is active. */
export function calloutState(callouts: Callout[], frame: number, fps: number) {
  for (const c of callouts) {
    const start = Math.round(c.at * fps);
    const end = start + Math.round(c.hold * fps);
    if (frame < start || frame > end + 0.6 * fps) continue;
    const cin = spring({ frame: frame - start, fps, config: { damping: 15, stiffness: 210, mass: 0.7 } });
    const cout = spring({ frame: frame - end, fps, config: { damping: 22, stiffness: 240, mass: 0.6 } });
    return { c, p: Math.max(0, cin - cout), rising: frame < end };
  }
  return null;
}

type Rect = { x: number; y: number; w: number; h: number };

/**
 * The lifted card. `box` is where the whole screen currently sits in the frame; the card shows the
 * callout's slice of it, flying from its spot on the screen to a large centred card.
 */
export const CalloutCard: React.FC<{
  callout: Callout;
  p: number;
  box: Rect;
  minTop: number;
  maxBottom: number;
  render: (w: number, h: number) => React.ReactNode;
}> = ({ callout: c, p, box, minTop, maxBottom, render }) => {
  const { width } = useVideoConfig();
  const src = { x: box.x + c.x * box.w, y: box.y + c.y * box.h, w: c.w * box.w, h: c.h * box.h };
  let tw = c.size * width;
  let th = (src.h * tw) / src.w;
  const room = maxBottom - minTop;
  if (th > room * 0.92) {
    th = room * 0.92;
    tw = (src.w * th) / src.h;
  }
  const cy = Math.min(Math.max(src.y + src.h / 2, minTop + th / 2), maxBottom - th / 2);
  const tgt = { x: (width - tw) / 2, y: cy - th / 2, w: tw, h: th };
  const lerp = (a: number, b: number) => a + (b - a) * p;
  const r = { x: lerp(src.x, tgt.x), y: lerp(src.y, tgt.y), w: lerp(src.w, tgt.w), h: lerp(src.h, tgt.h) };
  const k = r.w / src.w;
  const lift = Math.min(1, Math.max(0, p));
  return (
    <>
      <AbsoluteFill style={{ background: `rgba(0,0,0,${0.5 * lift})` }} />
      <div
        style={{
          position: "absolute",
          left: r.x,
          top: r.y,
          width: r.w,
          height: r.h,
          borderRadius: Math.max(8, r.w * 0.045),
          overflow: "hidden",
          transform: `perspective(${width * 2.5}px) rotateX(${(1 - lift) * 10}deg)`,
          boxShadow: `0 ${r.w * 0.05 * lift}px ${r.w * 0.16 * lift}px rgba(0,0,0,${0.55 * lift}), 0 0 0 ${1.5 * lift}px rgba(255,255,255,${0.35 * lift})`,
          opacity: interpolate(p, [0, 0.08], [0, 1], clamp),
        }}
      >
        <div style={{ position: "absolute", left: -c.x * box.w * k, top: -c.y * box.h * k, width: box.w * k, height: box.h * k }}>
          {render(box.w * k, box.h * k)}
        </div>
      </div>
    </>
  );
};
