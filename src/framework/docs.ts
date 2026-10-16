/**
 * The Shipreel framework, written for agents. The server writes this to workspace/FRAMEWORK.md
 * (plus CLAUDE.md / AGENTS.md pointers) so Claude Code and Codex know how to produce valid videos.
 */
import { CAPTION_STYLES, FONT_IDS, SFX_IDS, TRANSITIONS } from "@/remotion/spec";
import { FORMATS } from "./formats";

export const SPEC_REFERENCE = `
## VideoSpec (JSON)

A video is one JSON document. Scenes play in order; overlays are absolutely timed on top.
Times are in seconds. Text supports *asterisks* to highlight words in the accent colour and \\n for line breaks.
Media references: "asset:<file>" (a file in the project's assets/ folder), "sfx:<id>", or an https URL.

\`\`\`ts
type VideoSpec = {
  id: string;                       // keep the id you were given
  title: string;
  formatId: string;                 // one of the format ids below, or "custom"
  kind?: "video" | "slideshow";     // slideshow = TikTok/IG photo carousel (each scene becomes one image)
  aspect?: "9:16" | "4:5" | "1:1" | "16:9";   // default 9:16 (1080×1920)
  theme?: { font?: FontId; captionStyle?: CaptionStyle; accent?: "#hex"; bg?: "#hex"; fg?: "#hex"; grain?: boolean; sfx?: boolean };
  scenes: Scene[];                  // ≥ 1
  overlays?: Overlay[];
  captions?: { words: { text: string; start: number; end: number }[]; style?: CaptionStyle; position?: Position; wordsPerPage?: number };
  audio?: { src?: string; soundId?: string; title?: string; volume?: number; startFrom?: number; fadeOut?: boolean };  // src "music:<id>" = built-in royalty-free bed (public/music/library.json); formats pick one and cut on its beats
  meta?: { hook: string; caption: string; hashtags: string[]; captions?: Partial<Record<Platform, string>>; soundTip?: string; notes?: string };
};

// Every scene has: { id: string; type; duration: number (s); transition?: Transition; sfx?: SfxId; note?: string }
type Scene =
  | { type: "hook"; text: string; sub?: string; emoji?: string; image?: string; textStyle?: TextStyle; background?: Background }  // image = an app screen shown in a phone under the hook (use it: openers should show the product)
  | { type: "media"; src: string; kind?: "video" | "image"; trimStart?: number; playbackRate?: number; volume?: number;
      fit?: "cover" | "contain"; device?: "none" | "iphone" | "browser" | "floating";
      zooms?: { at: number; scale: number; x: number; y: number; hold: number }[];   // punch-ins, x/y 0–1 focus point
      taps?: { at: number; x: number; y: number }[];        // touch ripples (+ click sound) where the finger hits, x/y 0–1 of the screen
      callouts?: { at: number; hold?: number; x: number; y: number; w: number; h: number; size?: number }[];  // a rect of the screen (0–1) lifts out of the phone as a big card: the "exploded UI" feature highlight. Look at the screenshot to get the rect of one card/row/button.
      aspect?: number;                                       // media width/height (asset metadata); needed for taps/callouts on full-bleed footage
      caption?: { text: string; style?: TextStyle }; background?: Background }
  | { type: "chat"; app?: "imessage" | "whatsapp" | "instagram" | "discord"; theme?: "light" | "dark"; contact?: string;
      messages: { from: "me" | "them"; text: string; at?: number; image?: string; name?: string }[]; caption?: Caption }   // name = sender in a group chat (contact = group name, e.g. "Family 🏠")
  | { type: "notes"; title: string; items: string[]; checklist?: boolean; theme?: "light" | "dark"; caption?: Caption }
  | { type: "tweet"; name: string; handle: string; text: string; verified?: boolean; image?: string; replies?: string; reposts?: string; likes?: string; views?: string; theme?: "light" | "dark"; caption?: Caption }
  | { type: "reddit"; subreddit: string; user: string; title: string; body?: string; upvotes?: string; comments?: string; caption?: Caption }
  | { type: "comment"; username: string; text: string; background?: Background; caption?: Caption }   // TikTok "Reply to @x's comment" sticker
  | { type: "list"; title: string; items: { text: string; sub?: string }[]; numbered?: boolean; highlight?: number; background?: Background }
  | { type: "stat"; to: number; from?: number; prefix?: string; suffix?: string; decimals?: number; label: string; sub?: string; chart?: boolean }
  | { type: "split"; top: Side; bottom: Side; caption?: Caption }       // Side = { label; text?; src?; kind?; tone?: "bad"|"good"|"neutral" }; the caption always sits on the seam
  | { type: "cta"; appName: string; headline: string; sub?: string; icon?: string; action?: "link-in-bio" | "app-store" | "google-play" | "search" | "url" | "comment"; url?: string }
  | { type: "slide"; text: string; image?: string; layout?: "photo" | "phone"; background?: Background; textStyle?: TextStyle }  // carousel slide; layout "phone" puts an app screenshot in a phone under the text (never put text straight over a busy screenshot)
  | { type: "kinetic"; words: string[]; background?: Background; textStyle?: TextStyle }             // one word per beat
  | { type: "notifications"; items: { app: string; title: string; body: string; time?: string; color?: string; glyph?: string }[]; caption?: Caption }
  | { type: "terminal"; title?: string; agent?: "claude" | "codex" | "shell"; lines: { kind: "input" | "output" | "success" | "dim"; text: string }[]; caption?: Caption }
  | { type: "appstore"; appName: string; subtitle: string; icon?: string; rating?: number; ratings?: string; chart?: string; category?: string; screenshots?: string[]; caption?: Caption }; // rating/ratings/chart only from the brief's proof; omit them otherwise

type Caption = { text: string; style?: TextStyle };
type TextStyle = { style?: CaptionStyle; font?: FontId; size?: number /* fraction of width, 0.05–0.12 */; color?: string; highlight?: string;
                   position?: Position; align?: "left" | "center" | "right"; animation?: "none" | "pop" | "slide-up" | "fade" | "words" | "typewriter" | "slam" };
type Background = { kind: "solid"; color: string } | { kind: "gradient"; from: string; to: string; angle?: number }
                | { kind: "mesh"; colors: string[] } | { kind: "media"; src: string; dim?: number; blur?: number; kenBurns?: boolean };
type Overlay = { id: string; type: "text"; start: number; end: number; text: string; textStyle?: TextStyle }
             | { id: string; type: "progress"; start: number; end: number; color?: string }
             | { id: string; type: "watermark"; start: number; end: number; text: string; corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right" }
             | { id: string; type: "sticker"; start: number; end: number; emoji: string; x?: number; y?: number; size?: number };
type Position = "top" | "upper" | "center" | "lower" | "bottom";   // all inside the platform safe zone
\`\`\`

- CaptionStyle: ${CAPTION_STYLES.join(", ")}
- FontId: ${FONT_IDS.join(", ")}
- Transition: ${TRANSITIONS.join(", ")} (how a scene ENTERS). Viral edits are mostly hard cuts: use "punch" (cut + quick zoom settle) between shots, "flash" for a reveal; slides/whips/zooms overlap the previous scene by ~0.3s and get motion blur.
- Real footage beats screenshots: role "broll" assets (real-life clips) make the problem/payoff shots; screen recordings make the demo. Use taps on the moment something is pressed and one callout per video on the feature that matters.
- Music: built-in beds are listed in public/music/library.json (bpm, firstBeat, dropAt). Cut on beats (60/bpm s apart) and set audio.startFrom so the drop lands on the first cut into the app.
- Pacing that works: hook text on screen from frame 1 (the first frame is the thumbnail), over the product when there is footage; demo shots 1–2.5 s each, one short caption (≤ 8 words) per shot; hooks 5–9 words.
- Caption styles: "tiktok-classic" (TikTok's native text, the default for captions over footage), "tiktok-box" for hooks over busy UI, "snapchat" (full-width translucent bar, reads as "someone showed me this") for POV clips.
- SfxId: ${SFX_IDS.join(", ")} (whooshes, message pops and notification dings are added automatically when theme.sfx is true)
`;

