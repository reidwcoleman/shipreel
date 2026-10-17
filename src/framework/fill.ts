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
  return polish(template.replace(/\{(\w+)\}/g, (_, k: string) => map[k] ?? ""));
}

/** First-person pain → "you" framing: "I forget to drink water" → "you forget to drink water", "our family…" → "your family…". */
export function toYou(s: string): string {
  return s
    .replace(/\bI am\b/gi, "you're")
    .replace(/\bI'm\b/gi, "you're")
    .replace(/\bI was\b/g, "you were")
    .replace(/\bwe're\b/gi, "you're")
    .replace(/\bwe were\b/gi, "you were")
    .replace(/\bI\b/g, "you")
    .replace(/\bwe\b/gi, "you")
    .replace(/\bmy\b/gi, "your")
    .replace(/\bour\b/gi, "your")
    .replace(/\bmine\b/gi, "yours")
    .replace(/\bours\b/gi, "yours")
    .replace(/\b(me|us)\b/gi, "you")
    .replace(/\b(myself|ourselves)\b/gi, "yourself");
}

/** Second-person outcome → first person: "get your evenings back" → "get my evenings back". */
export function toMe(s: string): string {
  return s
    .replace(/\byou're\b/gi, "I'm")
    .replace(/\byour\b/gi, "my")
    .replace(/\byours\b/gi, "mine")
    .replace(/\byourself\b/gi, "myself")
    .replace(/^you\b/i, "I")
    .replace(/\byou\b/gi, "me");
}

const IRREGULAR_PAST: Record<string, string> = {
  be: "was", get: "got", know: "knew", find: "found", make: "made", keep: "kept", take: "took", run: "ran", go: "went", have: "had",
  feel: "felt", sleep: "slept", spend: "spent", read: "read", write: "wrote", eat: "ate", pay: "paid", lose: "lost", quit: "quit",
  put: "put", set: "set", buy: "bought", think: "thought", sit: "sat", win: "won", meet: "met", begin: "began", build: "built",
  hit: "hit", cut: "cut", stop: "stopped", plan: "planned", drop: "dropped", skip: "skipped", ditch: "ditched", fix: "fixed",
  beat: "beat", break: "broke", leave: "left", say: "said", tell: "told", see: "saw", do: "did", give: "gave", forget: "forgot",
};
const DOUBLE_ING = new Set(["stop", "get", "run", "plan", "forget", "skip", "sit", "put", "set", "begin", "swim", "shop", "drop", "quit", "cut", "win", "hit", "jog", "chat", "prep"]);

/** "stop being late" → "stopped being late" (only the first verb changes). */
export function pastOf(phrase: string): string {
  // "never miss a pickup" → "never missed a pickup": conjugate the verb after a leading adverb.
  const adv = /^(never|finally|always|actually|just|really|still|now|also)\s+/i.exec(phrase);
  if (adv) return adv[0] + pastOf(phrase.slice(adv[0].length));
  const [v, ...rest] = phrase.split(" ");
  const low = v.toLowerCase();
  const past = IRREGULAR_PAST[low] ?? (/e$/.test(low) ? `${low}d` : /[^aeiou]y$/.test(low) ? `${low.slice(0, -1)}ied` : `${low}ed`);
  return [past, ...rest].join(" ");
}

/** "stop being late" → "stopping being late"; "be the only one" → "being the only one". */
export function gerundOf(phrase: string): string {
  const [v, ...rest] = phrase.split(" ");
  const low = v.toLowerCase();
  const ing =
    low === "be" ? "being" : DOUBLE_ING.has(low) ? `${low}${low.slice(-1)}ing` : /ie$/.test(low) ? `${low.slice(0, -2)}ying` : /[^e]e$/.test(low) && low !== "be" ? `${low.slice(0, -1)}ing` : `${low}ing`;
  return [ing, ...rest].join(" ");
}

function needsAn(word: string): boolean {
  const w = word.toLowerCase();
  if (/^(one|once|u[^aeiou][aeiou]|use|usu|uni|eu|ure)/.test(w)) return false;
  if (/^(hour|honest|honou?r|heir)/.test(w)) return true;
  return /^[aeiou]/.test(w);
}

/** Words that can repeat on purpose ("bye bye", "no no no"). */
const REPEATABLE = new Set(["bye", "ha", "no", "very", "so", "really", "la", "go"]);

/**
 * Make a filled template read like a person typed it: no doubled words ("the the", "just just"),
 * "a" → "an" before a vowel sound, no space before punctuation, no dangling "and"/"the"/":" at the end,
 * balanced quotes, and no "??." pile-ups.
 */
export function polish(raw: string): string {
  let s = raw.replace(/\s+/g, " ").trim();
  s = s.replace(/\b(\w+)(\s+\1\b)+/gi, (m, w: string) => (REPEATABLE.has(w.toLowerCase()) ? m : w));
  // Only the article: lowercase "a", or "A" opening a sentence ("type A and" stays).
  s = s.replace(/(^|[.?!]\s+|[\s(“"])([Aa]) ([A-Za-z][\w']*)/g, (m, pre: string, a: string, w: string) =>
    (a === "a" || /^$|[.?!]\s+$/.test(pre)) && needsAn(w) ? `${pre}${a}n ${w}` : m,
  );
  s = s.replace(/\s+([,.!?…:;])/g, "$1").replace(/([,;:])(?=\S)(?![\d/])/g, "$1 ");
  s = s.replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
  s = s.replace(/([?!])\.+$/g, "$1").replace(/\.{2}(?!\.)/g, ".").replace(/,\s*([.?!])/g, "$1");
  // Dangling ends left by an empty slot.
  for (let i = 0; i < 3; i++) s = s.replace(/[\s,;:—–-]+$/g, "").replace(/\s+(and|or|to|the|a|an|with|of|that|for|but|so|because|when)$/i, "");
  // Balance straight and curly double quotes.
  if ((s.match(/"/g) ?? []).length % 2 === 1) s = s.replace(/"/g, "");
  if ((s.match(/“/g) ?? []).length !== (s.match(/”/g) ?? []).length) s = s.replace(/[“”]/g, "");
  return s.trim();
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
