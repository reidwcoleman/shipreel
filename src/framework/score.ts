/**
 * The launch check: a fast, explainable virality score for a hook or a whole video, based on the
 * rules app marketers repeat most (hook in the first second, short, specific, curiosity, proof,
 * readable text in the safe zone, a CTA, a sound).
 */
import type { VideoSpec } from "@/remotion/spec";
import { totalDurationSeconds } from "@/remotion/timeline";
import { FORMAT_MAP } from "./formats";

export type Check = { id: string; label: string; ok: boolean; weight: number; tip: string };

const CURIOSITY = /\b(why|how|secret|nobody|no one|illegal|wish|stop|never|actually|finally|this|until|what happened|pov|wait|imagine|you('| a)re|realized)\b/i;
const SPECIFIC = /\d|\$|%/;
const YOU = /\b(you|your|pov|me|my|i)\b/i;
const HYPE = /\b(revolutionary|game.?changer|cutting.?edge|seamless|leverage|synergy|innovative|best app ever)\b/i;

export function scoreHook(hook: string): { score: number; checks: Check[] } {
  const text = hook.replace(/\*/g, "").replace(/\\n|\n/g, " ").trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const checks: Check[] = [
    { id: "length", label: "Readable in ~1.5s (4–12 words)", ok: words >= 3 && words <= 12, weight: 25, tip: words > 12 ? "Cut it down: the hook should be readable before the thumb moves." : "Add a bit more context so it makes sense cold." },
    { id: "curiosity", label: "Opens a curiosity gap", ok: CURIOSITY.test(text) || text.includes("?"), weight: 25, tip: "Tease an outcome without explaining it (why/how/nobody/finally/POV…)." },
    { id: "personal", label: "Talks to one person", ok: YOU.test(text), weight: 15, tip: "Use 'you', 'I' or POV framing instead of describing a product." },
    { id: "specific", label: "Has something specific", ok: SPECIFIC.test(text) || words >= 6, weight: 15, tip: "Numbers, timeframes and concrete nouns beat adjectives." },
    { id: "no-hype", label: "No ad-speak", ok: !HYPE.test(text), weight: 20, tip: "Words like 'revolutionary' or 'seamless' scream ad. Say what it does." },
  ];
  return { score: sum(checks), checks };
}

/** `proof`: the brief's real numbers. Without any, store-card ratings or a chart rank can't be real. */
export function scoreVideo(spec: VideoSpec, ctx: { proof?: string[] } = {}): { score: number; checks: Check[] } {
  const dur = totalDurationSeconds(spec);
  const fmt = FORMAT_MAP[spec.formatId];
  const [minLen, maxLen] = fmt?.lengthSec ?? [7, 30];
  const first = spec.scenes[0];
  const firstHasText =
    !!first &&
    (["hook", "slide", "kinetic", "list", "stat", "comment", "notes", "chat", "tweet", "reddit", "notifications"].includes(first.type) ||
      ("caption" in first && !!first.caption) ||
      spec.overlays.some((o) => o.type === "text" && o.start <= 0.3));
  const hasCta = spec.scenes.some((s) => s.type === "cta") || /link in bio|download|search|app store/i.test(JSON.stringify(spec.scenes.at(-1) ?? {}));
  const hook = spec.meta.hook || ("text" in (first ?? {}) ? String((first as { text?: string }).text ?? "") : "");
  const hookScore = scoreHook(hook || spec.title).score;
  // Scene notes that mark placeholder proof ("Use your real numbers", "payments you actually received"),
  // not every note that says "real" ("rebuild for a real demo").
  const PLACEHOLDER = /\b(real|actual)(ly)? (numbers?|revenue|users?|payments?|comments?|reviews?|results?|stats?|metrics?|screenshots?)\b|made.?up|actually received|\bfake\b|placeholder/i;
  const notes = spec.scenes.filter((s) => s.note && PLACEHOLDER.test(s.note));
  const storeNumbers = !ctx.proof?.length && spec.scenes.some((s) => s.type === "appstore" && (s.rating != null || !!s.ratings || !!s.chart));
  const checks: Check[] = [
    { id: "first-frame", label: "Hook text on the very first frame", ok: firstHasText, weight: 20, tip: "Put words on screen in frame 1. Viewers decide in under a second." },
    { id: "hook", label: "Strong hook copy", ok: hookScore >= 65, weight: 20, tip: "Run the hook through the hook doctor: shorter, more specific, curiosity first." },
    { id: "short-open", label: "Opening beat under 3.5s", ok: (first?.duration ?? 9) <= 3.5 || first?.type === "chat" || first?.type === "media", weight: 10, tip: "Hooks that work stay up 2.3–4s; longer static openers bleed viewers. Trim it or add motion." },
    { id: "length", label: `Length in the sweet spot (${minLen}–${maxLen}s)`, ok: dur >= minLen - 1 && dur <= maxLen + 2, weight: 15, tip: `This is ${dur.toFixed(1)}s. ${dur > maxLen ? "Trim slow beats." : "Add one more beat of payoff."}` },
    { id: "cta", label: "Clear next step at the end", ok: hasCta, weight: 10, tip: "End on where to get it: link in bio, search the name, or comment for the link." },
    { id: "sound", label: "Has a sound plan", ok: !!spec.audio?.src || !!spec.audio?.soundId || !!spec.meta.soundTip || !!spec.voiceover, weight: 10, tip: "Pick a trending sound (or post as a draft and add one in-app)." },
    {
      id: "honest",
      label: "Numbers are real",
      ok: notes.length === 0 && !storeNumbers,
      weight: 15,
      tip: storeNumbers
        ? "The App Store card shows ratings or a chart rank, but the brief has no proof. Clear them, or add your real numbers to the brief."
        : "Replace placeholder numbers with real ones (marked scenes) before posting.",
    },
  ];
  return { score: sum(checks), checks };
}

function sum(checks: Check[]) {
  const total = checks.reduce((n, c) => n + c.weight, 0);
  return Math.round((checks.reduce((n, c) => n + (c.ok ? c.weight : 0), 0) / total) * 100);
}
