"use client";
import { Player, Thumbnail, type PlayerRef } from "@remotion/player";
import { Bookmark, Heart, MessageCircle, Music2, Plus, Share2 } from "lucide-react";
import React, { forwardRef, useMemo, useState } from "react";
import { useBootstrap } from "@/lib/client/store";
import { cn } from "@/lib/cn";
import { ShipreelVideo } from "@/remotion/ShipreelVideo";
import { DIMENSIONS, FPS, safeNormalizeSpec, type CompositionProps, type VideoSpec, type VideoSpecInput } from "@/remotion/spec";
import { totalDurationFrames } from "@/remotion/timeline";

export type FeedSkin = "none" | "tiktok" | "reels" | "shorts";

export function useNormalized(spec: VideoSpecInput | VideoSpec | null | undefined): VideoSpec | null {
  return useMemo(() => {
    if (!spec) return null;
    const r = safeNormalizeSpec(spec);
    return r.ok ? r.spec : null;
  }, [spec]);
}

function propsFor(spec: VideoSpec, projectId?: string | null): CompositionProps {
  return { spec, assetBase: projectId ? `/api/media/${projectId}` : "/api/media/_", publicBase: "" };
}

type ReelProps = {
  spec: VideoSpecInput | VideoSpec | null | undefined;
  projectId?: string | null;
  /** thumb = still frame; hover = still until hovered, then plays muted; play = autoplay muted loop; controls = full player */
  mode?: "thumb" | "hover" | "play" | "controls";
  frame?: number;
  skin?: FeedSkin;
  className?: string;
  rounded?: boolean;
  onClick?: () => void;
  username?: string;
  /** Show non-vertical specs letterboxed in a 9:16 frame, like TikTok shows photo carousels (keeps grids even). */
  letterbox?: boolean;
};

