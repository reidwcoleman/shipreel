/**
 * The Shipreel video spec: one JSON document describes a whole short-form video or slideshow.
 *
 * Humans edit it in the Studio, Claude/Codex write it from the framework docs, and Remotion renders
 * it. Keep every field JSON-serialisable and every default sensible: an agent should be able to
 * write a minimal spec (just scenes with text) and get a good-looking video.
 *
 * Imported by the Remotion bundle, so: relative imports only, no Node APIs.
 */
import { z } from "zod";

export const FPS = 30;

export const ASPECTS = ["9:16", "3:4", "4:5", "1:1", "16:9"] as const;
export const Aspect = z.enum(ASPECTS);
export type Aspect = z.infer<typeof Aspect>;

export const DIMENSIONS: Record<Aspect, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "3:4": { width: 1080, height: 1440 },
  "4:5": { width: 1080, height: 1350 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

export const FONT_IDS = [
  "tiktok-sans",
  "inter",
  "montserrat",
  "poppins",
  "anton",
  "bebas",
  "archivo-black",
  "bricolage",
  "geist",
  "geist-mono",
  "jetbrains-mono",
  "instrument-serif",
  "dm-serif",
  "caveat",
  "permanent-marker",
  "luckiest-guy",
  "cormorant",
  "playfair",
  "arimo",
] as const;
export const FontId = z.enum(FONT_IDS);
export type FontId = z.infer<typeof FontId>;

/** Caption looks people recognise from the feed. See src/remotion/ui/text.tsx for the exact recipes. */
export const CAPTION_STYLES = [
  "tiktok-classic", // white, semibold, soft black shadow: TikTok's default text
  "tiktok-box", // black text on white rounded boxes, line by line
  "tiktok-box-dark", // white text on black boxes
  "hormozi", // heavy uppercase, active word highlighted, word-by-word
  "outline", // fat black stroke, white fill (meme / MrBeast energy)
  "minimal", // clean sentence case, no stroke
  "neon", // glowing accent
  "typewriter", // monospace, typed on
  "serif", // editorial serif, italic emphasis
  "headline", // persistent red headline box, heavy caps (founder split-screen seam)
  "snapchat", // full-width translucent black bar, small white text (the "my roommate showed me this" look)
  "tiktok-plain", // TikTok Classic with no outline, soft shadow (calm lists over moody photos); color sets yellow/pink variants
  "tiktok-heavy", // script-made slideshow text: Arial Bold, thick black outline (Snugly / Larry carousels)
  "serif-box", // Cormorant serif, black, in stacked per-line white boxes (aesthetic tips carousels)
  "serif-white", // Playfair Display, white, no box; *italic* emphasis (editorial lists)
] as const;
export const CaptionStyleId = z.enum(CAPTION_STYLES);
export type CaptionStyleId = z.infer<typeof CaptionStyleId>;

export const TEXT_ANIMATIONS = ["none", "pop", "slide-up", "fade", "words", "typewriter", "slam"] as const;
export const TextAnimation = z.enum(TEXT_ANIMATIONS);

export const TEXT_POSITIONS = ["top", "upper", "center", "low", "lower", "bottom"] as const;
export const TextPosition = z.enum(TEXT_POSITIONS);

/** How a piece of on-screen text looks. Every field is optional; the theme fills the gaps. */
export const TextStyle = z.object({
  style: CaptionStyleId.optional(),
  font: FontId.optional(),
  /** Font size as a fraction of frame width (0.065 ≈ 70px on a 1080-wide frame). */
  size: z.number().min(0.02).max(0.3).optional(),
  color: z.string().optional(),
  /** Colour for words wrapped in *asterisks*. Defaults to the theme accent. */
  highlight: z.string().optional(),
  position: TextPosition.optional(),
  /** Exact vertical centre (0–1 of frame height); wins over `position`. Set by the render-time fit pass. */
  y: z.number().min(0.05).max(0.95).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  animation: TextAnimation.optional(),
});
export type TextStyle = z.infer<typeof TextStyle>;

/** A media reference: `asset:<file>` (project asset), `sfx:<id>`, `music:<id>` or an http(s) URL. */
export const MediaSrc = z.string().min(1);

export const Background = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("solid"), color: z.string() }),
  z.object({
    kind: z.literal("gradient"),
    from: z.string(),
    to: z.string(),
    angle: z.number().default(160),
  }),
  /** Slowly drifting blurred colour blobs. Looks expensive, costs nothing. */
  z.object({ kind: z.literal("mesh"), colors: z.array(z.string()).min(2).max(5) }),
  z.object({
    kind: z.literal("media"),
    src: MediaSrc,
    /** 0 = untouched, 1 = black. Keeps text readable over busy footage. */
    dim: z.number().min(0).max(1).default(0.25),
    blur: z.number().min(0).max(60).default(0),
    /** Slow push-in (Ken Burns). */
    kenBurns: z.boolean().default(true),
    /** Loop a video background every N seconds (its length), for scenes longer than the clip. */
    loopSec: z.number().min(0.5).optional(),
  }),
]);
export type Background = z.infer<typeof Background>;

