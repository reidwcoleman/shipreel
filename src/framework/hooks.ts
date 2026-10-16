/**
 * Hook library. Families follow what app marketers report working in 2025–26: curiosity reveals
 * (person + conflict + reveal), POV, "forbidden"/illegal, time-shock, listicles, mistakes, and
 * build-in-public. Templates use {placeholders} filled from the product brief.
 * Research-sourced hooks are merged in from ./data/hooks.json when present.
 */
import researchHooks from "./data/hooks.json";

export type HookFamily =
  | "reveal"
  | "pov"
  | "forbidden"
  | "time-shock"
  | "listicle"
  | "mistakes"
  | "pain"
  | "contrarian"
  | "social-proof"
  | "build-in-public"
  | "story"
  | "challenge";

export type HookTemplate = {
  text: string;
  family: HookFamily;
  formats: string[];
  strength: number;
  source?: string;
  /** template = fills cleanly from any brief; example = a real hook from a real account (adapt, don't fill). */
  kind?: "template" | "example";
};

/**
 * Grammar-safe templates for instant ideas. Slots: {app}, {does} (3rd person: "texts you when…"),
 * {outcome} (completes "I finally ___"), {painYou} ("you always skip…"), {pain} (first person),
 * {audience} (plural), {feature}, {competitor}, {price}, {metric}, {number}, {day}, {doubter}.
 */
