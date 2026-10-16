"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Bot, Check, Loader2, Send, Square, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { AgentConsole, useRun } from "@/components/agents/console";
import { Reel } from "@/components/reel";
import { Button, buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { api, del, refresh, useApi } from "@/lib/client/api";
import { useServerEvents } from "@/lib/client/events";
import { cn } from "@/lib/cn";
import type { Run, VideoDoc } from "@/lib/types";

type Shell = { openRun: (id: string) => void; openCommand: () => void };
const ShellCtx = createContext<Shell>({ openRun: () => {}, openCommand: () => {} });
export const useShell = () => useContext(ShellCtx);

type Task =
  | { kind: "run"; id: string; runKind: Run["kind"]; title: string; engine: string; status: Run["status"]; last?: string; projectId?: string; output?: Run["output"] }
  | { kind: "render"; id: string; projectId: string; progress: number; status: "rendering" | "rendered" | "failed"; error?: string }
  | { kind: "post"; id: string; label: string; status: string };

const KIND_LABEL: Record<string, string> = {
  analyze: "Reading your product",
  ideas: "Writing hooks",
  video: "Writing the video",
  edit: "Editing the video",
  captions: "Writing captions",
  trends: "Researching trends",
  chat: "Thinking",
  post: "Posting",
};

export function ShellProvider({ children, openCommand }: { children: React.ReactNode; openCommand: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sheetRun, setSheetRun] = useState<string | null>(null);

  // Pick up runs already in flight on load.
  useEffect(() => {
    api<Run[]>("/api/agents/runs")
      .then((runs) =>
        setTasks((cur) => [
          ...cur,
          ...runs.filter((r) => r.status === "running").map((r) => ({ kind: "run" as const, id: r.id, runKind: r.kind, title: r.title, engine: r.engine, status: r.status, projectId: r.projectId })),
        ]),
      )
      .catch(() => undefined);
  }, []);

  const upsert = useCallback((t: Task) => {
    setTasks((cur) => {
      const i = cur.findIndex((x) => x.kind === t.kind && x.id === t.id);
      if (i === -1) return [...cur, t];
      const next = [...cur];
      next[i] = { ...cur[i], ...t } as Task;
      return next;
    });
  }, []);

  const dismiss = useCallback((kind: Task["kind"], id: string, after = 0) => {
    setTimeout(() => setTasks((cur) => cur.filter((x) => !(x.kind === kind && x.id === id))), after);
  }, []);

  useServerEvents(
    (e) => {
      if (e.type === "run") {
        const r = e.run;
        upsert({ kind: "run", id: r.id, runKind: r.kind, title: r.title, engine: r.engine, status: r.status, projectId: r.projectId, output: r.output });
        if (r.status !== "running") {
          dismiss("run", r.id, 5000);
          if (r.projectId) refresh(`/api/projects/${r.projectId}`);
          refresh("/api/bootstrap");
          refresh("/api/agents");
          // The editor reports its own agent edits (with Undo), so don't double up there.
          const inEditor = typeof window !== "undefined" && window.location.pathname.startsWith("/edit/") && ["edit", "captions"].includes(r.kind);
          if (r.status === "done" && !inEditor) toast.success(`${r.engine === "codex" ? "Codex" : "Claude"} finished: ${r.title}`, { action: { label: "View", onClick: () => setSheetRun(r.id) } });
          if (r.status === "failed" && !inEditor) toast.error(`${r.title} failed`, { description: r.error?.slice(0, 160), action: { label: "Details", onClick: () => setSheetRun(r.id) } });
        }
      } else if (e.type === "run-event") {
        if (e.event.kind === "tool" || e.event.kind === "text" || e.event.kind === "status")
          setTasks((cur) =>
            cur.map((t) => (t.kind === "run" && t.id === e.runId ? { ...t, last: e.event.kind === "tool" ? `${e.event.tool} ${e.event.detail ?? ""}` : (e.event.text ?? "").slice(0, 90) } : t)),
          );
      } else if (e.type === "render") {
        upsert({ kind: "render", id: e.videoId, projectId: e.projectId, progress: e.progress ?? 0, status: e.status === "rendered" ? "rendered" : e.status === "failed" ? "failed" : "rendering", error: e.error });
        if (e.status === "rendered" || e.status === "failed") {
          dismiss("render", e.videoId, 4000);
          refresh(`/api/projects/${e.projectId}/videos`);
          if (e.status === "failed") toast.error("Render failed", { description: e.error?.slice(0, 200) });
        }
      } else if (e.type === "post") {
        refresh(`/api/projects/${e.post.projectId}/posts`);
        refresh("/api/posts");
        if (e.post.status === "posted") toast.success(`Posted to ${e.post.platforms.join(", ")}`);
        if (e.post.status === "failed") toast.error("A post failed", { description: e.post.log.at(-1) });
      } else if (e.type === "ideas") refresh(`/api/projects/${e.projectId}/ideas`);
      else if (e.type === "videos") refresh(`/api/projects/${e.projectId}/videos`);
      else if (e.type === "project") {
        refresh(`/api/projects/${e.projectId}`);
        refresh("/api/bootstrap");
      }
    },
    [upsert, dismiss],
  );

  return (
    <ShellCtx.Provider value={{ openRun: setSheetRun, openCommand }}>
      {children}
      <Dock tasks={tasks} onOpen={setSheetRun} />
      <RunSheet runId={sheetRun} onClose={() => setSheetRun(null)} />
    </ShellCtx.Provider>
  );
}

function taskSummary(t: Task): { label: string; tone: "busy" | "ok" | "bad" } {
  if (t.kind === "run") {
    const who = t.engine === "codex" ? "Codex" : "Claude";
    if (t.status === "running") return { label: `${who} · ${KIND_LABEL[t.runKind] ?? t.title}`, tone: "busy" };
    return { label: t.status === "done" ? `${who} finished` : `${who} failed`, tone: t.status === "done" ? "ok" : "bad" };
  }
  if (t.kind === "render") {
    if (t.status === "rendered") return { label: "Render finished", tone: "ok" };
    if (t.status === "failed") return { label: "Render failed", tone: "bad" };
    return { label: t.progress >= 0.99 ? "Finishing render" : `Rendering · ${Math.round(t.progress * 100)}%`, tone: "busy" };
  }
  return { label: t.label, tone: "busy" };
}

/**
 * Background work, bottom-right. Collapsed it's a small pill (so it never sits on top of real
 * controls); hover or focus expands it into cards that say what's happening and link to it.
 */
function Dock({ tasks: all, onOpen }: { tasks: Task[]; onOpen: (id: string) => void }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  // In the editor, that video's render shows on the Render button itself: don't double up.
  const tasks = all.filter((t) => !(t.kind === "render" && pathname === `/edit/${t.projectId}/${t.id}`)).slice(-4);
  const lead = tasks.find((t) => taskSummary(t).tone === "busy") ?? tasks.at(-1);
  if (!lead) return null;
  const sum = taskSummary(lead);
  const busy = tasks.filter((t) => taskSummary(t).tone === "busy").length;

  return (
    <div
      className="fixed right-4 bottom-4 z-[80] flex w-[320px] flex-col items-end gap-2 pointer-events-none"
      onMouseLeave={() => setExpanded(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setExpanded(false);
      }}
    >
      <AnimatePresence initial={false}>
        {expanded &&
          tasks.map((t) => (
            <motion.div
              key={`${t.kind}-${t.id}`}
              layout
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.12 } }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="pointer-events-auto w-full origin-bottom-right"
            >
              <TaskCard t={t} onOpen={onOpen} />
            </motion.div>
          ))}
      </AnimatePresence>
      <motion.button
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onMouseEnter={() => setExpanded(true)}
        onFocus={() => setExpanded(true)}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`Background work: ${sum.label}`}
        className="pointer-events-auto flex h-8 max-w-full items-center gap-2 rounded-full border border-line bg-raised/95 pr-3 pl-2.5 text-[12px] font-medium text-fg-2 shadow-xl backdrop-blur transition-colors hover:border-line-strong hover:text-fg"
      >
        {sum.tone === "busy" ? <Loader2 className="size-3.5 shrink-0 animate-spin text-accent" /> : sum.tone === "ok" ? <Check className="size-3.5 shrink-0 text-ok" /> : <X className="size-3.5 shrink-0 text-bad" />}
        <span className="truncate tabular-nums">{sum.label}</span>
        {tasks.length > 1 && <span className="rounded-full bg-hover px-1.5 font-mono text-[10px] text-fg-3">{busy > 1 ? `${busy} running` : `+${tasks.length - 1}`}</span>}
      </motion.button>
    </div>
  );
}

