"use client";
import { AlertTriangle, Check, Copy, Sparkles, Trash2, X } from "lucide-react";
import React from "react";
import { Button, IconButton } from "@/components/ui/button";
import { inputCls } from "@/components/ui/field";
import { Badge, SectionLabel } from "@/components/ui/misc";
import { scoreVideo } from "@/framework/score";
import { cn } from "@/lib/cn";
import type { Asset } from "@/lib/types";
import { FONTS } from "@/remotion/fonts";
import {
  ASPECTS,
  CAPTION_STYLES,
  DEVICE_FRAMES,
  FONT_IDS,
  SCENE_LABELS,
  SFX_IDS,
  TRANSITIONS,
  type Overlay,
  type Scene,
  type VideoSpec,
} from "@/remotion/spec";
import { BackgroundField, BoolField, ColorField, EnumField, ListEditor, MediaField, NumberSlider, Row, TextInput, TextStyleField } from "./fields";
import { updateOverlay, updateScene, uid, useEditor } from "./store";

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-line px-4 py-4">
      <SectionLabel aside={aside}>{title}</SectionLabel>
      {children}
    </section>
  );
}

export function Inspector({ assets, projectId, proof, onAskAgent }: { assets: Asset[]; projectId: string; proof?: string[]; onAskAgent: (instruction: string) => void }) {
  const spec = useEditor((s) => s.spec);
  const selected = useEditor((s) => s.selected);
  if (!spec) return null;
  if (selected.kind === "scene") {
    const scene = spec.scenes.find((s) => s.id === selected.id);
    if (scene) return <SceneInspector key={scene.id} scene={scene} assets={assets} projectId={projectId} onAskAgent={onAskAgent} />;
  }
  if (selected.kind === "overlay") {
    const o = spec.overlays.find((x) => x.id === selected.id);
    if (o) return <OverlayInspector key={o.id} overlay={o} assets={assets} projectId={projectId} />;
  }
  return <VideoInspector spec={spec} proof={proof} />;
}

