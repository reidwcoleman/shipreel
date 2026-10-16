"use client";
import { ArrowLeft, Check, Clapperboard, Copy, Download, FileJson, FolderOpen, Loader2, Monitor, MoreHorizontal, Redo2, RotateCw, Send, Trash2, Undo2 } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AiBar, type AiBarHandle } from "@/components/editor/ai-bar";
import { Inspector } from "@/components/editor/inspector";
import { LeftPanel } from "@/components/editor/left-panel";
import { Preview } from "@/components/editor/preview";
import { player, seek, uid, useEditor } from "@/components/editor/store";
import { Timeline } from "@/components/editor/timeline";
import { ScheduleDialog } from "@/components/schedule-dialog";
import { ScoreRing } from "@/components/score-ring";
import { Button, buttonClass, IconButton, Tip } from "@/components/ui/button";
import { Badge, Empty, Skeleton } from "@/components/ui/misc";
import { Dropdown, MenuItem, MenuSeparator } from "@/components/ui/overlay";
import { FORMAT_MAP } from "@/framework/formats";
import { scoreVideo } from "@/framework/score";
import { api, mediaUrl, post, put, refresh, useApi } from "@/lib/client/api";
import { useServerEvents } from "@/lib/client/events";
import { shouldIgnoreHotkey } from "@/lib/client/hotkeys";
import { useMediaQuery } from "@/lib/client/media";
import { deleteWithUndo } from "@/lib/client/undo";
import { useProjectDetail } from "@/lib/client/store";
import { cn } from "@/lib/cn";
import type { Run, VideoDoc } from "@/lib/types";
import { FPS } from "@/remotion/spec";
import { layoutScenes, totalDurationSeconds } from "@/remotion/timeline";

export default function EditorPage() {
  return (
    <Suspense fallback={null}>
      <Editor />
    </Suspense>
  );
}

type SaveState = "saved" | "saving" | "dirty" | "error";

