"use client";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Thumbnail } from "@remotion/player";
import {
  AppWindow,
  AtSign,
  BarChart3,
  Bell,
  Captions,
  Circle,
  Clapperboard,
  Film,
  GalleryVertical,
  GripVertical,
  Hash,
  ImagePlus,
  Layers,
  ListOrdered,
  Loader2,
  MessageCircle,
  MessageSquareQuote,
  Mic,
  Music2,
  Plus,
  Smartphone,
  SplitSquareVertical,
  Square,
  Sticker,
  StickyNote,
  Terminal,
  Type,
  Upload,
  UserSquare2,
  Wand2,
  Zap,
} from "lucide-react";
import React, { memo, useMemo, useRef, useState } from "react";
import { beatSync, MUSIC } from "@/framework/music";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { inputCls } from "@/components/ui/field";
import { Badge, SectionLabel, Segmented } from "@/components/ui/misc";
import { Popover } from "@/components/ui/overlay";
import type { Sound } from "@/framework/sounds";
import { api, mediaUrl, post, refresh } from "@/lib/client/api";
import { useBootstrap, useFramework } from "@/lib/client/store";
import { cn } from "@/lib/cn";
import type { Asset, Project } from "@/lib/types";
import { ShipreelVideo } from "@/remotion/ShipreelVideo";
import { CAPTION_STYLES, DIMENSIONS, FPS, normalizeSpec, SCENE_LABELS, TEXT_POSITIONS, type Overlay, type Scene, type SceneType, type VideoSpec } from "@/remotion/spec";
import { layoutScenes } from "@/remotion/timeline";
import { NumberSlider, Row } from "./fields";
import { defaultScene } from "./scene-defaults";
import { seek, uid, useEditor } from "./store";

export const SCENE_ICON: Record<SceneType, React.ComponentType<{ className?: string }>> = {
  hook: Zap,
  media: Smartphone,
  chat: MessageCircle,
  notes: StickyNote,
  tweet: AtSign,
  reddit: MessageSquareQuote,
  comment: MessageSquareQuote,
  list: ListOrdered,
  stat: BarChart3,
  split: SplitSquareVertical,
  cta: Clapperboard,
  slide: GalleryVertical,
  kinetic: Type,
  notifications: Bell,
  terminal: Terminal,
  appstore: AppWindow,
};

const SCENE_BLURB: Record<SceneType, string> = {
  hook: "Big opening line",
  media: "Screen recording or photo",
  chat: "iMessage / WhatsApp story",
  notes: "Apple Notes list",
  tweet: "X post card",
  reddit: "Reddit post card",
  comment: "Reply-to-comment sticker",
  list: "Ranked list",
  stat: "Animated number",
  split: "Before / after, face cam",
  cta: "Where to get it",
  slide: "Carousel slide",
  kinetic: "One word per beat",
  notifications: "Lock-screen pings",
  terminal: "Claude/Codex terminal",
  appstore: "App Store listing",
};

type Tab = "scenes" | "media" | "audio" | "layers";

export function LeftPanel({ spec, project, assets, projectId }: { spec: VideoSpec; project: Project | null; assets: Asset[]; projectId: string }) {
  const [tab, setTab] = useState<Tab>("scenes");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-line p-2">
        <Segmented
          layoutId="left-tab"
          value={tab}
          onChange={setTab}
          className="w-full [&>button]:flex-1 [&>button]:justify-center"
          options={[
            { value: "scenes", label: "Scenes" },
            { value: "media", label: "Media" },
            { value: "audio", label: "Audio" },
            { value: "layers", label: "Layers" },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "scenes" && <ScenesTab spec={spec} project={project} assets={assets} projectId={projectId} />}
        {tab === "media" && <MediaTab spec={spec} assets={assets} projectId={projectId} />}
        {tab === "audio" && <AudioTab spec={spec} assets={assets} projectId={projectId} />}
        {tab === "layers" && <LayersTab spec={spec} assets={assets} />}
      </div>
    </div>
  );
}

// ── Scenes ───────────────────────────────────────────────────────────────────────

/** One scene rendered alone at its middle frame. Memoised on content so typing elsewhere doesn't redraw it. */
const SceneThumb = memo(
  function SceneThumb({ scene, spec, projectId }: { scene: Scene; spec: VideoSpec; projectId: string; hash: string }) {
    const solo = useMemo(() => ({ ...spec, scenes: [{ ...scene, transition: "cut" as const }], overlays: [], captions: undefined, audio: undefined, voiceover: undefined }), [scene, spec]);
    const frames = Math.max(1, Math.round(scene.duration * FPS));
    const at = scene.type === "chat" || scene.type === "notes" || scene.type === "list" || scene.type === "notifications" || scene.type === "terminal" ? frames - 2 : Math.min(frames - 1, Math.round(frames * 0.55));
    const { width, height } = DIMENSIONS[spec.aspect];
    return (
      <Thumbnail
        component={ShipreelVideo}
        inputProps={{ spec: solo, assetBase: `/api/media/${projectId}`, publicBase: "" }}
        durationInFrames={frames}
        compositionWidth={width}
        compositionHeight={height}
        fps={FPS}
        frameToDisplay={Math.max(0, at)}
        style={{ width: "100%", height: "100%" }}
      />
    );
  },
  (a, b) => a.hash === b.hash && a.projectId === b.projectId,
);