/** punch = hard cut that lands with a quick zoom settle; flash = cut through a white flash. Neither overlaps. */
export const TRANSITIONS = ["cut", "punch", "flash", "fade", "slide-up", "slide-left", "zoom", "whip"] as const;
export const Transition = z.enum(TRANSITIONS);
export type Transition = z.infer<typeof Transition>;

export const SFX_IDS = ["whoosh", "pop", "click", "ding", "swoosh", "boom", "keyboard", "notification", "shutter", "rise"] as const;
export const SfxId = z.enum(SFX_IDS);
export type SfxId = z.infer<typeof SfxId>;

/** hand = the screen composited into stock footage of a real hand holding a phone (see public/hands). */
export const DEVICE_FRAMES = ["none", "iphone", "browser", "floating", "hand"] as const;

/** A punch-in on a screen recording: at `at` seconds, zoom to `scale` centred on (x, y) for `hold` seconds. */
export const Zoom = z.object({
  at: z.number().min(0),
  scale: z.number().min(1).max(4).default(1.8),
  x: z.number().min(0).max(1).default(0.5),
  y: z.number().min(0).max(1).default(0.5),
  hold: z.number().min(0.2).default(1.2),
});
export type Zoom = z.infer<typeof Zoom>;

/** A finger tap on the screen at `at` seconds (normalized x/y of the screen): a touch ripple + click. */
export const Tap = z.object({
  at: z.number().min(0),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});
export type Tap = z.infer<typeof Tap>;

/**
 * A piece of the screen (normalized rect) lifts out of the phone toward the camera, scaled up with a
 * deep shadow while the rest dims: the "exploded UI" feature highlight from polished app promos.
 */
export const Callout = z.object({
  at: z.number().min(0),
  hold: z.number().min(0.3).default(1.4),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0.05).max(1),
  h: z.number().min(0.02).max(1),
  /** How wide the lifted card gets, as a fraction of the frame width. */
  size: z.number().min(0.4).max(1).default(0.9),
});
export type Callout = z.infer<typeof Callout>;

/**
 * One step of a screen flow: inside the same device, the app moves to another screen at `at` seconds
 * (after an optional tap), the way a real screen recording of someone using the app looks.
 */
export const FlowStep = z.object({
  at: z.number().min(0),
  src: MediaSrc,
  kind: z.enum(["video", "image"]).default("image"),
  /** Where the finger taps (0–1 of the screen) just before the change. */
  tap: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).optional(),
  /** push = iOS navigation push, sheet = modal from the bottom, tab = instant (tab bar), fade. */
  transition: z.enum(["push", "sheet", "tab", "fade"]).default("push"),
  /** Scroll the screen up by this fraction of its height over the step (tall screenshots / recordings). */
  scroll: z.number().min(0).max(0.9).default(0),
});
export type FlowStep = z.infer<typeof FlowStep>;

