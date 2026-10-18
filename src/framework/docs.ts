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
      anchor?: "center" | "top";                             // "top" for raw screen recordings/screenshots (keeps the status bar; the bottom sits under TikTok's UI)
      push?: number;                                         // slow push-in for b-roll (1.03–1.05); leave 1 on app screens
      flow?: { at: number; src: string; kind?: "image" | "video"; tap?: { x: number; y: number }; transition?: "push" | "sheet" | "tab" | "fade"; scroll?: number }[];  // later screens in the SAME take (someone using the app), iOS transitions
      lines?: { at: number; text: string }[];                // caption lines swapped over the take (one per step); caption.style styles them
      device?: "hand";                                       // the screen keyed into real footage of a hand holding a phone (public/hands); hand?: clip id
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
  | { type: "slide"; text: string; image?: string; layout?: "photo" | "phone" | "screenshot" | "app"; sub?: string; subY?: number; subStyle?: CaptionStyle; byline?: string; title?: string; icon?: string; glyph?: string; shade?: number; ai?: { prompt: string; look?: string; seed?: number }; background?: Background; textStyle?: TextStyle }  // carousel slide: "photo" = full-bleed photo + TikTok text (textStyle.y ≈ 0.3–0.5); "screenshot" = raw 9:16 app screen; "app" = app-stack tile (title + icon or emoji glyph); sub = TikTok's second text box (soft CTA); ai = opt-in AI photo (Settings → AI images), the slide's image is the fallback
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

