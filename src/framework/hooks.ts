/**
 * The hook engine.
 *
 * 1. A pattern library (curiosity gap, POV, named pain, contrarian, identity call-out, list, discovery,
 *    proof/roast, before→after, confession, dialogue, mental load, specific moment, build in public),
 *    each with the rule that makes it land. Distilled from research/viral/*.md and research/viral/hooks.md.
 * 2. Per-format template banks written in each format's own voice (a chat line for text-card, a quoted
 *    compliment for setup-receipts, a paragraph opener for mental-load, "N reasons why … is THAT girl").
 * 3. Slot filling from the brief, with natural variants: {painMe}/{painYou}/{painBe}/{painBeing},
 *    {outcome}/{outcomeMe}/{outcomePast}, {magic} ("send one message that rings everyone's phone"),
 *    {oldWay} ("the fridge calendar"), {moment} ("it's 3:55 and nobody knows who's getting the kids") and
 *    niche lines from a small domain pack (family, study, habits) when the brief matches one.
 * 4. A deterministic linter (`lintHook`) that scores any hook 0–100 with reasons, used to rank fills,
 *    to pick a format's default hook (seeded, so a batch of videos doesn't all open the same way) and to
 *    score hooks Claude/Codex write.
 *
 * Never invents product numbers: list counts come from what the video actually shows, and any user /
 * revenue / rating / "saves N hours" number that isn't in the brief's proof is penalised hard.
 * Persona details in a few niche lines (a time of day, "3 kids") are scene-setting, not claims; the
 * poster should keep them true for themselves.
 */
import type { Project } from "@/lib/types";
import researchHooks from "./data/hooks.json";
import { gerundOf, hashString, pastOf, polish, seeded, shortenDoes, toMe, toYou } from "./fill";

// ── patterns ─────────────────────────────────────────────────────────────────────

export type PatternId =
  | "curiosity"
  | "pov"
  | "pain"
  | "contrarian"
  | "identity"
  | "list"
  | "discovery"
  | "proof"
  | "before-after"
  | "confession"
  | "dialogue"
  | "mental-load"
  | "specific"
  | "build";

export type HookPattern = {
  id: PatternId;
  name: string;
  /** What makes it land. */
  rule: string;
  /** Formats it fits (derived from the banks). */
  formats: string[];
  /** Fill-in templates in native voice (derived from the banks). */
  templates: string[];
};

const PATTERN_META: Record<PatternId, { name: string; rule: string }> = {
  curiosity: { name: "Curiosity gap", rule: "Promise a payoff without giving it away; the viewer has to watch to close the gap. One concrete noun keeps it from being vague clickbait." },
  pov: { name: "POV / relatable moment", rule: "'POV:' + one exact moment the viewer has lived (a time, a place, a person). The moment does the work; no product in the line." },
  pain: { name: "Named pain", rule: "Say the struggle in the viewer's own words, second person or first-person confession. Specific > dramatic." },
  contrarian: { name: "Contrarian", rule: "Pick a fight with the default way ('X could never', 'this is your sign to ditch X'). Needs a real old way people recognise." },
  identity: { name: "Identity call-out", rule: "Name who it's for so they self-select ('if you're the default parent…'). Singular, specific identities beat broad audiences." },
  list: { name: "List / number", rule: "A number sets an expectation people stay for. The number must equal the items the video shows." },
  discovery: { name: "Discovery / disbelief", rule: "'why did nobody tell me…', 'I'm JUST NOW finding this??': years of doing it the hard way + disbelief. One CAPS word for the spoken emphasis." },
  proof: { name: "Social proof / roast / comment", rule: "A real question or reaction from someone else ('what app is this??'). Borrowed curiosity; never invent numbers." },
  "before-after": { name: "Before → after", rule: "Contrast the old way with the new in a few words; the visual does the selling." },
  confession: { name: "Confession", rule: "Admit something slightly embarrassing or 'this looks sponsored but…'. Vulnerability reads as a friend, not an ad." },
  dialogue: { name: "Dialogue / quote", rule: "Something someone said, in quotes or as a text. Questions people ask you make the best setups ('how do you remember all this?')." },
  "mental-load": { name: "Mental load / unspoken truth", rule: "'No one talks about…' + an exact feeling. Never name the app on screen; it goes in the caption." },
  specific: { name: "Specific moment", rule: "A real time, a real day, a real person: '3:55pm', 'picture day', 'my mother-in-law'. Specific details are what make it feel true." },
  build: { name: "Build in public", rule: "The founder story: a stake, a problem or a surprise ('my app is in TROUBLE'). Only real numbers." },
};

// ── domain packs (niche voice, keyed off the brief) ──────────────────────────────

type Pack = {
  id: string;
  test: RegExp;
  category?: string;
  /** "our family calendar" / "my study routine": the thing that changes, for before→after. */
  ourThing?: string;
  /** After "POV: ": the pain as a moment, second person or neutral. */
  moments: string[];
  /** First-person "after" moments. */
  wins: string[];
  /** Gerund phrases for "been ___ for years". */
  habits: string[];
  oldWays: string[];
  doubters: string[];
  friends: string[];
  identities: string[];
  /** Quotes people say to you (answered by "I don't. {app} does"). */
  asks: string[];
  comments: string[];
  /** A complaint someone texts you (text-card's line after "we need to talk"). */
  lines: string[];
  /** Mental-load openers: complete sentences, sentence case. */
  truths: string[];
  /** One meme line over the busiest app screen. */
  backdrops: string[];
  /** "I'm JUST NOW finding this" lines. */
  found: string[];
  /** List titles with {number}. */
  listTitles: string[];
  time: string;
  captionQs: string[];
  tags: string[];
};

