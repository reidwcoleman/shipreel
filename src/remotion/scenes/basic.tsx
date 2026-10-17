import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../fonts";
import type { Background, CtaScene, HookScene, KineticScene, ListScene, SlideScene, SplitScene, StatScene, TextStyle } from "../spec";
import type { z } from "zod";
import { BOUNCY, clamp, SNAPPY } from "../ui/anim";
import { useColdOpen, useRender, useSafeArea } from "../ui/context";
import { AppIcon } from "../ui/ios";
import { Backdrop, MediaView, PhoneFrame } from "../ui/media";
import { estimateTextHeight, StyledText, TextBlock } from "../ui/text";

type P<T extends z.ZodTypeAny> = { scene: z.infer<T> };

/** Gentle constant drift so no frame is ever static. */
function useDrift(amount = 0.035) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return interpolate(frame, [0, Math.max(30, durationInFrames)], [1, 1 + amount], clamp);
}

export const Hook: React.FC<P<typeof HookScene>> = ({ scene }) => {
  const showcaseDrift = useDrift(0.03);
  if (scene.image) return <PhoneShowcase text={scene.text} image={scene.image} background={scene.background} textStyle={{ size: 0.064, ...scene.textStyle }} drift={showcaseDrift} animation="pop" />;
  return <HookCard scene={scene} />;
};

