import React, { createContext, useContext } from "react";
import { staticFile, useVideoConfig } from "remotion";
import { Aspect, type Theme } from "../spec";

export type RenderCtx = {
  theme: Theme;
  aspect: Aspect;
  assetBase: string;
  publicBase: string;
};

const Ctx = createContext<RenderCtx | null>(null);

/** Which scene we're inside. Scene 0's first frame is the video's thumbnail, so nothing there may fade in. */
export type SceneInfo = { index: number; enterFrames: number };
const SceneCtx = createContext<SceneInfo | null>(null);
export const SceneProvider: React.FC<{ value: SceneInfo; children: React.ReactNode }> = ({ value, children }) => (
  <SceneCtx.Provider value={value}>{children}</SceneCtx.Provider>
);
export const useSceneInfo = () => useContext(SceneCtx);
/** True inside the first scene: its entrance must already be complete on frame 0 (the thumbnail). */
export const useColdOpen = () => useContext(SceneCtx)?.index === 0;

export const RenderProvider: React.FC<{ value: RenderCtx; children: React.ReactNode }> = ({ value, children }) => (
  <Ctx.Provider value={value}>{children}</Ctx.Provider>
);

export function useRender(): RenderCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRender outside RenderProvider");
  return v;
}

/** Resolve a spec media reference to a URL the browser (Player or renderer) can load. */
export function resolveSrc(src: string | undefined, ctx: Pick<RenderCtx, "assetBase" | "publicBase">): string | undefined {
  if (!src) return undefined;
  if (/^(https?:|data:|blob:)/.test(src)) return src;
  const pub = ctx.publicBase.replace(/\/$/, "");
  // Bundled files live in /public: staticFile() knows the right base in Studio, renderer and Player.
  const bundled = (path: string) => (pub ? `${pub}/${path}` : staticFile(path));
  if (src.startsWith("sfx:")) return bundled(`sfx/${src.slice(4)}.mp3`);
  if (src.startsWith("music:")) return bundled(`music/${src.slice(6)}.mp3`);
  if (src.startsWith("builtin:")) return bundled(`builtin/${src.slice(8)}`);
  const file = src.startsWith("asset:") ? src.slice(6) : src;
  return `${ctx.assetBase.replace(/\/$/, "")}/${file.split("/").map(encodeURIComponent).join("/")}`;
}

export function useResolve() {
  const ctx = useRender();
  return (src: string | undefined) => resolveSrc(src, ctx);
}

/**
 * Safe area (px) that platform UI leaves alone on a vertical video: TikTok's top tabs, the right
 * action rail and the caption/username block at the bottom.
 */
export function useSafeArea() {
  const { width, height } = useVideoConfig();
  const { aspect } = useRender();
  if (aspect === "9:16") {
    // TikTok's in-feed safe-zone template, measured at 1080×1920: 240 top, 660 bottom, 120 sides.
    // The like/comment rail (x ≥ 780, y 840–1260) is avoided by keeping text centred and ≤ 78% wide.
    const k = width / 1080;
    return { top: 240 * k, bottom: 660 * k, left: 120 * k, right: 120 * k, width, height };
  }
  const m = Math.round(width * 0.07);
  return { top: m, bottom: m, left: m, right: m, width, height };
}

/** Vertical anchor (0–1 of frame height) for each named text position, kept inside the safe area. */
export function positionY(pos: string | undefined, height: number, safe: { top: number; bottom: number }): number {
  const top = safe.top / height;
  const bottom = 1 - safe.bottom / height;
  const span = bottom - top;
  switch (pos) {
    case "top":
      return top + span * 0.08;
    case "upper":
      // Measured on viral app hooks (1.2M–140M views): the text block centres ~21% from the top.
      return top + span * 0.16;
    case "low":
      // Lists and checklists under the subject (y ≈ 0.62 of the frame in the family-niche hits).
      return top + span * 0.86;
    case "lower":
      return top + span * 0.78;
    case "bottom":
      return top + span * 0.95;
    case "center":
    default:
      return top + span * 0.5;
  }
}