const PACKS: Pack[] = [
  {
    id: "family",
    test: /\b(famil|parent|mom|mum|dad|kid|household|co-?parent|chore)/i,
    category: "family calendar",
    ourThing: "our family calendar",
    moments: [
      "it's 3:55 and nobody knows who's getting the kids",
      "you find out about early release from another mom",
      "it's 5pm and nobody knows what's for dinner",
      "practice moved to 5:30 and you're the only one who knows",
      "you're the default parent and it's 7am",
    ],
    wins: ["it's 7am and I already know who's on pickup", "first week nobody asked me what's for dinner", "my husband knew about picture day before I did"],
    habits: ["running this family off a group chat", "keeping everyone's schedule in my head", "writing practice times on the fridge"],
    oldWays: ["the fridge calendar", "the family group chat", "sticky notes on the fridge"],
    doubters: ["husband", "mom", "mother-in-law"],
    friends: ["sister", "best friend", "mom"],
    identities: ["the default parent", "a working mom", "a busy parent"],
    asks: ["“how do you keep track of everyone's schedule?”", "“you're so organized, how do you remember everything?”", "“how do you always know who has pickup?”", "“wait, how do you remember picture day??”"],
    comments: ["does your husband actually use it?? 😭", "what app is this?? our fridge calendar is a crime scene", "ok but do the kids actually check it?"],
    lines: [
      "I found out about the dentist appointment FROM the dentist",
      "the kids waited at school 20 minutes because we both thought the other one had pickup",
      "why am I finding out practice moved from the coach",
      "it's 5:45 and you said dinner was handled",
    ],
    truths: [
      "The mental load isn't picking up the kids. It's being the only one who remembers early release",
      "He'll do anything I ask. The problem is I have to know to ask",
      "Nobody talks about the resentment of being the family's human calendar",
      "“Just tell me what to do” is the most exhausting sentence in my marriage",
      "The worst part isn't doing it all. It's being the only one who knows it needs doing",
    ],
    backdrops: ["me checking the family calendar to see if anyone else could've done pickup today", "pov: your mom is type A and just color-coded the entire family", "our family calendar during soccer season"],
    found: ["been running this family off a group chat for years and I'm JUST NOW finding this??", "every kid on a different schedule and I'm only NOW finding out this exists??"],
    listTitles: ["{number} things that run our house now (that aren't me)", "{number} things that make me look way more organized than I am"],
    time: "3:55pm",
    captionQs: ["be honest, who's the default parent in your house? 👇", "who else is the family's human calendar 🙋‍♀️", "what's the one thing only YOU remember in your house? 👇", "tell me I'm not the only one 😭"],
    tags: ["mentalload", "defaultparent", "momlife", "familyorganization", "momhack"],
  },
  {
    id: "study",
    test: /\b(stud(y|ent|ying)|exam|flashcard|homework|college|lecture|class(es)?|quiz|finals|revision|tutor)/i,
    category: "study app",
    ourThing: "my study routine",
    moments: ["it's 2am and you've read the same page 4 times", "the exam is tomorrow and you just found out it's cumulative", "you highlighted the whole chapter and remember none of it"],
    wins: ["walked into the exam and actually knew the answers", "studied once and it actually stuck"],
    habits: ["rereading my notes", "making flashcards by hand", "highlighting entire textbooks"],
    oldWays: ["the highlighter", "handwritten flashcards", "the 40-page study guide"],
    doubters: ["professor", "roommate", "mom"],
    friends: ["roommate", "best friend", "sister"],
    identities: ["a pre-med student", "a college student"],
    asks: ["“how are you always this prepared?”", "“wait, when did you even study?”", "“how do you remember all of this?”"],
    comments: ["what app is this?? finals are in 2 weeks", "does it work for med school content?", "ok but does it actually help you remember?"],
    lines: ["you said you'd quiz me tonight. it's 1am", "the exam is at 9 and you haven't opened the slides", "you've been \"studying\" for 3 hours and you're on slide 2"],
    truths: ["Nobody talks about how exhausting it is to study for 6 hours and remember nothing", "The hardest part of studying isn't the work. It's not knowing if any of it is sticking"],
    backdrops: ["me opening my notes the night before the exam", "my study plan during finals be like"],
    found: ["been rereading my notes for years and I'm JUST NOW finding this??", "all of college and nobody told me this existed??"],
    listTitles: ["{number} study hacks I wish I knew freshman year"],
    time: "1:47am",
    captionQs: ["be honest, how many hours did you study for your last exam? 👇", "rereaders vs flashcard people, go 👇", "what's your worst cramming story 😭"],
    tags: ["studytok", "studytips", "college", "finals", "studyhacks"],
  },
  {
    id: "habits",
    test: /\b(habit|streak|routine|discipline|consisten|self[- ]improvement|goals?\b|productiv)/i,
    category: "habit tracker",
    ourThing: "my morning routine",
    moments: ["it's day 3 and you already broke the streak", "you open your to-do list and close it immediately", "it's 11pm and you did none of the 5 things"],
    wins: ["first time I've kept a habit past week two", "I didn't restart on Monday this week"],
    habits: ["starting over every Monday", "tracking habits in my notes app", "buying a new planner every January"],
    oldWays: ["the notes app checklist", "sticky notes on the mirror", "the planner you quit in February"],
    doubters: ["boyfriend", "roommate", "mom"],
    friends: ["best friend", "roommate", "sister"],
    identities: ["someone with zero discipline", "a chronic Monday restarter"],
    asks: ["“how are you so consistent?”", "“how do you actually stick to things?”", "“wait, you've done this every day??”"],
    comments: ["does it actually keep you consistent?", "ok but what happens when you miss a day?"],
    lines: ["you said you'd start Monday. it's Thursday", "how many habit apps have you downloaded this year", "you skipped the gym again didn't you"],
    truths: ["Nobody talks about how exhausting it is to restart your whole life every Monday", "The problem was never motivation. It's that nothing reminds me when it matters"],
    backdrops: ["me checking my streak before bed like it's my child", "my habit tracker in week one vs week three"],
    found: ["been starting over every Monday for years and I'm JUST NOW finding this??"],
    listTitles: ["{number} tiny habits that actually stuck this year"],
    time: "11:48pm",
    captionQs: ["be honest, what day do you usually quit? 👇", "Monday restarters where you at 🙋‍♀️", "what's the one habit you can't keep? 👇"],
    tags: ["habits", "selfimprovement", "productivity", "habittracker", "discipline"],
  },
];

export function packFor(p: Project): Pack | undefined {
  const text = `${p.category} ${p.audience.map((a) => `${a.name} ${a.description ?? ""}`).join(" ")} ${p.keywords.join(" ")} ${p.oneLiner}`;
  // The first pack whose words appear most wins.
  let best: Pack | undefined;
  let hits = 0;
  for (const pk of PACKS) {
    const n = (text.match(new RegExp(pk.test.source, "gi")) ?? []).length;
    if (n > hits) [best, hits] = [pk, n];
  }
  return best;
}

// ── slots ────────────────────────────────────────────────────────────────────────

export type Slots = Record<string, string[]>;