function SortableScene({ scene, index, spec, projectId, active, from }: { scene: Scene; index: number; spec: VideoSpec; projectId: string; active: boolean; from: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id });
  const select = useEditor((s) => s.select);
  const Icon = SCENE_ICON[scene.type];
  const hash = useMemo(() => JSON.stringify([scene, spec.theme, spec.aspect]), [scene, spec.theme, spec.aspect]);
  const { width, height } = DIMENSIONS[spec.aspect];
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group/scene relative flex items-center gap-2.5 rounded-lg border p-1.5 pr-2 transition-colors",
        active ? "border-accent/70 bg-accent-soft" : "border-transparent hover:bg-hover",
        isDragging && "z-10 border-line-strong bg-raised shadow-2xl",
      )}
      onClick={() => {
        select({ kind: "scene", id: scene.id });
        seek(from);
      }}
    >
      <button {...attributes} {...listeners} className="flex h-10 w-3 cursor-grab items-center justify-center text-fg-3 opacity-0 transition-opacity group-hover/scene:opacity-100 active:cursor-grabbing" aria-label={`Reorder scene ${index + 1}`} onClick={(e) => e.stopPropagation()}>
        <GripVertical className="size-3.5" />
      </button>
      <div className="w-[46px] shrink-0 overflow-hidden rounded-md bg-black ring-1 ring-line" style={{ aspectRatio: `${width}/${height}` }}>
        <SceneThumb scene={scene} spec={spec} projectId={projectId} hash={hash} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-fg">
          <Icon className={cn("size-3.5", active ? "text-accent" : "text-fg-3")} />
          <span className="truncate">{SCENE_LABELS[scene.type]}</span>
        </span>
        <span className="line-clamp-2 text-[11px] leading-snug text-fg-3">{previewText(scene)}</span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="font-mono text-[11px] text-fg-3 tabular-nums">{scene.duration.toFixed(1)}s</span>
        {scene.note && <span className="size-1.5 rounded-full bg-warn" title={scene.note} />}
      </div>
    </div>
  );
}

function previewText(s: Scene): string {
  switch (s.type) {
    case "hook":
    case "slide":
    case "tweet":
    case "comment":
      return s.text.replace(/\*/g, "");
    case "chat":
      return s.messages.map((m) => m.text).join(" · ");
    case "notes":
      return `${s.title}: ${s.items.join(", ")}`;
    case "list":
      return `${s.title}: ${s.items.map((i) => i.text).join(", ")}`;
    case "reddit":
      return s.title;
    case "stat":
      return `${s.prefix}${s.to.toLocaleString()}${s.suffix} ${s.label}`;
    case "split":
      return `${s.top.label || "top"} / ${s.bottom.label || "bottom"}`;
    case "cta":
      return s.headline;
    case "kinetic":
      return s.words.join(" ");
    case "notifications":
      return s.items.map((n) => n.body).join(" · ");
    case "terminal":
      return s.lines.map((l) => l.text).join(" · ");
    case "appstore":
      return `${s.appName} — ${s.subtitle}`;
    case "media":
      return s.caption?.text || (s.src.startsWith("builtin:") ? "Placeholder: pick your screen recording" : s.src.replace(/^asset:/, ""));
  }
}

