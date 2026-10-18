/**
 * Post captions: short, native, one line that invites a comment, the app named once (the caption
 * carries the product so the on-screen hook doesn't have to), and 3–5 relevant hashtags with no
 * #fyp spam. Research: research/viral/family.md §7 and strategy.md.
 */
import type { Project } from "@/lib/types";
import { hashString, seeded } from "./fill";
import { packFor } from "./hooks";

const SPAM = new Set(["fyp", "foryou", "foryoupage", "fy", "viral", "trending", "xyzbca", "explore", "explorepage", "tiktok", "app"]);

/** A tag for the format itself, where the niche has one people search. */
const FORMAT_TAG: Record<string, string> = {
  "text-story": "textstory",
  "text-card": "textstory",
  "that-girl": "thatgirl",
  "build-in-public": "buildinpublic",
  "stakes-devlog": "devlog",
  "vibe-coded": "vibecoding",
  "founder-tweet": "buildinpublic",
  "founder-split": "founderstory",
  "reddit-roast": "buildinpublic",
  "notes-list": "lifehacks",
  "mental-load": "mentalload",
  "day-in-life": "dayinmylife",
  "app-stack": "appsyouneed",
  "rate-my-setup": "ratemysetup",
  "hot-take": "unpopularopinion",
};

const GENERIC_QS = ["tell me I'm not the only one 😭", "be honest, is this you? 👇", "what would you add? 👇"];
/** Founder / build-in-public formats talk to builders, not the niche. */
const BUILDER = new Set(["build-in-public", "money-montage", "vibe-coded", "founder-tweet", "founder-split", "reddit-roast", "stakes-devlog", "x-demo", "green-screen", "stat-shock"]);
const BUILDER_QS = ["would you use this? be honest 👇", "roast it, I can take it 👇", "what should I add next? 👇"];
/** List formats keep the hook in the caption (people search the list title). */
const HOOK_FIRST = new Set(["slideshow-listicle", "three-reasons", "notes-list", "that-girl", "feature-carousel", "app-stack", "wish-i-knew", "mistakes-list"]);

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/s$/, "");

/** "FamSync is free on the App Store" stays; "Download now" → "FamSync: download now"; empty → "it's called FamSync". */
export function productLine(p: Project): string {
  const app = p.name;
  const cta = (p.cta.text || "").trim().replace(/[.!]+$/, "");
  if (!cta || /^link in bio$/i.test(cta)) return `it's called ${app}`;
  return new RegExp(`\\b${app.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(cta) ? cta : `${app}: ${cta.charAt(0).toLowerCase()}${cta.slice(1)}`;
}

export function postCaption(o: { project: Project; formatId?: string; hook: string; seed?: number; custom?: string }): { caption: string; hashtags: string[] } {
  const p = o.project;
  const pack = packFor(p);
  const r = seeded((o.seed ?? 0) + hashString(`${o.formatId ?? ""}|${o.hook}`));
  let caption: string;
  if (o.custom) {
    caption = o.custom.trim();
    // The caption names the app (before any inline hashtags).
    if (!caption.toLowerCase().includes(p.name.toLowerCase())) {
      const at = caption.search(/\s#[a-z]/i);
      caption = at > 0 ? `${caption.slice(0, at)} (${p.name})${caption.slice(at)}` : `${caption} (${p.name})`;
    }
  } else {
    const qs = BUILDER.has(o.formatId ?? "") ? BUILDER_QS : pack?.captionQs.length ? pack.captionQs : GENERIC_QS;
    const q = qs[Math.floor(r() * qs.length)];
    const hook = o.hook.replace(/\*/g, "").replace(/\\n|\n/g, " ").replace(/\s+/g, " ").trim();
    // Lead with the feeling (a question people answer in the comments); list titles stay for search.
    const lead = HOOK_FIRST.has(o.formatId ?? "") && hook.length <= 70 && /^\d/.test(hook) ? `${hook.replace(/[.!]+$/, "")}${/[?…]$/.test(hook) ? "" : "."} ${q}` : q;
    caption = `${lead} (${productLine(p)})`;
    if (caption.length > 150) caption = `${q} (${productLine(p)})`;
  }
  const inline = [...caption.matchAll(/#([a-z][\w]*)/gi)].map((m) => m[1].toLowerCase());
  const seen = new Set(inline.map(norm));
  const own = p.hashtags.map((h) => h.replace(/^#/, "").toLowerCase());
  const niche = pack?.tags ?? [];
  const pool: string[] = [];
  // Feeling posts lead with the niche's tags (#mentalload); product posts with the brief's own (#familycalendar).
  const feeling = ["mental-load", "text-wall", "backdrop-pov", "setup-receipts", "text-card", "text-story", "talking-head"].includes(o.formatId ?? "");
  if (feeling) pool.push(...niche.slice(0, 2), ...own, ...niche.slice(2));
  else pool.push(...own.slice(0, 3), ...niche.slice(0, 1), ...own.slice(3), ...niche.slice(1));
  if (o.formatId && FORMAT_TAG[o.formatId]) pool.splice(BUILDER.has(o.formatId) ? 0 : 2, 0, FORMAT_TAG[o.formatId]);
  pool.push(p.name.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const room = Math.max(0, 5 - inline.length);
  const hashtags: string[] = [];
  for (const t of pool) {
    if (hashtags.length >= room) break;
    if (!t || SPAM.has(t) || seen.has(norm(t))) continue;
    seen.add(norm(t));
    hashtags.push(t);
  }
  return { caption, hashtags };
}
