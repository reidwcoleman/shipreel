"use client";
import { format } from "date-fns";
import { AlertTriangle, CalendarClock, Check, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PLATFORM_LABEL, PlatformIcon } from "@/components/platform-icon";
import { Reel } from "@/components/reel";
import { Button } from "@/components/ui/button";
import { inputCls } from "@/components/ui/field";
import { Segmented, Switch } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/overlay";
import { api, post } from "@/lib/client/api";
import { useServerEvents } from "@/lib/client/events";
import { useBootstrap } from "@/lib/client/store";
import { cn } from "@/lib/cn";
import type { Platform, Post, ProviderId, Run, VideoDoc } from "@/lib/types";
import { PLATFORMS, type VideoSpec } from "@/remotion/spec";

const LIMITS: Partial<Record<Platform, number>> = { tiktok: 2200, x: 270, bluesky: 290, threads: 490, youtube: 95, instagram: 2200, linkedin: 3000 };

function defaultCaption(spec: VideoSpec, p: Platform) {
  const own = spec.meta.captions?.[p];
  if (own) return own;
  const base = spec.meta.caption || spec.meta.hook.replace(/\*/g, "") || spec.title;
  const tags = spec.meta.hashtags.slice(0, 5).map((h) => `#${h}`).join(" ");
  if (p === "youtube") return base.slice(0, 90);
  if (p === "linkedin") return base;
  return tags && !/#\w/.test(base) ? `${base} ${tags}` : base;
}

