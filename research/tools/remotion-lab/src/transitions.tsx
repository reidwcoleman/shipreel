import { lightLeak } from "@remotion/effects/light-leak";
import {
  linearTiming,
  springTiming,
  TransitionSeries,
  type TransitionPresentation,
  type TransitionPresentationComponentProps,
  type TransitionTiming,
} from "@remotion/transitions";
import { blurSlide } from "@remotion/transitions/blur-slide";
import { crossZoom } from "@remotion/transitions/cross-zoom";
import { fade } from "@remotion/transitions/fade";
import { none } from "@remotion/transitions/none";
import { pushCut } from "@remotion/transitions/push-cut";
import { slide } from "@remotion/transitions/slide";
import { zoomBlur } from "@remotion/transitions/zoom-blur";
import React, { useState } from "react";
import { AbsoluteFill, Easing, interpolate, isHtmlInCanvasSupported, random, Solid, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, DemoScene } from "./scene";

/* ------------------------------------------------------------------------------------------ */
/* 1. Shipreel's timeline -> TransitionSeries (same overlap math, verified in bench.mjs)        */
/* ------------------------------------------------------------------------------------------ */

export type Timed = { id: string; frames: number; enterFrames: number; transition: string };

/** Copy of Shipreel's layoutScenes(): a transition eats into the tail of the previous scene. */
export function layoutScenes(scenes: { id: string; frames: number; transition: string; want: number }[]) {
  const timed: (Timed & { from: number })[] = [];
  let cursor = 0;
  scenes.forEach((s, i) => {
    const enter = i === 0 ? 0 : Math.min(s.want, Math.floor(s.frames / 2), Math.floor(timed[i - 1].frames / 2));
    const from = Math.max(0, cursor - enter);
    timed.push({ id: s.id, frames: s.frames, enterFrames: enter, transition: s.transition, from });
    cursor = from + s.frames;
  });
  return { timed, totalFrames: cursor };
}

/** Shipreel transition id -> presentation + timing. Durations come from layoutScenes, so the editor
 * timeline, SFX offsets and sceneAtFrame() stay correct. */
export function presentationFor(id: string, frames: number, width: number, height: number): {
  presentation: TransitionPresentation<Record<string, unknown>>;
  timing: TransitionTiming;
} {
  const t = (easing: (x: number) => number) => linearTiming({ durationInFrames: frames, easing });
  const cast = <P extends Record<string, unknown>>(p: TransitionPresentation<P>) => p as unknown as TransitionPresentation<Record<string, unknown>>;
  switch (id) {
    case "fade":
      return { presentation: cast(fade()), timing: t(Easing.bezier(0.33, 0, 0.67, 1)) };
    case "slide-left":
      return { presentation: cast(slide({ direction: "from-right" })), timing: springTiming({ durationInFrames: frames, config: { damping: 200 } }) };
    case "slide-up":
      return { presentation: cast(slide({ direction: "from-bottom" })), timing: springTiming({ durationInFrames: frames, config: { damping: 200 } }) };
    case "zoom":
      return { presentation: cast(zoomThrough({})), timing: t(Easing.bezier(0.6, 0, 0.2, 1)) };
    case "whip":
      // Shader whip in renders (Chrome 157 headless shell has the flag on), CSS whip in the Player.
      return {
        presentation: isHtmlInCanvasSupported() ? cast(blurSlide({ direction: "from-right", blur: 0.6 })) : cast(whipSvg({ maxBlurPx: 0.06 * width })),
        timing: linearTiming({ durationInFrames: frames }),
      };
    case "push-cut":
      return { presentation: cast(pushCut({ flashOpacity: 0.25 })), timing: t(Easing.linear) };
    default:
      return { presentation: cast(none()), timing: linearTiming({ durationInFrames: Math.max(1, frames) }) };
  }
}

/* ------------------------------------------------------------------------------------------ */
/* 2. Custom presentations (CSS only => identical in Player and render)                         */
/* ------------------------------------------------------------------------------------------ */

type ZoomThroughProps = { outScale?: number; inScale?: number };

