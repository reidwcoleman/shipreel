"use client";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Code2, FolderOpen, Link2, Loader2, PenLine, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AgentConsole } from "@/components/agents/console";
import { Reel } from "@/components/reel";
import { Logo } from "@/components/shell/sidebar";
import { Button } from "@/components/ui/button";
import { AppToaster, Motion } from "@/components/ui/toaster";
import { Input, inputCls, Textarea } from "@/components/ui/field";
import { Badge, Segmented } from "@/components/ui/misc";
import { buildSpec } from "@/framework/formats";
import { api, patch, post, put, refresh, useApi } from "@/lib/client/api";
import { useServerEvents } from "@/lib/client/events";
import { useBootstrap } from "@/lib/client/store";
import { cn } from "@/lib/cn";
import type { Idea, Project, Run } from "@/lib/types";
import { DEMO_SPEC } from "@/remotion/demo";

type Source = "code" | "link" | "describe";
type Step = "source" | "reading" | "brief" | "ideas";
type FsEntry = { name: string; path: string; kind?: string; isGit: boolean };

const ease = [0.22, 1, 0.36, 1] as const;

export default function Welcome() {
  return (
    <Motion>
      <Tooltip.Provider delayDuration={300}>
        <Onboarding />
        <AppToaster />
      </Tooltip.Provider>
    </Motion>
  );
}

function prettyName(folder: string) {
  const base = folder.split("/").filter(Boolean).pop() ?? folder;
  return base.replace(/[-_]+/g, " ").replace(/\b(ios|app|web)\b/gi, "").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase()) || base;
}

