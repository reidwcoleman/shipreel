"use client";
import { AlertTriangle, Check, CircleDot, FileSearch, Globe, Pencil, Search, Sparkles, SquareTerminal, Wrench } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client/api";
import { useServerEvents } from "@/lib/client/events";
import { cn } from "@/lib/cn";
import type { Run, RunEvent } from "@/lib/types";

const TOOL_ICON: Record<string, React.ReactNode> = {
  Read: <FileSearch className="size-3.5" />,
  Glob: <Search className="size-3.5" />,
  Grep: <Search className="size-3.5" />,
  LS: <Search className="size-3.5" />,
  Bash: <SquareTerminal className="size-3.5" />,
  Shell: <SquareTerminal className="size-3.5" />,
  Edit: <Pencil className="size-3.5" />,
  Write: <Pencil className="size-3.5" />,
  WebSearch: <Globe className="size-3.5" />,
  WebFetch: <Globe className="size-3.5" />,
};

export function fmtT(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function useRun(runId: string | null) {
  const [run, setRun] = useState<Run | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  useEffect(() => {
    if (!runId) return;
    let alive = true;
    setRun(null);
    setEvents([]);
    api<{ run: Run; events: RunEvent[] }>(`/api/agents/runs/${runId}`)
      .then((r) => {
        if (!alive) return;
        setRun(r.run);
        setEvents((cur) => (cur.length > r.events.length ? cur : r.events));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [runId]);
  useServerEvents(
    (e) => {
      if (!runId) return;
      if (e.type === "run-event" && e.runId === runId) setEvents((cur) => [...cur, e.event]);
      if (e.type === "run" && e.run.id === runId) setRun(e.run);
    },
    [runId],
  );
  return { run, events };
}

/** Live view of an agent working: tool calls as chips, its words as text, errors in red. */
export function AgentConsole({ runId, className, compact }: { runId: string; className?: string; compact?: boolean }) {
  const { run, events } = useRun(runId);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [events.length]);
  const running = run?.status === "running";
  return (
    <div className={cn("flex min-h-0 flex-col overflow-y-auto font-mono text-[12.5px] leading-relaxed", className)}>
      {events.length === 0 && (
        <div className="flex items-center gap-2 text-fg-3">
          <CircleDot className="size-3.5 animate-pulse text-accent" /> Starting {run?.engine === "codex" ? "Codex" : "Claude Code"}…
        </div>
      )}
      <ol className="flex flex-col gap-1.5">
        {events.map((e, i) => (
          <li key={i} className="flex gap-3 animate-[rise_0.2s_ease-out]">
            {!compact && <span className="w-9 shrink-0 text-right text-fg-3 tabular-nums">{fmtT(e.t)}</span>}
            <EventLine e={e} />
          </li>
        ))}
      </ol>
      {running && (
        <div className="mt-2 flex items-center gap-2 pl-12 text-fg-3">
          <span className="flex gap-0.5">
            {[0, 1, 2].map((d) => (
              <span key={d} className="size-1 animate-pulse rounded-full bg-accent" style={{ animationDelay: `${d * 150}ms` }} />
            ))}
          </span>
          working
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

function EventLine({ e }: { e: RunEvent }) {
  if (e.kind === "tool") {
    return (
      <span className="flex min-w-0 items-start gap-2">
        <span className="mt-px inline-flex h-5 shrink-0 items-center gap-1 rounded bg-hover px-1.5 font-sans text-[11px] font-medium text-fg-2">
          {TOOL_ICON[e.tool ?? ""] ?? <Wrench className="size-3.5" />}
          {e.tool}
        </span>
        <span className="min-w-0 text-fg-3 [overflow-wrap:anywhere]">{e.detail}</span>
      </span>
    );
  }
  if (e.kind === "text") return <span className="min-w-0 font-sans text-[13px] whitespace-pre-wrap text-fg [overflow-wrap:anywhere]">{e.text}</span>;
  if (e.kind === "error")
    return (
      <span className="flex items-start gap-2 font-sans text-[13px] text-bad">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <span className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{e.text}</span>
      </span>
    );
  if (e.kind === "result")
    return (
      <span className="flex items-center gap-2 font-sans text-[13px] font-medium text-ok">
        <Check className="size-3.5" /> {e.text}
      </span>
    );
  return (
    <span className="flex items-center gap-2 text-fg-3">
      <Sparkles className="size-3 shrink-0" />
      <span className="truncate">{e.text}</span>
    </span>
  );
}
