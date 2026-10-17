import React from "react";
import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { z } from "zod";
import type { MediaScene } from "../spec";
import { clamp } from "../ui/anim";
import { positionY, useRender, useSafeArea, useSceneInfo } from "../ui/context";
import { Backdrop, BrowserFrame, CalloutCard, calloutState, flowTaps, HandPhone, MediaView, PhoneFrame, phoneGeometry, ScreenFlow, TapRipples, zoomState, zoomTransform } from "../ui/media";
import { estimateTextHeight, TextBlock } from "../ui/text";
import { mixHex } from "./basic";

/** A screen recording or image, full-bleed or inside a device, with smooth punch-in zooms. */
export const Media: React.FC<{ scene: z.infer<typeof MediaScene> }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const safe = useSafeArea();
  const { theme } = useRender();
  const { durationInFrames } = useVideoConfig();
  const info = useSceneInfo();
  const cam = zoomTransform(scene.zooms ?? [], frame, fps);
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 170, mass: 0.8 } });
  // Montage shots arrive on a punch cut: the phone is already there. Otherwise it rises in.
  const rises = scene.transition !== "punch" && scene.transition !== "flash" && (info?.index ?? 1) > 0;

  const flow = scene.flow ?? [];
  const media = flow.length ? (
    <ScreenFlow first={{ src: scene.src, kind: scene.kind, trimStart: scene.trimStart, playbackRate: scene.playbackRate }} flow={flow} fit={scene.fit} />
  ) : (
    <MediaView
      src={scene.src}
      kind={scene.kind}
      fit={scene.fit}
      trimStart={scene.trimStart}
      playbackRate={scene.playbackRate}
      volume={scene.volume}
      style={scene.anchor === "top" ? { objectPosition: "50% 0%" } : undefined}
    />
  );
  const taps = [...(scene.taps ?? []), ...flowTaps(flow)];
  // Timed caption lines: the one whose time has come replaces the previous (TikTok text per beat).
  const t0 = frame / fps;
  const lines = scene.lines ?? [];
  const lineIdx = lines.reduce((acc, l, i) => (t0 >= l.at ? i : acc), -1);
  const captionText = lineIdx >= 0 ? lines[lineIdx].text : scene.caption?.text;
  const lineFrom = lineIdx >= 0 ? Math.round(lines[lineIdx].at * fps) : 0;

  const captionPos = scene.caption?.style?.position ?? (scene.device === "none" || scene.device === "hand" ? "upper" : "top");

  const callout = calloutState(scene.callouts ?? [], frame, fps);
  const renderMedia = () =>
    flow.length ? (
      <ScreenFlow first={{ src: scene.src, kind: scene.kind, trimStart: scene.trimStart, playbackRate: scene.playbackRate }} flow={flow} fit="cover" />
    ) : (
      <MediaView src={scene.src} kind={scene.kind} fit="cover" trimStart={scene.trimStart} playbackRate={scene.playbackRate} />
    );

  // One caption element for every layout; lines re-key so each new line lands like freshly typed TikTok text.
  const captionEl = (extra?: Partial<NonNullable<typeof scene.caption>["style"]>) =>
    captionText ? (
      <Sequence from={lineFrom} layout="none" key={`cap-${lineIdx}`}>
        <TextBlock text={captionText} style={{ animation: lineIdx >= 0 ? "none" : "pop", ...scene.caption?.style, position: captionPos, ...extra }} />
      </Sequence>
    ) : null;

  if (scene.device === "hand") {
    return (
      <AbsoluteFill style={{ background: "#000" }}>
        <AbsoluteFill style={{ transform: cam.transform, transformOrigin: "50% 50%" }}>
          <HandPhone clipId={scene.hand ?? "default"}>
            {media}
            <TapRipples taps={taps} boxW={600} />
          </HandPhone>
        </AbsoluteFill>
        {captionEl()}
      </AbsoluteFill>
    );
  }

  if (scene.device === "none") {
    const push = interpolate(frame, [0, durationInFrames], [1, scene.push ?? 1], clamp);
    // With a known aspect the footage is laid out in its own cover box, so taps and callouts can be
    // placed in screen coordinates. Without one it simply fills the frame.
    const a = scene.aspect;
    const box = a
      ? width / height > a
        ? { x: 0, y: scene.anchor === "top" ? 0 : (height - width / a) / 2, w: width, h: width / a }
        : { x: (width - height * a) / 2, y: 0, w: height * a, h: height }
      : { x: 0, y: 0, w: width, h: height };
    const zt = zoomTransform(scene.zooms ?? [], frame, fps);
    // Where a frame point ends up after the cam (scale·translate about the centre) and the slow push.
    const m = (px: number, py: number) => {
      const cx = width / 2;
      const cy = height / 2;
      const x1 = cx + zt.scale * (px + (zt.tx / 100) * width - cx);
      const y1 = cy + zt.scale * (py + (zt.ty / 100) * height - cy);
      return { x: cx + push * (x1 - cx), y: cy + push * (y1 - cy) };
    };
    const o = m(box.x, box.y);
    const placed = { x: o.x, y: o.y, w: box.w * zt.scale * push, h: box.h * zt.scale * push };
    const capBottomFull = scene.caption
      ? positionY(captionPos, height, safe) * height + estimateTextHeight(scene.caption.text, scene.caption.style, theme.captionStyle, width, 0.84) / 2 + height * 0.02
      : safe.top;
    return (
      <AbsoluteFill style={{ background: "#000" }}>
        {scene.fit === "contain" && (
          <AbsoluteFill style={{ filter: "blur(40px) brightness(0.55)", transform: "scale(1.2)" }}>
            <MediaView src={scene.src} kind={scene.kind} trimStart={scene.trimStart} playbackRate={scene.playbackRate} />
          </AbsoluteFill>
        )}
        <AbsoluteFill style={{ transform: `scale(${push})` }}>
          <AbsoluteFill style={{ transform: cam.transform, transformOrigin: "50% 50%" }}>
            {a ? (
              <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h }}>
                {renderMedia()}
                <TapRipples taps={taps} boxW={box.w} />
              </div>
            ) : (
              <>
                {media}
                <TapRipples taps={taps} boxW={width} />
              </>
            )}
          </AbsoluteFill>
        </AbsoluteFill>
        {callout && (
          <CalloutCard callout={callout.c} p={callout.p} box={placed} minTop={capBottomFull} maxBottom={height - safe.bottom * 0.7} render={renderMedia} />
        )}
        {captionEl()}
      </AbsoluteFill>
    );
  }

  const bg = scene.background ?? { kind: "mesh" as const, colors: [theme.bg, mixHex(theme.accent, theme.bg, 0.2), "#0e0e12"] };
  const rise = interpolate(enter, [0, 1], [120, 0]);

  if (scene.device === "browser") {
    const w = width * 0.9;
    const h = Math.min(height * 0.48, w * 1.25);
    return (
      <AbsoluteFill>
        <Backdrop bg={bg} />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingTop: height * 0.08 }}>
          <div style={{ transform: `translateY(${rise}px) scale(${interpolate(enter, [0, 1], [0.94, 1])})`, opacity: interpolate(frame, [0, 6], [0, 1], clamp) }}>
            <BrowserFrame width={w} height={h}>
              <div style={{ position: "absolute", inset: 0, transform: cam.transform }}>{media}</div>
            </BrowserFrame>
          </div>
        </AbsoluteFill>
        {captionEl()}
      </AbsoluteFill>
    );
  }

  if (scene.device === "floating") {
    const w = width * 0.82;
    const h = (height - safe.top - safe.bottom) * 0.82;
    const tilt = interpolate(frame, [0, 90], [8, 2], clamp);
    return (
      <AbsoluteFill>
        <Backdrop bg={bg} />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingTop: safe.top * 0.6 }}>
          <div
            style={{
              width: w,
              height: h,
              borderRadius: width * 0.05,
              overflow: "hidden",
              boxShadow: `0 ${width * 0.05}px ${width * 0.14}px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)`,
              transform: `perspective(${width * 3}px) rotateX(${tilt}deg) translateY(${rise}px)`,
              opacity: interpolate(frame, [0, 6], [0, 1], clamp),
            }}
          >
            <div style={{ width: "100%", height: "100%", transform: cam.transform }}>{media}</div>
          </div>
        </AbsoluteFill>
        {captionEl()}
      </AbsoluteFill>
    );
  }

  // iPhone: a large phone floating in 3D over a blurred copy of its own footage (Rotato / Screen Studio
  // look). Zooms move the whole camera toward a point on the screen instead of cropping inside it.
  const g = phoneGeometry(width * 0.74);
  const phoneLeft = (width - g.width) / 2;
  // The caption sits above the phone; the phone (and the zoom camera) never slide under it.
  const capBottom = scene.caption
    ? positionY(captionPos, height, safe) * height + estimateTextHeight(scene.caption.text, scene.caption.style, theme.captionStyle, width, 0.84) / 2 + height * 0.018
    : 0;
  const phoneTop = Math.max(height * 0.215, capBottom);
  const z = zoomState(scene.zooms ?? [], frame, fps);
  const fx = phoneLeft + g.inset + z.x * g.screenW;
  const fy = phoneTop + g.inset + z.y * g.screenH;
  const kk = Math.min(1, z.k);
  const camX = (width / 2 - fx) * kk * 0.85;
  const camYFree = (height * 0.5 - fy) * kk * 0.85;
  // y' = fy + (y - fy)·scale + camY must keep the phone's top edge below the caption.
  // (Zooms aimed at the lower part of the screen win: the phone may slide up under the caption to show them.)
  const below = interpolate(z.y, [0.74, 0.84], [0, 1], clamp) * Math.min(1, z.k);
  const panUnder = !!scene.caption && (scene.zooms ?? []).some((zz) => zz.y >= 0.74);
  const camYKeep = scene.caption ? Math.max(camYFree, capBottom - fy - (phoneTop - fy) * z.scale) : camYFree;
  const camY = camYKeep + (camYFree - camYKeep) * below;
  const t = frame / fps;
  // While a callout is lifted the phone squares up to the camera so the card leaves from the right spot.
  const flat = 1 - Math.min(1, callout?.p ?? 0);
  const lift = rises ? interpolate(enter, [0, 1], [height * 0.28, 0]) : 0;
  const tiltX = ((rises ? interpolate(enter, [0, 1], [24, 7]) : 7) + Math.sin(t * 0.8) * 1.2) * flat;
  const tiltY = interpolate(frame, [0, Math.max(1, durationInFrames)], [-9, 5], clamp) * (1 - kk * 0.8) * flat;
  const floatY = Math.sin(t * 1.3) * 7 * (width / 1080) * flat;
  const sx = phoneLeft + g.inset;
  const sy = phoneTop + g.inset + lift + floatY;
  const screenBox = {
    x: fx + (sx - fx) * z.scale + camX,
    y: fy + (sy - fy) * z.scale + camY,
    w: g.screenW * z.scale,
    h: g.screenH * z.scale,
  };
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {scene.background ? (
        <Backdrop bg={scene.background} />
      ) : (
        <AbsoluteFill style={{ transform: "scale(1.35)", filter: `blur(${width * 0.06}px) brightness(0.42) saturate(1.3)` }}>
          <MediaView src={scene.src} kind={scene.kind} trimStart={scene.trimStart} playbackRate={scene.playbackRate} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 60% at 50% 40%, ${mixHex(theme.accent, "#000000", 0.18)}55, transparent 70%), radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.55) 100%)` }} />
      <AbsoluteFill style={{ transform: `translate(${camX}px, ${camY}px) scale(${z.scale})`, transformOrigin: `${fx}px ${fy}px` }}>
        <div
          style={{
            position: "absolute",
            left: phoneLeft,
            top: phoneTop,
            transform: `perspective(${width * 2.6}px) translateY(${lift + floatY}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${rises ? interpolate(enter, [0, 1], [0.92, 1]) : 1})`,
            transformOrigin: "50% 30%",
            opacity: rises ? interpolate(frame, [0, 4], [0, 1], clamp) : 1,
          }}
        >
          <PhoneFrame width={g.width}>
            {media}
            <TapRipples taps={taps} boxW={g.screenW} />
          </PhoneFrame>
        </div>
      </AbsoluteFill>
      {callout && (
        <CalloutCard
          callout={callout.c}
          p={callout.p}
          box={screenBox}
          minTop={scene.caption ? capBottom : safe.top}
          maxBottom={height - safe.bottom * 0.7}
          render={renderMedia}
        />
      )}
      {captionEl(panUnder && (!scene.caption?.style?.style || scene.caption.style.style === "tiktok-classic" || scene.caption.style.style === "minimal" || scene.caption.style.style === "tiktok-plain") ? { style: "tiktok-box" } : undefined)}
    </AbsoluteFill>
  );
};
