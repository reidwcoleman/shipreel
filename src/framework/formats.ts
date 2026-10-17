/**
 * Viral formats: what each one is, why it works, and an instant builder that turns a product
 * profile + hook into a complete VideoSpec. Pure functions: used by the server, the UI (live
 * previews) and documented for Claude/Codex in workspace/FRAMEWORK.md.
 */
import type { Asset, Platform, Project } from "@/lib/types";
import type { Background, CaptionStyleId, SceneInput, VideoSpecInput } from "@/remotion/spec";
import { fill, hashString, pick, seeded, short, shuffle, toYou, vocab, type Vocab } from "./fill";
import { beatSync, MUSIC_VIBES, pickMusic } from "./music";
import handLibrary from "../../public/hands/library.json";

export type FormatCategory =
  | "demo"
  | "story"
  | "slideshow"
  | "build-in-public"
  | "listicle"
  | "comparison"
  | "reaction"
  | "skit";

export type BuildContext = {
  project: Project;
  hook: string;
  angle?: string;
  beats?: string[];
  /** Project media, best demo footage first. */
  media: Pick<Asset, "file" | "kind" | "width" | "height" | "durationSec" | "role">[];
  seed?: number;
};

export type FormatDef = {
  id: string;
  name: string;
  tagline: string;
  category: FormatCategory;
  kind: "video" | "slideshow";
  platforms: Platform[];
  status: "hot" | "steady" | "saturated";
  why: string;
  beats: string[];
  lengthSec: [number, number];
  needs: ("screen recording" | "screenshots" | "real numbers" | "nothing")[];
  effort: "low" | "medium" | "high";
  captionStyle: CaptionStyleId;
  soundTip: string;
  hooks: string[];
  /** Music mood for the built-in bed, best first (defaults by category). */
  musicVibes?: string[];
  /** Builds the spec. Never throws: falls back to media-free scenes when there's no footage. */
  build: (ctx: BuildContext) => Omit<VideoSpecInput, "id">;
};

// ── helpers ──────────────────────────────────────────────────────────────────────

let sceneCounter = 0;
const sid = () => `s${++sceneCounter}`;

function theme(p: Project, captionStyle: CaptionStyleId) {
  return {
    font: p.brand.font ?? "tiktok-sans",
    captionStyle,
    accent: p.brand.accent || "#D7FF3A",
    bg: p.brand.bg || "#0B0B0F",
    fg: p.brand.fg || "#FFFFFF",
  };
}

/** The CTA as a follow-on line after the app was just named: "Exposed! is free…" → "it's free…". */
function ctaLine(p: Project, v: Vocab): string {
  const t = (p.cta.text || "link in bio").trim();
  const esc = v.app.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return t.replace(new RegExp(`^${esc}\\s+is\\b`, "i"), "it's").replace(new RegExp(`^(get|download)\\s+${esc}`, "i"), "$1 it");
}

function cta(p: Project, v: Vocab, duration = 2.1): SceneInput {
  return {
    id: sid(),
    type: "cta",
    duration,
    transition: "punch",
    appName: v.app,
    icon: p.brand.logo,
    headline: short(p.tagline || p.oneLiner || v.outcome, 54),
    action: p.cta.action,
    url: p.links.website,
  };
}

function bestVideo(ctx: BuildContext) {
  return ctx.media.find((m) => m.kind === "video" && m.role !== "facecam" && m.role !== "music" && m.role !== "broll") ?? ctx.media.find((m) => m.kind === "video" && !m.role);
}
/** Real-life footage (stock or your own): the relatable problem shot and the calm payoff shot. */
function brollClips(ctx: BuildContext) {
  const clips = ctx.media.filter((m) => m.kind === "video" && m.role === "broll");
  // Rotate by hook so a batch of videos doesn't open on the same shot.
  const r = seeded((ctx.seed ?? 0) + hashString(ctx.hook));
  const firstMatch = (res: RegExp[], not?: (typeof clips)[number]) => {
    for (const re of res) {
      const hits = clips.filter((m) => m !== not && re.test(m.file));
      if (hits.length) return pick(hits, r);
    }
    return undefined;
  };
  const problem = firstMatch([/overwhelm|stress|chaos|frustrat|exhaust|tired|rush|mess|busy|late|sigh/i, /morning|texting|group-?chat|phone/i]) ?? clips[0];
  const payoff = firstMatch([/laugh|together|happy|smile|dinner|calm|relax|coffee|cozy|evening|couch|cooking/i], problem) ?? clips.find((m) => m !== problem);
  return { problem, payoff, all: clips };
}
const aspectOf = (m?: { width?: number; height?: number }) => (m?.width && m?.height ? +(m.width / m.height).toFixed(4) : undefined);
function images(ctx: BuildContext) {
  return ctx.media.filter((m) => m.kind === "image" && m.role !== "logo");
}
function faceCam(ctx: BuildContext) {
  return ctx.media.find((m) => m.kind === "video" && m.role === "facecam");
}
/** The app screen that best stands for the product (a home/main screen if one is named that way). */
function heroScreen(ctx: BuildContext): string | undefined {
  const screens = ctx.media.filter((m) => m.kind === "image" && m.role !== "logo" && (m.role === "screen" || (!!m.width && !!m.height && m.height > m.width * 1.3)));
  const m = screens.find((x) => /home|main|dash|feed|today|start/i.test(x.file)) ?? screens[0];
  return m ? `asset:${m.file}` : undefined;
}

function isPortrait(m?: { width?: number; height?: number }) {
  return !!m && !!m.width && !!m.height && m.height > m.width * 1.3;
}

/** One short on-screen line per feature: the benefit's first clause, or the feature name if that's still long. */
export function featureLine(f: { name: string; benefit?: string }, max = 52): string {
  const b = (f.benefit || "").replace(/[.!]+$/, "").trim();
  if (b && b.length <= max) return b;
  // A clause only stands alone if it's a real phrase (≥ 4 words), not a list head like "Everyone's practices".
  const clause = b.split(/;|\s+—\s+|\s+-\s+|,\s+(?=(?:and|so|then|with|even|without|synced|which)\b)|\s+and\s+(?=the|you|it|then)/)[0].trim();
  if (clause && clause.length <= max && clause.split(/\s+/).length >= 4) return clause;
  const comma = b.split(",")[0].trim();
  if (comma.length <= max && comma.split(/\s+/).length >= 4) return comma;
  return f.name;
}

const STOP = new Set(["the", "and", "for", "you", "your", "with", "app", "one", "all", "family", "team", "everyone", "png", "jpg", "mp4", "mov", "screen", "shot", "img", "screenshot"]);
const words = (t: string) => t.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
/** Synonyms that tie a screen's file name to the feature it shows. */
const SCREEN_HINTS: Record<string, string[]> = {
  home: ["briefing", "today", "dashboard", "overview", "morning"],
  digest: ["briefing", "summary", "morning"],
  calendar: ["calendar", "schedule", "week", "events", "practices", "appointments"],
  cal: ["calendar", "schedule"],
  foxy: ["assistant", "foxy", "chat", "ask"],
  chat: ["assistant", "ask", "message"],
  ai: ["assistant", "ask"],
  lists: ["grocery", "lists", "chores", "shopping"],
  chores: ["chores", "approvals"],
  meals: ["meals", "dinner", "dinners", "recipes"],
  map: ["map", "location", "heading", "driving", "where"],
  remind: ["remind", "rings", "message", "notify"],
  paywall: ["premium", "pro", "trial"],
};
/** The feature a screenshot most likely shows, by file name. */
function featureFor<T extends { name: string; benefit?: string }>(file: string, features: T[]): T | undefined {
  const fw = words(file.replace(/\.[a-z0-9]+$/i, ""));
  const want = new Set([...fw, ...fw.flatMap((w) => SCREEN_HINTS[w] ?? [])]);
  let best: T | undefined;
  let bestScore = 0;
  for (const f of features) {
    const score = words(`${f.name} ${f.benefit ?? ""}`).filter((w) => want.has(w) || want.has(w.replace(/s$/, ""))).length + (words(f.name).some((w) => want.has(w)) ? 2 : 0);
    if (score > bestScore) {
      best = f;
      bestScore = score;
    }
  }
  return best;
}

/**
 * The demo beat: a quick montage of the real app (viral demos cut every ~1–2.5 s), each shot with its
 * own short caption, hard cuts with a zoom punch. Falls back to a store card when there's no footage.
 */