function Editor() {
  const { projectId, videoId } = useParams<{ projectId: string; videoId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const tooNarrow = useMediaQuery("(max-width: 899px)");
  const { data: doc, error, mutate } = useApi<VideoDoc>(`/api/projects/${projectId}/videos/${videoId}`, { revalidateOnFocus: false });
  const { data: detail } = useProjectDetail(projectId);
  const spec = useEditor((s) => s.spec);
  const load = useEditor((s) => s.load);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const revision = useEditor((s) => s.revision);
  const savedRevision = useEditor((s) => s.savedRevision);
  const [save, setSave] = useState<SaveState>("saved");
  const [render, setRender] = useState<{ status: "idle" | "rendering" | "rendered" | "failed"; progress: number }>({ status: "idle", progress: 0 });
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [aiRun, setAiRun] = useState<Run | null>(null);
  const loadedFor = useRef<string | null>(null);
  const ai = useRef<AiBarHandle>(null);

  // Load the video into the editor once per video.
  useEffect(() => {
    if (!doc || loadedFor.current === doc.id) return;
    loadedFor.current = doc.id;
    load(doc.spec);
    seek(Math.round(Math.min(1.2, totalDurationSeconds(doc.spec) / 2) * FPS));
    setRender({ status: doc.status === "rendered" ? "rendered" : doc.status === "rendering" ? "rendering" : doc.status === "failed" ? "failed" : "idle", progress: doc.progress ?? 0 });
  }, [doc, load]);

  useEffect(() => {
    if (search.get("schedule") === "1" && spec) {
      setScheduleOpen(true);
      // Drop the param so a refresh doesn't reopen the dialog.
      router.replace(pathname, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!spec]);

  // The tab shows which video this is.
  const title = spec?.title;
  useEffect(() => {
    if (title) document.title = `${title} · Shipreel`;
  }, [title]);

  // ── Autosave ──────────────────────────────────────────────────────────────────
  const flush = useCallback(async () => {
    const st = useEditor.getState();
    if (!st.spec || st.revision === st.savedRevision) return;
    const rev = st.revision;
    setSave("saving");
    try {
      await put(`/api/projects/${projectId}/videos/${videoId}`, { spec: st.spec });
      useEditor.getState().markSaved(rev);
      setSave(useEditor.getState().revision === rev ? "saved" : "dirty");
      setRender((r) => (r.status === "rendered" ? { status: "idle", progress: 0 } : r));
    } catch (e) {
      setSave("error");
      toast.error("Couldn't save", { description: (e as Error).message.slice(0, 200) });
    }
  }, [projectId, videoId]);

  useEffect(() => {
    if (revision === savedRevision) return;
    setSave("dirty");
    const t = setTimeout(flush, 650);
    return () => clearTimeout(t);
  }, [revision, savedRevision, flush]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      const st = useEditor.getState();
      if (st.revision !== st.savedRevision) {
        void flush();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [flush]);

  // ── Live events: renders, agent edits ─────────────────────────────────────────
  useServerEvents(
    (e) => {
      if (e.type === "render" && e.videoId === videoId) {
        setRender({ status: e.status === "rendered" ? "rendered" : e.status === "failed" ? "failed" : "rendering", progress: e.progress ?? 0 });
        if (e.status === "rendered" || e.status === "failed") mutate();
        // No toast on success: the Render button itself fills, then turns into "Download MP4".
      }
    },
    [videoId, projectId],
  );

  const onAgentDone = async (run: Run) => {
    try {
      const fresh = await api<VideoDoc>(`/api/projects/${projectId}/videos/${videoId}`);
      load(fresh.spec, true);
      useEditor.getState().markSaved(useEditor.getState().revision);
      setSave("saved");
      mutate(fresh, false);
      toast.success(`${run.engine === "codex" ? "Codex" : "Claude"} edited the video`, {
        description: fresh.spec.meta.notes?.split("\n").at(-1)?.slice(0, 140),
        action: { label: "Undo", onClick: () => useEditor.getState().undo() },
      });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // ── Keyboard ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const st = useEditor.getState();
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void flush();
        return;
      }
      // Single keys (and ⌘D) never fire through a field, menu, dialog or popover, or while the agent edits.
      if (aiRun || shouldIgnoreHotkey(e, { allowModifiers: true })) return;
      if (e.altKey) return;
      if (e.key === " " && !mod) {
        e.preventDefault();
        player.current?.toggle();
      } else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && !mod) {
        e.preventDefault();
        const step = e.shiftKey ? FPS : 1;
        seek(st.frame + (e.key === "ArrowRight" ? step : -step));
      } else if ((e.key === "Backspace" || e.key === "Delete") && !mod && st.selected.kind !== "video") {
        e.preventDefault();
        const sel = st.selected;
        if (sel.kind === "scene" && st.spec && st.spec.scenes.length > 1) st.edit((s) => ({ ...s, scenes: s.scenes.filter((x) => x.id !== sel.id) }));
        if (sel.kind === "overlay") st.edit((s) => ({ ...s, overlays: s.overlays.filter((x) => x.id !== sel.id) }));
        st.select({ kind: "video" });
      } else if (mod && e.key.toLowerCase() === "d" && st.selected.kind === "scene") {
        e.preventDefault();
        const id = st.selected.id;
        st.edit((s) => {
          const i = s.scenes.findIndex((x) => x.id === id);
          const scenes = [...s.scenes];
          scenes.splice(i + 1, 0, { ...structuredClone(s.scenes[i]), id: uid() });
          return { ...s, scenes };
        });
      } else if (e.key === "Escape" && !mod) st.select({ kind: "video" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flush, aiRun]);

  const startRender = async () => {
    await flush();
    setRender({ status: "rendering", progress: 0 });
    try {
      await post(`/api/projects/${projectId}/videos/${videoId}/render`, { force: render.status === "rendered" });
    } catch (e) {
      setRender({ status: "failed", progress: 0 });
      toast.error((e as Error).message);
    }
  };

  if (error)
    return (
      <div className="flex h-screen items-center justify-center">
        <Empty
          title="This video doesn't exist"
          body="It may have been deleted."
          action={
            <Link href="/studio" className={buttonClass()}>
              Back to Studio
            </Link>
          }
        />
      </div>
    );

  if (tooNarrow) return <NarrowNotice />;

  if (!spec || !doc) return <EditorSkeleton />;

  const project = detail?.project ?? null;
  const assets = detail?.assets ?? [];
  const { score } = scoreVideo(spec, { proof: project?.proof });
  const fmt = FORMAT_MAP[spec.formatId];
  const dur = layoutScenes(spec.scenes).totalFrames / FPS;
  const handle = (project?.name ?? "yourapp").toLowerCase().replace(/[^a-z0-9]+/g, "");

  return (
    <div className="grid h-screen grid-cols-[minmax(0,1fr)] grid-rows-[52px_minmax(0,1fr)_204px] overflow-hidden bg-bg">
      {/* Top bar */}
      <header className="flex min-w-0 items-center gap-3 border-b border-line bg-panel px-3">
        <IconButton
          label="Back to Studio"
          onClick={async () => {
            await flush();
            router.push("/studio");
          }}
        >
          <ArrowLeft className="size-4" />
        </IconButton>
        <input
          value={spec.title}
          onChange={(e) => useEditor.getState().edit((s) => ({ ...s, title: e.target.value }), "title")}
          className="w-[min(36vw,420px)] truncate rounded-md bg-transparent px-2 py-1 text-[15px] font-semibold text-fg hover:bg-hover focus:bg-hover focus:outline-none"
          aria-label="Video title"
        />
        <div className="hidden items-center gap-1.5 lg:flex">
          {fmt && <Badge>{fmt.name}</Badge>}
          <Badge>{spec.aspect}</Badge>
          <Badge className="font-mono tabular-nums">{dur.toFixed(1)}s</Badge>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-fg-3" aria-live="polite">
          {save === "saving" ? (
            <>
              <Loader2 className="size-3 animate-spin" /> Saving
            </>
          ) : save === "dirty" ? (
            <>
              <span className="size-1.5 rounded-full bg-fg-3" /> Edited
            </>
          ) : save === "error" ? (
            <span className="text-bad">Not saved</span>
          ) : (
            <>
              <Check className="size-3" /> Saved
            </>
          )}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <IconButton label="Undo" kbd="⌘Z" disabled={!canUndo} onClick={undo}>
            <Undo2 className="size-4" />
          </IconButton>
          <IconButton label="Redo" kbd="⇧⌘Z" disabled={!canRedo} onClick={redo}>
            <Redo2 className="size-4" />
          </IconButton>
          <div className="mx-1.5 h-5 w-px bg-line" />
          <Tip label="Launch check: open the checklist">
            <button onClick={() => useEditor.getState().select({ kind: "video" })} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-hover" aria-label={`Launch score ${score}`}>
              <ScoreRing score={score} size={32} />
            </button>
          </Tip>
          <RenderButton
            status={render.status}
            progress={render.progress}
            onRender={startRender}
            onDownload={doc.render?.file ? () => window.open(`${mediaUrl(projectId, doc.render!.file)}?download=1`) : undefined}
          />
          <Button variant="primary" icon={<Send className="size-4" />} onClick={() => setScheduleOpen(true)}>
            Post
          </Button>
          <Dropdown
            trigger={
              <IconButton label="More">
                <MoreHorizontal className="size-4" />
              </IconButton>
            }
          >
            {doc.render?.file && (
              <MenuItem icon={<Download className="size-3.5" />} onSelect={() => window.open(`${mediaUrl(projectId, doc.render!.file)}?download=1`)}>
                Download MP4
              </MenuItem>
            )}
            {doc.render?.file && (
              <MenuItem icon={<FolderOpen className="size-3.5" />} onSelect={() => post("/api/open", { projectId, rel: doc.render!.file, reveal: true }).catch(() => toast.error("Couldn't open Finder"))}>
                Show render in Finder
              </MenuItem>
            )}
            <MenuItem icon={<FileJson className="size-3.5" />} onSelect={() => post("/api/open", { projectId, rel: `videos/${videoId}.json`, reveal: true }).catch(() => toast.error("Couldn't open Finder"))}>
              Show spec file (for agents)
            </MenuItem>
            <MenuItem
              icon={<Copy className="size-3.5" />}
              onSelect={async () => {
                await flush();
                const d = await post<VideoDoc>(`/api/projects/${projectId}/videos/${videoId}/duplicate`);
                refresh(`/api/projects/${projectId}/videos`);
                router.push(`/edit/${projectId}/${d.id}`);
              }}
            >
              Duplicate as variation
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              danger
              icon={<Trash2 className="size-3.5" />}
              onSelect={async () => {
                await flush();
                deleteWithUndo({
                  key: `video:${videoId}`,
                  message: "Video deleted",
                  description: spec.title,
                  url: `/api/projects/${projectId}/videos/${videoId}`,
                  refresh: [`/api/projects/${projectId}/videos`, `/api/projects/${projectId}/posts`, "/api/posts"],
                });
                router.push("/studio");
              }}
            >
              Delete video
            </MenuItem>
          </Dropdown>
        </div>
      </header>

      {/* Workspace */}
      <div className="grid min-h-0 grid-cols-[288px_minmax(0,1fr)_340px]">
        <aside className={cn("relative min-h-0 border-r border-line bg-panel", aiRun && "pointer-events-none opacity-60")}>
          <LeftPanel spec={spec} project={project} assets={assets} projectId={projectId} />
        </aside>
        <main className="relative flex min-h-0 flex-col pt-4">
          <Preview spec={spec} projectId={projectId} username={handle} />
          <AiBar ref={ai} projectId={projectId} videoId={videoId} beforeRun={flush} onDone={onAgentDone} running={aiRun} setRunning={setAiRun} />
        </main>
        <aside className={cn("min-h-0 overflow-y-auto border-l border-line bg-panel", aiRun && "pointer-events-none opacity-60")}>
          <Inspector assets={assets} projectId={projectId} proof={project?.proof} onAskAgent={(i) => ai.current?.fill(i)} />
        </aside>
      </div>

      <div className={cn("min-h-0 min-w-0", aiRun && "pointer-events-none opacity-60")}>
        <Timeline spec={spec} />
      </div>

      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        projectId={projectId}
        videoId={videoId}
        spec={spec}
        beforeSubmit={flush}
        onCaptionsWritten={(meta) => {
          useEditor.getState().edit((s) => ({ ...s, meta: { ...s.meta, captions: meta.captions, hashtags: meta.hashtags, caption: s.meta.caption || meta.caption } }));
        }}
      />
    </div>
  );
}

/**
 * Render as a material: the button fills left→right with progress (plus a 1px lime line on its
 * bottom edge), and once done it becomes "Download MP4" with a check that draws itself.
 */
function RenderButton({ status, progress, onRender, onDownload }: { status: "idle" | "rendering" | "rendered" | "failed"; progress: number; onRender: () => void; onDownload?: () => void }) {
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  if (status === "rendered" && onDownload)
    return (
      <div className="flex items-center">
        <Tip label="Download the MP4">
          <button onClick={onDownload} className={buttonClass({ className: "min-w-[118px] rounded-r-none border-r-0" })}>
            <svg viewBox="0 0 16 16" className="size-4 text-ok" aria-hidden>
              <motion.path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, ease: "easeOut" }} />
            </svg>
            Download MP4
          </button>
        </Tip>
        <Tip label="Render again">
          <button onClick={onRender} aria-label="Render again" className={buttonClass({ className: "rounded-l-none px-2" })}>
            <RotateCw className="size-3.5" />
          </button>
        </Tip>
      </div>
    );
  const rendering = status === "rendering";
  return (
    <Button
      onClick={onRender}
      disabled={rendering}
      aria-label={rendering ? `Rendering, ${pct}%` : undefined}
      icon={rendering ? <Loader2 className="size-4 animate-spin" /> : <Clapperboard className="size-4" />}
      className={cn("relative min-w-[132px] overflow-hidden tabular-nums", rendering && "border-accent/30 text-fg disabled:opacity-100")}
      style={rendering ? { backgroundImage: `linear-gradient(90deg, var(--color-accent-soft) ${pct}%, transparent ${pct}%)`, transition: "background-image 0.3s" } : undefined}
    >
      {rendering ? `Rendering ${pct}%` : status === "failed" ? "Retry render" : status === "rendered" ? "Rendered" : "Render MP4"}
      {rendering && <span className="absolute bottom-0 left-0 h-px bg-accent transition-[width] duration-300 ease-linear" style={{ width: `${pct}%` }} />}
    </Button>
  );
}

/** Below 900px the three-panel editor can't work: say so instead of collapsing into overlap. */
function NarrowNotice() {
  return (
    <div className="flex h-screen items-center justify-center px-6">
      <Empty
        icon={<Monitor className="size-5" />}
        title="The editor needs a wider window"
        body="Make this window at least 900px wide to edit. Your video is saved."
        action={
          <Link href="/studio" className={buttonClass()}>
            Back to Studio
          </Link>
        }
      />
    </div>
  );
}

/** Loading: the editor's own outline (top bar, three panels, timeline) instead of a lone spinner. */
function EditorSkeleton() {
  return (
    <div className="grid h-screen grid-rows-[52px_minmax(0,1fr)_204px] overflow-hidden bg-bg" aria-busy aria-label="Loading the editor">
      <div className="flex items-center gap-3 border-b border-line bg-panel px-3">
        <Skeleton className="size-8" />
        <Skeleton className="h-4 w-56" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="grid min-h-0 grid-cols-[288px_minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-2 border-r border-line bg-panel p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
        <div className="flex items-center justify-center p-6">
          <Skeleton className="aspect-[9/16] h-full max-h-[90%] rounded-reel" />
        </div>
        <div className="flex flex-col gap-3 border-l border-line bg-panel p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-line p-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-8 w-2/3" />
      </div>
    </div>
  );
}
