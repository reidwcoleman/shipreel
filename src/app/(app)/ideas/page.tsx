"use client";
import { Bot, Check, Filter, Lightbulb, Music2, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PlatformIcon } from "@/components/platform-icon";
import { Reel } from "@/components/reel";
import { ScoreRing } from "@/components/score-ring";
import { useShell } from "@/components/shell/activity";
import { Button, IconButton } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Badge, Empty, Kbd, Segmented, Skeleton } from "@/components/ui/misc";
import { Popover } from "@/components/ui/overlay";
import { buildSpec, FORMAT_MAP } from "@/framework/formats";
import { patch, post, refresh, useApi } from "@/lib/client/api";
import { shouldIgnoreHotkey } from "@/lib/client/hotkeys";
import { useActiveProject, useBootstrap, useFramework, useProjectDetail } from "@/lib/client/store";
import { deleteWithUndo, usePendingDeletes } from "@/lib/client/undo";
import { cn } from "@/lib/cn";
import type { Idea, Post, Run } from "@/lib/types";

type Engine = "instant" | "claude" | "codex";
type Dir = "right" | "left" | "up";
/** A decision made with a key or a button: the top card plays its stamp, then leaves that way. */
type Command = { dir: Dir; n: number };

export default function HookLab() {
  const router = useRouter();
  const { openRun } = useShell();
  const { data: boot } = useBootstrap();
  const { project, projectId } = useActiveProject();
  const { data: detail } = useProjectDetail(projectId);
  const { data: fw } = useFramework();
  const { data: rawIdeas, mutate } = useApi<Idea[]>(projectId ? `/api/projects/${projectId}/ideas` : null);
  const hidden = usePendingDeletes();
  const clearKey = `ideas-passed:${projectId}`;
  const ideas = useMemo(() => (rawIdeas && hidden.has(clearKey) ? rawIdeas.filter((i) => i.status !== "passed") : rawIdeas), [rawIdeas, hidden, clearKey]);
  const [command, setCommand] = useState<Command | null>(null);
  const issue = useCallback((dir: Dir) => setCommand({ dir, n: Date.now() }), []);
  const [engine, setEngine] = useState<Engine>("instant");
  const [count, setCount] = useState(10);
  const [formats, setFormats] = useState<string[]>([]);
  const [focus, setFocus] = useState("");
  const [tab, setTab] = useState<"new" | "liked" | "made" | "passed">("new");
  const [busy, setBusy] = useState(false);
  const [pinned, setPinned] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{ idea: Idea; status: Idea["status"] } | null>(null);

  useEffect(() => {
    if (boot?.settings.engine && engine === "instant" && boot.settings.engine !== "claude") setEngine(boot.settings.engine);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boot?.settings.engine]);

  const media = useMemo(() => (detail?.assets ?? []).map((a) => ({ file: a.file, kind: a.kind, role: a.role, width: a.width, height: a.height, durationSec: a.durationSec })), [detail]);
  const fresh = useMemo(() => {
    const list = (ideas ?? []).filter((i) => i.status === "new");
    if (pinned) {
      const i = list.findIndex((x) => x.id === pinned);
      if (i > 0) list.unshift(...list.splice(i, 1));
    }
    return list;
  }, [ideas, pinned]);

  const generate = async () => {
    if (!projectId) return;
    setBusy(true);
    try {
      const r = await post<{ run?: Run; ideas?: Idea[] }>(`/api/projects/${projectId}/ideas`, { engine, count, formats, focus: focus.trim() || undefined });
      if (r.run) {
        openRun(r.run.id);
        toast(`${engine === "codex" ? "Codex" : "Claude"} is reading your brief and writing ${count} hooks…`);
      } else {
        toast.success(`${r.ideas?.length ?? 0} fresh ideas`);
        await mutate();
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const decide = useCallback(
    async (idea: Idea, dir: "right" | "left" | "up") => {
      if (!projectId) return;
      setPinned(null);
      if (dir === "left") {
        mutate((cur) => cur?.map((i) => (i.id === idea.id ? { ...i, status: "passed" } : i)), { revalidate: false });
        setLastAction({ idea, status: "new" });
        await patch(`/api/projects/${projectId}/ideas`, { ideaId: idea.id, status: "passed" });
        return;
      }
      mutate((cur) => cur?.map((i) => (i.id === idea.id ? { ...i, status: "made" } : i)), { revalidate: false });
      const agentEngine = dir === "up" ? (engine === "instant" ? boot?.settings.engine ?? "claude" : engine) : "instant";
      try {
        const r = await post<{ videoId: string; run?: Run; post?: Post | null }>(`/api/projects/${projectId}/ideas/${idea.id}/make`, { engine: agentEngine });
        if (r.run) openRun(r.run.id);
        const where = r.post ? `Scheduled ${new Date(r.post.scheduledAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}` : "Ready to edit";
        toast.success(dir === "up" ? `${agentEngine === "codex" ? "Codex" : "Claude"} is writing it — the template version is ready now` : `Built. ${where}`, {
          action: { label: "Open", onClick: () => router.push(`/edit/${projectId}/${r.videoId}`) },
        });
        refresh(`/api/projects/${projectId}/videos`);
        refresh(`/api/projects/${projectId}/posts`);
      } catch (e) {
        toast.error((e as Error).message);
        mutate();
      }
    },
    [projectId, engine, boot, mutate, openRun, router],
  );

  const undo = async () => {
    if (!lastAction || !projectId) return;
    await patch(`/api/projects/${projectId}/ideas`, { ideaId: lastAction.idea.id, status: lastAction.status });
    setPinned(lastAction.idea.id);
    setLastAction(null);
    mutate();
  };

  const listed = (ideas ?? []).filter((i) => i.status === tab);
  const counts = { new: 0, liked: 0, made: 0, passed: 0 } as Record<Idea["status"], number>;
  for (const i of ideas ?? []) counts[i.status]++;

  return (
    <div className="flex h-screen min-h-[720px] flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-8 py-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-semibold tracking-[-0.02em]">Hook Lab</h1>
          <p className="text-[13px] text-fg-3">Swipe right to build it. Swipe up to have your agent write it. Left to pass.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            layoutId="engine-ideas"
            value={engine}
            onChange={setEngine}
            options={[
              { value: "instant", label: "Instant", icon: <Sparkles className="size-3.5" />, title: "Templates from the viral library, no wait" },
              { value: "claude", label: "Claude", icon: <Bot className="size-3.5" />, title: "Claude Code reads your brief + memory and writes hooks" },
              { value: "codex", label: "Codex", icon: <Bot className="size-3.5" />, title: "Codex writes hooks" },
            ]}
          />
          <Select value={count} onChange={(e) => setCount(Number(e.target.value))} className="h-8 w-20 text-[13px]" aria-label="How many ideas">
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
          <Popover
            align="end"
            className="w-[380px] p-3"
            trigger={
              <Button size="md" icon={<Filter className="size-3.5" />}>
                {formats.length ? `${formats.length} formats` : "All formats"}
              </Button>
            }
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-[0.08em] text-fg-3 uppercase">Formats</span>
                <button className="text-xs text-fg-2 hover:text-fg" onClick={() => setFormats([])}>
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {fw?.formats.map((f) => {
                  const on = formats.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFormats((cur) => (on ? cur.filter((x) => x !== f.id) : [...cur, f.id]))}
                      className={cn("flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors", on ? "border-accent/50 bg-accent-soft text-fg" : "border-line text-fg-2 hover:border-line-strong")}
                    >
                      {f.status === "hot" && <span className="size-1.5 rounded-full bg-accent" />}
                      {f.name}
                    </button>
                  );
                })}
              </div>
              {engine !== "instant" && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-fg-3">Focus for this batch (optional)</span>
                  <Input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="e.g. back-to-school, the new widget, parents" />
                </label>
              )}
            </div>
          </Popover>
          <Button variant={!ideas || fresh.length ? "secondary" : "primary"} loading={busy} onClick={generate} icon={<Lightbulb className="size-4" />}>
            Generate
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-6 overflow-hidden px-8 py-6">
          {!ideas ? (
            <GhostDeck />
          ) : fresh.length === 0 ? (
            <Empty
              icon={<Lightbulb className="size-5" />}
              title={counts.made + counts.passed > 0 ? "Deck cleared" : "Your first deck is one click away"}
              body={
                counts.made + counts.passed > 0
                  ? `You made ${counts.made} and passed on ${counts.passed}. Generate another batch, or let your agent try with your memory file.`
                  : "Instant ideas come from 49 proven hook templates filled with your brief. Claude/Codex write custom ones from your product and past results."
              }
              action={
                <div className="flex gap-2">
                  <Button variant="primary" loading={busy} onClick={generate} icon={<Sparkles className="size-4" />}>
                    {engine === "instant" ? "10 instant ideas" : `Ask ${engine === "codex" ? "Codex" : "Claude"} for ideas`}
                  </Button>
                </div>
              }
            />
          ) : (
            <>
              <Deck ideas={fresh} projectId={projectId} project={project} media={media} onDecide={decide} onCommand={issue} command={command} formatsMeta={fw?.formats} />
              <div className="flex items-center gap-3">
                <IconButton label="Pass" kbd="←" size="xl" variant="outline" className="rounded-full" onClick={() => fresh[0] && issue("left")}>
                  <X className="size-5 text-bad" />
                </IconButton>
                <IconButton label={`Write it with ${boot?.settings.engine === "codex" ? "Codex" : "Claude"}`} kbd="↑" size="lg" variant="outline" className="rounded-full" onClick={() => fresh[0] && issue("up")}>
                  <Bot className="size-4" />
                </IconButton>
                <IconButton label="Make it" kbd="→" size="xl" variant="primary" className="rounded-full" onClick={() => fresh[0] && issue("right")}>
                  <Check className="size-5" strokeWidth={2.6} />
                </IconButton>
                {lastAction && (
                  <Button variant="ghost" size="sm" icon={<RotateCcw className="size-3.5" />} onClick={undo}>
                    Undo
                  </Button>
                )}
              </div>
              <p className="flex items-center gap-2 text-xs text-fg-3">
                <Kbd>←</Kbd> pass <Kbd>→</Kbd> make <Kbd>↑</Kbd> agent writes it · {fresh.length} left
              </p>
            </>
          )}
        </section>

        <aside className="flex w-[360px] shrink-0 flex-col border-l border-line">
          <div className="flex gap-1 border-b border-line px-3 py-2">
            {(["new", "made", "passed"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn("flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] capitalize transition-colors", tab === t ? "bg-hover text-fg" : "text-fg-3 hover:text-fg-2")}
              >
                {t === "new" ? "Queue" : t}
                {ideas ? <span className="font-mono text-[11px] text-fg-3 tabular-nums">{counts[t]}</span> : <span className="skeleton h-3 w-4 rounded-xs" />}
              </button>
            ))}
            {tab === "passed" && counts.passed > 0 && (
              <IconButton
                label="Clear passed"
                size="sm"
                className="ml-auto"
                onClick={() =>
                  deleteWithUndo({
                    key: clearKey,
                    message: `Cleared ${counts.passed} passed idea${counts.passed === 1 ? "" : "s"}`,
                    url: `/api/projects/${projectId}/ideas`,
                    json: { status: "passed" },
                    refresh: [`/api/projects/${projectId}/ideas`],
                  })
                }
              >
                <Trash2 className="size-3.5" />
              </IconButton>
            )}
          </div>
          <ul className="flex-1 overflow-y-auto">
            {listed.map((i) => (
              <li key={i.id}>
                <button
                  onClick={() => (tab === "new" ? setPinned(i.id) : i.videoId && router.push(`/edit/${projectId}/${i.videoId}`))}
                  className={cn(
                    "relative flex w-full items-start gap-3 border-b border-line/60 px-4 py-3 text-left transition-colors hover:bg-panel",
                    fresh[0]?.id === i.id && tab === "new" && "bg-raised hover:bg-raised",
                  )}
                >
                  {fresh[0]?.id === i.id && tab === "new" && <span className="absolute top-2 bottom-2 left-0 w-[2px] rounded-full bg-accent" />}
                  <ScoreRing score={i.score} size={30} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="line-clamp-2 text-[13px] leading-snug text-fg">{i.hook}</span>
                    <span className="flex items-center gap-1.5 text-[11px] text-fg-3">
                      {FORMAT_MAP[i.formatId]?.name ?? i.formatId}
                      <span>·</span>
                      {i.source === "instant" ? "template" : i.source}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {!ideas &&
              Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="flex items-start gap-3 border-b border-line/60 px-4 py-3">
                  <Skeleton className="size-[30px] rounded-full" />
                  <span className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3 w-[85%]" />
                    <Skeleton className="h-3 w-[55%]" />
                    <Skeleton className="h-2.5 w-20" />
                  </span>
                </li>
              ))}
            {ideas && listed.length === 0 && <li className="px-4 py-8 text-center text-[13px] text-fg-3">Nothing here yet.</li>}
          </ul>
          <div className="border-t border-line px-4 py-3 text-xs leading-relaxed text-fg-3">
            Winners get 3 variations automatically suggested from your results. Losers teach your agent via <Link href="/product?tab=memory" className="text-fg-2 underline-offset-2 hover:underline">memory.md</Link>.
          </div>
        </aside>
      </div>
    </div>
  );
}