/** The hero object: a 9:16 (or other aspect) reel, live-rendered from its spec. */
export const Reel = forwardRef<PlayerRef, ReelProps>(function ReelView(
  { spec: raw, projectId, mode = "hover", frame, skin = "none", className, rounded = true, onClick, username, letterbox },
  ref,
) {
  const spec = useNormalized(raw);
  const [hover, setHover] = useState(false);
  // Feed skins show the product's handle unless told otherwise.
  const { data: boot } = useBootstrap();
  const handle = username ?? (boot?.projects.find((p) => p.id === projectId)?.name ?? "yourapp").toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!spec) {
    return <div className={cn("skeleton aspect-[9/16]", rounded && "rounded-reel", className)} />;
  }
  if (letterbox && spec.aspect !== "9:16") {
    return (
      <div
        className={cn("relative flex aspect-[9/16] items-center overflow-hidden bg-black", rounded && "rounded-reel", onClick && "cursor-pointer", className)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={onClick}
      >
        <Reel ref={ref} spec={spec} projectId={projectId} mode={mode === "hover" ? (hover ? "play" : "thumb") : mode} frame={frame} rounded={false} username={username} className="w-full" />
        <span className="pointer-events-none absolute top-2 right-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur">Photos</span>
      </div>
    );
  }
  const { width, height } = DIMENSIONS[spec.aspect];
  const duration = totalDurationFrames(spec);
  const inputProps = propsFor(spec, projectId);
  const stillFrame = Math.min(duration - 1, frame ?? Math.round(Math.min(1.3, duration / FPS / 2) * FPS));
  const playing = mode === "play" || mode === "controls" || (mode === "hover" && hover);
  return (
    <div
      className={cn("group/reel relative overflow-hidden bg-black", rounded && "rounded-reel", onClick && "cursor-pointer", className)}
      style={{ aspectRatio: `${width} / ${height}`, containerType: "inline-size" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      {playing ? (
        <Player
          ref={ref}
          component={ShipreelVideo}
          inputProps={inputProps}
          durationInFrames={duration}
          compositionWidth={width}
          compositionHeight={height}
          fps={FPS}
          style={{ width: "100%", height: "100%" }}
          autoPlay={mode !== "controls" || true}
          loop
          initiallyMuted={mode !== "controls"}
          controls={mode === "controls"}
          clickToPlay={mode === "controls"}
          acknowledgeRemotionLicense
          numberOfSharedAudioTags={12}
          errorFallback={({ error }) => <div className="flex h-full items-center justify-center p-4 text-center text-xs text-bad">{error.message}</div>}
        />
      ) : (
        <Thumbnail
          component={ShipreelVideo}
          inputProps={inputProps}
          durationInFrames={duration}
          compositionWidth={width}
          compositionHeight={height}
          fps={FPS}
          frameToDisplay={stillFrame}
          style={{ width: "100%", height: "100%" }}
        />
      )}
      {skin !== "none" && <FeedOverlay skin={skin} caption={spec.meta.caption || spec.meta.hook || spec.title} username={handle} sound={spec.meta.soundTip ? "trending sound" : "original sound"} />}
    </div>
  );
});

/** Platform chrome drawn over the reel, to judge it like it'll be seen (and check the safe zone). */
export function FeedOverlay({ skin, caption, username, sound }: { skin: Exclude<FeedSkin, "none">; caption: string; username: string; sound: string }) {
  const stat = (icon: React.ReactNode, label?: string) => (
    <div className="flex flex-col items-center gap-[0.3em]">
      <div className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">{icon}</div>
      {label && <span className="text-[0.62em] font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{label}</span>}
    </div>
  );
  return (
    <div className="pointer-events-none absolute inset-0 text-white select-none" style={{ fontSize: "3.7cqw" }}>
      {skin === "tiktok" && (
        <div className="absolute inset-x-0 top-[3.5%] flex justify-center gap-[1.2em] text-[0.82em] font-semibold drop-shadow">
          <span className="opacity-70">Following</span>
          <span className="relative">
            For You
            <span className="absolute -bottom-[0.35em] left-1/2 h-[0.15em] w-[1.6em] -translate-x-1/2 rounded bg-white" />
          </span>
        </div>
      )}
      {skin === "shorts" && <div className="absolute top-[3%] left-[4%] text-[0.9em] font-bold drop-shadow">Shorts</div>}
      {skin === "reels" && <div className="absolute top-[3%] left-[4%] text-[1em] font-bold drop-shadow">Reels</div>}
      <div className="absolute right-[3%] bottom-[16%] flex flex-col items-center gap-[1.1em]" style={{ fontSize: "1.25em" }}>
        {skin === "tiktok" && (
          <div className="relative mb-[0.3em]">
            <div className="size-[2.1em] rounded-full border-2 border-white bg-gradient-to-br from-zinc-500 to-zinc-700" />
            <div className="absolute -bottom-[0.45em] left-1/2 flex size-[1em] -translate-x-1/2 items-center justify-center rounded-full bg-[#FE2C55]">
              <Plus className="size-[0.7em]" strokeWidth={3} />
            </div>
          </div>
        )}
        {stat(<Heart className="size-[1.5em] fill-white" strokeWidth={0} />, "48.2K")}
        {stat(<MessageCircle className="size-[1.45em] fill-white" strokeWidth={0} />, "1,204")}
        {stat(<Bookmark className="size-[1.4em] fill-white" strokeWidth={0} />, "9,810")}
        {stat(<Share2 className="size-[1.35em]" strokeWidth={2.4} />, "3,117")}
      </div>
      <div className="absolute bottom-[4.5%] left-[4%] flex w-[70%] flex-col gap-[0.35em] drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
        <span className="text-[0.95em] font-bold">@{username}</span>
        <span className="line-clamp-2 text-[0.82em] leading-snug">{caption}</span>
        <span className="flex items-center gap-[0.35em] text-[0.75em]">
          <Music2 className="size-[1em]" /> {sound} · {username}
        </span>
      </div>
    </div>
  );
}
