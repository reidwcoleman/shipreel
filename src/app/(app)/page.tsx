"use client";
import { formatDistanceToNowStrict, isSameDay, startOfDay, subDays, addDays, format } from "date-fns";
import { ArrowRight, Check, Clapperboard, Flame, Lightbulb, Plus, Send, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlatformIcon } from "@/components/platform-icon";
import { Reel } from "@/components/reel";
import { Button } from "@/components/ui/button";
import { Badge, SectionLabel, Skeleton } from "@/components/ui/misc";
import { buildSpec, fillHook, FORMAT_MAP } from "@/framework/formats";
import { post, useApi } from "@/lib/client/api";
import { useActiveProject, useBootstrap, useProjectDetail } from "@/lib/client/store";
import { cn } from "@/lib/cn";
import type { Idea, Post, VideoDoc } from "@/lib/types";

function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function greeting(d: Date) {
  const h = d.getHours();
  return h < 5 ? "Late night" : h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
}

export default function Home() {
  const router = useRouter();
  const now = useNow();
  const { data: boot } = useBootstrap();
  const { project, projectId } = useActiveProject();
  const { data: detail } = useProjectDetail(projectId);
  const { data: posts } = useApi<Post[]>(projectId ? `/api/projects/${projectId}/posts` : null);
  const { data: videos } = useApi<VideoDoc[]>(projectId ? `/api/projects/${projectId}/videos` : null);
  const { data: ideas } = useApi<Idea[]>(projectId ? `/api/projects/${projectId}/ideas` : null);

  const upcoming = useMemo(() => (posts ?? []).filter((p) => ["scheduled", "rendering", "posting"].includes(p.status) && new Date(p.scheduledAt) >= subDays(now, 0.02)), [posts, now]);
  const today = upcoming.filter((p) => isSameDay(new Date(p.scheduledAt), now));
  const next = upcoming[0];
  const videoById = useMemo(() => new Map((videos ?? []).map((v) => [v.id, v])), [videos]);
  const newIdeas = (ideas ?? []).filter((i) => i.status === "new");
  const drafts = (posts ?? []).filter((p) => p.status === "posted" && p.asDraft && p.results.some((r) => r.mode === "draft")).filter((p) => new Date(p.updatedAt) > subDays(now, 2));
  const needsYou = (posts ?? []).filter((p) => p.status === "needs-you" || p.status === "failed");
  const unlogged = (posts ?? []).filter((p) => p.status === "posted" && !p.metrics?.views && new Date(p.scheduledAt) < subDays(now, 1));

  // Posting streak: consecutive days (ending today or yesterday) with a post out.
  const postedDays = new Set((posts ?? []).filter((p) => p.status === "posted" || p.status === "partial").map((p) => startOfDay(new Date(p.scheduledAt)).toISOString()));
  let streak = 0;
  for (let d = startOfDay(now), i = 0; i < 365; i++, d = subDays(d, 1)) {
    if (postedDays.has(d.toISOString())) streak++;
    else if (i > 0) break;
  }

  // Up next: scheduled videos, else latest videos, else live template previews of this product.
  const stack = useMemo(() => {
    const fromPosts = upcoming.map((p) => ({ key: p.id, spec: videoById.get(p.videoId)?.spec, label: `${isSameDay(new Date(p.scheduledAt), now) ? "Today" : format(new Date(p.scheduledAt), "EEE")} ${format(new Date(p.scheduledAt), "h:mm a")}`, platforms: p.platforms, href: `/edit/${projectId}/${p.videoId}` }));
    if (fromPosts.length) return fromPosts.slice(0, 3);
    if (videos?.length) return videos.slice(0, 3).map((v) => ({ key: v.id, spec: v.spec, label: v.status === "rendered" ? "Ready to schedule" : "Draft", platforms: [], href: `/edit/${projectId}/${v.id}` }));
    if (!project) return [];
    const media = (detail?.assets ?? []).map((a) => ({ file: a.file, kind: a.kind, role: a.role, width: a.width, height: a.height, durationSec: a.durationSec }));
    return ["text-story", "doubter-reveal", "hook-demo"].map((fid) => {
      const f = FORMAT_MAP[fid];
      return { key: fid, spec: buildSpec(fid, { project, hook: fillHook(f.hooks[0], project), media, seed: 3 }), label: f.name, platforms: [], href: "", formatId: fid };
    });
  }, [upcoming, videos, videoById, project, projectId, detail, now]);

  const makeToday = () => router.push("/ideas");

  const createFromFormat = async (formatId: string) => {
    if (!projectId) return;
    const t = toast.loading("Building your video…");
    try {
      const doc = await post<VideoDoc>(`/api/projects/${projectId}/videos`, { formatId });
      toast.success("Ready to edit", { id: t });
      router.push(`/edit/${projectId}/${doc.id}`);
    } catch (e) {
      toast.error((e as Error).message, { id: t });
    }
  };

  if (!boot) {
    return (
      <div className="flex flex-col gap-6 px-8 pt-10">
        <Skeleton className="h-14 w-96" />
        <Skeleton className="h-10 w-72" />
      </div>
    );
  }

  const checklist = [
    { done: newIdeas.length === 0 && (ideas?.length ?? 0) > 0, label: newIdeas.length ? `Swipe through ${Math.min(newIdeas.length, 5)} new ideas` : "Generate today's ideas", href: "/ideas", icon: Lightbulb },
    { done: upcoming.length > 0, label: upcoming.length ? `${upcoming.length} post${upcoming.length > 1 ? "s" : ""} scheduled` : "Schedule at least one post", href: "/calendar", icon: Send },
    ...(drafts.length ? [{ done: false, label: `Add a trending sound to ${drafts.length} TikTok draft${drafts.length > 1 ? "s" : ""}`, href: "/calendar", icon: TrendingUp }] : []),
    ...(needsYou.length ? [{ done: false, label: `${needsYou.length} post${needsYou.length > 1 ? "s" : ""} need you`, href: "/calendar", icon: Send }] : []),
    { done: unlogged.length === 0, label: unlogged.length ? `Log views for ${unlogged.length} post${unlogged.length > 1 ? "s" : ""}` : "Results are up to date", href: "/calendar?tab=results", icon: TrendingUp },
  ];

  return (
    <div className="mx-auto w-full max-w-[1320px] px-8 pt-10 pb-24">
      <section className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-5">
          <div className="text-[11px] font-semibold tracking-[0.08em] text-fg-3 uppercase">{format(now, "EEEE, MMMM d")}</div>
          <h1 className="font-display text-[64px] leading-[0.95] tracking-[-0.02em] text-fg">
            {greeting(now)}
            {boot.userName ? `, ${boot.userName}` : ""}.
            <br />
            <span className="text-fg-2 italic">
              {today.length > 0 ? `${today.length} post${today.length > 1 ? "s" : ""} go${today.length > 1 ? "" : "es"} out today.` : upcoming.length ? "Nothing today. You're queued up." : "Let's get something out today."}
            </span>
          </h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-fg-3">
            {next ? (
              <>
                <span className="inline-flex items-center gap-1.5 text-fg-2">
                  {next.platforms.slice(0, 3).map((p) => (
                    <PlatformIcon key={p} platform={p} />
                  ))}
                </span>
                Next post {format(new Date(next.scheduledAt), "EEE h:mm a")}
                <span className="font-mono text-fg-2 tabular-nums">· in {formatDistanceToNowStrict(new Date(next.scheduledAt))}</span>
              </>
            ) : (
              <>Swipe right on an idea and it's built, rendered and scheduled for you.</>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button variant="primary" size="lg" icon={<Lightbulb className="size-4" />} onClick={makeToday}>
              Make today&apos;s video
            </Button>
            <Link href="/studio">
              <Button size="lg" icon={<Clapperboard className="size-4" />}>
                Open Studio
              </Button>
            </Link>
          </div>
        </div>

        <UpNext stack={stack} onPick={(s) => (s.href ? router.push(s.href) : s.formatId && createFromFormat(s.formatId))} projectId={projectId} handle={(project?.name ?? "yourapp").toLowerCase().replace(/[^a-z0-9]+/g, "")} />
      </section>

      <section className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-3">
          <SectionLabel>Today</SectionLabel>
          <ul className="flex flex-col divide-y divide-line border-y border-line">
            {checklist.map((c, i) => (
              <li key={i}>
                <Link href={c.href} className="group flex h-12 items-center gap-3 px-1 text-sm transition-colors hover:bg-panel">
                  <span className={cn("flex size-5 items-center justify-center rounded-full border", c.done ? "border-accent bg-accent text-accent-ink" : "border-line-strong text-transparent")}>
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  <span className={cn("flex-1", c.done ? "text-fg-3 line-through decoration-fg-3/40" : "text-fg")}>{c.label}</span>
                  <ArrowRight className="size-4 text-fg-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <SectionLabel aside={<span className="flex items-center gap-1.5 text-xs text-fg-2"><Flame className={cn("size-3.5", streak ? "text-warn" : "text-fg-3")} /> {streak}-day streak</span>}>This week</SectionLabel>
          <WeekStrip posts={posts ?? []} now={now} />
          <p className="text-xs leading-relaxed text-fg-3">
            Consistency compounds: accounts posting 6–10× a week get ~29% more views per post than weekly posters. Aim for 1–3 a day on TikTok.
          </p>
        </div>
      </section>

      <section className="mt-14 flex flex-col gap-4">
        <SectionLabel
          aside={
            <Link href="/studio" className="text-xs text-fg-2 hover:text-fg">
              See all
            </Link>
          }
        >
          Recent videos
        </SectionLabel>
        {videos && videos.length === 0 ? (
          <div className="flex items-center justify-between rounded-xl border border-dashed border-line px-6 py-8">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">No videos yet</span>
              <span className="text-sm text-fg-3">Swipe right on an idea, or start from a viral format.</span>
            </div>
            <Link href="/library">
              <Button icon={<Plus className="size-4" />}>Browse formats</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {(videos ?? []).slice(0, 6).map((v) => (
              <Link key={v.id} href={`/edit/${projectId}/${v.id}`} className="group flex flex-col gap-2">
                <Reel letterbox spec={v.spec} projectId={projectId} mode="hover" className="ring-1 ring-line transition-transform duration-200 group-hover:-translate-y-0.5" />
                <span className="truncate text-[13px] text-fg-2 group-hover:text-fg">{v.spec.title}</span>
              </Link>
            ))}
            {!videos && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[9/16] rounded-xl" />)}
          </div>
        )}
      </section>
    </div>
  );
}

type StackItem = { key: string; spec: VideoDoc["spec"] | undefined | ReturnType<typeof buildSpec>; label: string; platforms: Post["platforms"]; href: string; formatId?: string };

function UpNext({ stack, onPick, projectId, handle }: { stack: StackItem[]; onPick: (s: StackItem) => void; projectId: string | null; handle: string }) {
  const [focus, setFocus] = useState(1);
  if (!stack.length) return null;
  const order = stack.length === 1 ? [0] : stack.length === 2 ? [0, 1] : [0, 1, 2];
  const isTemplates = !!stack[0].formatId;
  return (
    <div className="relative flex flex-col items-center gap-4">
      <div className="relative h-[430px] w-[420px]">
        {order.map((i) => {
          const pos = stack.length === 1 ? 0 : i - (stack.length === 2 ? 0.5 : 1);
          const active = i === Math.min(focus, stack.length - 1);
          return (
            <motion.button
              key={stack[i].key}
              onMouseEnter={() => setFocus(i)}
              onClick={() => onPick(stack[i])}
              className="absolute top-0 left-1/2 w-[200px] origin-bottom"
              initial={false}
              animate={{ x: `calc(-50% + ${pos * 128}px)`, rotate: pos * 7, y: active ? -6 : Math.abs(pos) * 22, scale: active ? 1.04 : 0.94, zIndex: active ? 3 : 2 - Math.abs(pos) }}
              transition={{ type: "spring", bounce: 0.12, duration: 0.5 }}
            >
              <Reel spec={stack[i].spec} projectId={projectId} mode={active ? "play" : "thumb"} skin={active ? "tiktok" : "none"} username={handle} className={cn("shadow-2xl ring-1", active ? "ring-line-strong" : "ring-line")} />
            </motion.button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-[13px] text-fg-2">
        {isTemplates ? <Badge tone="accent">Made from your brief</Badge> : <Badge>Up next</Badge>}
        <span className="truncate">{stack[Math.min(focus, stack.length - 1)].label}</span>
      </div>
    </div>
  );
}

function WeekStrip({ posts, now }: { posts: Post[]; now: Date }) {
  const start = subDays(startOfDay(now), 3);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => {
        const dayPosts = posts.filter((p) => isSameDay(new Date(p.scheduledAt), d));
        const posted = dayPosts.filter((p) => p.status === "posted" || p.status === "partial").length;
        const planned = dayPosts.filter((p) => ["scheduled", "rendering", "posting"].includes(p.status)).length;
        const isToday = isSameDay(d, now);
        return (
          <div key={d.toISOString()} className={cn("flex flex-col items-center gap-2 rounded-lg border px-1 py-3", isToday ? "border-line-strong bg-panel" : "border-transparent")}>
            <span className={cn("text-[11px] font-medium", isToday ? "text-fg" : "text-fg-3")}>{format(d, "EEE")}</span>
            <span className="font-mono text-[15px] text-fg tabular-nums">{format(d, "d")}</span>
            <div className="flex h-2 items-center gap-1">
              {Array.from({ length: Math.min(3, posted) }).map((_, i) => (
                <span key={`p${i}`} className="size-1.5 rounded-full bg-accent" />
              ))}
              {Array.from({ length: Math.min(3 - Math.min(3, posted), planned) }).map((_, i) => (
                <span key={`s${i}`} className="size-1.5 rounded-full border border-fg-3" />
              ))}
              {posted + planned === 0 && <span className="size-1.5 rounded-full bg-hover" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
