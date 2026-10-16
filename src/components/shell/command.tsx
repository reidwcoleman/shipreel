"use client";
import { Command } from "cmdk";
import { Bot, Clapperboard, CornerDownLeft, Lightbulb, Package, Plus, Sparkles, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { patch, post, refresh } from "@/lib/client/api";
import { useBootstrap, useFramework } from "@/lib/client/store";
import type { Run, VideoDoc } from "@/lib/types";
import { cn } from "@/lib/cn";
import { NAV, ProjectIcon } from "./sidebar";

export function CommandPalette({ open, setOpen, onRun }: { open: boolean; setOpen: (v: boolean) => void; onRun: (runId: string) => void }) {
  const router = useRouter();
  const { data } = useBootstrap();
  const { data: fw } = useFramework();
  const [query, setQuery] = useState("");
  const projectId = data?.activeProjectId;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const ask = async () => {
    if (!query.trim()) return;
    setOpen(false);
    try {
      const run = await post<Run>("/api/agents/runs", { kind: "chat", question: query, projectId });
      onRun(run.id);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const newVideo = async (formatId: string) => {
    if (!projectId) return go("/welcome");
    setOpen(false);
    const t = toast.loading("Building from the template…");
    try {
      const doc = await post<VideoDoc>(`/api/projects/${projectId}/videos`, { formatId });
      toast.success("Video ready to edit", { id: t });
      router.push(`/edit/${projectId}/${doc.id}`);
    } catch (e) {
      toast.error((e as Error).message, { id: t });
    }
  };

  const ideas = async (engine: "instant" | "claude") => {
    if (!projectId) return go("/welcome");
    setOpen(false);
    try {
      const r = await post<{ run?: Run }>(`/api/projects/${projectId}/ideas`, { engine, count: 10 });
      if (r.run) onRun(r.run.id);
      else toast.success("10 fresh ideas in the Hook Lab");
      await refresh(`/api/projects/${projectId}/ideas`);
      router.push("/ideas");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const agentName = data?.settings.engine === "codex" ? "Codex" : "Claude";
  const item = "flex h-9 cursor-pointer items-center gap-3 rounded-md px-3 text-sm text-fg-2 data-[selected=true]:bg-hover data-[selected=true]:text-fg";
  const group = "px-1.5 py-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-fg-3 [&_[cmdk-group-heading]]:uppercase";

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command menu"
      loop
      overlayClassName="fixed inset-0 z-[150] bg-black/55 backdrop-blur-[2px] data-[state=closed]:animate-[fade-out_120ms_ease-in_forwards] data-[state=open]:animate-[fade-in_0.12s_ease-out]"
      contentClassName="fixed top-[14vh] left-1/2 z-[151] w-[640px] max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl focus:outline-none data-[state=closed]:animate-[sink_120ms_var(--ease-in)_forwards] data-[state=open]:animate-[rise_0.18s_var(--ease-out)]"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Sparkles className="size-4 text-accent" />
        <Command.Input
          autoFocus
          value={query}
          onValueChange={setQuery}
          onKeyDown={(e) => {
            // ↵ opens the highlighted match; only ⌘↵ sends the query to the (paid) agent.
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void ask();
            }
          }}
          placeholder="Jump anywhere, make a video, or ask your agent…"
          className="h-13 min-w-0 flex-1 bg-transparent text-[15px] text-fg placeholder:text-fg-3 focus:outline-none"
        />
        {query.trim() && (
          <button onClick={() => void ask()} className="flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-fg-3 transition-colors hover:bg-hover hover:text-fg">
            <kbd className="rounded-xs border border-line bg-raised px-1 font-mono text-[11px]">⌘↵</kbd>
            Ask {agentName}
          </button>
        )}
      </div>
      <Command.List className="max-h-[56vh] overflow-y-auto py-1 [mask-image:linear-gradient(to_bottom,black_92%,transparent)]">
        <Command.Empty className="px-4 py-3 text-sm text-fg-3">No matches. ⌘↵ asks {agentName}.</Command.Empty>
          <Command.Group heading="Go to" className={group}>
            {NAV.map((n) => (
              <Command.Item key={n.href} value={`go ${n.label}`} onSelect={() => go(n.href)} className={item}>
                <n.icon className="size-4" />
                <span className="flex-1">{n.label}</span>
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Create" className={group}>
            <Command.Item value="generate ideas instantly" onSelect={() => ideas("instant")} className={item}>
              <Lightbulb className="size-4" />
              <span className="flex-1">10 ideas, instantly</span>
            </Command.Item>
            <Command.Item value="generate ideas with claude agent" onSelect={() => ideas("claude")} className={item}>
              <Bot className="size-4" />
              <span className="flex-1">10 ideas with your agent (reads your product)</span>
            </Command.Item>
            <Command.Item value="refresh trending sounds" onSelect={async () => { setOpen(false); const r = await post<Run>("/api/trends"); onRun(r.id); }} className={item}>
              <TrendingUp className="size-4" />
              <span className="flex-1">Refresh trending sounds</span>
            </Command.Item>
            {fw?.formats.map((f) => (
              <Command.Item key={f.id} value={`new video ${f.name} ${f.tagline}`} onSelect={() => newVideo(f.id)} className={item}>
                <Clapperboard className="size-4" />
                <span className="flex-1 truncate">
                  New {f.name} <span className="text-fg-3">— {f.tagline}</span>
                </span>
              </Command.Item>
            ))}
          </Command.Group>
          {(data?.projects.length ?? 0) > 0 && (
            <Command.Group heading="Products" className={group}>
              {data!.projects.map((p) => (
                <Command.Item
                  key={p.id}
                  value={`switch product ${p.name}`}
                  onSelect={async () => {
                    setOpen(false);
                    await patch(`/api/projects/${p.id}`, { activate: true });
                    await refresh("/api/");
                  }}
                  className={item}
                >
                  <ProjectIcon project={p} size={16} />
                  <span className="flex-1">{p.name}</span>
                </Command.Item>
              ))}
              <Command.Item value="add product new" onSelect={() => go("/welcome")} className={item}>
                <Plus className="size-4" />
                <span className="flex-1">Add a product</span>
              </Command.Item>
              <Command.Item value="product brief edit" onSelect={() => go("/product")} className={item}>
                <Package className="size-4" />
                <span className="flex-1">Edit the product brief</span>
              </Command.Item>
            </Command.Group>
          )}
          {query.trim() && (
            <div className={group}>
              <div className="px-2 pt-2 pb-1 text-[11px] font-semibold tracking-[0.08em] text-fg-3 uppercase">Agent</div>
              {/* Deliberately not a cmdk item: plain ↵ must never start a paid run by accident. */}
              <button onClick={() => void ask()} className={cn(item, "w-full text-left hover:bg-hover hover:text-fg")}>
                <Bot className="size-4 text-accent" />
                <span className="min-w-0 flex-1 truncate">
                  Ask {agentName}: <span className="text-fg">“{query}”</span>
                </span>
                <kbd className="rounded-xs border border-line bg-raised px-1 font-mono text-[11px] text-fg-3">⌘↵</kbd>
              </button>
            </div>
          )}
        </Command.List>
      <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-[11px] text-fg-3">
        <span>↑↓ navigate</span>
        <span className="flex items-center gap-1">
          <CornerDownLeft className="size-3" /> open
        </span>
        <span>⌘↵ ask {agentName}</span>
        <span className="ml-auto">esc to close</span>
      </div>
    </Command.Dialog>
  );
}