Measured from ~200 viral app videos and carousels (research/viral/*.md). The hits look like posts, not ads:
- **Raw beats polished.** Show the real app full-screen (anchor "top") or in a real hand (device "hand"). No floating phone mockups, 3D tilts, gradient backdrops, animated zooms on UI, tap circles or pop-out cards by default; those read as ads.
- **TikTok's own text.** "tiktok-plain" (white, soft shadow) on dark screens, "tiktok-box" (white box, black text) on light screens, "tiktok-classic" (white + black outline) over photos and b-roll. ≤ 22 characters a line, lowercase is fine, 0–2 trailing emoji. Static: text cuts on with the shot.
- **One short caption per step** (2–7 words), hard cuts every 1.7–2.5 s, 3–5 steps, the result held 2.4–3 s at the end with no text.
- **No end card.** End on the result or a loopable frame; name the app in the post caption, a pinned comment, or one late line ("it's called X"). In emotional/mental-load posts, never show the app on screen at all.
- **Real-life footage** (role "broll" / "photo") for the problem and the payoff; carousels use candid 3:4 phone photos and a raw 9:16 screenshot slide (layout "screenshot").
- **Carousels** (src/framework/carousels.ts): 3:4, 4–9 slides, hook on slide 1 over a photo (never the app's name), the app late as a raw screenshot with a boxed punchline, a soft CTA in the last slide's second box. They also post as a 9:16 photo-mode MP4 with a swipe on each beat.

1. **Frame 1 has words.** The hook is on screen from the first frame and readable in ~1.5s (4–12 words). Curiosity first: person + conflict + reveal, POV, "nobody talks about", a specific number.
2. **Get to beat two by 2.5s.** Hook scenes are 1.8–2.6s. Total length 7–15s for most formats (slideshows 4–7 slides).
3. **Show the real app.** Prefer the user's screen recordings/screenshots (assets) in media scenes, raw and full-screen (or in a hand), with the magic moment first.
4. **The CTA names the app and the outcome** ("Snugly helped me finally convince her") — never just "link in bio".
5. **Never invent numbers.** Revenue, users, downloads, ratings and testimonials must come from the product brief's proof. If there are none, choose a format that doesn't need them.
6. **Sound plan.** Set meta.soundTip to the mood of a trending sound to add in-app (TikTok drafts), or set audio.soundId from the sounds library.
7. **Caption** ≤ 150 chars, names the app, ≤ 5 hashtags (in meta.hashtags, without #). No ad-speak ("revolutionary", "seamless", "game-changer").
8. **Native looks beat polish**: raw screens, real hands, iMessage, Notes, comment replies and TikTok's own text outperform glossy motion graphics and end cards.
`;

/** How to write hooks. Shared by FRAMEWORK.md and the ideas prompt; every hook is scored by lintHook (hooks.ts). */
export const HOOK_GUIDE = `
## Writing hooks

The hook is the text on frame 1 (and the first spoken line). People decide in about a second. Write it like a post, not an ad.

**Patterns** (research/viral/hooks.md has ~380 real ones with views; in the top 30 the median hook is 7.5 words, 27/30 don't name the app, 19/30 have no closing punctuation): discovery/disbelief ("I'm JUST NOW finding this??") · POV + one exact moment · mental load / "no one talks about" · dialogue (something someone said, a text, a comment) · identity call-out ("if you're the default parent…") · list (the number = the items shown) · contrarian ("the fridge calendar could never") · confession ("this may look sponsored but…") · before → after · specific moment (a time, a day, a person) · build in public (a real stake).

**Rules**
1. 4–12 words, ≤ 22 characters a line, ≤ 3 lines. Paragraph formats (mental-load, text-wall): one 8–28 word opening sentence.
2. The first two words do the work: POV / nobody / no one / why / wait / been / my <person> / if you're / a number / a quote.
3. One specific detail: a time (3:55pm), a person (my mother-in-law), a thing (the fridge calendar), a place (Aldi).
4. Open a gap or name a pain, and let the video close it. Don't explain the product in the hook.
5. Talk like a person: you / I / POV. Lowercase is native; one CAPS word for spoken emphasis (JUST NOW, THAT girl); 0–2 emoji at the end; no hashtags.
6. Keep the app's name out of the hook in problem, POV and feeling formats; it goes in the caption. (Orbits: 1.4M and 426K with no name on screen, ~5K with "Orbits" added to the same text.)
7. No ad-speak: revolutionary, game-changer, seamless, introducing, all-in-one, unlock, "the best app", "are you tired of".
8. Never invent numbers about the product (users, ratings, revenue, "saves 5 hours"). List numbers equal the items the video shows. Persona details (a time, "3 kids") must be true for whoever posts.
9. Match the format's voice: text-card = a line someone texts you; setup-receipts = a quoted question answered by "I don't. <App> does"; mental-load = the opening sentence of a paragraph; that-girl = "N reasons why <App> is THAT girl"; comment-reply = a question.
10. Write several variants on different patterns. Shipreel scores every hook 0–100 (length, opener, specificity, gap/pain, voice, no ad-speak, no invented numbers, no app name up front) and keeps the best.

**Real hooks that worked** (views from the research files)
- "been shopping at Aldi literally for 7 years and I'm JUST NOWWW FINDING THIS????" (Potto UGC, 29.3M)
- "me checking my friend's shared calendar every day to make silly lil plans together 🤭🤭" (Howbout, 21.4M)
- "Doing my silly goofy laundry because a bird on my phone told me to 🧚" (Finch, 20.3M)
- "⚠️It will be time to BeReal at 3:42pm on Monday⚠️" (BeReal, 17.0M; a brand can be named when it's the ritual)
- "I don't have 1 hour 💀💀💀" (StudyFetch, 13.4M)
- "our prof showed us how to watch a 1 hour lecture in 2 minutes 😭" (AnswersAI, 10.9M)
- "When you decide to ditch the paper calendars and go digital" (Hearth, 9.3M)
- "pov: you have a type A mom" (5.4M)
- "POV: Your first vacation with a man who quietly takes the mental load" (4.9M)
- "No one talks about how exhausting it is to live with a man who is perfectly willing to help…" (Orbits partner, 1.4M; app only in the caption)
- "“I wish I had the discipline to hit the gym as consistently as you”" → "My consistency:" (Hevy, 1.1M)
- "Me checking my screen time like it's a horror movie" (Opal, 1.0M)
- "my hostel roommate just showed me this and all my solo travel anxiety is gone 🤯🤯" (Nomad Table, 1.0M)
- "7 reasons why Hearth is THAT girl" (Hearth, 754K)
- "my landlord said I can't change anything" (Snugly, 482.5K; its feature-first hooks got ~1K)

**Bad → good**
- "Introducing FamSync, the all-in-one family organizer!" → "POV: it's 3:55 and nobody knows who's getting the kids"
- "I built an app that puts the whole family's calendar, chores, groceries, meals and pickups in one app" → "the fridge calendar could never"
- "this app helps busy parents and nobody's talking about it" → "been running this family off a group chat for 6 years and I'm JUST NOW finding this??"
- "Are you tired of forgetting what you studied? Try Recall!" → "it's 2am and I've read the same page 4 times"
- "FamSync: stop being the family's human calendar" (on a mental-load post) → "No one talks about how exhausting it is when you're the only one who knows where everyone needs to be."
`;

export function frameworkMarkdown(): string {
  const formats = FORMATS.map(
    (f) =>
      `### ${f.name} (\`${f.id}\`) — ${f.kind}, ${f.lengthSec[0]}–${f.lengthSec[1]}s, ${f.status}\n${f.tagline}\n- Why: ${f.why}\n- Beats: ${f.beats.join(" → ")}\n- Needs: ${f.needs.join(", ")}\n- Hook templates ({slots} fill from the brief): ${f.hooks.map((h) => `"${h}"`).join(", ")}\n`,
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
${HOOK_GUIDE}
${SPEC_REFERENCE}
## Formats
${formats}`;
}
