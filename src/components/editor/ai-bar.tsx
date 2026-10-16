"use client";
import { ArrowUp, Loader2, Sparkles, Square } from "lucide-react";
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { toast } from "sonner";
import { Tip } from "@/components/ui/button";
import { del, post } from "@/lib/client/api";
import { useServerEvents } from "@/lib/client/events";
import { useBootstrap } from "@/lib/client/store";
import { cn } from "@/lib/cn";
import type { AgentEngine, Run } from "@/lib/types";

const SUGGESTIONS = ["Make the hook punchier", "Cut it to 10 seconds", "Rewrite for founders", "Add a face-cam reaction", "Make it funnier", "Stronger ending"];

export type AiBarHandle = { ask: (instruction: string) => void; fill: (instruction: string) => void };

/**
 * "Tell the agent what to change": runs Claude Code or Codex on the video's JSON spec using the
 * Shipreel framework, then hands the result back to the editor (undoable).
 */
export const AiBar = forwardRef<AiBarHandle, { projectId: string; videoId: string; beforeRun: () => Promise<void>; onDone: (run: Run) => void; running: Run | null; setRunning: (r: Run | null) => void }>(function AiBar(
  { projectId, videoId, beforeRun, onDone, running, setRunning },
  ref,
) {
  const { data: boot } = useBootstrap();
  const [text, setText] = useState("");
  const [engine, setEngine] = useState<AgentEngine | null>(null);
  const [last, setLast] = useState<string>("");
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const eng: AgentEngine = engine ?? boot?.settings.engine ?? "claude";
  const agent = boot?.agents.find((a) => a.engine === eng);
  const label = eng === "codex" ? "Codex" : "Claude";

  useServerEvents(
    (e) => {
      if (!running) return;
      if (e.type === "run-event" && e.runId === running.id) {
        const ev = e.event;
        if (ev.kind === "tool") setLast(`${ev.tool} ${ev.detail ?? ""}`.slice(0, 80));
        else if (ev.kind === "text" && ev.text) setLast(ev.text.replace(/\s+/g, " ").slice(0, 80));
      }
      if (e.type === "run" && e.run.id === running.id && e.run.status !== "running") {
        setRunning(null);
        setLast("");
        if (e.run.status === "done") onDone(e.run);
        else if (e.run.status === "failed") toast.error(`${label} couldn't make that edit`, { description: e.run.error?.slice(0, 200) });
      }
    },
    [running?.id, label],
  );

  const ask = async (instruction: string) => {
    const t = instruction.trim();
    if (!t || running) return;
    try {
      await beforeRun();
      const run = await post<Run>(`/api/projects/${projectId}/videos/${videoId}/ai`, { instruction: t, engine: eng });
      setRunning(run);
      setText("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  /** Suggestions only fill the box (and select it), so nothing paid starts without a deliberate ↵. */
  const fill = (instruction: string) => {
    if (running) return;
    setText(instruction);
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.select();
    });
  };

  useImperativeHandle(ref, () => ({ ask, fill }));

  return (
    <div className="relative flex shrink-0 flex-col gap-2 px-4 pb-4">
      {/* Suggestions float above the box only while it's focused and empty: no permanent layout height, so the preview gets the room. */}
      {!running && focused && !text && (
        <div className="absolute inset-x-4 bottom-full z-10 mb-1 flex flex-wrap justify-center gap-1.5 animate-[rise_0.15s_var(--ease-out)]">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => fill(s)} className="h-6 rounded-full border border-line bg-raised px-2.5 text-[11px] text-fg-2 shadow-lg transition-colors hover:border-line-strong hover:text-fg">
              {s}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
        className={cn(
          "mx-auto flex w-full max-w-[640px] items-center gap-2 rounded-xl border bg-raised py-1.5 pr-1.5 pl-3 shadow-lg transition-colors focus-within:border-accent/50",
          running ? "border-accent/40" : "border-line",
        )}
      >
        {running ? <Loader2 className="size-4 shrink-0 animate-spin text-accent" /> : <Sparkles className="size-4 shrink-0 text-accent" />}
        {running ? (
          <span className="min-w-0 flex-1 truncate py-1 text-[13px] text-fg-2">
            {label} is editing… <span className="font-mono text-[11px] text-fg-3">{last}</span>
          </span>
        ) : (
          <input
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={`Tell ${label} what to change… (“open with the price shock”, “make it a POV”)`}
            className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-fg placeholder:text-fg-3 focus:outline-none"
            aria-label={`Instruction for ${label}`}
          />
        )}
        <Tip label={agent?.installed === false ? `${label} isn't set up yet (Agents page)` : `Switch to ${eng === "codex" ? "Claude" : "Codex"}`}>
          <button
            type="button"
            disabled={!!running}
            onClick={() => setEngine(eng === "codex" ? "claude" : "codex")}
            className={cn("flex h-7 items-center gap-1.5 rounded-md border border-line px-2 text-[11px] font-medium text-fg-2 hover:text-fg disabled:opacity-50", agent?.installed === false && "text-warn")}
          >
            <span className={cn("size-1.5 rounded-full", agent?.installed === false ? "bg-warn" : "bg-ok")} />
            {label}
          </button>
        </Tip>
        {running ? (
          <Tip label="Stop">
            <button type="button" onClick={() => del(`/api/agents/runs/${running.id}`)} className="flex size-8 items-center justify-center rounded-lg bg-hover text-fg hover:bg-press" aria-label="Stop the agent">
              <Square className="size-3.5 fill-current" />
            </button>
          </Tip>
        ) : (
          <button type="submit" disabled={!text.trim()} className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-ink transition-colors disabled:bg-hover disabled:text-fg-3" aria-label="Send">
            <ArrowUp className="size-4" strokeWidth={2.5} />
          </button>
        )}
      </form>
    </div>
  );
});
