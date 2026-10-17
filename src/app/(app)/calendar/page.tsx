"use client";
import { addDays, addWeeks, format, isSameDay, isToday, startOfWeek, subWeeks } from "date-fns";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { Suspense, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/page";
import { PLATFORM_LABEL, PlatformIcon } from "@/components/platform-icon";
import { PostSheet as PostKitSheet } from "@/components/post-sheet";
import { Reel } from "@/components/reel";
import { ScheduleDialog } from "@/components/schedule-dialog";
import { Button, IconButton } from "@/components/ui/button";
import { inputCls } from "@/components/ui/field";
import { Badge, Empty, SectionLabel, Segmented, Skeleton } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/overlay";
import { del, patch, post, refresh, useApi } from "@/lib/client/api";
import { useActiveProject, useBootstrap } from "@/lib/client/store";
import { useTabParam } from "@/lib/client/tabs";
import { deleteWithUndo, usePendingDeletes } from "@/lib/client/undo";
import { cn } from "@/lib/cn";
import type { Post, PostMetrics, PostStatus, Run, VideoDoc } from "@/lib/types";
import { verdictFor } from "@/lib/verdict";

const STATUS: Record<PostStatus, { label: string; tone: "neutral" | "accent" | "ok" | "warn" | "bad" | "info" }> = {
  scheduled: { label: "Scheduled", tone: "accent" },
  rendering: { label: "Rendering", tone: "info" },
  posting: { label: "Posting", tone: "info" },
  posted: { label: "Posted", tone: "ok" },
  partial: { label: "Partly posted", tone: "warn" },
  failed: { label: "Failed", tone: "bad" },
  "needs-you": { label: "Needs you", tone: "warn" },
  canceled: { label: "Canceled", tone: "neutral" },
};

const fmtN = (n?: number) => (n == null ? "–" : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n));

type View = "week" | "queue" | "results";

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <Calendar />
    </Suspense>
  );
}

const VIEWS = ["week", "queue", "results"] as const;