function demoScenes(ctx: BuildContext, v: Vocab, opts: { captions?: string[]; total?: number } = {}): SceneInput[] {
  const video = bestVideo(ctx);
  // Screens in the order of the features they show (features are ranked by visual wow), each with its own line.
  const rank = (file: string) => {
    const f = featureFor(file, v.features);
    return f ? v.features.indexOf(f) : 99;
  };
  const imgs = images(ctx)
    .filter((m) => isPortrait(m) || m.role === "screen")
    .map((m, i) => ({ m, i, r: rank(m.file) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.m);
  // The opening shot (it carries the hook / "so I…" line) is the app's main screen.
  const hero = heroScreen(ctx)?.replace(/^asset:/, "");
  const hi = imgs.findIndex((m) => m.file === hero);
  if (hi > 0 && opts.captions?.length) imgs.unshift(...imgs.splice(hi, 1));
  const lineFor = (file: string) => {
    const f = featureFor(file, v.features);
    return f ? featureLine(f) : undefined;
  };
  const lines = [...(opts.captions ?? []), ...v.features.map((f) => featureLine(f))].filter((l, i, a) => l && a.indexOf(l) === i);
  const total = opts.total ?? 6;
  const shots: SceneInput[] = [];
  const caption = (i: number) => ({ text: lines[i % Math.max(1, lines.length)] ?? v.outcome, style: { style: "tiktok-classic" as const, position: "top" as const } });
  let used = 0;
  if (video) {
    const dur = Math.min(Math.max(2.4, total - (imgs.length ? 3 : 0)), Math.max(2, (video.durationSec ?? 6) - 0.2), 4.5);
    shots.push({
      id: sid(),
      type: "media",
      duration: +dur.toFixed(2),
      transition: "punch",
      src: `asset:${video.file}`,
      kind: "video",
      device: isPortrait(video) ? "iphone" : "floating",
      zooms: [{ at: Math.min(1.1, dur * 0.35), scale: 1.32, x: 0.5, y: 0.42, hold: Math.max(0.6, dur * 0.3) }],
      caption: caption(0),
    });
    used = dur;
  }
  const focal = [0.38, 0.55, 0.3, 0.62];
  for (let i = 0; i < imgs.length && used < total - 0.6 && shots.length < 4; i++) {
    const dur = Math.min(1.7, Math.max(1.2, total - used));
    // Every third shot goes full-screen (the raw screen-recording look) so the montage isn't the same phone four times.
    const full = isPortrait(imgs[i]) && shots.length % 3 === 2;
    // The opener caption (the hook / "so I…" line) stays on the first shot; later shots say what they show.
    const own = shots.length >= (opts.captions?.length ?? 0) ? lineFor(imgs[i].file) : undefined;
    const c = own ? { ...caption(shots.length), text: own } : caption(shots.length);
    shots.push({
      id: sid(),
      type: "media",
      duration: +dur.toFixed(2),
      transition: "punch",
      src: `asset:${imgs[i].file}`,
      kind: "image",
      device: full ? "none" : isPortrait(imgs[i]) ? "iphone" : "floating",
      aspect: aspectOf(imgs[i]),
      zooms: [{ at: 0.35, scale: full ? 1.12 : 1.22, x: 0.5, y: focal[i % focal.length], hold: dur }],
      // Over a full-screen UI the text needs its box to stay readable.
      caption: full ? { ...c, style: { style: "tiktok-box" as const, position: "upper" as const } } : c,
    });
    used += dur;
  }
  if (shots.length) return shots;
  // No footage yet: an App Store card that taps GET, then the feature list.
  return [
    {
      id: sid(),
      type: "appstore",
      duration: 3,
      transition: "slide-up",
      appName: v.app,
      subtitle: short(v.tagline, 34),
      icon: ctx.project.brand.logo,
      category: ctx.project.category || "Productivity",
      note: "Add a screen recording in Assets and rebuild for a real demo (3× better watch time).",
    },
  ];
}

const meta = (ctx: BuildContext, v: Vocab, fmt: Pick<FormatDef, "soundTip">, caption?: string) => ({
  hook: ctx.hook.replace(/\*/g, ""),
  caption: caption ?? `${ctx.hook.replace(/\*/g, "").replace(/\\n|\n/g, " ")} ${ctx.project.cta.text ? `— ${ctx.project.cta.text.toLowerCase()}` : ""}`.trim(),
  hashtags: ctx.project.hashtags.length ? ctx.project.hashtags.slice(0, 5) : ["fyp", "app", v.app.toLowerCase().replace(/[^a-z0-9]/g, "")],
  soundTip: fmt.soundTip,
});

// ── formats ──────────────────────────────────────────────────────────────────────

const F: FormatDef[] = [];

F.push({
  id: "hook-demo",
  name: "Hook + demo",
  tagline: "One punchy line, then show the app doing the thing.",
  category: "demo",
  kind: "video",
  platforms: ["tiktok", "instagram", "youtube", "x"],
  status: "steady",
  why: "The hook earns the first second; the demo proves it. Showing the outcome on a real screen is the fastest way from curiosity to 'I need this'.",
  beats: ["Hook text on frame 1 (≤ 2s)", "Screen recording with punch-in zooms on the magic moment", "Benefit caption in the safe zone", "CTA card"],
  lengthSec: [7, 15],
  needs: ["screen recording"],
  effort: "low",
  captionStyle: "tiktok-box",
  soundTip: "Upbeat trending sound with a clear beat; land the first zoom on a beat.",
  hooks: ["I built an app that {does}", "this app {does} and nobody's talking about it", "if {painYou}, this is for you"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const video = bestVideo(ctx);
    // With footage, the hook sits over the product from frame 1 (how the demos that work open);
    // without it, a hook card leads into the store card.
    const footage = !!video || images(ctx).some((m) => isPortrait(m) || m.role === "screen");
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: theme(p, this.captionStyle),
      scenes: footage
        ? [...demoScenes(ctx, v, { captions: [ctx.hook], total: 7 }), cta(p, v)]
        : [
            { id: sid(), type: "hook", duration: 2.6, text: ctx.hook, textStyle: { style: "tiktok-box", animation: "pop" } },
            ...demoScenes(ctx, v),
            cta(p, v),
          ],
      meta: meta(ctx, v, this),
    };
  },
});

F.push({
  id: "problem-solution",
  name: "Problem → app → payoff",
  tagline: "Real-life chaos, your app fixing it, then the calm after.",
  category: "demo",
  kind: "video",
  platforms: ["tiktok", "instagram", "youtube"],
  status: "hot",
  why: "The structure behind most organic-looking app winners (and UGC ads): a relatable real-life moment stops the scroll, the app shows up as the fix inside 3 seconds, and a payoff shot sells the feeling rather than the feature list. Real footage reads as native; a screenshot-only opener reads as an ad.",
  beats: ["Real-life problem clip with the hook on frame 1 (≤ 2 s)", "Hard cut on the beat into the app: 3–4 quick shots with zooms", "Payoff clip: life after, with the outcome line", "End card"],
  lengthSec: [9, 15],
  needs: ["screen recording"],
  effort: "low",
  captionStyle: "tiktok-classic",
  soundTip: "Upbeat track with a clear drop; the drop lands on the cut into the app.",
  hooks: ["POV: {painYou}", "nobody warns you that {painYou}", "if {painYou}, you need this", "how I finally {outcome}"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const { problem, payoff } = brollClips(ctx);
    const top = { style: "tiktok-classic" as const, position: "upper" as const };
    const opener: SceneInput = problem
      ? {
          id: sid(),
          type: "media",
          duration: 2,
          src: `asset:${problem.file}`,
          kind: "video",
          device: "none",
          aspect: aspectOf(problem),
          caption: { text: ctx.hook, style: top },
        }
      : { id: sid(), type: "hook", duration: 2, text: ctx.hook, image: heroScreen(ctx), textStyle: { style: "tiktok-classic", animation: "pop" } };
    const demo = demoScenes(ctx, v, { captions: [`so I ${pick([`started using ${v.app}`, `got ${v.app}`], seeded(ctx.seed ?? 3))}`], total: 6 });
    const scenes: SceneInput[] = [opener, ...demo];
    if (payoff)
      scenes.push({
        id: sid(),
        type: "media",
        duration: 2,
        transition: "punch",
        src: `asset:${payoff.file}`,
        kind: "video",
        device: "none",
        aspect: aspectOf(payoff),
        caption: { text: `now I ${short(v.outcome, 46)}`, style: top },
      });
    scenes.push(cta(p, v));
    return { title: short(ctx.hook.replace(/\*/g, ""), 60), formatId: this.id, theme: theme(p, this.captionStyle), scenes, meta: meta(ctx, v, this) };
  },
});

F.push({
  id: "text-story",
  name: "Text story",
  tagline: "A fake-but-relatable iMessage chat that ends on your app.",
  category: "story",
  kind: "video",
  platforms: ["tiktok", "instagram", "youtube"],
  status: "saturated",
  why: "Chats are native-looking and impossible not to read; each new bubble is a micro cliffhanger. Research (Oct 2026): new fake-text pages are saturated; it still works as a short opener or on an established story page.",
  beats: ["Hook overlay over the chat header", "Friend complains about the pain", "You drop the app", "Payoff line", "CTA"],
  lengthSec: [9, 16],
  needs: ["nothing"],
  effort: "low",
  captionStyle: "tiktok-box",
  soundTip: "Quiet/funny trending sound under the pops; keep it low so message pops land.",
  hooks: ["my friend roasted me for this", "the text that made me build {app}", "POV: your friend finds out you {outcome}"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const r = seeded(ctx.seed ?? 7);
    const friend = contactFor(ctx.hook) ?? pick(["Sam", "Maya", "Jess 🫶", "Alex", "Bestie"], r);
    const pain = v.pains[0];
    // The first message is on screen with the hook (no empty chat): the conversation is the hook.
    const t0 = 0.35;
    const lines = [
      { from: "them" as const, text: `${pick(["ok be honest", "help", "i'm losing it"], r)}` },
      { from: "them" as const, text: `${pain.length < 70 ? `${pain} again 😭` : short(pain, 70)}` },
      { from: "me" as const, text: `wait… you don't use ${v.app}??` },
      { from: "them" as const, text: "what's that" },
      { from: "me" as const, text: short(`it ${v.does}`, 80) },
      { from: "them" as const, text: pick(["downloading rn", "why did nobody tell me this", "ok that's actually genius"], r) },
    ];
    // Reading pace from viral text stories: ~0.55 s per message plus ~35 ms per character.
    let at = t0;
    const messages = lines.map((m, i) => {
      const cur = { ...m, at: Number(at.toFixed(2)) };
      at += 0.55 + Math.min(1.6, m.text.length * 0.035) + (i === 0 ? 0.9 : 0);
      return cur;
    });
    const chatDur = at + 1.1;
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: theme(p, this.captionStyle),
      scenes: [{ id: sid(), type: "chat", duration: Number(chatDur.toFixed(2)), contact: friend, theme: "dark", messages }, cta(p, v)],
      overlays: [{ id: "hook", type: "text", start: 0, end: 2.4, text: ctx.hook, textStyle: { style: "tiktok-box", position: "lower", animation: "pop" } }],
      meta: meta(ctx, v, this),
    };
  },
});

F.push({
  id: "slideshow-listicle",
  name: "Listicle slideshow",
  tagline: "Photo-mode carousel: '5 things {app} does that feel illegal'.",
  category: "slideshow",
  kind: "slideshow",
  platforms: ["tiktok", "instagram"],
  status: "hot",
  why: "Utility lists earned 4–7% likes and 1–4% saves vs ~0.35%/0.06% for story slideshows (saves and shares rank). Each slide is a small reward, so viewers reach the slide where your app sits.",
  beats: ["Slide 1: the hook, big and readable", "Slides 2–5: one benefit each, screenshot behind", "Last slide: the name + where to get it"],
  lengthSec: [10, 18],
  needs: ["screenshots"],
  effort: "low",
  captionStyle: "tiktok-classic",
  soundTip: "Use a trending sound in-app when you post (post as draft). Calm/aesthetic sounds fit carousels.",
  hooks: ["{number} things {app} does that feel illegal to know", "apps that make you feel like you're cheating at life", "{number} features I can't believe are {price}"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const imgs = images(ctx);
    const feats = v.features.slice(0, 4);
    const bg = (i: number): Background | undefined =>
      imgs.length ? undefined : { kind: "mesh", colors: [p.brand.bg || "#0B0B0F", shade(p.brand.accent, i), "#15151a"] };
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      kind: "slideshow",
      aspect: "3:4",
      theme: theme(p, this.captionStyle),
      scenes: [
        { id: sid(), type: "slide", duration: 2.6, text: ctx.hook, image: imgs[0] ? `asset:${imgs[0].file}` : undefined, layout: imgs[0] ? "phone" : "photo", background: bg(0), textStyle: { size: 0.075, position: "center" } },
        ...feats.map((f, i) => ({
          id: sid(),
          type: "slide" as const,
          duration: 2.6,
          transition: "slide-left" as const,
          text: `${i + 1}. ${f.name}\n${featureLine(f, 70)}`,
          image: imgs[(i + 1) % Math.max(1, imgs.length)] ? `asset:${imgs[(i + 1) % imgs.length].file}` : undefined,
          layout: imgs.length ? ("phone" as const) : ("photo" as const),
          background: bg(i + 1),
          textStyle: { position: "center" as const, size: 0.058 },
        })),
        { id: sid(), type: "slide", duration: 2.6, transition: "slide-left", text: `it's called *${v.app}*\n${ctaLine(p, v)}`, background: bg(9), textStyle: { position: "center", size: 0.07 } },
      ],
      meta: meta(ctx, v, this),
    };
  },
});

F.push({
  id: "slideshow-pov",
  name: "POV slideshow",
  tagline: "A tiny before → after story told in 5 photo slides.",
  category: "slideshow",
  kind: "slideshow",
  platforms: ["tiktok", "instagram"],
  status: "steady",
  why: "POV framing puts the viewer inside the story. Relatable 'before' slides earn the swipe; the product shows up as the turning point, not an ad.",
  beats: ["POV hook", "The relatable struggle", "The turning point (your app)", "The best feature", "The after", "Where to get it"],
  lengthSec: [10, 16],
  needs: ["nothing"],
  effort: "low",
  captionStyle: "tiktok-classic",
  soundTip: "Emotional/aesthetic trending sound; slide changes on the beat.",
  hooks: ["POV: you finally {outcome}", "POV: it's 2am and {painYou}", "me before vs after finding {app}"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const imgs = images(ctx);
    const bg = (i: number): Background => ({ kind: "mesh", colors: [p.brand.bg || "#0B0B0F", shade(p.brand.accent, i), "#17151d"] });
    const slides = [
      ctx.hook,
      `me every day: "${short(v.pain, 60)}"`,
      `then someone showed me *${v.app}*`,
      short(`${v.features[0].name}: ${v.features[0].benefit}`, 80),
      `now I ${short(v.outcome, 60)}`,
      `${v.app} — ${ctaLine(p, v)}`,
    ];
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      kind: "slideshow",
      aspect: "3:4",
      theme: theme(p, this.captionStyle),
      scenes: slides.map((text, i) => ({
        id: sid(),
        type: "slide" as const,
        duration: 2.4,
        transition: i ? ("fade" as const) : ("cut" as const),
        text,
        image: i === 3 && imgs[0] ? `asset:${imgs[0].file}` : undefined,
        layout: i === 3 && imgs[0] ? ("phone" as const) : ("photo" as const),
        background: bg(i),
        textStyle: { position: "center" as const, size: i === 0 ? 0.072 : 0.064 },
      })),
      meta: meta(ctx, v, this),
    };
  },
});

