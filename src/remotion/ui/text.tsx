import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily, SINGLE_WEIGHT } from "../fonts";
import type { CaptionStyleId, FontId, TextStyle } from "../spec";
import { clamp, SNAPPY } from "./anim";
import { positionY, useRender, useSafeArea, useSceneInfo } from "./context";

/** `glue`: no space before this token (punctuation touching a highlight, as in "*reads*."). */
type Token = { word: string; hi: boolean; glue?: boolean };

/** "Stop *scrolling*\nnow" → [[Stop, scrolling*], [now]]. Asterisks mark highlighted words. */
export function parseRich(text: string): Token[][] {
  return text.split(/\\n|\n/).map((line) => {
    const tokens: Token[] = [];
    const re = /\*([^*]+)\*|([^\s*]+|\*)/g;
    let m: RegExpExecArray | null;
    let end = -1;
    while ((m = re.exec(line))) {
      const glue = tokens.length > 0 && m.index === end;
      end = m.index + m[0].length;
      if (m[1]) m[1].split(/\s+/).filter(Boolean).forEach((w, i) => tokens.push({ word: w, hi: true, glue: glue && i === 0 }));
      else if (m[2]) tokens.push({ word: m[2], hi: false, glue });
    }
    return tokens;
  });
}

export const plainText = (text: string) => text.replace(/\*/g, "").replace(/\\n|\n/g, " ");

type Recipe = {
  font: FontId;
  weight: number;
  size: number; // fraction of width
  upper?: boolean;
  color?: string;
  lineHeight: number;
  tracking: string;
  shadow?: string;
  box?: { bg: string; fg: string; padY: number; padX: number; radius: number };
  /** Full-frame-width band behind the whole block (Snapchat caption). */
  bar?: { bg: string; padY: number };
  glow?: boolean;
  mono?: boolean;
  italicHighlight?: boolean;
  shrinkAt: number; // characters before auto-shrink kicks in
  /** Max block width (fraction of frame width): sets the measured characters-per-line of each look. */
  maxW?: number;
  /** TikTok's own text tool: cuts on and off with the shot, no entrance animation. */
  native?: boolean;
};

/** A solid outline from stacked text-shadows: an outer ring plus an inner one so thick strokes stay round. */
const outline = (px: number, color = "#000") => {
  const parts: string[] = [];
  for (const [r, steps] of [[px, px > 4 ? 24 : 16], [px * 0.55, 12]] as const) {
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      parts.push(`${(Math.cos(a) * r).toFixed(1)}px ${(Math.sin(a) * r).toFixed(1)}px 0 ${color}`);
    }
  }
  return parts.join(", ");
};

