"use client";
import { Bot, Circle, Download, FolderGit2, GitPullRequest, ImagePlus, Link2, Loader2, MoreHorizontal, Plus, ScanSearch, Square, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/page";
import { ProjectIcon } from "@/components/shell/sidebar";
import { useShell } from "@/components/shell/activity";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input, inputCls, Select, Textarea } from "@/components/ui/field";
import { Badge, Empty, SectionLabel, Segmented, Skeleton } from "@/components/ui/misc";
import { Dialog, Dropdown, MenuItem } from "@/components/ui/overlay";
import { del, mediaUrl, patch, post, put, refresh, useApi } from "@/lib/client/api";
import { useActiveProject, useBootstrap, useProjectDetail } from "@/lib/client/store";
import { useTabParam } from "@/lib/client/tabs";
import { deleteWithUndo, usePendingDeletes } from "@/lib/client/undo";
import { cn } from "@/lib/cn";
import type { Asset, AssetRole, Project, Run } from "@/lib/types";
import { FONTS } from "@/remotion/fonts";
import { FONT_IDS } from "@/remotion/spec";

type Tab = "brief" | "media" | "memory" | "growth";

export default function ProductPage() {
  return (
    <Suspense fallback={null}>
      <Product />
    </Suspense>
  );
}

const TABS = ["brief", "media", "memory", "growth"] as const;

function Product() {
  const { projectId, loading } = useActiveProject();
  const { data: detail } = useProjectDetail(projectId);
  const [tab, setTab] = useTabParam<Tab>(TABS, "brief");
  const hidden = usePendingDeletes();
  const assets = useMemo(() => (detail?.assets ?? []).filter((a) => !hidden.has(`asset:${projectId}:${a.file}`)), [detail, hidden, projectId]);
  const [analyze, setAnalyze] = useState(false);
  const router = useRouter();
  const project = detail?.project;

  if (loading)
    return (
      <Page>
        <div className="flex flex-col gap-4 px-8 pt-8">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </Page>
    );
  if (!projectId) return <Empty title="No product yet" body="Add one to get started." action={<Button variant="primary" onClick={() => router.push("/welcome")}>Add a product</Button>} />;

  return (
    <Page>
      <PageHeader
        eyebrow="Product"
        title={
          project ? (
            <span className="flex items-center gap-3">
              <ProjectIcon project={project} size={30} />
              {project.name}
            </span>
          ) : (
            <Skeleton className="h-8 w-48" />
          )
        }
        subtitle={project?.oneLiner || "What Shipreel and your agents know about the product. Every hook, script and caption is written from this."}
        actions={
          <>
            <Segmented
              layoutId="prod-tab"
              value={tab}
              onChange={setTab}
              options={[
                { value: "brief", label: "Brief" },
                { value: "media", label: `Media${detail ? ` · ${assets.length}` : ""}` },
                { value: "memory", label: "Memory" },
                { value: "growth", label: "Growth" },
              ]}
            />
            <Button icon={<ScanSearch className="size-4" />} onClick={() => setAnalyze(true)}>
              Re-read product
            </Button>
            {project && <ProductMenu project={project} />}
          </>
        }
      />
      <div className="px-8">
        {!project ? (
          <Skeleton className="h-96 rounded-xl" />
        ) : tab === "brief" ? (
          <Brief key={project.updatedAt} project={project} assets={assets} />
        ) : tab === "media" ? (
          <Media project={project} assets={assets} />
        ) : tab === "memory" ? (
          <Memory projectId={project.id} />
        ) : (
          <Growth project={project} />
        )}
      </div>
      {project && <AnalyzeDialog open={analyze} onOpenChange={setAnalyze} project={project} />}
    </Page>
  );
}