function Onboarding() {
  const router = useRouter();
  const { data: boot } = useBootstrap();
  const [step, setStep] = useState<Step>("source");
  const [source, setSource] = useState<Source>("code");
  const [folder, setFolder] = useState("");
  const [link, setLink] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [engine, setEngine] = useState<"claude" | "codex">("claude");
  const [busy, setBusy] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const { data: fs } = useApi<{ suggestions: FsEntry[]; root: string }>("/api/fs");

  const claude = boot?.agents.find((a) => a.engine === "claude");
  const codex = boot?.agents.find((a) => a.engine === "codex");
  const hasProjects = (boot?.projects.length ?? 0) > 0;
  useEffect(() => {
    if (boot && !claude?.installed && codex?.installed) setEngine("codex");
  }, [boot, claude?.installed, codex?.installed]);

  useServerEvents(
    (e) => {
      if (e.type !== "run" || e.run.id !== runId || e.run.status === "running") return;
      if (e.run.status === "done" && project) {
        api<{ project: Project }>(`/api/projects/${project.id}`).then((d) => {
          setProject(d.project);
          setStep("brief");
        });
      } else setFailed(e.run.error ?? "The agent stopped before finishing.");
    },
    [runId, project?.id],
  );

  const canGo = source === "code" ? !!folder.trim() : source === "link" ? /^https?:\/\/|^\d{6,}$/.test(link.trim()) : !!name.trim() && !!desc.trim();

  const start = async () => {
    setBusy(true);
    setFailed(null);
    try {
      let p: Project;
      if (source === "link") {
        const info = await post<{ source: string; name?: string; title?: string; description?: string; category?: string; appStore?: string; siteName?: string }>("/api/import", { url: link.trim() });
        const appName = info.name ?? info.siteName ?? info.title?.split(/[|–—-]/)[0]?.trim() ?? "My app";
        p = await post<Project>("/api/projects", {
          name: appName,
          oneLiner: (info.description ?? "").split(/(?<=[.!?])\s/)[0]?.slice(0, 160) ?? "",
          category: info.category ?? "",
          links: info.source === "appstore" ? { appStore: info.appStore ?? link.trim() } : { website: link.trim() },
        });
        if (info.source === "appstore") await post("/api/import", { url: link.trim(), projectId: p.id, importMedia: true }).catch(() => undefined);
      } else if (source === "code") {
        p = await post<Project>("/api/projects", { name: prettyName(folder), links: { repoPath: folder.trim() } });
      } else {
        p = await post<Project>("/api/projects", { name: name.trim(), oneLiner: desc.trim() });
      }
      await patch(`/api/projects/${p.id}`, { activate: true });
      setProject(p);
      const agentReady = engine === "claude" ? claude?.installed : true;
      if (!agentReady) {
        setStep("brief");
        return;
      }
      const run = await post<Run>(`/api/projects/${p.id}/analyze`, { engine, repoPath: source === "code" ? folder.trim() : undefined, url: source === "link" ? link.trim() : undefined, notes: source === "describe" ? desc.trim() : undefined });
      setRunId(run.id);
      setStep("reading");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const finish = async (to: string) => {
    await put("/api/settings", { onboarded: true });
    await refresh("/api/");
    router.push(to);
  };

  const steps: Step[] = ["source", "reading", "brief", "ideas"];

  return (
    <div className="relative flex min-h-screen flex-col overflow-y-auto bg-bg" style={{ height: "100vh" }}>
      <Backdrop />
      <header className="relative z-10 flex items-center gap-3 px-8 py-6">
        <Logo size={26} />
        <span className="text-[15px] font-semibold tracking-tight">Shipreel</span>
        <div className="ml-6 flex items-center gap-1.5" aria-label="Progress">
          {steps.map((s, i) => (
            <span key={s} className={cn("h-1 rounded-full transition-all duration-500", steps.indexOf(step) >= i ? "w-8 bg-accent" : "w-4 bg-hover")} />
          ))}
        </div>
        {hasProjects && (
          <Link href="/" className="ml-auto text-[13px] text-fg-3 hover:text-fg">
            Skip to the app
          </Link>
        )}
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-[1180px] flex-1 items-start px-8 pt-6 pb-16">
        <AnimatePresence mode="wait">
          {step === "source" && (
            <motion.div key="source" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease }} className="grid w-full items-center gap-12 lg:grid-cols-[1fr_340px]">
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                  <h1 className="font-display text-[64px] leading-[0.95] tracking-[-0.02em] text-fg">
                    Your app deserves
                    <br />
                    <span className="text-accent italic">an audience.</span>
                  </h1>
                  <p className="max-w-[520px] text-[17px] leading-relaxed text-fg-2">Point Shipreel at your project. Claude Code or Codex reads it, writes hooks that are working right now, builds the videos, and posts them on schedule.</p>
                </div>

                <div className="flex max-w-[620px] flex-col gap-4 rounded-2xl border border-line bg-panel/80 p-5 backdrop-blur">
                  <Segmented
                    layoutId="src"
                    value={source}
                    onChange={setSource}
                    className="self-start"
                    options={[
                      { value: "code", label: "My code", icon: <Code2 className="size-3.5" /> },
                      { value: "link", label: "A link", icon: <Link2 className="size-3.5" /> },
                      { value: "describe", label: "Describe it", icon: <PenLine className="size-3.5" /> },
                    ]}
                  />
                  {source === "code" && (
                    <div className="flex flex-col gap-3">
                      <div className="relative">
                        <FolderOpen className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-3" />
                        <input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="/Users/you/code/my-app" className={cn(inputCls, "h-11 pl-9 font-mono text-[13px]")} aria-label="Project folder" />
                      </div>
                      {!!fs?.suggestions.length && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs text-fg-3">Recent projects in {fs.root.replace(/^\/Users\/[^/]+/, "~")}</span>
                          <div className="flex max-h-[168px] flex-wrap gap-1.5 overflow-y-auto">
                            {fs.suggestions.map((s) => (
                              <button
                                key={s.path}
                                onClick={() => setFolder(s.path)}
                                className={cn("flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] transition-colors", folder === s.path ? "border-accent/60 bg-accent-soft text-fg" : "border-line text-fg-2 hover:border-line-strong hover:text-fg")}
                              >
                                {folder === s.path && <Check className="size-3.5 text-accent" />}
                                {s.name}
                                <span className="text-[11px] text-fg-3">{s.kind}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {source === "link" && <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://apps.apple.com/app/… or https://yourapp.com" className="h-11" autoFocus />}
                  {source === "describe" && (
                    <div className="flex flex-col gap-2">
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="App name" className="h-11" autoFocus />
                      <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="What it does and who it's for. e.g. “Texts you when you skip the gym, so you actually go. For people who keep quitting.”" />
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
                    <span className="text-xs text-fg-3">Read by</span>
                    <Segmented
                      layoutId="eng"
                      size="sm"
                      value={engine}
                      onChange={setEngine}
                      options={[
                        { value: "claude", label: <span className="flex items-center gap-1.5">Claude Code {claude?.installed ? <span className="size-1.5 rounded-full bg-ok" /> : null}</span> },
                        { value: "codex", label: <span className="flex items-center gap-1.5">Codex {codex?.installed ? <span className="size-1.5 rounded-full bg-ok" /> : <span className="text-fg-3">· npx</span>}</span> },
                      ]}
                    />
                    <span className="text-[11px] text-fg-3">Read-only. Nothing in your code changes.</span>
                    <Button variant="primary" size="lg" className="ml-auto" loading={busy} disabled={!canGo} onClick={start} icon={!busy ? <Sparkles className="size-4" /> : undefined}>
                      Read my product
                    </Button>
                  </div>
                </div>
              </div>
              <div className="relative hidden lg:block">
                <div className="absolute -inset-10 rounded-full bg-accent/10 blur-3xl" />
                <motion.div initial={{ rotate: 0, y: 20, opacity: 0 }} animate={{ rotate: -3, y: 0, opacity: 1 }} transition={{ duration: 0.8, ease, delay: 0.15 }}>
                  <Reel spec={DEMO_SPEC} mode="play" skin="tiktok" className="w-full shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] ring-1 ring-white/10" username="gymghost" />
                </motion.div>
                <p className="mt-5 text-center text-xs text-fg-3">Made by Shipreel from one sentence. Yours will use your real screens.</p>
              </div>
            </motion.div>
          )}

          {step === "reading" && project && runId && (
            <motion.div key="reading" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease }} className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
              <div className="flex flex-col gap-2">
                <span className="flex items-center gap-2 text-[13px] text-accent">
                  {failed ? null : <Loader2 className="size-3.5 animate-spin" />}
                  {failed ? "Stopped" : `${engine === "codex" ? "Codex" : "Claude"} is reading ${project.name}`}
                </span>
                <h1 className="font-display text-[44px] leading-tight tracking-[-0.01em]">{failed ? "That didn't finish." : "Finding what makes it worth watching."}</h1>
                <p className="text-[15px] leading-relaxed text-fg-2">{failed ? failed : "It's reading screens, onboarding copy, pricing and recent commits to write the brief every video is built from. About a minute."}</p>
              </div>
              <div className="h-[380px] overflow-hidden rounded-2xl border border-line bg-panel/90 backdrop-blur">
                <AgentConsole runId={runId} className="h-full px-5 py-4" />
              </div>
              {failed && (
                <div className="flex gap-2">
                  <Button variant="primary" onClick={start}>
                    Try again
                  </Button>
                  <Button variant="ghost" onClick={() => setStep("brief")}>
                    Fill it in myself
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {step === "brief" && project && (
            <motion.div key="brief" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.45, ease }} className="mx-auto flex w-full max-w-[920px] flex-col gap-6">
              <BriefReveal project={project} />
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="lg" icon={<ArrowRight className="size-4" />} onClick={() => setStep("ideas")}>
                  Looks right. Show me videos
                </Button>
                <Button variant="ghost" onClick={() => finish("/product")}>
                  Fix something first
                </Button>
              </div>
            </motion.div>
          )}

          {step === "ideas" && project && (
            <motion.div key="ideas" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.45, ease }} className="w-full">
              <FirstIdeas project={project} onDone={finish} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -top-40 -left-40 size-[620px] rounded-full bg-[oklch(0.93_0.2_122/0.08)] blur-[120px]" />
      <div className="absolute top-1/3 -right-40 size-[520px] rounded-full bg-[oklch(0.7_0.12_200/0.07)] blur-[120px]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(1_0_0/0.025)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/0.025)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] bg-[size:56px_56px]" />
    </div>
  );
}

function BriefReveal({ project: p }: { project: Project }) {
  const col = (title: string, items: string[], tone: string) => (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold tracking-[0.08em] text-fg-3 uppercase">{title}</span>
      <ul className="flex flex-col gap-1.5">
        {items.slice(0, 4).map((x, i) => (
          <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.06, duration: 0.3 }} className="flex gap-2 text-[14px] leading-snug text-fg-2">
            <span className={cn("mt-[7px] size-1.5 shrink-0 rounded-full", tone)} />
            {x}
          </motion.li>
        ))}
        {items.length === 0 && <li className="text-[13px] text-fg-3">Add these on the Product page.</li>}
      </ul>
    </div>
  );
  return (
    <div className="flex flex-col gap-7 rounded-3xl border border-line bg-panel/90 p-8 backdrop-blur">
      <div className="flex items-start gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-[28%] text-2xl font-bold text-black" style={{ background: p.brand.accent || "var(--color-accent)" }}>
          {p.name[0]?.toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex items-center gap-2 text-[13px] text-fg-3">
            {p.category || "Your product"} {p.analyzedBy && <Badge tone="accent">Read by {p.analyzedBy === "codex" ? "Codex" : "Claude"}</Badge>}
          </span>
          <h1 className="font-display text-[42px] leading-[1.05] tracking-[-0.01em]">{p.tagline || p.name}</h1>
          <p className="text-[15px] leading-relaxed text-fg-2">{p.oneLiner}</p>
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {col("Who it's for", p.audience.map((a) => a.name + (a.description ? ` — ${a.description}` : "")), "bg-info")}
        {col("What hurts", p.pains, "bg-bad")}
        {col("What they get", p.outcomes, "bg-ok")}
      </div>
      {p.features.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold tracking-[0.08em] text-fg-3 uppercase">Best on camera</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {p.features.slice(0, 4).map((f, i) => (
              <div key={i} className="flex flex-col gap-0.5 rounded-xl border border-line bg-bg/50 px-4 py-3">
                <span className="text-[14px] font-medium">{f.name}</span>
                <span className="text-[13px] text-fg-3">{f.wow ? `Show: ${f.wow}` : f.benefit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FirstIdeas({ project, onDone }: { project: Project; onDone: (to: string) => void }) {
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [making, setMaking] = useState<string | null>(null);
  const asked = useRef(false);
  useEffect(() => {
    // Once per mount (dev StrictMode runs effects twice; two batches would duplicate ideas).
    if (asked.current) return;
    asked.current = true;
    post<{ ideas?: Idea[] }>(`/api/projects/${project.id}/ideas`, { engine: "instant", count: 6 })
      .then((r) => setIdeas(r.ideas ?? []))
      .catch(() => setIdeas([]));
  }, [project.id]);
  const specs = useMemo(() => new Map((ideas ?? []).map((i) => [i.id, buildSpec(i.formatId, { project, hook: i.hook, media: [], seed: 5 })])), [ideas, project]);
  const make = async (idea: Idea) => {
    setMaking(idea.id);
    try {
      const r = await post<{ videoId: string }>(`/api/projects/${project.id}/ideas/${idea.id}/make`, { engine: "instant" });
      await onDone(`/edit/${project.id}/${r.videoId}`);
    } catch (e) {
      toast.error((e as Error).message);
      setMaking(null);
    }
  };
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-accent">Your first batch</span>
          <h1 className="font-display text-[48px] leading-tight tracking-[-0.01em]">Pick one to make.</h1>
          <p className="max-w-[560px] text-[15px] leading-relaxed text-fg-2">Built from {project.name}&apos;s brief with formats that are working this month. Open one in the editor, or swipe through more in the Hook Lab.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => onDone("/ideas")}>
            Open the Hook Lab
          </Button>
          <Button onClick={() => onDone("/")} icon={<ChevronRight className="size-4" />}>
            Go to Home
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
        {(ideas ?? Array.from({ length: 6 }).map(() => null)).map((idea, i) =>
          idea ? (
            <motion.button
              key={idea.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4, ease }}
              onClick={() => make(idea)}
              disabled={!!making}
              className="group flex flex-col gap-2.5 text-left disabled:opacity-60"
            >
              <div className="relative">
                <Reel letterbox spec={specs.get(idea.id)} projectId={project.id} mode="hover" className="ring-1 ring-line transition-all duration-200 group-hover:-translate-y-1 group-hover:ring-accent/60" />
                {making === idea.id && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60">
                    <Loader2 className="size-6 animate-spin" />
                  </span>
                )}
              </div>
              <span className="line-clamp-3 text-[13px] leading-snug font-medium text-fg">{idea.hook}</span>
            </motion.button>
          ) : (
            <div key={i} className="skeleton aspect-[9/16] rounded-xl" />
          ),
        )}
      </div>
      <Link href="/" onClick={(e) => { e.preventDefault(); onDone("/"); }} className="flex items-center gap-1.5 self-start text-[13px] text-fg-3 hover:text-fg">
        <ArrowLeft className="size-3.5" /> I&apos;ll explore first
      </Link>
    </div>
  );
}