const HookCard: React.FC<P<typeof HookScene>> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const { theme } = useRender();
  const drift = useDrift();
  const emojiPop = spring({ frame: frame - 2, fps, config: BOUNCY });
  const safe = useSafeArea();
  return (
    <AbsoluteFill>
      <Backdrop bg={scene.background ?? { kind: "mesh", colors: [theme.bg, mixHex(theme.accent, theme.bg, 0.22), mixHex(theme.accent, theme.bg, 0.08)] }} />
      <AbsoluteFill style={{ transform: `scale(${drift})` }}>
        {scene.emoji && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: safe.top + (safe.height - safe.top - safe.bottom) * 0.2,
              textAlign: "center",
              fontSize: width * 0.2,
              transform: `scale(${emojiPop}) rotate(${interpolate(emojiPop, [0, 1], [-20, 0])}deg)`,
            }}
          >
            {scene.emoji}
          </div>
        )}
        <TextBlock text={scene.text} style={{ animation: "pop", ...scene.textStyle }} />
        {scene.sub && (
          <TextBlock
            text={scene.sub}
            position={nextPosition(scene.textStyle?.position)}
            style={{ style: "minimal", animation: "fade", size: 0.042 }}
            delay={10}
          />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

function nextPosition(p?: string): "upper" | "center" | "lower" | "bottom" {
  if (p === "top") return "center";
  if (p === "upper") return "center";
  if (p === "lower" || p === "bottom") return "bottom";
  return "lower";
}

/**
 * Headline on a clean branded backdrop with an app screen in a phone that bleeds off the bottom: the
 * carousel/opener layout that keeps the product on screen from the first frame.
 */
const PhoneShowcase: React.FC<{ text: string; image: string; background?: Background; textStyle?: TextStyle; drift: number; animation?: TextStyle["animation"] }> = ({ text, image, background, textStyle, drift, animation = "fade" }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { theme } = useRender();
  const safe = useSafeArea();
  const cold = useColdOpen();
  const pw = width * (height / width > 1.5 ? 0.68 : 0.6);
  const settle = cold ? 1 : spring({ frame, fps, config: { damping: 20, stiffness: 160, mass: 0.8 } });
  const textBottom = height * 0.33;
  return (
    <AbsoluteFill>
      <Backdrop bg={background ?? { kind: "gradient", from: mixHex(theme.accent, theme.bg, 0.22), to: theme.bg, angle: 180 }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 45% at 50% 70%, ${theme.accent}33, transparent 70%)` }} />
      <div style={{ position: "absolute", left: (width - pw) / 2, top: textBottom + height * 0.03, transform: `translateY(${interpolate(settle, [0, 1], [height * 0.04, 0])}px) scale(${drift})`, transformOrigin: "50% 0%" }}>
        <PhoneFrame width={pw}>
          <MediaView src={image} kind="image" />
        </PhoneFrame>
      </div>
      <div style={{ position: "absolute", left: safe.left * 0.7, right: safe.right * 0.7, top: 0, height: textBottom, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: height * 0.01 }}>
        <StyledText text={text} style={{ style: "tiktok-classic", animation, size: 0.06, ...textStyle }} maxWidth={0.86} />
      </div>
    </AbsoluteFill>
  );
};

export const Slide: React.FC<P<typeof SlideScene>> = ({ scene }) => {
  const drift = useDrift(0.05);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { theme } = useRender();
  const safe = useSafeArea();
  if (scene.layout === "phone" && scene.image) return <PhoneShowcase text={scene.text} image={scene.image} background={scene.background} textStyle={scene.textStyle} drift={drift} />;
  if (scene.layout === "screenshot" && scene.image) {
    // A raw screenshot exactly as the phone saved it: no frame, no crop, black around it if the canvas differs.
    return (
      <AbsoluteFill style={{ background: "#000" }}>
        <MediaView src={scene.image} kind="image" fit={height / width > 1.7 ? "cover" : "contain"} style={{ objectPosition: "50% 0%" }} />
        {scene.text && <TextBlock text={scene.text} style={{ position: "center", ...scene.textStyle }} />}
      </AbsoluteFill>
    );
  }
  // Carousel photos are real phone photos: shown as they are (no darkening, no drift on stills).
  const bg = scene.image
    ? ({ kind: "media", src: scene.image, dim: 0, blur: 0, kenBurns: false } as const)
    : scene.background;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: scene.image ? undefined : `scale(${drift})` }}>
        <Backdrop bg={bg} />
      </AbsoluteFill>
      {scene.text && <TextBlock text={scene.text} style={{ position: "center", ...scene.textStyle }} />}
    </AbsoluteFill>
  );
};

export const Kinetic: React.FC<P<typeof KineticScene>> = ({ scene }) => {
  const { durationInFrames } = useVideoConfig();
  const { theme } = useRender();
  const per = durationInFrames / scene.words.length;
  return (
    <AbsoluteFill>
      <Backdrop bg={scene.background ?? { kind: "solid", color: theme.bg }} />
      {scene.words.map((word, i) => {
        const accent = i % 3 === 2;
        const from = Math.round(i * per);
        const len = i === scene.words.length - 1 ? durationInFrames - from : Math.round((i + 1) * per) - from;
        return (
          <Sequence key={i} from={from} durationInFrames={Math.max(1, len)} layout="none">
            <TextBlock
              text={accent ? `*${word.replace(/\*/g, "")}*` : word}
              style={{ style: "hormozi", animation: "slam", size: word.length > 9 ? 0.1 : 0.14, ...scene.textStyle }}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const List: React.FC<P<typeof ListScene>> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  const { theme } = useRender();
  const safe = useSafeArea();
  const n = scene.items.length;
  const titleFrames = Math.min(18, durationInFrames * 0.18);
  const per = Math.max(6, (durationInFrames * 0.78 - titleFrames) / n);
  const k = width / 1080;
  const itemSize = n > 6 ? 40 : n > 4 ? 46 : 54;
  return (
    <AbsoluteFill>
      <Backdrop bg={scene.background ?? { kind: "gradient", from: theme.bg, to: mixHex(theme.accent, theme.bg, 0.12), angle: 170 }} />
      <div
        style={{
          position: "absolute",
          top: safe.top,
          left: safe.left,
          right: safe.right,
          bottom: safe.bottom,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 34 * k,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center" }}>
          <StyledText text={scene.title} style={{ animation: "pop", ...scene.textStyle }} maxWidth={0.8} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 * k }}>
          {scene.items.map((item, i) => {
            const start = titleFrames + i * per;
            const s = spring({ frame: frame - start, fps, config: SNAPPY });
            const isHi = scene.highlight === i;
            const glow = isHi ? interpolate(frame - start, [0, 12, 40], [0, 1, 0.75], clamp) : 0;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 22 * k,
                  padding: `${20 * k}px ${26 * k}px`,
                  borderRadius: 28 * k,
                  background: isHi ? theme.accent : "rgba(255,255,255,0.08)",
                  color: isHi ? "#0A0A0A" : theme.fg,
                  boxShadow: isHi ? `0 0 ${60 * k * glow}px ${mixHex(theme.accent, "#000000", 0.0)}66` : undefined,
                  opacity: interpolate(frame - start, [0, 4], [0, 1], clamp),
                  transform: `translateX(${interpolate(s, [0, 1], [-60 * k, 0])}px) scale(${isHi ? 1 + 0.03 * glow : 1})`,
                  fontFamily: fontFamily(theme.font),
                }}
              >
                {scene.numbered && (
                  <div
                    style={{
                      width: 64 * k,
                      height: 64 * k,
                      flex: "none",
                      borderRadius: 18 * k,
                      background: isHi ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 34 * k,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {i + 1}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 * k, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: itemSize * k, lineHeight: 1.1, letterSpacing: "-0.02em" }}>{item.text}</div>
                  {item.sub && (
                    <div style={{ fontWeight: 500, fontSize: itemSize * 0.58 * k, opacity: 0.72, lineHeight: 1.25 }}>{item.sub}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Stat: React.FC<P<typeof StatScene>> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  const { theme } = useRender();
  const safe = useSafeArea();
  const k = width / 1080;
  const countLen = Math.min(durationInFrames * 0.6, 2.2 * fps);
  const t = interpolate(frame, [4, 4 + countLen], [0, 1], clamp);
  const eased = 1 - Math.pow(1 - t, 3);
  const value = scene.from + (scene.to - scene.from) * eased;
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: scene.decimals,
    maximumFractionDigits: scene.decimals,
  });
  const pop = spring({ frame: frame - 4 - countLen, fps, config: BOUNCY });
  const chartW = width - safe.left - safe.right;
  const chartH = 300 * k;
  const pts = Array.from({ length: 24 }, (_, i) => {
    const x = (i / 23) * chartW;
    const growth = Math.pow(i / 23, 2.2);
    const wobble = Math.sin(i * 1.9) * 0.05 + Math.sin(i * 0.7) * 0.03;
    const y = chartH - (growth * 0.9 + 0.06 + wobble * (1 - growth)) * chartH;
    return [x, Math.max(4, Math.min(chartH - 2, y))] as const;
  });
  const path = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const len = chartW * 1.6;
  return (
    <AbsoluteFill>
      <Backdrop bg={scene.background ?? { kind: "solid", color: theme.bg }} />
      <div
        style={{
          position: "absolute",
          left: safe.left,
          right: safe.right,
          top: safe.top,
          bottom: safe.bottom,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 26 * k,
          fontFamily: fontFamily(theme.font),
          color: theme.fg,
        }}
      >
        <div style={{ fontSize: 44 * k, fontWeight: 700, opacity: interpolate(frame, [0, 8], [0, 1], clamp), letterSpacing: "-0.01em", textAlign: "center" }}>
          {scene.label}
        </div>
        <div
          style={{
            fontSize: (formatted.length + scene.prefix.length + scene.suffix.length > 8 ? 150 : 190) * k,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            fontVariantNumeric: "tabular-nums",
            color: theme.accent,
            lineHeight: 1,
            transform: `scale(${1 + 0.06 * Math.max(0, pop) * (1 - Math.min(1, (frame - 4 - countLen) / 20))})`,
            textShadow: `0 0 ${50 * k}px ${theme.accent}55`,
          }}
        >
          {scene.prefix}
          {formatted}
          {scene.suffix}
        </div>
        {scene.sub && (
          <div style={{ fontSize: 36 * k, fontWeight: 500, opacity: interpolate(frame, [12, 22], [0, 0.75], clamp), textAlign: "center" }}>{scene.sub}</div>
        )}
        {scene.chart && (
          <svg width={chartW} height={chartH} style={{ marginTop: 20 * k, overflow: "visible" }}>
            <defs>
              <linearGradient id="statfill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={theme.accent} stopOpacity={0.35} />
                <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={`${path} L${chartW},${chartH} L0,${chartH} Z`} fill="url(#statfill)" opacity={t} />
            <path
              d={path}
              fill="none"
              stroke={theme.accent}
              strokeWidth={7 * k}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={len}
              strokeDashoffset={len * (1 - eased)}
            />
          </svg>
        )}
      </div>
    </AbsoluteFill>
  );
};

const toneColor = { bad: "#FF4D4F", good: "#2BD67B", neutral: "#FFFFFF" } as const;

export const Split: React.FC<P<typeof SplitScene>> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const { theme } = useRender();
  const k = width / 1080;
  const ratio = scene.ratio ?? 0.5;
  const seam = Math.round(height * ratio);
  const secondAt = Math.round(durationInFrames * (scene.stagger ?? 0.38));
  const s1 = spring({ frame, fps, config: SNAPPY });
  const s2 = spring({ frame: frame - secondAt, fps, config: SNAPPY });
  // The caption sits on the seam, so the bottom label starts below it instead of underneath it.
  const capStyle = scene.caption ? { style: ratio > 0.55 ? ("headline" as const) : ("tiktok-box" as const), animation: "pop" as const, ...scene.caption.style } : undefined;
  const capHalf = scene.caption ? estimateTextHeight(scene.caption.text, capStyle, theme.captionStyle, width, 0.78) / 2 : 0;
  const half = (side: (typeof scene)["top"], s: number, top: boolean) => {
    const h = top ? seam : height - seam;
    const content = side.src ? (
      side.device === "iphone" ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 40 * k, background: `radial-gradient(ellipse at 50% 30%, ${mixHex(theme.accent, "#101014", 0.12)}, #0b0b0e 70%)` }}>
          <PhoneFrame width={Math.min(width * 0.5, (h - 80 * k) / 2.165)}>
            <MediaView src={side.src} kind={side.kind} volume={side.volume} />
          </PhoneFrame>
        </AbsoluteFill>
      ) : (
        <MediaView src={side.src} kind={side.kind} volume={side.volume} />
      )
    ) : (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: `0 ${110 * k}px` }}>
        <StyledText text={side.text ?? ""} style={{ style: "minimal", animation: "none", size: 0.06 }} maxWidth={0.8} />
      </AbsoluteFill>
    );
    return (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: top ? 0 : seam,
          height: h,
          overflow: "hidden",
          opacity: interpolate(s, [0, 0.4], [0, 1], clamp),
          transform: `translateY(${interpolate(s, [0, 1], [top ? -80 : 80, 0])}px)`,
          background: top ? "#121214" : "#18181b",
        }}
      >
        {content}
        {side.label && (
          <div
            style={{
              position: "absolute",
              left: 120 * k,
              top: top ? 250 * k : Math.max(40 * k, capHalf + 28 * k),
              padding: `${12 * k}px ${26 * k}px`,
              borderRadius: 999,
              background: side.tone === "neutral" ? "rgba(0,0,0,0.6)" : toneColor[side.tone],
              color: side.tone === "neutral" ? "#fff" : "#0a0a0a",
              fontFamily: fontFamily(theme.font),
              fontWeight: 800,
              fontSize: 40 * k,
              letterSpacing: "-0.01em",
            }}
          >
            {side.label}
          </div>
        )}
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {half(scene.top, s1, true)}
      {half(scene.bottom, s2, false)}
      <div style={{ position: "absolute", left: 0, right: 0, top: seam - 3 * k, height: 6 * k, background: theme.accent, transform: `scaleX(${s2})` }} />
      {scene.caption && (
        <div style={{ position: "absolute", left: 120 * k, right: 120 * k, top: seam, transform: "translateY(-50%)", display: "flex", justifyContent: "center" }}>
          <StyledText text={scene.caption.text} style={capStyle} delay={ratio > 0.55 ? 0 : secondAt} maxWidth={0.78} />
        </div>
      )}
    </AbsoluteFill>
  );
};

