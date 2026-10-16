"use client";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowUpRight, Check, Copy, ExternalLink, Flame, Link2, Music2, RefreshCw, Search, Sparkles, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { CloneDialog } from "@/components/clone-dialog";
import { Page, PageHeader } from "@/components/page";
import { Reel } from "@/components/reel";
import { useShell } from "@/components/shell/activity";
import { Button } from "@/components/ui/button";
import { inputCls } from "@/components/ui/field";
import { Badge, Empty, SectionLabel, Segmented } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/overlay";
import { buildSpec, fillHook } from "@/framework/formats";
import { PLAYBOOK } from "@/framework/playbook";
import { post } from "@/lib/client/api";
import { useActiveProject, useBootstrap, useFramework, useProjectDetail, type FormatMeta } from "@/lib/client/store";
import { useTabParam } from "@/lib/client/tabs";
import { cn } from "@/lib/cn";
import type { Run, VideoDoc } from "@/lib/types";

type Tab = "formats" | "hooks" | "sounds" | "playbook";

export default function LibraryPage() {
  return (
    <Suspense fallback={null}>
      <Library />
    </Suspense>
  );
}

const TABS = ["formats", "hooks", "sounds", "playbook"] as const;

function Library() {
  const [tab, setTab] = useTabParam<Tab>(TABS, "formats");
  const { data: fw } = useFramework();
  return (
    <Page className="max-w-[1480px]">
      <PageHeader
        title="Viral Library"
        subtitle="What's working for app marketers right now: formats, hooks, sounds and the playbook, researched across TikTok, Reels, Shorts and X. Every format previews with your product."
        actions={
          <Segmented
            layoutId="lib-tab"
            value={tab}
            onChange={setTab}
            options={[
              { value: "formats", label: `Formats${fw ? ` · ${fw.formats.length}` : ""}` },
              { value: "hooks", label: `Hooks${fw ? ` · ${fw.hooks.length}` : ""}` },
              { value: "sounds", label: `Sounds${fw ? ` · ${fw.sounds.length}` : ""}` },
              { value: "playbook", label: "Playbook" },
            ]}
          />
        }
      />
      <div className="px-8">
        {tab === "formats" && <Formats />}
        {tab === "hooks" && <Hooks />}
        {tab === "sounds" && <Sounds />}
        {tab === "playbook" && <Playbook />}
      </div>
    </Page>
  );
}

function useMakeVideo() {
  const router = useRouter();
  const { projectId } = useActiveProject();
  return async (formatId: string, hook?: string) => {
    if (!projectId) return toast("Add a product first.");
    const t = toast.loading("Building it with your product…");
    try {
      const doc = await post<VideoDoc>(`/api/projects/${projectId}/videos`, { formatId, hook });
      toast.success("Ready to edit", { id: t });
      router.push(`/edit/${projectId}/${doc.id}`);
    } catch (e) {
      toast.error((e as Error).message, { id: t });
    }
  };
}

// ── Formats ──────────────────────────────────────────────────────────────────────

