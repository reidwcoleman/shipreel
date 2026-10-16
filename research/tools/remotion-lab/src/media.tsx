import { Video } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, staticFile, useRemotionEnvironment } from "remotion";

/**
 * Video for Shipreel scenes.
 *  - Renders: <Video> from @remotion/media (WebCodecs/Mediabunny, frame-exact, fastest; partial
 *    range downloads; falls back to <OffthreadVideo> by itself for codecs it can't decode).
 *    Needs CORS + Range on the asset URL (Shipreel's /api/media route already sends both).
 *  - Player: the same component previews with WebCodecs. If a browser lacks WebCodecs (old
 *    Safari), use the <OffthreadVideo> branch, which previews with a plain <video> tag.
 * Note: CSS object-fit is NOT supported on @remotion/media <Video>; use the objectFit prop.
 */
export const SmartVideo: React.FC<{ src: string; fit?: "cover" | "contain"; volume?: number; trimBefore?: number; playbackRate?: number }> = ({
  src,
  fit = "cover",
  volume = 0,
  trimBefore = 0,
  playbackRate = 1,
}) => {
  const env = useRemotionEnvironment();
  const hasWebCodecs = typeof window !== "undefined" && "VideoDecoder" in window;
  if (!env.isRendering && !hasWebCodecs) {
    return <OffthreadVideo src={src} muted={volume <= 0} volume={volume} trimBefore={trimBefore} playbackRate={playbackRate} style={{ width: "100%", height: "100%", objectFit: fit }} pauseWhenBuffering />;
  }
  return (
    <Video
      src={src}
      objectFit={fit}
      muted={volume <= 0}
      volume={volume}
      trimBefore={trimBefore}
      playbackRate={playbackRate}
      style={{ width: "100%", height: "100%" }}
    />
  );
};

/**
 * Screenshot downsampling probe: the 1179x2556 synthetic screenshot drawn into a `box`-px-wide
 * screen three ways. bench.mjs compares each against a Lanczos reference (PSNR).
 */
export const ImgProbe: React.FC<{ box: number; mode: "css" | "scaledLayer" | "preResized" }> = ({ box, mode }) => {
  const h = Math.round((box * 2556) / 1179);
  let content: React.ReactNode;
  if (mode === "css") {
    content = <Img src={staticFile("screenshot.png")} style={{ width: box, height: h, display: "block" }} />;
  } else if (mode === "scaledLayer") {
    // Full-size image in a scaled container: what a zoom/punch-in wrapper does.
    content = (
      <div style={{ width: 1179, height: 2556, transform: `scale(${box / 1179})`, transformOrigin: "0 0" }}>
        <Img src={staticFile("screenshot.png")} style={{ width: 1179, height: 2556, display: "block" }} />
      </div>
    );
  } else {
    content = <Img src={staticFile(`screenshot-${box}.png`)} style={{ width: box, height: h, display: "block" }} />;
  }
  return (
    <AbsoluteFill style={{ background: "#fff" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: box, height: h, overflow: "hidden" }}>{content}</div>
    </AbsoluteFill>
  );
};