F.push({
  id: "comment-reply",
  name: "Comment reply",
  tagline: "Answer a (real or likely) comment with a demo.",
  category: "reaction",
  kind: "video",
  platforms: ["tiktok", "instagram"],
  status: "steady",
  why: "The reply sticker signals 'conversation, not ad', borrows curiosity from the question, and is the native way to turn one viral video into a series.",
  beats: ["Reply sticker with the question", "Show the answer in the app", "CTA"],
  lengthSec: [8, 15],
  needs: ["screen recording"],
  effort: "low",
  captionStyle: "tiktok-box",
  soundTip: "Original audio or a low trending beat under a voiceover.",
  hooks: ["what app is this??", "does {app} actually work?", "wait, how does {app} actually work?"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const r = seeded(ctx.seed ?? 3);
    const video = bestVideo(ctx);
    const handle = pick(["jaydenmakes", "sarah.codes", "notmattt", "itsbrianna_", "devonfr"], r);
    const question = ctx.hook.includes("?") ? ctx.hook.replace(/\*/g, "") : pick(["what app is this??", `does ${v.app} actually work?`, `ok but how does it ${v.outcome}`], r);
    return {
      title: short(question, 60),
      formatId: this.id,
      theme: theme(p, this.captionStyle),
      scenes: [
        {
          id: sid(),
          type: "comment",
          duration: 2.8,
          username: handle,
          text: question,
          background: video ? { kind: "media", src: `asset:${video.file}`, dim: 0.45, blur: 0 } : undefined,
          caption: { text: "here's how it works 👇", style: { style: "tiktok-box-dark" } },
        },
        ...demoScenes(ctx, v),
        cta(p, v),
      ],
      meta: meta(ctx, v, this, `replying to the #1 question we get. ${p.cta.text}`),
    };
  },
});

F.push({
  id: "build-in-public",
  name: "Day N build log",
  tagline: "'Day 12 of building {app} until $10k/mo' series.",
  category: "build-in-public",
  kind: "video",
  platforms: ["tiktok", "x", "linkedin", "youtube", "instagram"],
  status: "saturated",
  why: "Series create appointment viewing, but 2026 data says new 'Day N until $X MRR' series mostly get 100–3,300 views. Prefer the Stakes devlog (open on a real problem).",
  beats: ["'Day N of…' hook", "What you built today (terminal / screen)", "The real number", "Follow for tomorrow"],
  lengthSec: [10, 25],
  needs: ["real numbers"],
  effort: "medium",
  captionStyle: "tiktok-box",
  soundTip: "Lo-fi or 'productive' trending sound; keep the same sound across the series.",
  hooks: ["Day {day} of building {app} until it makes $10k/month", "day {day}: I almost gave up on {app}", "building {app} in public — day {day}"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const day = Number(/day\s*(\d+)/i.exec(ctx.hook)?.[1] ?? 1);
    const proofNum = Number((p.proof.join(" ").match(/\d[\d,]*/)?.[0] ?? "0").replace(/,/g, "")) || 0;
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: theme(p, this.captionStyle),
      scenes: [
        // Open on the work itself with the series title over it (no text-only card).
        {
          id: sid(),
          type: "terminal",
          duration: 4.5,
          title: `~/${v.app.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          agent: "claude",
          lines: [
            { kind: "input", text: short(`add ${v.features[0].name.toLowerCase()}: ${v.features[0].benefit.toLowerCase()}`, 80) },
            { kind: "dim", text: "Reading the codebase…" },
            { kind: "output", text: `Edited 4 files` },
            { kind: "success", text: "Tests pass. Shipped." },
          ],
          caption: { text: ctx.hook, style: { style: "tiktok-box" } },
        },
        ...demoScenes(ctx, v, { total: 4, captions: [`today: ${short(v.features[0].name, 30)}`] }),
        // The running number only appears once the brief has a real one; it's never invented.
        ...(proofNum ? [{
          id: sid(),
          type: "stat" as const,
          duration: 3,
          transition: "fade",
          from: 0,
          to: proofNum,
          label: short(p.proof[0], 40),
          sub: `day ${day}`,
          note: "Use your real numbers. Made-up revenue/user claims break trust (and platform rules).",
        }] as SceneInput[] : []),
        { ...cta(p, v), headline: `follow for day ${day + 1}` } as SceneInput,
      ],
      meta: meta(ctx, v, this, `day ${day}. ${short(v.oneLiner, 80)} #buildinpublic`),
    };
  },
});

F.push({
  id: "money-montage",
  name: "Payment montage",
  tagline: "Lock screen filling up with payment notifications.",
  category: "build-in-public",
  kind: "video",
  platforms: ["tiktok", "x", "instagram"],
  status: "steady",
  why: "Pure dopamine + proof. The ding-ding-ding stack is instantly recognisable and makes viewers ask 'what is this app?'.",
  beats: ["'POV: you launched…' hook", "Notifications stacking with dings", "Big number", "Name + CTA"],
  lengthSec: [7, 12],
  needs: ["real numbers"],
  effort: "low",
  captionStyle: "tiktok-box",
  soundTip: "Hype trending sound; let the notification dings sit on top.",
  hooks: ["POV: you launched {app} {timeframe} ago", "the sound of {app} working", "I built {app} and this happened"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const price = Number(String(p.price ?? "").match(/\d+(\.\d+)?/)?.[0] ?? 9.99);
    const amounts = [price, price, price * 3 > 100 ? price : price * 3, price, price * 12 > 300 ? price : price * 10].map((n) => `$${n.toFixed(2)}`);
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: theme(p, this.captionStyle),
      scenes: [
        {
          id: sid(),
          type: "notifications",
          duration: 5,
          items: amounts.map((a, i) => ({ app: "Stripe", title: "Stripe", body: `You received a payment of ${a}`, time: i === 0 ? "now" : `${i * 3}m ago` })),
          // Centre, between the lock-screen clock and the notification stack.
          caption: { text: ctx.hook, style: { style: "tiktok-box", position: "center" } },
          note: "Only post payment notifications you actually received.",
        },
        cta(p, v),
      ],
      meta: meta(ctx, v, this),
    };
  },
});

F.push({
  id: "vibe-coded",
  name: "I vibe-coded this",
  tagline: "Prompt → agent builds it → the app works. For vibe coders.",
  category: "build-in-public",
  kind: "video",
  platforms: ["tiktok", "x", "youtube", "linkedin"],
  status: "steady",
  why: "'I asked AI to build X' is a hook people can't resist in 2026: it's a magic trick plus a demo, and the terminal visual is instantly legible to builders.",
  beats: ["Hook: what you built and how fast", "Terminal: the prompt + agent working", "The app running", "CTA"],
  lengthSec: [9, 18],
  needs: ["screen recording"],
  effort: "low",
  captionStyle: "tiktok-box",
  soundTip: "Fast, glitchy/tech trending sound.",
  hooks: ["I built {app} in a weekend with Claude Code", "I told an AI agent to build {app}. it did.", "vibe-coded an app that {does}"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: theme(p, this.captionStyle),
      scenes: [
        { id: sid(), type: "hook", duration: 2.8, text: ctx.hook, image: heroScreen(ctx), textStyle: { style: "tiktok-box" } },
        {
          id: sid(),
          type: "terminal",
          duration: 4.8,
          transition: "whip",
          title: `~/${v.app.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          agent: "claude",
          lines: [
            { kind: "input", text: short(`build me an app that ${v.does}`, 80) },
            { kind: "dim", text: "Planning the app…" },
            { kind: "output", text: `Created ${v.features.length + 7} files` },
            { kind: "output", text: `Added ${short(v.features[0].name, 30)}` },
            { kind: "success", text: "Build succeeded" },
          ],
        },
        ...demoScenes(ctx, v),
        cta(p, v),
      ],
      meta: meta(ctx, v, this, `${short(ctx.hook.replace(/\*/g, ""), 80)} #vibecoding #buildinpublic`),
    };
  },
});

F.push({
  id: "before-after",
  name: "Before / after",
  tagline: "Split screen: life without vs with your app.",
  category: "comparison",
  kind: "video",
  platforms: ["tiktok", "instagram", "youtube"],
  status: "steady",
  why: "Contrast is processed instantly, no reading required. The 'after' half does the selling.",
  beats: ["Before half: the pain", "After half: the outcome", "CTA"],
  lengthSec: [6, 10],
  needs: ["nothing"],
  effort: "low",
  captionStyle: "tiktok-classic",
  soundTip: "A sound with an obvious switch/drop at ~2s for the 'after'.",
  hooks: ["me before {app} vs me after", "how it started vs how it's going", "before vs after {app}"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const imgs = images(ctx);
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: theme(p, this.captionStyle),
      scenes: [
        {
          id: sid(),
          type: "split",
          duration: 5,
          top: { label: "before", text: short(v.pain, 70), tone: "bad" },
          bottom: { label: `with ${v.app}`, text: imgs[0] ? undefined : short(v.outcome, 70), src: imgs[0] ? `asset:${imgs[0].file}` : undefined, tone: "good" },
          caption: { text: ctx.hook, style: { style: "tiktok-box" } },
        },
        cta(p, v),
      ],
      meta: meta(ctx, v, this),
    };
  },
});

F.push({
  id: "notes-list",
  name: "Notes app list",
  tagline: "An Apple Notes screenshot list that includes your app.",
  category: "listicle",
  kind: "video",
  platforms: ["tiktok", "instagram"],
  status: "steady",
  why: "Notes screenshots feel personal and unpolished (trustworthy). Lists promise skimmable value, so people save them.",
  beats: ["Hook overlay", "Notes list typed in", "Your app as the standout item", "CTA"],
  lengthSec: [7, 12],
  needs: ["nothing"],
  effort: "low",
  captionStyle: "tiktok-box",
  soundTip: "Soft, aesthetic trending sound.",
  hooks: ["things I wish I knew sooner", "my secret list to {outcome}", "{number} tiny habits that fixed my life"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const items = [
      ...v.features.slice(0, 3).map((f) => featureLine(f, 64)),
      `use ${v.app} (seriously)`,
    ];
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: theme(p, this.captionStyle),
      scenes: [
        { id: sid(), type: "notes", duration: 6.5, title: short(ctx.hook.replace(/\*/g, ""), 60), items, checklist: true },
        cta(p, v),
      ],
      meta: meta(ctx, v, this),
    };
  },
});