function Formats() {
  const { data: fw } = useFramework();
  const { project, projectId } = useActiveProject();
  const { data: detail } = useProjectDetail(projectId);
  const [filter, setFilter] = useState<"all" | "hot" | "video" | "slideshow" | "no-footage">("all");
  const [open, setOpenRaw] = useState<FormatMeta | null>(null);
  // A hook picked in the dialog only fills the "Make one" button; nothing is created on a click.
  const [hook, setHook] = useState<string | null>(null);
  const setOpen = (f: FormatMeta | null) => {
    setOpenRaw(f);
    setHook(null);
  };
  const [cloning, setCloning] = useState(false);
  const make = useMakeVideo();
  const media = useMemo(() => (detail?.assets ?? []).map((a) => ({ file: a.file, kind: a.kind, role: a.role, width: a.width, height: a.height, durationSec: a.durationSec })), [detail?.assets]);

  const previews = useMemo(() => {
    if (!project || !fw) return new Map<string, ReturnType<typeof buildSpec>>();
    return new Map(fw.formats.map((f) => [f.id, buildSpec(f.id, { project, hook: fillHook(f.hooks[0] ?? "I built an app that {outcome}", project), media, seed: 3 })]));
  }, [project, fw, media]);

  const list = (fw?.formats ?? []).filter((f) =>
    filter === "all" ? true : filter === "hot" ? f.status === "hot" : filter === "video" ? f.kind === "video" : filter === "slideshow" ? f.kind === "slideshow" : f.needs.includes("nothing"),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          layoutId="fmt-filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "hot", label: "Hot now", icon: <Flame className="size-3.5 text-accent" /> },
            { value: "video", label: "Video" },
            { value: "slideshow", label: "Photo carousel" },
            { value: "no-footage", label: "No footage needed" },
          ]}
        />
        <span className="text-xs text-fg-3">Hover to play. Previews use {project?.name ?? "your product"}&apos;s brief and media.</span>
        <Button size="sm" className="ml-auto" icon={<Link2 className="size-3.5" />} onClick={() => setCloning(true)}>
          Clone a viral video
        </Button>
      </div>
      <CloneDialog open={cloning} onOpenChange={setCloning} projectId={projectId} productName={project?.name} />
      <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
        {list.map((f) => (
          <div key={f.id} className="group flex flex-col gap-2.5">
            <button onClick={() => setOpen(f)} aria-label={`Preview ${f.name}`} className="relative text-left">
              <Reel letterbox spec={previews.get(f.id)} projectId={projectId} mode="hover" className="ring-1 ring-line transition-all duration-200 group-hover:-translate-y-0.5 group-hover:ring-line-strong" />
              <span className="absolute top-2 left-2 flex gap-1">
                {f.status === "hot" && (
                  <Badge tone="accent" className="bg-black/70 backdrop-blur" icon={<Flame className="size-3" />}>
                    Hot
                  </Badge>
                )}
                {f.status === "saturated" && <Badge className="bg-black/70 text-fg-2 backdrop-blur">Saturated</Badge>}
              </span>
            </button>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2 text-[13px] font-semibold">{f.name}</span>
              <span className="line-clamp-2 text-xs leading-snug text-fg-3">{f.tagline}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-fg-3">
                <span>{f.kind === "slideshow" ? "Carousel" : `${f.lengthSec[0]}–${f.lengthSec[1]}s`}</span>
                <span>·</span>
                <span>{f.needs.includes("nothing") ? "no footage" : f.needs.join(", ")}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
      <Dialog
        open={!!open}
        onOpenChange={(v) => !v && setOpen(null)}
        wide
        title={open?.name ?? ""}
        description={open?.tagline}
        footer={
          open && (
            <>
              <Button variant="ghost" onClick={() => setOpen(null)}>
                Close
              </Button>
              <Button variant="primary" icon={<Wand2 className="size-4" />} onClick={() => make(open.id, hook ?? undefined)}>
                {hook ? "Make it with this hook" : `Make one for ${project?.name ?? "my app"}`}
              </Button>
            </>
          )
        }
      >
        {open && (
          <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
            <Reel spec={previews.get(open.id)} projectId={projectId} mode="play" skin="tiktok" className="w-full ring-1 ring-line" />
            <div className="flex flex-col gap-5 text-[13px] leading-relaxed">
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={open.status === "hot" ? "accent" : open.status === "saturated" ? "warn" : "neutral"}>{open.status === "hot" ? "Hot right now" : open.status === "saturated" ? "Saturated: use carefully" : "Steady performer"}</Badge>
                <Badge>{open.kind === "slideshow" ? "Photo carousel" : `${open.lengthSec[0]}–${open.lengthSec[1]}s`}</Badge>
                <Badge>Effort: {open.effort}</Badge>
              </div>
              <div className="flex flex-col gap-1.5">
                <SectionLabel>Why it works</SectionLabel>
                <p className="text-fg-2">{open.why}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <SectionLabel>Beats</SectionLabel>
                <ol className="flex flex-col gap-1">
                  {open.beats.map((b, i) => (
                    <li key={i} className="flex gap-2.5 text-fg-2">
                      <span className="w-4 shrink-0 font-mono text-xs text-fg-3 tabular-nums">{i + 1}</span>
                      {b}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="flex flex-col gap-1.5">
                <SectionLabel>Hooks that fit</SectionLabel>
                {open.hooks.map((h) => {
                  const filled = project ? fillHook(h, project) : h;
                  return (
                    <button
                      key={h}
                      aria-pressed={hook === filled}
                      onClick={() => setHook(hook === filled ? null : filled)}
                      className={cn("group flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-fg hover:bg-hover", hook === filled && "bg-hover ring-1 ring-line-strong")}
                    >
                      <span className="flex-1">“{filled}”</span>
                      {hook === filled ? <Check className="size-3.5 text-fg" /> : <span className="text-[11px] text-fg-3 opacity-0 group-hover:opacity-100">Use this hook</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-col gap-1.5">
                <SectionLabel>Sound</SectionLabel>
                <p className="flex gap-2 text-fg-2">
                  <Music2 className="mt-1 size-3.5 shrink-0 text-fg-3" />
                  {open.soundTip}
                </p>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

// ── Hooks ────────────────────────────────────────────────────────────────────────

function Hooks() {
  const { data: fw } = useFramework();
  const { project } = useActiveProject();
  const make = useMakeVideo();
  const [family, setFamily] = useState<string>("all");
  const [kind, setKind] = useState<"all" | "template" | "example">("all");
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const hooks = (fw?.hooks ?? [])
    .filter((h) => (family === "all" || h.family === family) && (kind === "all" || h.kind === kind) && (!q || h.text.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => b.strength - a.strength);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fg-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hooks…" className={cn(inputCls, "h-8 w-56 pl-8 text-[13px]")} />
        </div>
        <Segmented
          layoutId="hook-kind"
          size="sm"
          value={kind}
          onChange={setKind}
          options={[
            { value: "all", label: "All" },
            { value: "template", label: "Fill-in templates" },
            { value: "example", label: "Real hooks from real accounts" },
          ]}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[{ id: "all", label: "Every family", blurb: "" }, ...(fw?.families ?? [])].map((f) => (
          <button
            key={f.id}
            onClick={() => setFamily(f.id)}
            title={f.blurb}
            className={cn("h-7 rounded-full border px-3 text-xs transition-colors", family === f.id ? "border-accent/60 bg-accent-soft text-fg" : "border-line text-fg-3 hover:border-line-strong hover:text-fg-2")}
          >
            {f.label}
          </button>
        ))}
      </div>
      {family !== "all" && <p className="-mt-2 text-xs text-fg-3">{fw?.families.find((f) => f.id === family)?.blurb}</p>}
      <div className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line">
        {hooks.slice(0, 120).map((h, i) => {
          const filled = h.kind === "template" && project ? fillHook(h.text, project) : h.text;
          return (
            <div key={i} className="group flex items-start gap-4 bg-panel px-4 py-3 transition-colors hover:bg-raised">
              <span className="mt-1 flex gap-0.5" title={`Strength ${h.strength}/5`}>
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} className={cn("h-3 w-1 rounded-full", j < h.strength ? "bg-accent" : "bg-hover")} />
                ))}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[14px] leading-snug text-fg">{filled}</span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-fg-3">
                  <span className="capitalize">{fw?.families.find((f) => f.id === h.family)?.label ?? h.family}</span>
                  <span>·</span>
                  <span>{h.kind === "example" ? "real hook: adapt it" : "fills from your brief"}</span>
                  {h.source && h.source !== "common pattern" && (
                    <>
                      <span>·</span>
                      {/^https?:/.test(h.source) ? (
                        <a href={h.source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-fg">
                          source <ExternalLink className="size-2.5" />
                        </a>
                      ) : (
                        <span className="max-w-[420px] truncate">{h.source}</span>
                      )}
                    </>
                  )}
                </span>
              </div>
              <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={copied === filled ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
                  onClick={() => {
                    navigator.clipboard.writeText(filled);
                    setCopied(filled);
                    setTimeout(() => setCopied(null), 1200);
                  }}
                >
                  Copy
                </Button>
                <Button size="sm" icon={<Wand2 className="size-3.5" />} onClick={() => make(h.formats[0] ?? "hook-demo", filled)}>
                  Make video
                </Button>
              </div>
            </div>
          );
        })}
        {hooks.length === 0 && <Empty title="No hooks match" body="Try another family or clear the search." />}
      </div>
    </div>
  );
}

// ── Sounds ───────────────────────────────────────────────────────────────────────

function Sounds() {
  const { data: fw, mutate } = useFramework();
  const { data: boot } = useBootstrap();
  const { openRun } = useShell();
  const [status, setStatus] = useState<"all" | "rising" | "peaking" | "evergreen">("all");
  const [vibe, setVibe] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sounds = (fw?.sounds ?? []).filter((s) => (status === "all" || s.status === status) && (!vibe || s.vibe.includes(vibe)));
  const vibes = useMemo(() => [...new Set((fw?.sounds ?? []).flatMap((s) => s.vibe))].slice(0, 14), [fw?.sounds]);
  const engine = boot?.settings.engine ?? "claude";

  const refreshTrends = async () => {
    setBusy(true);
    try {
      const run = await post<Run>("/api/trends", { engine });
      toast(`${engine === "codex" ? "Codex" : "Claude"} is researching this week's sounds…`, { action: { label: "Watch", onClick: () => openRun(run.id) } });
      openRun(run.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      setTimeout(() => mutate(), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-line bg-panel p-4">
        <div className="flex max-w-3xl flex-col gap-1.5 text-[13px] leading-relaxed text-fg-2">
          <span className="font-medium text-fg">How to use sounds without getting muted</span>
          <span>
            Pick the sound in the editor and post TikTok as a <b className="font-medium text-fg">draft</b>: open TikTok, add the sound, publish. Copyrighted songs baked into auto-posted files get muted or blocked, and 78% of app/tech posts that convert use original audio or a voice anyway.
          </span>
          <span className="text-xs text-fg-3">
            {fw?.trendsRefreshedAt ? `Last refreshed by your agent ${formatDistanceToNowStrict(new Date(fw.trendsRefreshedAt))} ago.` : "Researched Oct 15, 2026."} Trends move weekly; refresh before you plan the week.
          </span>
        </div>
        <Button loading={busy} icon={<RefreshCw className="size-4" />} onClick={refreshTrends}>
          Refresh with {engine === "codex" ? "Codex" : "Claude"}
        </Button>
      </div>
      {fw?.trendNotes && (
        <div className="flex gap-2 rounded-lg border border-line px-4 py-3 text-[13px] leading-relaxed text-fg-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" />
          {fw.trendNotes}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          layoutId="snd-status"
          size="sm"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All" },
            { value: "rising", label: "Rising" },
            { value: "peaking", label: "Peaking" },
            { value: "evergreen", label: "Evergreen" },
          ]}
        />
        <div className="mx-1 h-5 w-px bg-line" />
        {vibes.map((v) => (
          <button key={v} onClick={() => setVibe(vibe === v ? null : v)} className={cn("h-6 rounded-full border px-2.5 text-[11px] capitalize transition-colors", vibe === v ? "border-accent/60 bg-accent-soft text-fg" : "border-line text-fg-3 hover:text-fg-2")}>
            {v}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sounds.map((s) => (
          <div key={s.id} className="flex flex-col gap-2.5 rounded-xl border border-line bg-panel p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-hover text-fg-2">
                <Music2 className="size-4" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14px] font-medium">{s.title}</span>
                <span className="truncate text-xs text-fg-3">{s.artist}</span>
              </div>
              <Badge tone={s.status === "rising" ? "accent" : s.status === "peaking" ? "warn" : s.status === "fading" ? "neutral" : "info"} className="capitalize">
                {s.status}
              </Badge>
            </div>
            <p className="line-clamp-4 text-[13px] leading-relaxed text-fg-2">{s.howUsed}</p>
            <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-fg-3">
              {s.vibe.slice(0, 3).map((v) => (
                <span key={v} className="capitalize">
                  {v}
                </span>
              ))}
              {s.usageCount && <span>· {s.usageCount.split("(")[0].trim()}</span>}
              <span>· {s.commercialOk === "yes" ? "OK for business accounts" : s.commercialOk === "no" ? "Not for business accounts" : "Licensing unclear"}</span>
              {s.link && (
                <a href={s.link} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-0.5 text-fg-2 hover:text-fg">
                  Open sound <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Playbook ─────────────────────────────────────────────────────────────────────

const PLATFORM_NAME: Record<string, string> = { tiktok: "TikTok", reels: "Instagram Reels", shorts: "YouTube Shorts", x: "X", linkedin: "LinkedIn" };
const BENCH_NAME: Record<string, string> = { hook_hold_rate: "3-second hold", completion: "Completion", views_to_installs: "Views → installs", notes: "Reality check" };

function Playbook() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <SectionLabel>The loop that finds a winner</SectionLabel>
          <ol className="flex flex-col gap-2">
            {PLAYBOOK.loop.map((step, i) => (
              <li key={i} className="flex gap-3 rounded-lg border border-line bg-panel px-4 py-3 text-[13px] leading-relaxed text-fg-2">
                <span className="font-mono text-xs text-accent tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="flex flex-col gap-3">
          <SectionLabel>Principles from people doing it</SectionLabel>
          <div className="grid gap-3 md:grid-cols-2">
            {PLAYBOOK.principles.map((p, i) => (
              <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-line bg-panel p-4">
                <span className="text-[14px] leading-snug font-medium text-fg">{p.rule}</span>
                <span className="text-[13px] leading-relaxed text-fg-2">{p.why}</span>
                {p.source && <span className="mt-auto truncate pt-1 text-[11px] text-fg-3" title={p.source}>{p.source.replace(/https?:\/\/\S+/g, "").replace(/[,(]\s*$/, "").trim()}</span>}
              </div>
            ))}
          </div>
        </section>
      </div>
      <aside className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <SectionLabel>How often, and when</SectionLabel>
          {Object.entries(PLAYBOOK.cadence).map(([k, c]) => (
            <div key={k} className="flex flex-col gap-1.5 rounded-lg border border-line bg-panel p-4">
              <span className="text-[13px] font-semibold">{PLATFORM_NAME[k] ?? k}</span>
              {c.posts_per_day && <span className="text-[13px] text-fg-2">{c.posts_per_day}</span>}
              {c.best_times_local?.length ? <span className="text-xs text-fg-3">Times: {c.best_times_local.join(" · ")}</span> : null}
            </div>
          ))}
        </section>
        <section className="flex flex-col gap-3">
          <SectionLabel>Benchmarks</SectionLabel>
          {Object.entries(PLAYBOOK.benchmarks).map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1 text-[13px] leading-relaxed">
              <span className="font-medium text-fg">{BENCH_NAME[k] ?? k}</span>
              <span className="text-fg-2">{v}</span>
            </div>
          ))}
        </section>
        <section className="flex flex-col gap-3">
          <SectionLabel>What kills reach</SectionLabel>
          <ul className="flex flex-col gap-2">
            {PLAYBOOK.reachKillers.map((r, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-fg-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-bad" />
                {r}
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-3">
          <SectionLabel>Turning views into installs</SectionLabel>
          <ul className="flex flex-col gap-2">
            {PLAYBOOK.trafficRouting.map((r, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-fg-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-ok" />
                {r}
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