/** A caption line that replaces the previous one at `at` seconds (TikTok text swapped on each beat). */
export const CaptionLine = z.object({ at: z.number().min(0), text: z.string() });

const sceneBase = {
  id: z.string().min(1),
  /** Seconds on screen (before any transition overlap). */
  duration: z.number().min(0.3).max(120),
  /** How this scene enters (overlaps the end of the previous scene). */
  transition: Transition.default("cut"),
  /** Sound effect fired when the scene starts. */
  sfx: SfxId.optional(),
  /** Free-form note for humans/agents (e.g. "beat drop lands here"). Not rendered. */
  note: z.string().optional(),
};

const Caption = z.object({ text: z.string(), style: TextStyle.optional() });

export const HookScene = z.object({
  ...sceneBase,
  type: z.literal("hook"),
  /** Main line. Wrap words in *asterisks* to highlight them; use \n for line breaks. */
  text: z.string(),
  sub: z.string().optional(),
  textStyle: TextStyle.optional(),
  background: Background.optional(),
  /** A big emoji or symbol above the text (video content, not UI). */
  emoji: z.string().optional(),
  /** An app screen shown in a phone under the hook, so the opener is never just text on a colour. */
  image: MediaSrc.optional(),
});

export const MediaScene = z.object({
  ...sceneBase,
  type: z.literal("media"),
  src: MediaSrc,
  kind: z.enum(["video", "image"]).default("video"),
  /** Seconds to skip at the start of a video file. */
  trimStart: z.number().min(0).default(0),
  playbackRate: z.number().min(0.25).max(4).default(1),
  volume: z.number().min(0).max(1).default(0),
  fit: z.enum(["cover", "contain"]).default("cover"),
  device: z.enum(DEVICE_FRAMES).default("none"),
  /** Full-bleed crop anchor. top keeps the status bar of a raw screen recording (the bottom sits under TikTok's UI anyway). */
  anchor: z.enum(["center", "top"]).default("center"),
  /** Slow push-in over the scene for full-bleed footage (1 = none; 1.03–1.05 for b-roll). Never on raw UI. */
  push: z.number().min(1).max(1.3).default(1),
  /** Which hand clip to use with device "hand" (id from public/hands/library.json); first one if omitted. */
  hand: z.string().optional(),
  zooms: z.array(Zoom).default([]),
  taps: z.array(Tap).default([]),
  callouts: z.array(Callout).default([]),
  /** Later screens in the same take (see FlowStep). The scene's own src is the first screen. */
  flow: z.array(FlowStep).default([]),
  /** Caption lines swapped over time; the first one shows from 0 (overrides caption.text). */
  lines: z.array(CaptionLine).default([]),
  /** Media width ÷ height (e.g. 0.46 for an iPhone recording). Lets taps/callouts land exactly on full-bleed footage. */
  aspect: z.number().min(0.2).max(4).optional(),
  caption: Caption.optional(),
  background: Background.optional(),
});

export const ChatMessage = z.object({
  from: z.enum(["me", "them"]),
  text: z.string(),
  /** Seconds after scene start. Omit to auto-space messages across the scene. */
  at: z.number().min(0).optional(),
  /** Optional image attachment (asset:… or URL). */
  image: MediaSrc.optional(),
  /** Sender name in a group chat ("Mom", "Jake"): shown above their bubbles with an avatar. */
  name: z.string().optional(),
});

/**
 * The app as the story's helper (the Rizz text-story plug): at `at` seconds a panel with the app's
 * name replaces the chat card while its suggestion is read out, then the suggestion is sent as a bubble.
 */
export const ChatAssist = z.object({
  at: z.number().min(0),
  /** With spoken chats: the panel comes in right after this message (index); timing is then generated. */
  after: z.number().int().min(0).optional(),
  hold: z.number().min(1).default(3.5),
  app: z.string(),
  icon: MediaSrc.optional(),
  /** The divider line, e.g. "👇 Foxy suggests 👇". */
  label: z.string().optional(),
  suggestion: z.string(),
});