F.push({
  id: "founder-tweet",
  name: "Tweet → built it",
  tagline: "Your own old tweet/idea, then the shipped app.",
  category: "build-in-public",
  kind: "video",
  platforms: ["tiktok", "x", "linkedin", "instagram"],
  status: "steady",
  why: "A screenshot creates a 'then vs now' arc in two seconds. It frames the app as a promise kept, which builds trust.",
  beats: ["'me N months ago:' + tweet card", "'so I built it'", "Demo", "CTA"],
  lengthSec: [8, 15],
  needs: ["nothing"],
  effort: "low",
  captionStyle: "tiktok-box",
  soundTip: "Nostalgic → hype sound with a transition at the reveal.",
  hooks: ["me 3 months ago vs today", "I tweeted this idea. then I actually built it.", "nobody liked this tweet. so I built it anyway"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const handle = v.app.toLowerCase().replace(/[^a-z0-9]+/g, "");
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: theme(p, this.captionStyle),
      scenes: [
        {
          id: sid(),
          type: "tweet",
          duration: 3.4,
          name: `${v.app} (founder)`,
          handle,
          text: short(`why is there no app that ${v.does}?? someone build this`, 140),
          replies: "3",
          reposts: "1",
          likes: "12",
          views: "980",
          caption: { text: ctx.hook, style: { style: "tiktok-box" } },
        },
        { id: sid(), type: "hook", duration: 1.6, transition: "zoom", text: "so I built it", textStyle: { style: "hormozi", animation: "slam" } },
        ...demoScenes(ctx, v, { total: 5 }),
        cta(p, v),
      ],
      meta: meta(ctx, v, this),
    };
  },
});

F.push({
  id: "reddit-roast",
  name: "Reddit roast",
  tagline: "'I built X because Y. Roast it.' as a Reddit card.",
  category: "build-in-public",
  kind: "video",
  platforms: ["tiktok", "instagram", "youtube"],
  status: "steady",
  why: "Reddit cards read as authentic and invite debate in the comments, which feeds distribution.",
  beats: ["Reddit post card", "'here's what it does'", "Demo", "CTA"],
  lengthSec: [8, 15],
  needs: ["nothing"],
  effort: "low",
  captionStyle: "tiktok-box",
  soundTip: "Storytime-style low sound.",
  hooks: ["I asked Reddit to roast my app", "r/SideProject said this would never work", "posted {app} on Reddit. here's what happened"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: theme(p, this.captionStyle),
      scenes: [
        {
          id: sid(),
          type: "reddit",
          duration: 4,
          subreddit: "SideProject",
          user: `${v.app.toLowerCase().replace(/[^a-z0-9]+/g, "")}_dev`,
          title: short(`I built ${v.app} because ${v.pain}. Roast it.`, 110),
          body: short(`${v.oneLiner}. ${v.features.slice(0, 2).map((f) => f.name).join(", ")}. Free to try — tell me what sucks.`, 220),
          caption: { text: ctx.hook, style: { style: "tiktok-box" } },
        },
        ...demoScenes(ctx, v, { total: 5 }),
        cta(p, v),
      ],
      meta: meta(ctx, v, this),
    };
  },
});

F.push({
  id: "kinetic-pas",
  name: "Kinetic PAS",
  tagline: "Problem → agitate → solve in slammed words, then the app.",
  category: "skit",
  kind: "video",
  platforms: ["tiktok", "instagram", "youtube", "linkedin"],
  status: "steady",
  why: "One-word-at-a-time pacing forces attention (you can't skim it) and lands on the beat; the solve is the demo.",
  beats: ["Problem words", "Agitate words", "'so I built…'", "Demo", "CTA"],
  lengthSec: [8, 14],
  needs: ["nothing"],
  effort: "low",
  captionStyle: "hormozi",
  soundTip: "Hard-hitting beat; each word lands on a hit.",
  hooks: ["stop doing this if {painYou}", "you're doing it wrong", "this is why {painYou}"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const painWords = v.pain.split(/\s+/).slice(0, 6);
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: theme(p, this.captionStyle),
      scenes: [
        { id: sid(), type: "kinetic", duration: Math.max(2.4, painWords.length * 0.42 + 0.8), words: ["you", ...painWords, "again?"] },
        { id: sid(), type: "hook", duration: 1.8, transition: "zoom", text: `there's an app for that: *${v.app}*`, textStyle: { style: "hormozi", animation: "slam" } },
        ...demoScenes(ctx, v, { total: 5 }),
        cta(p, v),
      ],
      meta: meta(ctx, v, this),
    };
  },
});

F.push({
  id: "app-store-reveal",
  name: "App Store reveal",
  tagline: "'This app should be illegal' → the listing → tap GET.",
  category: "demo",
  kind: "video",
  platforms: ["tiktok", "instagram", "youtube"],
  status: "steady",
  why: "Showing the real store listing removes friction: viewers see exactly what to search for, and the GET tap is a satisfying micro-moment.",
  beats: ["Bold claim hook", "App Store page, tap GET", "Demo", "CTA"],
  lengthSec: [8, 14],
  needs: ["screenshots"],
  effort: "low",
  captionStyle: "tiktok-box",
  soundTip: "Suspense build → drop when the download finishes.",
  hooks: ["this app should be illegal", "the app I wish I had in college", "found the app that {does}"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const imgs = images(ctx);
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: theme(p, this.captionStyle),
      scenes: [
        // Open on the listing itself with the hook over it; the GET tap lands mid-scene.
        {
          id: sid(),
          type: "appstore",
          duration: 4.2,
          appName: v.app,
          subtitle: short(v.tagline, 34),
          icon: p.brand.logo,
          category: p.category || "Productivity",
          screenshots: imgs.slice(0, 4).map((i) => `asset:${i.file}`),
          caption: { text: ctx.hook, style: { style: "tiktok-box", position: "lower" } },
        },
        ...(bestVideo(ctx) || imgs.length ? demoScenes(ctx, v, { total: 5 }) : []),
        cta(p, v),
      ],
      meta: meta(ctx, v, this),
    };
  },
});

F.push({
  id: "pov-demo",
  name: "POV demo",
  tagline: "Full-screen app footage with a POV caption.",
  category: "skit",
  kind: "video",
  platforms: ["tiktok", "instagram", "youtube"],
  status: "steady",
  why: "Zero-production, native-looking, and the POV line does the storytelling. Easy to batch 10 variations of the same footage.",
  beats: ["POV caption over footage from frame 1", "Second caption at the payoff", "CTA"],
  lengthSec: [6, 12],
  needs: ["screen recording"],
  effort: "low",
  captionStyle: "tiktok-classic",
  soundTip: "The trending sound of the week; this format lives on audio.",
  hooks: ["POV: you finally found an app that {does}", "POV: {app} just saved your week", "POV: your app does the boring part"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const video = bestVideo(ctx);
    const scenes: SceneInput[] = video
      ? [
          {
            id: sid(),
            type: "media",
            duration: Math.min(8, Math.max(4, (video.durationSec ?? 6) - 0.2)),
            src: `asset:${video.file}`,
            kind: "video",
            device: "none",
            fit: isPortrait(video) ? "cover" : "contain",
            // Snapchat bar: readable over any screen, and it reads as "someone showed me this", not an ad.
            caption: { text: ctx.hook, style: { style: "snapchat", position: "center" } },
          },
        ]
      : images(ctx).filter((m) => isPortrait(m)).length
        ? images(ctx)
            .filter((m) => isPortrait(m))
            .slice(0, 4)
            .map((img, i) => ({
              id: sid(),
              type: "media" as const,
              duration: i === 0 ? 2.6 : 1.4,
              transition: i === 0 ? ("cut" as const) : ("punch" as const),
              src: `asset:${img.file}`,
              kind: "image" as const,
              device: "none" as const,
              zooms: i ? [{ at: 0.2, scale: 1.18, x: 0.5, y: 0.45, hold: 1.2 }] : [],
              caption: i === 0 ? { text: ctx.hook, style: { style: "snapchat" as const, position: "center" as const } } : undefined,
            }))
        : [
            { id: sid(), type: "hook", duration: 2.8, text: ctx.hook, textStyle: { style: "tiktok-classic" } },
            ...demoScenes(ctx, v),
          ];
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: theme(p, this.captionStyle),
      scenes: [...scenes, cta(p, v)],
      meta: meta(ctx, v, this),
    };
  },
});

F.push({
  id: "three-reasons",
  name: "3 reasons",
  tagline: "'3 reasons you need {app} if you're a {audience}'.",
  category: "listicle",
  kind: "video",
  platforms: ["tiktok", "instagram", "youtube", "linkedin"],
  status: "steady",
  why: "Numbered lists set an expectation (people stay to see all 3) and let you pitch three benefits without sounding like an ad.",
  beats: ["Numbered promise hook", "List animates in", "Demo of reason #1", "CTA"],
  lengthSec: [8, 15],
  needs: ["nothing"],
  effort: "low",
  captionStyle: "tiktok-box",
  soundTip: "Upbeat sound; items pop on beats.",
  hooks: ["3 reasons you need {app} if you're {audience}", "3 things {app} does better than {competitor}", "3 signs you need {app}"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: theme(p, this.captionStyle),
      scenes: [
        {
          id: sid(),
          type: "list",
          duration: 5.5,
          title: ctx.hook,
          numbered: true,
          items: v.features.slice(0, 3).map((f) => ({ text: short(f.name, 32), sub: featureLine(f, 60) })),
        },
        ...(bestVideo(ctx) || images(ctx).length ? demoScenes(ctx, v, { total: 4 }) : []),
        cta(p, v),
      ],
      meta: meta(ctx, v, this),
    };
  },
});

F.push({
  id: "stat-shock",
  name: "Stat shock",
  tagline: "Open on a big real number, then explain it.",
  category: "build-in-public",
  kind: "video",
  platforms: ["tiktok", "x", "linkedin", "youtube"],
  status: "steady",
  why: "A specific number is a curiosity gap with proof attached. Counting animations hold attention through the first 2 seconds.",
  beats: ["Big number counts up", "What it means", "Demo", "CTA"],
  lengthSec: [7, 14],
  needs: ["real numbers"],
  effort: "low",
  captionStyle: "tiktok-box",
  soundTip: "Riser into a drop as the number lands.",
  hooks: ["{metric} with zero ad spend", "how {app} got {metric}", "this number changed everything for {app}"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const raw = p.proof[0] ?? "";
    const num = Number((raw.match(/\d[\d,.]*/)?.[0] ?? "0").replace(/,/g, "")) || 1000;
    const prefix = /\$/.test(raw) ? "$" : "";
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: theme(p, this.captionStyle),
      scenes: [
        { id: sid(), type: "stat", duration: 3.2, from: 0, to: num, prefix, label: short(raw.replace(/[$\d,.]+/, "").trim() || "and counting", 40), sub: short(ctx.hook.replace(/\*/g, ""), 60), note: raw ? undefined : "Add a real number in Product → Proof." },
        ...demoScenes(ctx, v, { total: 5 }),
        cta(p, v),
      ],
      meta: meta(ctx, v, this),
    };
  },
});

