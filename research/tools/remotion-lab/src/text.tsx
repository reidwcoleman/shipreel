import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadVariableFont as loadInterVariable } from "@remotion/google-fonts/Inter";
import { loadVariableFont as loadTikTokVariable } from "@remotion/google-fonts/TikTokSans";
import { fitText, fitTextOnNLines } from "@remotion/layout-utils";
import React, { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useDelayRender, useVideoConfig } from "remotion";

/* ------------------------------------------------------------------------------------------ */
/* Font loading: module top level, explicit weights/subsets (v5 makes them mandatory)          */
/* ------------------------------------------------------------------------------------------ */

// ONE request per subset for every weight 100-900 *and* the optical-size axis: big text gets the
// Display cut automatically (font-optical-sizing: auto), which is what "Inter Display" looks like.
const inter = loadInterVariable("normal", { subsets: ["latin"] });
const tiktok = loadTikTokVariable("normal", { subsets: ["latin"] });
// Static font: one request per weight x subset. Load only what the recipe uses.
const montserrat = loadMontserrat("normal", { weights: ["800", "900"], subsets: ["latin"] });

export const FONTS = { inter: inter.fontFamily, tiktok: tiktok.fontFamily, montserrat: montserrat.fontFamily };

const allFonts = () => Promise.all([inter.waitUntilDone(), tiktok.waitUntilDone(), montserrat.waitUntilDone()]);

/**
 * Blocks the frame until fonts are in, and returns false until then so measurement code
 * (measureText / fitText / fitTextOnNLines) never runs against the fallback font. That matters
 * twice over: layout-utils caches every measurement in a module-level Map with no font-load
 * invalidation, so a fallback-font measurement taken once stays wrong for the whole session.
 */
export function useFontsReady(): boolean {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("Fonts for text layout"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    allFonts().then(() => setReady(true), (e) => cancelRender(e));
  }, [cancelRender]);
  // Release the frame only after React has committed the measured layout.
  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, continueRender, handle]);
  return ready;
}

/** Hook text that always fills N lines of the safe width, measured with the real font. */
export const FitHeadline: React.FC<{ text: string; maxLines?: number; maxWidth: number; maxFontSize?: number }> = ({
  text,
  maxLines = 3,
  maxWidth,
  maxFontSize = 150,
}) => {
  const ready = useFontsReady();
  const fit = useMemo(
    () =>
      ready
        ? fitTextOnNLines({
            text,
            maxLines,
            maxBoxWidth: maxWidth,
            fontFamily: FONTS.tiktok,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            maxFontSize,
            validateFontIsLoaded: true,
          })
        : null,
    [ready, text, maxLines, maxWidth, maxFontSize],
  );
  if (!fit) return null;
  return (
    <div style={{ width: maxWidth, fontFamily: FONTS.tiktok, fontWeight: 800, fontSize: fit.fontSize, letterSpacing: "-0.02em", lineHeight: 1.05, color: "white", textAlign: "center" }}>
      {fit.lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
};

/** Single-line fit (e.g. a stat or app name), capped. */
export const FitOneLine: React.FC<{ text: string; width: number; cap: number }> = ({ text, width, cap }) => {
  const ready = useFontsReady();
  const size = useMemo(
    () => (ready ? Math.min(cap, fitText({ text, withinWidth: width, fontFamily: FONTS.inter, fontWeight: 700, letterSpacing: "-0.03em", validateFontIsLoaded: true }).fontSize) : cap),
    [ready, text, width, cap],
  );
  return <div style={{ fontFamily: FONTS.inter, fontWeight: 700, letterSpacing: "-0.03em", fontSize: size, whiteSpace: "nowrap", color: "white" }}>{text}</div>;
};

/* ------------------------------------------------------------------------------------------ */
/* Crispness experiments (rendered by bench.mjs and measured on the PNG output)                */
/* ------------------------------------------------------------------------------------------ */

export type ScaleMode = "native" | "scaleUp2x" | "scaleDown2x" | "scaleUp2xWillChange" | "popIn" | "popInWillChange" | "popInWillChangeReset";

/** Same final glyph size (120px) produced different ways. */
export const TextScaleProbe: React.FC<{ mode: ScaleMode }> = ({ mode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14, stiffness: 180, mass: 0.6 } });
  let fontSize = 120;
  let transform: string | undefined;
  let willChange: string | undefined;
  switch (mode) {
    case "scaleUp2x":
      fontSize = 60;
      transform = "scale(2)";
      break;
    case "scaleDown2x":
      fontSize = 240;
      transform = "scale(0.5)";
      break;
    case "scaleUp2xWillChange":
      fontSize = 60;
      transform = "scale(2)";
      willChange = "transform";
      break;
    case "popIn":
      transform = `scale(${interpolate(pop, [0, 1], [0.6, 1])})`;
      break;
    case "popInWillChange":
      transform = `scale(${interpolate(pop, [0, 1], [0.6, 1])})`;
      willChange = "transform";
      break;
    case "popInWillChangeReset":
      // will-change only while animating: once settled, the layer is dropped and text re-rasters.
      transform = `scale(${interpolate(pop, [0, 1], [0.6, 1])})`;
      willChange = pop < 0.999 ? "transform" : undefined;
      break;
  }
  return (
    <AbsoluteFill style={{ background: "#2b2d42", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: FONTS.inter, fontWeight: 650, fontSize, color: "#fff", letterSpacing: "-0.02em", transform, willChange, transformOrigin: "50% 50%", whiteSpace: "nowrap" }}>
        Crisp text 123
      </div>
    </AbsoluteFill>
  );
};

/** Slow 0.25 px/frame drift: does the text move in 1 px jumps (snapping) or smoothly? */
export const SubpixelProbe: React.FC<{ mode: "plain" | "translate3d" | "perspectiveWillChange" }> = ({ mode }) => {
  const frame = useCurrentFrame();
  const y = frame * 0.25;
  const style: React.CSSProperties =
    mode === "plain"
      ? { marginTop: y }
      : mode === "translate3d"
        ? { transform: `translate3d(0, ${y}px, 0)` }
        : { transform: `perspective(100px) translateY(${y}px)`, willChange: "transform" };
  return (
    <AbsoluteFill style={{ background: "#000", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...style, fontFamily: FONTS.inter, fontWeight: 700, fontSize: 90, color: "#fff" }}>Smooth</div>
    </AbsoluteFill>
  );
};

/** Demo card used in the md: fitted hook + fitted stat. */
export const FontsDemo: React.FC = () => {
  const { width } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#111", alignItems: "center", justifyContent: "center", gap: 60, flexDirection: "column" }}>
      <FitHeadline text="Stop scrolling: this app plans your week in 10 seconds" maxWidth={width * 0.78} maxLines={3} />
      <FitOneLine text="$12,480 MRR" width={width * 0.7} cap={220} />
    </AbsoluteFill>
  );
};
