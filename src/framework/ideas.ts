/**
 * Instant ideas: every format's hook bank filled from the product brief, linted and ranked (hooks.ts),
 * then dealt round-robin across formats so a batch mixes bodies and patterns. No AI wait — Claude/Codex
 * produce the premium versions (and get scored by the same linter), but this keeps the deck full in
 * a few milliseconds.
 */
import type { Idea, Platform, Project } from "@/lib/types";
import { postCaption } from "./captions";
import { hashString, seeded, shuffle } from "./fill";
import { FORMAT_MAP, FORMATS } from "./formats";
import { rankHooks, type RankedHook } from "./hooks";

export type DraftIdea = Omit<Idea, "id" | "createdAt" | "status">;

function needsSatisfied(formatId: string, p: Project, hasVideo: boolean, hasImages: boolean): boolean {
  const f = FORMAT_MAP[formatId];
  if (!f) return false;
  if (f.needs.includes("real numbers") && p.proof.length === 0) return false;
  if (f.needs.includes("screen recording") && !hasVideo && !hasImages) return formatId === "hook-demo";
  return true;
}

const STATUS_BONUS = { hot: 4, steady: 0, saturated: -6 } as const;

export function instantIdeas(
  project: Project,
  opts: { count?: number; seed?: number; formats?: string[]; hasVideo?: boolean; hasImages?: boolean; avoidHooks?: string[] } = {},
): DraftIdea[] {
  const count = opts.count ?? 10;
  const seed = opts.seed ?? hashString(project.id + Date.now());
  const r = seeded(seed);
  const allowed = (opts.formats?.length ? opts.formats : FORMATS.map((f) => f.id)).filter((id) => needsSatisfied(id, project, !!opts.hasVideo, !!opts.hasImages));
  const avoid = new Set((opts.avoidHooks ?? []).map((h) => h.toLowerCase().trim()));
  const single = allowed.length === 1;

  // Each format's usable hooks, best first, with a little seeded jitter so batches differ.
  const decks = allowed
    .map((id) => {
      const fmt = FORMAT_MAP[id];
      const hooks = rankHooks(id, project, { seed })
        .filter((h) => h.score >= 55 && !avoid.has(h.text.toLowerCase()))
        .map((h) => ({ ...h, rank: h.score + STATUS_BONUS[fmt.status] + r() * 12 }))
        .sort((a, b) => b.rank - a.rank);
      return { id, hooks, top: hooks[0]?.rank ?? 0 };
    })
    .filter((d) => d.hooks.length);
  // Strongest formats first, shuffled within near-ties.
  const order = shuffle(decks, r).sort((a, b) => b.top - a.top + (r() - 0.5) * 8);

  const out: DraftIdea[] = [];
  const usedText = new Set<string>();
  const patternCount = new Map<string, number>();
  // At most ~2 per format unless there are too few formats to fill the batch.
  const rounds = single ? 40 : Math.max(2, Math.ceil(count / Math.max(1, order.length)));
  for (let round = 0; out.length < count && round < rounds; round++) {
    let added = false;
    for (const d of order) {
      if (out.length >= count) break;
      // Prefer a pattern we haven't leaned on yet in this batch.
      const pickIdx = d.hooks.findIndex((h) => !usedText.has(h.text.toLowerCase()) && (patternCount.get(h.pattern) ?? 0) < Math.max(2, Math.ceil(count / 4)));
      const h: (RankedHook & { rank: number }) | undefined = d.hooks.splice(pickIdx >= 0 ? pickIdx : 0, 1)[0];
      if (!h || usedText.has(h.text.toLowerCase())) continue;
      usedText.add(h.text.toLowerCase());
      patternCount.set(h.pattern, (patternCount.get(h.pattern) ?? 0) + 1);
      out.push(toIdea(project, d.id, h, seed));
      added = true;
    }
    if (!added) break;
  }
  return out;
}

function toIdea(project: Project, formatId: string, h: RankedHook, seed: number): DraftIdea {
  const fmt = FORMAT_MAP[formatId];
  const post = postCaption({ project, formatId, hook: h.text, seed });
  return {
    formatId,
    hook: h.text,
    angle: `${fmt.name}: ${fmt.tagline.replace(/\{app\}/g, project.name)}`,
    beats: fmt.beats,
    platforms: fmt.platforms.filter((p): p is Platform => ["tiktok", "instagram", "youtube", "x", "linkedin"].includes(p)).slice(0, 3),
    caption: post.caption,
    hashtags: post.hashtags,
    score: h.score,
    scoreNotes: h.reasons.filter((x) => x.delta < 0 && x.tip).map((x) => x.tip as string),
    source: "instant",
  };
}

/** Variations of a winner: same format/body, new hooks (other patterns first). */
export function variationsOf(project: Project, idea: Pick<Idea, "formatId" | "hook">, n = 3, seed = Date.now()): DraftIdea[] {
  const ideas = instantIdeas(project, { count: 30, seed, formats: [idea.formatId], hasVideo: true, hasImages: true, avoidHooks: [idea.hook] });
  return ideas.slice(0, n);
}