F.push({
  id: "feature-carousel",
  name: "Feature carousel",
  tagline: "Clean product carousel: cover, features, CTA.",
  category: "slideshow",
  kind: "slideshow",
  platforms: ["instagram", "linkedin", "tiktok"],
  status: "steady",
  why: "Instagram and LinkedIn reward carousels with saves and dwell time; a clean cover + one idea per slide is the proven recipe.",
  beats: ["Cover slide (the promise)", "One feature per slide with screenshot", "CTA slide"],
  lengthSec: [10, 18],
  needs: ["screenshots"],
  effort: "low",
  captionStyle: "serif",
  soundTip: "Optional; carousels mostly play silent.",
  hooks: ["{app}: {outcome}", "the {audience} toolkit", "everything {app} can do"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const imgs = images(ctx);
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      kind: "slideshow",
      aspect: "4:5",
      theme: { ...theme(p, this.captionStyle), grain: true },
      scenes: [
        { id: sid(), type: "slide", duration: 2.6, text: ctx.hook, image: heroScreen(ctx), layout: heroScreen(ctx) ? "phone" : "photo", background: { kind: "mesh", colors: [p.brand.bg || "#0B0B0F", shade(p.brand.accent, 1), "#141418"] }, textStyle: { style: "serif", size: 0.1, position: "center" } },
        ...v.features.slice(0, 4).map((f, i) =>
          imgs[i]
            ? ({
                id: sid(),
                type: "media" as const,
                duration: 2.6,
                transition: "slide-left" as const,
                src: `asset:${imgs[i].file}`,
                kind: "image" as const,
                device: isPortrait(imgs[i]) ? ("iphone" as const) : ("floating" as const),
                caption: { text: `${f.name}\n${short(f.benefit, 60)}`, style: { style: "serif" as const, position: "top" as const, size: 0.07 } },
              } as SceneInput)
            : ({
                id: sid(),
                type: "slide" as const,
                duration: 2.6,
                transition: "slide-left" as const,
                text: `*${f.name}*\n${short(f.benefit, 70)}`,
                background: { kind: "solid" as const, color: p.brand.bg || "#0B0B0F" },
                textStyle: { style: "serif" as const, size: 0.08 },
              } as SceneInput),
        ),
        { ...cta(p, v), duration: 2.6, transition: "slide-left" } as SceneInput,
      ],
      meta: meta(ctx, v, this),
    };
  },
});


F.push({
  id: "doubter-reveal",
  name: "Doubter reveal",
  tagline: "Someone doubts you → you show them the app's result → they change their mind.",
  category: "slideshow",
  kind: "slideshow",
  platforms: ["tiktok", "instagram"],
  status: "hot",
  why: "A tiny story with a villain (landlord, mum, boss) and a reveal: curiosity carries every swipe and the product is the payoff, not the pitch. Snugly's 'my landlord said I can't change anything' got 482.5K views; its feature-first hooks got ~1K.",
  beats: ["Slide 1: the doubter + the conflict (3–4 short lines)", "Slide 2: 'so I showed her what {app} can do'", "Slides 3–5: the result + reaction lines (not labels)", "Slide 6: names the app and the outcome in first person"],
  lengthSec: [12, 18],
  needs: ["screenshots"],
  effort: "low",
  captionStyle: "tiktok-classic",
  soundTip: "Upload as a TikTok draft and add a popular, emotional sound on your phone.",
  hooks: ["my {doubter} said I'd never {outcome}", "my {doubter} didn't believe {app} would work", "my {doubter} said this app was a waste of time"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const imgs = images(ctx);
    const r = seeded(ctx.seed ?? 11);
    const who = pick(["mom", "landlord", "boss", "girlfriend", "roommate", "grandma", "coach"], r);
    const reacts = pick(
      [
        ["she was like… wait", "ok that's actually good", "now she won't stop using it"],
        ["he went quiet for a second", "then asked me to send it to him", "he uses it more than me now"],
        ["she said 'no way that's real'", "so I did it again in front of her", "she downloaded it on the spot"],
      ],
      r,
    );
    const shot = (i: number) => (imgs.length ? `asset:${imgs[i % imgs.length].file}` : undefined);
    const bg = (i: number): Background => ({ kind: "mesh", colors: [p.brand.bg || "#0B0B0F", shade(p.brand.accent, i), "#16161b"] });
    const lines = [
      ctx.hook.includes("{") ? `my ${who} said\nI'd never ${short(v.outcome, 40)}` : ctx.hook,
      `so I showed\nmy ${who} what\n${v.app} can do`,
      ...reacts,
      `the ${v.app} app helped me\nfinally ${short(v.outcome.replace(/^(to |you )/, ""), 50)}`,
    ];
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      kind: "slideshow",
      aspect: "3:4",
      theme: theme(p, this.captionStyle),
      scenes: lines.map((text, i) => ({
        id: sid(),
        type: "slide" as const,
        duration: 2.6,
        transition: i ? ("fade" as const) : ("cut" as const),
        text,
        image: i >= 2 ? shot(i - 2) : undefined,
        layout: i >= 2 && shot(i - 2) ? ("phone" as const) : ("photo" as const),
        background: i >= 2 && imgs.length ? undefined : bg(i),
        textStyle: { position: "upper" as const, size: text.split(/\s+/).length <= 5 ? 0.075 : text.split(/\s+/).length <= 12 ? 0.065 : 0.05 },
      })),
      meta: meta(ctx, v, this, `${ctx.hook.replace(/\*/g, "").replace(/\\n|\n/g, " ")}. the app is called ${v.app}`),
    };
  },
});

F.push({
  id: "talking-head",
  name: "Talking head story",
  tagline: "You (or a creator) on camera: a specific pain, then the app.",
  category: "story",
  kind: "video",
  platforms: ["tiktok", "instagram", "youtube"],
  status: "hot",
  why: "A face talking for 3+ seconds builds more trust than any text, and a specific story makes viewers see themselves. Practitioners rank talking to camera as the best-converting style (1–2% of views install vs 0.2–0.4% for slideshows).",
  beats: ["Hook line on frame 1 (repeated as text, upper third)", "The specific story", "'then I found…' cut to the screen", "Result + say the app name once"],
  lengthSec: [15, 45],
  needs: ["screen recording"],
  effort: "medium",
  captionStyle: "tiktok-classic",
  soundTip: "Original voice; no music or very low.",
  hooks: ["why did nobody tell me about this sooner", "my mom just changed my life with one app", "I'm a {audience} and this is embarrassing"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const cam = faceCam(ctx);
    const scenes: SceneInput[] = cam
      ? [
          {
            id: sid(),
            type: "media",
            duration: Math.min(9, Math.max(4, (cam.durationSec ?? 8) * 0.6)),
            src: `asset:${cam.file}`,
            kind: "video",
            volume: 1,
            device: "none",
            caption: { text: ctx.hook, style: { style: "tiktok-classic", position: "upper", animation: "fade" } },
          },
          ...demoScenes(ctx, v, { total: 5, captions: [`then I found ${v.app}`] }),
        ]
      : [
          { id: sid(), type: "hook", duration: 2.8, text: ctx.hook, image: heroScreen(ctx), textStyle: { style: "tiktok-classic" }, note: "Record yourself saying the hook (Assets → tag it 'face cam') — talking heads convert best." },
          ...demoScenes(ctx, v),
        ];
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: theme(p, this.captionStyle),
      scenes: [...scenes, cta(p, v)],
      meta: meta(ctx, v, this),
    };
  },
});

F.push({
  id: "founder-split",
  name: "Founder split-screen",
  tagline: "Screen on top, your face below, headline on the seam.",
  category: "demo",
  kind: "video",
  platforms: ["tiktok", "instagram", "youtube", "linkedin", "x"],
  status: "hot",
  why: "The measured founder demo layout (1.0M views): product on top, a human below, a persistent red headline on the seam. You get the demo's proof and the face's trust in every frame.",
  beats: ["Headline box on the seam from frame 1", "Screen recording (top) + you explaining (bottom)", "CTA"],
  lengthSec: [15, 60],
  needs: ["screen recording"],
  effort: "medium",
  captionStyle: "headline",
  soundTip: "Your voice; no music.",
  hooks: ["I built the app I wish I had in college", "why I quit my job to build {app}", "the feature nobody asked for (that everyone uses)"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const cam = faceCam(ctx);
    const screen = bestVideo(ctx);
    const imgs = images(ctx);
    const top = screen ? { src: `asset:${screen.file}`, kind: "video" as const, device: isPortrait(screen) ? ("iphone" as const) : ("none" as const) } : imgs[0] ? { src: `asset:${imgs[0].file}`, kind: "image" as const, device: isPortrait(imgs[0]) ? ("iphone" as const) : ("none" as const) } : { text: v.oneLiner };
    const bottom = cam ? { src: `asset:${cam.file}`, kind: "video" as const, volume: 1 } : { text: `${v.app}: ${short(v.outcome, 60)}` };
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: theme(p, this.captionStyle),
      scenes: [
        {
          id: sid(),
          type: "split",
          duration: Math.min(20, Math.max(8, cam?.durationSec ?? screen?.durationSec ?? 10)),
          ratio: 0.656,
          stagger: 0,
          top: { label: "", ...top },
          bottom: { label: "", ...bottom },
          caption: { text: ctx.hook, style: { style: "headline" } },
          note: cam ? undefined : "Record a face-cam clip (Assets → tag 'face cam') for the bottom panel.",
        },
        cta(p, v),
      ],
      meta: meta(ctx, v, this),
    };
  },
});

F.push({
  id: "green-screen",
  name: "Green-screen reaction",
  tagline: "You react in the corner over a screenshot, tweet or the App Store page.",
  category: "reaction",
  kind: "video",
  platforms: ["tiktok", "instagram"],
  status: "hot",
  why: "Borrowed context (a headline, a viral clip, a claim) gives an instant reason to care and your face adds trust. Practitioners called it the most viral format of late 2026, and Instagram counts commentary as original.",
  beats: ["Wild hook over the background", "Context: the screenshot/claim", "Proof: the app doing it", "Question CTA"],
  lengthSec: [12, 40],
  needs: ["screenshots"],
  effort: "low",
  captionStyle: "tiktok-classic",
  soundTip: "Original voice.",
  hooks: ["this guy needs to slow down", "people are mad about this app", "I can't believe this got approved"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const cam = faceCam(ctx);
    const handle = v.app.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const scenes: SceneInput[] = [
      {
        id: sid(),
        type: "tweet",
        duration: 3.6,
        name: "someone on X",
        handle: "builder",
        text: short(`why is there still no app that ${v.does}`, 140),
        caption: { text: ctx.hook, style: { style: "tiktok-classic", position: "top" } },
      },
      ...demoScenes(ctx, v, { total: 5, captions: [`so we built ${v.app}`] }),
      { ...cta(p, v), headline: "would you use this?", action: "comment" } as SceneInput,
    ];
    const total = scenes.reduce((n, sc) => n + (sc.duration ?? 2.5), 0);
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: theme(p, this.captionStyle),
      scenes,
      overlays: cam ? [{ id: "cam", type: "pip", start: 0, end: total, src: `asset:${cam.file}`, kind: "video", shape: "rounded", corner: "bottom-left", size: 0.42 }] : [],
      meta: { ...meta(ctx, v, this), notes: cam ? undefined : `Add a face-cam clip (tag it 'face cam') to appear in the corner. @${handle}` },
    };
  },
});

F.push({
  id: "stakes-devlog",
  name: "Stakes devlog",
  tagline: "Open on a real problem ('my app is in TROUBLE'), show the fix.",
  category: "build-in-public",
  kind: "video",
  platforms: ["tiktok", "youtube", "x", "instagram"],
  status: "hot",
  why: "Conflict in the first second gives a reason to watch that progress logs lack; viewers see you solve a real problem and get attached. Megabonk's devlogs hit 5.25M. Stakes must be real.",
  beats: ["Trouble hook in caps", "The problem (comment, bug, number)", "The fix: before → after", "CTA"],
  lengthSec: [12, 40],
  needs: ["screen recording"],
  effort: "medium",
  captionStyle: "hormozi",
  soundTip: "Record scratch on the problem, then your voice + upbeat music.",
  hooks: ["my app is in TROUBLE", "a user BROKE my app in one day", "did I make {app} TOO simple?"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const r = seeded(ctx.seed ?? 5);
    const imgs = images(ctx);
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: theme(p, this.captionStyle),
      scenes: [
        { id: sid(), type: "hook", duration: 2.4, text: ctx.hook, sfx: "boom", textStyle: { style: "hormozi", animation: "slam" } },
        {
          id: sid(),
          type: "comment",
          duration: 3,
          transition: "zoom",
          username: pick(["realuser_22", "notimpressed", "kai.builds", "mira.t"], r),
          text: short(`${v.pains[0]}… and your app didn't help`, 80),
          caption: { text: "okay. let me explain.", style: { style: "tiktok-box-dark" } },
          note: "Use a real comment or bug report — devlog stakes must be real.",
        },
        {
          id: sid(),
          type: "split",
          duration: 4.5,
          transition: "slide-up",
          top: { label: "before", text: short(v.pain, 60), tone: "bad" },
          bottom: imgs[0] ? { label: "after", src: `asset:${imgs[0].file}`, kind: "image", tone: "good" } : { label: "after", text: short(v.outcome, 60), tone: "good" },
        },
        ...(bestVideo(ctx) ? demoScenes(ctx, v, { total: 5 }) : []),
        { ...cta(p, v), headline: "fixed. try it free" } as SceneInput,
      ],
      meta: meta(ctx, v, this, `${short(ctx.hook.replace(/\*/g, ""), 80)} #devlog #buildinpublic`),
    };
  },
});

