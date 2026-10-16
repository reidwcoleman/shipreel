import React, { useId, useMemo } from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily, loadUiFonts } from "./fonts";
import { Cta, Hook, Kinetic, List, Slide, Split, Stat } from "./scenes/basic";
import { Media } from "./scenes/media";
import { AppStore, Chat, Comment, Notes, Notifications, Reddit, Terminal, Tweet } from "./scenes/social";
import { FPS, normalizeSpec, type CompositionProps, type Overlay, type Scene, type Transition, type VideoSpec } from "./spec";
import { layoutScenes } from "./timeline";
import { BOUNCY, clamp } from "./ui/anim";
import { RenderProvider, resolveSrc, SceneProvider, useRender, useSafeArea } from "./ui/context";
import { Grain, MediaView } from "./ui/media";
import { TextBlock } from "./ui/text";

const SceneBody: React.FC<{ scene: Scene }> = ({ scene }) => {
  switch (scene.type) {
    case "hook":
      return <Hook scene={scene} />;
    case "media":
      return <Media scene={scene} />;
    case "chat":
      return <Chat scene={scene} />;
    case "notes":
      return <Notes scene={scene} />;
    case "tweet":
      return <Tweet scene={scene} />;
    case "reddit":
      return <Reddit scene={scene} />;
    case "comment":
      return <Comment scene={scene} />;
    case "list":
      return <List scene={scene} />;
    case "stat":
      return <Stat scene={scene} />;
    case "split":
      return <Split scene={scene} />;
    case "cta":
      return <Cta scene={scene} />;
    case "slide":
      return <Slide scene={scene} />;
    case "kinetic":
      return <Kinetic scene={scene} />;
    case "notifications":
      return <Notifications scene={scene} />;
    case "terminal":
      return <Terminal scene={scene} />;
    case "appstore":
      return <AppStore scene={scene} />;
  }
};

// Expo-out: fast start, long soft landing. The curve editors use for snappy cuts.
const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
const quadIn = Easing.bezier(0.5, 0, 0.75, 0);
const PUNCH_FRAMES = 8;

/**
 * Enter animation for the incoming scene + exit animation for the outgoing one. Fast moves get
 * directional motion blur (an SVG blur along the direction of travel, strongest at peak speed).
 */