export function AddSceneMenu({ project, assets, trigger, onAdd }: { project: Project | null; assets: Asset[]; trigger: React.ReactNode; onAdd?: (s: Scene) => void }) {
  const [open, setOpen] = useState(false);
  const edit = useEditor((s) => s.edit);
  const select = useEditor((s) => s.select);
  const selected = useEditor((s) => s.selected);
  const add = (type: SceneType) => {
    const screen = assets.find((a) => a.kind === "video" && (a.role === "screen" || !a.role)) ?? assets.find((a) => a.kind !== "audio");
    const scene = defaultScene(type, project, screen);
    edit((s) => {
      const at = selected.kind === "scene" ? s.scenes.findIndex((x) => x.id === selected.id) + 1 : type === "hook" ? 0 : s.scenes.length - (s.scenes.at(-1)?.type === "cta" && type !== "cta" ? 1 : 0);
      const scenes = [...s.scenes];
      scenes.splice(Math.max(0, at), 0, scene);
      return { ...s, scenes };
    });
    select({ kind: "scene", id: scene.id });
    const cur = useEditor.getState().spec;
    const t = cur && layoutScenes(cur.scenes).timed.find((x) => x.scene.id === scene.id);
    if (t) seek(t.from + t.enterFrames + Math.round(Math.min(1, scene.duration / 2) * FPS));
    onAdd?.(scene);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen} trigger={trigger} className="w-[380px] p-2">
      <div className="grid grid-cols-2 gap-1">
        {(Object.keys(SCENE_LABELS) as SceneType[]).map((t) => {
          const Icon = SCENE_ICON[t];
          return (
            <button key={t} onClick={() => add(t)} className="flex items-start gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-hover">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-hover text-fg-2">
                <Icon className="size-3.5" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[13px] font-medium text-fg">{SCENE_LABELS[t]}</span>
                <span className="truncate text-[11px] text-fg-3">{SCENE_BLURB[t]}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Popover>
  );
}

function ScenesTab({ spec, project, assets, projectId }: { spec: VideoSpec; project: Project | null; assets: Asset[]; projectId: string }) {
  const edit = useEditor((s) => s.edit);
  const selected = useEditor((s) => s.selected);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const { timed } = useMemo(() => layoutScenes(spec.scenes), [spec.scenes]);
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    edit((s) => {
      const from = s.scenes.findIndex((x) => x.id === active.id);
      const to = s.scenes.findIndex((x) => x.id === over.id);
      return { ...s, scenes: arrayMove(s.scenes, from, to) };
    });
  };
  return (
    <div className="flex flex-col gap-1 p-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={spec.scenes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {spec.scenes.map((s, i) => (
            <SortableScene key={s.id} scene={s} index={i} spec={spec} projectId={projectId} active={selected.kind === "scene" && selected.id === s.id} from={timed[i].from + timed[i].enterFrames + 1} />
          ))}
        </SortableContext>
      </DndContext>
      <AddSceneMenu
        project={project}
        assets={assets}
        trigger={
          <button className="mt-1 flex h-10 items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong text-[13px] text-fg-3 transition-colors hover:border-accent/50 hover:text-fg">
            <Plus className="size-4" /> Add scene
          </button>
        }
      />
    </div>
  );
}

// ── Media ────────────────────────────────────────────────────────────────────────