F.push({
  id: "text-wall",
  name: "Wall-of-text loop",
  tagline: "A 6-second clip under a paragraph that takes 15s to read, so it loops.",
  category: "skit",
  kind: "video",
  platforms: ["tiktok", "instagram", "x"],
  status: "steady",
  why: "The text takes longer to read than the clip runs, so each view counts 2–3 loops (great retention). A relatable rant ending in a question pulls replies. Cheapest format to make — but name the app inside the text or it won't convert.",
  beats: ["Clip + full paragraph on screen from frame 1", "40–80 word rant/confession naming the app", "Seamless loop"],
  lengthSec: [5, 8],
  needs: ["nothing"],
  effort: "low",
  captionStyle: "tiktok-box",
  soundTip: "Trending sound at low volume.",
  hooks: ["just saw someone do it without {app}. like a psychopath", "give me your most unhinged way to {outcome}"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const video = bestVideo(ctx) ?? faceCam(ctx);
    const rant = `${ctx.hook.replace(/\*/g, "").replace(/[.!?]$/, "")}. no ${v.competitor ? v.competitor.toLowerCase() : "spreadsheets"}, no reminders, no system, just vibes. meanwhile I opened ${v.app}, it ${v.does} and I went back to my life. am I crazy or is everyone else just suffering on purpose??`;
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: { ...theme(p, this.captionStyle), sfx: false },
      scenes: [
        {
          id: sid(),
          type: "hook",
          duration: 6,
          text: rant.toLowerCase(),
          textStyle: { style: "tiktok-box", size: 0.042, animation: "none", position: "center" },
          background: video ? { kind: "media", src: `asset:${video.file}`, dim: 0.35, blur: 0 } : { kind: "mesh", colors: [p.brand.bg || "#0B0B0F", shade(p.brand.accent, 2), "#121216"] },
        },
      ],
      meta: meta(ctx, v, this, `be honest 👇 (${v.app})`),
    };
  },
});

F.push({
  id: "x-demo",
  name: "X demo post",
  tagline: "Silent screen capture + one odd-premise line. Built for X.",
  category: "demo",
  kind: "video",
  platforms: ["x", "linkedin", "threads", "bluesky"],
  status: "hot",
  why: "X autoplays muted, so a self-explaining capture plus one surprising line is the fastest 'wait, what?'. Builders share builds they wish they'd made (Marc Lou 1.1M, Pieter Levels 13.5M). Link goes in the first reply.",
  beats: ["Post text: the odd premise or the outcome", "Capture starts on the most visual frame, sped up 1.5×", "Hold the payoff 2–3s (loops)"],
  lengthSec: [10, 30],
  needs: ["screen recording"],
  effort: "low",
  captionStyle: "minimal",
  soundTip: "None needed (muted autoplay).",
  hooks: ["I made an app to {outcome}", "what if {app} but for {audience}", "IT WORKS. {app} {does}"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const video = bestVideo(ctx);
    const imgs = images(ctx);
    const scenes: SceneInput[] = video
      ? [
          {
            id: sid(),
            type: "media",
            duration: Math.min(20, Math.max(6, ((video.durationSec ?? 10) - 0.2) / 1.5)),
            src: `asset:${video.file}`,
            kind: "video",
            playbackRate: 1.5,
            device: isPortrait(video) ? "iphone" : "floating",
            zooms: [{ at: 1.2, scale: 1.7, x: 0.5, y: 0.45, hold: 2 }],
          },
        ]
      : imgs.length
        ? demoScenes(ctx, v)
        : [{ id: sid(), type: "appstore", duration: 4, appName: v.app, subtitle: short(v.tagline, 34), icon: p.brand.logo }];
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      aspect: video && !isPortrait(video) ? "16:9" : "9:16",
      theme: { ...theme(p, this.captionStyle), grain: false, sfx: false },
      scenes,
      meta: { ...meta(ctx, v, this, ctx.hook.replace(/\*/g, "")), captions: { x: `${ctx.hook.replace(/\*/g, "")}\n\n(link in the reply)` } },
    };
  },
});

// ── native formats (rebuilt from research/viral/*.md: what the hits actually look like) ───────────

/** Hand-held phone clips available to the "hand" device (public/hands, fetched by npm run fetch-hands). */
const HANDS: { id: string; setting?: string; motion?: string }[] = (handLibrary as unknown as { id: string }[]).filter((h) => h && h.id);

/** Every portrait app screen, ordered by the feature it shows (features are ranked by wow). */
function orderedScreens(ctx: BuildContext, v: Vocab) {
  const rank = (file: string) => {
    const f = featureFor(file, v.features);
    return f ? v.features.indexOf(f) : 99;
  };
  return images(ctx)
    .filter((m) => m.role === "screen" || (!m.role && isPortrait(m)))
    .map((m, i) => ({ m, i, r: rank(m.file) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    // One screen per feature, so no two shots say the same thing.
    .filter((x, i, all) => x.r === 99 || all.findIndex((y) => y.r === x.r) === i)
    .map((x) => x.m);
}
/** A real launch / tap-through recording if the project has one (named launch, open, tapthrough…). */
function launchClip(ctx: BuildContext) {
  return ctx.media.find((m) => m.kind === "video" && m.role === "screen" && /launch|open|splash|tap.?through|start/i.test(m.file));
}
/** One step caption in the hits' voice: lowercase, 2–7 words, no full stop. */
export function stepLine(f: { name: string; benefit?: string }): string {
  const b = (f.benefit || "").replace(/[.!]+$/, "").trim();
  const clause = b.split(/[,;:]|\s+—\s+|\s+-\s+/)[0].trim();
  const n = clause.split(/\s+/).length;
  const pick = clause && n >= 3 && n <= 8 ? clause : f.name;
  return lc1(pick.replace(/[.!]+$/, ""));
}
const lc1 = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
/** Is the app's UI light (cream/white screens)? Plain white TikTok text vanishes on those. */
function lightUi(p: Project): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec((p.brand.bg || "").trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255) > 0.45;
}
/** TikTok text over the app's own screens: plain white on dark UIs (as the hits do), the white box on light ones. */
const uiText = (p: Project): CaptionStyleId => (lightUi(p) ? "tiktok-box" : "tiktok-plain");
const nativeTheme = (p: Project, captionStyle: CaptionStyleId) => ({ ...theme(p, captionStyle), grain: false, sfx: false });
const photosOf = (ctx: BuildContext) => ctx.media.filter((m) => m.kind === "image" && m.role === "photo");
/** First match of each regex, in order, among a list of files. */
function firstFile<T extends { file: string }>(list: T[], res: RegExp[], not: T[] = []): T | undefined {
  for (const re of res) {
    const hit = list.find((m) => re.test(m.file) && !not.includes(m));
    if (hit) return hit;
  }
  return undefined;
}
const screenScene = (m: { file: string; width?: number; height?: number }, extra: Partial<SceneInput> & { duration: number }): SceneInput =>
  ({ id: sid(), type: "media", src: `asset:${m.file}`, kind: "image", device: "none", anchor: "top", aspect: aspectOf(m), transition: "cut", ...extra }) as SceneInput;

F.push({
  id: "raw-demo",
  name: "Raw screen demo",
  tagline: "Result first, then the app doing it: raw recording, one caption per step, no mockup.",
  category: "demo",
  kind: "video",
  platforms: ["tiktok", "instagram", "youtube"],
  status: "hot",
  why: "The faceless format with the best install rate (0.5–1% of viewers). Every hit studied (Remini 14–139M, StudyFetch 13.4M, Cal AI) is deliberately raw: the real screen edge to edge, TikTok's own text, one short line per step, hard cuts every ~2 s, the result held at the end. Mockups, zooms and end cards read as ads.",
  beats: ["Hook over the result screen, 0–2.8 s", "Name drop: the app opening (≈1.5 s)", "3–4 steps, one lowercase caption each, hard cuts ~2 s", "The result again, no text, 2.4–3 s"],
  lengthSec: [10, 20],
  needs: ["screenshots"],
  effort: "low",
  captionStyle: "tiktok-plain",
  soundTip: "One trending or Commercial Music Library track, kept as a bed. No voiceover.",
  hooks: ["how I stopped {painYou}", "I don't have time to {pain} 💀💀💀", "POV: you found an app that {does}", "this is how I {outcome} now"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const screens = orderedScreens(ctx, v);
    const launch = launchClip(ctx);
    const result = screens[0];
    const steps = screens.slice(1, 5);
    const top = (text: string) => ({ text, style: { style: uiText(p), position: "upper" as const } });
    const scenes: SceneInput[] = [];
    if (result) scenes.push(screenScene(result, { duration: 2.8, caption: top(ctx.hook) }));
    else scenes.push({ id: sid(), type: "hook", duration: 2.8, text: ctx.hook, textStyle: { style: "tiktok-plain" } });
    if (launch)
      scenes.push({ id: sid(), type: "media", duration: 1.6, src: `asset:${launch.file}`, kind: "video", device: "none", anchor: "top", aspect: aspectOf(launch), caption: top(`download ${v.app.toLowerCase()}`) });
    steps.forEach((m) => {
      const f = featureFor(m.file, v.features);
      scenes.push(screenScene(m, { duration: 2.1, caption: top(f ? stepLine(f) : v.outcome) }));
    });
    if (result) scenes.push(screenScene(result, { duration: 2.6 }));
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: nativeTheme(p, this.captionStyle),
      scenes,
      meta: meta(ctx, v, this, `${ctx.hook.replace(/\*/g, "")} 😭 app is called ${v.app}`),
    };
  },
});

F.push({
  id: "found-this",
  name: "“I'm just NOW finding this??”",
  tagline: "A relatable moment, then one continuous take of the app doing the whole job.",
  category: "demo",
  kind: "video",
  platforms: ["tiktok", "instagram", "youtube"],
  status: "hot",
  why: "Disbelief-discovery is the strongest product-led format in the research (Potto 29.3M and 10.5M, Stronger 851K, Nomad Table 1.0M): a 3 s relatable shot with the hook, then a single unbroken take of the app in a hand, one benefit line per beat. Viewers save it because it feels like a friend's tip, not an ad.",
  beats: ["0–3 s: real-life shot + hook strip", "One continuous take of the app (phone in hand when available)", "A new benefit line every ~2 s", "Hold the payoff screen; name the app in the caption"],
  lengthSec: [12, 20],
  needs: ["screenshots"],
  effort: "low",
  captionStyle: "tiktok-plain",
  soundTip: "Soft trending sound or lo-fi; optionally a whispered 'I can't believe this is real' voiceover.",
  hooks: [
    "been {pain} for years and I'm JUST NOW finding this??",
    "why did nobody tell me you can just {outcome}",
    "someone made an app that {does}??",
    "my friend just showed me this and I'm so mad nobody told me sooner",
  ],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const screens = orderedScreens(ctx, v);
    const launch = launchClip(ctx);
    const { all: clips } = brollClips(ctx);
    const r = seeded((ctx.seed ?? 0) + hashString(ctx.hook));
    const opener = firstFile(clips, [/phone|texting|scroll/i, /overwhelm|stress|frustrat|tired|chaos/i]) ?? (clips.length ? pick(clips, r) : undefined);
    const scenes: SceneInput[] = [];
    if (opener)
      scenes.push({ id: sid(), type: "media", duration: 3, src: `asset:${opener.file}`, kind: "video", device: "none", aspect: aspectOf(opener), push: 1.05, caption: { text: ctx.hook, style: { style: "snapchat", position: "bottom" } } });
    // One take: the app opens (if there's a recording), then moves screen to screen like someone using it.
    const take = screens.slice(0, 5);
    const first = launch ?? take[0];
    if (first) {
      const firstDur = launch ? Math.min(3.2, Math.max(2, (launch.durationSec ?? 3) - 0.4)) : 2.2;
      const flow = (launch ? take : take.slice(1)).map((m, i) => ({ at: +(firstDur + i * 2.2).toFixed(2), src: `asset:${m.file}`, kind: "image" as const, transition: "push" as const }));
      const lines = [
        { at: 0, text: "watch this…" },
        ...(launch ? take : take.slice(1)).map((m, i) => {
          const f = featureFor(m.file, v.features);
          return { at: +(firstDur + i * 2.2).toFixed(2), text: f ? stepLine(f) : v.outcome };
        }),
      ];
      const total = firstDur + flow.length * 2.2 + 0.6;
      scenes.push({
        id: sid(),
        type: "media",
        duration: +total.toFixed(2),
        src: `asset:${first.file}`,
        kind: launch ? "video" : "image",
        device: HANDS.length ? "hand" : "none",
        hand: HANDS.length ? pick(HANDS, r).id : undefined,
        anchor: "top",
        aspect: aspectOf(first),
        flow,
        lines,
        caption: { text: "watch this…", style: { style: uiText(p), position: "upper" } },
      } as SceneInput);
    }
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: nativeTheme(p, this.captionStyle),
      scenes,
      meta: meta(ctx, v, this, `it's called ${v.app} and it's ${p.cta.text?.toLowerCase().includes("free") ? "free" : "on the App Store"} 😭`),
    };
  },
});