function SceneInspector({ scene, assets, projectId, onAskAgent }: { scene: Scene; assets: Asset[]; projectId: string; onAskAgent: (i: string) => void }) {
  const edit = useEditor((s) => s.edit);
  const select = useEditor((s) => s.select);
  const spec = useEditor((s) => s.spec)!;
  const idx = spec.scenes.findIndex((s) => s.id === scene.id);
  // Field edits: `key` merges rapid keystrokes into one undo step.
  const set = (patch: Partial<Scene>, key?: string) => edit((s) => updateScene(s, scene.id, patch), key ?? Object.keys(patch).join(","));
  const lid = `sc-${scene.id}`;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Badge tone="accent">{SCENE_LABELS[scene.type]}</Badge>
        <span className="text-xs text-fg-3">Scene {idx + 1} of {spec.scenes.length}</span>
        <div className="ml-auto flex gap-0.5">
          <IconButton
            label="Duplicate scene"
            size="sm"
            onClick={() =>
              edit((s) => {
                const copy = { ...structuredClone(scene), id: uid() };
                const scenes = [...s.scenes];
                scenes.splice(idx + 1, 0, copy);
                return { ...s, scenes };
              })
            }
          >
            <Copy className="size-3.5" />
          </IconButton>
          <IconButton
            label="Delete scene"
            size="sm"
            disabled={spec.scenes.length <= 1}
            onClick={() => {
              edit((s) => ({ ...s, scenes: s.scenes.filter((x) => x.id !== scene.id) }));
              select({ kind: "video" });
            }}
          >
            <Trash2 className="size-3.5" />
          </IconButton>
          <IconButton label="Close" size="sm" onClick={() => select({ kind: "video" })}>
            <X className="size-3.5" />
          </IconButton>
        </div>
      </div>

      {scene.note && (
        <div className="mx-4 mt-4 flex gap-2 rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-xs leading-relaxed text-warn">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span className="flex-1">{scene.note}</span>
          <button className="text-warn/70 hover:text-warn" onClick={() => set({ note: undefined })} aria-label="Dismiss note">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <Section title="Content">
        <SceneFields scene={scene} set={set} assets={assets} projectId={projectId} lid={lid} />
      </Section>

      <Section title="Timing">
        <Row label="Duration" hint={`${scene.duration.toFixed(1)}s`}>
          <NumberSlider value={scene.duration} min={0.5} max={scene.type === "media" ? 40 : 20} step={0.1} onChange={(duration) => set({ duration }, "duration")} unit="s" />
        </Row>
        <Row label="Enters with">
          <EnumField layoutId={`${lid}-tr`} value={scene.transition} options={TRANSITIONS} onChange={(transition) => set({ transition })} labels={{ cut: "Cut", punch: "Punch", flash: "Flash", fade: "Fade", "slide-up": "Slide up", "slide-left": "Slide", zoom: "Zoom", whip: "Whip" }} />
        </Row>
        <Row label="Sound effect">
          <select value={scene.sfx ?? ""} onChange={(e) => set({ sfx: (e.target.value || undefined) as Scene["sfx"] })} className={cn(inputCls, "h-8 text-[13px]")}>
            <option value="">Automatic</option>
            {SFX_IDS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Row>
      </Section>

      <Section title="Ask your agent">
        <div className="flex flex-wrap gap-1.5">
          {["Make this punchier", "Shorter text", "Funnier", "More specific to my audience"].map((q) => (
            <button key={q} onClick={() => onAskAgent(`Scene ${idx + 1} (${SCENE_LABELS[scene.type]}): ${q.toLowerCase()}.`)} className="flex h-7 items-center gap-1 rounded-md border border-line px-2 text-xs text-fg-2 transition-colors hover:border-line-strong hover:text-fg">
              <Sparkles className="size-3" /> {q}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function SceneFields({ scene, set, assets, projectId, lid }: { scene: Scene; set: (p: Partial<Scene>, key?: string) => void; assets: Asset[]; projectId: string; lid: string }) {
  const caption = (c: { text: string; style?: Scene extends never ? never : import("@/remotion/spec").TextStyle } | undefined, key = "caption") => (
    <Row label="Caption (optional)">
      <TextInput value={c?.text ?? ""} onChange={(text) => set({ [key]: text ? { ...(c ?? {}), text } : undefined } as Partial<Scene>, key)} placeholder="On-screen text…" multiline rows={2} />
    </Row>
  );
  switch (scene.type) {
    case "hook":
      return (
        <>
          <Row label="Hook text" hint="*word* = highlight">
            <TextInput value={scene.text} onChange={(text) => set({ text }, "text")} multiline rows={3} />
          </Row>
          <Row label="Subline">
            <TextInput value={scene.sub ?? ""} onChange={(sub) => set({ sub: sub || undefined }, "sub")} placeholder="Optional smaller line" />
          </Row>
          <Row label="Big emoji">
            <TextInput value={scene.emoji ?? ""} onChange={(emoji) => set({ emoji: emoji || undefined }, "emoji")} placeholder="e.g. 🤯" />
          </Row>
          <TextStyleField layoutId={lid} value={scene.textStyle} onChange={(textStyle) => set({ textStyle }, "textStyle")} />
          <Row label="Background">
            <BackgroundField layoutId={`${lid}-bg`} value={scene.background} onChange={(background) => set({ background })} assets={assets} projectId={projectId} />
          </Row>
        </>
      );
    case "media":
      return (
        <>
          <Row label="Footage">
            <MediaField value={scene.src} onChange={(src, a) => src && set({ src, kind: a?.kind === "video" ? "video" : "image" })} assets={assets} projectId={projectId} />
          </Row>
          <Row label="Frame">
            <EnumField layoutId={`${lid}-dev`} value={scene.device} options={DEVICE_FRAMES} onChange={(device) => set({ device })} labels={{ none: "Full", iphone: "iPhone", browser: "Browser", floating: "Float" }} />
          </Row>
          {scene.device === "none" && (
            <Row label="Fit">
              <EnumField layoutId={`${lid}-fit`} value={scene.fit} options={["cover", "contain"] as const} onChange={(fit) => set({ fit })} />
            </Row>
          )}
          {scene.kind === "video" && (
            <>
              <Row label="Start at" hint="seconds into the clip">
                <NumberSlider value={scene.trimStart} min={0} max={Math.max(1, assets.find((a) => `asset:${a.file}` === scene.src)?.durationSec ?? 60)} step={0.1} onChange={(trimStart) => set({ trimStart }, "trim")} unit="s" />
              </Row>
              <Row label="Speed">
                <NumberSlider value={scene.playbackRate} min={0.5} max={3} step={0.05} onChange={(playbackRate) => set({ playbackRate }, "rate")} unit="×" />
              </Row>
              <Row label="Clip volume">
                <NumberSlider value={scene.volume} min={0} max={1} step={0.05} onChange={(volume) => set({ volume }, "vol")} />
              </Row>
            </>
          )}
          <Row label="Punch-in zooms" hint="focus the magic moment">
            <ListEditor
              items={scene.zooms}
              onChange={(zooms) => set({ zooms }, "zooms")}
              make={() => ({ at: Math.min(scene.duration - 1, 1), scale: 1.7, x: 0.5, y: 0.45, hold: 1.2 })}
              addLabel="Add zoom"
              max={6}
              render={(z, upd) => (
                <div className="grid grid-cols-2 gap-2">
                  <Row label="At (s)">
                    <NumberSlider value={z.at} min={0} max={scene.duration} step={0.1} onChange={(at) => upd({ at })} />
                  </Row>
                  <Row label="Zoom">
                    <NumberSlider value={z.scale} min={1.1} max={3} step={0.05} onChange={(sc) => upd({ scale: sc })} />
                  </Row>
                  <Row label="Focus X">
                    <NumberSlider value={z.x} min={0} max={1} step={0.01} onChange={(x) => upd({ x })} />
                  </Row>
                  <Row label="Focus Y">
                    <NumberSlider value={z.y} min={0} max={1} step={0.01} onChange={(y) => upd({ y })} />
                  </Row>
                </div>
              )}
            />
          </Row>
          <Row label="Taps" hint="touch ripple + click where the finger lands">
            <ListEditor
              items={scene.taps ?? []}
              onChange={(taps) => set({ taps }, "taps")}
              make={() => ({ at: Math.min(scene.duration - 0.3, 0.8), x: 0.5, y: 0.8 })}
              addLabel="Add tap"
              max={8}
              render={(t, upd) => (
                <div className="grid grid-cols-3 gap-2">
                  <Row label="At (s)">
                    <NumberSlider value={t.at} min={0} max={scene.duration} step={0.05} onChange={(at) => upd({ at })} />
                  </Row>
                  <Row label="X">
                    <NumberSlider value={t.x} min={0} max={1} step={0.01} onChange={(x) => upd({ x })} />
                  </Row>
                  <Row label="Y">
                    <NumberSlider value={t.y} min={0} max={1} step={0.01} onChange={(y) => upd({ y })} />
                  </Row>
                </div>
              )}
            />
          </Row>
          <Row label="Pop-out cards" hint="a piece of the screen lifts toward the camera">
            <ListEditor
              items={scene.callouts ?? []}
              onChange={(callouts) => set({ callouts }, "callouts")}
              make={() => ({ at: Math.min(scene.duration - 1, 0.6), hold: 1.3, x: 0.04, y: 0.4, w: 0.92, h: 0.22, size: 0.9 })}
              addLabel="Add pop-out"
              max={3}
              render={(c, upd) => (
                <div className="grid grid-cols-3 gap-2">
                  <Row label="At (s)">
                    <NumberSlider value={c.at} min={0} max={scene.duration} step={0.05} onChange={(at) => upd({ at })} />
                  </Row>
                  <Row label="Hold (s)">
                    <NumberSlider value={c.hold} min={0.3} max={4} step={0.1} onChange={(hold) => upd({ hold })} />
                  </Row>
                  <Row label="Size">
                    <NumberSlider value={c.size} min={0.4} max={1} step={0.02} onChange={(size) => upd({ size })} />
                  </Row>
                  <Row label="Left">
                    <NumberSlider value={c.x} min={0} max={1} step={0.01} onChange={(x) => upd({ x })} />
                  </Row>
                  <Row label="Top">
                    <NumberSlider value={c.y} min={0} max={1} step={0.01} onChange={(y) => upd({ y })} />
                  </Row>
                  <Row label="Width">
                    <NumberSlider value={c.w} min={0.05} max={1} step={0.01} onChange={(w) => upd({ w })} />
                  </Row>
                  <Row label="Height">
                    <NumberSlider value={c.h} min={0.02} max={1} step={0.01} onChange={(h) => upd({ h })} />
                  </Row>
                </div>
              )}
            />
          </Row>
          {caption(scene.caption)}
        </>
      );
    case "chat":
      return (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Row label="App">
              <EnumField select layoutId={`${lid}-app`} value={scene.app} options={["imessage", "whatsapp", "instagram", "discord"] as const} onChange={(app) => set({ app })} labels={{ imessage: "iMessage", whatsapp: "WhatsApp", instagram: "Instagram DM", discord: "Discord" }} />
            </Row>
            <Row label="Theme">
              <EnumField layoutId={`${lid}-th`} value={scene.theme} options={["light", "dark"] as const} onChange={(theme) => set({ theme })} />
            </Row>
          </div>
          <Row label="Contact name">
            <TextInput value={scene.contact} onChange={(contact) => set({ contact }, "contact")} />
          </Row>
          <Row label="Messages" hint="bubbles pop in one by one">
            <ListEditor
              items={scene.messages}
              onChange={(messages) => set({ messages }, "messages")}
              make={(): (typeof scene.messages)[number] => ({ from: scene.messages.at(-1)?.from === "me" ? "them" : "me", text: "…" })}
              addLabel="Add message"
              render={(m, upd) => (
                <div className="flex gap-2">
                  <button onClick={() => upd({ from: m.from === "me" ? "them" : "me" })} className={cn("h-8 w-14 shrink-0 rounded-md text-[11px] font-semibold", m.from === "me" ? "bg-[#0A84FF] text-white" : "bg-hover text-fg-2")}>
                    {m.from === "me" ? "Me" : "Them"}
                  </button>
                  {m.from === "them" && (
                    <div className="w-24 shrink-0">
                      <TextInput value={m.name ?? ""} placeholder="Sender" onChange={(name) => upd({ name: name || undefined })} />
                    </div>
                  )}
                  <TextInput value={m.text} onChange={(text) => upd({ text })} />
                </div>
              )}
            />
          </Row>
          {caption(scene.caption)}
        </>
      );
    case "notes":
      return (
        <>
          <Row label="Note title">
            <TextInput value={scene.title} onChange={(title) => set({ title }, "title")} />
          </Row>
          <BoolField label="Checklist" value={scene.checklist} onChange={(checklist) => set({ checklist })} />
          <BoolField label="Dark mode" value={scene.theme === "dark"} onChange={(d) => set({ theme: d ? "dark" : "light" })} />
          <Row label="Items">
            <ListEditor items={scene.items} onChange={(items) => set({ items }, "items")} make={() => "new item"} addLabel="Add item" render={(it, _u, i) => <TextInput value={it} onChange={(t) => set({ items: scene.items.map((x, j) => (j === i ? t : x)) }, "items")} />} />
          </Row>
          {caption(scene.caption)}
        </>
      );
    case "tweet":
      return (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Name">
              <TextInput value={scene.name} onChange={(name) => set({ name }, "name")} />
            </Row>
            <Row label="Handle">
              <TextInput value={scene.handle} onChange={(handle) => set({ handle }, "handle")} />
            </Row>
          </div>
          <Row label="Post">
            <TextInput value={scene.text} onChange={(text) => set({ text }, "text")} multiline rows={4} />
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <BoolField label="Verified" value={scene.verified} onChange={(verified) => set({ verified })} />
            <BoolField label="Dark" value={scene.theme === "dark"} onChange={(d) => set({ theme: d ? "dark" : "light" })} />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(["replies", "reposts", "likes", "views"] as const).map((k) => (
              <Row key={k} label={k}>
                <TextInput value={scene[k] ?? ""} onChange={(v) => set({ [k]: v || undefined } as Partial<Scene>, k)} placeholder="None" />
              </Row>
            ))}
          </div>
          {caption(scene.caption)}
        </>
      );
    case "reddit":
      return (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Subreddit">
              <TextInput value={scene.subreddit} onChange={(subreddit) => set({ subreddit }, "sub")} />
            </Row>
            <Row label="User">
              <TextInput value={scene.user} onChange={(user) => set({ user }, "user")} />
            </Row>
          </div>
          <Row label="Title">
            <TextInput value={scene.title} onChange={(title) => set({ title }, "title")} multiline rows={2} />
          </Row>
          <Row label="Body">
            <TextInput value={scene.body ?? ""} onChange={(body) => set({ body: body || undefined }, "body")} multiline rows={3} />
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Upvotes">
              <TextInput value={scene.upvotes ?? ""} onChange={(upvotes) => set({ upvotes: upvotes || undefined }, "upvotes")} placeholder="None" />
            </Row>
            <Row label="Comments">
              <TextInput value={scene.comments ?? ""} onChange={(comments) => set({ comments: comments || undefined }, "comments")} placeholder="None" />
            </Row>
          </div>
          <BoolField label="Dark" value={scene.theme === "dark"} onChange={(d) => set({ theme: d ? "dark" : "light" })} />
          {caption(scene.caption)}
        </>
      );
    case "comment":
      return (
        <>
          <Row label="Commenter">
            <TextInput value={scene.username} onChange={(username) => set({ username }, "user")} />
          </Row>
          <Row label="Comment">
            <TextInput value={scene.text} onChange={(text) => set({ text }, "text")} multiline rows={2} />
          </Row>
          <Row label="Background">
            <BackgroundField layoutId={`${lid}-bg`} value={scene.background} onChange={(background) => set({ background })} assets={assets} projectId={projectId} />
          </Row>
          {caption(scene.caption)}
        </>
      );
    case "list":
      return (
        <>
          <Row label="Title">
            <TextInput value={scene.title} onChange={(title) => set({ title }, "title")} multiline rows={2} />
          </Row>
          <BoolField label="Numbered" value={scene.numbered} onChange={(numbered) => set({ numbered })} />
          <Row label="Items" hint="highlight = your app">
            <ListEditor
              items={scene.items}
              onChange={(items) => set({ items }, "items")}
              make={(): { text: string; sub?: string } => ({ text: "New item" })}
              addLabel="Add item"
              render={(it, upd, i) => (
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-1.5">
                    <TextInput value={it.text} onChange={(text) => upd({ text })} />
                    <button onClick={() => set({ highlight: scene.highlight === i ? undefined : i })} className={cn("h-8 shrink-0 rounded-md px-2 text-[11px]", scene.highlight === i ? "bg-accent text-accent-ink" : "bg-hover text-fg-3")}>
                      ★
                    </button>
                  </div>
                  <TextInput value={it.sub ?? ""} onChange={(sub) => upd({ sub: sub || undefined })} placeholder="Subtitle" />
                </div>
              )}
            />
          </Row>
        </>
      );
    case "stat":
      return (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Row label="Prefix">
              <TextInput value={scene.prefix} onChange={(prefix) => set({ prefix }, "prefix")} placeholder="$" />
            </Row>
            <Row label="Number">
              <input type="number" value={scene.to} onChange={(e) => set({ to: Number(e.target.value) || 0 }, "to")} className={cn(inputCls, "h-8 font-mono text-[13px]")} />
            </Row>
            <Row label="Suffix">
              <TextInput value={scene.suffix} onChange={(suffix) => set({ suffix }, "suffix")} placeholder="+" />
            </Row>
          </div>
          <Row label="Label">
            <TextInput value={scene.label} onChange={(label) => set({ label }, "label")} />
          </Row>
          <Row label="Subline">
            <TextInput value={scene.sub ?? ""} onChange={(sub) => set({ sub: sub || undefined }, "sub")} />
          </Row>
          <BoolField label="Growth chart" value={scene.chart} onChange={(chart) => set({ chart })} />
        </>
      );
    case "split":
      return (
        <>
          {(["top", "bottom"] as const).map((side) => (
            <div key={side} className="flex flex-col gap-2 rounded-md border border-line p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold capitalize text-fg-2">{side}</span>
                <EnumField layoutId={`${lid}-${side}-tone`} value={scene[side].tone} options={["bad", "neutral", "good"] as const} onChange={(tone) => set({ [side]: { ...scene[side], tone } } as Partial<Scene>)} />
              </div>
              <TextInput value={scene[side].label} onChange={(label) => set({ [side]: { ...scene[side], label } } as Partial<Scene>, `${side}-label`)} placeholder="Label (e.g. before)" />
              <TextInput value={scene[side].text ?? ""} onChange={(text) => set({ [side]: { ...scene[side], text: text || undefined } } as Partial<Scene>, `${side}-text`)} placeholder="Text (if no media)" />
              <MediaField value={scene[side].src} allowNone onChange={(src, a) => set({ [side]: { ...scene[side], src, kind: a?.kind === "video" ? "video" : "image" } } as Partial<Scene>)} assets={assets} projectId={projectId} />
            </div>
          ))}
          <Row label="Top panel share" hint={`${Math.round(scene.ratio * 100)}%`}>
            <NumberSlider value={scene.ratio} min={0.3} max={0.72} step={0.01} onChange={(ratio) => set({ ratio }, "ratio")} />
          </Row>
          {caption(scene.caption)}
        </>
      );
    case "cta":
      return (
        <>
          <Row label="App name">
            <TextInput value={scene.appName} onChange={(appName) => set({ appName }, "app")} />
          </Row>
          <Row label="Headline" hint="name the outcome">
            <TextInput value={scene.headline} onChange={(headline) => set({ headline }, "headline")} multiline rows={2} />
          </Row>
          <Row label="Subline">
            <TextInput value={scene.sub ?? ""} onChange={(sub) => set({ sub: sub || undefined }, "sub")} />
          </Row>
          <Row label="Action">
            <EnumField layoutId={`${lid}-act`} value={scene.action} options={["link-in-bio", "app-store", "google-play", "search", "url", "comment"] as const} onChange={(action) => set({ action })} labels={{ "link-in-bio": "Link in bio", "app-store": "App Store", "google-play": "Google Play", search: "Search name", url: "Website", comment: "Comment for link" }} />
          </Row>
          {scene.action === "url" && (
            <Row label="URL">
              <TextInput value={scene.url ?? ""} onChange={(url) => set({ url }, "url")} placeholder="yourapp.com" />
            </Row>
          )}
          <Row label="Icon">
            <MediaField value={scene.icon} allowNone accept="image" onChange={(icon) => set({ icon })} assets={assets} projectId={projectId} />
          </Row>
          <Row label="Background">
            <BackgroundField layoutId={`${lid}-bg`} value={scene.background} onChange={(background) => set({ background })} assets={assets} projectId={projectId} />
          </Row>
        </>
      );
    case "slide":
      return (
        <>
          <Row label="Slide text" hint="4–6 words per line">
            <TextInput value={scene.text} onChange={(text) => set({ text }, "text")} multiline rows={4} />
          </Row>
          <Row label="Photo">
            <MediaField value={scene.image} allowNone accept="image" onChange={(image) => set({ image })} assets={assets} projectId={projectId} />
          </Row>
          {!scene.image && (
            <Row label="Background">
              <BackgroundField layoutId={`${lid}-bg`} value={scene.background} onChange={(background) => set({ background })} assets={assets} projectId={projectId} />
            </Row>
          )}
          <TextStyleField layoutId={lid} value={scene.textStyle} onChange={(textStyle) => set({ textStyle }, "textStyle")} />
        </>
      );
    case "kinetic":
      return (
        <>
          <Row label="Words" hint="one per beat; every 3rd is highlighted">
            <TextInput value={scene.words.join(" ")} onChange={(t) => set({ words: t.split(/\s+/).filter(Boolean).length ? t.split(/\s+/).filter(Boolean) : ["…"] }, "words")} multiline rows={2} />
          </Row>
          <TextStyleField layoutId={lid} value={scene.textStyle} onChange={(textStyle) => set({ textStyle }, "textStyle")} />
        </>
      );
    case "notifications":
      return (
        <>
          <Row label="Notifications">
            <ListEditor
              items={scene.items}
              onChange={(items) => set({ items }, "items")}
              make={() => ({ app: "Stripe", title: "Stripe", body: "You received a payment of $9.99", time: "now" })}
              addLabel="Add notification"
              render={(n, upd) => (
                <div className="flex flex-col gap-1.5">
                  <div className="grid grid-cols-[1fr_72px] gap-1.5">
                    <TextInput value={n.title} onChange={(title) => upd({ title, app: title })} />
                    <TextInput value={n.time} onChange={(time) => upd({ time })} />
                  </div>
                  <TextInput value={n.body} onChange={(body) => upd({ body })} />
                </div>
              )}
            />
          </Row>
          {caption(scene.caption)}
        </>
      );
    case "terminal":
      return (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Agent">
              <EnumField select layoutId={`${lid}-ag`} value={scene.agent} options={["claude", "codex", "shell"] as const} onChange={(agent) => set({ agent })} labels={{ claude: "Claude Code", codex: "Codex", shell: "Shell" }} />
            </Row>
            <Row label="Window title">
              <TextInput value={scene.title} onChange={(title) => set({ title }, "title")} mono />
            </Row>
          </div>
          <Row label="Lines">
            <ListEditor
              items={scene.lines}
              onChange={(lines) => set({ lines }, "lines")}
              make={() => ({ kind: "output" as const, text: "…" })}
              addLabel="Add line"
              render={(l, upd) => (
                <div className="flex gap-1.5">
                  <select value={l.kind} onChange={(e) => upd({ kind: e.target.value as typeof l.kind })} className={cn(inputCls, "h-8 w-24 shrink-0 text-xs")}>
                    {["input", "output", "success", "dim"].map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                  <TextInput value={l.text} onChange={(text) => upd({ text })} mono />
                </div>
              )}
            />
          </Row>
          {caption(scene.caption)}
        </>
      );
    case "appstore":
      return (
        <>
          <Row label="App name">
            <TextInput value={scene.appName} onChange={(appName) => set({ appName }, "name")} />
          </Row>
          <Row label="Subtitle">
            <TextInput value={scene.subtitle} onChange={(subtitle) => set({ subtitle }, "subtitle")} />
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Rating">
              <input
                type="number"
                step={0.1}
                min={0}
                max={5}
                value={scene.rating ?? ""}
                placeholder="None"
                onChange={(e) => set({ rating: e.target.value === "" ? undefined : Math.min(5, Math.max(0, Number(e.target.value))) }, "rating")}
                className={cn(inputCls, "h-8 font-mono text-[13px]")}
              />
            </Row>
            <Row label="Ratings count">
              <TextInput value={scene.ratings ?? ""} onChange={(ratings) => set({ ratings: ratings || undefined }, "ratings")} placeholder="e.g. 2.1K" />
            </Row>
            <Row label="Chart rank">
              <TextInput value={scene.chart ?? ""} onChange={(chart) => set({ chart: chart || undefined }, "chart")} placeholder="e.g. #4" />
            </Row>
            <Row label="Category">
              <TextInput value={scene.category} onChange={(category) => set({ category }, "cat")} />
            </Row>
          </div>
          <p className="text-xs leading-relaxed text-fg-3">Ratings and chart rank only appear when filled in. Use your real App Store numbers.</p>
          <Row label="Icon">
            <MediaField value={scene.icon} allowNone accept="image" onChange={(icon) => set({ icon })} assets={assets} projectId={projectId} />
          </Row>
          {caption(scene.caption)}
        </>
      );
  }
}

function OverlayInspector({ overlay, assets, projectId }: { overlay: Overlay; assets: Asset[]; projectId: string }) {
  const edit = useEditor((s) => s.edit);
  const select = useEditor((s) => s.select);
  const set = (patch: Partial<Overlay>, key?: string) => edit((s) => updateOverlay(s, overlay.id, patch), key ?? Object.keys(patch).join(","));
  const label = { text: "Text overlay", progress: "Progress bar", watermark: "Watermark", sticker: "Sticker", pip: "Face cam (PiP)" }[overlay.type];
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Badge tone="info">{label}</Badge>
        <div className="ml-auto flex gap-0.5">
          <IconButton
            label="Delete overlay"
            size="sm"
            onClick={() => {
              edit((s) => ({ ...s, overlays: s.overlays.filter((o) => o.id !== overlay.id) }));
              select({ kind: "video" });
            }}
          >
            <Trash2 className="size-3.5" />
          </IconButton>
          <IconButton label="Close" size="sm" onClick={() => select({ kind: "video" })}>
            <X className="size-3.5" />
          </IconButton>
        </div>
      </div>
      <Section title="Content">
        {overlay.type === "text" && (
          <>
            <Row label="Text">
              <TextInput value={overlay.text} onChange={(text) => set({ text }, "text")} multiline rows={3} />
            </Row>
            <TextStyleField layoutId={`ov-${overlay.id}`} value={overlay.textStyle} onChange={(textStyle) => set({ textStyle }, "ts")} />
          </>
        )}
        {overlay.type === "watermark" && (
          <>
            <Row label="Text">
              <TextInput value={overlay.text} onChange={(text) => set({ text }, "text")} />
            </Row>
            <Row label="Corner">
              <EnumField layoutId={`ov-${overlay.id}-c`} value={overlay.corner} options={["top-left", "top-right", "bottom-left", "bottom-right"] as const} onChange={(corner) => set({ corner })} />
            </Row>
          </>
        )}
        {overlay.type === "sticker" && (
          <>
            <Row label="Emoji">
              <TextInput value={overlay.emoji} onChange={(emoji) => set({ emoji }, "emoji")} />
            </Row>
            <div className="grid grid-cols-2 gap-2">
              <Row label="X">
                <NumberSlider value={overlay.x} min={0} max={1} step={0.01} onChange={(x) => set({ x }, "x")} />
              </Row>
              <Row label="Y">
                <NumberSlider value={overlay.y} min={0} max={1} step={0.01} onChange={(y) => set({ y }, "y")} />
              </Row>
            </div>
          </>
        )}
        {overlay.type === "progress" && (
          <Row label="Colour">
            <ColorField value={overlay.color ?? "#D7FF3A"} onChange={(color) => set({ color }, "color")} />
          </Row>
        )}
        {overlay.type === "pip" && (
          <>
            <Row label="Clip">
              <MediaField value={overlay.src} onChange={(src, a) => src && set({ src, kind: a?.kind === "video" ? "video" : "image" })} assets={assets} projectId={projectId} />
            </Row>
            <div className="grid grid-cols-2 gap-2">
              <Row label="Shape">
                <EnumField layoutId={`ov-${overlay.id}-sh`} value={overlay.shape} options={["rounded", "circle"] as const} onChange={(shape) => set({ shape })} />
              </Row>
              <Row label="Corner">
                <select value={overlay.corner} onChange={(e) => set({ corner: e.target.value as typeof overlay.corner })} className={cn(inputCls, "h-8 text-[13px]")}>
                  <option value="bottom-left">Bottom left</option>
                  <option value="bottom-center">Bottom centre</option>
                  <option value="bottom-right">Bottom right</option>
                </select>
              </Row>
            </div>
            <Row label="Size">
              <NumberSlider value={overlay.size} min={0.2} max={0.7} step={0.01} onChange={(size) => set({ size }, "size")} />
            </Row>
            <Row label="Volume">
              <NumberSlider value={overlay.volume} min={0} max={1} step={0.05} onChange={(volume) => set({ volume }, "vol")} />
            </Row>
          </>
        )}
      </Section>
      <Section title="Timing">
        <div className="grid grid-cols-2 gap-2">
          <Row label="Start (s)">
            <input type="number" step={0.1} value={overlay.start} onChange={(e) => set({ start: Math.max(0, Number(e.target.value)) }, "start")} className={cn(inputCls, "h-8 font-mono text-[13px]")} />
          </Row>
          <Row label="End (s)" hint="0 = until the end">
            <input type="number" step={0.1} value={overlay.end} onChange={(e) => set({ end: Math.max(0, Number(e.target.value)) }, "end")} className={cn(inputCls, "h-8 font-mono text-[13px]")} />
          </Row>
        </div>
      </Section>
    </div>
  );
}

function VideoInspector({ spec, proof }: { spec: VideoSpec; proof?: string[] }) {
  const edit = useEditor((s) => s.edit);
  const theme = spec.theme;
  const setTheme = (patch: Partial<VideoSpec["theme"]>, key?: string) => edit((s) => ({ ...s, theme: { ...s.theme, ...patch } }), key ?? `theme.${Object.keys(patch).join(",")}`);
  const setMeta = (patch: Partial<VideoSpec["meta"]>, key?: string) => edit((s) => ({ ...s, meta: { ...s.meta, ...patch } }), key ?? `meta.${Object.keys(patch).join(",")}`);
  const { score, checks } = scoreVideo(spec, { proof });
  return (
    <div className="flex flex-col">
      <Section title="Launch check" aside={<span className={cn("font-mono text-sm tabular-nums", score >= 75 ? "text-ok" : score >= 55 ? "text-warn" : "text-fg-3")}>{score}/100</span>}>
        <ul className="flex flex-col gap-2">
          {checks.map((c) => (
            <li key={c.id} className="flex gap-2.5 text-[13px]">
              <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full", c.ok ? "bg-ok/90 text-bg" : "border border-line-strong")}>{c.ok && <Check className="size-2.5" strokeWidth={3.5} />}</span>
              <span className="flex flex-col gap-0.5">
                <span className={c.ok ? "text-fg-2" : "text-fg"}>{c.label}</span>
                {!c.ok && <span className="text-xs leading-relaxed text-fg-3">{c.tip}</span>}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] leading-relaxed text-fg-3">A triage aid built from what app marketers report works, not a promise. Your own results (Calendar → Results) matter more.</p>
      </Section>
      <Section title="Post">
        <Row label="Caption" hint={`${spec.meta.caption.length}/150`}>
          <TextInput value={spec.meta.caption} onChange={(caption) => setMeta({ caption }, "caption")} multiline rows={3} />
        </Row>
        <Row label="Hashtags" hint="≤ 5">
          <TextInput value={spec.meta.hashtags.map((h) => `#${h}`).join(" ")} onChange={(t) => setMeta({ hashtags: t.split(/[\s,]+/).map((h) => h.replace(/^#/, "")).filter(Boolean).slice(0, 8) }, "tags")} />
        </Row>
        <Row label="Sound to add when posting">
          <TextInput value={spec.meta.soundTip ?? ""} onChange={(soundTip) => setMeta({ soundTip }, "sound")} placeholder="e.g. trending upbeat sound, drop at 2s" />
        </Row>
      </Section>
      <Section title="Look">
        <div className="grid grid-cols-2 gap-2">
          <Row label="Format">
            <select value={spec.aspect} onChange={(e) => edit((s) => ({ ...s, aspect: e.target.value as VideoSpec["aspect"] }))} className={cn(inputCls, "h-8 text-[13px]")}>
              {ASPECTS.map((a) => (
                <option key={a} value={a}>
                  {a} {a === "9:16" ? "(TikTok/Reels)" : a === "3:4" ? "(carousel)" : a === "4:5" ? "(IG feed)" : a === "16:9" ? "(X/YouTube)" : ""}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Kind">
            <EnumField layoutId="kind" value={spec.kind} options={["video", "slideshow"] as const} onChange={(kind) => edit((s) => ({ ...s, kind }))} />
          </Row>
        </div>
        <Row label="Font">
          <select value={theme.font} onChange={(e) => setTheme({ font: e.target.value as VideoSpec["theme"]["font"] })} className={cn(inputCls, "h-8 text-[13px]")}>
            {FONT_IDS.map((f) => (
              <option key={f} value={f}>
                {FONTS[f].label} — {FONTS[f].vibe}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Default caption style">
          <select value={theme.captionStyle} onChange={(e) => setTheme({ captionStyle: e.target.value as VideoSpec["theme"]["captionStyle"] })} className={cn(inputCls, "h-8 text-[13px]")}>
            {CAPTION_STYLES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Row>
        <div className="grid grid-cols-2 gap-2">
          <Row label="Accent">
            <ColorField value={theme.accent} onChange={(accent) => setTheme({ accent }, "accent")} />
          </Row>
          <Row label="Background">
            <ColorField value={theme.bg} onChange={(bg) => setTheme({ bg }, "bg")} />
          </Row>
        </div>
        <BoolField label="Film grain" value={theme.grain} onChange={(grain) => setTheme({ grain })} />
        <BoolField label="Automatic sound effects" value={theme.sfx} onChange={(sfx) => setTheme({ sfx })} />
      </Section>
      {spec.meta.notes && (
        <Section title="Agent notes">
          <p className="text-xs leading-relaxed whitespace-pre-wrap text-fg-3">{spec.meta.notes}</p>
          <Button size="sm" variant="ghost" onClick={() => setMeta({ notes: undefined })}>
            Dismiss
          </Button>
        </Section>
      )}
    </div>
  );
}
