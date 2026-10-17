import React from "react";
import { AbsoluteFill, Easing, Img, Loop, OffthreadVideo, Sequence, continueRender, delayRender, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import type { Background, Callout, FlowStep, Tap, Zoom } from "../spec";
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
  const { durationInFrames, fps } = useVideoConfig();
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
            {bg.loopSec ? (
              <Loop durationInFrames={Math.max(1, Math.round(bg.loopSec * fps))}>
                <MediaView src={bg.src} />
              </Loop>
            ) : (
              <MediaView src={bg.src} />
            )}
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

/* ───────────────────────────── Screen flow ───────────────────────────── */

type FlowItem = { at: number; src: string; kind: "video" | "image"; transition: "push" | "sheet" | "tab" | "fade"; scroll: number; trimStart?: number; playbackRate?: number };

const FLOW_FRAMES = { push: 11, sheet: 13, fade: 6, tab: 0 } as const;
const iosEase = Easing.bezier(0.25, 0.9, 0.3, 1);

/** Taps implied by a flow: the finger lands just before each screen change. */
export function flowTaps(flow: FlowStep[]): Tap[] {
  return flow.filter((s) => s.tap).map((s) => ({ at: Math.max(0, s.at - 0.12), x: s.tap!.x, y: s.tap!.y }));
}

const FlowScreen: React.FC<{ item: FlowItem; startFrame: number; endFrame: number; fit: "cover" | "contain" }> = ({ item, startFrame, endFrame, fit }) => {
  const frame = useCurrentFrame();
  const resolve = useResolve();
  const url = resolve(item.src);
  if (!url) return null;
  const local = frame - startFrame;
  if (item.kind === "video") {
    return (
      <Sequence from={startFrame} layout="none">
        <MediaView src={item.src} kind="video" fit={fit} trimStart={item.trimStart} playbackRate={item.playbackRate} />
      </Sequence>
    );
  }
  if (item.scroll > 0) {
    // A tall screenshot scrolled like a thumb would: ease in, coast, settle.
    const p = interpolate(local, [6, Math.max(12, endFrame - startFrame - 4)], [0, 1], { ...clamp, easing: Easing.bezier(0.45, 0, 0.2, 1) });
    return (
      <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
        <Img src={url} style={{ width: "100%", height: "auto", transform: `translateY(${-item.scroll * 100 * p}%)` }} pauseWhenLoading />
      </div>
    );
  }
  return <Img src={url} style={{ width: "100%", height: "100%", objectFit: fit }} pauseWhenLoading />;
};

/** The app moving between screens inside one take, with iOS push / sheet / tab transitions. */
export const ScreenFlow: React.FC<{ first: Omit<FlowItem, "at" | "transition" | "scroll"> & { scroll?: number }; flow: FlowStep[]; fit?: "cover" | "contain" }> = ({ first, flow, fit = "cover" }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const items: FlowItem[] = [
    { ...first, at: 0, transition: "tab", scroll: first.scroll ?? 0 },
    ...[...flow].sort((a, b) => a.at - b.at).map((s) => ({ at: s.at, src: s.src, kind: s.kind, transition: s.transition, scroll: s.scroll })),
  ];
  const starts = items.map((it) => Math.round(it.at * fps));
  let cur = 0;
  for (let i = 0; i < items.length; i++) if (frame >= starts[i]) cur = i;
  const it = items[cur];
  const tf = FLOW_FRAMES[it.transition];
  const t = cur > 0 && tf > 0 ? iosEase(interpolate(frame - starts[cur], [0, tf], [0, 1], clamp)) : 1;
  const prev = cur > 0 && t < 1 ? cur - 1 : -1;
  const end = (i: number) => starts[i + 1] ?? durationInFrames;
  const layer = (i: number, style: React.CSSProperties, dim = 0) => (
    <AbsoluteFill key={i} style={style}>
      <FlowScreen item={items[i]} startFrame={starts[i]} endFrame={end(i)} fit={fit} />
      {dim > 0 && <AbsoluteFill style={{ background: `rgba(0,0,0,${dim})` }} />}
    </AbsoluteFill>
  );
  if (prev < 0) return <AbsoluteFill style={{ overflow: "hidden" }}>{layer(cur, {})}</AbsoluteFill>;
  switch (it.transition) {
    case "push":
      return (
        <AbsoluteFill style={{ overflow: "hidden" }}>
          {layer(prev, { transform: `translateX(${-30 * t}%)` }, 0.18 * t)}
          {layer(cur, { transform: `translateX(${100 * (1 - t)}%)`, boxShadow: "-12px 0 30px rgba(0,0,0,0.18)" })}
        </AbsoluteFill>
      );
    case "sheet":
      return (
        <AbsoluteFill style={{ overflow: "hidden", background: "#000" }}>
          {layer(prev, { transform: `scale(${1 - 0.06 * t})`, borderRadius: 24 * t, overflow: "hidden" }, 0.3 * t)}
          {layer(cur, { transform: `translateY(${100 * (1 - t)}%)`, borderRadius: 24, overflow: "hidden" })}
        </AbsoluteFill>
      );
    case "fade":
    default:
      return (
        <AbsoluteFill style={{ overflow: "hidden" }}>
          {layer(prev, {})}
          {layer(cur, { opacity: t })}
        </AbsoluteFill>
      );
  }
};

/* ───────────────────────────── Phone in a real hand ───────────────────────────── */

export type HandClip = { id: string; fps: number; frames: [number, number][][]; screenAspect?: number };

/** 3×3 homography taking the unit rectangle (0,0)-(w,h) to the quad, as a CSS matrix3d. */
export function quadMatrix(w: number, h: number, q: [number, number][]): string {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  // Square → quad (Heckbert), then pre-scale by 1/w, 1/h.
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (sx * dy2 - dx2 * sy) / den;
  const hh = (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3, f = y0;
  const m = [a / w, b / h, c, d / w, e / h, f, g / w, hh / h, 1];
  // CSS matrix3d is column-major 4×4.
  return `matrix3d(${[m[0], m[3], 0, m[6], m[1], m[4], 0, m[7], 0, 0, 1, 0, m[2], m[5], 0, m[8]].map((v) => +v.toFixed(8)).join(",")})`;
}

/**
 * Stock footage of a hand holding a green-screen phone (public/hands/<id>/): the plate, the app screen
 * warped onto the tracked screen corners, then the keyed footage (thumb, glare, edges) on top.
 */
export const HandPhone: React.FC<{ clipId: string; children: React.ReactNode }> = ({ clipId, children }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const { publicBase } = useRender();
  const base = `${publicBase ?? ""}/hands/${clipId}`;
  const [clip, setClip] = React.useState<HandClip | null>(null);
  const [handle] = React.useState(() => delayRender(`hand ${clipId}`));
  React.useEffect(() => {
    let live = true;
    fetch(`${base}/corners.json`)
      .then((r) => r.json())
      .then((j) => live && setClip({ id: clipId, ...j }))
      .catch(() => live && setClip({ id: clipId, fps: 30, frames: [] }))
      .finally(() => continueRender(handle));
    return () => {
      live = false;
    };
  }, [base, clipId, handle]);
  const n = clip?.frames.length ?? 0;
  // Ping-pong past the end of the clip so a long scene never jumps.
  const idx = n ? (Math.floor(frame / n) % 2 === 0 ? frame % n : n - 1 - (frame % n)) : 0;
  const quad = clip?.frames[idx];
  const sw = 600;
  const sh = sw / (clip?.screenAspect ?? 0.46);
  const k = width / 1080;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {n > 0 && (
        <>
          <PingPongVideo src={`${base}/plate.mp4`} frames={n} />
          {quad && (
            <div style={{ position: "absolute", left: 0, top: 0, width: sw, height: sh, transformOrigin: "0 0", transform: quadMatrix(sw, sh, quad.map(([x, y]) => [x * k, y * k]) as [number, number][]) }}>
              <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative", background: "#000", filter: "brightness(1.02) contrast(1.02)" }}>
                {children}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(125deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.03) 32%, transparent 48%)", pointerEvents: "none" }} />
              </div>
            </div>
          )}
          <PingPongVideo src={`${base}/keyed.webm`} frames={n} transparent />
        </>
      )}
      {n === 0 && <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: "#888", fontSize: 30 * k }}>{clip ? `hand clip "${clipId}" missing — run npm run fetch-hands` : ""}</AbsoluteFill>}
    </AbsoluteFill>
  );
};