/** Camera flies INTO the outgoing scene while the next one settles from slightly behind. */
const ZoomThroughPresentation: React.FC<TransitionPresentationComponentProps<ZoomThroughProps>> = ({
  children,
  presentationDirection,
  presentationProgress: p,
  passedProps: { outScale = 2.2, inScale = 0.82 },
}) => {
  const exiting = presentationDirection === "exiting";
  const scale = exiting ? interpolate(p, [0, 1], [1, outScale]) : interpolate(p, [0, 1], [inScale, 1]);
  const opacity = exiting ? interpolate(p, [0.45, 0.85], [1, 0], clamp) : interpolate(p, [0.35, 0.75], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})`, opacity, zIndex: exiting ? 1 : 0 }}>{children}</AbsoluteFill>
  );
};
export const zoomThrough = (props: ZoomThroughProps): TransitionPresentation<ZoomThroughProps> => ({ component: ZoomThroughPresentation, props });

type WhipProps = { maxBlurPx?: number; direction?: "left" | "right" };

/**
 * Whip pan with DIRECTIONAL blur: an SVG feGaussianBlur with stdDeviation="x 0" smears only along
 * the motion axis (CSS filter: blur() is isotropic and reads as out-of-focus, not motion).
 * Use with linearTiming() - the whip easing lives here so the blur can follow velocity.
 */
const WhipSvgPresentation: React.FC<TransitionPresentationComponentProps<WhipProps>> = ({
  children,
  presentationDirection,
  presentationProgress: t,
  passedProps: { maxBlurPx = 64, direction = "left" },
}) => {
  const [id] = useState(() => `whip${String(random(null)).slice(2, 10)}`);
  const ease = Easing.bezier(0.7, 0, 0.3, 1);
  const p = ease(t);
  // velocity ~ derivative of the easing; peaks mid-transition
  const v = Math.abs(ease(Math.min(1, t + 0.02)) - ease(Math.max(0, t - 0.02))) / 0.04;
  const blur = Math.min(maxBlurPx, (v / 2.2) * maxBlurPx);
  const sign = direction === "left" ? -1 : 1;
  const x = presentationDirection === "exiting" ? sign * p * 100 : sign * (p - 1) * 100;
  return (
    <AbsoluteFill style={{ transform: `translateX(${x}%)`, filter: blur > 0.5 ? `url(#${id})` : undefined }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={id} x="-20%" y="0%" width="140%" height="100%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={`${blur.toFixed(2)} 0`} edgeMode="duplicate" />
        </filter>
      </svg>
      {children}
    </AbsoluteFill>
  );
};
export const whipSvg = (props: WhipProps): TransitionPresentation<WhipProps> => ({ component: WhipSvgPresentation, props });

type SmearProps = { samples?: number; shutter?: number; durationInFrames?: number };

/**
 * Whip pan with TRUE (box) motion blur by drawing N spatially offset copies along the motion vector.
 * Exact for rigid pans because the whole layer moves; cost is N x the scene paint during the whip only.
 */