export const ChatScene = z.object({
  ...sceneBase,
  type: z.literal("chat"),
  app: z.enum(["imessage", "whatsapp", "instagram", "discord"]).default("imessage"),
  theme: z.enum(["light", "dark"]).default("light"),
  /** screen = the whole frame is the phone's chat; card = a floating chat card over background footage (text-story pages). */
  layout: z.enum(["screen", "card"]).default("screen"),
  background: Background.optional(),
  /** Read every message aloud (two system voices); Shipreel fills `voice` and each message's `at`. */
  speak: z.boolean().default(false),
  voices: z.object({ me: z.string().default("Samantha"), them: z.string().default("Daniel") }).default({ me: "Samantha", them: "Daniel" }),
  /** The spoken track (generated), and a key of what it was generated from. */
  voice: MediaSrc.optional(),
  voiceKey: z.string().optional(),
  assist: ChatAssist.optional(),
  /** The contact, or the group's name when messages carry sender names ("Family 🏠"). */
  contact: z.string().default("Sam"),
  /** Bubble scale (1.5 = the zoomed screen-recording look; ~1.1 fits a whole thread in one screenshot). */
  zoom: z.number().min(0.8).max(2).optional(),
  messages: z.array(ChatMessage).min(1),
  caption: Caption.optional(),
});

export const NotesScene = z.object({
  ...sceneBase,
  type: z.literal("notes"),
  title: z.string(),
  items: z.array(z.string()).min(1),
  checklist: z.boolean().default(false),
  theme: z.enum(["light", "dark"]).default("light"),
  caption: Caption.optional(),
});

export const TweetScene = z.object({
  ...sceneBase,
  type: z.literal("tweet"),
  name: z.string(),
  handle: z.string(),
  avatar: MediaSrc.optional(),
  verified: z.boolean().default(false),
  text: z.string(),
  image: MediaSrc.optional(),
  /** Engagement counts show only when set. Never invent them for a post that claims to be real. */
  replies: z.string().optional(),
  reposts: z.string().optional(),
  likes: z.string().optional(),
  views: z.string().optional(),
  theme: z.enum(["light", "dark"]).default("dark"),
  background: Background.optional(),
  caption: Caption.optional(),
});

export const RedditScene = z.object({
  ...sceneBase,
  type: z.literal("reddit"),
  subreddit: z.string(),
  user: z.string(),
  title: z.string(),
  body: z.string().optional(),
  /** Shown only when set (otherwise "Vote" and a bare comment icon, like a fresh post). */
  upvotes: z.string().optional(),
  comments: z.string().optional(),
  theme: z.enum(["light", "dark"]).default("light"),
  background: Background.optional(),
  caption: Caption.optional(),
});

/** TikTok's "Reply to @user's comment" sticker over a background or clip. */
export const CommentScene = z.object({
  ...sceneBase,
  type: z.literal("comment"),
  username: z.string(),
  text: z.string(),
  avatar: MediaSrc.optional(),
  background: Background.optional(),
  caption: Caption.optional(),
});

export const ListScene = z.object({
  ...sceneBase,
  type: z.literal("list"),
  title: z.string(),
  items: z.array(z.object({ text: z.string(), sub: z.string().optional() })).min(1),
  numbered: z.boolean().default(true),
  /** Index of the item that gets the spotlight (usually your app). */
  highlight: z.number().int().min(0).optional(),
  background: Background.optional(),
  textStyle: TextStyle.optional(),
});

export const StatScene = z.object({
  ...sceneBase,
  type: z.literal("stat"),
  from: z.number().default(0),
  to: z.number(),
  decimals: z.number().int().min(0).max(2).default(0),
  prefix: z.string().default(""),
  suffix: z.string().default(""),
  label: z.string(),
  sub: z.string().optional(),
  /** Draw a rising line chart under the number. */
  chart: z.boolean().default(true),
  background: Background.optional(),
});