const stripEnd = (s: string) => s.replace(/[.!?]+$/, "").trim();
const lcFirst = (s: string) => (s && !/^(I\b|I'|[A-Z]{2})/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const uniq = (a: string[]) => [...new Set(a.filter(Boolean).map((x) => x.trim()))];

/** Imperative verbs a feature benefit can start with ("Send one message…" → "you can send one message…"). */
const IMPERATIVE = /^(ask|send|see|get|track|plan|add|scan|turn|snap|take|find|know|share|set|log|build|make|write|record|save|block|check|tap|talk|chat|type|upload|swipe|sync|split|pay|learn|study|quiz|practice|count|watch|hear|keep|start|remind|ring|invite|pick|choose|organize|text|say|point|drop|paste|photograph|search|compare|cook|meal-?prep)\b/i;

/** Cut a phrase to ≤ max words at a clause break (comma, "even", "without", "so"), never mid-thought if avoidable. */
function clip(s: string, max = 9): string {
  const head = s.split(/,\s+|\s+(?=(?:even when|even if|without|so|when|because|while|and then|instead of)\b)|\s+—\s+|:\s+/)[0].trim();
  return words(head) <= max ? head : "";
}

function singular(s: string): string {
  return s.replace(/(\w+)ies$/i, "$1y").replace(/(\w{3,})s$/i, "$1");
}

/** Everything a hook template can say, as natural variants (best first). */
export function hookSlots(p: Project): Slots {
  const pack = packFor(p);
  const app = p.name || "this app";
  const pains = p.pains.map(stripEnd).filter(Boolean);
  const painMe = pains.map(lcFirst);
  const painYou = pains.map((x) => lcFirst(toYou(x)));
  // "I'm the only one…" → "be the only one…"; "I forget X" → "forget X".
  const painBe = pains
    .map((x) => (/^I('m| am)\s+/i.test(x) ? x.replace(/^I('m| am)\s+/i, "be ") : /^I\s+(?!was\b)/.test(x) ? x.replace(/^I\s+/, "") : ""))
    .filter(Boolean)
    .map(toYou);
  const outcomes = p.outcomes.map(stripEnd).map((o) => o.replace(/^(to|you|i)\s+/i, "")).filter(Boolean);
  const ACHIEVE = /^(stop|quit|start|get|ditch|fix|beat|cut|end|break|save|finish|pass|ace|lose|drop|build|learn|make|keep|find|hit|reach|master|clear|sleep|read|pay|win)\b/i;
  const escaped = app.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const doesRaw = p.oneLiner ? stripEnd(p.oneLiner).replace(new RegExp(`^${escaped}\\s+(is\\s+an?\\s+[\\w\\s-]{1,40}?\\s+that\\s+|helps\\s+(you\\s+)?)?`, "i"), "") : "";
  const doesShort = doesRaw && doesRaw !== stripEnd(p.oneLiner ?? "") ? lcFirst(shortenDoes(doesRaw)).replace(/\s+in one app$/i, " in one place") : "";
  // "Just ask Foxy and it adds events, moves plans…" → "ask Foxy and it adds events".
  const magic = uniq(
    p.features
      .map((f) => stripEnd((f.benefit || "").replace(/^just\s+/i, "")))
      .filter((b) => IMPERATIVE.test(b))
      .map((b) => lcFirst(clip(b, 9)))
      .filter(Boolean),
  ).sort((a, b) => words(a) - words(b));
  const brandComp = p.competitors.filter((c) => /^[A-Z0-9]/.test(c) && !/^the\b/i.test(c) && words(c) <= 3);
  const oldWayComp = p.competitors.filter((c) => /^(the|a|my|your|paper|sticky)\b/i.test(c)).map((c) => c.replace(/^(my|your)\s+/i, "the "));
  const oldWays = uniq([...(pack?.oldWays ?? []), ...oldWayComp]);
  const audiences = p.audience.map((a) => lcFirst(a.name)).filter(Boolean);
  const category =
    pack?.category && (p.keywords.some((k) => k.toLowerCase() === pack.category) || !p.keywords.length)
      ? pack.category
      : (p.keywords.find((k) => words(k) <= 3 && !/app$/i.test(k)) ?? pack?.category ?? "");
  const free = /\bfree\b/i.test(`${p.price ?? ""} ${p.cta.text}`);
  return {
    app: [app],
    category: category ? [category.toLowerCase()] : [],
    ourThing: pack?.ourThing ? [pack.ourThing] : [],
    audience: audiences.slice(0, 2),
    // "Busy parents" → "a busy parent"; skip clauses ("people who restart…") that don't singularise cleanly.
    identity: uniq([...(pack?.identities ?? []), ...audiences.slice(0, 1).filter((a) => !/\b(who|that|which)\b|^people\b/i.test(a)).map((a) => `a ${singular(a)}`)]),
    doubter: pack?.doubters ?? ["mom", "roommate", "best friend"],
    friend: pack?.friends ?? ["best friend", "sister", "roommate"],
    time: [pack?.time ?? "11:48pm"],
    painMe,
    painYou,
    painYou0: painYou.slice(0, 1),
    painBe,
    painBeing: painBe.map(gerundOf),
    outcome: outcomes,
    outcomeMe: outcomes.map(toMe),
    outcomePast: outcomes.filter((o) => ACHIEVE.test(o)).map((o) => toMe(pastOf(o))),
    does: doesShort ? [doesShort] : [],
    magic,
    oldWay: oldWays,
    oldWayBare: oldWays.map((o) => o.replace(/^(the|a|an)\s+/i, "")),
    competitor: brandComp,
    metric: p.proof.map(stripEnd).filter((x) => /\d/.test(x) && words(x) <= 7).map(lcFirst),
    habit: uniq([...(pack?.habits ?? [])]),
    moment: uniq([...(pack?.moments ?? []), ...painYou.filter((x) => /^you\b/i.test(x) && words(x) <= 10)]),
    win: uniq([...(pack?.wins ?? [])]),
    truth: pack?.truths ?? [],
    line: uniq([...(pack?.lines ?? []), ...painYou.filter((x) => words(x) <= 14)]),
    ask: uniq([...(pack?.asks ?? []), "“wait, how do you remember all of this?”", "“how are you this organized??”"]),
    comment: uniq([...(pack?.comments ?? []), "what app is this??"]),
    backdrop: pack?.backdrops ?? [],
    found: pack?.found ?? [],
    listTitle: pack?.listTitles ?? [],
    free: free ? ["free"] : [],
  };
}

// ── format banks ─────────────────────────────────────────────────────────────────

type Entry = [PatternId, string];

/**
 * Templates per format, in that format's voice. Read how the format's build() uses ctx.hook before
 * adding one (e.g. text-card's hook is a line someone texts you; setup-receipts is answered by
 * "I don't. {app} does"; mental-load's hook opens a paragraph the build continues with the brief's pains).
 */
const BANK: Record<string, Entry[]> = {
  "hook-demo": [
    ["discovery", "why did nobody tell me you can just {magic}"],
    ["curiosity", "wait… you can {magic}??"],
    ["contrarian", "{oldWay} could never"],
    ["contrarian", "this is your sign to ditch {oldWay}"],
    ["pov", "POV: you finally {outcome}"],
    ["identity", "if {painYou}, watch this"],
    ["discovery", "I can't believe this is {free}"],
  ],
  "problem-solution": [
    ["pov", "POV: {moment}"],
    ["pain", "nobody warns you that {painYou}"],
    ["specific", "{moment}. never again"],
    ["identity", "if {painYou}, you need this"],
    ["before-after", "how I {outcomePast}"],
  ],
  "text-story": [
    ["specific", "my {friend} texted me this at {time} 😭"],
    ["confession", "she's been doing it the hard way this whole time 😭"],
    ["dialogue", "had to stage an intervention for my {friend}"],
    ["dialogue", "sent my {friend} one app and fixed her whole week"],
  ],
  "slideshow-listicle": [
    ["list", "{number} things this {category} app does that feel illegal"],
    ["list", "{number} ways I {outcomePast}"],
    ["list", "{listTitle}"],
    ["list", "{number} things I can't believe are {free}"],
    ["identity", "if {painYou}, save this"],
  ],
  "slideshow-pov": [
    ["pov", "POV: {moment}"],
    ["pov", "POV: you finally {outcome}"],
    ["identity", "POV: you're {identity} and you just found this"],
    ["confession", "me every day until someone showed me this"],
  ],
  "comment-reply": [
    ["proof", "what app is this??"],
    ["proof", "{comment}"],
    ["curiosity", "wait, you can {magic}??"],
    ["proof", "ok but does it actually work for {audience}?"],
    ["proof", "is it actually {free}??"],
  ],
  "build-in-public": [
    ["build", "day {day} of building {app} until someone besides my mom uses it"],
    ["build", "day {day}: I almost gave up on {app}"],
    ["build", "day {day} of building an app that {does}"],
  ],
  "money-montage": [
    ["pov", "POV: you launched {app} and didn't tell anyone"],
    ["proof", "the sound of {app} working"],
    ["build", "I built {app} and this happened"],
  ],
  "vibe-coded": [
    ["build", "I asked Claude Code to build the app I wished existed"],
    ["build", "I vibe-coded an app that {does}"],
    ["build", "I told an AI agent to build {app}. it did"],
  ],
  "before-after": [
    ["before-after", "{oldWay} vs this"],
    ["before-after", "{ourThing} before vs after"],
    ["before-after", "me before {app} vs me after"],
    ["before-after", "how it started vs how it's going"],
  ],
  "notes-list": [
    ["before-after", "how I {outcomePast}"],
    ["identity", "things that saved my sanity as {identity}"],
    ["list", "my {number} non-negotiables as {identity}"],
    ["confession", "things I wish someone told me sooner"],
  ],
  "founder-tweet": [
    ["build", "nobody liked this tweet. so I built it anyway"],
    ["build", "I tweeted this idea. then I actually built it"],
    ["before-after", "me 3 months ago vs today"],
  ],
  "reddit-roast": [
    ["proof", "I asked Reddit to roast my app"],
    ["proof", "posted {app} on Reddit. here's what happened"],
    ["proof", "Reddit was brutal about my app"],
  ],
  "kinetic-pas": [
    ["pain", "this is why {painYou}"],
    ["identity", "if {painYou}, stop scrolling"],
    ["pain", "you're doing it wrong"],
  ],
  "app-store-reveal": [
    ["curiosity", "this app should be illegal"],
    ["proof", "{audience} are gatekeeping this app"],
    ["discovery", "I can't believe this is {free}"],
    ["contrarian", "{oldWay} could never"],
  ],
  "pov-demo": [
    ["pov", "POV: you just {magic}"],
    ["pov", "POV: you finally {outcome}"],
    ["identity", "POV: you're {identity} and you just found this"],
  ],
  "three-reasons": [
    ["list", "{number} reasons I {outcomePast}"],
    ["contrarian", "{number} reasons I can't go back to {oldWay}"],
    ["list", "{number} reasons {audience} need {app}"],
  ],
  "stat-shock": [
    ["proof", "{metric}. here's what actually worked"],
    ["proof", "how {app} got to {metric}"],
    ["proof", "this number changed everything for {app}"],
  ],
  "feature-carousel": [
    ["curiosity", "things {app} does that I didn't know I needed"],
    ["pov", "POV: you open {app} for the first time"],
    ["curiosity", "everything {app} can do (it's a lot)"],
    ["pain", "{app}: {outcome}"],
  ],
  "doubter-reveal": [
    ["dialogue", "my {doubter} said {oldWay} was fine"],
    ["dialogue", "my {doubter} said I'd never {outcomeMe}"],
    ["dialogue", "my {doubter} said we didn't need another app"],
  ],
  "talking-head": [
    ["confession", "this may look sponsored but I swear it's not"],
    ["identity", "if you're {identity}, I need you to see this"],
    ["discovery", "why did nobody tell me about this sooner"],
    ["confession", "I'm {identity} and this is embarrassing"],
  ],
  "founder-split": [
    ["build", "I built this because {painMe}"],
    ["build", "I built the app I wished existed"],
    ["build", "why I'm building {app}"],
  ],
  "green-screen": [
    ["proof", "people kept asking for this. so we built it"],
    ["curiosity", "someone finally built this"],
    ["proof", "replying to everyone who said this doesn't exist"],
  ],
  "stakes-devlog": [
    ["build", "my app is in TROUBLE"],
    ["build", "a user BROKE my app in one day"],
    ["build", "did I make {app} TOO simple?"],
  ],
  "text-wall": [
    ["confession", "my {friend} still does it without an app. like a psychopath"],
    ["confession", "just watched someone do it without {app}. like a psychopath"],
    ["curiosity", "give me your most unhinged way to {outcome}"],
  ],
  "x-demo": [
    ["build", "I made an app to {outcome}"],
    ["build", "IT WORKS. {app} {does}"],
  ],
  "raw-demo": [
    ["before-after", "how I {outcomePast}"],
    ["contrarian", "{oldWay} could never"],
    ["specific", "{win}"],
    ["pain", "I don't have time to {painBe} 💀"],
  ],
  "found-this": [
    ["discovery", "{found}"],
    ["discovery", "been {habit} for years and I'm JUST NOW finding this??"],
    ["discovery", "why did nobody tell me you can just {magic}"],
    ["discovery", "my {friend} just showed me this and I'm mad nobody told me sooner"],
  ],
  "mental-load": [
    ["mental-load", "{truth}"],
    ["mental-load", "No one talks about how exhausting it is when {painYou0}"],
    ["mental-load", "Nobody warns you that {painYou0}"],
    ["mental-load", "The worst part isn't the work. It's that {painYou0}"],
  ],
  "setup-receipts": [["dialogue", "{ask}"]],
  "that-girl": [
    ["list", "{number} reasons why {app} is THAT girl"],
    ["list", "{number} small things that saved my sanity this year"],
    ["list", "{listTitle}"],
  ],
  "backdrop-pov": [
    ["specific", "{backdrop}"],
    ["pov", "POV: you finally see how much you were carrying"],
    ["confession", "me pretending I have it all together (it's the app)"],
  ],
  "ditch-old-way": [
    ["before-after", "When you finally ditch {oldWay} and go digital"],
    ["before-after", "bye bye {oldWayBare} 👋"],
    ["contrarian", "When you finally ditch {oldWay} nobody looks at"],
  ],
  "text-card": [
    ["dialogue", "{line}"],
    ["dialogue", "ok who forgot AGAIN 😭"],
  ],
};

/** Raw templates for a format (FormatDef.hooks). */
export function formatHooks(formatId: string): string[] {
  return (BANK[formatId] ?? []).map(([, t]) => t);
}

/** How each format shows the hook; the linter judges length by it. */
type Profile = "line" | "long" | "paragraph" | "chat" | "quote" | "question" | "list";
const PROFILE: Record<string, Profile> = {
  "mental-load": "paragraph",
  "text-wall": "long",
  "text-card": "chat",
  "setup-receipts": "quote",
  "comment-reply": "question",
  "found-this": "long",
  "that-girl": "list",
  "slideshow-listicle": "list",
  "three-reasons": "list",
  "notes-list": "list",
  "backdrop-pov": "long",
};
/** Formats where naming the app in the hook is native. */
const NAMED_OK = new Set(["that-girl", "x-demo", "build-in-public", "stakes-devlog", "founder-tweet", "founder-split", "reddit-roast", "vibe-coded", "feature-carousel", "money-montage", "stat-shock", "three-reasons", "before-after", "comment-reply"]);
/** Formats that must not name the app on screen at all. */
const NO_APP = new Set(["mental-load", "text-card", "setup-receipts", "text-story", "slideshow-pov", "problem-solution", "found-this", "backdrop-pov"]);

/**
 * The number a list hook must say = the items the format's build() shows. Keep in sync with
 * formats.ts (slideshow-listicle: features.slice(0, 4); three-reasons: features.slice(0, 3);
 * notes-list: 3 features + "use {app}"; that-girl: features + outcomes, max 6).
 */
export function listCount(formatId: string, p: Project): number | undefined {
  const f = Math.max(1, p.features.length);
  const o = Math.max(1, p.outcomes.length);
  switch (formatId) {
    case "slideshow-listicle":
      return Math.min(4, f);
    case "three-reasons":
      return Math.min(3, f);
    case "notes-list":
      return Math.min(3, f) + 1;
    case "that-girl":
      return Math.min(6, f + o);
    default:
      return undefined;
  }
}

// ── the linter ───────────────────────────────────────────────────────────────────

export type LintReason = { id: string; label: string; delta: number; tip?: string };
export type HookLint = { score: number; reasons: LintReason[]; words: number; lines: number };
export type LintContext = {
  formatId?: string;
  app?: string;
  /** Items the video shows, for list hooks. */
  listCount?: number;
  /** The brief's proof lines: the only numbers a hook may claim. */
  proof?: string[];
  /** Extra concrete nouns that count as specific (old ways, competitor names). */
  concrete?: string[];
};

const SALESY =
  /\b(revolutionary|revolutioni[sz]e\w*|game[- ]?chang\w+|introducing|cutting[- ]edge|seamless(ly)?|effortless(ly)?|leverage|synergy|innovative|next[- ]level|all[- ]in[- ]one|unlock|elevate|supercharge|streamline|must[- ]have|ultimate|powerful|world[- ]class|best[- ]in[- ]class|state[- ]of[- ]the[- ]art|the best app|boost your productivity|transform your|look no further|download (it )?now|try it (now|today|free)|sign up|link in bio|available now|meet \w+, the)\b/gi;
const CLICKBAIT = /\b(you won'?t believe|will change your life|guaranteed|100%|doctors hate|one weird trick|shocking|gone wrong|not clickbait|must see)\b/i;
const WEAK_OPEN = /^(introducing|meet|check out|download|presenting|welcome to|are you tired|tired of|do you struggle|struggling with|looking for|say goodbye|discover|hey guys|so today|in this video|have you ever wondered)\b/i;
const STRONG_OPEN = /^(pov|nobody|no one|why|wait|been|imagine|stop|me|my|if|when|ok|okay|be honest|someone|the moment|bye|he'll|he|she|they|this is your sign|not me|tell me|things|the mental load|“|"|\d)/i;
const MID_OPEN = /^(i|i'm|i've|you|your|it's|this|we|our|just|finally|every|how|what|had|sent|the)\b/i;
const GAP =
  /\?|…|\.\.\.|\b(why|how|nobody|no one|finally|just now|wait|until|the moment|found|finding|realized|never|could never|your sign|pov|be like|said|thought|illegal|secret|told me|didn't know|turns out|what happened|this is why|the reason|actually|swear|sponsored|gatekeeping|embarrassing|sooner|intervention|psychopath|pretending|vs)\b/i;
const PAIN =
  /\b(forgot|forget|forgets|again|exhaust\w*|only one|nobody reads|late|every night|every day|every single|tired|can't(?! believe)|never|always|worst|hate|stress\w*|mess|chaos|drowning|overwhelm\w*|alone|behind|hard way|problem|resent\w*|mental load|default parent|crying|panic|broke|missed|ignor\w*|waited|carrying)\b|💀|😭|🫠/i;
const VOICE = /\b(you|your|you're|i|i'm|i've|i'd|me|my|we|our|us|pov)\b/i;
const CONCRETE =
  /\b(fridge|group chat|group text|dentist|practice|pickup|picture day|early release|dinner|school|soccer|coach|husband|wife|mom|mum|dad|sister|brother|roommate|boss|landlord|grandma|mother-in-law|kids?|textbook|flashcards?|highlighter|notes app|planner|sticky notes|exam|finals|professor|gym|streak|monday|spreadsheet|calendar|alarm|kitchen|laundry|dishwasher|grocer(y|ies)|reddit|tweet|claude|freshman year|college|lecture|slides|lock screen)\b/i;
const TIME = /\b\d{1,2}(:\d{2})?\s?(am|pm)\b|\b\d{1,2}:\d{2}\b/i;
const DAYS = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tonight|this morning|picture day|early release|halloween|christmas|thanksgiving|october|september)\b/i;
const CLAIM =
  /(\$\s?\d[\d,.]*\s?[km]?\b|\b\d[\d,.]*\s?%|\b\d[\d,.]*\s?[km]\b|\b\d[\d,.]*\+?\s+(users|downloads|people|customers|reviews|ratings|stars|subscribers|installs|sign-?ups|families|parents|students|moms|members|followers)\b|\b\d+x\b|\bsaves?\s+(me\s+|you\s+)?\d+\s+(hours?|minutes?|mins?)\b|#1\b|number one app)/gi;
const EMOJI = /\p{Extended_Pictographic}/gu;
const SAFE_CAPS = new Set(["I", "POV", "AI", "OK", "TV", "ADHD", "GPA", "AM", "PM", "IOS", "SAT", "ACT", "MCAT"]);

function wrapLines(text: string, width = 22): number {
  let lines = 0;
  for (const para of text.split(/\n|\\n/)) {
    let cur = 0;
    lines++;
    for (const w of para.split(/\s+/).filter(Boolean)) {
      if (cur && cur + 1 + w.length > width) {
        lines++;
        cur = w.length;
      } else cur += (cur ? 1 : 0) + w.length;
    }
  }
  return lines;
}

const LENGTH: Record<Profile, { ideal: [number, number]; ok: number }> = {
  line: { ideal: [4, 12], ok: 15 },
  list: { ideal: [4, 12], ok: 14 },
  quote: { ideal: [4, 12], ok: 15 },
  question: { ideal: [3, 12], ok: 15 },
  chat: { ideal: [4, 16], ok: 20 },
  long: { ideal: [5, 16], ok: 19 },
  paragraph: { ideal: [8, 28], ok: 40 },
};

/**
 * Score a hook 0–100 with reasons. Pure and deterministic. What it rewards comes from the research:
 * 4–12 words, ≤ ~22 characters a line, a strong first two words, one specific detail, a curiosity gap
 * or a named pain, "you"/"I" voice, native casing (one CAPS word for emphasis). What it punishes: ad-speak,
 * the app's name up front in problem formats (and anywhere in mental-load posts), clickbait, invented
 * numbers, list numbers that don't match the video, and fill-in junk (doubled words, dangling "and").
 */
export function lintHook(hook: string, ctx: LintContext = {}): HookLint {
  const text = hook.replace(/\*/g, "").replace(/\\n|\n/g, " ").replace(/\s+/g, " ").trim();
  const profile: Profile = (ctx.formatId && PROFILE[ctx.formatId]) || "line";
  const w = text ? text.split(" ").length : 0;
  const lines = wrapLines(text);
  const reasons: LintReason[] = [];
  const add = (id: string, label: string, delta: number, tip?: string) => reasons.push({ id, label, delta, tip });
  if (!text || /\{[a-zA-Z]+\}/.test(text) || /\b(undefined|null|NaN)\b/.test(text)) {
    add("unfilled", "Has an unfilled {placeholder}", -100, "Fill every {slot} or pick another template.");
    return { score: 0, reasons, words: w, lines };
  }

  // Length.
  const L = LENGTH[profile];
  if (w >= L.ideal[0] && w <= L.ideal[1]) add("length", `${w} words: readable in ~1.5s`, 18);
  else if (w > L.ideal[1] && w <= L.ok) add("length", `${w} words: a little long`, 6, "Cut a few words; hooks that work are read before the thumb moves.");
  else if (w > L.ok) add("length", `${w} words: too long`, -10 - 2 * (w - L.ok), "Cut it to one thought. Move the detail into the second beat.");
  else add("length", `${w} words: too short to make sense cold`, -10, "Add the situation: who, when, or what went wrong.");

  // On-screen lines (≤ ~22 chars a line, ≤ 3 lines).
  if (profile !== "paragraph" && profile !== "chat") {
    if (lines <= 3) add("lines", `${lines} line${lines > 1 ? "s" : ""} on screen`, 4);
    else if (lines >= (profile === "long" ? 6 : 5)) add("lines", `${lines} lines on screen`, -6, "At ~22 characters a line this covers the video. Shorten it.");
  }

  // First two words.
  const first2 = text.split(" ").slice(0, 2).join(" ");
  if (WEAK_OPEN.test(text)) add("opener", `Weak opener: "${first2}"`, -15, "Ad openers ('introducing', 'are you tired of') get skipped. Open on the person or the moment.");
  // No formula opener dominates the top 30 (research/viral/hooks.md §2.2): a person or a moment up front is what counts.
  else if (STRONG_OPEN.test(text)) add("opener", `Strong opener: "${first2}"`, 8);
  else if (MID_OPEN.test(text)) add("opener", `OK opener: "${first2}"`, 6);
  else add("opener", `Flat opener: "${first2}"`, 0, "Open with POV / nobody / why / my <person> / a number.");

  // A specific detail.
  const tokens = text.split(" ");
  const properNoun = tokens.some((t, i) => i > 0 && /^[A-Z][a-z]{2,}/.test(t) && !/[.?!]$/.test(tokens[i - 1]) && !(ctx.app && t.replace(/\W+$/, "") === ctx.app) && !/^I('|$)/.test(t));
  const concrete = CONCRETE.test(text) || (ctx.concrete ?? []).some((c) => c && text.toLowerCase().includes(c.toLowerCase()));
  const body = profile === "list" ? text.replace(/^\D{0,12}?\d+\b/, "") : text;
  if (/\d/.test(body) || TIME.test(body) || DAYS.test(body)) add("specific", "Has a specific number, time or day", 10);
  else if (properNoun || concrete || /[“"]/.test(text)) add("specific", "Has a concrete detail", 8);
  else add("specific", "Nothing specific", 0, "Add one real detail: a time (3:55pm), a person (my mother-in-law), a thing (the fridge calendar).");

  // Curiosity gap / named pain.
  // A reframe ("X isn't A. It's B") is a gap too.
  const gap = GAP.test(text) || (profile === "list" && /^\d/.test(text)) || /\b(isn't|is not|wasn't)\b.+\bit'?s\b/i.test(text);
  const pain = PAIN.test(text);
  if (gap && pain) add("gap", "Opens a gap and names a pain", 16);
  else if (gap) add("gap", "Opens a curiosity gap", 12);
  else if (pain) add("gap", "Names a pain", 9);
  else add("gap", "No gap, no pain", -6, "Tease the payoff (why / nobody / finally / POV) or name the exact struggle.");

  // Voice.
  if (VOICE.test(text) || /^[“"]/.test(text)) add("voice", "Talks like a person (you / I / POV)", 8);
  else if (profile !== "paragraph") add("voice", "Describes a product instead of talking to someone", -4, "Use 'you', 'I' or a POV.");

  // Ad-speak, clickbait, invented numbers.
  const salesy = text.match(SALESY) ?? [];
  if (salesy.length) add("salesy", `Ad-speak: ${[...new Set(salesy.map((s) => s.toLowerCase()))].join(", ")}`, -18 * Math.min(2, salesy.length), "Say what happens instead of how great it is.");
  if (CLICKBAIT.test(text)) add("clickbait", "Clickbait phrasing", -15, "Promise something the video actually shows.");
  const proofText = (ctx.proof ?? []).join(" ").toLowerCase();
  const claims = (text.match(CLAIM) ?? []).filter((c) => {
    const digits = c.replace(/[^\d]/g, "");
    return !digits || !proofText.replace(/[^\d ]/g, " ").includes(digits);
  });
  if (claims.length) add("invented", `Number not in the brief's proof: ${claims.join(", ")}`, -35, "Only claim numbers from Product → Proof.");

  // The app's name.
  if (ctx.app) {
    const esc = ctx.app.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const named = new RegExp(`\\b${esc}\\b`, "i");
    const early = new RegExp(`^(\\S+\\s+){0,2}${esc}\\b`, "i");
    const fid = ctx.formatId ?? "";
    if (named.test(text) && NO_APP.has(fid)) add("named", "Names the app on screen", fid === "mental-load" ? -30 : -14, "Keep the product out of the hook; name it in the caption.");
    else if (early.test(text) && !NAMED_OK.has(fid)) add("named", "App name in the first 3 words", -12, "Lead with the problem or the moment; the app is the payoff.");
  }

  // List number must match what the video shows.
  if (ctx.listCount != null) {
    const n = /^\D{0,12}?(\d+)\b/.exec(text)?.[1];
    if (n && Number(n) !== ctx.listCount) add("count", `Says ${n} but the video shows ${ctx.listCount}`, -40, `Use ${ctx.listCount}.`);
  }

  // Fill-in junk.
  const dbl = /\b(\w+)\s+\1\b/i.exec(text);
  if (dbl && !/^(bye|ha|no|very|so|really)$/i.test(dbl[1])) add("doubled", `Doubled word: "${dbl[0]}"`, -15);
  if ((text.match(/\bapps?\b/gi) ?? []).length >= 2) add("repeat", "Says 'app' twice", -8);
  if (/\b(and|or|to|the|a|an|with|of|that|for|but)$/i.test(text.replace(/[^\w\s']+$/g, ""))) add("dangling", "Ends mid-thought", -15);
  if ((text.match(/"/g) ?? []).length % 2 || (text.match(/“/g) ?? []).length !== (text.match(/”/g) ?? []).length) add("quotes", "Unbalanced quotes", -8);
  if (/\s[,.!?]/.test(text) || /,,|\.\.(?!\.)/.test(text)) add("punct", "Stray punctuation", -5);
  if (/(^|\s)a\s+[aeiouAEIOU]\w/.test(text) && !/(^|\s)a\s+(one|u[^aeiou]|eu)/i.test(text)) add("article", "'a' before a vowel", -6);

  // Casing and decoration.
  const alpha = tokens.filter((t) => /[A-Za-z]{2,}/.test(t));
  const caps = alpha.filter((t) => /^[^a-z]*[A-Z]{2,}[^a-z]*$/.test(t) && !SAFE_CAPS.has(t.replace(/[^A-Za-z]/g, "")) && !(ctx.app && t.includes(ctx.app)));
  const titled = alpha.filter((t) => /^[A-Z]/.test(t));
  if (alpha.length >= 4 && caps.length / alpha.length > 0.6) add("caps", "ALL CAPS reads like shouting", -8, "Lowercase, with one CAPS word for emphasis.");
  else if (alpha.length >= 4 && titled.length / alpha.length >= 0.75 && profile !== "paragraph") add("titlecase", "Title Case reads like an ad headline", -10, "Write it the way you'd text it.");
  else if (caps.length >= 1 && caps.length <= 2) add("emphasis", "One CAPS word for emphasis", 4);
  const emoji = (text.match(EMOJI) ?? []).length;
  if (emoji > 3) add("emoji", `${emoji} emoji`, -6, "0–3 emoji, at the end.");
  if (/#\w/.test(text) && !/#1\b/.test(text)) add("hashtag", "Hashtags in the hook", -12, "Hashtags go in the caption.");
  if (profile !== "paragraph" && profile !== "chat" && w <= 14 && /[^.]\.$/.test(text) && !/\.\s/.test(text)) add("period", "Closing period (19 of the top 30 have none)", -2);
  if (/[^!]![^!?]*$/.test(` ${text}`) && !/\?!|!!/.test(text) && profile !== "paragraph") add("exclaim", "Exclamation mark reads like an ad", -3);

  // Profile-specific shape.
  if ((profile === "question" || profile === "quote") && !text.includes("?")) add("shape", "Should be a question", profile === "question" ? -25 : -10, "Comment replies and quoted setups land as questions.");
  if (profile === "quote" && !/^[“"]/.test(text)) add("shape", "Should be a quote", -6);

  const score = Math.max(0, Math.min(100, Math.round(32 + reasons.reduce((n, r) => n + r.delta, 0))));
  return { score, reasons, words: w, lines };
}

// ── filling + ranking ────────────────────────────────────────────────────────────

const SENTENCE_CASE = new Set(["mental-load"]);

/** All fills of one template (≤ 24), polished. Empty when a slot has nothing to say. */
export function expandTemplate(template: string, slots: Slots, extra: Record<string, string> = {}, sentenceCase = false): string[] {
  const keys = [...new Set([...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))];
  const lists = keys.map((k) => (extra[k] != null ? [extra[k]] : (slots[k] ?? []).slice(0, 4)));
  if (lists.some((l) => !l.length)) return [];
  const out = new Set<string>();
  const combos = (i: number, acc: Record<string, string>) => {
    if (out.size >= 24) return;
    if (i === keys.length) {
      let s = template.replace(/\{(\w+)\}/g, (_, k: string) => acc[k] ?? "");
      // A slot that carries its own template ({listTitle} → "{number} things…") fills one level down.
      s = s.replace(/\{(\w+)\}/g, (_, k: string) => extra[k] ?? slots[k]?.[0] ?? `{${k}}`);
      s = polish(s);
      if (sentenceCase || /^[A-Z]/.test(template)) s = s.charAt(0).toUpperCase() + s.slice(1);
      out.add(s);
      return;
    }
    for (const v of lists[i]) combos(i + 1, { ...acc, [keys[i]]: v });
  };
  combos(0, {});
  return [...out];
}

export type RankedHook = { text: string; template: string; pattern: PatternId; score: number; reasons: LintReason[] };

function lintContext(formatId: string | undefined, p: Project, slots: Slots): LintContext {
  return {
    formatId,
    app: p.name,
    listCount: formatId ? listCount(formatId, p) : undefined,
    proof: p.proof,
    concrete: [...(slots.oldWay ?? []), ...(slots.competitor ?? [])],
  };
}

/** Score a hook for a project (and optionally a format). */
export function scoreHookFor(hook: string, p: Project, formatId?: string): HookLint {
  return lintHook(hook, lintContext(formatId, p, hookSlots(p)));
}

/**
 * Every template for a format, filled every sensible way, linted and ranked (best two fills per
 * template, distinct texts). `seed` only changes {day}.
 */
export function rankHooks(formatId: string, p: Project, opts: { seed?: number; templates?: string[] } = {}): RankedHook[] {
  const slots = hookSlots(p);
  const n = listCount(formatId, p);
  const extra: Record<string, string> = { day: String(1 + ((opts.seed ?? 11) % 29)) };
  if (n != null) extra.number = String(n);
  const ctx = lintContext(formatId, p, slots);
  const entries: Entry[] = opts.templates ? opts.templates.map((t) => [patternOf(t, formatId), t]) : (BANK[formatId] ?? []);
  const seen = new Set<string>();
  const out: RankedHook[] = [];
  for (const [pattern, template] of entries) {
    if (n != null && n < 3 && template.includes("{number}")) continue;
    const fills = expandTemplate(template, slots, extra, SENTENCE_CASE.has(formatId))
      .map((text) => ({ text, ...lintHook(text, ctx) }))
      .sort((a, b) => b.score - a.score);
    let kept = 0;
    for (const f of fills) {
      const key = f.text.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(key) || f.score <= 0) continue;
      seen.add(key);
      out.push({ text: f.text, template, pattern, score: f.score, reasons: f.reasons });
      // A bare niche-line slot ("{truth}", "{line}") is a list of whole hooks: keep more of them.
      if (++kept >= (/^\{\w+\}$/.test(template) ? 4 : 2)) break;
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

function patternOf(template: string, formatId: string): PatternId {
  return (BANK[formatId] ?? []).find(([, t]) => t === template)?.[0] ?? ALL_ENTRIES.find((e) => e.t === template)?.p ?? "curiosity";
}

/** For a brief too thin to fill anything (no pains, outcomes or features yet): lines that need no slots. */
const FALLBACK: Record<string, string> = {
  "problem-solution": "me every day until someone showed me this",
  "slideshow-pov": "me every day until someone showed me this",
  "pov-demo": "POV: you finally found the app for this",
  "raw-demo": "why did nobody tell me about this sooner",
  "slideshow-listicle": "things I wish someone told me sooner",
  "three-reasons": "the app I can't stop telling people about",
  "that-girl": "small things that saved my sanity this year",
  "mental-load": "Nobody talks about how exhausting it is to do everything the hard way",
  "ditch-old-way": "When you finally stop doing it the hard way",
  "x-demo": "I made an app for this",
};

/**
 * The hook a format opens with by default. Without a seed: the top-ranked one. With a seed: one of the
 * near-best (within 8 points, ≥ 60), so a batch of videos doesn't all open the same way.
 */
export function bestHook(formatId: string, p: Project, seed?: number): string {
  const ranked = rankHooks(formatId, p, { seed });
  if (!ranked.length) return FALLBACK[formatId] ?? "why did nobody tell me about this sooner";
  if (seed == null) return ranked[0].text;
  const pool = ranked.filter((h) => h.score >= Math.max(60, ranked[0].score - 8)).slice(0, 6);
  const r = seeded(seed + hashString(formatId));
  return (pool.length ? pool : ranked)[Math.floor(r() * (pool.length || 1))].text;
}

/** Fill one template for a project (best-scoring fill); "" when the brief can't fill it. */
export function fillTemplate(template: string, p: Project, opts: { formatId?: string; extra?: Record<string, string> } = {}): string {
  const slots = hookSlots(p);
  const extra = { ...opts.extra };
  const n = opts.formatId ? listCount(opts.formatId, p) : undefined;
  if (n != null && extra.number == null) extra.number = String(n);
  if (extra.day == null) extra.day = "1";
  const ctx = lintContext(opts.formatId, p, slots);
  const fills = expandTemplate(template, slots, extra, !!opts.formatId && SENTENCE_CASE.has(opts.formatId));
  return fills.map((t) => ({ t, s: lintHook(t, ctx).score })).sort((a, b) => b.s - a.s)[0]?.t ?? "";
}

// ── the library (patterns, legacy HOOKS list for the UI / API / MCP) ─────────────

const ALL_ENTRIES: { t: string; p: PatternId; formats: string[] }[] = (() => {
  const m = new Map<string, { t: string; p: PatternId; formats: string[] }>();
  for (const [fid, entries] of Object.entries(BANK))
    for (const [p, t] of entries) {
      const e = m.get(t) ?? { t, p, formats: [] };
      e.formats.push(fid);
      m.set(t, e);
    }
  return [...m.values()];
})();

export const HOOK_PATTERNS: HookPattern[] = (Object.keys(PATTERN_META) as PatternId[]).map((id) => {
  const es = ALL_ENTRIES.filter((e) => e.p === id);
  return { id, ...PATTERN_META[id], formats: [...new Set(es.flatMap((e) => e.formats))], templates: es.map((e) => e.t).slice(0, 10) };
});

export type HookFamily = PatternId;

export type HookTemplate = {
  text: string;
  family: HookFamily;
  formats: string[];
  strength: number;
  source?: string;
  /** template = fills cleanly from any brief; example = a real hook from a real account (adapt, don't fill). */
  kind?: "template" | "example";
};

/** Rough strength per pattern for sorting the library (from the research's view counts). */
const STRENGTH: Record<PatternId, number> = {
  discovery: 5,
  "mental-load": 5,
  pov: 5,
  specific: 5,
  dialogue: 5,
  list: 4,
  contrarian: 4,
  "before-after": 4,
  confession: 4,
  identity: 4,
  proof: 4,
  curiosity: 4,
  pain: 3,
  build: 3,
};

type ResearchHook = { text: string; category?: string; format_ids?: string[]; strength?: number; source?: string };

const FAMILY_MAP: Record<string, PatternId> = {
  pov: "pov",
  curiosity: "curiosity",
  pain: "pain",
  contrarian: "contrarian",
  "social-proof": "proof",
  story: "confession",
  listicle: "list",
  challenge: "build",
  "before-after": "before-after",
  authority: "proof",
  urgency: "curiosity",
  relatable: "pov",
  "build-in-public": "build",
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
    .filter((h) => h && typeof h.text === "string" && h.text.length < 140 && h.source && h.source !== "common pattern")
    .map((h) => ({
      text: h.text,
      family: FAMILY_MAP[h.category ?? ""] ?? "curiosity",
      formats: (h.format_ids ?? []).map((f) => FORMAT_ALIASES[f] ?? f),
      strength: Math.max(1, Math.min(5, h.strength ?? 3)),
      source: h.source,
      kind: "example" as const,
    }));
}

export const HOOKS: HookTemplate[] = (() => {
  const seen = new Set<string>();
  const out: HookTemplate[] = [];
  const templates = ALL_ENTRIES.map((e) => ({ text: e.t, family: e.p, formats: e.formats, strength: STRENGTH[e.p], kind: "template" as const }));
  for (const h of [...templates, ...fromResearch()]) {
    const k = h.text.toLowerCase().replace(/[^a-z{}]/g, "");
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(h);
  }
  return out;
})();

export const HOOK_FAMILIES: { id: HookFamily; label: string; blurb: string }[] = HOOK_PATTERNS.map((p) => ({ id: p.id, label: p.name, blurb: p.rule }));

/** Only the fill-in templates (instant ideas). */
export const HOOK_TEMPLATES = HOOKS.filter((h) => h.kind === "template");
/** Real hooks from real accounts (shown in the library, given to agents as inspiration). */
export const HOOK_EXAMPLES = HOOKS.filter((h) => h.kind === "example");
