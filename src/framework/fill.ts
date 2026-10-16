import type { Project } from "@/lib/types";

/** Deterministic PRNG so instant ideas are stable per seed. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function pick<T>(arr: readonly T[], r: () => number, fallback?: T): T {
  if (!arr.length) return fallback as T;
  return arr[Math.floor(r() * arr.length) % arr.length];
}

export function shuffle<T>(arr: readonly T[], r: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const lc = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);
const stripEnd = (s: string) => s.replace(/[.!?]+$/, "").trim();

/** Everything a template can say about the product, with sensible fallbacks. */
export function vocab(p: Project) {
  const name = p.name || "my app";
  const audience = p.audience[0]?.name || "busy people";
  const pains = p.pains.length ? p.pains.map(stripEnd) : [`I waste hours on things ${name} does in seconds`];
  // Outcomes complete "I finally ___" (base-form verb phrase).
  const outcomes = (p.outcomes.length ? p.outcomes : [p.oneLiner ? stripEnd(p.oneLiner) : `get it done in seconds`])
    .map(stripEnd)
    .map((o) => o.replace(/^(to|you|i)\s+/i, ""));
  const features = p.features.length ? p.features : [{ name: "the main feature", benefit: outcomes[0] }];
  const competitor = p.competitors[0] || "";
  // What the app does, third person: "texts you when you skip the gym".
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const doesRaw = p.oneLiner ? stripEnd(p.oneLiner).replace(new RegExp(`^${escaped}\\s+(is\\s+an?\\s+app\\s+that\\s+|helps\\s+)?`, "i"), "") : "";
  // Keep it hook-length: cut at the first comma / "so" clause.
  // Hooks that work are 5–9 words, so stop at the first comma / "so" / "and the" clause.
  const doesShort = shortenDoes(doesRaw);
  const does = doesShort && doesRaw !== stripEnd(p.oneLiner ?? "") ? lc(doesShort) : `helps you ${lc(outcomes[0])}`;
  return {
    app: name,
    audience: lc(audience),
    pain: lc(pains[0]),
    pains: pains.map(lc),
    painYou: lc(toYou(pains[0])),
    outcome: lc(outcomes[0]),
    outcomes: outcomes.map(lc),
    does,
    feature: features[0].name,
    features,
    competitor,
    oneLiner: p.oneLiner ? stripEnd(p.oneLiner) : `${name} ${does}`,
    tagline: p.tagline || p.oneLiner || name,
    price: p.price || "",
    number: String(Math.max(3, Math.min(7, features.length + 2))),
    timeframe: "30 days",
    metric: p.proof[0] || "",
  };
}

export type Vocab = ReturnType<typeof vocab>;

/** Fill {placeholders}. Unknown ones are dropped gracefully. */
export function fill(template: string, v: Vocab, extra: Record<string, string> = {}): string {
  const map: Record<string, string> = {
    app: v.app,
    audience: v.audience,
    pain: v.pain,
    painYou: v.painYou,
    does: v.does,
    outcome: v.outcome,
    feature: v.feature,
    competitor: v.competitor,
    number: v.number,
    timeframe: v.timeframe,
    price: v.price,
    metric: v.metric,
    doubter: "mom",
    day: "1",
    ...extra,
  };
  return template
    .replace(/\{(\w+)\}/g, (_, k: string) => map[k] ?? "")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** First-person pain → "you" framing: "I forget to drink water" → "you forget to drink water". */
export function toYou(s: string): string {
  return s
    .replace(/\bI am\b/gi, "you're")
    .replace(/\bI'm\b/gi, "you're")
    .replace(/\bI\b/g, "you")
    .replace(/\bmy\b/gi, "your")
    .replace(/\bme\b/gi, "you")
    .replace(/\bmyself\b/gi, "yourself");
}

/** Short enough to sit on one or two lines of a vertical video. */
export function short(s: string, max = 60): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 20 ? cut.lastIndexOf(" ") : max).trim()}…`;
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * "puts the whole family's calendar, chores, groceries, meals and pickups in one app, with Foxy…" →
 * "puts the whole family's calendar, chores and meals in one app". Cuts at the first clause break, but a
 * comma that starts a list keeps the list (trimmed to three items) and what follows it.
 */
export function shortenDoes(raw: string): string {
  const breakRe = /\s+so\s+|\s+—\s+|\s+-\s+|\s+and\s+(?=the|you|then|it)\b|\s+which\s+|,\s+(?=(?:with|so|which|because|while|and then|even|without|plus)\b)/;
  let head = raw.split(breakRe)[0].trim();
  const parts = head.split(/,\s*/);
  if (parts.length > 1) {
    // A list: the items after the first comma are short noun phrases, the last one joined with "and".
    const last = parts[parts.length - 1];
    const andIdx = last.search(/\s+(?:and|&)\s+/);
    const isList = parts.slice(1, -1).every((x) => x.split(/\s+/).length <= 3) && andIdx >= 0;
    if (isList) {
      const [lastItem, tail] = (() => {
        const after = last.slice(andIdx).replace(/^\s+(?:and|&)\s+/, "");
        const m = /^(\S+(?:\s+\S+)?)(\s+(?:in|on|into|for|from|with|at)\b.*)?$/.exec(after);
        return m ? [m[1], m[2] ?? ""] : [after, ""];
      })();
      const items = [parts[0], ...parts.slice(1, -1), last.slice(0, andIdx).trim()].filter(Boolean);
      const keep = items.length > 2 ? [items[0], items[1]] : items.slice(0, 1);
      head = `${keep.join(", ")} and ${lastItem}${tail}`.replace(/\s+/g, " ").trim();
    } else head = parts[0].trim();
  }
  return head;
}