function Deck({
  ideas,
  projectId,
  project,
  media,
  onDecide,
  onCommand,
  command,
  formatsMeta,
}: {
  ideas: Idea[];
  projectId: string | null;
  project: ReturnType<typeof useActiveProject>["project"];
  media: Parameters<typeof buildSpec>[1]["media"];
  onDecide: (idea: Idea, dir: Dir) => void;
  onCommand: (dir: Dir) => void;
  command: Command | null;
  formatsMeta?: { id: string; status: string; name: string }[];
}) {
  const top = ideas.slice(0, 3);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!ideas[0] || shouldIgnoreHotkey(e)) return;
      const dir: Dir | null = e.key === "ArrowRight" ? "right" : e.key === "ArrowLeft" ? "left" : e.key === "ArrowUp" ? "up" : null;
      if (!dir) return;
      e.preventDefault();
      onCommand(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ideas, onCommand]);

  return (
    <div className="relative h-[clamp(420px,calc(100dvh-300px),640px)] w-full max-w-[min(860px,100%)]">
      <AnimatePresence initial={false}>
        {top
          .map((idea, i) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              depth={i}
              projectId={projectId}
              project={project}
              media={media}
              status={formatsMeta?.find((f) => f.id === idea.formatId)?.status}
              command={command}
              onDecide={(dir) => onDecide(idea, dir)}
            />
          ))
          .reverse()}
      </AnimatePresence>
    </div>
  );
}