const SceneShell: React.FC<{
  enter: Transition;
  enterFrames: number;
  exit: Transition;
  exitFrames: number;
  frames: number;
  children: React.ReactNode;
}> = ({ enter, enterFrames, exit, exitFrames, frames, children }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const id = useId().replace(/:/g, "");
  let transform = "";
  let opacity = 1;
  let blurX = 0;
  let blurY = 0;
  let brightness = 1;
  let flash = 0;
  const k = width / 1080;
  if (enter === "punch" || enter === "flash") {
    const s = spring({ frame, fps, config: { damping: 16, stiffness: 340, mass: 0.6 }, durationInFrames: PUNCH_FRAMES + 4 });
    transform += ` scale(${interpolate(s, [0, 1], [enter === "flash" ? 1.12 : 1.075, 1])})`;
    if (enter === "flash") flash = interpolate(frame, [0, 6], [0.92, 0], { ...clamp, easing: Easing.out(Easing.quad) });
    else brightness = interpolate(frame, [0, 5], [1.18, 1], clamp);
  } else if (enterFrames > 0 && frame < enterFrames) {
    const lin = interpolate(frame, [0, enterFrames], [0, 1], clamp);
    const t = expoOut(lin);
    const speed = Math.max(0, 1 - lin) ** 2; // blur fades as the move lands
    switch (enter) {
      case "fade":
        opacity = Easing.inOut(Easing.quad)(lin);
        break;
      case "slide-up":
        transform += ` translateY(${(1 - t) * 100}%)`;
        blurY = 26 * k * speed;
        break;
      case "slide-left":
        transform += ` translateX(${(1 - t) * 100}%)`;
        blurX = 26 * k * speed;
        break;
      case "zoom":
        transform += ` scale(${1.35 - 0.35 * t})`;
        opacity = Math.min(1, lin * 2.5);
        blurX = blurY = 10 * k * speed;
        break;
      case "whip":
        transform += ` translateX(${(1 - t) * -100}%)`;
        blurX = 60 * k * speed;
        break;
    }
  }
  const exitStart = frames - exitFrames;
  if (exitFrames > 0 && frame >= exitStart) {
    const lin = interpolate(frame, [exitStart, frames], [0, 1], clamp);
    const t = quadIn(lin);
    switch (exit) {
      case "slide-up":
        transform += ` translateY(${-t * 30}%)`;
        brightness = 1 - 0.55 * lin;
        blurY = 14 * k * t;
        break;
      case "slide-left":
        transform += ` translateX(${-t * 30}%)`;
        brightness = 1 - 0.55 * lin;
        blurX = 14 * k * t;
        break;
      case "zoom":
        transform += ` scale(${1 + 0.25 * t})`;
        blurX = blurY = 8 * k * t;
        break;
      case "whip":
        transform += ` translateX(${t * 100}%)`;
        blurX = 60 * k * t;
        break;
    }
  }
  const blur = blurX > 0.3 || blurY > 0.3;
  const filters = [blur ? `url(#mb-${id})` : "", brightness !== 1 ? `brightness(${brightness.toFixed(3)})` : ""].filter(Boolean).join(" ");
  return (
    <AbsoluteFill style={{ transform: transform || undefined, opacity, filter: filters || undefined, overflow: "hidden" }}>
      {blur && (
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id={`mb-${id}`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={`${blurX.toFixed(2)} ${blurY.toFixed(2)}`} />
          </filter>
        </svg>
      )}
      {children}
      {flash > 0 && <AbsoluteFill style={{ background: "#FFFFFF", opacity: flash }} />}
    </AbsoluteFill>
  );
};

/** Automatic SFX: transition whooshes and per-item pops/dings, unless the theme turns them off. */
/** Effects are short; unmount each one after it plays so the Player never holds many audio tags at once. */
const SFX_FRAMES = 45;

function autoSfx(scene: Scene, frames: number): { at: number; id: string; volume: number }[] {
  const out: { at: number; id: string; volume: number }[] = [];
  if (scene.sfx) out.push({ at: 0, id: scene.sfx, volume: 0.7 });
  else if (scene.transition === "whip" || scene.transition === "slide-left" || scene.transition === "slide-up")
    out.push({ at: 0, id: "whoosh", volume: 0.45 });
  else if (scene.transition === "zoom") out.push({ at: 0, id: "swoosh", volume: 0.4 });
  else if (scene.transition === "flash") out.push({ at: 0, id: "shutter", volume: 0.35 });
  if (scene.type === "chat") {
    const n = scene.messages.length;
    const span = Math.max(0.6, frames / FPS - 0.9);
    scene.messages.forEach((m, i) => out.push({ at: Math.round((m.at ?? 0.35 + (i * span) / n) * FPS), id: "pop", volume: 0.5 }));
  }
  if (scene.type === "notifications") {
    const first = 0.45 * FPS;
    const per = Math.max(4, (frames - first - 0.5 * FPS) / scene.items.length);
    scene.items.forEach((_, i) => out.push({ at: Math.round(first + i * per), id: i === 0 ? "notification" : "ding", volume: 0.45 }));
  }
  if (scene.type === "list") {
    const titleFrames = Math.min(18, frames * 0.18);
    const per = Math.max(6, (frames * 0.78 - titleFrames) / scene.items.length);
    scene.items.forEach((_, i) => out.push({ at: Math.round(titleFrames + i * per), id: scene.highlight === i ? "ding" : "pop", volume: 0.4 }));
  }
  if (scene.type === "kinetic") {
    const per = frames / scene.words.length;
    scene.words.forEach((_, i) => out.push({ at: Math.round(i * per), id: "click", volume: 0.5 }));
  }
  if (scene.type === "media") {
    (scene.taps ?? []).forEach((t) => out.push({ at: Math.max(0, Math.round(t.at * FPS) - 3), id: "click", volume: 0.55 }));
    (scene.callouts ?? []).forEach((c) => out.push({ at: Math.round(c.at * FPS), id: "swoosh", volume: 0.35 }));
  }
  if (scene.type === "stat") out.push({ at: Math.round(Math.min(frames * 0.6, 2.2 * FPS) + 4), id: "boom", volume: 0.5 });
  if (scene.type === "appstore") out.push({ at: Math.round(frames * 0.55), id: "click", volume: 0.6 });
  if (scene.type === "cta") out.push({ at: 2, id: "ding", volume: 0.45 });
  if (scene.type === "hook" && !scene.sfx && scene.transition === "cut") out.push({ at: 0, id: "pop", volume: 0.35 });
  return out.filter((s) => s.at < frames);
}

const Captions: React.FC<{ spec: VideoSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const c = spec.captions;
  const pages = useMemo(() => {
    if (!c) return [];
    const res: { start: number; end: number; words: typeof c.words }[] = [];
    for (let i = 0; i < c.words.length; i += c.wordsPerPage) {
      const words = c.words.slice(i, i + c.wordsPerPage);
      res.push({ start: words[0].start, end: words[words.length - 1].end, words });
    }
    return res;
  }, [c]);
  if (!c) return null;
  const t = frame / FPS;
  const page = pages.find((p, i) => t >= p.start && (t < (pages[i + 1]?.start ?? p.end + 0.4)));
  if (!page) return null;
  const active = page.words.findIndex((w) => t >= w.start && t < w.end + 0.05);
  const startFrame = Math.round(page.start * FPS);
  return (
    <Sequence from={startFrame} layout="none" key={startFrame}>
      <TextBlock
        text={page.words.map((w) => w.text).join(" ")}
        style={{ style: c.style, position: c.position, animation: "pop" }}
        activeWord={c.style === "hormozi" || c.style === "outline" ? active : -1}
      />
    </Sequence>
  );
};

const OverlayLayer: React.FC<{ overlay: Overlay }> = ({ overlay }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const { theme } = useRender();
  const safe = useSafeArea();
  const k = width / 1080;
  switch (overlay.type) {
    case "text":
      return <TextBlock text={overlay.text} style={{ animation: "pop", ...overlay.textStyle }} />;
    case "progress": {
      const p = interpolate(frame, [0, durationInFrames], [0, 1], clamp);
      return (
        <div style={{ position: "absolute", left: 0, right: 0, top: safe.top - 70 * k, height: 10 * k, background: "rgba(255,255,255,0.18)" }}>
          <div style={{ width: `${p * 100}%`, height: "100%", background: overlay.color ?? theme.accent, borderRadius: 999 }} />
        </div>
      );
    }
    case "watermark": {
      const pos: React.CSSProperties = {
        "top-left": { left: safe.left, top: safe.top - 60 * k },
        "top-right": { right: safe.right, top: safe.top - 60 * k },
        "bottom-left": { left: safe.left, bottom: safe.bottom - 40 * k },
        "bottom-right": { right: safe.right, bottom: safe.bottom - 40 * k },
      }[overlay.corner];
      return (
        <div style={{ position: "absolute", ...pos, color: "rgba(255,255,255,0.78)", fontFamily: fontFamily(theme.font), fontWeight: 700, fontSize: 30 * k, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
          {overlay.text}
        </div>
      );
    }
    case "pip": {
      const s = spring({ frame, fps, config: { damping: 16, stiffness: 160 } });
      const w = overlay.size * width;
      const h = overlay.shape === "circle" ? w : w * 1.3;
      const left = overlay.corner === "bottom-right" ? width - w - 60 * k : overlay.corner === "bottom-center" ? (width - w) / 2 : 60 * k;
      return (
        <div
          style={{
            position: "absolute",
            left,
            top: height - safe.bottom - h + 120 * k,
            width: w,
            height: h,
            borderRadius: overlay.shape === "circle" ? "50%" : 36 * k,
            overflow: "hidden",
            border: `${6 * k}px solid rgba(255,255,255,0.92)`,
            boxShadow: `0 ${20 * k}px ${60 * k}px rgba(0,0,0,0.5)`,
            transform: `scale(${s}) translateY(${(1 - s) * 60 * k}px)`,
            transformOrigin: "50% 100%",
            background: "#111",
          }}
        >
          <MediaView src={overlay.src} kind={overlay.kind} volume={overlay.volume} trimStart={overlay.trimStart} />
        </div>
      );
    }
    case "sticker": {
      const s = spring({ frame, fps, config: BOUNCY });
      const wobble = Math.sin(frame / 7) * 4;
      return (
        <div
          style={{
            position: "absolute",
            left: overlay.x * width,
            top: overlay.y * height,
            fontSize: overlay.size * width,
            transform: `translate(-50%, -50%) scale(${s}) rotate(${wobble}deg)`,
          }}
        >
          {overlay.emoji}
        </div>
      );
    }
  }
};

export const ShipreelVideo: React.FC<CompositionProps> = ({ spec: raw, assetBase, publicBase = "" }) => {
  const spec = useMemo(() => normalizeSpec(raw), [raw]);
  const { durationInFrames } = useVideoConfig();
  loadUiFonts();
  fontFamily(spec.theme.font);
  const { timed } = useMemo(() => layoutScenes(spec.scenes), [spec.scenes]);
  const ctx = { theme: spec.theme, aspect: spec.aspect, assetBase, publicBase };
  const resolve = (src?: string) => resolveSrc(src, ctx);
  const musicSrc = resolve(spec.audio?.src);
  const voSrc = resolve(spec.voiceover?.src);
  const fadeOutFrames = 24;

  return (
    <RenderProvider value={ctx}>
      <AbsoluteFill style={{ background: spec.theme.bg, overflow: "hidden" }}>
        {timed.map((t, i) => {
          const next = timed[i + 1];
          const exitFrames = next ? next.enterFrames : 0;
          return (
            <Sequence key={t.scene.id} from={t.from} durationInFrames={t.frames} name={`${t.index + 1}. ${t.scene.type}`}>
              <SceneShell
                enter={t.scene.transition}
                enterFrames={t.enterFrames}
                exit={next?.scene.transition ?? "cut"}
                exitFrames={exitFrames}
                frames={t.frames}
              >
                <SceneProvider value={{ index: t.index, enterFrames: t.enterFrames }}>
                  <SceneBody scene={t.scene} />
                </SceneProvider>
              </SceneShell>
              {spec.theme.sfx &&
                autoSfx(t.scene, t.frames).map((s, j) => (
                  <Sequence key={`sfx-${j}`} from={s.at} durationInFrames={Math.max(1, Math.min(SFX_FRAMES, t.frames - s.at))} layout="none">
                    <Audio src={resolve(`sfx:${s.id}`)!} volume={s.volume} />
                  </Sequence>
                ))}
            </Sequence>
          );
        })}

        {spec.theme.sfx &&
          timed
            .filter((t) => t.scene.type === "cta" && t.from >= 40)
            .map((t) => (
              <Sequence key={`rise-${t.scene.id}`} from={t.from - 38} durationInFrames={40} layout="none">
                <Audio src={resolve("sfx:rise")!} volume={0.35} />
              </Sequence>
            ))}

        {spec.overlays.map((o) => {
          const from = Math.round(o.start * FPS);
          const to = Math.min(durationInFrames, Math.round((o.end || durationInFrames / FPS) * FPS));
          if (to <= from) return null;
          return (
            <Sequence key={o.id} from={from} durationInFrames={to - from} layout="none">
              {/* An overlay that starts on frame 0 is part of the thumbnail: no fade-in. */}
              <SceneProvider value={{ index: from === 0 ? 0 : 1, enterFrames: 0 }}>
                <OverlayLayer overlay={o} />
              </SceneProvider>
            </Sequence>
          );
        })}

        <Captions spec={spec} />

        {musicSrc && (
          <Audio
            src={musicSrc}
            trimBefore={Math.round((spec.audio?.startFrom ?? 0) * FPS)}
            volume={(f) => {
              const v = spec.audio?.volume ?? 0.7;
              const fadeIn = interpolate(f, [0, 6], [0, 1], clamp);
              const fadeOut = spec.audio?.fadeOut === false ? 1 : interpolate(f, [durationInFrames - fadeOutFrames, durationInFrames], [1, 0], clamp);
              const duck = spec.voiceover ? 0.35 : 1;
              return v * fadeIn * fadeOut * duck;
            }}
          />
        )}
        {voSrc && <Audio src={voSrc} volume={spec.voiceover?.volume ?? 1} />}
        {spec.theme.grain && <Grain />}
      </AbsoluteFill>
    </RenderProvider>
  );
};