export const SplitSide = z.object({
  label: z.string().default(""),
  text: z.string().optional(),
  src: MediaSrc.optional(),
  kind: z.enum(["video", "image"]).default("image"),
  tone: z.enum(["bad", "good", "neutral"]).default("neutral"),
  /** Show a screen recording inside an iPhone instead of full-bleed. */
  device: z.enum(["none", "iphone"]).default("none"),
  volume: z.number().min(0).max(1).default(0),
});

/**
 * Two stacked panels. ratio = share of the top panel: 0.5 for before/after, ~0.66 for the founder
 * split (screen on top, face cam below, caption on the seam).
 */
export const SplitScene = z.object({
  ...sceneBase,
  type: z.literal("split"),
  top: SplitSide,
  bottom: SplitSide,
  ratio: z.number().min(0.25).max(0.75).default(0.5),
  /** Bottom panel appears after this fraction of the scene (0 = together). */
  stagger: z.number().min(0).max(0.9).default(0.38),
  caption: Caption.optional(),
});

export const CtaScene = z.object({
  ...sceneBase,
  type: z.literal("cta"),
  appName: z.string(),
  icon: MediaSrc.optional(),
  headline: z.string(),
  sub: z.string().optional(),
  action: z.enum(["link-in-bio", "app-store", "google-play", "search", "url", "comment"]).default("link-in-bio"),
  url: z.string().optional(),
  background: Background.optional(),
});

/**
 * An AI photo for a carousel slide (opt-in, Settings → AI images). `prompt` is this slide's moment;
 * `look` is the locked description shared by every slide of the carousel (same person, home, light),
 * so the set reads like one camera roll. Until it's generated the slide shows its fallback `image`.
 */
export const SlideAi = z.object({
  prompt: z.string(),
  look: z.string().default(""),
  /** Same seed across a carousel keeps the subject consistent. */
  seed: z.number().int().optional(),
  /** The cached file once generated (asset:…); the slide's image is set to it too. */
  file: MediaSrc.optional(),
});
export type SlideAi = z.infer<typeof SlideAi>;

/** One frame of a TikTok/Instagram photo carousel. Also plays as a ~2.5s beat in video mode. */
export const SlideScene = z.object({
  ...sceneBase,
  type: z.literal("slide"),
  text: z.string(),
  image: MediaSrc.optional(),
  /**
   * photo = full-bleed image under the text; phone = text on top, the image (an app screen) in a phone below;
   * screenshot = a raw app screenshot at its native 9:16 (the carousel still keeps that size; videos letterbox it);
   * app = an app-stack tile: the photo, softly dimmed, with a big iOS icon (`icon` or `glyph`), `title` and the text.
   */
  layout: z.enum(["photo", "phone", "screenshot", "app"]).default("photo"),
  /** Small second text block (TikTok's second text box): a punchline, a "this is the app" line. */
  sub: z.string().optional(),
  /** Where `sub` sits (0–1 of the frame height). Defaults to under the main text. */
  subY: z.number().min(0.05).max(0.95).optional(),
  /** Darken the photo under the text (0–0.5): the 20–30% overlay the slideshow tools use on bright photos. */
  shade: z.number().min(0).max(0.6).optional(),
  /** The second box's look (default TikTok's white box; the black box over light app screens). */
  subStyle: CaptionStyleId.optional(),
  /** A small byline on every slide of an app-output list ("@famsync"), top of the frame. */
  byline: z.string().optional(),
  /** app layout: the tile's title, its icon (asset) or an emoji glyph when it isn't a real app. */
  title: z.string().optional(),
  icon: MediaSrc.optional(),
  glyph: z.string().optional(),
  ai: SlideAi.optional(),
  background: Background.optional(),
  textStyle: TextStyle.optional(),
});

/** Big words, one beat at a time. */
export const KineticScene = z.object({
  ...sceneBase,
  type: z.literal("kinetic"),
  words: z.array(z.string()).min(1),
  background: Background.optional(),
  textStyle: TextStyle.optional(),
});

export const NotificationItem = z.object({
  app: z.string().default("Stripe"),
  title: z.string(),
  body: z.string(),
  time: z.string().default("now"),
  color: z.string().optional(),
  glyph: z.string().optional(),
});

