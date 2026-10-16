"use client";
import { AlertTriangle, Check, ChevronRight, ExternalLink, FolderOpen, Import, Link2, Plus, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/page";
import { PLATFORM_LABEL, PlatformIcon } from "@/components/platform-icon";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input, inputCls, Select } from "@/components/ui/field";
import { Badge, Dot, SectionLabel, Skeleton, Switch } from "@/components/ui/misc";
import { api, post, put, refresh, useApi } from "@/lib/client/api";
import { useBootstrap } from "@/lib/client/store";
import { cn } from "@/lib/cn";
import type { Platform, PostingSlot, ProviderId, SecretKey, Settings } from "@/lib/types";
import { PLATFORMS } from "@/remotion/spec";

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsInner />
    </Suspense>
  );
}

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function Section({ id, title, hint, children }: { id: string; title: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="grid scroll-mt-8 gap-6 border-t border-line py-8 lg:grid-cols-[280px_1fr]">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {hint && <div className="text-[13px] leading-relaxed text-fg-3">{hint}</div>}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

function SecretField({ k, label, set, placeholder, hint, onSaved }: { k: SecretKey; label: string; set: boolean; placeholder?: string; hint?: React.ReactNode; onSaved: () => void }) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (value: string) => {
    setBusy(true);
    try {
      await put("/api/secrets", { [k]: value });
      setV("");
      onSaved();
      toast.success(value ? `${label} saved` : `${label} removed`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Field label={label} hint={hint} aside={set ? <Badge tone="ok" icon={<Check className="size-3" />}>Saved</Badge> : null}>
      <div className="flex gap-2">
        <Input type="password" value={v} onChange={(e) => setV(e.target.value)} placeholder={set ? "•••••••• (saved; paste to replace)" : placeholder} autoComplete="off" className="font-mono text-xs" />
        <Button onClick={() => save(v)} disabled={!v.trim()} loading={busy}>
          Save
        </Button>
        {set && (
          <Button variant="ghost" onClick={() => save("")}>
            Remove
          </Button>
        )}
      </div>
    </Field>
  );
}

const SETTINGS_TITLE = "Settings";
const SETTINGS_SUBTITLE = "Everything stays on this Mac: keys are stored in your workspace with owner-only permissions and are never sent anywhere except the service they belong to.";

/** Same frame as the loaded page (header + label/content rows), so nothing jumps when data lands. */
function SettingsSkeleton() {
  return (
    <Page className="max-w-[1100px]">
      <PageHeader title={SETTINGS_TITLE} subtitle={SETTINGS_SUBTITLE} />
      <div className="px-8" aria-busy aria-label="Loading settings">
        {Array.from({ length: 3 }).map((_, i) => (
          <section key={i} className="grid gap-6 border-t border-line py-8 lg:grid-cols-[280px_1fr]">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-3 w-44" />
            </div>
            <Skeleton className="h-40 rounded-xl" />
          </section>
        ))}
      </div>
    </Page>
  );
}

function SettingsInner() {
  const search = useSearchParams();
  const router = useRouter();
  const { data: boot, mutate } = useBootstrap();
  const { data: profiles, mutate: mutateProfiles } = useApi<{ profiles: { username: string; social_accounts?: Record<string, unknown> }[]; error?: string }>(boot?.secrets.uploadPostKey ? "/api/publishers?profiles=1" : null);
  const { data: importable } = useApi<{ id: string; file: string; keys: string[] }[]>("/api/secrets?importable=1");
  const { data: paths } = useApi<{ workspace: string; appRoot: string }>("/api/framework?paths=1");
  const s = boot?.settings;
  const secrets = boot?.secrets;
  const pubs = boot?.publishers ?? [];

  useEffect(() => {
    if (search.get("connected")) {
      toast.success("Accounts connected");
      mutateProfiles();
      // Drop the param so a refresh doesn't announce it again.
      router.replace("/settings", { scroll: false });
    }
  }, [search, mutateProfiles, router]);

  const save = async (patch: Partial<Settings>) => {
    try {
      await put("/api/settings", patch);
      await mutate();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const reload = () => {
    refresh("/api/bootstrap");
    mutateProfiles();
  };

  if (!s || !secrets) return <SettingsSkeleton />;

  const connect = async () => {
    try {
      const { url } = await post<{ url: string }>("/api/publishers", { action: "upload-post-connect", redirect: `${window.location.origin}/settings?connected=1` });
      window.open(url, "_blank");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const connected = (profiles?.profiles ?? []).flatMap((p) => Object.entries(p.social_accounts ?? {}).filter(([, v]) => v && (typeof v !== "object" || Object.keys(v as object).length)).map(([k]) => k));

  const setSlots = (slots: PostingSlot[]) => save({ slots });

  return (
    <Page className="max-w-[1100px]">
      <PageHeader title={SETTINGS_TITLE} subtitle={SETTINGS_SUBTITLE} />
      <div className="px-8">
        <Section
          id="posting"
          title="Auto-posting"
          hint={
            <>
              <p>Shipreel renders each video and posts it at its time while the app is running.</p>
              <p className="mt-2">Upload-Post is the simplest route: one key covers TikTok, Instagram, YouTube, X, LinkedIn, Threads, Facebook, Pinterest and Bluesky. TikTok needs a paid plan (about $16–24/mo); the free tier covers the rest at 10 uploads a month.</p>
            </>
          }
        >
          <div className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Upload-Post</span>
              <Dot tone={secrets.uploadPostKey ? "ok" : "neutral"} />
              <span className="text-xs text-fg-3">{secrets.uploadPostKey ? "Key saved" : "Not set up"}</span>
              <a href="https://www.upload-post.com" target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-fg-3 hover:text-fg">
                upload-post.com <ExternalLink className="size-3" />
              </a>
            </div>
            <SecretField k="uploadPostKey" label="API key" set={secrets.uploadPostKey} placeholder="Paste from Upload-Post → API Keys" onSaved={reload} />
            <Field label="Profile name" hint="The Upload-Post profile your accounts are linked to. Shipreel creates it if it doesn't exist.">
              <ProfileName onSaved={reload} set={secrets.uploadPostUser} />
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" icon={<Link2 className="size-4" />} disabled={!secrets.uploadPostKey} onClick={connect}>
                Connect accounts
              </Button>
              {profiles?.error && <span className="text-xs text-bad">{profiles.error}</span>}
              {connected.length > 0 && (
                <span className="flex flex-wrap items-center gap-1.5 text-xs text-fg-2">
                  Connected:
                  {connected.map((c) => (
                    <Badge key={c} tone="ok">
                      {PLATFORM_LABEL[c as Platform] ?? c}
                    </Badge>
                  ))}
                </span>
              )}
            </div>
          </div>

          <details className="group rounded-xl border border-line bg-panel">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-semibold select-none [&::-webkit-details-marker]:hidden">
              <ChevronRight className="size-4 text-fg-3 transition-transform duration-150 group-open:rotate-90" />
              Bluesky (free, direct)
              <Dot tone={secrets.blueskyHandle && secrets.blueskyAppPassword ? "ok" : "neutral"} />
            </summary>
            <div className="flex flex-col gap-4 border-t border-line px-5 py-4">
              <SecretField k="blueskyHandle" label="Handle" set={secrets.blueskyHandle} placeholder="you.bsky.social" onSaved={reload} />
              <SecretField k="blueskyAppPassword" label="App password" set={secrets.blueskyAppPassword} placeholder="xxxx-xxxx-xxxx-xxxx" hint="Bluesky → Settings → Privacy and security → App passwords." onSaved={reload} />
            </div>
          </details>

          <details className="group rounded-xl border border-line bg-panel">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-semibold select-none [&::-webkit-details-marker]:hidden">
              <ChevronRight className="size-4 text-fg-3 transition-transform duration-150 group-open:rotate-90" />
              Webhook (Zapier, Make, n8n, your own)
              <Dot tone={secrets.webhookUrl ? "ok" : "neutral"} />
            </summary>
            <div className="flex flex-col gap-4 border-t border-line px-5 py-4">
              <SecretField k="webhookUrl" label="Webhook URL" set={secrets.webhookUrl} placeholder="https://hooks.zapier.com/…" hint="Shipreel POSTs JSON with the post, captions per platform and local file URLs when it's time." onSaved={reload} />
            </div>
          </details>

          <div className={cn("flex flex-col gap-3 rounded-xl border p-5", s.allowBrowserPosting ? "border-warn/40 bg-warn-soft/30" : "border-line bg-panel")}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-sm font-semibold">Claude in Chrome posting (experimental)</span>
                <span className="text-[13px] leading-relaxed text-fg-2">Claude Code opens TikTok Studio in your logged-in Chrome and uploads the video for you, no API needed. TikTok&apos;s terms prohibit automated posting, so accounts can be restricted. Off by default; use it on accounts you can afford to lose.</span>
              </div>
              <Switch checked={!!s.allowBrowserPosting} onCheckedChange={(v) => save({ allowBrowserPosting: v })} label="Allow browser posting" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default service">
              <Select value={s.defaultProvider} onChange={(e) => save({ defaultProvider: e.target.value as ProviderId })}>
                {pubs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                    {p.ok ? "" : " (not set up)"}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Autopilot" hint="Swiping right in the Hook Lab also schedules the video into the next open slot.">
              <label className="flex h-9 items-center gap-3 text-[13px] text-fg-2">
                <Switch checked={s.autopilot} onCheckedChange={(v) => save({ autopilot: v })} label="Autopilot" />
                {s.autopilot ? "On" : "Off"}
              </label>
            </Field>
          </div>
          <Field label="Post to by default">
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => {
                const on = s.defaultPlatforms.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => save({ defaultPlatforms: on ? s.defaultPlatforms.filter((x) => x !== p) : [...s.defaultPlatforms, p] })}
                    className={cn("flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px]", on ? "border-accent/60 bg-accent-soft text-fg" : "border-line text-fg-3 hover:text-fg-2")}
                    aria-pressed={on}
                  >
                    <PlatformIcon platform={p} />
                    {PLATFORM_LABEL[p].replace(" Shorts", "")}
                  </button>
                );
              })}
            </div>
          </Field>
        </Section>

        <Section
          id="schedule"
          title="Posting times"
          hint={
            <>
              <p>New accounts: 1–2 posts a day for the first two weeks, then up to 3. App installs peak 7–9 PM local.</p>
              <p className="mt-2">After ~30 posts, switch to the times your own analytics show.</p>
              <p className="mt-2 text-fg-2">Times are in {s.timezone}.</p>
            </>
          }
        >
          <div className="flex flex-col gap-2">
            {s.slots.map((slot, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-panel px-3 py-2.5">
                <input type="time" value={slot.time} onChange={(e) => setSlots(s.slots.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} className={cn(inputCls, "h-8 w-36 font-mono text-[13px] [color-scheme:dark]")} aria-label="Time" />
                <div className="flex gap-1">
                  {DAYS.map((d, di) => {
                    const on = slot.days.includes(di);
                    return (
                      <button
                        key={di}
                        onClick={() => setSlots(s.slots.map((x, j) => (j === i ? { ...x, days: on ? x.days.filter((y) => y !== di) : [...x.days, di].sort() } : x)))}
                        className={cn("size-7 rounded-md text-xs font-medium", on ? "bg-accent-soft text-accent" : "bg-hover text-fg-3")}
                        aria-pressed={on}
                        aria-label={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][di]}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
                <Select value={slot.platform} onChange={(e) => setSlots(s.slots.map((x, j) => (j === i ? { ...x, platform: e.target.value as Platform } : x)))} className="h-8 w-36 text-[13px]">
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {PLATFORM_LABEL[p]}
                    </option>
                  ))}
                </Select>
                <IconButton label="Remove slot" size="sm" className="ml-auto" onClick={() => setSlots(s.slots.filter((_, j) => j !== i))}>
                  <X className="size-3.5" />
                </IconButton>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={() => setSlots([...s.slots, { platform: "tiktok", time: "19:30", days: [0, 1, 2, 3, 4, 5, 6] }])}>
                Add a time
              </Button>
              {!s.slots.some((x) => x.time === "07:30") && (
                <Button size="sm" variant="ghost" onClick={() => setSlots([...s.slots, { platform: "tiktok" as Platform, time: "07:30", days: [0, 1, 2, 3, 4, 5, 6] }].sort((a, b) => a.time.localeCompare(b.time)))}>
                  Add the 7:30 AM slot (week 3+)
                </Button>
              )}
            </div>
          </div>
        </Section>

        <Section id="voice" title="Voice and music" hint="Optional. Mac system voices work offline for free; ElevenLabs gives natural voices with exact word timing, and composes original music (≈ $0.15/min).">
          {importable?.some((i) => i.keys.includes("elevenlabsKey")) && !secrets.elevenlabsKey && (
            <div className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-[13px]">
              <Import className="size-4 shrink-0 text-accent" />
              <span className="flex-1 text-fg-2">Found an ElevenLabs key in {importable.find((i) => i.keys.includes("elevenlabsKey"))?.file}.</span>
              <Button
                size="sm"
                variant="primary"
                onClick={async () => {
                  await put("/api/secrets", { importFrom: "explainer-video" });
                  reload();
                  toast.success("ElevenLabs key imported");
                }}
              >
                Use it
              </Button>
            </div>
          )}
          <SecretField k="elevenlabsKey" label="ElevenLabs API key" set={secrets.elevenlabsKey} placeholder="sk_…" onSaved={reload} />
        </Section>

        <Section id="about" title="Workspace" hint="Your products, videos, renders and the agent framework live in plain files. Back them up, put them in git, or point an agent at them.">
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-5 text-[13px] text-fg-2">
            <div className="flex items-center gap-3">
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-fg-3">{paths?.workspace}</code>
              <Button size="sm" variant="ghost" icon={<FolderOpen className="size-3.5" />} onClick={() => post("/api/open", { path: paths?.workspace, reveal: false }).catch(() => toast.error("Couldn't open Finder"))}>
                Open
              </Button>
            </div>
            <p className="text-xs leading-relaxed text-fg-3">
              Videos render with Remotion, which is free for individuals and companies of up to 3 people. If you sell Shipreel to others or use it at a bigger company, Remotion needs a company license (remotion.pro).
            </p>
          </div>
        </Section>
      </div>
    </Page>
  );
}

function ProfileName({ set, onSaved }: { set: boolean; onSaved: () => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex gap-2">
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={set ? "saved (type to change)" : "shipreel"} className="font-mono text-xs" />
      <Button
        disabled={!v.trim()}
        onClick={async () => {
          await api("/api/secrets", { method: "PUT", json: { uploadPostUser: v.trim() } });
          setV("");
          onSaved();
          toast.success("Profile saved");
        }}
      >
        Save
      </Button>
    </div>
  );
}