F.push({
  id: "mental-load",
  name: "“No one talks about…” wall of text",
  tagline: "One real clip, one honest paragraph, no app on screen. Built for reach.",
  category: "story",
  kind: "video",
  platforms: ["tiktok", "instagram"],
  status: "hot",
  why: "The highest-engagement content in most niches is the feeling, not the product (mental-load posts hit 9–18% like rates, up to 6.9M views). Naming the app in the overlay cut a competitor's reach ~80–250×; its breakouts named it only in the caption. The paragraph takes longer to read than the 7 s clip, so viewers loop.",
  beats: ["One static clip, 6–8 s, no cuts", "A 40–60 word paragraph on screen from frame 1, with one specific detail", "App only in the caption + pinned comment"],
  lengthSec: [6, 8],
  needs: ["nothing"],
  effort: "low",
  captionStyle: "tiktok-classic",
  musicVibes: ["emotional", "cinematic", "lofi", "chill"],
  soundTip: "A trending melancholy or ironic sound with no voice.",
  hooks: ["No one talks about how exhausting it is when {painYou}", "Nobody warns you that {painYou}"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const { problem } = brollClips(ctx);
    const youPains = p.pains.map((x) => toYou(x.replace(/[.!?]+$/, "")));
    const opening = ctx.hook.replace(/\*/g, "").replace(/[.!?]+$/, "");
    const rest = youPains.slice(opening.toLowerCase().includes(youPains[0]?.toLowerCase() ?? "\u0000") ? 1 : 0, 3).map((x) => x.charAt(0).toUpperCase() + x.slice(1));
    // 40–60 words: the hook, then the brief's pains until the paragraph is full.
    const parts = [opening + "."];
    for (const x of rest) if ((parts.join(" ") + " " + x).split(/\s+/).length <= 58) parts.push(x + ".");
    const paragraph = parts.join(" ");
    return {
      title: short(opening, 60),
      formatId: this.id,
      theme: nativeTheme(p, this.captionStyle),
      scenes: [
        problem
          ? { id: sid(), type: "media", duration: 7, src: `asset:${problem.file}`, kind: "video", device: "none", aspect: aspectOf(problem), push: 1.03, caption: { text: paragraph, style: { style: "tiktok-classic", size: 0.041, position: "center" } } }
          : { id: sid(), type: "hook", duration: 7, text: paragraph, textStyle: { style: "tiktok-classic", size: 0.041 } },
      ],
      meta: meta(ctx, v, this, `it's why we use ${v.app} now tbh 🫠`),
    };
  },
});