const BASE: HookTemplate[] = [
  // reveal: person + conflict + reveal (the strongest family for apps)
  { text: "I showed my {doubter} what {app} does and she didn't believe me", family: "reveal", formats: ["hook-demo", "pov-demo", "doubter-reveal"], strength: 5 },
  { text: "my {doubter} said I'd never {outcome}", family: "reveal", formats: ["doubter-reveal", "text-story", "hook-demo"], strength: 5 },
  { text: "my {doubter} thought {app} was a waste of time", family: "reveal", formats: ["doubter-reveal", "text-story"], strength: 5 },
  { text: "my friend bet me I couldn't {outcome}. so I built {app}", family: "reveal", formats: ["hook-demo", "vibe-coded", "text-story"], strength: 5 },
  { text: "I asked {app} to fix my worst habit. this happened", family: "reveal", formats: ["hook-demo", "pov-demo", "talking-head"], strength: 4 },
  { text: "my roommate thought I was joking about this app", family: "reveal", formats: ["text-story", "hook-demo"], strength: 4 },
  { text: "the text that made me build {app}", family: "story", formats: ["text-story"], strength: 4 },
  // POV
  { text: "POV: you finally found an app that {does}", family: "pov", formats: ["pov-demo", "slideshow-pov", "hook-demo"], strength: 5 },
  { text: "POV: you {outcome} for the first time", family: "pov", formats: ["slideshow-pov", "pov-demo", "before-after"], strength: 4 },
  { text: "POV: your friend finds out you've been using {app}", family: "pov", formats: ["text-story", "pov-demo"], strength: 4 },
  // forbidden
  { text: "this app should be illegal", family: "forbidden", formats: ["app-store-reveal", "hook-demo", "green-screen"], strength: 5 },
  { text: "{number} things {app} does that feel illegal to know", family: "forbidden", formats: ["slideshow-listicle", "three-reasons"], strength: 5 },
  { text: "apps that make you feel like you're cheating at life", family: "forbidden", formats: ["slideshow-listicle"], strength: 4 },
  { text: "nobody is talking about this app", family: "forbidden", formats: ["hook-demo", "app-store-reveal", "talking-head"], strength: 4 },
  { text: "the app {audience} don't want you to know about", family: "forbidden", formats: ["hook-demo", "slideshow-listicle"], strength: 4 },
  { text: "I can't believe this is {price}", family: "forbidden", formats: ["app-store-reveal", "hook-demo"], strength: 3 },
  // time-shock
  { text: "this took me 3 hours yesterday. now it takes 10 seconds", family: "time-shock", formats: ["hook-demo", "before-after", "x-demo"], strength: 5 },
  { text: "I wasted 2 years before I found this", family: "time-shock", formats: ["hook-demo", "slideshow-pov", "talking-head"], strength: 4 },
  { text: "built this in a weekend. it {does}", family: "time-shock", formats: ["vibe-coded", "x-demo"], strength: 4 },
  // listicle
  { text: "{number} tiny habits that fixed my life (#3 is an app)", family: "listicle", formats: ["notes-list", "slideshow-listicle"], strength: 4 },
  { text: "apps I wish I had in college", family: "listicle", formats: ["slideshow-listicle", "notes-list"], strength: 4 },
  { text: "3 reasons you need {app} this year", family: "listicle", formats: ["three-reasons"], strength: 3 },
  // mistakes
  { text: "you've been doing this wrong your whole life", family: "mistakes", formats: ["kinetic-pas", "hook-demo", "talking-head"], strength: 4 },
  { text: "stop doing this if you want to {outcome}", family: "mistakes", formats: ["kinetic-pas", "before-after"], strength: 4 },
  { text: "the mistake I made for years (and the fix)", family: "mistakes", formats: ["stakes-devlog", "talking-head"], strength: 3 },
  // pain
  { text: "if {painYou}, this is for you", family: "pain", formats: ["hook-demo", "pov-demo", "talking-head"], strength: 4 },
  { text: "me every single day: \"{pain}\"", family: "pain", formats: ["slideshow-pov", "before-after"], strength: 3 },
  { text: "be honest: {painYou} too?", family: "pain", formats: ["text-wall", "talking-head"], strength: 3 },
  // contrarian (needs a competitor)
  { text: "unpopular opinion: you don't need {competitor}", family: "contrarian", formats: ["three-reasons", "kinetic-pas"], strength: 3 },
  { text: "why I deleted {competitor}", family: "contrarian", formats: ["before-after", "hook-demo"], strength: 3 },
  // proof (needs real numbers)
  { text: "{metric} with zero ad spend", family: "social-proof", formats: ["stat-shock", "money-montage"], strength: 4 },
  { text: "the sound of {app} working", family: "social-proof", formats: ["money-montage"], strength: 4 },
  { text: "what app is this??", family: "social-proof", formats: ["comment-reply"], strength: 5 },
  { text: "does {app} actually work?", family: "social-proof", formats: ["comment-reply", "green-screen"], strength: 4 },
  // build in public
  { text: "my app is in TROUBLE", family: "build-in-public", formats: ["stakes-devlog"], strength: 5 },
  { text: "a user BROKE my app in one day", family: "build-in-public", formats: ["stakes-devlog"], strength: 5 },
  { text: "I told an AI agent to build {app}. it did", family: "build-in-public", formats: ["vibe-coded", "x-demo"], strength: 5 },
  { text: "I vibe-coded an app that {does}", family: "build-in-public", formats: ["vibe-coded", "hook-demo", "x-demo"], strength: 5 },
  { text: "I made an app that {does}", family: "build-in-public", formats: ["x-demo", "founder-split"], strength: 4 },
  { text: "I tweeted this idea. then I actually built it", family: "build-in-public", formats: ["founder-tweet"], strength: 4 },
  { text: "I asked Reddit to roast my app", family: "build-in-public", formats: ["reddit-roast"], strength: 4 },
  { text: "why I quit my job to build {app}", family: "build-in-public", formats: ["founder-split", "talking-head"], strength: 4 },
  { text: "Day {day} of building {app} until it makes $10k/month", family: "build-in-public", formats: ["build-in-public"], strength: 2 },
  // reaction / green screen
  { text: "people are mad about this app", family: "reveal", formats: ["green-screen"], strength: 4 },
  { text: "nobody told me this app existed", family: "reveal", formats: ["talking-head", "green-screen"], strength: 4 },
  { text: "my mom just changed my life with one app", family: "story", formats: ["talking-head"], strength: 4 },
  // challenge
  { text: "I gave myself 7 days to {outcome}. day 1", family: "challenge", formats: ["stakes-devlog", "hook-demo"], strength: 3 },
  { text: "can {app} really help me {outcome}? let's see", family: "challenge", formats: ["hook-demo", "pov-demo"], strength: 3 },
];

type ResearchHook = { text: string; category?: string; format_ids?: string[]; strength?: number; source?: string };