function IdeaCard({
  idea,
  depth,
  projectId,
  project,
  media,
  status,
  command,
  onDecide,
}: {
  idea: Idea;
  depth: number;
  projectId: string | null;
  project: ReturnType<typeof useActiveProject>["project"];
  media: Parameters<typeof buildSpec>[1]["media"];
  status?: string;
  command: Command | null;
  onDecide: (dir: Dir) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-10, 10]);
  const yesOpacity = useTransform(x, [30, 140], [0, 1]);
  const noOpacity = useTransform(x, [-140, -30], [1, 0]);
  const exitDir = useRef<"right" | "left" | "up">("right");
  const spec = useMemo(() => (project ? buildSpec(idea.formatId, { project, hook: idea.hook, angle: idea.angle, beats: idea.beats, media, seed: idea.id.length }) : null), [project, idea, media]);
  const fmt = FORMAT_MAP[idea.formatId];
  const isTop = depth === 0;
  const decided = useRef(false);

  // Keys and buttons get the same feedback as a drag: the stamp shows, then the card leaves that way.
  const lastCommand = useRef<number | null>(command?.n ?? null);
  useEffect(() => {
    if (!command || command.n === lastCommand.current) return;
    lastCommand.current = command.n; // back cards just note it, so they don't replay it once on top
    if (!isTop || decided.current) return;
    decided.current = true;
    exitDir.current = command.dir;
    if (command.dir === "up") return onDecide("up");
    animate(x, command.dir === "right" ? 120 : -120, { duration: 0.12, ease: "easeOut" }).then(() => onDecide(command.dir));
  }, [command, isTop, onDecide, x]);

  return (
    <motion.div
      className={cn("absolute inset-0 flex touch-none items-stretch gap-6 overflow-hidden rounded-xl border border-line bg-panel p-5 shadow-2xl", isTop && "cursor-grab active:cursor-grabbing")}
      aria-hidden={!isTop || undefined}
      style={{ x: isTop ? x : 0, rotate: isTop ? rotate : 0, zIndex: 10 - depth }}
      initial={{ scale: 0.92, y: 30, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.04, y: depth * 16, opacity: depth > 2 ? 0 : 1 - depth * 0.25 }}
      exit={{ x: exitDir.current === "right" ? 700 : exitDir.current === "left" ? -700 : 0, y: exitDir.current === "up" ? -600 : 0, rotate: exitDir.current === "right" ? 14 : exitDir.current === "left" ? -14 : 0, opacity: 0, transition: { duration: 0.32, ease: [0.4, 0, 1, 1] } }}
      transition={{ type: "spring", bounce: 0.12, duration: 0.45 }}
      drag={isTop}
      dragSnapToOrigin
      dragElastic={0.7}
      onDragEnd={(_, info) => {
        if (!isTop || decided.current) return;
        if (info.offset.x > 140 || info.velocity.x > 800) {
          exitDir.current = "right";
          decided.current = true;
          onDecide("right");
        } else if (info.offset.x < -140 || info.velocity.x < -800) {
          exitDir.current = "left";
          decided.current = true;
          onDecide("left");
        } else if (info.offset.y < -160) {
          exitDir.current = "up";
          decided.current = true;
          onDecide("up");
        } else animate(x, 0, { type: "spring", bounce: 0.2 });
      }}
    >
      {isTop && (
        <>
          <motion.div style={{ opacity: yesOpacity }} className="pointer-events-none absolute top-6 left-6 z-10 -rotate-12 rounded-lg border-2 border-accent px-3 py-1 text-xl font-black tracking-wide text-accent">
            MAKE IT
          </motion.div>
          <motion.div style={{ opacity: noOpacity }} className="pointer-events-none absolute top-6 right-6 z-10 rotate-12 rounded-lg border-2 border-bad px-3 py-1 text-xl font-black tracking-wide text-bad">
            PASS
          </motion.div>
        </>
      )}
      <div className="aspect-[9/16] h-full w-auto shrink-0">
        {depth < 2 && <Reel spec={spec} projectId={projectId} mode={isTop ? "play" : "thumb"} skin={isTop ? "tiktok" : "none"} className="pointer-events-none h-full w-full ring-1 ring-line" username={project?.name.toLowerCase().replace(/[^a-z0-9]/g, "")} />}
      </div>
      {/* Back cards are only a silhouette: their text would bleed under the top card and the buttons. */}
      {isTop && (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3.5 py-1">
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={status === "hot" ? "accent" : status === "saturated" ? "warn" : "neutral"}>{fmt?.name ?? idea.formatId}</Badge>
          {status === "hot" && <Badge tone="accent">hot</Badge>}
          {status === "saturated" && <Badge tone="warn">saturated</Badge>}
          <Badge>{idea.source === "instant" ? "template" : idea.source}</Badge>
          <ScoreRing score={idea.score} size={38} className="ml-auto" />
        </div>
        <h2 className="line-clamp-4 shrink-0 text-[clamp(20px,2vw,26px)] leading-[1.15] font-semibold tracking-[-0.02em] text-fg">{idea.hook}</h2>
        <p className="line-clamp-3 shrink-0 text-[13px] leading-relaxed text-fg-3">{idea.angle}</p>
        <ol className="flex min-h-0 flex-col gap-1.5 overflow-hidden">
          {idea.beats.slice(0, 4).map((b, i) => (
            <li key={i} className="flex gap-2.5 text-[13px] text-fg-2">
              <span className="font-mono text-[11px] leading-5 text-fg-3 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="line-clamp-2 leading-5">{b}</span>
            </li>
          ))}
        </ol>
        <div className="mt-auto flex shrink-0 flex-col gap-2 border-t border-line pt-3">
          {(idea.scoreNotes.find((n) => n.startsWith("Sound:")) ?? fmt?.soundTip) && (
            <p className="flex items-start gap-2 text-xs text-fg-3">
              <Music2 className="mt-0.5 size-3.5 shrink-0" />
              <span className="line-clamp-2">{(idea.scoreNotes.find((n) => n.startsWith("Sound:")) ?? fmt?.soundTip ?? "").replace(/^Sound:\s*/, "")}</span>
            </p>
          )}
          <div className="flex min-w-0 items-center gap-2 text-fg-3">
            {idea.platforms.map((p) => (
              <PlatformIcon key={p} platform={p} />
            ))}
            {idea.caption && <span className="ml-2 min-w-0 truncate text-xs">“{idea.caption}”</span>}
          </div>
        </div>
      </div>
      )}
    </motion.div>
  );
}

/** Loading: the deck's silhouette, so the page doesn't jump when ideas arrive. */
function GhostDeck() {
  return (
    <div className="relative h-[clamp(420px,calc(100dvh-300px),640px)] w-full max-w-[min(860px,100%)]" aria-hidden>
      <div className="absolute inset-0 translate-y-4 scale-[0.96] rounded-xl border border-line bg-panel/60" />
      <div className="absolute inset-0 flex gap-6 rounded-xl border border-line bg-panel p-5">
        <Skeleton className="aspect-[9/16] h-full rounded-reel" />
        <div className="flex flex-1 flex-col gap-3 py-1">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="mt-2 h-7 w-[90%]" />
          <Skeleton className="h-7 w-[70%]" />
          <Skeleton className="mt-2 h-3.5 w-[80%]" />
          <Skeleton className="h-3.5 w-[60%]" />
        </div>
      </div>
    </div>
  );
}