function TaskCard({ t, onOpen }: { t: Task; onOpen: (id: string) => void }) {
  const card = "flex w-full items-center gap-3 rounded-xl border border-line bg-raised/95 px-3.5 py-3 text-left shadow-2xl backdrop-blur transition-colors hover:border-line-strong";
  if (t.kind === "run")
    return (
      <button onClick={() => onOpen(t.id)} className={card}>
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", t.status === "running" ? "bg-accent-soft text-accent" : t.status === "done" ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad")}>
          {t.status === "running" ? <Bot className="size-4" /> : t.status === "done" ? <Check className="size-4" /> : <X className="size-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{t.status === "running" ? `${t.engine === "codex" ? "Codex" : "Claude"} · ${KIND_LABEL[t.runKind] ?? t.title}` : t.title}</span>
          <span className="block truncate font-mono text-[11px] text-fg-3">{t.status === "running" ? (t.last ?? "starting…") : t.status === "done" ? "Done — open to see what it did" : "Failed — open for details"}</span>
        </span>
        {t.status === "running" && <Loader2 className="size-4 shrink-0 animate-spin text-fg-3" />}
      </button>
    );
  if (t.kind === "render") return <RenderCard t={t} className={card} />;
  return (
    <div className={card}>
      <Send className="size-4 text-fg-3" />
      <span className="text-[13px]">{t.label}</span>
    </div>
  );
}

