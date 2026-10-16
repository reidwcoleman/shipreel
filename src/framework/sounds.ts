/**
 * Trending sounds library. Seeded from research (./data/sounds.json); the "Refresh trends" agent
 * writes workspace/trends.json, which the server merges on top (newest wins).
 * Shipreel never bundles copyrighted tracks: sounds are references you add in-app when you post
 * a TikTok draft, or files you import yourself.
 */
import researchSounds from "./data/sounds.json";

export type Sound = {
  id: string;
  title: string;
  artist: string;
  platforms: string[];
  status: "rising" | "peaking" | "evergreen" | "fading";
  vibe: string[];
  bpm?: number | null;
  energy?: number;
  bestFormats: string[];
  howUsed: string;
  dropAtSec?: number | null;
  link?: string;
  usageCount?: string;
  commercialOk: "yes" | "no" | "unknown";
  source?: string;
  asOf?: string;
};

type RawSound = Record<string, unknown>;

const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const arr = (v: unknown) => (Array.isArray(v) ? v.map(s).filter(Boolean) : typeof v === "string" && v ? [v] : []);

export function normalizeSound(r: RawSound, i = 0): Sound | null {
  const title = s(r.title);
  if (!title) return null;
  const status = s(r.status) as Sound["status"];
  const ok = r.commercial_ok ?? r.commercialOk;
  return {
    id: s(r.id) || `${title}-${s(r.artist)}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60) || `sound-${i}`,
    title,
    artist: s(r.artist) || "Unknown",
    platforms: arr(r.platforms),
    status: ["rising", "peaking", "evergreen", "fading"].includes(status) ? status : "rising",
    vibe: arr(r.vibe),
    bpm: typeof r.bpm === "number" ? r.bpm : null,
    energy: typeof r.energy === "number" ? r.energy : undefined,
    bestFormats: arr(r.best_formats ?? r.bestFormats),
    howUsed: s(r.how_used ?? r.howUsed),
    dropAtSec: typeof (r.drop_at_sec ?? r.dropAtSec) === "number" ? ((r.drop_at_sec ?? r.dropAtSec) as number) : null,
    link: s(r.link) || undefined,
    usageCount: s(r.usage_count ?? r.usageCount) || undefined,
    commercialOk: ok === true || ok === "true" || ok === "yes" ? "yes" : ok === false || ok === "false" || ok === "no" ? "no" : "unknown",
    source: s(r.source) || undefined,
    asOf: s(r.as_of ?? r.asOf) || undefined,
  };
}

export const SOUNDS: Sound[] = ((researchSounds as unknown as RawSound[]) ?? [])
  .map((r, i) => normalizeSound(r, i))
  .filter((x): x is Sound => !!x);

export const VIBES = ["hype", "chill", "emotional", "funny", "suspense", "cinematic", "nostalgic", "aesthetic", "motivational"];
