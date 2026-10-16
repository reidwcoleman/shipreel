"use client";
import { AudioLines, Captions, Layers, Mic, Minus, Plus, Shuffle } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { FPS, SCENE_LABELS, type Overlay, type Scene, type VideoSpec } from "@/remotion/spec";
import { layoutScenes } from "@/remotion/timeline";
import { seek, updateOverlay, updateScene, useEditor } from "./store";

const TRACK_LABEL_W = 92;

function sceneText(s: Scene): string {
  switch (s.type) {
    case "hook":
    case "slide":
    case "tweet":
    case "comment":
      return s.text.replace(/\*/g, "");
    case "chat":
      return s.messages[0]?.text ?? "";
    case "notes":
    case "list":
    case "reddit":
      return s.title;
    case "stat":
      return `${s.prefix}${s.to}${s.suffix} ${s.label}`;
    case "split":
      return `${s.top.label} / ${s.bottom.label}`;
    case "cta":
      return s.headline;
    case "kinetic":
      return s.words.join(" ");
    case "notifications":
      return s.items[0]?.body ?? "";
    case "terminal":
      return s.lines[0]?.text ?? "";
    case "appstore":
      return s.appName;
    case "media":
      return s.caption?.text ?? s.src.replace(/^asset:/, "");
  }
}

function overlayLabel(o: Overlay) {
  switch (o.type) {
    case "text":
      return o.text;
    case "sticker":
      return o.emoji;
    case "watermark":
      return o.text;
    case "progress":
      return "Progress bar";
    case "pip":
      return "Face cam";
  }
}

/** Pointer drag helper: calls onMove with the horizontal delta in px, merges edits into one undo step. */
function useDrag() {
  return (e: React.PointerEvent, onMove: (dx: number) => void, onEnd?: () => void) => {
    e.stopPropagation();
    e.preventDefault();
    const x0 = e.clientX;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => onMove(ev.clientX - x0);
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
      onEnd?.();
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };
}