F.push({
  id: "setup-receipts",
  name: "Setup → receipts (2 slides)",
  tagline: "A quote over a candid photo, then a raw screenshot from the app as the punchline.",
  category: "slideshow",
  kind: "slideshow",
  platforms: ["tiktok", "instagram"],
  status: "hot",
  why: "The highest-reach carousel structure in the research (Stronger 7.3M / 3.5M / 1.2M, Hevy 1.1M): one swipe pays off, and the screenshot is both punchline and proof. 3:4 photos, TikTok's own text, the app's real screen at native size.",
  beats: ["Slide 1: candid phone photo + a quote someone said to you", "Slide 2: raw screenshot from the app + the punchline in a white box"],
  lengthSec: [5, 7],
  needs: ["screenshots"],
  effort: "low",
  captionStyle: "tiktok-classic",
  soundTip: "Add a trending sped-up sound in TikTok's photo mode; reuse it across the series.",
  hooks: ["“how do you {outcome}?”", "“you're so organized, how do you remember everything?”", "“I wish I could {outcome} like you”"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const r = seeded((ctx.seed ?? 0) + hashString(ctx.hook));
    const photos = photosOf(ctx);
    const photo = firstFile(photos, [/overwhelm|stress|chaos|rush|frustrat|phone|texting/i]) ?? (photos.length ? pick(photos, r) : undefined);
    const shot = orderedScreens(ctx, v)[0];
    const quote = /[“"]/.test(ctx.hook) ? ctx.hook : `“${ctx.hook.replace(/\*/g, "")}”`;
    return {
      title: short(quote, 60),
      formatId: this.id,
      kind: "slideshow",
      aspect: "3:4",
      theme: nativeTheme(p, this.captionStyle),
      scenes: [
        { id: sid(), type: "slide", duration: 2.5, text: quote, image: photo ? `asset:${photo.file}` : undefined, layout: "photo", textStyle: { style: "tiktok-classic", size: 0.05, position: "center" }, background: photo ? undefined : { kind: "solid", color: "#1c1a17" } },
        { id: sid(), type: "slide", duration: 2.5, text: `I don't. ${v.app} does`, image: shot ? `asset:${shot.file}` : undefined, layout: shot ? "screenshot" : "photo", textStyle: { style: "tiktok-box", position: "center" } },
      ],
      meta: { ...meta(ctx, v, this, `honestly 🫠 #${v.app.toLowerCase().replace(/[^a-z0-9]/g, "")}`), soundTip: this.soundTip },
    };
  },
});

F.push({
  id: "that-girl",
  name: "“N reasons why X is THAT girl”",
  tagline: "A calm numbered list over real-life footage, small serif text, one beat per reason.",
  category: "listicle",
  kind: "video",
  platforms: ["tiktok", "instagram"],
  status: "hot",
  why: "The organization-satisfaction list (Hearth 754K and 468K, ~1% saves): pretty real-life footage, small calm serif text, a cut every 1.5–3 s, and the product shown as part of life rather than as a feature tour. Re-runs every season with a new header.",
  beats: ["Hook over a lifestyle shot", "One reason per shot (most show life, a few show the app)", "Last line speaks to the viewer"],
  lengthSec: [18, 28],
  needs: ["nothing"],
  effort: "low",
  captionStyle: "serif-white",
  soundTip: "A trending upbeat 'that girl' sound, no voiceover.",
  hooks: ["{number} reasons why {app} is THAT girl", "{number} small things that saved my sanity this year"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const r = seeded((ctx.seed ?? 0) + hashString(ctx.hook));
    const clips = shuffle(brollClips(ctx).all, r);
    const screens = orderedScreens(ctx, v);
    const reasons = [...v.features.map((f) => stepLine(f)), ...v.outcomes.map((o) => `I finally ${o}`)].slice(0, 6);
    const hookText = ctx.hook.replace(/\{number\}/g, String(reasons.length));
    // Hearth's text measures ≈ 46–50 px at 1080 wide: calm, but readable at a glance.
    const small = (text: string, position: "center" | "low") => ({ text, style: { style: "serif-white" as const, size: 0.045, position } });
    const scenes: SceneInput[] = [];
    const clipAt = (i: number) => clips[i % Math.max(1, clips.length)];
    const c0 = clipAt(0);
    scenes.push(
      c0
        ? { id: sid(), type: "media", duration: 2.8, src: `asset:${c0.file}`, kind: "video", device: "none", aspect: aspectOf(c0), push: 1.04, caption: small(hookText, "center") }
        : { id: sid(), type: "hook", duration: 2.8, text: hookText, textStyle: { style: "serif-white" } },
    );
    reasons.forEach((reason, i) => {
      const text = `${i + 1}. ${reason}`;
      // Every third reason shows the app itself, the rest show life with it.
      const shot = i % 3 === 1 ? screens[Math.floor(i / 3) % Math.max(1, screens.length)] : undefined;
      const clip = clipAt(i + 1);
      if (shot) scenes.push(screenScene(shot, { duration: 2.6, caption: lightUi(p) ? { text, style: { style: "serif-box", size: 0.044, position: "low" } } : small(text, "low") }));
      else if (clip) scenes.push({ id: sid(), type: "media", duration: 2.6, src: `asset:${clip.file}`, kind: "video", device: "none", aspect: aspectOf(clip), push: 1.04, caption: small(text, "low") });
    });
    const last = clipAt(reasons.length + 1);
    if (last) scenes.push({ id: sid(), type: "media", duration: 2.6, src: `asset:${last.file}`, kind: "video", device: "none", aspect: aspectOf(last), push: 1.04, caption: small(`if ${v.painYou}… you need this`, "low") });
    return {
      title: short(hookText, 60),
      formatId: this.id,
      theme: nativeTheme(p, this.captionStyle),
      scenes,
      meta: meta(ctx, v, this, `saving my sanity one app at a time 🤍 (${v.app})`),
    };
  },
});

F.push({
  id: "backdrop-pov",
  name: "App-screen backdrop POV",
  tagline: "Your busiest app screen as the whole background, one meme line on top.",
  category: "reaction",
  kind: "video",
  platforms: ["tiktok", "instagram"],
  status: "hot",
  why: "The cheapest product-visible format (Howbout 21.4M / 7.7M / 1.1M): the packed screen is the joke, so it reads as 'a screenshot of my life', not an ad. One line, 6–7 s, loops.",
  beats: ["Full-screen app screen (the busiest one) from frame 1", "One meme line in TikTok text, top third", "Loop"],
  lengthSec: [5, 8],
  needs: ["screenshots"],
  effort: "low",
  captionStyle: "tiktok-classic",
  musicVibes: ["funny", "bouncy", "lofi", "chill"],
  soundTip: "A trending meme sound.",
  hooks: ["me checking {app} to see if anyone else could've done it today", "POV: you finally see how much you were carrying", "the {app} in October be like"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const shot = firstFile(orderedScreens(ctx, v), [/calendar|week|month|schedule|feed|dashboard|home/i]) ?? orderedScreens(ctx, v)[0];
    return {
      title: short(ctx.hook.replace(/\*/g, ""), 60),
      formatId: this.id,
      theme: nativeTheme(p, this.captionStyle),
      scenes: [
        shot
          ? screenScene(shot, { duration: 6.5, push: 1.04, caption: { text: ctx.hook, style: { style: "tiktok-classic", position: "upper" } } })
          : { id: sid(), type: "hook", duration: 6.5, text: ctx.hook, textStyle: { style: "tiktok-classic" } },
      ],
      meta: meta(ctx, v, this, `the chaos is color-coded now at least 🙃 (${v.app})`),
    };
  },
});

F.push({
  id: "ditch-old-way",
  name: "“When you finally ditch the…” transformation",
  tagline: "The old messy way, the app opening, a checklist that builds on the beat, the calm after.",
  category: "comparison",
  kind: "video",
  platforms: ["tiktok", "instagram"],
  status: "hot",
  why: "Before→after organization satisfaction (Hearth 9.3M with 91.7K shares, 'Bye bye paper calendar' 402K): the mess, the switch, a ✅ list that fills up on the beat, the payoff shot. Cuts every ~1.5 s.",
  beats: ["0–3 s: the old way, hook on screen", "The app opens", "✅ checklist builds one line per cut", "Payoff shot + one line"],
  lengthSec: [14, 20],
  needs: ["screenshots"],
  effort: "low",
  captionStyle: "tiktok-classic",
  soundTip: "Trending upbeat song with a drop around 1.6 s.",
  hooks: ["When you finally ditch the {competitor} nobody looks at", "bye bye {competitor} 👋"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const { all: clips, payoff } = brollClips(ctx);
    const old = firstFile(clips, [/calendar|sticky|paper|notes|whiteboard|fridge/i, /overwhelm|chaos|mess|rush|stress/i]);
    const old2 = firstFile(clips, [/overwhelm|chaos|mess|rush|stress|frustrat/i], old ? [old] : []);
    const launch = launchClip(ctx);
    const screens = orderedScreens(ctx, v).slice(0, 3);
    const hook = ctx.hook.replace(/\{competitor\}/g, "old way");
    const scenes: SceneInput[] = [];
    for (const c of [old, old2].filter(Boolean) as typeof clips)
      scenes.push({ id: sid(), type: "media", duration: 1.6, src: `asset:${c.file}`, kind: "video", device: "none", aspect: aspectOf(c), push: 1.04, transition: "cut" });
    if (launch) scenes.push({ id: sid(), type: "media", duration: 1.8, src: `asset:${launch.file}`, kind: "video", device: "none", anchor: "top", aspect: aspectOf(launch) });
    const checks = v.features.slice(0, Math.max(3, screens.length)).map((f) => `✅ ${stepLine(f)}`);
    const startList = scenes.length;
    // The ✅ list builds one line per cut, in TikTok's own text (boxed on light screens so it reads over the UI).
    screens.forEach((m, i) => scenes.push(screenScene(m, { duration: 1.7, caption: { text: checks.slice(0, i + 1).join("\n"), style: { style: lightUi(p) ? "tiktok-box" : "tiktok-classic", size: lightUi(p) ? 0.038 : 0.04, align: "left", position: "low" } } })));
    if (payoff)
      scenes.push({ id: sid(), type: "media", duration: 2.4, src: `asset:${payoff.file}`, kind: "video", device: "none", aspect: aspectOf(payoff), push: 1.04, caption: { text: `this app helped me ${v.outcome}`, style: { style: "tiktok-classic", position: "upper" } } });
    const hookEnd = scenes.slice(0, Math.max(1, startList)).reduce((a, sc) => a + sc.duration, 0);
    return {
      title: short(hook, 60),
      formatId: this.id,
      theme: nativeTheme(p, this.captionStyle),
      scenes,
      overlays: [{ id: "hook", type: "text", start: 0, end: +hookEnd.toFixed(2), text: hook, textStyle: { style: "tiktok-classic", position: "upper" } }],
      meta: meta(ctx, v, this, `no $300 screen needed, it's just an app 🙃 (${v.app})`),
    };
  },
});

F.push({
  id: "text-card",
  name: "Spoken text story",
  tagline: "A floating iMessage card over footage, every message read aloud, the app saves the day mid-story.",
  category: "story",
  kind: "video",
  platforms: ["tiktok", "instagram", "youtube"],
  status: "hot",
  why: "The format behind Rizz's 550M-view text-story pages: full-screen background footage, one chat card that grows a bubble per spoken line (two fast TTS voices, ~5 words/s, no gaps, no music), and the app as the plot device — the protagonist asks it for help, its suggestion is read out, sent, and wins. No end card; the caption carries the app.",
  beats: ["0 s: mid-conflict lines, 2–4 bubbles in the first 1.5 s", "Escalation", "Stuck → '<App>, help me out here' → the app's panel reads its suggestion", "The suggestion is sent; the other side melts", "Twist or cliffhanger, no end card"],
  lengthSec: [25, 90],
  needs: ["nothing"],
  effort: "low",
  captionStyle: "tiktok-classic",
  musicVibes: [],
  soundTip: "No music: the two voices are the sound (exactly like the text-story pages).",
  hooks: ["{pain}", "we need to talk about {painYou}", "ok who forgot AGAIN 😭"],
  build(ctx) {
    sceneCounter = 0;
    const p = ctx.project;
    const v = vocab(p);
    const r = seeded((ctx.seed ?? 0) + hashString(ctx.hook));
    const clips = brollClips(ctx).all;
    const bg = firstFile(clips, [/cook|kitchen|egg|dinner|pasta/i, /calm|couch|family/i]) ?? (clips.length ? pick(clips, r) : undefined);
    const contact = contactFor(ctx.hook) ?? pick(["Babe ❤️", "Mom 💕", "Sis", "Jess 🫶"], r);
    const line = ctx.hook.replace(/\*/g, "").replace(/[.!]+$/, "");
    const messages = [
      { from: "them" as const, text: "we need to talk" },
      { from: "me" as const, text: "uh oh" },
      { from: "them" as const, text: line },
      { from: "me" as const, text: "ok that's fair 😭" },
      { from: "them" as const, text: "so what are you gonna do about it" },
      { from: "me" as const, text: "hold on" },
      { from: "me" as const, text: `already did. I set up ${v.app}, it ${v.does} so nobody has to ask me anymore` },
      { from: "them" as const, text: "wait…" },
      { from: "them" as const, text: "that's actually genius" },
      { from: "them" as const, text: "why didn't we do this years ago" },
      { from: "me" as const, text: "because I was busy being the reminder 🙃" },
    ];
    return {
      title: short(line, 60),
      formatId: this.id,
      theme: { ...nativeTheme(p, this.captionStyle) },
      scenes: [
        {
          id: sid(),
          type: "chat",
          duration: 24,
          layout: "card",
          theme: "dark",
          contact,
          speak: true,
          messages,
          assist: { at: 10, after: 5, app: v.app, icon: p.brand.logo, label: `👇 ${v.app} suggests 👇`, suggestion: messages[6].text },
          background: bg ? { kind: "media", src: `asset:${bg.file}`, dim: 0, blur: 0, kenBurns: false, loopSec: Math.max(2, (bg.durationSec ?? 8) - 0.1) } : { kind: "solid", color: "#141416" },
        } as SceneInput,
      ],
      meta: meta(ctx, v, this, `@${v.app} clutched up 😭 link in bio #textstory #texts #${v.app.toLowerCase().replace(/[^a-z0-9]/g, "")}`),
    };
  },
});

/** The chat contact that matches whoever a hook mentions ("my girlfriend thought…" → her chat). */
export function contactFor(hook: string): string | undefined {
  const who = /\bmy (mum|mom|dad|girlfriend|boyfriend|roommate|boss|nan|grandma|coach|landlord|sister|brother|friend|wife|husband)\b/i.exec(hook)?.[1]?.toLowerCase();
  const CONTACTS: Record<string, string> = { mum: "Mum", mom: "Mom", dad: "Dad", girlfriend: "Jess 🫶", boyfriend: "Alex 🫶", roommate: "Sam (roommate)", boss: "Boss", nan: "Nan", grandma: "Grandma 💕", coach: "Coach Ray", landlord: "Landlord", sister: "Sis", brother: "Bro", friend: "Maya", wife: "Wife ❤️", husband: "Hubby ❤️" };
  return who ? CONTACTS[who] : undefined;
}

export const FORMATS: FormatDef[] = F;
export const FORMAT_MAP: Record<string, FormatDef> = Object.fromEntries(F.map((f) => [f.id, f]));

export function buildSpec(formatId: string, ctx: BuildContext): VideoSpecInput {
  const fmt = FORMAT_MAP[formatId] ?? FORMAT_MAP["hook-demo"];
  // No logo in the brief yet: use the uploaded icon, so end cards and store cards show the real app.
  const icon = ctx.project.brand.logo ? undefined : ctx.media.find((m) => m.role === "logo" && m.kind === "image");
  const project = icon ? { ...ctx.project, brand: { ...ctx.project.brand, logo: `asset:${icon.file}` } } : ctx.project;
  const spec: VideoSpecInput = { ...fmt.build.call(fmt, { ...ctx, project }), id: "draft" };
  return withMusic(spec, fmt, project, (ctx.seed ?? 0) + hashString(`${fmt.id}|${ctx.hook}`));
}

/**
 * Every video gets a royalty-free bed with its cuts on the beat (a silent edit feels dead even if
 * you swap in a trending sound when posting). The project's own music asset wins over the library.
 */
function withMusic(spec: VideoSpecInput, fmt: FormatDef, p: Project, seed: number): VideoSpecInput {
  if (spec.kind === "slideshow" || spec.audio?.src || (fmt.musicVibes && fmt.musicVibes.length === 0)) return spec;
  const familyish = /famil|parent|mom|dad|kid|home|household/i.test(`${p.category} ${p.audience.map((a) => a.name).join(" ")} ${p.tone ?? ""}`);
  const vibes = fmt.musicVibes ?? (fmt.category === "story" ? MUSIC_VIBES.story : familyish ? MUSIC_VIBES.family : (MUSIC_VIBES[fmt.category] ?? MUSIC_VIBES.demo));
  const track = pickMusic(vibes, seed);
  if (!track) return spec;
  // Chat/text stories keep the bed low so message pops land.
  const quiet = spec.scenes.some((s) => s.type === "chat" || s.type === "notes" || s.type === "terminal");
  // The drop lands on the first cut into the product (scene 1 for most formats).
  const firstApp = spec.scenes.findIndex((s, i) => i > 0 && s.type === "media" && s.device !== "none");
  return beatSync({ ...spec, audio: { ...(spec.audio ?? {}), volume: quiet ? 0.32 : 0.55 } }, track, { dropScene: firstApp > 0 ? firstApp : 1 });
}

/** A lighter/darker step of the brand accent for gradients, by index. */
function shade(hex: string | undefined, i: number): string {
  const base = /^#[0-9a-f]{6}$/i.test(hex ?? "") ? (hex as string) : "#D7FF3A";
  const n = parseInt(base.slice(1), 16);
  const mix = 0.14 + ((i * 37) % 10) / 100;
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * mix + 11 * (1 - mix));
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`;
}

export function fillHook(template: string, project: Project, extra: Record<string, string> = {}) {
  return fill(template, vocab(project), extra);
}