const FAMILY_MAP: Record<string, HookFamily> = {
  pov: "pov",
  curiosity: "reveal",
  pain: "pain",
  contrarian: "contrarian",
  "social-proof": "social-proof",
  story: "story",
  listicle: "listicle",
  challenge: "challenge",
  "before-after": "time-shock",
  authority: "social-proof",
  urgency: "forbidden",
  relatable: "pov",
  "build-in-public": "build-in-public",
};

/** Research format ids → Shipreel builders. */
const FORMAT_ALIASES: Record<string, string> = {
  "ai-reveal-slideshow": "doubter-reveal",
  "listicle-slideshow": "slideshow-listicle",
  "question-slideshow": "slideshow-pov",
  "faceless-screen-demo": "hook-demo",
  "how-to-tutorial": "hook-demo",
  "comment-reply-demo": "comment-reply",
  "x-demo-post": "x-demo",
  "reaction-hook-demo": "talking-head",
  "green-screen-reaction": "green-screen",
  "creator-talking-head": "talking-head",
  "lifestyle-integration": "talking-head",
  "ai-avatar-ugc": "talking-head",
  "founder-origin-story": "founder-split",
  "launch-video": "hook-demo",
  "stakes-devlog": "stakes-devlog",
  "build-in-public-series": "build-in-public",
  "mascot-character-skit": "kinetic-pas",
  "pov-skit": "pov-demo",
  "meme-remix": "pov-demo",
  "fake-text-story": "text-story",
  "wall-of-text-loop": "text-wall",
  "fade-in-reveal": "slideshow-pov",
  "apps-listicle-video": "three-reasons",
  "before-after-reveal": "before-after",
  "old-vs-new-comparison": "before-after",
};

function fromResearch(): HookTemplate[] {
  const list = (researchHooks as unknown as ResearchHook[]) ?? [];
  return list
    .filter((h) => h && typeof h.text === "string" && h.text.length < 140)
    .map((h) => ({
      text: h.text,
      family: FAMILY_MAP[h.category ?? ""] ?? "reveal",
      formats: (h.format_ids ?? []).map((f) => FORMAT_ALIASES[f] ?? f),
      strength: Math.max(1, Math.min(5, h.strength ?? 3)),
      source: h.source,
      kind: "example" as const,
    }));
}

export const HOOKS: HookTemplate[] = (() => {
  const seen = new Set<string>();
  const out: HookTemplate[] = [];
  for (const h of [...BASE.map((b) => ({ ...b, kind: "template" as const })), ...fromResearch()]) {
    const k = h.text.toLowerCase().replace(/[^a-z{}]/g, "");
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(h);
  }
  return out;
})();

export const HOOK_FAMILIES: { id: HookFamily; label: string; blurb: string }[] = [
  { id: "reveal", label: "Reveal", blurb: "Person + conflict + reveal. The strongest family for apps." },
  { id: "pov", label: "POV", blurb: "Put the viewer inside the moment." },
  { id: "forbidden", label: "Forbidden", blurb: "'Illegal to know', 'nobody talks about'." },
  { id: "time-shock", label: "Time shock", blurb: "Hours → seconds. Before → after." },
  { id: "listicle", label: "Listicle", blurb: "Numbered promise; people stay for all of it." },
  { id: "mistakes", label: "Mistakes", blurb: "'You're doing it wrong'." },
  { id: "pain", label: "Pain", blurb: "Name the exact struggle." },
  { id: "contrarian", label: "Contrarian", blurb: "Pick a fight with the default." },
  { id: "social-proof", label: "Proof", blurb: "Real numbers and real questions." },
  { id: "build-in-public", label: "Build in public", blurb: "The founder journey as content." },
  { id: "story", label: "Story", blurb: "A tiny narrative with a twist." },
  { id: "challenge", label: "Challenge", blurb: "A bet or a deadline." },
];

/** Only the grammar-safe templates (instant ideas). */
export const HOOK_TEMPLATES = HOOKS.filter((h) => h.kind === "template");
/** Real hooks from real accounts (shown in the library, given to agents as inspiration). */
export const HOOK_EXAMPLES = HOOKS.filter((h) => h.kind === "example");