/** iOS lock screen filling up with notifications ("you received a payment…"). */
export const NotificationsScene = z.object({
  ...sceneBase,
  type: z.literal("notifications"),
  items: z.array(NotificationItem).min(1),
  background: Background.optional(),
  caption: Caption.optional(),
});

export const TerminalLine = z.object({
  kind: z.enum(["input", "output", "success", "dim"]).default("output"),
  text: z.string(),
});

/** A coding-agent terminal: perfect for "I asked Claude to build…" content. */
export const TerminalScene = z.object({
  ...sceneBase,
  type: z.literal("terminal"),
  title: z.string().default("~/my-app"),
  agent: z.enum(["claude", "codex", "shell"]).default("claude"),
  lines: z.array(TerminalLine).min(1),
  caption: Caption.optional(),
  background: Background.optional(),
});

export const AppStoreScene = z.object({
  ...sceneBase,
  type: z.literal("appstore"),
  appName: z.string(),
  subtitle: z.string(),
  icon: MediaSrc.optional(),
  /** Star rating, rating count and chart rank show only when set, and only from the brief's real proof. */
  rating: z.number().min(0).max(5).optional(),
  ratings: z.string().optional(),
  chart: z.string().optional(),
  category: z.string().default("Productivity"),
  screenshots: z.array(MediaSrc).default([]),
  caption: Caption.optional(),
  background: Background.optional(),
});

export const Scene = z.discriminatedUnion("type", [
  HookScene,
  MediaScene,
  ChatScene,
  NotesScene,
  TweetScene,
  RedditScene,
  CommentScene,
  ListScene,
  StatScene,
  SplitScene,
  CtaScene,
  SlideScene,
  KineticScene,
  NotificationsScene,
  TerminalScene,
  AppStoreScene,
]);
export type Scene = z.infer<typeof Scene>;
export type SceneInput = z.input<typeof Scene>;
export type SceneType = Scene["type"];

/** Absolutely-timed layers over the scenes. */
export const Overlay = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("text"),
    start: z.number().min(0),
    end: z.number().min(0),
    text: z.string(),
    textStyle: TextStyle.optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("progress"),
    start: z.number().min(0).default(0),
    end: z.number().min(0),
    color: z.string().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("watermark"),
    start: z.number().min(0).default(0),
    end: z.number().min(0),
    text: z.string(),
    corner: z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]).default("top-left"),
  }),
  /** Face cam (or any clip) in a corner: turns any scene into a green-screen-style reaction. */
  z.object({
    id: z.string(),
    type: z.literal("pip"),
    start: z.number().min(0).default(0),
    end: z.number().min(0),
    src: MediaSrc,
    kind: z.enum(["video", "image"]).default("video"),
    shape: z.enum(["circle", "rounded"]).default("rounded"),
    corner: z.enum(["bottom-left", "bottom-right", "bottom-center"]).default("bottom-left"),
    size: z.number().min(0.15).max(0.7).default(0.42),
    volume: z.number().min(0).max(1).default(1),
    trimStart: z.number().min(0).default(0),
  }),
  z.object({
    id: z.string(),
    type: z.literal("sticker"),
    start: z.number().min(0),
    end: z.number().min(0),
    emoji: z.string(),
    x: z.number().min(0).max(1).default(0.8),
    y: z.number().min(0).max(1).default(0.3),
    size: z.number().min(0.03).max(0.5).default(0.14),
  }),
]);
export type Overlay = z.infer<typeof Overlay>;

export const CaptionWord = z.object({ text: z.string(), start: z.number(), end: z.number() });
export type CaptionWord = z.infer<typeof CaptionWord>;

/** Word-timed captions (usually from a voiceover). */
export const Captions = z.object({
  words: z.array(CaptionWord),
  style: CaptionStyleId.default("hormozi"),
  position: TextPosition.default("lower"),
  /** Words shown together. 1 = one word at a time. */
  wordsPerPage: z.number().int().min(1).max(8).default(3),
});

