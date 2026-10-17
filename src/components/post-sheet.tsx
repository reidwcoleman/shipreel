"use client";
import { format } from "date-fns";
import { AlertTriangle, ArrowUp, CalendarClock, Check, Clapperboard, Copy, ExternalLink, Globe, Image as ImageIcon, LogIn, MonitorSmartphone, Send, Smartphone, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PLATFORM_LABEL, PlatformIcon } from "@/components/platform-icon";
import { Reel } from "@/components/reel";
import { useShell } from "@/components/shell/activity";
import { Button } from "@/components/ui/button";
import { inputCls } from "@/components/ui/field";
import { Badge, Progress, Segmented, Skeleton, Switch } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/overlay";
import { api, patch as apiPatch, post, put, refresh, useApi } from "@/lib/client/api";
import { useServerEvents } from "@/lib/client/events";
import { useBootstrap } from "@/lib/client/store";
import { cn } from "@/lib/cn";
import type { Platform, Post, PostKit, ProviderId, Run, VideoDoc } from "@/lib/types";
import type { VideoSpec } from "@/remotion/spec";

/**
 * The one place to post a finished video. Pick a platform, check the caption, then:
 *   iPhone      → AirDrop (or Save to Photos) and post from the app, where trending sounds live
 *   Upload page → caption copied, MP4 shown in Finder, the platform's web upload page opened
 *   Chrome      → Shipreel's Chrome window fills the upload in and stops before Post
 *   Auto-post   → Post now / Schedule through Upload-Post, Bluesky or a webhook
 */

type Mode = "phone" | "page" | "chrome" | "auto";
const SHEET_PLATFORMS: Platform[] = ["tiktok", "instagram", "youtube", "x", "threads", "bluesky"];
const PAGE_NAME: Partial<Record<Platform, string>> = { tiktok: "TikTok Studio", youtube: "YouTube Studio", instagram: "Instagram", x: "X", threads: "Threads", bluesky: "Bluesky" };
const LIMITS: Partial<Record<Platform, number>> = { tiktok: 2200, x: 280, bluesky: 300, threads: 500, youtube: 100, instagram: 2200 };
const API_PROVIDERS: ProviderId[] = ["upload-post", "bluesky", "webhook"];
const short = (p: Platform) => PLATFORM_LABEL[p].replace(" Shorts", "");

/** Caption edits survive closing and reopening the sheet (per video, this tab). */
const draftCaptions = new Map<string, Partial<Record<Platform, string>>>();

function readMode(): Mode {
  try {
    const m = localStorage.getItem("shipreel.postMode");
    if (m === "phone" || m === "page" || m === "chrome" || m === "auto") return m;
  } catch {
    /* storage blocked */
  }
  return "phone";
}