export function recipeFor(style: CaptionStyleId, width: number): Recipe {
  const k = width / 1080;
  // Values measured from viral app promos (research/design.json) at 1080 wide.
  switch (style) {
    case "tiktok-box":
      // TikTok "text background": one white box per line, boxes touching (pitch 1.74 em), radius ≈ 0.33 em,
      // black TikTok Sans 600. Measured on Hevy 483K (46 px text, 80 px box, 15 px radius at 1080 wide).
      return {
        font: "tiktok-sans", weight: 600, size: 0.046, lineHeight: 1.74, tracking: "-0.01em",
        box: { bg: "#FFFFFF", fg: "#000000", padY: 0.27, padX: 0.55, radius: 0.33 }, shrinkAt: 70, maxW: 0.8, native: true,
      };
    case "tiktok-box-dark":
      return {
        font: "tiktok-sans", weight: 600, size: 0.046, lineHeight: 1.74, tracking: "-0.01em",
        box: { bg: "#000000", fg: "#FFFFFF", padY: 0.27, padX: 0.55, radius: 0.33 }, shrinkAt: 70, maxW: 0.8, native: true,
      };
    case "serif-box":
      // Lense 1.2M: Cormorant Medium, black on per-line white boxes that touch (pitch ≈ 1.22 em, radius ≈ 0.17 em).
      return {
        font: "cormorant", weight: 500, size: 0.056, lineHeight: 1.3, tracking: "0em",
        box: { bg: "#FFFFFF", fg: "#111111", padY: 0.12, padX: 0.28, radius: 0.17 }, shrinkAt: 70, maxW: 0.8, native: true,
      };
    case "serif-white":
      // Opal 444K: Playfair Display, white, no box, tight 1.05 pitch; *highlighted* words go italic.
      return {
        font: "playfair", weight: 400, size: 0.052, lineHeight: 1.08, tracking: "-0.005em", color: "#FFFFFF",
        italicHighlight: true, shadow: `0 ${1 * k}px ${4 * k}px rgba(0,0,0,0.45), 0 0 ${18 * k}px rgba(0,0,0,0.2)`, shrinkAt: 60, maxW: 0.86, native: true,
      };
    case "tiktok-plain":
      // TikTok's default text on faceless screen demos (31 hits): TikTok Sans Medium ~64 px, white, soft
      // shadow, no stroke or box, ≤ 22 characters a line, 1.28 pitch.
      return {
        font: "tiktok-sans", weight: 500, size: 0.059, lineHeight: 1.28, tracking: "-0.01em",
        shadow: `0 ${2 * k}px ${6 * k}px rgba(0,0,0,0.35)`, shrinkAt: 66, maxW: 0.7, native: true,
      };
    case "tiktok-heavy":
      // Script-rendered carousels (Snugly 482K): Arial Bold, ~6 px black outline, 1.42 pitch.
      return {
        font: "arimo", weight: 700, size: 0.057, lineHeight: 1.42, tracking: "0em",
        shadow: outline(6 * k), shrinkAt: 60, maxW: 0.86, native: true,
      };
    case "hormozi":
      // Montserrat 900 caps, 10px black stroke, hard drop shadow; active word highlighted.
      return {
        font: "montserrat", weight: 900, size: 0.09, upper: true, lineHeight: 1.06, tracking: "-0.01em",
        shadow: `${outline(10 * k)}, 0 ${4 * k}px 0 rgba(0,0,0,0.6)`, shrinkAt: 20,
      };
    case "outline":
      // MrBeast-style: comic display caps, 9px stroke, 6px hard shadow.
      return {
        font: "luckiest-guy", weight: 400, size: 0.085, upper: true, lineHeight: 1.08, tracking: "0.01em",
        shadow: `${outline(9 * k)}, 0 ${6 * k}px 0 rgba(0,0,0,0.85)`, shrinkAt: 22,
      };
    case "minimal":
      // Apple-style statement: Inter Display 600, tight, off-white.
      return {
        font: "inter", weight: 600, size: 0.075, lineHeight: 1.12, tracking: "-0.03em", color: "#F5F5F7",
        shadow: `0 ${2 * k}px ${14 * k}px rgba(0,0,0,0.3)`, shrinkAt: 34,
      };
    case "neon":
      return {
        font: "geist", weight: 400, size: 0.064, upper: true, lineHeight: 1.12, tracking: "0.06em", glow: true, shrinkAt: 30,
      };
    case "typewriter":
      return {
        font: "jetbrains-mono", weight: 700, size: 0.05, lineHeight: 1.35, tracking: "-0.01em", mono: true,
        shadow: `0 ${1 * k}px ${3 * k}px rgba(0,0,0,0.4)`, shrinkAt: 60,
      };
    case "serif":
      return {
        font: "instrument-serif", weight: 400, size: 0.1, lineHeight: 1.02, tracking: "-0.015em",
        italicHighlight: true, shadow: `0 ${2 * k}px ${18 * k}px rgba(0,0,0,0.35)`, shrinkAt: 30,
      };
    case "headline":
      // Persistent headline box (measured #E70003, heavy caps, radius 19 at 1080).
      return {
        font: "archivo-black", weight: 400, size: 0.06, upper: true, lineHeight: 1.3, tracking: "-0.005em",
        box: { bg: "#E70003", fg: "#FFFFFF", padY: 0.2, padX: 0.45, radius: 0.3 }, shrinkAt: 40,
      };
    case "snapchat":
      // Snapchat caption bar: edge-to-edge rgba(0,0,0,.6) band, white ~3.7% W text, one or two lines.
      return {
        font: "inter", weight: 500, size: 0.037, lineHeight: 1.3, tracking: "-0.005em", color: "#FFFFFF",
        bar: { bg: "rgba(0,0,0,0.6)", padY: 0.42 }, shrinkAt: 90, native: true,
      };
    case "tiktok-classic":
    default:
      // TikTok's "Classic" text with the outline option, measured on 27 carousels and 64 UGC videos:
      // white TikTok Sans semibold, a crisp 3 px black outline, no blur, ~1.23 line pitch; hooks
      // 60–72 px, ≤ ~26 characters a line.
      return {
        font: "tiktok-sans", weight: 600, size: 0.06, lineHeight: 1.23, tracking: "-0.01em",
        shadow: outline(3 * k), shrinkAt: 44, maxW: 0.78, native: true,
      };
  }
}

