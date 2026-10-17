/**
 * The launch check: a fast, explainable virality score for a hook or a whole video, based on the
 * rules app marketers repeat most (hook in the first second, short, specific, curiosity, proof,
 * readable text in the safe zone, a CTA, a sound).
 */
import type { VideoSpec } from "@/remotion/spec";
import { totalDurationSeconds } from "@/remotion/timeline";
import { FORMAT_MAP } from "./formats";
import { lintHook, type LintContext } from "./hooks";

export type Check = { id: string; label: string; ok: boolean; weight: number; tip: string };

/**
 * The hook linter from hooks.ts, as launch-check rows: each reason becomes a check (ok when it adds
 * points, with its tip when it costs them). `ctx` makes it format- and brief-aware.
 */
export function scoreHook(hook: string, ctx: LintContext = {}): { score: number; checks: Check[] } {
  const lint = lintHook(hook, ctx);
  const checks: Check[] = lint.reasons
    .filter((r) => r.delta !== 0 || r.tip)
    .map((r) => ({ id: r.id, label: r.label, ok: r.delta > 0, weight: Math.abs(r.delta), tip: r.tip ?? "" }));
  return { score: lint.score, checks };
}

/** `proof`: the brief's real numbers. Without any, store-card ratings or a chart rank can't be real. */
export function scoreVideo(spec: VideoSpec, ctx: { proof?: string[]; app?: string } = {}): { score: number; checks: Check[] } {
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
  const hookScore = scoreHook(hook || spec.title, { formatId: spec.formatId, proof: ctx.proof, app: ctx.app }).score;
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