export function Timeline({ spec }: { spec: VideoSpec }) {
  const edit = useEditor((s) => s.edit);
  const select = useEditor((s) => s.select);
  const selected = useEditor((s) => s.selected);
  const frame = useEditor((s) => s.frame);
  const scroller = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number | null>(null); // px per second; null = fit
  const [fitPx, setFitPx] = useState(60);
  const drag = useDrag();
  const { timed, totalFrames } = useMemo(() => layoutScenes(spec.scenes), [spec.scenes]);
  const totalSec = totalFrames / FPS;
  const pps = zoom ?? fitPx;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFitPx(Math.max(16, (el.clientWidth - TRACK_LABEL_W - 24) / Math.max(1, totalSec))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [totalSec]);

  // Keep the playhead in view while playing.
  useEffect(() => {
    const el = scroller.current;
    if (!el || zoom == null) return;
    const x = TRACK_LABEL_W + (frame / FPS) * pps;
    if (x < el.scrollLeft + TRACK_LABEL_W || x > el.scrollLeft + el.clientWidth - 40) el.scrollLeft = x - TRACK_LABEL_W - 40;
  }, [frame, pps, zoom]);

  // At "Fit" the content exactly fills the scroller (no feedback loop with its own width).
  const contentW = totalSec * pps + (zoom == null ? 16 : 160);
  const xOf = (f: number) => (f / FPS) * pps;
  const tickEvery = pps > 90 ? 0.5 : pps > 40 ? 1 : pps > 18 ? 2 : 5;

  const scrubFrom = (clientX: number) => {
    const el = scroller.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = clientX - r.left + el.scrollLeft - TRACK_LABEL_W;
    seek(Math.max(0, Math.min(totalFrames - 1, (x / pps) * FPS)));
  };

  const onScrub = (e: React.PointerEvent) => {
    scrubFrom(e.clientX);
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => scrubFrom(ev.clientX);
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
  };

  const overlays = spec.overlays;
  const hasAudio = !!spec.audio?.src || !!spec.audio?.soundId || !!spec.meta.soundTip;

  return (
    <div className="flex h-full flex-col border-t border-line bg-panel">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line px-3">
        <span className="text-[11px] font-semibold tracking-[0.08em] text-fg-3 uppercase">Timeline</span>
        <span className="font-mono text-[11px] text-fg-3 tabular-nums">
          {spec.scenes.length} scenes · {totalSec.toFixed(1)}s
        </span>
        <span className="text-[11px] text-fg-3">Drag a scene&apos;s right edge to change its length.</span>
        <div className="ml-auto flex items-center gap-0.5">
          <IconButton label="Zoom out" size="xs" onClick={() => setZoom(Math.max(16, pps / 1.4))}>
            <Minus className="size-3" />
          </IconButton>
          <button onClick={() => setZoom(null)} className={cn("h-6 rounded px-1.5 text-[11px]", zoom == null ? "text-fg" : "text-fg-3 hover:text-fg")}>
            Fit
          </button>
          <IconButton label="Zoom in" size="xs" onClick={() => setZoom(Math.min(400, pps * 1.4))}>
            <Plus className="size-3" />
          </IconButton>
        </div>
      </div>

      <div ref={scroller} className="relative min-h-0 flex-1 overflow-x-auto overflow-y-auto select-none">
        <div className="relative" style={{ width: contentW + TRACK_LABEL_W }}>
          {/* Ruler */}
          <div className="sticky top-0 z-20 flex h-6 border-b border-line bg-panel">
            <div className="sticky left-0 z-10 shrink-0 bg-panel" style={{ width: TRACK_LABEL_W }} />
            <div className="relative flex-1 cursor-ew-resize" onPointerDown={onScrub}>
              {Array.from({ length: Math.floor(totalSec / tickEvery) + 2 }).map((_, i) => {
                const t = i * tickEvery;
                return (
                  <div key={i} className="absolute top-0 h-full border-l border-line" style={{ left: t * pps }}>
                    <span className="absolute top-1 left-1 font-mono text-[10px] text-fg-3 tabular-nums">{t % 1 === 0 ? `${t}s` : ""}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scenes */}
          <TrackRow label="Scenes" icon={<Layers className="size-3" />}>
            {timed.map((t, i) => {
              const next = timed[i + 1];
              const left = xOf(t.from + t.enterFrames / 2);
              const right = xOf(t.from + t.frames - (next ? next.enterFrames / 2 : 0));
              const s = t.scene;
              const active = selected.kind === "scene" && selected.id === s.id;
              return (
                <div
                  key={s.id}
                  className={cn(
                    "group/blk absolute top-1 bottom-1 flex cursor-pointer flex-col justify-center overflow-hidden rounded-md border px-2 transition-colors",
                    active ? "z-10 border-accent bg-accent-soft" : "border-line-strong bg-raised hover:border-fg-3",
                  )}
                  style={{ left: left + 1, width: Math.max(8, right - left - 2) }}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    select({ kind: "scene", id: s.id });
                    seek(t.from + t.enterFrames + 1);
                  }}
                  title={`${SCENE_LABELS[s.type]} · ${s.duration.toFixed(1)}s`}
                >
                  <span className={cn("truncate text-[11px] font-semibold", active ? "text-accent" : "text-fg-2")}>
                    {i + 1}. {SCENE_LABELS[s.type]}
                  </span>
                  <span className="truncate text-[11px] text-fg-3">{sceneText(s)}</span>
                  {s.note && <span className="absolute top-1 right-1.5 size-1.5 rounded-full bg-warn" title={s.note} />}
                  {/* Resize handle */}
                  <span
                    className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize opacity-0 transition-opacity group-hover/blk:opacity-100 hover:bg-fg/20"
                    onPointerDown={(e) => {
                      const d0 = s.duration;
                      select({ kind: "scene", id: s.id });
                      drag(e, (dx) => {
                        const d = Math.max(0.5, Math.min(60, Math.round((d0 + dx / pps) * 10) / 10));
                        edit((sp) => updateScene(sp, s.id, { duration: d }), `dur-${s.id}`);
                      });
                    }}
                  />
                </div>
              );
            })}
            {timed.slice(1).map((t) =>
              t.scene.transition === "cut" ? null : (
                <span
                  key={`tr-${t.scene.id}`}
                  className="pointer-events-none absolute top-1/2 z-20 flex size-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-panel bg-fg-2 text-bg"
                  style={{ left: xOf(t.from + t.enterFrames / 2) }}
                  title={`${t.scene.transition} transition`}
                >
                  <Shuffle className="size-2.5" />
                </span>
              ),
            )}
          </TrackRow>

          {/* Overlays */}
          {overlays.map((o) => {
            const start = o.start;
            const end = o.end > o.start ? Math.min(o.end, totalSec) : totalSec;
            const active = selected.kind === "overlay" && selected.id === o.id;
            return (
              <TrackRow key={o.id} label={o.type === "pip" ? "Face cam" : o.type === "text" ? "Text" : o.type[0].toUpperCase() + o.type.slice(1)} icon={<Captions className="size-3" />} short>
                <div
                  className={cn("group/ov absolute top-1 bottom-1 flex cursor-grab items-center overflow-hidden rounded-md border px-2 active:cursor-grabbing", active ? "border-info bg-info-soft" : "border-line bg-hover hover:border-line-strong")}
                  style={{ left: start * pps, width: Math.max(10, (end - start) * pps) }}
                  onPointerDown={(e) => {
                    select({ kind: "overlay", id: o.id });
                    const s0 = o.start;
                    const e0 = o.end;
                    drag(e, (dx) => {
                      const dt = Math.round((dx / pps) * 10) / 10;
                      const ns = Math.max(0, s0 + dt);
                      edit((sp) => updateOverlay(sp, o.id, { start: ns, end: e0 > 0 ? Math.max(ns + 0.3, e0 + (ns - s0)) : 0 }), `ov-move-${o.id}`);
                    });
                  }}
                >
                  <span className="truncate text-[11px] text-fg-2">{overlayLabel(o)}</span>
                  <span
                    className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover/ov:opacity-100 hover:bg-fg/20"
                    onPointerDown={(e) => {
                      select({ kind: "overlay", id: o.id });
                      const e0 = end;
                      drag(e, (dx) => {
                        const ne = Math.round((e0 + dx / pps) * 10) / 10;
                        edit((sp) => updateOverlay(sp, o.id, { end: ne >= totalSec - 0.05 ? 0 : Math.max(o.start + 0.3, ne) }), `ov-end-${o.id}`);
                      });
                    }}
                  />
                </div>
              </TrackRow>
            );
          })}

          {spec.captions?.words.length ? (
            <TrackRow label="Captions" icon={<Captions className="size-3" />} short>
              {spec.captions.words.map((w, i) => (
                <span key={i} className="absolute top-1.5 bottom-1.5 overflow-hidden rounded-sm bg-hover px-1 text-[10px] leading-[18px] text-fg-3" style={{ left: w.start * pps, width: Math.max(4, (w.end - w.start) * pps - 1) }}>
                  {w.text}
                </span>
              ))}
            </TrackRow>
          ) : null}

          {spec.voiceover && (
            <TrackRow label="Voice" icon={<Mic className="size-3" />} short>
              <div className="absolute top-1 bottom-1 flex items-center overflow-hidden rounded-md border border-line bg-ok-soft px-2 text-[11px] text-ok" style={{ left: 0, width: totalSec * pps }}>
                <Waveform seed={3} /> <span className="relative truncate rounded bg-panel/85 px-1.5">{spec.voiceover.text?.slice(0, 80) ?? "Voiceover"}</span>
              </div>
            </TrackRow>
          )}

          <TrackRow label="Music" icon={<AudioLines className="size-3" />} short>
            {hasAudio ? (
              <div className="absolute top-1 bottom-1 flex items-center overflow-hidden rounded-md border border-line bg-hover px-2 text-[11px] text-fg-2" style={{ left: 0, width: totalSec * pps }}>
                <Waveform seed={7} />
                <span className="relative truncate rounded bg-panel/85 px-1.5">{spec.audio?.src ? (spec.audio.title ?? spec.audio.src.replace(/^asset:/, "")) : `Add in-app: ${spec.meta.soundTip ?? spec.audio?.soundId}`}</span>
              </div>
            ) : (
              <span className="absolute top-1/2 left-2 -translate-y-1/2 text-[11px] text-fg-3">No music. Add one in the Audio tab, or post as a draft and pick a trending sound in TikTok.</span>
            )}
          </TrackRow>

          {/* Playhead */}
          <div className="pointer-events-none absolute top-0 bottom-0 z-30" style={{ left: TRACK_LABEL_W + xOf(frame) }}>
            <div className="absolute top-0 -left-[5px] h-2.5 w-[11px] rounded-b-[3px] bg-accent" />
            <div className="absolute top-0 bottom-0 left-0 w-px bg-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackRow({ label, icon, children, short }: { label: string; icon: React.ReactNode; children: React.ReactNode; short?: boolean }) {
  return (
    <div className={cn("flex border-b border-line/60", short ? "h-8" : "h-14")}>
      <div className="sticky left-0 z-10 flex shrink-0 items-center gap-1.5 border-r border-line bg-panel px-3 text-[11px] text-fg-3" style={{ width: TRACK_LABEL_W }}>
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="relative flex-1">{children}</div>
    </div>
  );
}

/** Decorative waveform (we don't decode audio in the browser; it just reads as "audio"). */
function Waveform({ seed }: { seed: number }) {
  const bars = useMemo(() => Array.from({ length: 420 }, (_, i) => 0.25 + Math.abs(Math.sin(i * 0.37 * seed) * Math.cos(i * 0.11 + seed)) * 0.75), [seed]);
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center gap-[3px] overflow-hidden px-1 opacity-25">
      {bars.map((h, i) => (
        <span key={i} className="w-[2px] shrink-0 rounded-full bg-current" style={{ height: `${h * 70}%` }} />
      ))}
    </span>
  );
}