export const RULES = `
## What makes these videos work (follow these)

1. **Frame 1 has words.** The hook is on screen from the first frame and readable in ~1.5s (4–12 words). Curiosity first: person + conflict + reveal, POV, "nobody talks about", a specific number.
2. **Get to beat two by 2.5s.** Hook scenes are 1.8–2.6s. Total length 7–15s for most formats (slideshows 4–7 slides).
3. **Show the real app.** Prefer the user's screen recordings/screenshots (assets) in media scenes, with 1–2 punch-in zooms on the magic moment.
4. **The CTA names the app and the outcome** ("Snugly helped me finally convince her") — never just "link in bio".
5. **Never invent numbers.** Revenue, users, downloads, ratings and testimonials must come from the product brief's proof. If there are none, choose a format that doesn't need them.
6. **Sound plan.** Set meta.soundTip to the mood of a trending sound to add in-app (TikTok drafts), or set audio.soundId from the sounds library.
7. **Caption** ≤ 150 chars, names the app, ≤ 5 hashtags (in meta.hashtags, without #). No ad-speak ("revolutionary", "seamless", "game-changer").
8. **Native looks beat polish**: iMessage, Notes, tweets, comment replies and TikTok-style text boxes outperform glossy motion graphics.
`;

export function frameworkMarkdown(): string {
  const formats = FORMATS.map(
    (f) =>
      `### ${f.name} (\`${f.id}\`) — ${f.kind}, ${f.lengthSec[0]}–${f.lengthSec[1]}s, ${f.status}\n${f.tagline}\n- Why: ${f.why}\n- Beats: ${f.beats.join(" → ")}\n- Needs: ${f.needs.join(", ")}\n- Example hooks: ${f.hooks.map((h) => `"${h}"`).join(", ")}\n`,
  ).join("\n");
  return `# Shipreel framework

Shipreel turns a product brief into short-form videos and photo carousels, renders them with Remotion and posts them.
This folder is the user's Shipreel workspace. Each project lives in \`projects/<id>/\`:

- \`project.json\` — the product brief (name, pains, outcomes, features ranked by visual wow, proof, brand, CTA)
- \`memory.md\` — learnings: winning hooks, dead hooks, what converted. Read it before generating; append to it when asked.
- \`ideas.json\` — idea queue
- \`videos/<id>.json\` — { spec: VideoSpec, status, render }
- \`assets/\` — screen recordings, screenshots, logos (reference them as "asset:<file>")
- \`posts.json\` — scheduled and published posts

You can also drive the app with the CLI: \`shipreel --help\` (or \`node <shipreel>/bin/shipreel.mjs\`).
${RULES}
${SPEC_REFERENCE}
## Formats
${formats}`;
}
