/**
 * The carousel engine: TikTok/Instagram photo-mode carousels built the way the viral app accounts and
 * the slideshow tools (Larry, ReelFarm, GenViral…) build them. research/viral/slideshow.md and
 * research/viral/competitors.md have the measurements; the rules every format here follows:
 *
 * - 3:4 slides (1080×1440), app screenshots at their native 9:16, 2–9 slides, median ~6.
 * - Slide 1 = one photo + the hook (≤ 12 words, ≤ 3 lines) in TikTok's own text, centred on 30–50% of
 *   the height. Never the app's name, a logo or "download" on slide 1.
 * - The app shows up late and as proof: a raw screenshot of the real app, a punchline in a white box.
 * - A soft CTA in TikTok's second text box on the last slide ("it's called X, it's free"), never an end card.
 * - Photos are the project's own (b-roll stills, uploads); `photo-story` can use AI photos with one
 *   locked look (same person, home and light) when AI images are on (src/lib/server/imagegen.ts).
 * - Copy comes from the brief and the niche pack (hooks.ts carouselKit): no invented numbers.
 *
 * Every carousel is also posted as an MP4: render.ts turns the stills into a 9:16 photo-mode video
 * with a swipe on each beat of the bed (formats.ts withMusic).
 *
 * Pure functions (client + server). Type-only imports from formats.ts keep the module graph acyclic.
 */
import type { Project } from "@/lib/types";
import type { CaptionStyleId, SceneInput, TextStyle, VideoSpecInput } from "@/remotion/spec";
import type { BuildContext, FormatDef } from "./formats";
import { hashString, pick, seeded, short, shuffle, vocab, type Vocab } from "./fill";
import { carouselKit, formatHooks, hookSlots, listCount, packFor, type CarouselKit, type Slots } from "./hooks";
import { postCaption, productLine } from "./captions";

type Media = BuildContext["media"][number];

// ── looks: TikTok's text presets, sized and placed like the measured hits ───────────────

type Look = { style: CaptionStyleId; size: number; y: number; align?: "left" | "center" };
const LOOK = {
  /** TikTok Classic with outline: the default carousel text (Stronger, Hevy, Brick). */
  classic: { style: "tiktok-classic", size: 0.054, y: 0.38 },
  /** Script-made heavy outline at ~28–35% (Larry / Snugly). */
  heavy: { style: "tiktok-heavy", size: 0.054, y: 0.31 },
  /** The white box: punchlines over screenshots and busy photos. */
  box: { style: "tiktok-box", size: 0.043, y: 0.45 },
  /** Serif in stepped white boxes (Lense 1.2M). */
  serifBox: { style: "serif-box", size: 0.05, y: 0.56 },
  /** White Playfair, italic emphasis (Opal list). */
  serifWhite: { style: "serif-white", size: 0.05, y: 0.32 },
  /** No-outline TikTok text for denser lines over moody photos (Scratch body). */
  plain: { style: "tiktok-plain", size: 0.046, y: 0.42 },
} satisfies Record<string, Look>;

/** Bigger for short hooks, smaller for dense lines, so a slide never needs more than ~3–5 lines. */
function sized(look: Look, text: string, hook = false): TextStyle {
  const w = text.replace(/\*/g, "").split(/\s+/).filter(Boolean).length;
  const k = w <= 6 ? 1.1 : w <= 12 ? 1 : w <= 20 ? 0.9 : 0.8;
  return { style: look.style, size: +(look.size * k * (hook ? 1.06 : 1)).toFixed(4), y: look.y, align: look.align, animation: "none" };
}

// ── media ───────────────────────────────────────────────────────────────────────────

const isAi = (m: { file: string }) => /^ai-/i.test(m.file);
/** Candid photos: uploads and b-roll stills (role photo). AI photos only where a format asks for them. */
const photosOf = (ctx: BuildContext) => ctx.media.filter((m) => m.kind === "image" && m.role === "photo" && !isAi(m));
const portrait = (m: Media) => !!m.width && !!m.height && m.height > m.width * 1.3;
/** Real app screens (screenshots), not icons or photos. */
const screensOf = (ctx: BuildContext) => ctx.media.filter((m) => m.kind === "image" && (m.role === "screen" || (!m.role && portrait(m))) && !isAi(m));

const STRESS = /overwhelm|frustrat|rush|chaos|stress|head-down|waiting|tired|mess|sticky|wall-calendar/i;
const CALM = /calm|couch|laugh|dinner|popcorn|coffee|cooking|walk|together|smile|happy|evening/i;
const PHONE = /hands-iphone|texting|on-phone|phone|grocery-list/i;

const clipOf = (file: string) => file.replace(/\.[a-z0-9]+$/i, "").replace(/^photo-/, "").replace(/-b$/, "");

/** Hands out each photo once per carousel, best match first, then by mood, then anything left. */
class PhotoPool {
  private left: Media[];
  constructor(all: Media[], r: () => number) {
    this.left = shuffle(all, r);
  }
  get size() {
    return this.left.length;
  }
  /** Two stills of the same clip in one carousel look like a repeat: taking one retires its siblings. */
  private pickAt(i: number): Media {
    const m = this.left.splice(i, 1)[0];
    const clip = clipOf(m.file);
    this.left = this.left.filter((x) => clipOf(x.file) !== clip);
    return m;
  }
  take(hints: (RegExp | undefined)[], mood?: "stress" | "calm" | "phone"): Media | undefined {
    const avoidRe = mood === "calm" ? STRESS : mood === "stress" ? CALM : undefined;
    for (const re of hints) {
      if (!re) continue;
      // A hint match that fights the line's mood (a stressed face under a calm line) is a last resort.
      let i = this.left.findIndex((m) => re.test(m.file) && !(avoidRe && avoidRe.test(m.file)));
      if (i < 0) i = this.left.findIndex((m) => re.test(m.file));
      if (i >= 0) return this.pickAt(i);
    }
    const moodRe = mood === "stress" ? STRESS : mood === "calm" ? CALM : mood === "phone" ? PHONE : undefined;
    if (moodRe) {
      const i = this.left.findIndex((m) => moodRe.test(m.file));
      if (i >= 0) return this.pickAt(i);
    }
    // Nothing on-mood: avoid a stressed photo under a calm line and vice versa.
    const avoid = mood === "calm" ? STRESS : mood === "stress" ? CALM : undefined;
    const i = this.left.findIndex((m) => !avoid || !avoid.test(m.file));
    return i >= 0 ? this.pickAt(i) : this.left.length ? this.pickAt(0) : undefined;
  }
}

