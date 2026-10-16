import "server-only";
import fsp from "node:fs/promises";
import path from "node:path";
import type { AgentEngine, Idea, Project, Run } from "@/lib/types";
import { frameworkMarkdown } from "@/framework/docs";
import { buildSpec, FORMAT_MAP, FORMATS } from "@/framework/formats";
import { instantIdeas } from "@/framework/ideas";
import { scoreHook } from "@/framework/score";
import { SOUNDS } from "@/framework/sounds";
import { PLATFORMS, Scene, safeNormalizeSpec, VideoSpec } from "@/remotion/spec";
import { startRun, tryParseJson } from "./agents";
import { listAssets } from "./media";
import { addIdeas, createVideo, getProject, getVideo, listIdeas, saveVideoSpec, updateIdea, updateProject } from "./projects";
import { APP_ROOT, emit, exists, paths, WORKSPACE } from "./store";

// ── Strict JSON-schema helpers (valid for Claude --json-schema and Codex --output-schema) ──

const str = { type: "string" } as const;
const num = { type: "number" } as const;
const arr = (items: object) => ({ type: "array", items });
const obj = (properties: Record<string, object>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const nullable = (s: object) => ({ anyOf: [s, { type: "null" }] });
const oneOf = (values: readonly string[]) => ({ type: "string", enum: [...values] });

// ── Framework docs for agents ────────────────────────────────────────────────────

export async function ensureFrameworkDocs(): Promise<void> {
  await fsp.mkdir(WORKSPACE, { recursive: true });
  const md = frameworkMarkdown();
  await fsp.writeFile(path.join(WORKSPACE, "FRAMEWORK.md"), md);
  const pointer = `# Shipreel workspace\n\nThis is a Shipreel marketing workspace. Read FRAMEWORK.md before creating or editing anything here.\nThe Shipreel app lives at ${APP_ROOT} and runs at http://localhost:4747. The CLI is \`node ${path.join(APP_ROOT, "bin/shipreel.mjs")}\`.\n\nGround rules: never invent metrics or testimonials; keep hooks short and specific; videos must follow the VideoSpec in FRAMEWORK.md.\n`;
  for (const f of ["CLAUDE.md", "AGENTS.md"]) await fsp.writeFile(path.join(WORKSPACE, f), pointer);
}

export async function ensureMemory(project: Project): Promise<string> {
  const file = path.join(paths.project(project.id), "memory.md");
  if (!(await exists(file))) {
    await fsp.writeFile(
      file,
      `# ${project.name}: marketing memory\n\nShipreel and your agents append learnings here. Agents read this before generating.\n\n## Winning hooks\n\n## Dead hooks\n\n## What converted\n\n## Notes\n`,
    );
  }
  return fsp.readFile(file, "utf8");
}

export async function appendMemory(projectId: string, section: "Winning hooks" | "Dead hooks" | "What converted" | "Notes", line: string) {
  const project = await getProject(projectId);
  if (!project) return;
  const file = path.join(paths.project(projectId), "memory.md");
  let md = await ensureMemory(project);
  const header = `## ${section}`;
  const idx = md.indexOf(header);
  const entry = `- ${new Date().toISOString().slice(0, 10)}: ${line}\n`;
  if (idx === -1) md += `\n${header}\n${entry}`;
  else {
    const insertAt = md.indexOf("\n", idx) + 1;
    md = md.slice(0, insertAt) + entry + md.slice(insertAt);
  }
  await fsp.writeFile(file, md);
}

function briefForPrompt(p: Project) {
  const { id: _id, createdAt: _c, updatedAt: _u, screenshots: _s, ...rest } = p;
  return JSON.stringify(rest, null, 2);
}

async function mediaList(projectId: string) {
  const assets = await listAssets(projectId);
  return assets.map((a) => ({ file: a.file, kind: a.kind, role: a.role, width: a.width, height: a.height, durationSec: a.durationSec ? Number(a.durationSec.toFixed(1)) : undefined }));
}

// ── 1. Product brief from the codebase / URL ─────────────────────────────────────

const BRIEF_SCHEMA = obj({
  name: str,
  tagline: str,
  oneLiner: str,
  category: str,
  platforms: arr(str),
  stage: oneOf(["idea", "beta", "launched"]),
  audience: arr(obj({ name: str, description: str })),
  pains: arr(str),
  outcomes: arr(str),
  features: arr(obj({ name: str, benefit: str, wow: str })),
  differentiators: arr(str),
  proof: arr(str),
  objections: arr(str),
  tone: str,
  brand: obj({ accent: str, bg: str, fg: str }),
  links: obj({ website: nullable(str), appStore: nullable(str), playStore: nullable(str) }),
  cta: obj({ action: oneOf(["link-in-bio", "app-store", "google-play", "search", "url", "comment"]), text: str }),
  keywords: arr(str),
  hashtags: arr(str),
  competitors: arr(str),
  price: nullable(str),
  wowScreens: arr(str),
});

type Brief = {
  name: string;
  tagline: string;
  oneLiner: string;
  category: string;
  platforms: string[];
  stage: Project["stage"];
  audience: Project["audience"];
  pains: string[];
  outcomes: string[];
  features: Project["features"];
  differentiators: string[];
  proof: string[];
  objections: string[];
  tone: string;
  brand: { accent: string; bg: string; fg: string };
  links: { website: string | null; appStore: string | null; playStore: string | null };
  cta: Project["cta"];
  keywords: string[];
  hashtags: string[];
  competitors: string[];
  price: string | null;
  wowScreens: string[];
};

export async function analyzeProduct(projectId: string, opts: { engine?: AgentEngine; repoPath?: string; url?: string; notes?: string }): Promise<Run> {
  const project = await getProject(projectId);
  if (!project) throw new Error("project not found");
  const repo = opts.repoPath ?? project.links.repoPath;
  const url = opts.url ?? project.links.website ?? project.links.appStore;
  const prompt = `You are Shipreel's head of growth. Build the marketing brief for this product so we can make short-form videos (TikTok, Reels, Shorts) that sell it.

${repo ? `## Codebase\nThe product's code is at ${repo}. Read it like a marketer, not a code reviewer: README, package.json/app config, routes and screens, onboarding and paywall copy, pricing/subscription config, App Store metadata (fastlane/metadata, *.xcstrings), recent \`git log --oneline -30\`. Find what the app actually does and which screens look impressive.` : ""}
${url ? `## Web\nFetch and read ${url} (website or App Store page).` : ""}
${opts.notes || project.notes ? `## Founder notes\n${opts.notes ?? project.notes}` : ""}
## Current brief (may be empty)
${briefForPrompt(project)}

## Write the brief
- name: product name as users see it.
- tagline: ≤ 8 words, outcome-led, no hype.
- oneLiner: ≤ 18 words: what it does, for whom.
- audience: 1–3 personas with a short description each.
- pains: 4–6, first person, in the user's own words ("I keep forgetting to…"). Specific beats generic.
- outcomes: 3–5 short verb phrases a viewer wants ("never miss a workout again").
- features: 3–7, ranked by VISUAL WOW (how good it looks in a 5-second screen recording). benefit = why a user cares; wow = exactly what to show on screen.
- proof: ONLY real numbers/testimonials you found (users, revenue, ratings, press). Empty if none. Never invent.
- objections: what stops people from downloading.
- brand: hex colours from the code (tailwind config, CSS variables, asset catalog AccentColor). accent = the brand colour, bg = dark background that suits it, fg = text colour on bg.
- cta: how viewers should get it (app-store / link-in-bio / search / url) and a short CTA line that names the app.
- hashtags: ≤ 5, no # sign. competitors: names users would compare it to.
- wowScreens: the 2–4 screens/flows worth screen-recording for videos.
Respond with the JSON object only.`;

  return startRun({
    engine: opts.engine,
    kind: "analyze",
    title: `Product brief: ${project.name}`,
    projectId,
    prompt,
    addDirs: repo ? [repo] : [],
    schema: BRIEF_SCHEMA,
    allowWeb: Boolean(url),
    onResult: async ({ structured, text }) => {
      const b = (structured ?? tryParseJson(text)) as Brief | undefined;
      if (!b || typeof b !== "object" || !b.name) throw new Error("The agent didn't return a brief.");
      const isHex = (s?: string) => !!s && /^#[0-9a-f]{6}$/i.test(s);
      await updateProject(projectId, {
        name: b.name || project.name,
        tagline: b.tagline,
        oneLiner: b.oneLiner,
        category: b.category,
        platforms: b.platforms,
        stage: b.stage,
        audience: b.audience,
        pains: b.pains,
        outcomes: b.outcomes,
        features: b.features,
        differentiators: b.differentiators,
        proof: b.proof,
        tone: b.tone,
        brand: {
          ...project.brand,
          accent: isHex(b.brand?.accent) ? b.brand.accent : project.brand.accent,
          bg: isHex(b.brand?.bg) ? b.brand.bg : project.brand.bg,
          fg: isHex(b.brand?.fg) ? b.brand.fg : project.brand.fg,
        },
        links: {
          ...project.links,
          repoPath: repo ?? project.links.repoPath,
          website: b.links?.website ?? project.links.website,
          appStore: b.links?.appStore ?? project.links.appStore,
          playStore: b.links?.playStore ?? project.links.playStore,
        },
        cta: b.cta ?? project.cta,
        keywords: b.keywords,
        hashtags: (b.hashtags ?? []).map((h) => h.replace(/^#/, "")).slice(0, 5),
        competitors: b.competitors,
        price: b.price ?? undefined,
        notes: [project.notes, b.objections?.length ? `Objections: ${b.objections.join("; ")}` : "", b.wowScreens?.length ? `Record these: ${b.wowScreens.join("; ")}` : ""]
          .filter(Boolean)
          .join("\n"),
        analyzedBy: opts.engine ?? "claude",
      });
      return { projectId };
    },
  });
}

// ── 2. Ideas (the hook lab) ─────────────────────────────────────────────────────

const IDEAS_SCHEMA = obj({
  ideas: arr(
    obj({
      formatId: oneOf(FORMATS.map((f) => f.id)),
      hook: str,
      family: str,
      angle: str,
      beats: arr(str),
      platforms: arr(oneOf(PLATFORMS)),
      caption: str,
      hashtags: arr(str),
      soundTip: str,
      why: str,
    }),
  ),
});

export async function generateIdeas(projectId: string, opts: { engine?: AgentEngine | "instant"; count?: number; formats?: string[]; focus?: string }): Promise<{ run?: Run; ideas?: Idea[] }> {
  const project = await getProject(projectId);
  if (!project) throw new Error("project not found");
  const assets = await listAssets(projectId);
  const count = Math.max(1, Math.min(30, opts.count ?? 10));
  if (opts.engine === "instant") {
    const drafts = instantIdeas(project, {
      count,
      formats: opts.formats,
      hasVideo: assets.some((a) => a.kind === "video"),
      hasImages: assets.some((a) => a.kind === "image"),
      avoidHooks: (await listIdeas(projectId)).map((i) => i.hook),
    });
    return { ideas: await addIdeas(projectId, drafts) };
  }
  const memory = await ensureMemory(project);
  const existing = (await listIdeas(projectId)).slice(0, 40).map((i) => `- [${i.status}] ${i.hook}`).join("\n");
  const formats = FORMATS.filter((f) => !opts.formats?.length || opts.formats.includes(f.id))
    .map((f) => `- ${f.id}: ${f.name}. ${f.tagline} Needs: ${f.needs.join(", ")}. Beats: ${f.beats.join(" → ")}`)
    .join("\n");
  const sounds = SOUNDS.slice(0, 15).map((s) => `- ${s.title} — ${s.artist} (${s.vibe.join("/")}): ${s.howUsed}`).join("\n");
  const prompt = `You are Shipreel's hook lab. Generate ${count} short-form video ideas that will get ${project.name} installs.

## Product brief
${briefForPrompt(project)}

## Media we have
${assets.length ? assets.map((a) => `- ${a.kind}${a.role ? ` [${a.role}]` : ""}: ${a.file}${a.durationSec ? ` (${a.durationSec.toFixed(1)}s)` : ""}`).join("\n") : "- none yet (prefer formats that need nothing, or note what to record)"}

## Formats you can use (formatId must be one of these)
${formats}

## Memory (learnings — respect dead hooks, build on winners)
${memory.slice(0, 4000)}

## Already in the queue (don't repeat)
${existing || "- nothing yet"}

## Trending sounds (for soundTip)
${sounds || "- (use a mood, e.g. 'upbeat trending pop sound, drop on the reveal')"}
${opts.focus ? `\n## Focus for this batch\n${opts.focus}\n` : ""}
## Rules
- Hooks: ≤ 12 words, readable in 1.5s, curiosity first. Mix families: reveal (person + conflict + reveal, the strongest), POV, forbidden ("illegal to know"), time-shock, listicle, mistakes, build-in-public. Specific > clever. Lowercase casual is fine.
- Explore broadly: use at least 5 different formats unless told otherwise; 2–3 hook variants on the strongest body are fine.
- Never invent metrics; only use proof from the brief. Skip formats that need real numbers if there are none.
- caption: ≤ 150 chars, names the app and the outcome. hashtags ≤ 5, without #.
- beats: 3–6 lines describing exactly what's on screen.
- why: one line on why this should work for this audience.
Respond with JSON only.`;

  const run = await startRun({
    engine: opts.engine,
    kind: "ideas",
    title: `${count} ideas for ${project.name}`,
    projectId,
    prompt,
    schema: IDEAS_SCHEMA,
    onResult: async ({ structured, text }) => {
      type AgentIdea = Idea & { soundTip?: string; why?: string; family?: string };
      const data = (structured ?? tryParseJson(text)) as { ideas?: AgentIdea[] } | AgentIdea[] | undefined;
      const list: AgentIdea[] = Array.isArray(data) ? data : (data?.ideas ?? []);
      if (!list.length) throw new Error("No ideas came back.");
      const created = await addIdeas(
        projectId,
        list
          .filter((i) => i && i.hook && FORMAT_MAP[i.formatId])
          .map((i) => {
            const { score, checks } = scoreHook(i.hook);
            return {
              formatId: i.formatId,
              hook: i.hook,
              angle: i.why ? `${i.angle} — ${i.why}` : i.angle,
              beats: i.beats ?? [],
              platforms: (i.platforms ?? []).filter((p) => (PLATFORMS as readonly string[]).includes(p)),
              caption: i.caption,
              hashtags: (i.hashtags ?? []).map((h) => h.replace(/^#/, "")).slice(0, 5),
              soundId: undefined,
              score: Math.min(99, score + 8),
              scoreNotes: [i.soundTip ? `Sound: ${i.soundTip}` : "", ...checks.filter((c) => !c.ok).map((c) => c.tip)].filter(Boolean),
              source: (opts.engine ?? "claude") as "claude" | "codex",
            };
          }),
      );
      return { ideaIds: created.map((c) => c.id) };
    },
  });
  return { run };
}

// ── 3. Idea → video ──────────────────────────────────────────────────────────────

/** Validate an agent's spec scene by scene: keep good scenes, repair small things, drop the rest. */
export function coerceSpec(raw: unknown, fallback: VideoSpec): { spec: VideoSpec; warnings: string[] } {
  const warnings: string[] = [];
  const input = (raw && typeof raw === "object" && "spec" in (raw as object) ? (raw as { spec: unknown }).spec : raw) as Record<string, unknown> | undefined;
  if (!input || typeof input !== "object") return { spec: fallback, warnings: ["Agent returned no spec; kept the template version."] };
  const scenes = Array.isArray(input.scenes) ? input.scenes : [];
  const kept = scenes
    .map((s, i) => {
      const sc = { ...(s as Record<string, unknown>) };
      if (!sc.id) sc.id = `s${i + 1}`;
      if (typeof sc.duration !== "number") sc.duration = Number(sc.duration) || 2.5;
      const r = Scene.safeParse(sc);
      if (!r.success) {
        warnings.push(`Dropped scene ${i + 1} (${String(sc.type)}): ${r.error.issues[0]?.path.join(".")} ${r.error.issues[0]?.message}`);
        return null;
      }
      return r.data;
    })
    .filter(Boolean);
  // "version" is the schema version (always 1), not a revision counter; agents like to bump it.
  const candidate: Record<string, unknown> = { ...fallback, ...input, id: fallback.id, version: 1, scenes: kept.length ? kept : fallback.scenes };
  const res = safeNormalizeSpec(candidate);
  if (res.ok) return { spec: res.spec, warnings };
  // Repair field by field: any top-level field that fails goes back to its previous value, so one
  // bad overlay never throws away a good rewrite.
  const parsed = VideoSpec.safeParse(candidate);
  const bad = new Set(parsed.success ? [] : parsed.error.issues.map((i) => String(i.path[0] ?? "")));
  const repaired: Record<string, unknown> = { ...candidate };
  for (const k of bad) if (k && k !== "scenes") repaired[k] = (fallback as Record<string, unknown>)[k];
  const res2 = safeNormalizeSpec(repaired);
  if (res2.ok) return { spec: res2.spec, warnings: [...warnings, ...res.errors.slice(0, 3).map((e) => `Kept the previous ${e.split(":")[0]}`)] };
  return { spec: fallback, warnings: [...warnings, ...res.errors.slice(0, 5), "Kept the template version."] };
}

export async function ideaToVideo(projectId: string, ideaId: string, opts: { engine?: AgentEngine | "instant" } = {}): Promise<{ videoId: string; run?: Run }> {
  const project = await getProject(projectId);
  if (!project) throw new Error("project not found");
  const idea = (await listIdeas(projectId)).find((i) => i.id === ideaId);
  if (!idea) throw new Error("idea not found");
  const media = await mediaList(projectId);
  const draft = buildSpec(idea.formatId, { project, hook: idea.hook, angle: idea.angle, beats: idea.beats, media });
  draft.meta = { ...(draft.meta ?? {}), caption: idea.caption ?? draft.meta?.caption, hashtags: idea.hashtags?.length ? idea.hashtags : draft.meta?.hashtags };
  draft.ideaId = idea.id;
  const doc = await createVideo(projectId, draft, opts.engine && opts.engine !== "instant" ? opts.engine : "template");
  await updateIdea(projectId, ideaId, { status: "made", videoId: doc.id });
  if (!opts.engine || opts.engine === "instant") return { videoId: doc.id };
  const run = await improveVideo(projectId, doc.id, { engine: opts.engine, idea });
  return { videoId: doc.id, run };
}

export async function improveVideo(projectId: string, videoId: string, opts: { engine?: AgentEngine; idea?: Idea; instruction?: string }): Promise<Run> {
  const project = await getProject(projectId);
  const doc = await getVideo(projectId, videoId);
  if (!project || !doc) throw new Error("not found");
  const media = await mediaList(projectId);
  const memory = await ensureMemory(project);
  const fmt = FORMAT_MAP[doc.spec.formatId];
  const task = opts.instruction
    ? `Apply this change to the video: "${opts.instruction}". Change only what the instruction asks for, plus anything required to keep it valid. Keep scene ids stable where possible.`
    : `Turn this template draft into a great ${fmt?.name ?? "short-form"} video for ${project.name}. Rewrite every line of copy for this specific product and audience (dialogue, list items, captions, CTA). Tighten pacing (hook ≤ 2.4s, total ${fmt ? `${fmt.lengthSec[0]}–${fmt.lengthSec[1]}s` : "7–15s"}). Use the product's media where it helps (asset:<file>). Add 1–2 punch-in zooms on screen recordings at the magic moment.`;
  const prompt = `You are Shipreel's video editor. ${task}

Read ${path.join(WORKSPACE, "FRAMEWORK.md")} for the full VideoSpec reference and rules if you need it. Summary of the rules: words on frame 1, curiosity hook, never invent numbers, CTA names the app and outcome, native-looking UI cards beat polish.

## Product brief
${briefForPrompt(project)}

## Media available (reference as "asset:<file>")
${media.length ? media.map((m) => `- ${m.kind}${m.role ? ` [${m.role}]` : ""} asset:${m.file}${m.durationSec ? ` (${m.durationSec}s)` : ""}${m.width ? ` ${m.width}×${m.height}` : ""}`).join("\n") : "- none"}
${opts.idea ? `\n## The idea\nHook: ${opts.idea.hook}\nAngle: ${opts.idea.angle}\nBeats:\n${opts.idea.beats.map((b) => `- ${b}`).join("\n")}\n` : ""}
## Memory
${memory.slice(0, 2500)}

## Current spec
\`\`\`json
${JSON.stringify(doc.spec, null, 2)}
\`\`\`

Respond with the complete updated VideoSpec JSON only (same "id": "${doc.spec.id}", keep "version": 1).`;
  return startRun({
    engine: opts.engine,
    kind: opts.instruction ? "edit" : "video",
    title: opts.instruction ? `Edit: ${opts.instruction.slice(0, 50)}` : `Write video: ${doc.spec.title.slice(0, 50)}`,
    projectId,
    prompt,
    onResult: async ({ text, structured }) => {
      const raw = structured ?? tryParseJson(text);
      const { spec, warnings } = coerceSpec(raw, doc.spec);
      // Replace (not pile up) validation warnings from earlier agent passes.
      const kept = (spec.meta.notes ?? "")
        .split("\n")
        .filter((l) => l.trim() && !/^(Dropped scene|Kept the|[\w.]+: Invalid|[\w.]+: Expected)/.test(l.trim()))
        .join("\n");
      spec.meta.notes = [kept, ...warnings].filter(Boolean).join("\n") || undefined;
      await saveVideoSpec(projectId, videoId, spec);
      emit({ type: "videos", projectId });
      return { videoId };
    },
  });
}

// ── 4. Platform captions ─────────────────────────────────────────────────────────

const CAPTIONS_SCHEMA = obj({
  tiktok: str,
  instagram: str,
  youtube: str,
  x: str,
  linkedin: str,
  threads: str,
  bluesky: str,
  hashtags: arr(str),
});

export async function writeCaptions(projectId: string, videoId: string, opts: { engine?: AgentEngine } = {}): Promise<Run> {
  const project = await getProject(projectId);
  const doc = await getVideo(projectId, videoId);
  if (!project || !doc) throw new Error("not found");
  const prompt = `Write platform-native post captions for this short video about ${project.name}.

Video hook: ${doc.spec.meta.hook || doc.spec.title}
Video beats: ${doc.spec.scenes.map((s) => s.type).join(" → ")}
Brief: ${project.oneLiner} | CTA: ${project.cta.text} | Links: ${JSON.stringify(project.links)}

Rules:
- tiktok: ≤ 150 chars, casual, names the app, ends with a question or soft CTA. Hashtags go in "hashtags" (≤ 5, no #), not inline.
- instagram: 1–2 short lines + CTA ("link in bio").
- youtube: a Shorts title ≤ 70 chars (no hashtags).
- x: ≤ 240 chars, conversational, build-in-public tone if it fits.
- linkedin: 2–4 short lines, founder voice, a concrete insight, no hashtag spam.
- threads / bluesky: ≤ 280 chars, casual.
Never invent numbers. JSON only.`;
  return startRun({
    engine: opts.engine,
    kind: "captions",
    title: `Captions: ${doc.spec.title.slice(0, 40)}`,
    projectId,
    prompt,
    schema: CAPTIONS_SCHEMA,
    onResult: async ({ structured, text }) => {
      const c = (structured ?? tryParseJson(text)) as Record<string, unknown> | undefined;
      if (!c) throw new Error("No captions returned.");
      const fresh = await getVideo(projectId, videoId);
      if (!fresh) return;
      const spec = fresh.spec;
      spec.meta.captions = {
        tiktok: String(c.tiktok ?? ""),
        instagram: String(c.instagram ?? ""),
        youtube: String(c.youtube ?? ""),
        x: String(c.x ?? ""),
        linkedin: String(c.linkedin ?? ""),
        threads: String(c.threads ?? ""),
        bluesky: String(c.bluesky ?? ""),
      };
      if (Array.isArray(c.hashtags)) spec.meta.hashtags = (c.hashtags as string[]).map((h) => h.replace(/^#/, "")).slice(0, 5);
      if (!spec.meta.caption) spec.meta.caption = String(c.tiktok ?? "");
      await saveVideoSpec(projectId, videoId, spec);
      return { videoId };
    },
  });
}

// ── 5. Trend refresh (Claude + web) ─────────────────────────────────────────────

const TRENDS_SCHEMA = obj({
  sounds: arr(
    obj({
      title: str,
      artist: str,
      platforms: arr(str),
      status: oneOf(["rising", "peaking", "evergreen", "fading"]),
      vibe: arr(str),
      howUsed: str,
      link: str,
      bestFormats: arr(str),
      commercialOk: oneOf(["yes", "no", "unknown"]),
    }),
  ),
  notes: str,
});

export async function refreshTrends(opts: { engine?: AgentEngine } = {}): Promise<Run> {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Today is ${today}. Find the sounds trending RIGHT NOW (this week) on TikTok, Instagram Reels and YouTube Shorts that work for app, tech, productivity, "aesthetic slideshow" and POV content in the US. Use web search: TikTok Creative Center (Trends → Songs), this week's "trending audio" roundups (Later, Buffer, Hootsuite, Tokchart), and creator newsletters. For each sound: title, artist, platforms, status, vibe tags, how creators use it (where the drop is, which format), a link, best Shipreel formats (${FORMATS.map((f) => f.id).join(", ")}), and whether it's in TikTok's Commercial Music Library (commercialOk). 15–30 sounds. Put anything else notable (new formats, platform changes) in notes. JSON only.`;
  return startRun({
    engine: opts.engine ?? "claude",
    kind: "trends",
    title: "Refresh trending sounds",
    prompt,
    cwd: WORKSPACE,
    allowWeb: true,
    schema: TRENDS_SCHEMA,
    onResult: async ({ structured, text }) => {
      const d = (structured ?? tryParseJson(text)) as { sounds?: unknown[]; notes?: string } | undefined;
      if (!d?.sounds?.length) throw new Error("No sounds found.");
      await fsp.writeFile(path.join(WORKSPACE, "trends.json"), JSON.stringify({ refreshedAt: new Date().toISOString(), ...d }, null, 2));
    },
  });
}

// ── 6. Ask the marketing agent ───────────────────────────────────────────────────

export async function askAgent(projectId: string | undefined, question: string, opts: { engine?: AgentEngine; allowWeb?: boolean } = {}): Promise<Run> {
  const project = projectId ? await getProject(projectId) : null;
  const memory = project ? await ensureMemory(project) : "";
  const prompt = `You are the user's marketing agent inside Shipreel (a tool for marketing apps with short-form video). Be concrete and brief; give steps, hooks, or scripts they can use today. If they ask you to change files, explain what you'd change instead — this run is read-only.
${project ? `\n## Product\n${briefForPrompt(project)}\n\n## Memory\n${memory.slice(0, 3000)}\n` : ""}
## Question
${question}`;
  return startRun({
    engine: opts.engine,
    kind: "chat",
    title: question.slice(0, 60),
    projectId,
    prompt,
    addDirs: project?.links.repoPath ? [project.links.repoPath] : [],
    allowWeb: opts.allowWeb ?? true,
  });
}

// ── 7. Attribution PR (writes to the product's repo, on a branch) ───────────────

export async function attributionPR(projectId: string, opts: { engine?: AgentEngine } = {}): Promise<Run> {
  const project = await getProject(projectId);
  if (!project?.links.repoPath) throw new Error("Set the product's repo path first (Product → Links).");
  const prompt = `In the repository at ${project.links.repoPath}, add lightweight install attribution so ${project.name} can tell which videos drive installs:
1. Create and switch to a new git branch named "shipreel/attribution" (never commit to the main branch).
2. Add a one-question "How did you hear about us?" step to onboarding (or the first-run screen) with options: TikTok, Instagram, YouTube, X, Friend, App Store search, Other. Match the app's existing UI style and code conventions.
3. Store the answer where the app already stores analytics/user properties (e.g. RevenueCat attributes, PostHog, Mixpanel, Firebase, or local storage + existing backend). If there's no analytics, store it locally and log it.
4. If the app has deep links or a web landing page, capture utm_source/utm_campaign as well.
5. Run the project's typecheck/tests if they exist. Commit with a clear message. Do not push.
Finish with a short summary of what changed and how to test it.`;
  return startRun({
    engine: opts.engine,
    kind: "chat",
    title: `Attribution PR for ${project.name}`,
    projectId,
    prompt,
    cwd: project.links.repoPath,
    addDirs: [project.links.repoPath],
    allowWrite: true,
  });
}

// ── 8. Read an analytics screenshot (Claude reads images; Codex can't in exec mode) ──

const METRICS_SCHEMA = obj({
  views: nullable(num),
  likes: nullable(num),
  comments: nullable(num),
  shares: nullable(num),
  saves: nullable(num),
  profileVisits: nullable(num),
  linkTaps: nullable(num),
  notes: str,
});

export async function readMetricsScreenshot(projectId: string, postId: string, imageFile: string): Promise<Run> {
  const prompt = `Read the analytics screenshot at ${imageFile} (TikTok, Instagram, YouTube Shorts or X post analytics). Extract the numbers for this one post: views/plays, likes, comments, shares, saves/bookmarks/favorites, profile visits/views, link taps (bio link clicks). Convert "12.4K" → 12400 and "1.2M" → 1200000. Use null for anything not visible. Put anything else useful (average watch time, % watched full video, traffic sources) in notes, briefly. JSON only.`;
  return startRun({
    engine: "claude",
    kind: "chat",
    title: "Read analytics screenshot",
    projectId,
    prompt,
    cwd: path.dirname(imageFile),
    schema: METRICS_SCHEMA,
    onResult: async ({ structured, text }) => {
      const m = (structured ?? tryParseJson(text)) as Record<string, number | string | null> | undefined;
      if (!m) throw new Error("Couldn't read numbers from that screenshot.");
      const pick = (k: string) => (typeof m[k] === "number" ? (m[k] as number) : undefined);
      const { recordMetrics } = await import("./posts");
      await recordMetrics(projectId, postId, {
        views: pick("views"),
        likes: pick("likes"),
        comments: pick("comments"),
        shares: pick("shares"),
        saves: pick("saves"),
        profileVisits: pick("profileVisits"),
        linkTaps: pick("linkTaps"),
      });
      if (typeof m.notes === "string" && m.notes.trim()) await appendMemory(projectId, "Notes", `Analytics: ${m.notes.trim().slice(0, 300)}`);
    },
  });
}

// ── 9. Clone a viral video from a link ───────────────────────────────────────────

type CloneMeta = { title?: string; description?: string; track?: string; artist?: string; duration?: number; view_count?: number; like_count?: number; comment_count?: number; repost_count?: number; uploader?: string; width?: number; height?: number; webpage_url?: string };

/**
 * "Steal this format": download a TikTok/Reel/Short (yt-dlp), pull frames, and have Claude study the
 * hook, pacing, text style and sound, then rebuild it as a VideoSpec for this product.
 */
export async function cloneFromUrl(projectId: string, url: string): Promise<Run> {
  const project = await getProject(projectId);
  if (!project) throw new Error("project not found");
  if (!/^https?:\/\//.test(url)) throw new Error("Paste a link to a TikTok, Reel, Short or X video.");
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  const id = `c${Date.now().toString(36)}`;
  const dir = path.join(paths.project(projectId), "clones", id);
  await fsp.mkdir(dir, { recursive: true });

  let meta: CloneMeta;
  try {
    const { stdout } = await run("yt-dlp", ["-J", "--no-warnings", "--no-playlist", url], { maxBuffer: 1 << 26, timeout: 90_000 });
    meta = JSON.parse(stdout) as CloneMeta;
  } catch (e) {
    const msg = (e as Error).message;
    throw new Error(/ENOENT/.test(msg) ? "yt-dlp isn't installed (brew install yt-dlp)." : `Couldn't read that link: ${msg.split("\n").find((l) => /ERROR/.test(l)) ?? msg.slice(0, 160)}`);
  }
  const duration = Number(meta.duration) || 0;
  if (duration > 240) throw new Error("That video is over 4 minutes. Pick a short-form one.");
  try {
    await run("yt-dlp", ["--no-warnings", "--no-playlist", "-f", "mp4/bestvideo[height<=1280]+bestaudio/best", "--merge-output-format", "mp4", "-o", path.join(dir, "source.%(ext)s"), url], { maxBuffer: 1 << 26, timeout: 180_000 });
  } catch (e) {
    throw new Error(`Couldn't download the video: ${(e as Error).message.slice(0, 160)}`);
  }
  const source = (await fsp.readdir(dir)).find((f) => f.startsWith("source."));
  if (!source) throw new Error("The download didn't produce a video file.");
  // ~1 frame every 1.2s (max 12), plus the very first frame: the hook.
  const n = Math.max(4, Math.min(12, Math.round((duration || 12) / 1.2)));
  await run("ffmpeg", ["-v", "error", "-y", "-ss", "0.15", "-i", path.join(dir, source), "-frames:v", "1", "-vf", "scale=540:-2", path.join(dir, "f00.jpg")]);
  await run("ffmpeg", ["-v", "error", "-y", "-i", path.join(dir, source), "-vf", `fps=${n}/${Math.max(1, duration || 12)},scale=540:-2`, "-frames:v", String(n), path.join(dir, "f%02d.jpg")]).catch(() => undefined);
  const frames = (await fsp.readdir(dir)).filter((f) => /^f\d+\.jpg$/.test(f)).sort();
  await fsp.writeFile(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2));

  const media = await mediaList(projectId);
  const memory = await ensureMemory(project);
  const step = duration ? duration / n : 1.2;
  const prompt = `You are Shipreel's format scout. A short-form video went viral; study it and rebuild its FORMAT for our product. Copy the structure, hook pattern, pacing, text style and energy, never the other brand's content, footage or claims.

## The viral video
- Link: ${meta.webpage_url ?? url}
- Account: @${meta.uploader ?? "unknown"} · ${duration ? `${duration}s` : ""} · ${meta.width ?? "?"}×${meta.height ?? "?"}
- Views ${meta.view_count?.toLocaleString() ?? "?"}, likes ${meta.like_count?.toLocaleString() ?? "?"}, comments ${meta.comment_count?.toLocaleString() ?? "?"}, shares ${meta.repost_count?.toLocaleString() ?? "?"}
- Caption: ${meta.description ?? meta.title ?? ""}
- Sound: ${meta.track ?? "unknown"}${meta.artist ? ` — ${meta.artist}` : ""}

Frames (read every image; f00 is the first frame, the hook):
${frames.map((f, i) => `- ${path.join(dir, f)}${i === 0 ? " (t=0.15s)" : ` (≈ t=${((i - 1) * step + step / 2).toFixed(1)}s)`}`).join("\n")}

## Our product
${briefForPrompt(project)}

## Our media (reference as "asset:<file>")
${media.length ? media.map((m) => `- ${m.kind}${m.role ? ` [${m.role}]` : ""} asset:${m.file}`).join("\n") : "- none (use UI-card scenes: chat, notes, tweet, list, appstore, terminal…)"}

## Memory
${memory.slice(0, 1500)}

Read ${path.join(WORKSPACE, "FRAMEWORK.md")} for the VideoSpec format and the rules. Then answer with ONE JSON object:
{"analysis": {"hookPattern": "…", "whyItWorks": "…", "beats": ["…"], "textStyle": "…", "pacing": "…", "sound": "…", "closestFormat": "<one of: ${FORMATS.map((f) => f.id).join(", ")}>"},
 "spec": { a complete VideoSpec (9:16 unless the original is a photo carousel → kind "slideshow", aspect "3:4") for ${project.name}, same structure and timing as the original, our copy, never invented numbers, meta.soundTip naming the original sound if it fits }}
JSON only.`;

  return startRun({
    engine: "claude",
    kind: "video",
    title: `Clone @${meta.uploader ?? "video"} for ${project.name}`,
    projectId,
    prompt,
    cwd: paths.project(projectId),
    onResult: async ({ structured, text }) => {
      const out = (structured ?? tryParseJson(text)) as { analysis?: Record<string, unknown>; spec?: unknown } | undefined;
      if (!out) throw new Error("The agent didn't return a video.");
      const analysis = out.analysis ?? {};
      const closest = typeof analysis.closestFormat === "string" && FORMAT_MAP[analysis.closestFormat] ? analysis.closestFormat : "hook-demo";
      const fallback = safeNormalizeSpec({ ...buildSpec(closest, { project, hook: String(analysis.hookPattern ?? project.tagline ?? project.name).slice(0, 90), media }), id: "draft" });
      if (!fallback.ok) throw new Error("Couldn't build a fallback template.");
      const { spec, warnings } = coerceSpec(out.spec ?? out, fallback.spec);
      spec.formatId = FORMAT_MAP[spec.formatId] ? spec.formatId : closest;
      if (meta.track && !/original sound/i.test(meta.track) && !spec.meta.soundTip) spec.meta.soundTip = `${meta.track}${meta.artist ? ` — ${meta.artist}` : ""} (the original's sound)`;
      spec.meta.notes = [`Cloned from ${meta.webpage_url ?? url}`, typeof analysis.whyItWorks === "string" ? `Why it works: ${analysis.whyItWorks}` : "", ...warnings].filter(Boolean).join("\n");
      const { id: _draft, ...rest } = spec;
      const doc = await createVideo(projectId, rest, "claude");
      await fsp.writeFile(path.join(dir, "analysis.json"), JSON.stringify({ meta, analysis, videoId: doc.id }, null, 2));
      if (typeof analysis.hookPattern === "string") await appendMemory(projectId, "Notes", `Cloned @${meta.uploader ?? "?"} (${meta.view_count?.toLocaleString() ?? "?"} views): ${analysis.hookPattern}`.slice(0, 300));
      return { videoId: doc.id };
    },
  });
}

export { buildSpec };