/** A clip that plays forward, then backward, forever (so hand footage never runs out mid-scene). */
const PingPongVideo: React.FC<{ src: string; frames: number; transparent?: boolean }> = ({ src, frames, transparent }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const cycles = Math.ceil(durationInFrames / frames) + 1;
  return (
    <>
      {Array.from({ length: cycles }, (_, c) => {
        const from = c * frames;
        if (frame < from - 1 || frame >= from + frames) return null;
        const reverse = c % 2 === 1;
        return (
          <Sequence key={c} from={from} durationInFrames={frames} layout="none">
            <AbsoluteFill>
              {reverse ? (
                <ReverseFrame src={src} frames={frames} transparent={transparent} />
              ) : (
                <OffthreadVideo src={src} muted transparent={transparent} style={{ width: "100%", height: "100%" }} />
              )}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </>
  );
};

/** Backward playback: hold the mirrored frame via startFrom on a one-frame sequence. */
const ReverseFrame: React.FC<{ src: string; frames: number; transparent?: boolean }> = ({ src, frames, transparent }) => {
  const frame = useCurrentFrame();
  const at = Math.max(0, frames - 1 - frame);
  return (
    <Sequence from={frame} durationInFrames={1} layout="none">
      <OffthreadVideo src={src} muted transparent={transparent} trimBefore={at} style={{ width: "100%", height: "100%" }} />
    </Sequence>
  );
};
