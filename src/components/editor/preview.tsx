"use client";
import { Player, type PlayerRef } from "@remotion/player";
import { Pause, Play, ScanLine, SkipBack, Volume2, VolumeX } from "lucide-react";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FeedOverlay, type FeedSkin } from "@/components/reel";
import { IconButton, Tip } from "@/components/ui/button";
import { Segmented } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { ShipreelVideo } from "@/remotion/ShipreelVideo";
import { DIMENSIONS, FPS, type VideoSpec } from "@/remotion/spec";
import { formatTimecode, totalDurationFrames } from "@/remotion/timeline";
import { player, seek, useEditor } from "./store";

function usePref<T extends string | boolean>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`shipreel.${key}`);
      if (raw != null) setV(JSON.parse(raw) as T);
    } catch {
      /* private mode */
    }
  }, [key]);
  const set = useCallback(
    (nv: T) => {
      setV(nv);
      try {
        localStorage.setItem(`shipreel.${key}`, JSON.stringify(nv));
      } catch {
        /* ignore */
      }
    },
    [key],
  );
  return [v, set];
}

/** Dims what the platform UI covers (TikTok's measured template on 9:16; a 7% margin elsewhere). */
function SafeZone({ aspect }: { aspect: VideoSpec["aspect"] }) {
  const { width: W, height: H } = DIMENSIONS[aspect];
  const vertical = aspect === "9:16";
  const safe = vertical ? { t: 240, b: 660, l: 120, r: 120 } : { t: W * 0.07, b: W * 0.07, l: W * 0.07, r: W * 0.07 };
  const rail = vertical ? { x: 780, y: 840, h: 420 } : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 size-full" aria-hidden>
      <defs>
        <pattern id="sz-hatch" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="28" height="28" fill="rgba(0,0,0,0.42)" />
          <line x1="0" y1="0" x2="0" y2="28" stroke="rgba(255,90,90,0.28)" strokeWidth="6" />
        </pattern>
        <mask id="sz-mask">
          <rect width={W} height={H} fill="white" />
          <rect x={safe.l} y={safe.t} width={W - safe.l - safe.r} height={H - safe.t - safe.b} rx="18" fill="black" />
          {rail && <rect x={rail.x} y={rail.y} width={W - rail.x} height={rail.h} fill="white" />}
        </mask>
      </defs>
      <rect width={W} height={H} fill="url(#sz-hatch)" mask="url(#sz-mask)" />
      <rect x={safe.l} y={safe.t} width={W - safe.l - safe.r} height={H - safe.t - safe.b} rx="18" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="3" strokeDasharray="14 10" />
      {vertical && (
        <text x={W / 2} y={H - safe.b / 2} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="34" fontFamily="system-ui" fontWeight="600">
          caption + username cover this
        </text>
      )}
    </svg>
  );
}

export function Preview({ spec, projectId, username }: { spec: VideoSpec; projectId: string; username: string }) {
  const ref = useRef<PlayerRef>(null);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [skin, setSkin] = usePref<FeedSkin>("skin", "none");
  const [safe, setSafe] = usePref<boolean>("safezone", false);
  const [muted, setMuted] = usePref<boolean>("muted", false);
  const playing = useEditor((s) => s.playing);
  const frame = useEditor((s) => s.frame);
  const setPlaying = useEditor((s) => s.setPlaying);
  const { width, height } = DIMENSIONS[spec.aspect];
  const total = totalDurationFrames(spec);

  // Fit the frame to the space we have (both axes), like a real viewer.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const k = Math.min(r.width / width, r.height / height);
      setSize({ w: Math.floor(width * k), h: Math.floor(height * k) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);

  useEffect(() => {
    const p = ref.current;
    player.current = p;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => useEditor.setState({ frame: e.detail.frame });
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    p.addEventListener("ended", onPause);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
      p.removeEventListener("ended", onPause);
    };
  }, [setPlaying, size.w > 0]);

  useEffect(() => {
    if (muted) ref.current?.mute();
    else ref.current?.unmute();
  }, [muted, size.w > 0]);

  // Keep the playhead inside the video when scenes get shorter.
  useEffect(() => {
    if (frame > total - 1) seek(total - 1);
  }, [total, frame]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={box} className="relative flex min-h-0 flex-1 items-center justify-center">
        {size.w > 0 && (
          <div className="relative overflow-hidden rounded-[14px] bg-black shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/10" style={{ width: size.w, height: size.h, containerType: "inline-size" }}>
            <Player
              ref={ref}
              component={ShipreelVideo}
              inputProps={{ spec, assetBase: `/api/media/${projectId}`, publicBase: "" }}
              durationInFrames={total}
              compositionWidth={width}
              compositionHeight={height}
              fps={FPS}
              style={{ width: "100%", height: "100%" }}
              loop
              clickToPlay
              doubleClickToFullscreen
              spaceKeyToPlayOrPause={false}
              acknowledgeRemotionLicense
              numberOfSharedAudioTags={12}
              initialFrame={Math.min(frame, total - 1)}
              errorFallback={({ error }) => <div className="flex h-full items-center justify-center p-6 text-center text-sm text-bad">{error.message}</div>}
            />
            {safe && <SafeZone aspect={spec.aspect} />}
            {skin !== "none" && <FeedOverlay skin={skin} caption={spec.meta.caption || spec.meta.hook || spec.title} username={username} sound={spec.meta.soundTip ? "trending sound" : "original sound"} />}
          </div>
        )}
      </div>

      <div className="flex h-12 shrink-0 items-center gap-2 px-4">
        <div className="flex flex-1 items-center gap-1">
          <IconButton label="Back to start" size="sm" onClick={() => seek(0)}>
            <SkipBack className="size-4" />
          </IconButton>
          <Tip label={playing ? "Pause" : "Play"} shortcut="Space">
            <button
              onClick={() => ref.current?.toggle()}
              className="flex size-9 items-center justify-center rounded-full bg-fg text-bg transition-transform active:scale-95"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
            </button>
          </Tip>
          <span className="ml-2 shrink-0 font-mono text-xs whitespace-nowrap text-fg-2 tabular-nums">
            {formatTimecode(frame)} <span className="text-fg-3">/ {formatTimecode(total)}</span>
          </span>
        </div>
        <Segmented
          layoutId="preview-skin"
          size="sm"
          value={skin}
          onChange={setSkin}
          options={[
            { value: "none", label: "Clean" },
            { value: "tiktok", label: "TikTok" },
            { value: "reels", label: "Reels" },
            { value: "shorts", label: "Shorts" },
          ]}
        />
        <div className="flex flex-1 items-center justify-end gap-1">
          <IconButton label={safe ? "Hide safe zone" : "Show safe zone"} size="sm" onClick={() => setSafe(!safe)} className={cn(safe && "bg-hover text-fg")}>
            <ScanLine className="size-4" />
          </IconButton>
          <IconButton label={muted ? "Unmute" : "Mute"} size="sm" onClick={() => setMuted(!muted)}>
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </IconButton>
        </div>
      </div>
    </div>
  );
}