const SCREEN_HINTS: [RegExp, RegExp][] = [
  [/calendar|schedule|week|month|events?|practice|appointment/i, /calendar|cal-|week|month|schedule/i],
  [/assistant|foxy|ask|chat|ai\b/i, /foxy|assistant|chat|ai-|ask/i],
  [/remind|ring|notify|message/i, /remind|notif/i],
  [/grocer|list|shopping/i, /list|grocer/i],
  [/chore|approval/i, /chore/i],
  [/meal|dinner|recipe|cook/i, /meal|cook|recipe|dinner/i],
  [/map|location|driving|heading|where/i, /map|location/i],
  [/briefing|digest|morning|today|glance/i, /digest|brief|today|home/i],
];

/** The screenshot that shows a feature (by file name), else the next unused screen. */
function screenFor(screens: Media[], f: { name: string; benefit?: string } | undefined, used: Set<string>): Media | undefined {
  if (f) {
    // The feature's name decides first ("Remind" → remind.png even though its benefit mentions a group chat).
    for (const text of [f.name, `${f.name} ${f.benefit ?? ""}`]) {
      for (const [feat, file] of SCREEN_HINTS) {
        if (!feat.test(text)) continue;
        const hit = screens.find((m) => file.test(m.file) && !used.has(m.file));
        if (hit) return used.add(hit.file), hit;
      }
    }
  }
  const any = screens.find((m) => !used.has(m.file) && /\.png$/i.test(m.file)) ?? screens.find((m) => !used.has(m.file));
  if (any) used.add(any.file);
  return any;
}

/** The feature a screen-file hint stands for (the feature whose name matches first). */
function featureMatching(fs: { name: string; benefit?: string }[], re: RegExp) {
  return fs.find((x) => re.test(x.name)) ?? fs.find((x) => re.test(`${x.name} ${x.benefit ?? ""}`));
}

/** The app's main screen (home / calendar / dashboard), for the reveal. */
function heroScreen(screens: Media[], used: Set<string>, prefer = /home|calendar|dash|today|feed/i): Media | undefined {
  const m = screens.find((x) => prefer.test(x.file) && !used.has(x.file) && /\.png$/i.test(x.file)) ?? screens.find((x) => !used.has(x.file));
  if (m) used.add(m.file);
  return m;
}

/** Light app UI (cream/white screens): TikTok's white box disappears on it, so screenshots get the black box. */
function lightUi(p: Project): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec((p.brand.bg || "").trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255) > 0.45;
}

// ── copy helpers ────────────────────────────────────────────────────────────────────

