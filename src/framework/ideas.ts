/**
 * Instant ideas: hook templates × formats filled from the product brief. No AI wait — Claude/Codex
 * produce the premium versions, but this keeps the deck full in under a millisecond.
 */
import type { Idea, Platform, Project } from "@/lib/types";
import { fill, hashString, seeded, shuffle, vocab } from "./fill";
import { FORMAT_MAP, FORMATS } from "./formats";
import { HOOK_TEMPLATES, type HookTemplate } from "./hooks";
import { scoreHook } from "./score";

export type DraftIdea = Omit<Idea, "id" | "createdAt" | "status">;

function needsSatisfied(formatId: string, p: Project, hasVideo: boolean, hasImages: boolean): boolean {
  const f = FORMAT_MAP[formatId];
  if (!f) return false;
  if (f.needs.includes("real numbers") && p.proof.length === 0) return false;
  if (f.needs.includes("screen recording") && !hasVideo && !hasImages) return formatId === "hook-demo";
  return true;
}

export function instantIdeas(
  project: Project,
  opts: { count?: number; seed?: number; formats?: string[]; hasVideo?: boolean; hasImages?: boolean; avoidHooks?: string[] } = {},
): DraftIdea[] {
  const count = opts.count ?? 10;
  const r = seeded(opts.seed ?? hashString(project.id + Date.now()));
  const v = vocab(project);
  const allowed = new Set(
    (opts.formats?.length ? opts.formats : FORMATS.map((f) => f.id)).filter((id) =>
      needsSatisfied(id, project, !!opts.hasVideo, !!opts.hasImages),
    ),
  );
  const avoid = new Set((opts.avoidHooks ?? []).map((h) => h.toLowerCase()));
  const day = String(1 + Math.floor(r() * 30));
  const doubters = ["mom", "landlord", "boss", "girlfriend", "roommate", "grandma", "dad", "coach"];

  // Rank templates: strength first, with some randomness so every batch differs.
  const pool = shuffle(HOOK_TEMPLATES, r)
    .filter((h) => !h.formats.length || h.formats.some((f) => allowed.has(f)))
    .sort((a, b) => b.strength + r() * 1.5 - (a.strength + r() * 1.5));

  const out: DraftIdea[] = [];
  const usedFormats = new Map<string, number>();
  for (const h of pool) {
    if (out.length >= count) break;
    const formatId = pickFormat(h, allowed, usedFormats, r);
    if (!formatId) continue;
    const hook = fill(h.text, v, { day, doubter: doubters[Math.floor(r() * doubters.length)] });
    if (!hook || hook.includes("{") || avoid.has(hook.toLowerCase())) continue;
    if (/\b(undefined|null)\b/.test(hook)) continue;
    // Skip fills that left a hole or doubled a word ("never never", "you you", "is .").
    if (/\b(\w+) \1\b/i.test(hook) || /:\s*$|\bis\s*$|need\s*$|deleted\s*$/i.test(hook) || /\s[,.?]/.test(hook)) continue;
    if (/\{competitor\}/.test(h.text) && !v.competitor) continue;
    if (/\{metric\}/.test(h.text) && !v.metric) continue;
    if (/\{price\}/.test(h.text) && !v.price) continue;
    const fmt = FORMAT_MAP[formatId];
    const { score, checks } = scoreHook(hook);
    usedFormats.set(formatId, (usedFormats.get(formatId) ?? 0) + 1);
    avoid.add(hook.toLowerCase());
    out.push({
      formatId,
      hook,
      angle: `${fmt.name}: ${fmt.tagline.replace(/\{app\}/g, v.app)}`,
      beats: fmt.beats,
      platforms: fmt.platforms.filter((p): p is Platform => ["tiktok", "instagram", "youtube", "x", "linkedin"].includes(p)).slice(0, 3),
      caption: `${hook.replace(/[.!]$/, "")} — ${v.app}`,
      hashtags: project.hashtags.slice(0, 5),
      score: Math.round(score * 0.7 + h.strength * 6),
      scoreNotes: checks.filter((c) => !c.ok).map((c) => c.tip),
      source: "instant",
    });
  }
  return out;
}

function pickFormat(h: HookTemplate, allowed: Set<string>, used: Map<string, number>, r: () => number): string | null {
  const candidates = (h.formats.length ? h.formats : [...allowed]).filter((f) => allowed.has(f));
  if (!candidates.length) return null;
  // Prefer formats we haven't used much in this batch (variety beats repetition when exploring).
  const sorted = [...candidates].sort((a, b) => (used.get(a) ?? 0) - (used.get(b) ?? 0) + (r() - 0.5) * 0.5);
  return sorted[0];
}

/** Variations of a winner: same format/body, new hooks from other families. */
export function variationsOf(project: Project, idea: Pick<Idea, "formatId" | "hook">, n = 3, seed = Date.now()): DraftIdea[] {
  const ideas = instantIdeas(project, { count: 30, seed, formats: [idea.formatId], hasVideo: true, hasImages: true, avoidHooks: [idea.hook] });
  return ideas.slice(0, n);
}