export const Cta: React.FC<P<typeof CtaScene>> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const { theme } = useRender();
  const k = width / 1080;
  // End cards land on a hard cut: everything is already on screen and settles (no blank frame).
  const iconPop = interpolate(spring({ frame, fps, config: BOUNCY }), [0, 1], [0.62, 1]);
  const badgeIn = interpolate(spring({ frame: frame - 6, fps, config: SNAPPY }), [0, 1], [0.7, 1]);
  const light = luminance(theme.bg) > 0.5;
  const bob = Math.sin(frame / 6) * 10 * k;
  const label = (() => {
    switch (scene.action) {
      case "app-store":
        return "Download on the App Store";
      case "google-play":
        return "Get it on Google Play";
      case "search":
        return `Search “${scene.appName}”`;
      case "url":
        return scene.url ?? "yourapp.com";
      case "comment":
        return `Comment “${scene.appName.toUpperCase()}” for the link`;
      default:
        return "Link in bio";
    }
  })();
  return (
    <AbsoluteFill>
      <Backdrop bg={scene.background ?? { kind: "gradient", from: mixHex(theme.accent, theme.bg, 0.26), to: theme.bg, angle: 180 }} />
      {!scene.background && (
        <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 36%, ${theme.accent}55 0%, ${theme.accent}14 22%, transparent 46%)`, opacity: interpolate(frame, [0, 10], [0.4, 1], clamp) }} />
      )}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40 * k, paddingBottom: 260 * k, fontFamily: fontFamily(theme.font) }}>
        <div style={{ transform: `scale(${iconPop}) rotate(${interpolate(iconPop, [0, 1], [-12, 0])}deg)`, filter: `drop-shadow(0 ${30 * k}px ${60 * k}px rgba(0,0,0,${light ? 0.22 : 0.45}))` }}>
          <AppIcon src={scene.icon} name={scene.appName} size={300 * k} color={theme.accent} />
        </div>
        <div style={{ color: theme.fg, fontWeight: 800, fontSize: 84 * k, letterSpacing: "-0.03em", opacity: interpolate(frame, [0, 5], [0.35, 1], clamp) }}>
          {scene.appName}
        </div>
        <StyledText text={scene.headline} style={{ style: "minimal", animation: "slide-up", size: 0.058, color: theme.fg }} delay={2} maxWidth={0.8} />
        {scene.sub && <StyledText text={scene.sub} style={{ style: "minimal", animation: "fade", size: 0.036, color: mixHex(theme.fg, theme.bg, 0.72) }} delay={8} maxWidth={0.75} />}
        <div
          style={{
            marginTop: 20 * k,
            padding: `${26 * k}px ${46 * k}px`,
            borderRadius: 999,
            background: scene.action === "app-store" || scene.action === "google-play" ? "#000" : theme.accent,
            color: scene.action === "app-store" || scene.action === "google-play" ? "#fff" : "#0A0A0A",
            border: (scene.action === "app-store" || scene.action === "google-play") && !light ? "2px solid rgba(255,255,255,0.6)" : undefined,
            boxShadow: light ? `0 ${12 * k}px ${30 * k}px rgba(0,0,0,0.18)` : undefined,
            fontWeight: 800,
            fontSize: 44 * k,
            letterSpacing: "-0.01em",
            transform: `scale(${badgeIn}) translateY(${scene.action === "link-in-bio" ? bob : 0}px)`,
            display: "flex",
            alignItems: "center",
            gap: 16 * k,
          }}
        >
          {label}
          {scene.action === "link-in-bio" && <span style={{ fontSize: 46 * k }}>↓</span>}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Relative luminance 0–1 of a #rrggbb colour (0 for anything else). */
export function luminance(h: string): number {
  const p = parseHex(h);
  if (!p) return 0;
  const [r, g, b] = p.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Blend two #rrggbb colours (t = share of `a`). Falls back to `b` for non-hex input. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  if (!pa || !pb) return b;
  const m = pa.map((v, i) => Math.round(v * t + pb[i] * (1 - t)));
  return `#${m.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function parseHex(h: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