const lc1 = (t: string) => (t && !/^(I\b|I'|[A-Z]{2})/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t);
const stripEnd = (t: string) => t.replace(/[.!]+$/, "").trim();
/** One short benefit line per feature, in the hits' voice: lowercase, 3–9 words. */
export function benefitLine(f: { name: string; benefit?: string }, maxWords = 10): string {
  const b = stripEnd((f.benefit || "").replace(/^just\s+/i, ""));
  // Cut at a clause break (", synced…", ", even when…", " — ", "; ", ": "), keeping list commas.
  const clause = b.split(/,\s+(?=(?:synced|even|with|so|which|without|and then|plus|because)\b)|;\s*|\s+—\s+|\s+-\s+|:\s+/)[0].trim();
  const n = clause.split(/\s+/).length;
  if (clause && n >= 3 && n <= maxWords) return lc1(clause);
  const first = clause.split(/,\s+/)[0].trim();
  const m = first.split(/\s+/).length;
  return lc1(first && m >= 3 && m <= maxWords ? first : f.name);
}
/** "Shared family calendar" → "the shared calendar"; "Foxy, the AI assistant" → "Foxy". */
function featureNoun(f: { name: string }): string {
  const name = f.name.split(/\s+—\s+|,\s+the\b/)[0].trim();
  // A name of its own ("Foxy", "Remind") stays as it is; a description gets "the" ("the shared calendar").
  if (/^[A-Z][a-z]+$/.test(name)) return name;
  return lc1(name.replace(/\bfamily\s+/i, "")).replace(/^(?!the\b)/, /,| and /.test(name) ? "" : "the ");
}
const cleanHook = (h: string) => h.replace(/\*/g, "").trim();

/** "FamSync is free on the App Store" → "it's free on the App Store" after the app was just named. */
function ctaTail(p: Project): string {
  const t = stripEnd(p.cta.text || "");
  const esc = p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!t || /^link in bio$/i.test(t)) return "link in bio";
  return t.replace(new RegExp(`^${esc}\\s+is\\b`, "i"), "it's").replace(new RegExp(`^(get|download)\\s+${esc}`, "i"), "$1 it");
}

// ── AI photos ───────────────────────────────────────────────────────────────────────

/** Deterministic cache file for an AI slide photo (imagegen.ts writes it, builders look it up in media). */
export function aiFileName(ai: { look?: string; prompt: string; seed?: number }): string {
  return `ai-${hashString(`${ai.look ?? ""}|${ai.prompt}|${ai.seed ?? 0}`).toString(36)}.jpg`;
}

/**
 * The locked look for an AI story: one person, one home, one light, phone-camera realism. Invented
 * people only (no likeness of anyone real), family-friendly, no text or logos in the picture.
 */
function aiLook(p: Project, seed: number): string {
  const pack = packFor(p)?.id;
  const r = seeded(seed);
  if (pack === "family") {
    const mom = pick(["a woman in her mid-30s with shoulder-length brown hair in a loose bun, wearing an oatmeal knit sweater", "a woman in her late 30s with curly dark hair tied back, wearing a sage green cardigan over a white tee", "a woman in her early 40s with a blonde bob, wearing a navy striped long-sleeve shirt"], r);
    return `One single candid iPhone photo (not a collage, not a grid), vertical 3:4, of the home of ${mom} (shown only as hands, sleeves or from behind), a warm, lived-in suburban family home (light oak kitchen with white cabinets, a beige couch, kids' drawings on the fridge). Soft natural window light, slightly underexposed, natural phone-camera grain, true-to-life colours, no filters. An ordinary moment, not posed, not a stock photo.`;
  }
  if (pack === "study") return `One single candid iPhone photo (not a collage), vertical 3:4, of a college student in their early 20s with short dark hair, wearing a grey hoodie, in a small cluttered dorm room with a desk lamp. Warm low light, natural phone-camera grain, true-to-life colours, unposed.`;
  return `One single candid iPhone photo (not a collage), vertical 3:4, of a person in their late 20s with brown hair, wearing a cream sweater, in a small bright apartment with plants. Soft window light, natural phone-camera grain, true-to-life colours, unposed.`;
}
const AI_RULES = "No text, letters, captions, logos, watermarks or brand names anywhere in the image. Phone screens are dark or turned away. Family-friendly. The people are fictional and do not resemble any real person.";
export const AI_IMAGE_RULES = AI_RULES;

// ── the slide builder ───────────────────────────────────────────────────────────────

type Kit = {
  ctx: BuildContext;
  p: Project;
  v: Vocab;
  kit: CarouselKit;
  slots: Slots;
  r: () => number;
  pool: PhotoPool;
  screens: Media[];
  used: Set<string>;
  app: string;
  icon?: string;
  /** Scene ids. */
  n: number;
};

function makeKit(ctx: BuildContext, formatId: string): Kit {
  const p = ctx.project;
  const r = seeded((ctx.seed ?? 0) + hashString(`${formatId}|${ctx.hook}`));
  return {
    ctx,
    p,
    v: vocab(p),
    kit: carouselKit(p),
    slots: hookSlots(p),
    r,
    pool: new PhotoPool(photosOf(ctx), r),
    screens: screensOf(ctx).sort((a, b) => Number(/\.png$/i.test(b.file)) - Number(/\.png$/i.test(a.file))),
    used: new Set(),
    app: p.name || "the app",
    icon: p.brand.logo,
    n: 0,
  };
}

const NO_PHOTO_BG = { kind: "solid" as const, color: "#1d1b18" };

/** A photo slide: the picture as it is, TikTok text on it. */
function photoSlide(k: Kit, text: string, photo: Media | undefined, look: Look, o: { hook?: boolean; sub?: string; subY?: number; duration?: number; shade?: number; subStyle?: CaptionStyleId } = {}): SceneInput {
  return {
    id: `c${++k.n}`,
    type: "slide",
    duration: o.duration ?? (text.split(/\s+/).length > 14 ? 3.2 : 2.6),
    transition: k.n === 1 ? "cut" : "slide-left",
    text,
    image: photo ? `asset:${photo.file}` : undefined,
    background: photo ? undefined : NO_PHOTO_BG,
    layout: "photo",
    textStyle: sized(look, text, o.hook),
    sub: o.sub,
    subY: o.subY,
    subStyle: o.subStyle,
    // Light serif text needs the tools' 20–30% overlay; outlined/boxed text reads on any photo.
    shade: o.shade ?? (look.style === "serif-white" || look.style === "tiktok-plain" ? 0.22 : undefined),
  } as SceneInput;
}

/** A raw screenshot of the real app at its native 9:16, with a punchline in a white box. */
function screenSlide(k: Kit, text: string, screen: Media | undefined, o: { sub?: string; y?: number; look?: Look; duration?: number } = {}): SceneInput {
  if (!screen) return photoSlide(k, text, k.pool.take([], "phone"), LOOK.box, { sub: o.sub });
  const light = lightUi(k.p);
  // White boxes (sans or serif) vanish on a cream/white UI: light screens always get the black box.
  const look = light && (!o.look || o.look.style === "tiktok-box" || o.look.style === "serif-box") ? { ...LOOK.box, style: "tiktok-box-dark" as const } : (o.look ?? LOOK.box);
  return {
    id: `c${++k.n}`,
    type: "slide",
    duration: o.duration ?? 2.6,
    transition: k.n === 1 ? "cut" : "slide-left",
    text,
    image: `asset:${screen.file}`,
    layout: "screenshot",
    textStyle: { ...sized(look, text), y: o.y ?? 0.47 },
    sub: o.sub,
    subStyle: light ? "tiktok-box-dark" : undefined,
  } as SceneInput;
}

function spec(k: Kit, fmt: FormatDef, scenes: SceneInput[], o: { caption?: string; title?: string; captionStyle?: CaptionStyleId } = {}): Omit<VideoSpecInput, "id"> {
  const p = k.p;
  const hook = cleanHook(k.ctx.hook);
  const post = postCaption({ project: p, formatId: fmt.id, hook, seed: k.ctx.seed, custom: o.caption });
  return {
    title: short(hook, 60),
    formatId: fmt.id,
    kind: "slideshow",
    aspect: "3:4",
    theme: {
      font: p.brand.font ?? "tiktok-sans",
      captionStyle: o.captionStyle ?? fmt.captionStyle,
      accent: p.brand.accent || "#D7FF3A",
      bg: "#000000",
      fg: "#FFFFFF",
      grain: false,
      sfx: false,
    },
    scenes,
    meta: {
      hook,
      ...post,
      soundTip: fmt.soundTip,
      // TikTok photo mode has a separate title field: the hook again, or the soft CTA (research §9).
      notes: `Photo-mode title: ${o.title ?? short(hook, 80)}`,
    },
  };
}

/** The doubter a hook names ("my husband said…"), with the pronouns the story needs. */
function doubterOf(k: Kit) {
  const named = /\bmy (mom|mum|dad|wife|husband|girlfriend|boyfriend|sister|brother|grandma|nan|mother-in-law|landlord|boss|roommate|coach|teacher|friend|best friend|professor)\b/i.exec(k.ctx.hook)?.[1]?.toLowerCase();
  const who = named ?? pick(k.slots.doubter.length ? k.slots.doubter : ["best friend"], k.r);
  const she = /mom|mum|wife|girlfriend|sister|grandma|nan|mother/.test(who);
  const he = /dad|husband|boyfriend|brother/.test(who);
  return { who, P: she ? "she" : he ? "he" : "they", obj: she ? "her" : he ? "him" : "them", s: she || he ? "s" : "", was: she || he ? "was" : "were" };
}

// ── the formats ─────────────────────────────────────────────────────────────────────

const C: FormatDef[] = [];
const base = {
  category: "slideshow" as const,
  kind: "slideshow" as const,
  platforms: ["tiktok", "instagram"] as FormatDef["platforms"],
  needs: ["screenshots"] as FormatDef["needs"],
  effort: "low" as const,
  lengthSec: [12, 22] as [number, number],
  musicVibes: ["lofi", "chill", "aesthetic", "acoustic", "warm"],
  soundTip: "Post the MP4, or the slides in TikTok photo mode with a trending sped-up/slowed sound. Reuse one sound across the series.",
};

C.push({
  ...base,
  id: "photo-story",
  name: "AI-photo story (6 slides)",
  tagline: "A six-photo story about one person: the conflict, the moment, the app as the twist.",
  status: "hot",
  why: "The slideshow-agent format (Larry/OpenClaw, Snugly 482K): six photos that look like one camera roll, a heavy-outline line at ~30% height on each, a person + doubt hook, and the app named only on the last slide. Locked photos (same person, home, light) are what make it read as a real story; AI photos are opt-in, real b-roll stills are the fallback.",
  beats: ["1: the person + the conflict (hook)", "2: the old way, up close", "3: “so I found an app that…”", "4: raw screenshot of the app", "5: the doubter's reaction", "6: “the app is called X…”"],
  captionStyle: "tiktok-heavy",
  hooks: formatHooks("photo-story"),
  build(ctx) {
    const k = makeKit(ctx, this.id);
    const { who, P, s, was } = doubterOf(k);
    // One photo set per product (Larry: proven images get reused with new hooks), so a new hook costs nothing.
    const seed = 1000 + (hashString(`${k.app}|photo-story`) % 90000);
    const look = aiLook(k.p, hashString(k.app));
    const family = packFor(k.p)?.id === "family";
    const oldWay = k.slots.oldWay[0] ?? "the old way";
    const pains = k.slots.painMe;
    // Each slide: its line, the real-photo fallback and the AI moment (same person, same home).
    const beats: { text: string; hint: (RegExp | undefined)[]; mood?: "stress" | "calm" | "phone"; ai: string }[] = [
      { text: cleanHook(ctx.hook), hint: [/overwhelm|frustrat|rush/i], mood: "stress", ai: family ? "Shot from behind her shoulder: she leans on the kitchen counter, head down over her phone, one hand in her hair. Breakfast mess, school papers and a lunchbox on the counter, the fridge with the paper calendar in the background. Morning light, no face visible." : "Shot from behind: they sit at a cluttered desk, head in one hand, phone in the other. Evening lamp light, no face visible." },
      { text: pains[1] ? `${pains[1]}` : `${oldWay} was the whole system`, hint: [k.kit.oldPhoto], mood: "stress", ai: family ? "Close-up of the same fridge door: a paper month calendar with scribbles, overlapping sticky notes, a school flyer and kids' drawings held by magnets. Slightly cluttered, no readable writing." : "Close-up of a messy desk with sticky notes and a paper planner, no readable writing." },
      { text: `so I found an app that ${k.v.does.length <= 72 ? k.v.does.replace(/\s+in one app$/i, " in one place") : "does it for me"}`, hint: [PHONE], mood: "phone", ai: family ? "First-person view looking down at her lap on the beige couch: her hands in the cardigan sleeves hold a phone with a dark screen, a mug of tea on the side table. Evening lamp light, same living room." : "First-person view of hands holding a phone with a dark screen on a couch, a mug nearby. Evening lamp light." },
      { text: "", hint: [], ai: "" }, // the screenshot
      { text: `my ${who} ${was} like… wait, it does that?`, hint: [/couch|calm|coffee/i], mood: "calm", ai: family ? "Over-the-shoulder shot on the same couch: a man's arm in a grey t-shirt points at her phone (dark screen) while she holds it, both relaxed. Faces out of frame. Evening lamp light." : "Over-the-shoulder shot: a friend's hand points at the phone (dark screen) they are holding. Faces out of frame." },
      { text: `the app is called ${k.app} and my ${who} use${s} it more than me now`, hint: [/dinner|laugh|popcorn|together/i], mood: "calm", ai: family ? "The kitchen table at dinner seen from her seat: plates of pasta, a salad bowl, kids' hands reaching for bread, a glass of milk, the same light oak kitchen behind. Warm evening light, faces out of frame, cozy and calm." : "A small kitchen table at dinner with plates and hands reaching for food, faces out of frame, warm evening light." },
    ];
    const scenes = beats.map((b, i) => {
      if (i === 3) {
        const f = k.v.features[0];
        return screenSlide(k, benefitLine(f), heroScreen(k.screens, k.used));
      }
      const ai = { look, prompt: b.ai, seed };
      const cached = ctx.media.find((m) => m.file === aiFileName(ai));
      const photo = cached ?? k.pool.take(b.hint, b.mood);
      const sc = photoSlide(k, b.text, photo, LOOK.heavy, { hook: i === 0 }) as SceneInput & { ai?: unknown };
      sc.ai = { ...ai, file: cached ? `asset:${cached.file}` : undefined };
      return sc;
    });
    return spec(k, this, scenes, { caption: `${cleanHook(ctx.hook)}. the app is called ${k.app}`, title: `the app is called ${k.app} (link in bio)` });
  },
});

C.push({
  ...base,
  id: "app-stack",
  name: "“N apps I can't live without”",
  tagline: "An app-stack list: one app per slide as a big iOS tile, yours saved for last with the real screen.",
  status: "hot",
  why: "The ‘apps every girl/mom/student needs’ list is one of the most-copied carousel formats: identity in the hook, one tile per slide, and your app as the last item so viewers swipe to the end. The other tiles are honest categories (‘a white noise app’), never fake brands.",
  beats: ["1: identity hook over a real photo", "2–N: one app tile per slide (emoji category tiles)", "Last tile: your icon + what it does", "Raw screenshot + soft CTA"],
  captionStyle: "tiktok-classic",
  hooks: formatHooks("app-stack"),
  build(ctx) {
    const k = makeKit(ctx, this.id);
    const items = k.kit.stack.slice(0, 3);
    const n = (listCount(this.id, k.p) ?? items.length + 1);
    const scenes: SceneInput[] = [photoSlide(k, cleanHook(ctx.hook).replace(/\{number\}/g, String(n)), k.pool.take([PHONE], "calm"), LOOK.classic, { hook: true })];
    items.forEach((it, i) => {
      const ph = k.pool.take([it.photo], "calm");
      scenes.push({ id: `c${++k.n}`, type: "slide", duration: 2.6, transition: "slide-left", layout: "app", title: `${i + 1}. ${it.name}`, glyph: it.glyph, text: it.line, image: ph ? `asset:${ph.file}` : undefined, background: ph ? undefined : NO_PHOTO_BG } as SceneInput);
    });
    const ph = k.pool.take([/calm|couch|coffee/i], "calm");
    scenes.push({ id: `c${++k.n}`, type: "slide", duration: 2.8, transition: "slide-left", layout: "app", title: `${items.length + 1}. ${k.app}`, icon: k.icon, text: `the one that ${k.v.does.length <= 72 ? k.v.does.replace(/\s+in one app$/i, " in one place") : `helps me ${k.v.outcome}`}`, image: ph ? `asset:${ph.file}` : undefined, background: ph ? undefined : NO_PHOTO_BG } as SceneInput);
    const f = k.v.features[0];
    scenes.push(screenSlide(k, benefitLine(f), heroScreen(k.screens, k.used), { sub: `${k.app} · ${ctaTail(k.p)}` }));
    return spec(k, this, scenes, { title: `${k.app} is the last one 👀 (link in bio)` });
  },
});

C.push({
  ...base,
  id: "wish-i-knew",
  name: "“Things I wish I knew”",
  tagline: "Aesthetic tips list in serif boxes over real-life photos; the app is the last tip, shown for real.",
  status: "hot",
  why: "The tips-list carousel with the app as the last tip (Lense 1.2M with 1.9% saves, Opal, Scratch 578K): useful enough to save, so it gets pushed; the app arrives as advice, not an ad. Serif per-line boxes are the ‘aesthetic’ look of the format.",
  beats: ["1: emotional photo + the hook", "2–5: one real tip per slide (not the app)", "6: the app as the last tip, raw screenshot", "7: phone-in-hand photo + “this is the app, link in bio”"],
  captionStyle: "serif-box",
  hooks: formatHooks("wish-i-knew"),
  build(ctx) {
    const k = makeKit(ctx, this.id);
    const tips = k.kit.tips.slice(0, 4);
    const n = tips.length + 1;
    const ys = [0.6, 0.66, 0.58, 0.64, 0.6];
    const scenes: SceneInput[] = [photoSlide(k, cleanHook(ctx.hook).replace(/\{number\}/g, String(n)), k.pool.take([/laugh|dinner|together|popcorn/i], "calm"), { ...LOOK.serifBox, y: 0.56 }, { hook: true })];
    tips.forEach((t, i) => scenes.push(photoSlide(k, `${i + 1}. ${t}`, k.pool.take([], i % 2 ? "calm" : undefined), { ...LOOK.serifBox, y: ys[i] })));
    const f = k.v.features.find((x) => /assist|remind|calendar/i.test(x.name)) ?? k.v.features[0];
    scenes.push(screenSlide(k, `${n}. let an app be the one who remembers`, screenFor(k.screens, f, k.used), { look: LOOK.serifBox, y: 0.5 }));
    scenes.push(photoSlide(k, `this is the app: ${k.app} ✨`, k.pool.take([PHONE], "phone"), { ...LOOK.serifBox, y: 0.42 }, { sub: "I linked it in my bio if you're curious", subY: 0.52, subStyle: "serif-box" }));
    return spec(k, this, scenes, { title: `${cleanHook(ctx.hook)} (the last one changed everything)` });
  },
});

C.push({
  ...base,
  id: "day-in-life",
  name: "Day in my life (the organized version)",
  tagline: "Time-stamped photos of a real day, with the app's screens where it actually helps.",
  status: "steady",
  why: "Routine content is the most natural place for an app to appear (research/viral/ugc.md T7): the day is the content, the app is part of it. Time stamps give every slide a reason to swipe; two raw screens show where the app fits.",
  beats: ["1: morning photo + the hook", "2–7: one time-stamped beat per photo", "2 raw screens where the app does the work", "Last: the evening + soft CTA"],
  captionStyle: "tiktok-classic",
  lengthSec: [18, 28],
  hooks: formatHooks("day-in-life"),
  build(ctx) {
    const k = makeKit(ctx, this.id);
    const routine = k.kit.routine.length
      ? k.kit.routine
      : [
          { time: "7:00am", line: `${k.v.outcomes[0] ?? "plan the day"} before coffee`, photo: /coffee|morning|breakfast/i, screen: /home|today|digest/i },
          { time: "12:30pm", line: benefitLine(k.v.features[1] ?? k.v.features[0]), photo: PHONE, screen: undefined },
          { time: "6:00pm", line: `${k.v.outcomes[1] ?? "done for the day"}`, photo: CALM, screen: undefined },
        ];
    const scenes: SceneInput[] = [photoSlide(k, cleanHook(ctx.hook), k.pool.take([/walk|backpack|coffee/i], "calm"), LOOK.classic, { hook: true })];
    let screens = 0;
    routine.forEach((b) => {
      scenes.push(photoSlide(k, `${b.time}\n${b.line}`, k.pool.take([b.photo], "calm"), LOOK.classic));
      const re = b.screen;
      if (!re || screens >= 2) return;
      const sc = k.screens.find((m) => re.test(m.file) && !k.used.has(m.file));
      if (!sc) return;
      k.used.add(sc.file);
      screens++;
      const f = featureMatching(k.v.features, re);
      scenes.push(screenSlide(k, f ? benefitLine(f) : b.line, sc));
    });
    const last = scenes[scenes.length - 1] as SceneInput & { sub?: string };
    last.sub = `(the app is ${k.app})`;
    return spec(k, this, scenes, { title: `a day in my life (the app is ${k.app})` });
  },
});

C.push({
  ...base,
  id: "before-after-slides",
  name: "Before vs after (photo carousel)",
  tagline: "‘before:’ over the real mess, ‘after:’ over the app's real screens, then the calm.",
  status: "steady",
  why: "Before→after is the organization niche's most shared structure (Hearth 9.3M, ‘bye bye paper calendar’); as a carousel each swipe is a reveal. The ‘after’ slides are raw screenshots, so the proof is the app itself.",
  beats: ["1: the mess + hook", "2–3: before: (the old way, real photos)", "4–5: after: (raw screens)", "6: the calm + who made it possible"],
  captionStyle: "tiktok-classic",
  hooks: formatHooks("before-after-slides"),
  build(ctx) {
    const k = makeKit(ctx, this.id);
    const pains = k.slots.painMe.length ? k.slots.painMe : [k.v.pain];
    const scenes: SceneInput[] = [photoSlide(k, cleanHook(ctx.hook).replace(/\{competitor\}/g, "the old way"), k.pool.take([k.kit.oldPhoto], "stress"), LOOK.classic, { hook: true })];
    pains.slice(0, 2).forEach((pn) => scenes.push(photoSlide(k, `before: ${pn}`, k.pool.take([], "stress"), LOOK.classic)));
    k.v.features.slice(0, 2).forEach((f) => scenes.push(screenSlide(k, `after: ${benefitLine(f)}`, screenFor(k.screens, f, k.used))));
    const win = k.slots.win[0] ?? `I finally ${k.v.outcome}`;
    scenes.push(photoSlide(k, `after: ${win}`, k.pool.take([], "calm"), LOOK.classic, { sub: `the app: ${k.app}` }));
    return spec(k, this, scenes);
  },
});

C.push({
  ...base,
  id: "texts-receipts",
  name: "Texts → receipts",
  tagline: "The chaotic group chat, then the app's screen as the answer.",
  status: "hot",
  why: "Setup → receipts is the highest-reach carousel structure (Stronger 7.3M/3.5M, Hevy 1.1M); a group-chat screenshot is a setup everyone recognises, and the raw app screen is the punchline and the proof.",
  beats: ["1: photo + hook", "2: the group chat in chaos (native iMessage screenshot)", "3: raw app screen: “now it's all in one place”", "4: the calm + the app named"],
  captionStyle: "tiktok-classic",
  lengthSec: [9, 14],
  hooks: formatHooks("texts-receipts"),
  build(ctx) {
    const k = makeKit(ctx, this.id);
    const scenes: SceneInput[] = [photoSlide(k, cleanHook(ctx.hook), k.pool.take([PHONE, /overwhelm|frustrat/i], "stress"), LOOK.classic, { hook: true })];
    const msgs = k.kit.chat.slice(0, 7);
    scenes.push({
      id: `c${++k.n}`,
      type: "chat",
      duration: 3.2,
      transition: "slide-left",
      app: "imessage",
      theme: "light",
      layout: "screen",
      contact: k.kit.chatName,
      zoom: 1.12,
      // All bubbles are already sent: it's a screenshot, not a story.
      messages: msgs.map((m, i) => ({ ...m, at: +(0.02 * i).toFixed(2) })),
    } as SceneInput);
    const f = k.v.features.find((x) => /remind|calendar/i.test(x.name)) ?? k.v.features[0];
    scenes.push(screenSlide(k, `now: ${benefitLine(f)}`, screenFor(k.screens, f, k.used)));
    const win = k.slots.win[0] ?? `I finally ${k.v.outcome}`;
    scenes.push(photoSlide(k, win, k.pool.take([], "calm"), LOOK.classic, { sub: `it's called ${k.app} 🫶` }));
    return spec(k, this, scenes, { caption: `${cleanHook(ctx.hook).replace(/[.!]+$/, "")}. it's called ${k.app}` });
  },
});

C.push({
  ...base,
  id: "notes-carousel",
  name: "iPhone Notes list",
  tagline: "A screenshot of the list in my Notes app, then the app's screens that make it work.",
  status: "steady",
  why: "Notes-app screenshots read as a real person's private system, so people save them (‘copy this list’). The list mixes real habits with the app, and the screens after it are the receipts.",
  beats: ["1: phone photo + hook", "2: the Notes-app list (native screenshot)", "3–4: the app screens behind two items", "5: soft CTA"],
  captionStyle: "tiktok-classic",
  lengthSec: [11, 16],
  hooks: formatHooks("notes-carousel"),
  build(ctx) {
    const k = makeKit(ctx, this.id);
    const feats = k.v.features.slice(0, 3);
    const items = [k.kit.tips[1], ...feats.map((f) => benefitLine(f, 10)), k.kit.tips[2], `the app for all of it: ${k.app}`].filter(Boolean) as string[];
    const scenes: SceneInput[] = [photoSlide(k, cleanHook(ctx.hook), k.pool.take([PHONE], "phone"), LOOK.classic, { hook: true })];
    const title = packFor(k.p)?.id === "family" ? "how our house runs now 🏠" : "the system (finally)";
    scenes.push({ id: `c${++k.n}`, type: "notes", duration: 3.4, transition: "slide-left", title, items, checklist: false, theme: "light" } as SceneInput);
    feats.slice(0, 2).forEach((f) => scenes.push(screenSlide(k, benefitLine(f), screenFor(k.screens, f, k.used))));
    const last = scenes[scenes.length - 1] as SceneInput & { sub?: string };
    last.sub = `${k.app} · ${ctaTail(k.p)}`;
    return spec(k, this, scenes, { title: "copy this list 📝" });
  },
});

C.push({
  ...base,
  id: "old-vs-new",
  name: "Old way vs new way",
  tagline: "Pairs of slides: ‘old way:’ over the real thing ❌, ‘new way:’ over the app's screen ✅.",
  status: "hot",
  why: "Comparison carousels pick a fight with a habit everyone has (‘X could never’): every pair is a mini before/after and the app wins three times. The old way is shown with real photos, the new way with the real app.",
  beats: ["1: hook over the old way", "2–7: old way ❌ / new way ✅ pairs", "8: soft CTA"],
  captionStyle: "tiktok-classic",
  hooks: formatHooks("old-vs-new"),
  build(ctx) {
    const k = makeKit(ctx, this.id);
    const hookLc = ctx.hook.toLowerCase();
    // The old way the hook names goes first.
    const olds = (k.slots.oldWay.length ? [...k.slots.oldWay] : ["doing it from memory"]).sort((a, b) => Number(hookLc.includes(b.toLowerCase())) - Number(hookLc.includes(a.toLowerCase())));
    const scenes: SceneInput[] = [photoSlide(k, cleanHook(ctx.hook).replace(/\{competitor\}/g, "the old way"), k.pool.take([/chat|text/i.test(olds[0]) ? PHONE : k.kit.oldPhoto], "stress"), LOOK.classic, { hook: true })];
    const pairs = Math.min(3, k.v.features.length, Math.max(2, olds.length));
    const PAIR: [RegExp, RegExp][] = [
      [/sticky|notes?|list/i, /list|chore|grocer/i],
      [/fridge|calendar|paper|planner|whiteboard/i, /calendar|schedule/i],
      [/chat|text|group/i, /remind|message|notify/i],
    ];
    const taken = new Set<string>();
    for (let i = 0; i < pairs; i++) {
      const old = olds[i % olds.length];
      const want = PAIR.find(([o]) => o.test(old))?.[1];
      const f = (want && k.v.features.find((x) => !taken.has(x.name) && want.test(x.name))) || k.v.features.find((x) => !taken.has(x.name)) || k.v.features[0];
      taken.add(f.name);
      const hint = /chat|text/i.test(old) ? PHONE : /fridge|calendar|sticky|paper/i.test(old) ? k.kit.oldPhoto : undefined;
      scenes.push(photoSlide(k, `old way: ${old} ❌`, k.pool.take([hint], "stress"), LOOK.classic));
      scenes.push(screenSlide(k, `new way: ${benefitLine(f)} ✅`, screenFor(k.screens, f, k.used)));
    }
    scenes.push(photoSlide(k, `the new way is called ${k.app}`, k.pool.take([], "calm"), LOOK.classic, { sub: ctaTail(k.p) }));
    return spec(k, this, scenes);
  },
});

C.push({
  ...base,
  id: "rate-my-setup",
  name: "Rate my setup",
  tagline: "A tour of my system, one part per slide, and a ‘rate it 1–10’ ending that pulls comments.",
  status: "steady",
  why: "‘Rate my setup’ turns the product into something people judge out loud: every part gets a slide, the last slide asks for a score, and comments push the post. The parts are the app's real screens.",
  beats: ["1: photo + hook", "2–5: one part of the setup per slide (raw screens)", "6: “ok be honest, rate it 1–10 👇”"],
  captionStyle: "tiktok-classic",
  hooks: formatHooks("rate-my-setup"),
  build(ctx) {
    const k = makeKit(ctx, this.id);
    const scenes: SceneInput[] = [photoSlide(k, cleanHook(ctx.hook), k.pool.take([/calm|couch|coffee/i], "calm"), LOOK.classic, { hook: true })];
    k.v.features.slice(0, 4).forEach((f) => scenes.push(screenSlide(k, `${featureNoun(f)}: ${benefitLine(f)}`, screenFor(k.screens, f, k.used))));
    scenes.push(photoSlide(k, "ok be honest… rate it 1–10 👇", k.pool.take([/laugh|dinner|popcorn/i], "calm"), LOOK.classic, { sub: `(it's all in ${k.app})` }));
    return spec(k, this, scenes, { caption: `be nice 😭 (${productLine(k.p)})` });
  },
});

C.push({
  ...base,
  id: "pinterest-tips",
  name: "Pinterest-aesthetic tips",
  tagline: "Calm serif headline, cozy photos, one small idea per slide; the app is one of the ideas.",
  status: "steady",
  why: "The Pinterest-grade tips list (Opal 444K's Playfair list, Lense): pretty photos and quiet italic serif text make it saveable; the app is one tip among real ones, shown on a phone in a real scene.",
  beats: ["1: cozy photo + italic serif headline", "2–5: one idea per slide, small serif text low on the photo", "The app idea: real screen", "Last: soft CTA"],
  captionStyle: "serif-white",
  hooks: formatHooks("pinterest-tips"),
  build(ctx) {
    const k = makeKit(ctx, this.id);
    const tips = k.kit.tips.slice(2, 5).length >= 3 ? k.kit.tips.slice(2, 5) : k.kit.tips.slice(0, 3);
    const hook = cleanHook(ctx.hook);
    const words = hook.split(" ");
    const cut = Math.max(2, Math.min(words.length - 1, Math.ceil(words.length / 2)));
    const scenes: SceneInput[] = [photoSlide(k, `*${words.slice(0, cut).join(" ")}*\n${words.slice(cut).join(" ")}`, k.pool.take([/coffee|calm|couch/i], "calm"), { ...LOOK.serifWhite, y: 0.3 }, { hook: true })];
    const low = { ...LOOK.serifWhite, y: 0.66, size: 0.046 };
    tips.forEach((t, i) => scenes.push(photoSlide(k, `${i + 1}. ${t}`, k.pool.take([], "calm"), low)));
    const f = k.v.features.find((x) => /list|chore|meal|grocer/i.test(x.name)) ?? k.v.features[0];
    scenes.push(screenSlide(k, `${tips.length + 1}. ${benefitLine(f)}`, screenFor(k.screens, f, k.used), { look: LOOK.serifBox, y: 0.5 }));
    scenes.push(photoSlide(k, `*the app:* ${k.app}`, k.pool.take([PHONE], "phone"), low, { sub: "linked in my bio 🤍", subY: 0.75, subStyle: "serif-white" }));
    return spec(k, this, scenes, { title: hook });
  },
});

C.push({
  ...base,
  id: "what-id-do",
  name: "“What I'd do if I were starting over”",
  tagline: "A step-by-step plan in calm TikTok text over moody photos; one step is the app.",
  status: "steady",
  why: "‘What I'd do if…’ is advice framed as hindsight, so it reads as experience, not a pitch. Each step is a slide; the app is the step that holds the rest together, with its real screen right after.",
  beats: ["1: photo + hook", "2–4: step 1…3 (real advice)", "5: the step that's the app + raw screen", "6: soft CTA"],
  captionStyle: "tiktok-plain",
  hooks: formatHooks("what-id-do"),
  build(ctx) {
    const k = makeKit(ctx, this.id);
    const steps = k.kit.tips.slice(0, 3);
    const scenes: SceneInput[] = [photoSlide(k, cleanHook(ctx.hook), k.pool.take([/coffee|sleepy|calm/i], "calm"), LOOK.classic, { hook: true })];
    steps.forEach((t, i) => scenes.push(photoSlide(k, `step ${i + 1}:\n${t}`, k.pool.take([], undefined), LOOK.plain)));
    scenes.push(photoSlide(k, `step ${steps.length + 1}:\nput all of it in one app the whole family can see`.replace("the whole family", packFor(k.p)?.id === "family" ? "the whole family" : "everyone"), k.pool.take([PHONE], "phone"), LOOK.plain));
    const f = k.v.features[0];
    scenes.push(screenSlide(k, benefitLine(f), heroScreen(k.screens, k.used), { sub: `(I use ${k.app})` }));
    return spec(k, this, scenes);
  },
});

C.push({
  ...base,
  id: "mistakes-list",
  name: "“N mistakes I made”",
  tagline: "Numbered confessions over real photos, then what fixed it: the app's real screen.",
  status: "steady",
  why: "Mistake lists are confession + list in one: the viewer recognises themselves in each slide (comments: ‘number 2 is me’), and the fix is the payoff. The number in the hook is exactly the number of mistakes shown.",
  beats: ["1: hook over a stressed moment", "2–5: mistake 1…N", "6: “what fixed it:” + raw screen", "7: the after + soft CTA"],
  captionStyle: "tiktok-classic",
  hooks: formatHooks("mistakes-list"),
  build(ctx) {
    const k = makeKit(ctx, this.id);
    const ms = k.kit.mistakes.slice(0, listCount(this.id, k.p) ?? 4);
    const scenes: SceneInput[] = [photoSlide(k, cleanHook(ctx.hook).replace(/\{number\}/g, String(ms.length)), k.pool.take([/overwhelm|frustrat/i], "stress"), LOOK.classic, { hook: true })];
    ms.forEach((m, i) => scenes.push(photoSlide(k, `mistake #${i + 1}:\n${m}`, k.pool.take([], "stress"), LOOK.classic)));
    const f = k.v.features.find((x) => /assist|calendar/i.test(x.name)) ?? k.v.features[0];
    scenes.push(screenSlide(k, `what fixed it: ${benefitLine(f)}`, screenFor(k.screens, f, k.used)));
    const win = k.slots.win[0] ?? `I finally ${k.v.outcome}`;
    scenes.push(photoSlide(k, win, k.pool.take([], "calm"), LOOK.classic, { sub: `the app is ${k.app}` }));
    return spec(k, this, scenes, { caption: `number 2 was me for YEARS 😭 (${productLine(k.p)})` });
  },
});

C.push({
  ...base,
  id: "hot-take",
  name: "Unpopular opinion",
  tagline: "A hot take in a white box, the why, and what actually works (the app), in 4 slides.",
  status: "steady",
  why: "Contrarian hooks earn comments (people argue), and comments push the post. The opinion is one the niche already half-believes; the app is the ‘what works instead’, shown for real.",
  beats: ["1: “unpopular opinion:” in a white box over a photo", "2: why (the pain, first person)", "3: what works instead: raw screen", "4: the after + soft CTA"],
  captionStyle: "tiktok-box",
  lengthSec: [9, 13],
  hooks: formatHooks("hot-take"),
  build(ctx) {
    const k = makeKit(ctx, this.id);
    const hook = cleanHook(ctx.hook).replace(/^(unpopular opinion|hot take):\s*/i, (m) => `${m.trim()}\n`);
    const scenes: SceneInput[] = [photoSlide(k, hook, k.pool.take([k.kit.oldPhoto, /overwhelm/i], "stress"), { ...LOOK.box, y: 0.42 }, { hook: true })];
    const why = k.slots.painMe.slice(0, 2);
    scenes.push(photoSlide(k, why.length ? `${why.join(".\n")}.` : k.v.pain, k.pool.take([], "stress"), LOOK.classic));
    const f = k.v.features.find((x) => /remind|calendar|assist/i.test(x.name)) ?? k.v.features[0];
    scenes.push(screenSlide(k, `what actually works: ${benefitLine(f)}`, screenFor(k.screens, f, k.used)));
    const win = k.slots.win[0] ?? `I finally ${k.v.outcome}`;
    scenes.push(photoSlide(k, win, k.pool.take([], "calm"), LOOK.classic, { sub: `(${k.app}, ${ctaTail(k.p).replace(/^it's\s+/i, "")})` }));
    return spec(k, this, scenes, { caption: `agree or disagree? 👇 (${productLine(k.p)})` });
  },
});

export const CAROUSELS: FormatDef[] = C;
export const CAROUSEL_IDS = new Set(C.map((f) => f.id));

/** For tests/lab: which slides of a carousel spec still wait for an AI photo. */
export function pendingAi(scenes: SceneInput[]): number {
  return scenes.filter((s) => s.type === "slide" && (s as { ai?: { file?: string } }).ai && !(s as { ai?: { file?: string } }).ai?.file).length;
}