function ProductMenu({ project }: { project: Project }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Dropdown
        trigger={
          <IconButton label="More" variant="outline">
            <MoreHorizontal className="size-4" />
          </IconButton>
        }
      >
        <MenuItem icon={<FolderGit2 className="size-3.5" />} onSelect={() => post("/api/open", { projectId: project.id, rel: "project.json", reveal: true }).catch(() => toast.error("Couldn't open Finder"))}>
          Show project folder
        </MenuItem>
        <MenuItem danger icon={<Trash2 className="size-3.5" />} onSelect={() => setConfirm(true)}>
          Delete product…
        </MenuItem>
      </Dropdown>
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${project.name}?`}
        description="This removes its brief, media, videos and schedule from Shipreel. Your code repo is not touched."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await del(`/api/projects/${project.id}`);
                await refresh("/api/bootstrap");
                setConfirm(false);
                router.push("/");
              }}
            >
              Delete product
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-2">This can&apos;t be undone.</p>
      </Dialog>
    </>
  );
}

// ── Brief ────────────────────────────────────────────────────────────────────────

function Lines({ value, onChange, placeholder, rows = 4 }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; rows?: number }) {
  const [text, setText] = useState(value.join("\n"));
  return (
    <Textarea
      value={text}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value.split("\n").map((l) => l.trim()).filter(Boolean));
      }}
      className="text-[13px]"
    />
  );
}

function Card({ title, hint, children, className }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-4 rounded-xl border border-line bg-panel p-5", className)}>
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {hint && <p className="text-xs leading-relaxed text-fg-3">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Brief({ project, assets }: { project: Project; assets: Asset[] }) {
  const [p, setP] = useState<Project>(project);
  const [saving, setSaving] = useState(false);
  const dirty = useMemo(() => JSON.stringify(p) !== JSON.stringify(project), [p, project]);
  const set = <K extends keyof Project>(k: K, v: Project[K]) => setP((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = p;
      await patch(`/api/projects/${project.id}`, rest);
      await refresh(`/api/projects/${project.id}`);
      await refresh("/api/bootstrap");
      toast.success("Brief saved. New ideas and videos will use it.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const logos = assets.filter((a) => a.kind === "image");

  return (
    <div className="flex flex-col gap-5 pb-20">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="The pitch" hint="Short and concrete. Hooks pull straight from these lines.">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <Input value={p.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Category">
              <Input value={p.category} onChange={(e) => set("category", e.target.value)} placeholder="Health & Fitness" />
            </Field>
          </div>
          <Field label="Tagline" hint="What goes on the CTA card.">
            <Input value={p.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </Field>
          <Field label="One-liner" hint={`Written as "${p.name || "App"} does X so you can Y".`}>
            <Textarea rows={2} value={p.oneLiner} onChange={(e) => set("oneLiner", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stage">
              <Select value={p.stage} onChange={(e) => set("stage", e.target.value as Project["stage"])}>
                <option value="idea">Idea / building</option>
                <option value="beta">Beta</option>
                <option value="launched">Launched</option>
              </Select>
            </Field>
            <Field label="Price">
              <Input value={p.price ?? ""} onChange={(e) => set("price", e.target.value || undefined)} placeholder="Free, $4.99/mo…" />
            </Field>
          </div>
        </Card>

        <Card title="Who it's for" hint="Specific people beat demographics. Hooks speak to one of them.">
          {p.audience.map((a, i) => (
            <div key={i} className="flex gap-2">
              <div className="grid flex-1 grid-cols-[160px_1fr] gap-2">
                <Input value={a.name} placeholder="gym skippers" onChange={(e) => set("audience", p.audience.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="h-8 text-[13px]" />
                <Input value={a.description} placeholder="who they are, what they want" onChange={(e) => set("audience", p.audience.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} className="h-8 text-[13px]" />
              </div>
              <IconButton label="Remove" size="sm" onClick={() => set("audience", p.audience.filter((_, j) => j !== i))}>
                <X className="size-3.5" />
              </IconButton>
            </div>
          ))}
          <Button size="sm" variant="ghost" icon={<Plus className="size-3.5" />} className="self-start" onClick={() => set("audience", [...p.audience, { name: "", description: "" }])}>
            Add a persona
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pains (first person, one per line)">
              <Lines value={p.pains} onChange={(v) => set("pains", v)} placeholder="I always skip the gym when nobody is watching" />
            </Field>
            <Field label="Outcomes (finish “I finally…”)">
              <Lines value={p.outcomes} onChange={(v) => set("outcomes", v)} placeholder="actually show up 4 times a week" />
            </Field>
          </div>
        </Card>
      </div>

      <Card title="Features, ranked by how good they look on video" hint="“Wow” is the one moment worth a punch-in zoom.">
        <div className="flex flex-col gap-2">
          {p.features.map((f, i) => (
            <div key={i} className="grid grid-cols-[200px_1fr_1fr_auto] gap-2">
              <Input value={f.name} placeholder="Feature" onChange={(e) => set("features", p.features.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="h-8 text-[13px] font-medium" />
              <Input value={f.benefit} placeholder="What it does for you" onChange={(e) => set("features", p.features.map((x, j) => (j === i ? { ...x, benefit: e.target.value } : x)))} className="h-8 text-[13px]" />
              <Input value={f.wow ?? ""} placeholder="The wow moment on screen" onChange={(e) => set("features", p.features.map((x, j) => (j === i ? { ...x, wow: e.target.value || undefined } : x)))} className="h-8 text-[13px]" />
              <IconButton label="Remove feature" size="sm" onClick={() => set("features", p.features.filter((_, j) => j !== i))}>
                <X className="size-3.5" />
              </IconButton>
            </div>
          ))}
          <Button size="sm" variant="ghost" icon={<Plus className="size-3.5" />} className="self-start" onClick={() => set("features", [...p.features, { name: "", benefit: "" }])}>
            Add a feature
          </Button>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Why it wins">
          <Field label="Differentiators">
            <Lines value={p.differentiators} onChange={(v) => set("differentiators", v)} />
          </Field>
          <Field label="Competitors">
            <Lines value={p.competitors} onChange={(v) => set("competitors", v)} rows={3} />
          </Field>
        </Card>
        <Card title="Proof" hint="Only real numbers. Shipreel never invents stats; templates that need numbers ask for these.">
          <Lines value={p.proof} onChange={(v) => set("proof", v)} rows={6} placeholder={"1,240 users in 3 weeks\n4.8★ from 210 ratings"} />
        </Card>
        <Card title="Discovery">
          <Field label="Keywords people search">
            <Lines value={p.keywords} onChange={(v) => set("keywords", v)} rows={3} />
          </Field>
          <Field label="Hashtags (no #)">
            <Input value={p.hashtags.join(" ")} onChange={(e) => set("hashtags", e.target.value.split(/[\s,]+/).map((h) => h.replace(/^#/, "")).filter(Boolean))} />
          </Field>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Voice and look" hint="Used for every template's colours, font and copy tone.">
          <Field label="Tone of voice">
            <Input value={p.tone} onChange={(e) => set("tone", e.target.value)} placeholder="funny, a bit self-deprecating, never corporate" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Accent">
              <ColorInput value={p.brand.accent} onChange={(accent) => set("brand", { ...p.brand, accent })} />
            </Field>
            <Field label="Background">
              <ColorInput value={p.brand.bg} onChange={(bg) => set("brand", { ...p.brand, bg })} />
            </Field>
            <Field label="Font">
              <Select value={p.brand.font ?? "tiktok-sans"} onChange={(e) => set("brand", { ...p.brand, font: e.target.value as Project["brand"]["font"] })}>
                {FONT_IDS.map((f) => (
                  <option key={f} value={f}>
                    {FONTS[f].label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="App icon">
            <div className="flex flex-wrap gap-2">
              {logos.slice(0, 12).map((a) => {
                const on = p.brand.logo === `asset:${a.file}`;
                return (
                  <button key={a.file} onClick={() => set("brand", { ...p.brand, logo: on ? undefined : `asset:${a.file}` })} className={cn("size-12 overflow-hidden rounded-[28%] ring-2", on ? "ring-accent" : "ring-transparent hover:ring-line-strong")} title={a.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(project.id, a.thumb ? `assets/${a.thumb}` : `assets/${a.file}`)} alt={a.name} className="size-full object-cover" />
                  </button>
                );
              })}
              {logos.length === 0 && <span className="text-xs text-fg-3">Upload your icon in Media, or import from the App Store.</span>}
            </div>
          </Field>
        </Card>
        <Card title="Where people go" hint="Name the app and the outcome in every CTA. Search-the-store CTAs catch installs that come days later.">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Call to action">
              <Select value={p.cta.action} onChange={(e) => set("cta", { ...p.cta, action: e.target.value as Project["cta"]["action"] })}>
                <option value="link-in-bio">Link in bio</option>
                <option value="app-store">Download on the App Store</option>
                <option value="google-play">Get it on Google Play</option>
                <option value="search">Search the name</option>
                <option value="url">Visit the website</option>
                <option value="comment">Comment for the link</option>
              </Select>
            </Field>
            <Field label="CTA line">
              <Input value={p.cta.text} onChange={(e) => set("cta", { ...p.cta, text: e.target.value })} placeholder="Search GymGhost on the App Store" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Website">
              <Input value={p.links.website ?? ""} onChange={(e) => set("links", { ...p.links, website: e.target.value || undefined })} placeholder="https://" />
            </Field>
            <Field label="App Store">
              <Input value={p.links.appStore ?? ""} onChange={(e) => set("links", { ...p.links, appStore: e.target.value || undefined })} placeholder="https://apps.apple.com/…" />
            </Field>
            <Field label="Google Play">
              <Input value={p.links.playStore ?? ""} onChange={(e) => set("links", { ...p.links, playStore: e.target.value || undefined })} />
            </Field>
            <Field label="Code (local folder)" hint="Agents read it; only the Attribution PR writes to it, on a branch.">
              <Input value={p.links.repoPath ?? ""} onChange={(e) => set("links", { ...p.links, repoPath: e.target.value || undefined })} placeholder="/Users/you/code/my-app" className="font-mono text-xs" />
            </Field>
          </div>
        </Card>
      </div>

      <Card title="Notes for your agents">
        <Textarea rows={3} value={p.notes ?? ""} onChange={(e) => set("notes", e.target.value || undefined)} placeholder="Anything else: launch dates, what not to say, inside jokes your users love…" />
      </Card>

      {dirty && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-line bg-raised/95 py-2 pr-2 pl-4 shadow-2xl backdrop-blur animate-[rise_0.2s_var(--ease-out)]" style={{ marginLeft: "calc(var(--sidebar-w, 232px) / 2)" }}>
          <span className="text-[13px] text-fg-2">Unsaved changes to the brief</span>
          <Button size="sm" variant="ghost" onClick={() => setP(project)}>
            Discard
          </Button>
          <Button size="sm" variant="primary" loading={saving} onClick={save}>
            Save brief
          </Button>
        </div>
      )}
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-line" style={{ background: value }}>
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Pick colour" />
      </label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "h-9 font-mono text-xs")} />
    </div>
  );
}

// ── Media ────────────────────────────────────────────────────────────────────────

const ROLES: { id: AssetRole; label: string }[] = [
  { id: "screen", label: "Screen recording" },
  { id: "facecam", label: "Face cam" },
  { id: "broll", label: "B-roll" },
  { id: "photo", label: "Photo" },
  { id: "logo", label: "Logo / icon" },
  { id: "music", label: "Music" },
];

function Media({ project, assets }: { project: Project; assets: Asset[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState<{ startedAt: number } | null>(null);
  const [sims, setSims] = useState<{ ios: { name: string }[]; android: string[] } | null>(null);
  const [link, setLink] = useState("");

  useEffect(() => {
    post<{ ios: { name: string }[]; android: string[]; recording: { startedAt: number } | null }>("/api/capture", { action: "status", projectId: project.id })
      .then((s) => {
        setSims(s);
        setRec(s.recording);
      })
      .catch(() => undefined);
  }, [project.id]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const t = toast.loading(`Adding ${files.length} file${files.length > 1 ? "s" : ""}…`);
    try {
      const fd = new FormData();
      for (const f of Array.from(files)) fd.append("files", f);
      const res = await fetch(`/api/projects/${project.id}/assets`, { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      toast.success("Added", { id: t });
      refresh(`/api/projects/${project.id}`);
    } catch (e) {
      toast.error((e as Error).message, { id: t });
    } finally {
      setBusy(false);
    }
  };

  const capture = async (action: "screenshot" | "start" | "stop", source: "ios" | "android" = "ios") => {
    try {
      if (action === "start") {
        await post("/api/capture", { projectId: project.id, action, source });
        setRec({ startedAt: Date.now() });
        return;
      }
      const t = toast.loading(action === "stop" ? "Saving the recording…" : "Capturing…");
      await post("/api/capture", { projectId: project.id, action, source });
      if (action === "stop") setRec(null);
      toast.success(action === "stop" ? "Recording added" : "Screenshot added", { id: t });
      refresh(`/api/projects/${project.id}`);
    } catch (e) {
      if (action === "stop") setRec(null);
      toast.error((e as Error).message);
    }
  };

  const importLink = async () => {
    if (!link.trim()) return;
    const t = toast.loading("Importing…");
    try {
      if (/apps\.apple\.com|itunes\.apple\.com/.test(link)) {
        await post("/api/import", { url: link.trim(), projectId: project.id, importMedia: true });
        toast.success("Imported the App Store icon and screenshots", { id: t });
      } else {
        await post(`/api/projects/${project.id}/assets/url`, { url: link.trim() });
        toast.success("Added", { id: t });
      }
      setLink("");
      refresh(`/api/projects/${project.id}`);
      refresh("/api/bootstrap");
    } catch (e) {
      toast.error((e as Error).message, { id: t });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            upload(e.dataTransfer.files);
          }}
          onClick={() => input.current?.click()}
          className={cn("flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors", drag ? "border-accent bg-accent-soft" : "border-line-strong hover:border-fg-3")}
        >
          {busy ? <Loader2 className="size-6 animate-spin text-fg-3" /> : <Upload className="size-6 text-fg-3" />}
          <span className="text-sm font-medium">Drop screen recordings, photos, face cam</span>
          <span className="text-xs text-fg-3">Real footage of the real app performs best. iPhone HEVC is converted to H.264.</span>
          <input ref={input} type="file" multiple accept="image/*,video/*,audio/*" className="hidden" onChange={(e) => upload(e.target.files)} />
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-5">
          <span className="text-sm font-medium">Record your app</span>
          <span className="text-xs leading-relaxed text-fg-3">
            {sims?.ios.length ? `Booted: ${sims.ios.map((s) => s.name).join(", ")}.` : "No iOS Simulator running. Start one from Xcode, run your app, then record."} {sims?.android.length ? `Android: ${sims.android.join(", ")}.` : ""}
          </span>
          <div className="mt-auto flex flex-wrap gap-2">
            {rec ? (
              <Button size="sm" variant="danger" icon={<Square className="size-3 fill-current" />} onClick={() => capture("stop")}>
                Stop and save
              </Button>
            ) : (
              <Button size="sm" icon={<Circle className="size-3 fill-bad text-bad" />} onClick={() => capture("start")} disabled={!sims?.ios.length}>
                Record Simulator
              </Button>
            )}
            <Button size="sm" icon={<ImagePlus className="size-3.5" />} onClick={() => capture("screenshot")} disabled={!sims?.ios.length}>
              Screenshot
            </Button>
            {!!sims?.android.length && (
              <Button size="sm" onClick={() => capture("screenshot", "android")}>
                Android screenshot
              </Button>
            )}
            {!sims?.ios.length && (
              <Button size="sm" variant="ghost" onClick={() => post("/api/capture", { action: "boot" })}>
                Open Simulator
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-5">
          <span className="text-sm font-medium">Import from a link</span>
          <span className="text-xs leading-relaxed text-fg-3">An App Store link brings in your icon and store screenshots. Any image or video URL works too.</span>
          <div className="mt-auto flex gap-2">
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://apps.apple.com/…" className="h-8 text-[13px]" onKeyDown={(e) => e.key === "Enter" && importLink()} />
            <Button size="sm" icon={<Link2 className="size-3.5" />} onClick={importLink}>
              Import
            </Button>
          </div>
        </div>
      </div>

      {assets.length === 0 ? (
        <Empty title="No media yet" body="Templates fall back to text-only scenes, which work, but real footage of your app converts better." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {assets.map((a) => (
            <div key={a.file} className="group flex flex-col gap-2">
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-black ring-1 ring-line">
                {a.kind === "audio" ? (
                  <audio src={mediaUrl(project.id, `assets/${a.file}`)} controls className="absolute inset-x-2 bottom-2 w-[calc(100%-16px)]" />
                ) : a.kind === "video" ? (
                  <video src={mediaUrl(project.id, `assets/${a.file}`)} poster={a.thumb ? mediaUrl(project.id, `assets/${a.thumb}`) : undefined} muted loop playsInline className="size-full object-cover" onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => e.currentTarget.pause()} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(project.id, a.thumb ? `assets/${a.thumb}` : `assets/${a.file}`)} alt={a.name} className="size-full object-cover" />
                )}
                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                  <IconButton label="Download" size="xs" variant="secondary" className="bg-black/60 backdrop-blur" onClick={() => window.open(`${mediaUrl(project.id, `assets/${a.file}`)}?download=1`)}>
                    <Download className="size-3" />
                  </IconButton>
                  <IconButton
                    label="Delete"
                    size="xs"
                    variant="secondary"
                    className="bg-black/60 backdrop-blur"
                    onClick={() =>
                      deleteWithUndo({
                        key: `asset:${project.id}:${a.file}`,
                        message: "Media deleted",
                        description: a.name,
                        url: `/api/projects/${project.id}/assets`,
                        json: { file: a.file },
                        refresh: [`/api/projects/${project.id}`],
                      })
                    }
                  >
                    <Trash2 className="size-3" />
                  </IconButton>
                </div>
                {a.kind === "video" && <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white">{a.durationSec?.toFixed(1)}s</span>}
              </div>
              <span className="truncate text-xs text-fg-2" title={a.name}>
                {a.name}
              </span>
              <select
                value={a.role ?? ""}
                onChange={async (e) => {
                  await patch(`/api/projects/${project.id}/assets`, { file: a.file, role: e.target.value });
                  refresh(`/api/projects/${project.id}`);
                }}
                className={cn(inputCls, "h-7 px-2 text-xs")}
                aria-label="What is this?"
              >
                <option value="" disabled>
                  What is this?
                </option>
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Memory ───────────────────────────────────────────────────────────────────────

function Memory({ projectId }: { projectId: string }) {
  const { data } = useApi<{ markdown: string }>(`/api/projects/${projectId}/memory`);
  const [text, setText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const value = text ?? data?.markdown ?? "";
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-3">
        <textarea value={value} onChange={(e) => setText(e.target.value)} rows={28} className={cn(inputCls, "resize-y py-3 font-mono text-[12.5px] leading-relaxed")} spellCheck={false} />
        <div className="flex gap-2">
          <Button
            variant="primary"
            disabled={text == null || text === data?.markdown}
            loading={saving}
            onClick={async () => {
              setSaving(true);
              await put(`/api/projects/${projectId}/memory`, { markdown: value });
              await refresh(`/api/projects/${projectId}/memory`);
              setText(null);
              setSaving(false);
              toast.success("Memory saved");
            }}
          >
            Save memory
          </Button>
          {text != null && text !== data?.markdown && (
            <Button variant="ghost" onClick={() => setText(null)}>
              Discard
            </Button>
          )}
        </div>
      </div>
      <aside className="flex flex-col gap-3 text-[13px] leading-relaxed text-fg-2">
        <SectionLabel>What this is</SectionLabel>
        <p>
          <b className="font-medium text-fg">memory.md</b> lives in the project folder. Claude and Codex read it before every task, so they don&apos;t repeat hooks that flopped and they lean into what worked.
        </p>
        <p>Shipreel adds to it automatically: winners (50K+ views) and dead hooks (under 1K) when you log results, and notes from analytics screenshots.</p>
        <p className="text-fg-3">Edit it freely. Plain Markdown, any structure.</p>
      </aside>
    </div>
  );
}

// ── Growth ───────────────────────────────────────────────────────────────────────

function Growth({ project }: { project: Project }) {
  const { openRun } = useShell();
  const { data: boot } = useBootstrap();
  const engine = boot?.settings.engine ?? "claude";
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Know which videos bring installs" hint="Organic installs often arrive days later via store search, so click tracking undercounts. One onboarding question fixes that.">
        <ul className="flex flex-col gap-2 text-[13px] leading-relaxed text-fg-2">
          <li>
            {engine === "codex" ? "Codex" : "Claude"} adds a <b className="font-medium text-fg">“How did you hear about us?”</b> step to your onboarding, matching your app&apos;s style, and stores the answer where your analytics already live.
          </li>
          <li>It works on a new branch, runs your checks and commits. It never pushes or touches main.</li>
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            loading={busy}
            disabled={!project.links.repoPath}
            icon={<GitPullRequest className="size-4" />}
            onClick={async () => {
              setBusy(true);
              try {
                const run = await post<Run>(`/api/projects/${project.id}/attribution`, { engine });
                openRun(run.id);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Open an attribution branch
          </Button>
          {!project.links.repoPath && <span className="text-xs text-warn">Set the code folder in Brief → Where people go first.</span>}
          {project.links.repoPath && <span className="truncate font-mono text-[11px] text-fg-3">{project.links.repoPath}</span>}
        </div>
      </Card>
      <Card title="Make the bio link convert" hint="From 84 accounts and ~1.2M bio-link taps: a raw App Store link converts ~1.4% of taps; a feature landing page with a smart deep link, ~5.2%.">
        <ul className="flex flex-col gap-2 text-[13px] leading-relaxed text-fg-2">
          <li>Name the app and the outcome on the last frame and in the caption. Offer “search {project.name} on the App Store”.</li>
          <li>Link one page per winning feature, not your homepage. Put the exact promise from the video at the top.</li>
          <li>TikTok bio links need 1,000 followers or a business account; until then, pin a comment with the name.</li>
        </ul>
        <Button
          icon={<Bot className="size-4" />}
          className="self-start"
          onClick={async () => {
            const run = await post<Run>("/api/agents/runs", { projectId: project.id, question: `Draft a one-page landing page (headline, 3 benefit lines, social proof, CTA) for ${project.name}'s strongest feature, written to match a short-form video promise. Give me the copy and a simple HTML file I can deploy.`, engine });
            openRun(run.id);
          }}
        >
          Draft a feature landing page
        </Button>
      </Card>
    </div>
  );
}