function RenderCard({ t, className }: { t: Extract<Task, { kind: "render" }>; className: string }) {
  const { data: videos } = useApi<VideoDoc[]>(`/api/projects/${t.projectId}/videos`);
  const video = videos?.find((v) => v.id === t.id);
  const pct = Math.round(t.progress * 100);
  return (
    <Link href={`/edit/${t.projectId}/${t.id}`} className={className}>
      <span className="h-[43px] w-6 shrink-0 overflow-hidden rounded-[4px] bg-hover">
        {video && <Reel spec={video.spec} projectId={t.projectId} mode="thumb" rounded={false} className="pointer-events-none h-full w-full" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2 text-[13px] font-medium">
          <span className="truncate">{video?.spec.title ?? "Video"}</span>
          <span className="shrink-0 font-mono text-[11px] text-fg-3 tabular-nums">{t.status === "rendered" ? <Check className="size-3.5 text-ok" /> : t.status === "failed" ? "failed" : pct >= 99 ? "finishing" : `${pct}%`}</span>
        </span>
        <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-hover">
          <span className={cn("block h-full rounded-full transition-[width] duration-300", t.status === "failed" ? "bg-bad" : t.status === "rendered" ? "bg-ok" : "bg-accent")} style={{ width: `${t.status === "rendered" ? 100 : pct}%` }} />
        </span>
      </span>
    </Link>
  );
}

function RunSheet({ runId, onClose }: { runId: string | null; onClose: () => void }) {
  const { run } = useRun(runId);
  return (
    <DialogPrimitive.Root open={!!runId} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/40 data-[state=closed]:animate-[fade-out_160ms_ease-in_forwards] data-[state=open]:animate-[fade-in_0.15s_ease-out]" />
        <DialogPrimitive.Content className="fixed top-2 right-2 bottom-2 z-[100] flex w-[560px] max-w-[calc(100vw-16px)] flex-col rounded-2xl border border-line bg-panel shadow-2xl focus:outline-none data-[state=closed]:animate-[slide-out-right_160ms_var(--ease-in)_forwards] data-[state=open]:animate-[slide-in-right_240ms_var(--ease-out)]">
          <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Bot className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="truncate text-[14px] font-semibold">{run?.title ?? "Agent run"}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-fg-3">
                {run ? `${run.engine === "codex" ? "Codex" : "Claude Code"} · ${new Date(run.startedAt).toLocaleTimeString()}${run.costUsd ? ` · ~$${run.costUsd.toFixed(3)} API-equivalent` : ""}` : "Loading…"}
              </DialogPrimitive.Description>
            </div>
            {run && <Badge tone={run.status === "running" ? "accent" : run.status === "done" ? "ok" : "bad"}>{run.status === "running" ? "Running" : run.status === "done" ? "Done" : "Failed"}</Badge>}
            {run?.status === "running" && (
              <Button size="sm" variant="ghost" icon={<Square className="size-3.5" />} onClick={() => run && del(`/api/agents/runs/${run.id}`)}>
                Stop
              </Button>
            )}
            <DialogPrimitive.Close className="rounded-md p-1 text-fg-3 hover:bg-hover hover:text-fg" aria-label="Close">
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          {runId && <AgentConsole runId={runId} className="flex-1 px-5 py-4" />}
          {run?.output?.videoId && run.projectId && (
            <div className="border-t border-line px-5 py-3">
              <Link href={`/edit/${run.projectId}/${run.output.videoId}`} onClick={onClose} className={buttonClass({ variant: "primary", className: "w-full" })}>
                Open the video
              </Link>
            </div>
          )}
          {run?.output?.ideaIds && (
            <div className="border-t border-line px-5 py-3">
              <Link href="/ideas" onClick={onClose} className={buttonClass({ variant: "primary", className: "w-full" })}>
                Review {run.output.ideaIds.length} new ideas
              </Link>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