export function autoSize(base: number, text: string, shrinkAt: number) {
  const chars = plainText(text).length;
  if (chars <= shrinkAt) return base;
  return base * Math.max(0.55, Math.sqrt(shrinkAt / chars));
}

/** Rough rendered height of a StyledText block, for layouts that have to keep clear of it. */
export function estimateTextHeight(text: string, style: TextStyle | undefined, fallback: CaptionStyleId, width: number, maxWidth: number) {
  const r = recipeFor(style?.style ?? fallback, width);
  const px = (style?.size ?? autoSize(r.size, text, r.shrinkAt)) * width;
  const perLine = Math.max(8, Math.floor((width * maxWidth) / (px * 0.55)));
  const lines = text.split(/\\n|\n/).reduce((n, l) => n + Math.max(1, Math.ceil(plainText(l).length / perLine)), 0);
  return lines * r.lineHeight * px + (r.box ? 2 * r.box.padY * px : 0);
}

type StyledTextProps = {
  text: string;
  style?: TextStyle;
  /** Frames to wait before animating in. */
  delay?: number;
  /** Max width as a fraction of frame width. */
  maxWidth?: number;
  /** Fallback caption style when neither text nor theme sets one. */
  fallbackStyle?: CaptionStyleId;
  /** Index of the word that is "active" (karaoke captions). -1 = none. */
  activeWord?: number;
  /** Override the computed size (fraction of width). */
  size?: number;
  colorOverride?: string;
};