export const AudioTrack = z.object({
  /** asset:<file>, music:<id> (built-in bed) or URL. Omit to post silently and add a trending sound in-app. */
  src: MediaSrc.optional(),
  title: z.string().optional(),
  /** Id from the trending sounds library this video is designed for (shown to the poster). */
  soundId: z.string().optional(),
  volume: z.number().min(0).max(1).default(0.7),
  /** Seconds into the track to start from (line the drop up with your reveal). */
  startFrom: z.number().min(0).default(0),
  fadeOut: z.boolean().default(true),
});

export const Voiceover = z.object({
  src: MediaSrc,
  text: z.string().optional(),
  voice: z.string().optional(),
  volume: z.number().min(0).max(1).default(1),
});

export const Theme = z.object({
  font: FontId.default("tiktok-sans"),
  captionStyle: CaptionStyleId.default("tiktok-classic"),
  bg: z.string().default("#0B0B0F"),
  fg: z.string().default("#FFFFFF"),
  accent: z.string().default("#D7FF3A"),
  /** Subtle film grain on top of everything. */
  grain: z.boolean().default(true),
  /** Automatic sound effects (message pops, notification dings, transition whooshes). */
  sfx: z.boolean().default(true),
});
export type Theme = z.infer<typeof Theme>;

export const PLATFORMS = ["tiktok", "instagram", "youtube", "x", "linkedin", "threads", "bluesky", "facebook", "pinterest"] as const;
export const Platform = z.enum(PLATFORMS);
export type Platform = z.infer<typeof Platform>;

export const Meta = z.object({
  hook: z.string().default(""),
  /** Default post caption (platform overrides in `captions`). */
  caption: z.string().default(""),
  hashtags: z.array(z.string()).default([]),
  captions: z.partialRecord(Platform, z.string()).default({}),
  /** What sound to add if posting as a draft (e.g. a trending audio). */
  soundTip: z.string().optional(),
  notes: z.string().optional(),
});

export const VideoSpec = z.object({
  id: z.string(),
  version: z.literal(1).default(1),
  title: z.string().default("Untitled reel"),
  formatId: z.string().default("custom"),
  kind: z.enum(["video", "slideshow"]).default("video"),
  aspect: Aspect.default("9:16"),
  theme: Theme.default(Theme.parse({})),
  scenes: z.array(Scene).min(1),
  overlays: z.array(Overlay).default([]),
  captions: Captions.optional(),
  audio: AudioTrack.optional(),
  voiceover: Voiceover.optional(),
  meta: Meta.default(Meta.parse({})),
  ideaId: z.string().optional(),
});
export type VideoSpec = z.infer<typeof VideoSpec>;
export type VideoSpecInput = z.input<typeof VideoSpec>;

/** Parse anything an agent or the editor produced into a complete spec (throws on invalid input). */
export function normalizeSpec(input: unknown): VideoSpec {
  return VideoSpec.parse(input);
}

export function safeNormalizeSpec(input: unknown):
  | { ok: true; spec: VideoSpec }
  | { ok: false; errors: string[] } {
  const r = VideoSpec.safeParse(input);
  if (r.success) return { ok: true, spec: r.data };
  return {
    ok: false,
    errors: r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
  };
}

/** Props passed to the Remotion composition. */
export type CompositionProps = {
  spec: VideoSpec;
  /** Base URL that `asset:` sources resolve against, e.g. http://localhost:4747/api/media/my-app */
  assetBase: string;
  /** Base URL for bundled files in /public (sfx, music). Empty string = same origin. */
  publicBase?: string;
};

export const SCENE_LABELS: Record<SceneType, string> = {
  hook: "Hook",
  media: "Clip",
  chat: "Text chat",
  notes: "Notes",
  tweet: "Tweet",
  reddit: "Reddit post",
  comment: "Comment reply",
  list: "List",
  stat: "Big number",
  split: "Before / after",
  cta: "Call to action",
  slide: "Slide",
  kinetic: "Kinetic words",
  notifications: "Notifications",
  terminal: "Terminal",
  appstore: "App Store card",
};
