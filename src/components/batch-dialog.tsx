"use client";
import { format } from "date-fns";
import { AlertTriangle, CalendarClock, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PLATFORM_LABEL, PlatformIcon } from "@/components/platform-icon";
import { Button } from "@/components/ui/button";
import { inputCls } from "@/components/ui/field";
import { Segmented, Switch } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/overlay";
import { mediaUrl, post, refresh, useApi } from "@/lib/client/api";
import { useBootstrap } from "@/lib/client/store";
import { cn } from "@/lib/cn";
import type { Platform, Post, ProviderId, VideoDoc } from "@/lib/types";

const PLATFORMS: Platform[] = ["tiktok", "instagram", "youtube", "x", "threads", "bluesky", "linkedin"];
const short = (p: Platform) => PLATFORM_LABEL[p].replace(" Shorts", "");

/** Rendered videos with no post yet. */
export function readyToPost(videos: VideoDoc[] | undefined, posts: Post[] | undefined): VideoDoc[] {
  const posted = new Set((posts ?? []).filter((p) => p.status !== "canceled").map((p) => p.videoId));
  return (videos ?? []).filter((v) => v.status === "rendered" && v.render?.file && !posted.has(v.id));
}

/** "Post all ready videos": spread a batch across days at your posting times. */
export function BatchDialog({ open, onOpenChange, projectId, videos }: { open: boolean; onOpenChange: (v: boolean) => void; projectId: string; videos: VideoDoc[] }) {
  const router = useRouter();
  const { data: boot } = useBootstrap();
  const settings = boot?.settings;
  const publishers = boot?.publishers ?? [];
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [provider, setProvider] = useState<ProviderId>("manual");
  const [perDay, setPerDay] = useState<"1" | "2" | "3">("1");
  const [asDraft, setAsDraft] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !settings) return;
    setPicked(new Set(videos.map((v) => v.id)));
    setPlatforms(settings.defaultPlatforms?.length ? settings.defaultPlatforms : ["tiktok"]);
    setProvider(settings.defaultProvider ?? "manual");
    setAsDraft(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, settings]);

  const chosen = useMemo(() => videos.filter((v) => picked.has(v.id)), [videos, picked]);
  const { data: plan, isLoading } = useApi<{ times: string[] }>(open && chosen.length ? `/api/projects/${projectId}/posts/batch?count=${chosen.length}&perDay=${perDay}` : null, { revalidateOnFocus: false });
  const pub = publishers.find((p) => p.id === provider);
  const unsupported = platforms.filter((p) => pub && !pub.platforms.includes(p));

  const toggle = (id: string) => setPicked((cur) => {
    const next = new Set(cur);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const submit = async () => {
    if (!chosen.length) return toast("Pick at least one video.");
    if (!platforms.length) return toast("Pick at least one platform.");
    setBusy(true);
    try {
      const made = await post<Post[]>(`/api/projects/${projectId}/posts/batch`, { videoIds: chosen.map((v) => v.id), platforms, provider, perDay: Number(perDay), asDraft: platforms.includes("tiktok") ? asDraft : false });
      refresh(`/api/projects/${projectId}/posts`);
      refresh("/api/posts");
      onOpenChange(false);
      const last = made.at(-1);
      toast.success(`Scheduled ${made.length} video${made.length === 1 ? "" : "s"}`, {
        description: last ? `Through ${format(new Date(last.scheduledAt), "EEE MMM d")}${provider === "manual" ? ". You'll get a reminder at each time." : ""}` : undefined,
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
      title="Post all ready videos"
      description="Spread them across the next days at your posting times. You can move any of them in the Calendar."
      footer={
        <>
          <Button variant="ghost" className="mr-auto" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} disabled={!chosen.length || !platforms.length || (pub && !pub.ok)} onClick={submit} icon={<CalendarClock className="size-4" />}>
            Schedule {chosen.length} video{chosen.length === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-fg-2">Where</span>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => {
                const on = platforms.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => setPlatforms((cur) => (on ? cur.filter((x) => x !== p) : [...cur, p]))}
                    className={cn("flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors", on ? "border-accent/60 bg-accent-soft text-fg" : "border-line text-fg-3 hover:text-fg-2")}
                    aria-pressed={on}
                  >
                    <PlatformIcon platform={p} className="size-3" />
                    {short(p)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-fg-2">Per day</span>
            <Segmented
              layoutId="batch-perday"
              size="sm"
              value={perDay}
              onChange={setPerDay}
              options={[
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
              ]}
            />
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
                {pub.reason}{" "}
                <Link href="/settings#connect" className="underline underline-offset-2">
                  Connect accounts
                </Link>
              </span>
            </p>
          )}
          {provider === "manual" && <p className="text-xs text-fg-3">At each time you get a Mac notification, and the post kit has the file and caption ready.</p>}
          {provider === "browser" && <p className="text-xs text-fg-3">At each time Shipreel fills the upload in its Chrome window and waits for you to press Post.</p>}
          {unsupported.length > 0 && pub?.ok && <p className="text-xs text-fg-3">{pub.label} can&apos;t post to {unsupported.map(short).join(", ")}; those get marked for you to post by hand.</p>}
          {platforms.includes("tiktok") && provider === "upload-post" && (
            <label className="flex items-center justify-between gap-4 text-xs text-fg-3">
              <span>Send TikTok to drafts, so you add a trending sound before it goes live (recommended)</span>
              <Switch checked={asDraft} onCheckedChange={setAsDraft} label="Send TikTok to drafts" />
            </label>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-fg-2">
            Videos <span className="text-fg-3">· {chosen.length} of {videos.length}</span>
          </span>
          <ul className="flex max-h-72 flex-col divide-y divide-line overflow-y-auto rounded-lg border border-line">
            {videos.map((v) => {
              const on = picked.has(v.id);
              const i = chosen.findIndex((c) => c.id === v.id);
              const at = i >= 0 ? plan?.times[i] : undefined;
              return (
                <li key={v.id}>
                  <button onClick={() => toggle(v.id)} className="flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] hover:bg-hover/40" aria-pressed={on}>
                    <span className={cn("flex size-4 shrink-0 items-center justify-center rounded border", on ? "border-accent bg-accent text-accent-ink" : "border-line-strong")}>{on && <Check className="size-3" strokeWidth={3} />}</span>
                    {v.render?.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaUrl(projectId, v.render.thumb)} alt="" className="h-10 w-[22px] shrink-0 rounded-[3px] object-cover ring-1 ring-line" />
                    ) : (
                      <span className="h-10 w-[22px] shrink-0 rounded-[3px] bg-hover" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-fg">{v.spec.title}</span>
                    <span className="shrink-0 font-mono text-[11px] text-fg-3 tabular-nums">{on ? (at ? format(new Date(at), "EEE MMM d · h:mm a") : isLoading ? "…" : "") : "skip"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Dialog>
  );
}