export const StyledText: React.FC<StyledTextProps> = ({
  text,
  style,
  delay = 0,
  maxWidth = 0.84,
  fallbackStyle,
  activeWord = -1,
  size,
  colorOverride,
}) => {
  const frame = useCurrentFrame() - delay;
  const { fps, width } = useVideoConfig();
  const { theme } = useRender();
  const styleId = style?.style ?? fallbackStyle ?? theme.captionStyle;
  const r = recipeFor(styleId, width);
  const fontId: FontId = style?.font ?? r.font;
  const family = fontFamily(fontId);
  const single = SINGLE_WEIGHT[fontId];
  const px = (size ?? style?.size ?? autoSize(r.size, text, r.shrinkAt)) * width;
  const color = colorOverride ?? style?.color ?? r.box?.fg ?? r.color ?? "#FFFFFF";
  const hiColor = style?.highlight ?? theme.accent;
  const sceneInfo = useSceneInfo();
  // The first frame of the video is its thumbnail and the moment the scroll stops: hook text is
  // already on screen there (it settles with a small punch instead of fading in).
  const coldOpen = sceneInfo?.index === 0 && delay === 0 && !r.native;
  const requested = style?.animation ?? (r.native ? "none" : "pop");
  const anim = coldOpen && requested !== "words" && requested !== "typewriter" ? "settle" : requested;
  const align = style?.align ?? "center";
  const lines = parseRich(text);

  // Whole-block entrance.
  let blockScale = 1;
  let blockY = 0;
  let blockOpacity = 1;
  let blockRotate = 0;
  if (anim === "settle") {
    const s = spring({ frame, fps, config: { damping: 14, stiffness: 240, mass: 0.5 } });
    blockScale = interpolate(s, [0, 1], [1.07, 1]);
  } else if (anim === "pop") {
    // CapCut-style pop: ~5 frames to settle with a few percent overshoot, visible within 2 frames.
    const s = spring({ frame, fps, config: styleId === "outline" ? { damping: 9, stiffness: 220, mass: 0.6 } : { damping: 13, stiffness: 300, mass: 0.5 } });
    blockScale = interpolate(s, [0, 1], [styleId === "outline" ? 0 : 0.84, 1]);
    blockY = interpolate(s, [0, 1], [0.12 * px, 0]);
    blockOpacity = interpolate(frame, [0, 2], [0, 1], clamp);
    if (styleId === "outline") blockRotate = interpolate(s, [0, 1], [-3, 0]);
  } else if (anim === "slide-up") {
    const s = spring({ frame, fps, config: { damping: 200, stiffness: 140 } });
    blockY = interpolate(s, [0, 1], [px * 0.9, 0]);
    blockOpacity = interpolate(frame, [0, 6], [0, 1], clamp);
  } else if (anim === "fade") {
    blockOpacity = interpolate(frame, [0, 10], [0, 1], clamp);
    blockY = interpolate(frame, [0, 15], [24 * (width / 1080), 0], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });
  } else if (anim === "slam") {
    const s = spring({ frame, fps, config: { damping: 11, stiffness: 260, mass: 0.6 } });
    blockScale = interpolate(s, [0, 1], [2.1, 1]);
    blockOpacity = interpolate(frame, [0, 3], [0, 1], clamp);
    blockRotate = interpolate(s, [0, 1], [-4, 0]);
  } else if (frame < 0) {
    blockOpacity = 0;
  }

  // Typewriter: reveal characters.
  const totalChars = plainText(text).length;
  const typed = anim === "typewriter" ? Math.floor(interpolate(frame, [0, Math.max(8, totalChars * 2)], [0, totalChars], clamp)) : Infinity;

  let wordIndex = 0;
  let charIndex = 0;
  const wordGap = anim === "words" ? 3.2 : 0;

  const glow = r.glow
    ? `0 0 ${0.08 * px}px ${hiColor}, 0 0 ${0.25 * px}px ${hiColor}, 0 0 ${0.6 * px}px ${hiColor}`
    : undefined;

  return (
    <div
      style={{
        width: r.bar ? width : width * Math.min(maxWidth, r.maxW ?? 1),
        ...(r.bar ? { background: r.bar.bg, padding: `${r.bar.padY * px}px ${0.06 * width}px`, boxSizing: "border-box" as const } : {}),
        textAlign: align,
        fontFamily: family,
        fontWeight: single ? 400 : r.weight,
        fontSize: px,
        lineHeight: r.lineHeight,
        letterSpacing: r.tracking,
        textTransform: r.upper ? "uppercase" : "none",
        color,
        textShadow: r.box ? undefined : glow ?? r.shadow,
        opacity: blockOpacity,
        transform: `translateY(${blockY}px) scale(${blockScale}) rotate(${blockRotate}deg)`,
        transformOrigin: "50% 60%",
        wordBreak: "break-word",
        fontKerning: "normal",
      }}
    >
      {(() => {
        // A left-aligned boxed list (a ✅ checklist) reads as one block: every line as wide as the
        // longest, so the screen underneath doesn't peek out between ragged line boxes.
        const card = !!r.box && align === "left";
        const body = lines.map((tokens, li) => (
        <div key={li} style={{ display: "block", textWrap: card ? undefined : "balance" }}>
          <span
            style={
              r.box && !card
                ? {
                    background: r.box.bg,
                    padding: `${r.box.padY * px}px ${r.box.padX * px}px`,
                    borderRadius: r.box.radius * px,
                    WebkitBoxDecorationBreak: "clone",
                    boxDecorationBreak: "clone",
                  }
                : undefined
            }
          >
            {tokens.map((t, ti) => {
              const spaced = ti < tokens.length - 1 && !tokens[ti + 1].glue;
              // Glued punctuation shares its word's index, so it appears and highlights with it.
              const wi = t.glue ? wordIndex - 1 : wordIndex++;
              const startChar = charIndex;
              charIndex += t.word.length + (spaced ? 1 : 0);
              let opacity = 1;
              let scale = 1;
              if (anim === "words") {
                const s = spring({ frame: frame - wi * wordGap, fps, config: SNAPPY });
                opacity = interpolate(frame - wi * wordGap, [0, 3], [0, 1], clamp);
                scale = interpolate(s, [0, 1], [0.6, 1]);
              }
              let shown = t.word;
              if (typed !== Infinity) {
                const visible = typed - startChar;
                if (visible <= 0) shown = "";
                else if (visible < t.word.length) shown = t.word.slice(0, visible);
              }
              const isActive = wi === activeWord;
              const hi = t.hi || isActive;
              // Serif styles mark emphasis with italics only (Opal / Astra), not colour.
              const wordColor = hi ? (r.box ? r.box.fg : r.italicHighlight && !style?.highlight ? undefined : hiColor) : undefined;
              return (
                <React.Fragment key={ti}>
                  <span
                    style={{
                      display: "inline-block",
                      whiteSpace: "pre",
                      opacity,
                      transform: `scale(${isActive ? 1.08 : scale})`,
                      color: wordColor,
                      fontStyle: hi && r.italicHighlight ? "italic" : undefined,
                      background: hi && r.box ? hiColor : undefined,
                      borderRadius: hi && r.box ? 0.14 * px : undefined,
                      padding: hi && r.box ? `0 ${0.08 * px}px` : undefined,
                      margin: hi && r.box ? `0 ${-0.02 * px}px` : undefined,
                    }}
                  >
                    {shown}
                  </span>
                  {spaced ? " " : ""}
                </React.Fragment>
              );
            })}
            {anim === "typewriter" && li === lines.length - 1 && (
              <span
                style={{
                  display: "inline-block",
                  width: 0.5 * px,
                  height: 0.9 * px,
                  marginLeft: 0.06 * px,
                  verticalAlign: "-0.1em",
                  background: hiColor,
                  opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
                }}
              />
            )}
          </span>
        </div>
        ));
        if (!card || !r.box) return body;
        return (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                textAlign: "left",
                background: r.box.bg,
                padding: `${r.box.padY * px * 1.6}px ${r.box.padX * px}px`,
                borderRadius: r.box.radius * px * 1.3,
                lineHeight: 1.36,
                maxWidth: "100%",
              }}
            >
              {body}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

/** Positions a StyledText inside the platform safe area according to its `position`. */
export const TextBlock: React.FC<StyledTextProps & { position?: TextStyle["position"] }> = ({ position, ...props }) => {
  const safe = useSafeArea();
  const { theme } = useRender();
  const pos = position ?? props.style?.position ?? "center";
  // The Snapchat bar runs edge to edge, so it ignores the side safe margins.
  const bar = (props.style?.style ?? props.fallbackStyle ?? theme.captionStyle) === "snapchat";
  const y = props.style?.y ?? positionY(pos, safe.height, safe);
  const align = props.style?.align ?? "center";
  const usable = (safe.width - safe.left - safe.right) / safe.width;
  return (
    <div
      style={{
        position: "absolute",
        left: bar ? 0 : safe.left,
        right: bar ? 0 : safe.right,
        top: y * safe.height,
        transform: "translateY(-50%)",
        display: "flex",
        justifyContent: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
      }}
    >
      <StyledText {...props} maxWidth={Math.min(props.maxWidth ?? 0.84, usable)} />
    </div>
  );
};