export function ScheduleDialog({
  open,
  onOpenChange,
  projectId,
  videoId,
  spec,
  beforeSubmit,
  onCaptionsWritten,
  initialAt,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  videoId: string;
  spec: VideoSpec;
  /** e.g. flush unsaved editor changes before the post is created */
  beforeSubmit?: () => Promise<void>;
  onCaptionsWritten?: (captions: VideoSpec["meta"]) => void;
  /** Preselect a time (e.g. an open slot clicked in the Calendar). */
  initialAt?: Date;
}) {
  const router = useRouter();
  const { data: boot } = useBootstrap();
  const settings = boot?.settings;
  const publishers = boot?.publishers ?? [];
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [when, setWhen] = useState<"next" | "now" | "custom">("next");
  const [custom, setCustom] = useState("");
  const [nextSlot, setNextSlot] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderId>("upload-post");
  const [asDraft, setAsDraft] = useState(true);
  const [captions, setCaptions] = useState<Partial<Record<Platform, string>>>({});
  const [capTab, setCapTab] = useState<Platform>("tiktok");
  const [busy, setBusy] = useState(false);
  const [capRun, setCapRun] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !settings) return;
    const ps = (settings.defaultPlatforms?.length ? settings.defaultPlatforms : ["tiktok"]) as Platform[];
    setPlatforms(ps);
    setCapTab(ps[0]);
    setProvider(settings.defaultProvider ?? "upload-post");
    setAsDraft(true);
    setWhen(initialAt ? "custom" : "next");
    setCaptions(Object.fromEntries(PLATFORMS.map((p) => [p, defaultCaption(spec, p)])));
    api<{ at: string }>(`/api/projects/${projectId}/posts?nextSlot=1`)
      .then((r) => {
        setNextSlot(r.at);
        setCustom(format(initialAt ?? new Date(r.at), "yyyy-MM-dd'T'HH:mm"));
      })
      .catch(() => setNextSlot(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, settings, projectId]);

  // Captions written by the agent land in the video's meta; pull them in when the run finishes.
  useServerEvents(
    (e) => {
      if (e.type !== "run" || e.run.id !== capRun || e.run.status === "running") return;
      setCapRun(null);
      if (e.run.status !== "done") return toast.error("Couldn't write captions", { description: e.run.error });
      api<VideoDoc>(`/api/projects/${projectId}/videos/${videoId}`).then((d) => {
        setCaptions(Object.fromEntries(PLATFORMS.map((p) => [p, defaultCaption(d.spec, p)])));
        onCaptionsWritten?.(d.spec.meta);
        toast.success("Captions written for each platform");
      });
    },
    [capRun, projectId, videoId],
  );

  const pub = publishers.find((p) => p.id === provider);
  const unsupported = platforms.filter((p) => pub && !pub.platforms.includes(p));
  const engine = settings?.engine ?? "claude";
  const tiktokSelected = platforms.includes("tiktok");
  const at = when === "now" ? "now" : when === "next" ? nextSlot ?? "next" : custom ? new Date(custom).toISOString() : "next";

  const toggle = (p: Platform) => setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  const visible = useMemo(() => PLATFORMS.filter((p) => p !== "facebook" && p !== "pinterest"), []);

  const writeCaptions = async () => {
    try {
      await beforeSubmit?.();
      const run = await post<Run>(`/api/projects/${projectId}/videos/${videoId}/ai`, { mode: "captions", engine });
      setCapRun(run.id);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const submit = async () => {
    if (!platforms.length) return toast("Pick at least one platform.");
    setBusy(true);
    try {
      await beforeSubmit?.();
      const chosen = Object.fromEntries(platforms.map((p) => [p, captions[p] ?? ""])) as Post["captions"];
      const p = await post<Post>(`/api/projects/${projectId}/posts`, { videoId, platforms, scheduledAt: at, provider, asDraft: tiktokSelected ? asDraft : false, captions: chosen });
      onOpenChange(false);
      toast.success(when === "now" ? "Posting now…" : `Scheduled for ${format(new Date(p.scheduledAt), "EEE MMM d, h:mm a")}`, {
        description: provider === "manual" ? "You'll get a reminder with the file and caption ready to paste." : undefined,
        action: { label: "Calendar", onClick: () => router.push("/calendar") },
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title="Post this video"
      description="Shipreel renders it, then posts at the time you pick, through the service you connected."
      footer={
        <>
          <span className="mr-auto text-xs text-fg-3">
            {when === "now" ? "Goes out right after rendering." : nextSlot && when === "next" ? `Next open slot: ${format(new Date(nextSlot), "EEE MMM d, h:mm a")}` : ""}
          </span>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} disabled={!pub?.ok && provider !== "manual"} onClick={submit} icon={when === "now" ? <Zap className="size-4" /> : <CalendarClock className="size-4" />}>
            {when === "now" ? "Post now" : "Schedule"}
          </Button>
        </>
      }
    >
      <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
        <div className="hidden sm:block">
          <Reel spec={spec} projectId={projectId} mode="play" skin="tiktok" username={(boot?.projects.find((p) => p.id === projectId)?.name ?? "yourapp").toLowerCase().replace(/[^a-z0-9]+/g, "")} className="w-full ring-1 ring-line" />
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-fg-2">Where</span>
            <div className="flex flex-wrap gap-1.5">
              {visible.map((p) => {
                const on = platforms.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => toggle(p)}
                    className={cn("flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-colors", on ? "border-accent/60 bg-accent-soft text-fg" : "border-line text-fg-3 hover:border-line-strong hover:text-fg-2")}
                    aria-pressed={on}
                  >
                    <PlatformIcon platform={p} className="size-3.5" />
                    {PLATFORM_LABEL[p].replace(" Shorts", "")}
                    {on && <Check className="size-3 text-accent" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-fg-2">When</span>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                layoutId="sched-when"
                value={when}
                onChange={setWhen}
                options={[
                  { value: "next", label: nextSlot ? `Next slot · ${format(new Date(nextSlot), "EEE h:mm a")}` : "Next slot" },
                  { value: "now", label: "Now" },
                  { value: "custom", label: "Pick a time" },
                ]}
              />
              {when === "custom" && <input type="datetime-local" value={custom} onChange={(e) => setCustom(e.target.value)} className={cn(inputCls, "h-8 w-auto text-[13px] [color-scheme:dark]")} />}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-fg-2">Through</span>
            <select value={provider} onChange={(e) => setProvider(e.target.value as ProviderId)} className={cn(inputCls, "h-9 text-[13px]")}>
              {publishers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                  {p.ok ? "" : " (not set up)"}
                </option>
              ))}
            </select>
            {pub && !pub.ok && (
              <p className="flex items-start gap-1.5 text-xs text-warn">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  {pub.reason ?? "Not connected yet."}{" "}
                  <Link href="/settings" className="underline underline-offset-2">
                    Set it up
                  </Link>{" "}
                  or choose Manual.
                </span>
              </p>
            )}
            {unsupported.length > 0 && pub?.ok && <p className="text-xs text-fg-3">{pub.label} can&apos;t post to {unsupported.map((p) => PLATFORM_LABEL[p]).join(", ")}; those will be marked for you to post by hand.</p>}
            {provider === "claude-chrome" && <p className="text-xs text-warn">Experimental: Claude drives TikTok Studio in your Chrome. TikTok&apos;s terms prohibit automated posting, so use it at your own risk.</p>}
          </div>

          {tiktokSelected && (
            <label className="flex items-start justify-between gap-4 rounded-lg border border-line bg-bg/40 px-3 py-2.5">
              <span className="flex flex-col gap-0.5">
                <span className="text-[13px] font-medium text-fg">Send TikTok to drafts</span>
                <span className="text-xs leading-relaxed text-fg-3">
                  Recommended. Open TikTok, add {spec.meta.soundTip ? <b className="font-medium text-fg-2">{spec.meta.soundTip}</b> : "a trending sound"} and post. Trending songs can&apos;t be added through the API.
                </span>
              </span>
              <Switch checked={asDraft} onCheckedChange={setAsDraft} label="Send TikTok to drafts" />
            </label>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-fg-2">Captions</span>
              <Button size="xs" variant="ghost" loading={!!capRun} icon={<Sparkles className="size-3" />} onClick={writeCaptions}>
                {capRun ? `${engine === "codex" ? "Codex" : "Claude"} is writing…` : `Write with ${engine === "codex" ? "Codex" : "Claude"}`}
              </Button>
            </div>
            {platforms.length > 0 && (
              <>
                <div className="flex flex-wrap gap-1">
                  {platforms.map((p) => (
                    <button key={p} onClick={() => setCapTab(p)} className={cn("flex h-7 items-center gap-1.5 rounded-md px-2 text-xs", capTab === p ? "bg-hover text-fg" : "text-fg-3 hover:text-fg-2")}>
                      <PlatformIcon platform={p} className="size-3" />
                      {PLATFORM_LABEL[p].replace(" Shorts", "")}
                    </button>
                  ))}
                </div>
                {platforms.includes(capTab) && (
                  <div className="relative">
                    <textarea
                      value={captions[capTab] ?? ""}
                      onChange={(e) => setCaptions((c) => ({ ...c, [capTab]: e.target.value }))}
                      rows={4}
                      className={cn(inputCls, "resize-y py-2 pb-6 text-[13px] leading-relaxed")}
                      placeholder={capTab === "youtube" ? "Shorts title" : "Caption"}
                    />
                    <span className={cn("absolute right-2.5 bottom-2 font-mono text-[11px] tabular-nums", (captions[capTab]?.length ?? 0) > (LIMITS[capTab] ?? 2200) ? "text-bad" : "text-fg-3")}>
                      {captions[capTab]?.length ?? 0}/{LIMITS[capTab] ?? 2200}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