// ── Re-read the product ──────────────────────────────────────────────────────────

function AnalyzeDialog({ open, onOpenChange, project }: { open: boolean; onOpenChange: (v: boolean) => void; project: Project }) {
  const { openRun } = useShell();
  const { data: boot } = useBootstrap();
  const [repo, setRepo] = useState(project.links.repoPath ?? "");
  const [url, setUrl] = useState(project.links.website ?? project.links.appStore ?? "");
  const [notes, setNotes] = useState("");
  const [engine, setEngine] = useState<"claude" | "codex">(boot?.settings.engine ?? "claude");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const run = await post<Run>(`/api/projects/${project.id}/analyze`, { engine, repoPath: repo || undefined, url: url || undefined, notes: notes || undefined });
      onOpenChange(false);
      openRun(run.id);
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
      title="Re-read the product"
      description="Your agent reads the code (README, screens, onboarding, pricing, recent commits) and the website, then rewrites the brief. Read-only: it never changes your code."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} onClick={go} icon={<ScanSearch className="size-4" />}>
            Start reading
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Code folder">
          <Input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="/Users/you/code/my-app" className="font-mono text-xs" />
        </Field>
        <Field label="Website or App Store link (optional)">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        </Field>
        <Field label="Anything it should know (optional)">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Launching v2 next week; the new AI coach is the hero feature." />
        </Field>
        <Field label="Who reads it">
          <Segmented
            layoutId="an-engine"
            value={engine}
            onChange={setEngine}
            options={[
              { value: "claude", label: "Claude Code" },
              { value: "codex", label: "Codex" },
            ]}
          />
        </Field>
      </div>
    </Dialog>
  );
}