async function copyLocal(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

type Note = { tone: "ok" | "warn" | "bad" | "info"; text: string; fix?: React.ReactNode };

export function PostSheet({
  open,
  onOpenChange,
  projectId,
  videoId,
  spec,
  beforeOpen,
  onCaptionsWritten,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  videoId: string;
  /** The live spec (editor), for the preview while there's no render yet. */
  spec?: VideoSpec;
  /** e.g. flush unsaved editor changes before rendering or posting */
  beforeOpen?: () => Promise<void>;
  onCaptionsWritten?: (meta: VideoSpec["meta"]) => void;
}) {
  const router = useRouter();
  const { openRun } = useShell();
  const { data: boot, mutate: mutateBoot } = useBootstrap();
  const settings = boot?.settings;
  const publishers = useMemo(() => boot?.publishers ?? [], [boot?.publishers]);
  // Load the kit after unsaved editor changes are saved, so "changed since the last render" is right.
  const [flushed, setFlushed] = useState(false);
  const { data: kit, mutate: mutateKit, error: kitError } = useApi<PostKit>(open && flushed ? `/api/projects/${projectId}/videos/${videoId}/handoff` : null, { revalidateOnFocus: false });
  const { data: doc } = useApi<VideoDoc>(open && !spec ? `/api/projects/${projectId}/videos/${videoId}` : null, { revalidateOnFocus: false });

  const [platform, setPlatform] = useState<Platform>("tiktok");
  const [mode, setModeState] = useState<Mode>("phone");
  const [captions, setCaptions] = useState<Partial<Record<Platform, string>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [done, setDone] = useState<Partial<Record<Platform, boolean>>>({});
  const [render, setRender] = useState<{ active: boolean; progress: number }>({ active: false, progress: 0 });
  const [useOld, setUseOld] = useState(false);
  const [chromePost, setChromePost] = useState<Post | null>(null);
  const [capRun, setCapRun] = useState<string | null>(null);
  // Auto-post
  const [autoPlatforms, setAutoPlatforms] = useState<Platform[]>([]);
  const [provider, setProvider] = useState<ProviderId>("upload-post");
  const [when, setWhen] = useState<"now" | "next" | "custom">("next");
  const [custom, setCustom] = useState("");
  const [nextSlot, setNextSlot] = useState<string | null>(null);
  const [asDraft, setAsDraft] = useState(true);
  const [say, setSay] = useState("");
  const seeded = useRef<string | null>(null);

  const setMode = (m: Mode) => {
    setModeState(m);
    setNote(null);
    try {
      localStorage.setItem("shipreel.postMode", m);
    } catch {
      /* fine */
    }
  };

  // Seed state once per open.
  useEffect(() => {
    if (!open) {
      seeded.current = null;
      setFlushed(false);
      return;
    }
    setModeState(readMode());
    setNote(null);
    setDone({});
    setUseOld(false);
    setChromePost(null);
    setSay("");
    Promise.resolve(beforeOpen?.())
      .catch(() => undefined)
      .finally(() => {
        setFlushed(true);
        void mutateKit();
      });
    api<{ at: string }>(`/api/projects/${projectId}/posts?nextSlot=1`)
      .then((r) => {
        setNextSlot(r.at);
        setCustom(format(new Date(r.at), "yyyy-MM-dd'T'HH:mm"));
      })
      .catch(() => setNextSlot(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId, videoId]);

  useEffect(() => {
    if (!open || !kit || seeded.current === videoId) return;
    seeded.current = videoId;
    setCaptions({ ...kit.captions, ...(draftCaptions.get(videoId) ?? {}) });
  }, [open, kit, videoId]);

  // Auto-post defaults: the first connected API service, else the default one.
  useEffect(() => {
    if (!open || !settings) return;
    const ready = publishers.filter((p) => p.ok && API_PROVIDERS.includes(p.id));
    const def = publishers.find((p) => p.id === settings.defaultProvider && p.ok && API_PROVIDERS.includes(p.id));
    const pick = def ?? ready[0];
    setProvider(pick?.id ?? "upload-post");
    const supported = pick?.platforms ?? [];
    const defaults = ((settings.defaultPlatforms?.length ? settings.defaultPlatforms : ["tiktok"]) as Platform[]).filter((p) => !pick || supported.includes(p));
    setAutoPlatforms(defaults.length ? defaults : (["tiktok"] as Platform[]));
    setAsDraft(true);
    setWhen("next");
  }, [open, settings, publishers]);

  useServerEvents(
    (e) => {
      if (e.type === "render" && e.videoId === videoId) {
        if (e.status === "rendering") setRender({ active: true, progress: e.progress ?? 0 });
        else {
          setRender({ active: false, progress: 0 });
          if (e.status === "rendered") {
            mutateKit();
            setUseOld(false);
          } else if (e.status === "failed") setNote({ tone: "bad", text: `The render failed: ${e.error ?? "unknown error"}`, fix: "Open the editor's launch check, fix what it flags, and render again." });
        }
      }
      if (e.type === "post" && chromePost && e.post.id === chromePost.id) setChromePost(e.post);
      if (e.type === "run" && e.run.id === capRun && e.run.status !== "running") {
        setCapRun(null);
        if (e.run.status !== "done") return toast.error("Couldn't write captions", { description: e.run.error });
        api<VideoDoc>(`/api/projects/${projectId}/videos/${videoId}`).then((d) => {
          onCaptionsWritten?.(d.spec.meta);
          draftCaptions.delete(videoId);
          seeded.current = null;
          mutateKit();
          toast.success("Captions written for each platform");
        });
      }
    },
    [videoId, chromePost?.id, capRun, projectId],
  );

  const caption = captions[platform] ?? kit?.captions[platform] ?? "";
  const setCaption = (v: string) =>
    setCaptions((c) => {
      const next = { ...c, [platform]: v };
      draftCaptions.set(videoId, next);
      return next;
    });

  const usable = !!kit?.file && (kit.ready || useOld);
  const previewSpec = spec ?? doc?.spec;
  const handle = (boot?.projects.find((p) => p.id === projectId)?.name ?? "yourapp").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const chromeOk = !!kit?.browserPlatforms.includes(platform);
  const apiReady = publishers.filter((p) => p.ok && API_PROVIDERS.includes(p.id));
  const pub = publishers.find((p) => p.id === provider);
  const autoMissing = autoPlatforms.filter((p) => pub && !pub.platforms.includes(p));
  const autoAt = when === "now" ? "now" : when === "next" ? (nextSlot ?? "next") : custom ? new Date(custom).toISOString() : "next";
  const autoPostOn = !!settings?.browserAutoPost?.[platform];
  const engine = settings?.engine ?? "claude";

  const startRender = async () => {
    setNote(null);
    try {
      await beforeOpen?.();
      setRender({ active: true, progress: 0 });
      await post(`/api/projects/${projectId}/videos/${videoId}/render`, { force: !!kit?.stale });
    } catch (e) {
      setRender({ active: false, progress: 0 });
      setNote({ tone: "bad", text: (e as Error).message });
    }
  };

  const handoff = async (action: "airdrop" | "photos" | "open" | "copy", p: Platform = platform) => {
    const text = captions[p] ?? kit?.captions[p] ?? "";
    setBusy(`${action}:${p}`);
    setNote(null);
    // Copy in the click itself too (the browser's clipboard, in case the server can't).
    const local = await copyLocal(text);
    try {
      const r = await post<{ detail: string; copied?: boolean }>(`/api/projects/${projectId}/videos/${videoId}/handoff`, { action, platform: p, caption: text });
      const copied = local || r.copied;
      if (action === "copy") toast.success(`${short(p)} caption copied`);
      else if (action === "open") {
        setDone((d) => ({ ...d, [p]: true }));
        setNote({ tone: "ok", text: `${copied ? "Caption copied. " : ""}${PAGE_NAME[p] ?? short(p)} is open and the MP4 is selected in Finder: drag it in${copied ? ", then paste the caption" : ""}.` });
      } else if (action === "airdrop") setNote({ tone: "ok", text: `${r.detail}${copied ? ` The ${short(p)} caption is copied: paste it on your iPhone (Universal Clipboard).` : ""}` });
      else setNote({ tone: "ok", text: `${r.detail}${copied ? " Caption copied." : ""}` });
    } catch (e) {
      const msg = (e as Error).message;
      const perm = /System Settings/.test(msg);
      setNote({ tone: perm ? "warn" : "bad", text: msg });
    } finally {
      setBusy(null);
    }
  };

  const chromeUpload = async () => {
    setBusy("chrome");
    setNote(null);
    try {
      const p = await post<Post>(`/api/projects/${projectId}/posts`, { videoId, platforms: [platform], scheduledAt: "now", provider: "browser", captions: { [platform]: caption } });
      setChromePost(p);
      refresh(`/api/projects/${projectId}/posts`);
    } catch (e) {
      setNote({ tone: "bad", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const openLogin = async () => {
    setBusy("login");
    try {
      const r = await post<{ loggedIn: Record<string, boolean> }>("/api/publishers", { action: "browser-login" });
      const ins = Object.entries(r.loggedIn).filter(([, v]) => v).map(([k]) => short(k as Platform));
      const outs = Object.entries(r.loggedIn).filter(([, v]) => !v).map(([k]) => short(k as Platform));
      setNote({ tone: "info", text: outs.length ? `Log in to ${outs.join(", ")} in the Chrome window that just opened. You only do this once.` : `You're logged in to ${ins.join(", ")}.` });
    } catch (e) {
      setNote({ tone: "bad", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const setAutoPost = async (v: boolean) => {
    try {
      await put("/api/settings", { browserAutoPost: { ...(settings?.browserAutoPost ?? {}), [platform]: v } });
      await mutateBoot();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const autoSubmit = async () => {
    if (!autoPlatforms.length) return setNote({ tone: "warn", text: "Pick at least one platform." });
    setBusy("auto");
    setNote(null);
    try {
      await beforeOpen?.();
      const chosen = Object.fromEntries(autoPlatforms.map((p) => [p, captions[p] ?? kit?.captions[p] ?? ""]));
      const p = await post<Post>(`/api/projects/${projectId}/posts`, { videoId, platforms: autoPlatforms, scheduledAt: autoAt, provider, asDraft: autoPlatforms.includes("tiktok") ? asDraft : false, captions: chosen });
      refresh(`/api/projects/${projectId}/posts`);
      refresh("/api/posts");
      onOpenChange(false);
      toast.success(when === "now" ? "Posting now…" : `Scheduled for ${format(new Date(p.scheduledAt), "EEE MMM d, h:mm a")}`, { action: { label: "Calendar", onClick: () => router.push("/calendar") } });
    } catch (e) {
      setNote({ tone: "bad", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const askAgent = async () => {
    const q = say.trim();
    if (!q) return;
    setBusy("say");
    try {
      const run = await post<Run>("/api/agents/runs", { kind: "chat", question: `${q}\n\n(About video ${videoId}${kit ? `: "${kit.title}"` : ""}.)`, projectId, videoId, engine });
      onOpenChange(false);
      openRun(run.id);
    } catch (e) {
      setNote({ tone: "bad", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const writeCaptions = async () => {
    try {
      await beforeOpen?.();
      const run = await post<Run>(`/api/projects/${projectId}/videos/${videoId}/ai`, { mode: "captions", engine });
      setCapRun(run.id);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // ── Footer: one primary action per mode ───────────────────────────────────────
  const needsRender = !!kit && !usable;
  let primary: React.ReactNode;
  if (needsRender) {
    primary = (
      <Button variant="primary" loading={render.active} onClick={startRender} icon={<Clapperboard className="size-4" />}>
        {render.active ? `Rendering ${Math.round(render.progress * 100)}%` : kit?.stale ? "Render again" : "Render MP4"}
      </Button>
    );
  } else if (mode === "phone") {
    primary = (
      <Button variant="primary" disabled={!usable} loading={busy === `airdrop:${platform}`} onClick={() => handoff("airdrop")} icon={<Smartphone className="size-4" />}>
        AirDrop to iPhone
      </Button>
    );
  } else if (mode === "page") {
    primary = (
      <Button variant="primary" disabled={!usable || !kit?.uploadPages[platform]} loading={busy === `open:${platform}`} onClick={() => handoff("open")} icon={<ExternalLink className="size-4" />}>
        Open {PAGE_NAME[platform] ?? short(platform)}
      </Button>
    );
  } else if (mode === "chrome") {
    const running = chromePost && ["scheduled", "rendering", "posting"].includes(chromePost.status);
    primary = (
      <Button variant="primary" disabled={!usable || !chromeOk || !!running} loading={busy === "chrome" || !!running} onClick={chromeUpload} icon={<Globe className="size-4" />}>
        {running ? "Filling it in…" : autoPostOn ? `Upload and post to ${short(platform)}` : `Upload to ${short(platform)} in Chrome`}
      </Button>
    );
  } else {
    primary = (
      <Button variant="primary" disabled={!pub?.ok || !autoPlatforms.length} loading={busy === "auto"} onClick={autoSubmit} icon={when === "now" ? <Zap className="size-4" /> : <CalendarClock className="size-4" />}>
        {when === "now" ? "Post now" : "Schedule"}
      </Button>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title="Post this video"
      description="Pick where it goes, check the caption, and send it the way you like to post."
      footer={
        <>
          <Button variant="ghost" className="mr-auto" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {primary}
        </>
      }
    >
      {kitError ? (
        <p className="text-sm text-bad">{(kitError as Error).message}</p>
      ) : !kit ? (
        <div className="grid gap-6 sm:grid-cols-[180px_1fr]" aria-busy aria-label="Loading">
          <Skeleton className="hidden aspect-[9/16] rounded-reel sm:block" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-8 w-2/3" />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
          {/* Video + cover */}
          <div className="hidden flex-col gap-2 sm:flex">
            {usable && kit.url ? (
              <video src={kit.url} poster={kit.coverUrl} controls muted loop playsInline className="aspect-[9/16] w-full rounded-reel bg-black object-contain ring-1 ring-line" />
            ) : (
              <Reel spec={previewSpec} projectId={projectId} mode="play" skin="tiktok" username={handle} className="w-full ring-1 ring-line" />
            )}
            {kit.coverUrl && usable && (
              <a href={`${kit.coverUrl}?download=1`} className="flex items-center gap-2 rounded-md px-1 py-1 text-xs text-fg-3 hover:bg-hover hover:text-fg-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={kit.coverUrl} alt="" className="h-9 w-5 rounded-[3px] object-cover ring-1 ring-line" />
                <span className="flex flex-col leading-tight">
                  <span className="text-fg-2">Cover frame</span>
                  <span>Download</span>
                </span>
              </a>
            )}
            {usable && kit.durationSec != null && (
              <span className="px-1 font-mono text-[11px] text-fg-3 tabular-nums">
                {kit.durationSec.toFixed(1)}s · {((kit.sizeBytes ?? 0) / 1e6).toFixed(1)} MB
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            {/* Render state */}
            {needsRender && (
              <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg/40 px-3 py-2.5 text-[13px]">
                <span className="text-fg">{kit.stale ? "You changed this video since the last render." : "This video needs an MP4 first."}</span>
                <span className="text-xs text-fg-3">{render.active ? "Rendering… you can keep this open." : kit.stale ? "Render again so the post matches what you see, or use the last render as it is." : "Rendering takes about a minute."}</span>
                {render.active && <Progress value={render.progress} />}
                {kit.stale && !render.active && (
                  <button onClick={() => setUseOld(true)} className="self-start text-xs text-fg-2 underline underline-offset-2 hover:text-fg">
                    Use the last render
                  </button>
                )}
              </div>
            )}

            {/* Platform + caption */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-fg-2">Caption</span>
                <div className="flex items-center gap-1">
                  <Button size="xs" variant="ghost" loading={!!capRun} icon={<Sparkles className="size-3" />} onClick={writeCaptions}>
                    {capRun ? "Writing…" : `Write with ${engine === "codex" ? "Codex" : "Claude"}`}
                  </Button>
                  <Button size="xs" variant="ghost" icon={<Copy className="size-3" />} onClick={() => handoff("copy")}>
                    Copy
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1" role="tablist" aria-label="Platform">
                {SHEET_PLATFORMS.map((p) => (
                  <button
                    key={p}
                    role="tab"
                    aria-selected={platform === p}
                    onClick={() => {
                      setPlatform(p);
                      setNote(null);
                    }}
                    className={cn("flex h-7 items-center gap-1.5 rounded-md px-2 text-xs transition-colors", platform === p ? "bg-hover text-fg" : "text-fg-3 hover:text-fg-2")}
                  >
                    <PlatformIcon platform={p} className="size-3" />
                    {short(p)}
                    {done[p] && <Check className="size-3 text-ok" />}
                  </button>
                ))}
              </div>
              <div className="relative">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
                  className={cn(inputCls, "resize-y py-2 pb-6 text-[13px] leading-relaxed")}
                  placeholder={platform === "youtube" ? "Shorts title" : "Caption"}
                  aria-label={`${short(platform)} caption`}
                />
                <span className={cn("absolute right-2.5 bottom-2 font-mono text-[11px] tabular-nums", caption.length > (LIMITS[platform] ?? 2200) ? "text-bad" : "text-fg-3")}>
                  {caption.length}/{LIMITS[platform] ?? 2200}
                </span>
              </div>
            </div>

            {/* How */}
            <div className="flex flex-col gap-3">
              <Segmented
                layoutId="post-mode"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "phone", label: "iPhone", icon: <Smartphone className="size-3.5" /> },
                  { value: "page", label: "Upload page", icon: <ExternalLink className="size-3.5" /> },
                  { value: "chrome", label: "Chrome", icon: <MonitorSmartphone className="size-3.5" /> },
                  { value: "auto", label: "Auto-post", icon: <Send className="size-3.5" /> },
                ]}
              />

              {mode === "phone" && (
                <div className="flex flex-col gap-3 text-[13px] leading-relaxed text-fg-2">
                  <p>Best for reach on TikTok: post from the app, where you get trending sounds and the native editor. AirDrop sends the MP4 to your iPhone and copies the caption, ready to paste.</p>
                  {kit.soundTip && (
                    <p className="text-xs text-fg-3">
                      Sound: <span className="text-fg-2">{kit.soundTip.replace(/\.$/, "")}</span>
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" disabled={!usable} loading={busy === `photos:${platform}`} icon={<ImageIcon className="size-3.5" />} onClick={() => handoff("photos")}>
                      Save to Photos instead
                    </Button>
                    <span className="text-xs text-fg-3">Lands in a “Shipreel” album; iCloud Photos syncs it to your phone.</span>
                  </div>
                </div>
              )}

              {mode === "page" && (
                <div className="flex flex-col gap-2">
                  <p className="text-[13px] leading-relaxed text-fg-2">One click per platform: copies that caption, selects the MP4 in Finder and opens the upload page. Drag the file in and paste.</p>
                  <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
                    {SHEET_PLATFORMS.map((p) => (
                      <li key={p} className={cn("flex h-10 items-center gap-2.5 px-3 text-[13px]", p === platform && "bg-hover/40")}>
                        <PlatformIcon platform={p} className="size-3.5 text-fg-2" />
                        <span className="flex-1 text-fg">{PAGE_NAME[p]}</span>
                        {done[p] && (
                          <Badge tone="ok" icon={<Check className="size-3" />}>
                            Caption copied
                          </Badge>
                        )}
                        <Button
                          size="xs"
                          variant="ghost"
                          disabled={!usable}
                          loading={busy === `open:${p}`}
                          onClick={() => {
                            setPlatform(p);
                            void handoff("open", p);
                          }}
                        >
                          Copy &amp; open
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {mode === "chrome" && (
                <div className="flex flex-col gap-3 text-[13px] leading-relaxed text-fg-2">
                  {chromeOk ? (
                    <>
                      <p>
                        Shipreel opens {PAGE_NAME[platform]} in its own Chrome window, attaches the video and fills in the caption, then {autoPostOn ? "presses Post for you" : "stops so you check it and press Post"}. No API key. The first time, log in there once.
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="outline" loading={busy === "login"} icon={<LogIn className="size-3.5" />} onClick={openLogin}>
                          Log in to your accounts
                        </Button>
                        <label className="ml-auto flex items-center gap-2 text-xs text-fg-3">
                          Press Post for me on {short(platform)}
                          <Switch checked={autoPostOn} onCheckedChange={setAutoPost} label={`Press Post for me on ${short(platform)}`} />
                        </label>
                      </div>
                      {autoPostOn && platform === "tiktok" && <p className="text-xs text-warn">TikTok&apos;s terms restrict automated posting. Stopping before Post keeps you the one who posts.</p>}
                      {chromePost && <ChromeStatus post={chromePost} projectId={projectId} onDone={() => apiPatch(`/api/projects/${projectId}/posts`, { postId: chromePost.id, status: "posted" }).then(() => onOpenChange(false))} />}
                    </>
                  ) : (
                    <p>Chrome uploads cover TikTok, YouTube, Instagram and X. For {short(platform)}, use Upload page or Auto-post.</p>
                  )}
                </div>
              )}

              {mode === "auto" && (
                <div className="flex flex-col gap-3">
                  {apiReady.length === 0 ? (
                    <div className="flex items-start gap-2 rounded-lg border border-line bg-bg/40 px-3 py-2.5 text-[13px] text-fg-2">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
                      <span className="leading-relaxed">
                        Nothing connected yet. Upload-Post posts to TikTok, Instagram, YouTube, X and Threads with one key; Bluesky is free with an app password.{" "}
                        <Link href="/settings#connect" className="text-fg underline underline-offset-2" onClick={() => onOpenChange(false)}>
                          Connect accounts
                        </Link>
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {SHEET_PLATFORMS.map((p) => {
                          const on = autoPlatforms.includes(p);
                          return (
                            <button
                              key={p}
                              onClick={() => setAutoPlatforms((cur) => (on ? cur.filter((x) => x !== p) : [...cur, p]))}
                              className={cn("flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors", on ? "border-accent/60 bg-accent-soft text-fg" : "border-line text-fg-3 hover:text-fg-2")}
                              aria-pressed={on}
                            >
                              <PlatformIcon platform={p} className="size-3" />
                              {short(p)}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Segmented
                          layoutId="post-when"
                          size="sm"
                          value={when}
                          onChange={setWhen}
                          options={[
                            { value: "next", label: nextSlot ? `Next slot · ${format(new Date(nextSlot), "EEE h:mm a")}` : "Next slot" },
                            { value: "now", label: "Now" },
                            { value: "custom", label: "Pick a time" },
                          ]}
                        />
                        {when === "custom" && <input type="datetime-local" value={custom} onChange={(e) => setCustom(e.target.value)} className={cn(inputCls, "h-7 w-auto text-xs [color-scheme:dark]")} aria-label="Post time" />}
                        <select value={provider} onChange={(e) => setProvider(e.target.value as ProviderId)} className={cn(inputCls, "h-7 w-auto text-xs")} aria-label="Through">
                          {apiReady.map((p) => (
                            <option key={p.id} value={p.id}>
                              via {p.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {autoMissing.length > 0 && <p className="text-xs text-fg-3">{pub?.label} can&apos;t post to {autoMissing.map(short).join(", ")}; those get marked for you to post by hand.</p>}
                      {autoPlatforms.includes("tiktok") && (
                        <label className="flex items-center justify-between gap-4 text-xs text-fg-3">
                          <span>Send TikTok to drafts, so you add a trending sound in the app before it goes live (recommended)</span>
                          <Switch checked={asDraft} onCheckedChange={setAsDraft} label="Send TikTok to drafts" />
                        </label>
                      )}
                    </>
                  )}
                  <div className="relative">
                    <input
                      value={say}
                      onChange={(e) => setSay(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && askAgent()}
                      placeholder={`Or just say it: “tomorrow at 6pm on TikTok and Reels”`}
                      className={cn(inputCls, "h-8 pr-9 text-xs")}
                      aria-label={`Tell ${engine === "codex" ? "Codex" : "Claude"} when to post`}
                    />
                    <button onClick={askAgent} disabled={!say.trim() || busy === "say"} aria-label="Send" className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-md bg-hover text-fg-2 hover:text-fg disabled:opacity-40">
                      <ArrowUp className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {note && (
              <div
                role="status"
                className={cn(
                  "flex gap-2 rounded-lg border px-3 py-2.5 text-[13px] leading-relaxed",
                  note.tone === "ok" ? "border-ok/30 bg-ok-soft text-fg" : note.tone === "warn" ? "border-warn/30 bg-warn-soft text-fg" : note.tone === "bad" ? "border-bad/30 bg-bad-soft text-fg" : "border-line bg-bg/40 text-fg-2",
                )}
              >
                {note.tone === "ok" ? <Check className="mt-0.5 size-4 shrink-0 text-ok" /> : note.tone === "info" ? <LogIn className="mt-0.5 size-4 shrink-0 text-fg-3" /> : <AlertTriangle className={cn("mt-0.5 size-4 shrink-0", note.tone === "warn" ? "text-warn" : "text-bad")} />}
                <span className="flex flex-col gap-1">
                  {note.text}
                  {note.fix && <span className="text-xs text-fg-3">{note.fix}</span>}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}

/** Live progress of a Chrome upload (the post's log), and what to do next. */
function ChromeStatus({ post: p, projectId, onDone }: { post: Post; projectId: string; onDone: () => void }) {
  const running = ["scheduled", "rendering", "posting"].includes(p.status);
  const r = p.results[0];
  const last = p.log.filter((l) => !/^Scheduled for/.test(l)).slice(-3);
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg/40 px-3 py-2.5">
      <ul className="flex flex-col gap-0.5 font-mono text-[11px] leading-relaxed text-fg-3">
        {(last.length ? last : ["Starting Chrome…"]).map((l, i) => (
          <li key={i} className="truncate">
            {l.replace(/^\d{1,2}:\d{2}:\d{2}\s?(AM|PM)?\s/, "")}
          </li>
        ))}
      </ul>
      {!running && r && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          {r.ok ? (
            <Badge tone="ok" icon={<Check className="size-3" />}>
              Posted
            </Badge>
          ) : r.mode === "manual" ? (
            <>
              <span className="text-fg">{r.error}</span>
              <Button size="xs" variant="outline" icon={<Check className="size-3" />} onClick={onDone}>
                I pressed Post
              </Button>
            </>
          ) : (
            <span className="flex flex-col gap-1">
              <span className="text-bad">{r.error}</span>
              {r.screenshot && (
                <a href={`/api/media/${projectId}/${r.screenshot}`} target="_blank" rel="noreferrer" className="text-xs text-fg-2 underline underline-offset-2">
                  See what the page looked like
                </a>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