function Calendar() {
  const { projectId, project } = useActiveProject();
  const { data: boot } = useBootstrap();
  const { data: posts, mutate } = useApi<Post[]>(projectId ? `/api/projects/${projectId}/posts` : null, { refreshInterval: 15_000 });
  const { data: videos } = useApi<VideoDoc[]>(projectId ? `/api/projects/${projectId}/videos` : null);
  const [view, setView] = useTabParam<View>(VIEWS, "week");
  const hidden = usePendingDeletes();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [open, setOpen] = useState<string | null>(null);
  const [pick, setPick] = useState<{ at?: Date } | null>(null);
  const [scheduling, setScheduling] = useState<{ video: VideoDoc; at?: Date } | null>(null);

  const videoById = useMemo(() => new Map((videos ?? []).map((v) => [v.id, v])), [videos]);
  const live = (posts ?? []).filter((p) => p.status !== "canceled" && !hidden.has(`post:${p.id}`));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const slots = boot?.settings.slots ?? [];
  const openPost = live.find((p) => p.id === open) ?? null;

  const queue = live.filter((p) => ["scheduled", "rendering", "posting", "needs-you", "failed"].includes(p.status)).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const done = live.filter((p) => p.status === "posted" || p.status === "partial").sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));

  return (
    <Page className="max-w-[1480px]">
      <PageHeader
        title="Calendar"
        subtitle="What goes out when, and what worked. Shipreel renders and posts on schedule while this app is running."
        actions={
          <>
            <Segmented
              layoutId="cal-view"
              value={view}
              onChange={setView}
              options={[
                { value: "week", label: "Week" },
                { value: "queue", label: `Queue${queue.length ? ` · ${queue.length}` : ""}` },
                { value: "results", label: "Results" },
              ]}
            />
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setPick({})}>
              Schedule a video
            </Button>
          </>
        }
      />

      <div className="px-8">
        {!posts ? (
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-[420px] rounded-xl" />
            ))}
          </div>
        ) : view === "week" ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <IconButton label="Previous week" size="sm" onClick={() => setWeekStart((d) => subWeeks(d, 1))}>
                <ChevronLeft className="size-4" />
              </IconButton>
              <IconButton label="Next week" size="sm" onClick={() => setWeekStart((d) => addWeeks(d, 1))}>
                <ChevronRight className="size-4" />
              </IconButton>
              <span className="text-[15px] font-semibold">
                {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
              </span>
              <Button size="sm" variant="ghost" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                Today
              </Button>
              <span className="ml-auto text-xs text-fg-3">
                Open slots come from Settings → Posting times. {project?.name ? `Showing ${project.name}.` : ""}
              </span>
            </div>
            <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-line">
              {days.map((d, i) => {
                const dayPosts = live.filter((p) => isSameDay(new Date(p.scheduledAt), d)).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
                const daySlots = slots
                  .filter((s) => s.days.includes(d.getDay()))
                  .map((s) => {
                    const [h, m] = s.time.split(":").map(Number);
                    const t = new Date(d);
                    t.setHours(h, m || 0, 0, 0);
                    return { ...s, at: t };
                  })
                  .filter((s) => s.at > new Date() && !dayPosts.some((p) => Math.abs(new Date(p.scheduledAt).getTime() - s.at.getTime()) < 30 * 60_000))
                  .filter((s, j, arr) => arr.findIndex((x) => x.time === s.time) === j);
                return (
                  <div key={i} className={cn("flex min-h-[460px] flex-col gap-2 border-line p-2.5", i > 0 && "border-l", isToday(d) && "bg-accent-soft/40")}>
                    <div className="flex items-baseline justify-between px-1 pb-1">
                      <span className={cn("text-[11px] font-semibold tracking-[0.08em] uppercase", isToday(d) ? "text-accent" : "text-fg-3")}>{format(d, "EEE")}</span>
                      <span className={cn("font-mono text-sm tabular-nums", isToday(d) ? "text-accent" : "text-fg-2")}>{format(d, "d")}</span>
                    </div>
                    {dayPosts.map((p) => (
                      <PostCard key={p.id} post={p} video={videoById.get(p.videoId)} projectId={projectId!} onOpen={() => setOpen(p.id)} />
                    ))}
                    {daySlots.map((s) => (
                      <button
                        key={s.time}
                        onClick={() => setPick({ at: s.at })}
                        className="group flex h-12 items-center justify-center gap-1.5 rounded-lg border border-dashed border-line text-xs text-fg-3 transition-colors hover:border-accent/50 hover:text-fg"
                      >
                        <Plus className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                        {format(s.at, "h:mm a")}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ) : view === "queue" ? (
          queue.length === 0 ? (
            <Empty icon={<CalendarClock className="size-5" />} title="Nothing queued" body="Schedule a video and it'll show up here until it's posted." action={<Button onClick={() => setPick({})}>Schedule a video</Button>} />
          ) : (
            <div className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line">
              {queue.map((p) => (
                <QueueRow key={p.id} post={p} video={videoById.get(p.videoId)} projectId={projectId!} onOpen={() => setOpen(p.id)} />
              ))}
            </div>
          )
        ) : (
          <Results posts={done} videoById={videoById} projectId={projectId!} onOpen={setOpen} />
        )}
      </div>

      <PostSheet post={openPost} video={openPost ? videoById.get(openPost.videoId) : undefined} projectId={projectId} onClose={() => setOpen(null)} onChanged={() => mutate()} />

      <PickVideo
        open={!!pick}
        onOpenChange={(v) => !v && setPick(null)}
        videos={videos ?? []}
        projectId={projectId}
        onPick={(video) => {
          setScheduling({ video, at: pick?.at });
          setPick(null);
        }}
      />
      {scheduling && projectId && (
        <ScheduleDialog open onOpenChange={(v) => !v && setScheduling(null)} projectId={projectId} videoId={scheduling.video.id} spec={scheduling.video.spec} initialAt={scheduling.at} />
      )}
    </Page>
  );
}

function PostCard({ post: p, video, projectId, onOpen }: { post: Post; video?: VideoDoc; projectId: string; onOpen: () => void }) {
  const st = STATUS[p.status];
  return (
    <button onClick={onOpen} className="group flex flex-col gap-2 rounded-lg border border-line bg-panel p-1.5 text-left transition-colors hover:border-line-strong">
      <div className="relative">
        {video ? <Reel letterbox spec={video.spec} projectId={projectId} mode="thumb" className="w-full" /> : <div className="aspect-[9/16] rounded-xl bg-hover" />}
        <span className="absolute top-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white tabular-nums backdrop-blur">{format(new Date(p.scheduledAt), "h:mm a")}</span>
        {(p.status === "rendering" || p.status === "posting") && (
          <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
            <Loader2 className="size-5 animate-spin text-white" />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 px-0.5 pb-0.5">
        <span className="line-clamp-2 text-xs leading-snug font-medium text-fg">{video?.spec.title ?? "Deleted video"}</span>
        <span className="flex items-center gap-1">
          {p.platforms.map((pl) => (
            <PlatformIcon key={pl} platform={pl} className="size-3 text-fg-3" />
          ))}
          <Badge tone={st.tone} className="ml-auto h-4 px-1 text-[10px]">
            {st.label}
          </Badge>
        </span>
        {p.metrics?.views != null && <span className="font-mono text-[11px] text-fg-3 tabular-nums">{fmtN(p.metrics.views)} views</span>}
      </div>
    </button>
  );
}

function QueueRow({ post: p, video, projectId, onOpen }: { post: Post; video?: VideoDoc; projectId: string; onOpen: () => void }) {
  const st = STATUS[p.status];
  return (
    <div className="flex items-center gap-4 bg-panel px-4 py-3 transition-colors hover:bg-raised">
      <button onClick={onOpen} className="w-11 shrink-0">
        {video ? <Reel letterbox spec={video.spec} projectId={projectId} mode="thumb" rounded={false} className="rounded-md" /> : <div className="aspect-[9/16] rounded-md bg-hover" />}
      </button>
      <button onClick={onOpen} className="flex min-w-0 flex-1 flex-col gap-1 text-left">
        <span className="truncate text-sm font-medium">{video?.spec.title ?? "Deleted video"}</span>
        <span className="flex items-center gap-2 text-xs text-fg-3">
          <Clock className="size-3" />
          {format(new Date(p.scheduledAt), "EEE MMM d · h:mm a")}
          <span>·</span>
          {p.platforms.map((pl) => (
            <PlatformIcon key={pl} platform={pl} className="size-3" />
          ))}
          <span>· via {p.provider}</span>
          {p.asDraft && p.platforms.includes("tiktok") && <span>· TikTok draft</span>}
        </span>
      </button>
      <Badge tone={st.tone}>{st.label}</Badge>
      <div className="flex gap-1">
        <Button
          size="sm"
          onClick={async () => {
            await post(`/api/projects/${projectId}/posts/${p.id}/publish`);
            toast("Posting now…");
          }}
          icon={p.status === "failed" ? <RotateCcw className="size-3.5" /> : <Send className="size-3.5" />}
        >
          {p.status === "failed" ? "Retry" : "Post now"}
        </Button>
      </div>
    </div>
  );
}

// ── Results: thresholds + the views × conversion 2×2 ─────────────────────────────

function Results({ posts, videoById, projectId, onOpen }: { posts: Post[]; videoById: Map<string, VideoDoc>; projectId: string; onOpen: (id: string) => void }) {
  const withViews = posts.filter((p) => p.metrics?.views != null);
  const totals = withViews.reduce((a, p) => ({ views: a.views + (p.metrics?.views ?? 0), taps: a.taps + (p.metrics?.linkTaps ?? 0), installs: a.installs + (p.metrics?.installs ?? 0) }), { views: 0, taps: 0, installs: 0 });
  if (!posts.length)
    return <Empty icon={<BarChart3 className="size-5" />} title="No posted videos yet" body="After something goes out, log its views at 24h and 72h (or drop an analytics screenshot and Claude reads it). Shipreel tells you what to double down on." />;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-4">
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
          {[
            { label: "Views logged", value: fmtN(totals.views), sub: `${withViews.length} of ${posts.length} posts have numbers` },
            { label: "Link taps", value: fmtN(totals.taps), sub: totals.views ? `${((totals.taps / totals.views) * 100).toFixed(2)}% of views` : "–" },
            { label: "Installs", value: fmtN(totals.installs), sub: totals.views && totals.installs ? `${((totals.installs / totals.views) * 100).toFixed(2)}% of views (typical: 0.2–2%)` : "Add installs from your store console" },
          ].map((k) => (
            <div key={k.label} className="flex flex-col gap-1 bg-panel p-5">
              <span className="text-xs text-fg-3">{k.label}</span>
              <span className="font-mono text-3xl font-medium tracking-tight tabular-nums">{k.value}</span>
              <span className="text-xs text-fg-3">{k.sub}</span>
            </div>
          ))}
        </div>
      <div className="overflow-hidden rounded-xl border border-line">
        <div className="grid grid-cols-[1fr_repeat(5,64px)_150px] gap-3 border-b border-line bg-panel px-4 py-2.5 text-[11px] font-semibold tracking-[0.06em] text-fg-3 uppercase">
          <span>Video</span>
          <span className="text-right">Views</span>
          <span className="text-right">Likes</span>
          <span className="text-right">Shares</span>
          <span className="text-right">Link taps</span>
          <span className="text-right">Installs</span>
          <span>Verdict</span>
        </div>
        {posts.map((p) => {
          const v = videoById.get(p.videoId);
          const verdict = verdictFor(p.metrics);
          return (
            <button key={p.id} onClick={() => onOpen(p.id)} className="grid w-full grid-cols-[1fr_repeat(5,64px)_150px] items-center gap-3 border-b border-line/60 px-4 py-3 text-left last:border-0 hover:bg-raised">
              <span className="flex min-w-0 items-center gap-3">
                <span className="w-8 shrink-0">{v ? <Reel letterbox spec={v.spec} projectId={projectId} mode="thumb" rounded={false} className="rounded" /> : null}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[13px] font-medium">{v?.spec.title ?? "Deleted video"}</span>
                  <span className="text-[11px] text-fg-3">{format(new Date(p.scheduledAt), "MMM d")} · {p.platforms.map((x) => PLATFORM_LABEL[x]).join(", ")}</span>
                </span>
              </span>
              {(["views", "likes", "shares", "linkTaps", "installs"] as const).map((k) => (
                <span key={k} className="text-right font-mono text-[13px] tabular-nums">
                  {fmtN(p.metrics?.[k])}
                </span>
              ))}
              <span className="flex min-w-0 items-center gap-2" title={verdict.advice}>
                <VerdictBadge verdict={verdict.verdict} label={verdict.label} />
                <span className="truncate text-[11px] text-fg-3">{verdict.verdict === "unknown" ? "log views" : verdict.verdict === "double-down" ? "make 3 variations" : verdict.verdict === "keep" ? "keep the format" : verdict.verdict === "retry" ? "try a new hook" : "retire the hook"}</span>
              </span>
            </button>
          );
        })}
      </div>
        </div>
        <Quadrant posts={withViews} videoById={videoById} onOpen={onOpen} />
      </div>
    </div>
  );
}

function VerdictBadge({ verdict, label }: { verdict: string; label: string }) {
  const tone = verdict === "double-down" ? "accent" : verdict === "keep" ? "ok" : verdict === "retry" ? "warn" : verdict === "drop" ? "bad" : "neutral";
  return <Badge tone={tone}>{label}</Badge>;
}

/** Views (log, x) against conversion (y): the four boxes practitioners use to decide what to fix. */
function Quadrant({ posts, videoById, onOpen }: { posts: Post[]; videoById: Map<string, VideoDoc>; onOpen: (id: string) => void }) {
  const W = 380;
  const H = 230;
  const pad = 28;
  const pts = posts
    .map((p) => {
      const views = p.metrics?.views ?? 0;
      const conv = p.metrics?.installs != null ? p.metrics.installs / Math.max(1, views) : p.metrics?.linkTaps != null ? p.metrics.linkTaps / Math.max(1, views) : null;
      return { p, views, conv };
    })
    .filter((x) => x.views > 0);
  const lx = (v: number) => pad + ((Math.log10(Math.max(100, Math.min(1e7, v))) - 2) / 5) * (W - pad * 2);
  const ly = (c: number) => H - pad - Math.min(1, c / 0.02) * (H - pad * 2);
  const midX = lx(10_000);
  const midY = ly(0.005);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4">
      <SectionLabel aside={<span className="text-[11px] text-fg-3">views × conversion</span>}>What to fix</SectionLabel>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={midX} x2={midX} y1={pad / 2} y2={H - pad} stroke="var(--color-line-strong)" strokeDasharray="3 4" />
        <line x1={pad} x2={W - pad / 2} y1={midY} y2={midY} stroke="var(--color-line-strong)" strokeDasharray="3 4" />
        {[
          { x: (pad + midX) / 2, y: (pad + midY) / 2, t: "New hooks" },
          { x: (midX + W) / 2, y: (pad + midY) / 2, t: "Scale it" },
          { x: (pad + midX) / 2, y: (midY + H - pad) / 2 + 6, t: "New format" },
          { x: (midX + W) / 2, y: (midY + H - pad) / 2 + 6, t: "Fix the CTA" },
        ].map((q) => (
          <text key={q.t} x={q.x} y={q.y} textAnchor="middle" fill="var(--color-fg-3)" fontSize="11" fontFamily="var(--font-sans)">
            {q.t}
          </text>
        ))}
        {pts.map(({ p, views, conv }) => {
          const v = verdictFor(p.metrics);
          const color = v.verdict === "double-down" ? "var(--color-accent)" : v.verdict === "keep" ? "var(--color-ok)" : v.verdict === "retry" ? "var(--color-warn)" : "var(--color-bad)";
          return (
            <g key={p.id} onClick={() => onOpen(p.id)} className="cursor-pointer">
              <title>{`${videoById.get(p.videoId)?.spec.title ?? ""}: ${views.toLocaleString()} views`}</title>
              <circle cx={lx(views)} cy={conv == null ? H - pad : ly(conv)} r={6} fill={color} fillOpacity={conv == null ? 0.35 : 0.9} stroke="var(--color-bg)" strokeWidth="2" />
            </g>
          );
        })}
        <text x={pad} y={H - 8} fill="var(--color-fg-3)" fontSize="10" fontFamily="var(--font-mono)">
          100
        </text>
        <text x={midX} y={H - 8} textAnchor="middle" fill="var(--color-fg-3)" fontSize="10" fontFamily="var(--font-mono)">
          10K
        </text>
        <text x={W - pad} y={H - 8} textAnchor="end" fill="var(--color-fg-3)" fontSize="10" fontFamily="var(--font-mono)">
          10M
        </text>
      </svg>
      <p className="text-[11px] leading-relaxed text-fg-3">Dots without install or link-tap numbers sit on the bottom edge. 10K views and 0.5% conversion are the dividing lines.</p>
    </div>
  );
}

// ── Post detail ──────────────────────────────────────────────────────────────────

function PostSheet({ post: p, video, projectId, onClose, onChanged }: { post: Post | null; video?: VideoDoc; projectId: string | null; onClose: () => void; onChanged: () => void }) {
  const router = useRouter();
  const [m, setM] = useState<Partial<PostMetrics>>({});
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(false);
  const [kitOpen, setKitOpen] = useState(false);
  const shot = useRef<HTMLInputElement>(null);
  const key = p?.id;
  const [loadedFor, setLoadedFor] = useState<string | undefined>();
  if (p && loadedFor !== key) {
    setLoadedFor(key);
    setM(p.metrics ?? {});
  }
  if (!p || !projectId) return <DialogPrimitive.Root open={false} />;
  const st = STATUS[p.status];
  const verdict = verdictFor(p.metrics);
  const base = `/api/projects/${projectId}/posts/${p.id}`;

  const saveMetrics = async () => {
    setSaving(true);
    try {
      const clean = Object.fromEntries(Object.entries(m).filter(([k, v]) => k !== "updatedAt" && v != null && !Number.isNaN(v)));
      await post(`${base}/metrics`, { ...clean, markPosted: p.status === "needs-you" });
      onChanged();
      toast.success("Saved. Shipreel updated the product memory with what worked.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const readShot = async (f: File | undefined) => {
    if (!f) return;
    setReading(true);
    const t = toast.loading("Claude is reading the screenshot…");
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch(`${base}/metrics/screenshot`, { method: "POST", body: fd });
      const run = (await res.json()) as Run & { error?: string };
      if (!res.ok) throw new Error(run.error ?? "Upload failed");
      toast.success("Claude is on it. The numbers appear here in a few seconds.", { id: t });
      const started = Date.now();
      const poll = setInterval(async () => {
        const list = await fetch(`/api/projects/${projectId}/posts`).then((r) => r.json() as Promise<Post[]>);
        const fresh = list.find((x) => x.id === p.id);
        if ((fresh?.metrics?.updatedAt && fresh.metrics.updatedAt !== p.metrics?.updatedAt) || Date.now() - started > 120_000) {
          clearInterval(poll);
          setReading(false);
          if (fresh?.metrics) setM(fresh.metrics);
          onChanged();
        }
      }, 2500);
    } catch (e) {
      toast.error((e as Error).message, { id: t });
      setReading(false);
    }
  };

  const num = (k: keyof PostMetrics, label: string) => (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-fg-3">{label}</span>
      <input
        type="number"
        min={0}
        value={(m[k] as number | undefined) ?? ""}
        onChange={(e) => setM((x) => ({ ...x, [k]: e.target.value === "" ? undefined : Number(e.target.value) }))}
        className={cn(inputCls, "h-8 font-mono text-[13px] tabular-nums")}
        placeholder="–"
      />
    </label>
  );

  return (
    <DialogPrimitive.Root open={!!p} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/40 data-[state=closed]:animate-[fade-out_160ms_ease-in_forwards] data-[state=open]:animate-[fade-in_0.15s_ease-out]" />
        <DialogPrimitive.Content className="fixed top-2 right-2 bottom-2 z-[100] flex w-[640px] max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl focus:outline-none data-[state=closed]:animate-[slide-out-right_160ms_var(--ease-in)_forwards] data-[state=open]:animate-[slide-in-right_240ms_var(--ease-out)]">
          <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="truncate text-[15px] font-semibold">{video?.spec.title ?? "Post"}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-fg-3">
                {format(new Date(p.scheduledAt), "EEEE MMM d · h:mm a")} · via {p.provider}
              </DialogPrimitive.Description>
            </div>
            <Badge tone={st.tone}>{st.label}</Badge>
            <DialogPrimitive.Close className="rounded-md p-1 text-fg-3 hover:bg-hover hover:text-fg" aria-label="Close">
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-[200px_1fr] gap-5 overflow-y-auto p-5">
            <div className="flex flex-col gap-3">
              {video && <Reel spec={video.spec} projectId={projectId} mode="play" skin="tiktok" className="w-full ring-1 ring-line" />}
              <Button size="sm" onClick={() => router.push(`/edit/${projectId}/${p.videoId}`)}>
                Open in editor
              </Button>
            </div>
            <div className="flex min-w-0 flex-col gap-5">
              {(p.status === "needs-you" || p.status === "failed") && (
                <div className="flex gap-2 rounded-lg border border-warn/30 bg-warn-soft p-3 text-[13px] text-warn">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span className="leading-relaxed">{p.status === "needs-you" ? (p.log.at(-1) ?? "This one needs you.") : "Posting failed. Check the log below, fix the connection in Settings, then retry."}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {["scheduled", "failed", "needs-you", "partial"].includes(p.status) && (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={p.status === "failed" ? <RotateCcw className="size-3.5" /> : <Send className="size-3.5" />}
                    onClick={async () => {
                      await post(`${base}/publish`);
                      toast("Posting now…");
                      onChanged();
                    }}
                  >
                    {p.status === "failed" ? "Retry" : "Post now"}
                  </Button>
                )}
                {p.status === "needs-you" && (
                  <Button
                    size="sm"
                    icon={<Check className="size-3.5" />}
                    onClick={async () => {
                      await patch(`/api/projects/${projectId}/posts`, { postId: p.id, status: "posted" });
                      onChanged();
                    }}
                  >
                    I posted it
                  </Button>
                )}
                {(p.status === "needs-you" || p.status === "failed") && (
                  <Button size="sm" icon={<Send className="size-3.5" />} onClick={() => setKitOpen(true)}>
                    Open post kit
                  </Button>
                )}
                {video?.render?.file && (
                  <Button size="sm" variant="ghost" onClick={() => window.open(`/api/media/${projectId}/${video.render!.file}?download=1`)}>
                    Download MP4
                  </Button>
                )}
                {p.status === "scheduled" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await patch(`/api/projects/${projectId}/posts`, { postId: p.id, status: "canceled" });
                      onChanged();
                      onClose();
                      toast("Canceled");
                    }}
                  >
                    Cancel post
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 className="size-3.5" />}
                  onClick={() => {
                    deleteWithUndo({
                      key: `post:${p.id}`,
                      message: "Post deleted",
                      description: video?.spec.title,
                      url: `/api/projects/${projectId}/posts`,
                      json: { postId: p.id },
                      refresh: [`/api/projects/${projectId}/posts`, "/api/posts"],
                    });
                    onClose();
                  }}
                >
                  Delete
                </Button>
              </div>

              {p.results.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <SectionLabel>Where it went</SectionLabel>
                  {p.results.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-[13px]">
                      <PlatformIcon platform={r.platform} className="size-3.5 text-fg-2" />
                      <span>{PLATFORM_LABEL[r.platform]}</span>
                      {r.ok ? <Badge tone={r.mode === "draft" ? "warn" : r.mode === "manual" ? "neutral" : "ok"}>{r.mode === "draft" ? "In drafts: add a sound and post" : r.mode === "manual" ? "Post by hand" : "Live"}</Badge> : <Badge tone="bad">{r.error?.slice(0, 60) ?? "Failed"}</Badge>}
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 text-xs text-fg-3 hover:text-fg">
                          Open <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {(p.status === "posted" || p.status === "partial" || p.status === "needs-you") && (
                <div className="flex flex-col gap-3">
                  <SectionLabel aside={<VerdictBadge verdict={verdict.verdict} label={verdict.label} />}>Results</SectionLabel>
                  <div className="grid grid-cols-4 gap-2">
                    {num("views", "Views")}
                    {num("likes", "Likes")}
                    {num("comments", "Comments")}
                    {num("shares", "Shares")}
                    {num("saves", "Saves")}
                    {num("profileVisits", "Profile visits")}
                    {num("linkTaps", "Link taps")}
                    {num("installs", "Installs")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="primary" loading={saving} onClick={saveMetrics}>
                      Save numbers
                    </Button>
                    <Button size="sm" loading={reading} icon={<Camera className="size-3.5" />} onClick={() => shot.current?.click()}>
                      Read a screenshot with Claude
                    </Button>
                    <input ref={shot} type="file" accept="image/*" className="hidden" onChange={(e) => readShot(e.target.files?.[0])} />
                  </div>
                  {verdict.verdict !== "unknown" && (
                    <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg/40 p-3 text-[13px] leading-relaxed">
                      <span className="text-fg">{verdict.advice}</span>
                      {verdict.quadrant && <span className="text-fg-3">{verdict.quadrant}</span>}
                      {(verdict.verdict === "double-down" || verdict.verdict === "retry" || verdict.verdict === "keep") && video && (
                        <Button
                          size="sm"
                          className="self-start"
                          icon={<Sparkles className="size-3.5" />}
                          onClick={async () => {
                            const made = await post<VideoDoc[]>(`/api/projects/${projectId}/videos/${video.id}/variations`, { n: verdict.verdict === "double-down" ? 3 : 1 });
                            refresh(`/api/projects/${projectId}/videos`);
                            toast.success(`${made.length} variation${made.length > 1 ? "s" : ""} in the Studio: same body, new hooks`, { action: { label: "Open", onClick: () => router.push(`/edit/${projectId}/${made[0].id}`) } });
                          }}
                        >
                          {verdict.verdict === "double-down" ? "Make 3 variations" : "Make a variation"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <SectionLabel>Captions</SectionLabel>
                {p.platforms.map((pl) => (
                  <div key={pl} className="flex gap-2 text-[13px]">
                    <PlatformIcon platform={pl} className="mt-0.5 size-3.5 shrink-0 text-fg-3" />
                    <span className="text-fg-2">{p.captions[pl] || video?.spec.meta.caption || <span className="text-fg-3">Default caption</span>}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <SectionLabel>Log</SectionLabel>
                <ol className="flex flex-col gap-1 font-mono text-[11.5px] leading-relaxed text-fg-3">
                  {p.log.map((l, i) => (
                    <li key={i} className="break-words">
                      {l}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
          <PostKitSheet open={kitOpen} onOpenChange={setKitOpen} projectId={projectId} videoId={p.videoId} spec={video?.spec} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function PickVideo({ open, onOpenChange, videos, projectId, onPick }: { open: boolean; onOpenChange: (v: boolean) => void; videos: VideoDoc[]; projectId: string | null; onPick: (v: VideoDoc) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} wide title="Pick a video to schedule" description="Rendered videos post fastest; drafts render automatically before they go out.">
      {videos.length === 0 ? (
        <Empty
          title="No videos yet"
          body="Make one from the Hook Lab or the Studio first."
          action={
            <Link href="/ideas">
              <Button variant="primary">Open the Hook Lab</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
          {videos.map((v) => (
            <button key={v.id} onClick={() => onPick(v)} className="group flex flex-col gap-2 text-left">
              <Reel letterbox spec={v.spec} projectId={projectId} mode="hover" className="ring-1 ring-line transition group-hover:ring-accent/60" />
              <span className="line-clamp-2 text-xs leading-snug">{v.spec.title}</span>
            </button>
          ))}
        </div>
      )}
    </Dialog>
  );
}