const WhipSmearPresentation: React.FC<TransitionPresentationComponentProps<SmearProps>> = ({
  children,
  presentationDirection,
  presentationProgress: t,
  presentationDurationInFrames,
  passedProps: { samples = 7, shutter = 0.75 },
}) => {
  const ease = Easing.bezier(0.7, 0, 0.3, 1);
  const dt = shutter / Math.max(1, presentationDurationInFrames); // shutter in frames -> progress units
  const xAt = (tt: number) => {
    const p = ease(Math.min(1, Math.max(0, tt)));
    return presentationDirection === "exiting" ? -p * 100 : (1 - p) * 100;
  };
  const n = t <= 0 || t >= 1 ? 1 : samples;
  return (
    <AbsoluteFill style={{ isolation: "isolate" }}>
      {Array.from({ length: n }, (_, i) => {
        const tt = n === 1 ? t : t + ((i / (n - 1)) - 0.5) * dt;
        return (
          <AbsoluteFill
            key={i}
            style={{ transform: `translateX(${xAt(tt)}%)`, ...(n > 1 ? { mixBlendMode: "plus-lighter" as const, filter: `opacity(${1 / n})` } : {}) }}
          >
            {children}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
export const whipSmear = (props: SmearProps): TransitionPresentation<SmearProps> => ({ component: WhipSmearPresentation, props });

/** Shipreel's CURRENT whip, for comparison: isotropic CSS blur(18px) on the whole scene. */
const CssBlurWhipPresentation: React.FC<TransitionPresentationComponentProps<Record<string, never>>> = ({ children, presentationDirection, presentationProgress: p }) => {
  const e = 1 - Math.pow(1 - p, 3);
  const x = presentationDirection === "exiting" ? e * 105 : (1 - e) * -105;
  const blur = presentationDirection === "exiting" ? e * 18 : (1 - e) * 18;
  return <AbsoluteFill style={{ transform: `translateX(${x}%)`, filter: `blur(${blur}px)` }}>{children}</AbsoluteFill>;
};
export const cssBlurWhip = (): TransitionPresentation<Record<string, never>> => ({ component: CssBlurWhipPresentation, props: {} });

/* ------------------------------------------------------------------------------------------ */
/* 3. Overlays at a cut (no timing change): flash and WebGL light leak                         */
/* ------------------------------------------------------------------------------------------ */

/** White flash centred on the cut. Put inside <TransitionSeries.Overlay durationInFrames={6}>. */
export const Flash: React.FC<{ color?: string; peak?: number }> = ({ color = "#fff", peak = 0.85 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const mid = durationInFrames / 2;
  const o = interpolate(frame, [0, mid, durationInFrames], [0, peak, 0], { ...clamp, easing: Easing.out(Easing.quad) });
  return <AbsoluteFill style={{ background: color, opacity: o, mixBlendMode: "screen" }} />;
};

/** WebGL2 light leak (canvas effect: no HTML-in-canvas flag needed, so it previews in Safari too). */
export const LightLeakOverlay: React.FC<{ seed?: number; hueShift?: number }> = ({ seed = 3, hueShift = 20 }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const progress = interpolate(frame, [0, durationInFrames - 1], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen" }}>
      <Solid width={width} height={height} effects={[lightLeak({ seed, hueShift, progress })]} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------------------------------ */
/* 4. Bench compositions: 4 scenes x 36 frames, 3 transitions x 10 frames = 114 frames          */
/* ------------------------------------------------------------------------------------------ */

const HUES = [265, 20, 150, 320];

export const TransitionsBench: React.FC<{
  kind: "none" | "css" | "shader" | "whip-svg" | "whip-smear" | "css-blur-whip" | "lightleak" | "flash";
}> = ({ kind }) => {
  const { width } = useVideoConfig();
  const pres = (i: number): TransitionPresentation<Record<string, unknown>> => {
    const c = <P extends Record<string, unknown>>(p: TransitionPresentation<P>) => p as unknown as TransitionPresentation<Record<string, unknown>>;
    switch (kind) {
      case "css":
        return [c(slide({ direction: "from-right" })), c(zoomThrough({})), c(pushCut({}))][i];
      case "shader":
        return [c(blurSlide({ direction: "from-right", blur: 0.6 })), c(zoomBlur({})), c(crossZoom({ strength: 0.4 }))][i];
      case "whip-svg":
        return c(whipSvg({ maxBlurPx: 0.06 * width }));
      case "whip-smear":
        return c(whipSmear({ samples: 7 }));
      case "css-blur-whip":
        return c(cssBlurWhip());
      default:
        return c(none());
    }
  };
  const items: React.ReactNode[] = [];
  HUES.forEach((hue, i) => {
    if (i > 0) {
      if (kind === "lightleak" || kind === "flash") {
        items.push(
          <TransitionSeries.Overlay key={`o${i}`} durationInFrames={kind === "flash" ? 6 : 24}>
            {kind === "flash" ? <Flash /> : <LightLeakOverlay seed={i} />}
          </TransitionSeries.Overlay>,
        );
      } else {
        items.push(<TransitionSeries.Transition key={`t${i}`} presentation={pres(i - 1)} timing={linearTiming({ durationInFrames: 10 })} />);
      }
    }
    items.push(
      <TransitionSeries.Sequence key={`s${i}`} durationInFrames={36}>
        <DemoScene label={`Scene ${i + 1}`} hue={hue} />
      </TransitionSeries.Sequence>,
    );
  });
  return <TransitionSeries>{items}</TransitionSeries>;
};