export function useUpload(projectId: string) {
  const [busy, setBusy] = useState(false);
  const upload = async (files: FileList | File[] | null): Promise<Asset[]> => {
    const list = files ? Array.from(files) : [];
    if (!list.length) return [];
    setBusy(true);
    const t = toast.loading(list.length > 1 ? `Uploading ${list.length} files…` : `Uploading ${list[0].name}…`);
    try {
      const fd = new FormData();
      for (const f of list) fd.append("files", f);
      const res = await fetch(`/api/projects/${projectId}/assets`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Upload failed");
      toast.success(list.length > 1 ? `Added ${list.length} files` : "Added", { id: t });
      refresh(`/api/projects/${projectId}`);
      return data as Asset[];
    } catch (e) {
      toast.error((e as Error).message, { id: t });
      return [];
    } finally {
      setBusy(false);
    }
  };
  return { upload, busy };
}

function MediaTab({ spec, assets, projectId }: { spec: VideoSpec; assets: Asset[]; projectId: string }) {
  const edit = useEditor((s) => s.edit);
  const select = useEditor((s) => s.select);
  const selected = useEditor((s) => s.selected);
  const input = useRef<HTMLInputElement>(null);
  const { upload, busy } = useUpload(projectId);
  const [drag, setDrag] = useState(false);
  const [recording, setRecording] = useState(false);
  const visual = assets.filter((a) => a.kind !== "audio");
  const selScene = selected.kind === "scene" ? spec.scenes.find((s) => s.id === selected.id) : undefined;

  const addClip = (a: Asset) => {
    const scene: Scene = {
      id: uid(),
      type: "media",
      duration: a.kind === "video" ? Math.min(8, Math.max(2, Math.round((a.durationSec ?? 4) * 10) / 10)) : 3,
      transition: "cut",
      src: `asset:${a.file}`,
      kind: a.kind === "video" ? "video" : "image",
      trimStart: 0,
      playbackRate: 1,
      volume: 0,
      fit: "cover",
      device: a.role === "screen" ? "iphone" : "none",
      zooms: [],
      taps: [],
      callouts: [],
      flow: [],
      lines: [],
      anchor: a.role === "screen" ? "top" : "center",
      push: a.role === "broll" ? 1.04 : 1,
      ...(a.width && a.height ? { aspect: +(a.width / a.height).toFixed(4) } : {}),
    };
    edit((s) => {
      const at = selected.kind === "scene" ? s.scenes.findIndex((x) => x.id === selected.id) + 1 : Math.max(1, s.scenes.length - 1);
      const scenes = [...s.scenes];
      scenes.splice(at, 0, scene);
      return { ...s, scenes };
    });
    select({ kind: "scene", id: scene.id });
  };

  const useAsFaceCam = (a: Asset) => {
    const id = uid("o");
    const o: Overlay = { id, type: "pip", start: 0, end: 0, src: `asset:${a.file}`, kind: a.kind === "video" ? "video" : "image", shape: "rounded", corner: "bottom-left", size: 0.42, volume: 1, trimStart: 0 };
    edit((s) => ({ ...s, overlays: [...s.overlays, o] }));
    select({ kind: "overlay", id });
  };

  const useAsBackground = (a: Asset) => {
    if (!selScene || !("background" in selScene)) return toast("Select a scene that has a background first.");
    edit((s) => ({ ...s, scenes: s.scenes.map((x) => (x.id === selScene.id ? ({ ...x, background: { kind: "media", src: `asset:${a.file}`, dim: 0.35, blur: 0, kenBurns: true } } as Scene) : x)) }));
  };

  const capture = async (action: "screenshot" | "start" | "stop") => {
    try {
      if (action === "start") {
        await post("/api/capture", { projectId, action: "start", source: "ios" });
        setRecording(true);
        toast("Recording the Simulator… use your app, then press Stop.");
      } else {
        const t = toast.loading(action === "stop" ? "Saving the recording…" : "Taking a screenshot…");
        const a = await post<Asset>("/api/capture", { projectId, action, source: "ios" });
        if (action === "stop") setRecording(false);
        toast.success(action === "stop" ? "Recording added" : "Screenshot added", { id: t });
        refresh(`/api/projects/${projectId}`);
        if (a?.file && action === "stop") addClip(a);
      }
    } catch (e) {
      if (action === "stop") setRecording(false);
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setDrag(false);
          await upload(e.dataTransfer.files);
        }}
        onClick={() => input.current?.click()}
        className={cn("flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-5 text-center transition-colors", drag ? "border-accent bg-accent-soft" : "border-line-strong hover:border-fg-3")}
      >
        {busy ? <Loader2 className="size-5 animate-spin text-fg-3" /> : <Upload className="size-5 text-fg-3" />}
        <span className="text-[13px] font-medium text-fg">Drop screen recordings, photos, face cam</span>
        <span className="text-[11px] text-fg-3">MP4, MOV, PNG, JPG. iPhone HEVC is converted for you.</span>
        <input ref={input} type="file" multiple accept="image/*,video/*,audio/*" className="hidden" onChange={(e) => upload(e.target.files)} />
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Capture your real app</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" icon={<ImagePlus className="size-3.5" />} onClick={() => capture("screenshot")}>
            Sim screenshot
          </Button>
          {recording ? (
            <Button size="sm" variant="danger" icon={<Square className="size-3 fill-current" />} onClick={() => capture("stop")}>
              Stop recording
            </Button>
          ) : (
            <Button size="sm" icon={<Circle className="size-3 fill-bad text-bad" />} onClick={() => capture("start")}>
              Record Simulator
            </Button>
          )}
        </div>
        <p className="text-[11px] leading-relaxed text-fg-3">Run your app in the iOS Simulator; Shipreel records it straight into this project. Real footage beats mockups.</p>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel aside={<span className="text-[11px] text-fg-3">{visual.length}</span>}>Your media</SectionLabel>
        {visual.length === 0 ? (
          <p className="text-xs text-fg-3">Nothing yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {visual.map((a) => (
              <Popover
                key={a.file}
                className="w-52 p-1"
                trigger={
                  <button className="group/asset relative aspect-[3/4] overflow-hidden rounded-md bg-black ring-1 ring-line hover:ring-line-strong" title={a.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(projectId, a.thumb ? `assets/${a.thumb}` : `assets/${a.file}`)} alt={a.name} className="size-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-1.5 pt-4 pb-1 text-[10px] text-white">
                      <span className="truncate">{a.role ?? a.kind}</span>
                      {a.kind === "video" && (
                        <span className="flex items-center gap-0.5 font-mono">
                          <Film className="size-2.5" />
                          {a.durationSec?.toFixed(0)}s
                        </span>
                      )}
                    </span>
                  </button>
                }
              >
                <MenuBtn icon={<Plus className="size-3.5" />} onClick={() => addClip(a)}>
                  Add as a clip
                </MenuBtn>
                <MenuBtn icon={<ImagePlus className="size-3.5" />} onClick={() => useAsBackground(a)}>
                  Background of selected scene
                </MenuBtn>
                <MenuBtn icon={<UserSquare2 className="size-3.5" />} onClick={() => useAsFaceCam(a)}>
                  Face cam (picture-in-picture)
                </MenuBtn>
              </Popover>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuBtn({ children, icon, onClick }: { children: React.ReactNode; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] text-fg hover:bg-hover">
      <span className="text-fg-3">{icon}</span>
      {children}
    </button>
  );
}

// ── Audio ────────────────────────────────────────────────────────────────────────

function scriptFromSpec(spec: VideoSpec): string {
  const lines: string[] = [];
  for (const s of spec.scenes) {
    const t = previewText(s);
    if (t && s.type !== "media") lines.push(t.replace(/ · /g, ". ").replace(/\s+/g, " ").trim());
  }
  return lines
    .join(". ")
    .replace(/([.!?])\./g, "$1")
    .slice(0, 900);
}

type Voice = { id: string; name: string; engine: "say" | "elevenlabs"; lang?: string; premium?: boolean };

function AudioTab({ spec, assets, projectId }: { spec: VideoSpec; assets: Asset[]; projectId: string }) {
  const edit = useEditor((s) => s.edit);
  const load = useEditor((s) => s.load);
  const { data: fw } = useFramework();
  const { data: boot } = useBootstrap();
  const { upload } = useUpload(projectId);
  const audioIn = useRef<HTMLInputElement>(null);
  const tracks = assets.filter((a) => a.kind === "audio" && !a.file.startsWith("voiceover"));
  const [script, setScript] = useState(() => spec.voiceover?.text ?? scriptFromSpec(spec));
  const [voices, setVoices] = useState<Voice[] | null>(null);
  const [voice, setVoice] = useState<string>("");
  const [fit, setFit] = useState(true);
  const [busy, setBusy] = useState<"vo" | "music" | null>(null);
  const [soundQ, setSoundQ] = useState("");
  const hasEleven = !!boot?.secrets.elevenlabsKey;

  const loadVoices = async () => {
    if (voices) return;
    try {
      const v = await api<Voice[]>("/api/voice");
      setVoices(v);
      if (!voice && v[0]) setVoice(`${v[0].engine}:${v[0].id}`);
    } catch {
      setVoices([]);
    }
  };

  const setAudio = (patch: Partial<NonNullable<VideoSpec["audio"]>> | null, key?: string) =>
    edit((s) => ({ ...s, audio: patch === null ? undefined : { volume: 0.7, startFrom: 0, fadeOut: true, ...(s.audio ?? {}), ...patch } }), key);

  const generateVoice = async () => {
    if (!script.trim()) return toast("Write a script first.");
    setBusy("vo");
    const t = toast.loading("Recording the voiceover…");
    try {
      const [engine, ...rest] = (voice || "say:").split(":");
      const r = await post<{ spec: VideoSpec }>(`/api/projects/${projectId}/videos/${spec.id}/voiceover`, { text: script, engine, voice: rest.join(":"), fit, spec });
      load(r.spec, true);
      toast.success("Voiceover and word captions added", { id: t });
    } catch (e) {
      toast.error((e as Error).message, { id: t });
    } finally {
      setBusy(null);
    }
  };

  const generateMusic = async (prompt: string) => {
    setBusy("music");
    const t = toast.loading("Composing an original track with ElevenLabs…");
    try {
      const a = await post<Asset>(`/api/projects/${projectId}/music`, { prompt, seconds: Math.ceil(layoutScenes(spec.scenes).totalFrames / FPS) + 1 });
      refresh(`/api/projects/${projectId}`);
      setAudio({ src: `asset:${a.file}`, title: a.name, volume: 0.5 });
      toast.success("Music added", { id: t });
    } catch (e) {
      toast.error((e as Error).message, { id: t });
    } finally {
      setBusy(null);
    }
  };

  const sounds = (fw?.sounds ?? []).filter((s) => !soundQ || `${s.title} ${s.artist} ${s.vibe.join(" ")}`.toLowerCase().includes(soundQ.toLowerCase()));
  const pickSound = (s: Sound) => {
    edit((sp) => ({ ...sp, audio: { volume: 0.7, startFrom: 0, fadeOut: true, ...(sp.audio ?? {}), soundId: s.id }, meta: { ...sp.meta, soundTip: `${s.title} — ${s.artist}${s.dropAtSec ? ` (drop at ${s.dropAtSec}s)` : ""}` } }));
    toast.success(`Saved "${s.title}" as the sound to add when you post`);
  };

  return (
    <div className="flex flex-col divide-y divide-line">
      {/* Voiceover */}
      <section className="flex flex-col gap-3 p-3">
        <SectionLabel aside={spec.voiceover && <Badge tone="ok">On</Badge>}>Voiceover + word captions</SectionLabel>
        <p className="text-[11px] leading-relaxed text-fg-3">Talking videos convert best. Generate a voice from a script; Shipreel times the words into animated captions.</p>
        <textarea value={script} onChange={(e) => setScript(e.target.value)} rows={5} className={cn(inputCls, "resize-y py-2 text-[13px] leading-relaxed")} placeholder="What the voice says…" />
        <div className="flex gap-2">
          <select value={voice} onFocus={loadVoices} onMouseDown={loadVoices} onChange={(e) => setVoice(e.target.value)} className={cn(inputCls, "h-8 flex-1 text-[13px]")}>
            {!voices && <option value="">{voice ? voice.split(":").slice(1).join(":") : "Choose a voice…"}</option>}
            {voices?.length === 0 && <option value="say:">System voice</option>}
            {voices?.some((v) => v.engine === "elevenlabs") && (
              <optgroup label="ElevenLabs">
                {voices
                  .filter((v) => v.engine === "elevenlabs")
                  .map((v) => (
                    <option key={v.id} value={`elevenlabs:${v.id}`}>
                      {v.name}
                    </option>
                  ))}
              </optgroup>
            )}
            {voices?.some((v) => v.engine === "say") && (
              <optgroup label="On this Mac (free)">
                {voices
                  .filter((v) => v.engine === "say")
                  .map((v) => (
                    <option key={v.id} value={`say:${v.id}`}>
                      {v.name}
                      {v.premium ? " (premium)" : ""}
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
          <Button size="sm" variant="primary" loading={busy === "vo"} icon={<Mic className="size-3.5" />} onClick={generateVoice}>
            Generate
          </Button>
        </div>
        <label className="flex items-center gap-2 text-xs text-fg-2">
          <input type="checkbox" checked={fit} onChange={(e) => setFit(e.target.checked)} className="accent-[var(--color-accent)]" />
          Lengthen scenes if the voice runs longer
        </label>
        {!hasEleven && <p className="text-[11px] text-fg-3">Add an ElevenLabs key in Settings for natural voices. Mac voices are free and offline.</p>}
        {spec.captions && (
          <div className="flex flex-col gap-2.5 rounded-md border border-line p-2.5">
            <Row label="Caption style">
              <select value={spec.captions.style} onChange={(e) => edit((s) => ({ ...s, captions: s.captions && { ...s.captions, style: e.target.value as typeof spec.captions.style } }))} className={cn(inputCls, "h-8 text-[13px]")}>
                {CAPTION_STYLES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Row>
            <div className="grid grid-cols-2 gap-2">
              <Row label="Position">
                <select value={spec.captions.position} onChange={(e) => edit((s) => ({ ...s, captions: s.captions && { ...s.captions, position: e.target.value as typeof spec.captions.position } }))} className={cn(inputCls, "h-8 text-[13px]")}>
                  {TEXT_POSITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Row>
              <Row label="Words at once">
                <NumberSlider value={spec.captions.wordsPerPage} min={1} max={6} step={1} onChange={(n) => edit((s) => ({ ...s, captions: s.captions && { ...s.captions, wordsPerPage: n } }), "wpp")} />
              </Row>
            </div>
            <Button size="sm" variant="ghost" onClick={() => edit((s) => ({ ...s, captions: undefined, voiceover: undefined }))}>
              Remove voiceover and captions
            </Button>
          </div>
        )}
      </section>

      {/* Music */}
      <section className="flex flex-col gap-3 p-3">
        <SectionLabel>Music</SectionLabel>
        {spec.audio?.src ? (
          <div className="flex flex-col gap-2.5 rounded-md border border-line p-2.5">
            <div className="flex items-center gap-2 text-[13px]">
              <Music2 className="size-3.5 text-fg-3" />
              <span className="min-w-0 flex-1 truncate">{spec.audio.title ?? spec.audio.src.replace(/^asset:/, "")}</span>
              <button className="text-xs text-fg-3 hover:text-fg" onClick={() => setAudio({ src: undefined, title: undefined })}>
                Remove
              </button>
            </div>
            <Row label="Volume">
              <NumberSlider value={spec.audio.volume} min={0} max={1} step={0.05} onChange={(volume) => setAudio({ volume }, "music-vol")} />
            </Row>
            <Row label="Start the track at" hint="line the drop up with your reveal">
              <NumberSlider value={spec.audio.startFrom} min={0} max={120} step={0.5} onChange={(startFrom) => setAudio({ startFrom }, "music-start")} unit="s" />
            </Row>
          </div>
        ) : (
          <p className="text-[11px] leading-relaxed text-fg-3">Use music you own or made. Copyrighted songs get auto-posted videos muted, so add trending songs in the app instead (below).</p>
        )}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-fg-3">Built-in beds (royalty-free) — picking one moves your cuts onto its beat</span>
          <div className="flex flex-wrap gap-1.5">
            {MUSIC.map((t) => (
              <button
                key={t.id}
                title={`${t.title}${t.artist ? ` — ${t.artist}` : ""} · ${t.bpm} bpm · ${t.vibe.slice(0, 3).join(", ")}`}
                onClick={() => edit((sp) => normalizeSpec({ ...beatSync(sp, t), id: sp.id }), "music-bed")}
                className={cn("flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs", spec.audio?.src === `music:${t.id}` ? "border-accent text-fg" : "border-line text-fg-2 hover:border-line-strong")}
              >
                <Music2 className="size-3" />
                {t.id.replace(/-/g, " ")}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tracks.map((a) => (
            <button key={a.file} onClick={() => setAudio({ src: `asset:${a.file}`, title: a.name })} className={cn("flex h-7 max-w-full items-center gap-1.5 rounded-md border px-2 text-xs", spec.audio?.src === `asset:${a.file}` ? "border-accent text-fg" : "border-line text-fg-2 hover:border-line-strong")}>
              <Music2 className="size-3" />
              <span className="truncate">{a.name}</span>
            </button>
          ))}
          <button onClick={() => audioIn.current?.click()} className="flex h-7 items-center gap-1.5 rounded-md border border-dashed border-line-strong px-2 text-xs text-fg-3 hover:text-fg">
            <Upload className="size-3" /> Upload audio
          </button>
          <input
            ref={audioIn}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={async (e) => {
              const added = await upload(e.target.files);
              if (added[0]) setAudio({ src: `asset:${added[0].file}`, title: added[0].name });
            }}
          />
        </div>
        <Popover
          className="w-72 p-2"
          trigger={
            <Button size="sm" variant="outline" loading={busy === "music"} icon={<Wand2 className="size-3.5" />} disabled={!hasEleven} title={hasEleven ? undefined : "Add an ElevenLabs key in Settings"}>
              Compose original music
            </Button>
          }
        >
          <MusicPrompt onGo={generateMusic} />
        </Popover>
      </section>

      {/* Trending sound */}
      <section className="flex flex-col gap-3 p-3">
        <SectionLabel aside={spec.meta.soundTip && <Badge tone="accent">Picked</Badge>}>Trending sound (add in-app)</SectionLabel>
        {spec.meta.soundTip && <p className="rounded-md bg-accent-soft px-2.5 py-2 text-xs text-fg">{spec.meta.soundTip}</p>}
        <p className="text-[11px] leading-relaxed text-fg-3">Pick the sound you&apos;ll add when you post. TikTok posts go up as drafts so you can attach it in one tap, with no copyright mute.</p>
        <input value={soundQ} onChange={(e) => setSoundQ(e.target.value)} placeholder="Search sounds or vibes…" className={cn(inputCls, "h-8 text-[13px]")} />
        <div className="flex flex-col gap-1">
          {sounds.slice(0, 40).map((s) => (
            <button key={s.id} onClick={() => pickSound(s)} className={cn("flex items-start gap-2 rounded-md p-2 text-left hover:bg-hover", spec.audio?.soundId === s.id && "bg-accent-soft")}>
              <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", s.status === "rising" ? "bg-accent" : s.status === "peaking" ? "bg-warn" : s.status === "fading" ? "bg-fg-3" : "bg-info")} title={s.status} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] text-fg">
                  {s.title} <span className="text-fg-3">· {s.artist}</span>
                </span>
                <span className="line-clamp-2 text-[11px] text-fg-3">{s.howUsed}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* SFX */}
      <section className="flex flex-col gap-2 p-3">
        <SectionLabel>Sound effects</SectionLabel>
        <label className="flex items-center justify-between text-[13px] text-fg-2">
          Automatic whooshes, pops and dings
          <input type="checkbox" checked={spec.theme.sfx} onChange={(e) => edit((s) => ({ ...s, theme: { ...s.theme, sfx: e.target.checked } }))} className="accent-[var(--color-accent)]" />
        </label>
        <p className="text-[11px] text-fg-3">Per-scene effects are in each scene&apos;s Timing section.</p>
      </section>
    </div>
  );
}

function MusicPrompt({ onGo }: { onGo: (p: string) => void }) {
  const presets = ["upbeat lo-fi beat, no vocals, builds at 3s", "hype trap beat with a big drop at 2s", "soft aesthetic piano, emotional", "cinematic tension riser into a bright reveal"];
  const [p, setP] = useState(presets[0]);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-fg-2">Describe the track</span>
      <textarea value={p} onChange={(e) => setP(e.target.value)} rows={3} className={cn(inputCls, "resize-none py-2 text-[13px]")} />
      <div className="flex flex-wrap gap-1">
        {presets.map((x) => (
          <button key={x} onClick={() => setP(x)} className="rounded bg-hover px-1.5 py-0.5 text-[11px] text-fg-3 hover:text-fg">
            {x.split(",")[0]}
          </button>
        ))}
      </div>
      <Button size="sm" variant="primary" onClick={() => onGo(p)}>
        Compose (≈ $0.15/min)
      </Button>
    </div>
  );
}

// ── Layers ───────────────────────────────────────────────────────────────────────

function LayersTab({ spec, assets }: { spec: VideoSpec; assets: Asset[] }) {
  const edit = useEditor((s) => s.edit);
  const select = useEditor((s) => s.select);
  const selected = useEditor((s) => s.selected);
  const frame = useEditor((s) => s.frame);
  const now = Math.round((frame / FPS) * 10) / 10;
  const add = (o: Overlay) => {
    edit((s) => ({ ...s, overlays: [...s.overlays, o] }));
    select({ kind: "overlay", id: o.id });
  };
  const face = assets.find((a) => a.role === "facecam") ?? assets.find((a) => a.kind === "video");
  const kinds: { label: string; icon: React.ReactNode; make: () => Overlay | null }[] = [
    { label: "Text", icon: <Type className="size-3.5" />, make: () => ({ id: uid("o"), type: "text", start: now, end: Math.round((now + 2.5) * 10) / 10, text: "wait for it…", textStyle: { style: "tiktok-classic", position: "upper" } }) },
    { label: "Sticker", icon: <Sticker className="size-3.5" />, make: () => ({ id: uid("o"), type: "sticker", start: now, end: Math.round((now + 2) * 10) / 10, emoji: "🔥", x: 0.78, y: 0.3, size: 0.14 }) },
    { label: "Progress bar", icon: <BarChart3 className="size-3.5" />, make: () => ({ id: uid("o"), type: "progress", start: 0, end: 0 }) },
    { label: "Watermark", icon: <Hash className="size-3.5" />, make: () => ({ id: uid("o"), type: "watermark", start: 0, end: 0, text: "@yourapp", corner: "top-left" }) },
    {
      label: "Face cam",
      icon: <UserSquare2 className="size-3.5" />,
      make: () => (face ? { id: uid("o"), type: "pip", start: 0, end: 0, src: `asset:${face.file}`, kind: face.kind === "video" ? "video" : "image", shape: "rounded", corner: "bottom-left", size: 0.42, volume: 1, trimStart: 0 } : null),
    },
  ];
  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="flex flex-col gap-2">
        <SectionLabel>Add a layer</SectionLabel>
        <div className="grid grid-cols-2 gap-1.5">
          {kinds.map((k) => (
            <button
              key={k.label}
              onClick={() => {
                const o = k.make();
                if (!o) return toast("Upload a face-cam clip in Media first.");
                add(o);
              }}
              className="flex h-9 items-center gap-2 rounded-md border border-line px-2.5 text-[13px] text-fg-2 transition-colors hover:border-line-strong hover:text-fg"
            >
              <span className="text-fg-3">{k.icon}</span>
              {k.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-fg-3">Layers sit on top of every scene. New text and stickers start at the playhead.</p>
      </div>
      <div className="flex flex-col gap-1">
        <SectionLabel aside={<span className="text-[11px] text-fg-3">{spec.overlays.length}</span>}>On this video</SectionLabel>
        {spec.overlays.length === 0 && <p className="py-2 text-xs text-fg-3">No layers yet.</p>}
        {spec.overlays.map((o) => (
          <button
            key={o.id}
            onClick={() => {
              select({ kind: "overlay", id: o.id });
              seek(o.start * FPS);
            }}
            className={cn("flex items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] hover:bg-hover", selected.kind === "overlay" && selected.id === o.id && "bg-info-soft")}
          >
            <Layers className="size-3.5 text-fg-3" />
            <span className="min-w-0 flex-1 truncate">{o.type === "text" ? o.text : o.type === "sticker" ? `${o.emoji} sticker` : o.type === "pip" ? "Face cam" : o.type === "watermark" ? o.text : "Progress bar"}</span>
            <span className="font-mono text-[11px] text-fg-3 tabular-nums">
              {o.start.toFixed(1)}–{o.end > 0 ? o.end.toFixed(1) : "end"}
            </span>
          </button>
        ))}
      </div>
      {spec.captions && (
        <div className="flex items-center gap-2 rounded-md border border-line px-2.5 py-2 text-[13px] text-fg-2">
          <Captions className="size-3.5 text-fg-3" />
          Word captions: {spec.captions.words.length} words
        </div>
      )}
    </div>
  );
}
