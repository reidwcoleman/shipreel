import "server-only";
import { execFile } from "node:child_process";
import fsp from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { AI_IMAGE_RULES, aiFileName } from "@/framework/carousels";
import { hashString } from "@/framework/fill";
import type { SceneInput, SlideAi, VideoSpec } from "@/remotion/spec";
import { addAsset, listAssets, setAssetRole } from "./media";
import { ensureBrollStills } from "./stills";
import { getSettings, paths, readJson, updateJson, WORKSPACE } from "./store";

const run = promisify(execFile);

/**
 * AI images and hook clips through the Higgsfield CLI (`higgsfield`, signed in by the user).
 *
 * Opt-in only (Settings → AI images). Everything is cached on disk as a project asset whose name is a
 * hash of what was asked for (`ai-<hash>.jpg`, `hookclip-<hash>.mp4`), so a photo or clip is paid for
 * once and reused by every carousel/video that asks for the same thing. Every spend is checked against
 * the estimate from `higgsfield generate cost` first and recorded in workspace/.ai-credits.json; the
 * total never goes over Settings → AI credit budget (default 25 credits).
 *
 * Prompts: invented people only, never a real person's likeness, family-friendly, no text or logos
 * in the image (AI_IMAGE_RULES), one locked look per carousel so the photos read as one camera roll.
 */

/**
 * GPT Image 2.5 (medium, ~0.5 credits): tested against Soul 2.0 (0.12) on the same locked prompts. Soul
 * returned split-panel collages and ignored "faces out of frame"; GPT Image kept one home, one light and
 * the faceless framing across all slides (what Larry/Pedro use too, research/viral/competitors.md §4).
 */
export const DEFAULT_IMAGE_MODEL = "gpt_image_2_5";
/** Image-to-video for 3 s reaction hooks: the cheapest model that animates a still well. */
export const HOOK_CLIP_MODEL = "grok_video_v15_lite";
export const DEFAULT_BUDGET = 25;

type LedgerItem = { at: string; projectId: string; kind: "image" | "clip"; model: string; credits: number; file: string; prompt: string };
type Ledger = { spent: number; items: LedgerItem[] };
const LEDGER = () => path.join(WORKSPACE, ".ai-credits.json");

export class BudgetError extends Error {}

async function hf(args: string[], timeoutMs = 60_000): Promise<string> {
  const { stdout } = await run("higgsfield", args, { timeout: timeoutMs, maxBuffer: 1 << 24 });
  return String(stdout);
}

const costCache = new Map<string, number>();
/** Credits one generation costs (from `higgsfield generate cost`, cached per model + params). */
export async function estimate(model: string, params: string[]): Promise<number> {
  const key = `${model}|${params.join(" ")}`;
  const hit = costCache.get(key);
  if (hit != null) return hit;
  const out = await hf(["generate", "cost", model, "--prompt", "estimate", ...params]);
  const n = Number(/([\d.]+)\s*credits?/i.exec(out)?.[1]);
  if (!Number.isFinite(n)) throw new Error(`couldn't read the cost: ${out.slice(0, 200)}`);
  costCache.set(key, n);
  return n;
}

const IMAGE_PARAMS = (model: string) => (model === "text2image_soul_v2" ? ["--aspect_ratio", "3:4", "--quality", "2k"] : model.startsWith("gpt_image") ? ["--aspect_ratio", "3:4", "--quality", "medium"] : ["--aspect_ratio", "3:4"]);
const CLIP_PARAMS = ["--aspect_ratio", "9:16", "--duration", "3", "--resolution", "720p"];

export type AiStatus = {
  available: boolean;
  enabled: boolean;
  model: string;
  imageCost?: number;
  clipCost?: number;
  balance?: number;
  spent: number;
  budget: number;
  error?: string;
};

/** What the Settings card shows: is the CLI signed in, what one photo / one hook clip costs, what's left. */
export async function aiStatus(): Promise<AiStatus> {
  const s = await getSettings();
  const model = s.aiImageModel || DEFAULT_IMAGE_MODEL;
  const ledger = await readJson<Ledger>(LEDGER(), { spent: 0, items: [] });
  const base = { enabled: !!s.aiImages, model, spent: +ledger.spent.toFixed(2), budget: s.aiCreditBudget ?? DEFAULT_BUDGET };
  try {
    const acct = await hf(["account", "status"], 20_000);
    const balance = Number(/([\d.]+)\s*credits/i.exec(acct)?.[1]);
    const [imageCost, clipCost] = await Promise.all([estimate(model, IMAGE_PARAMS(model)), estimate(HOOK_CLIP_MODEL, CLIP_PARAMS).catch(() => undefined)]);
    return { ...base, available: true, balance: Number.isFinite(balance) ? balance : undefined, imageCost, clipCost };
  } catch (e) {
    return { ...base, available: false, error: (e as Error).message.split("\n")[0].slice(0, 200) };
  }
}

async function spend(projectId: string, kind: LedgerItem["kind"], model: string, credits: number, file: string, prompt: string) {
  await updateJson<Ledger>(LEDGER(), { spent: 0, items: [] }, (l) => ({ spent: +(l.spent + credits).toFixed(3), items: [...l.items, { at: new Date().toISOString(), projectId, kind, model, credits, file, prompt: prompt.slice(0, 400) }].slice(-500) }));
}

async function checkBudget(credits: number) {
  const s = await getSettings();
  const budget = s.aiCreditBudget ?? DEFAULT_BUDGET;
  const ledger = await readJson<Ledger>(LEDGER(), { spent: 0, items: [] });
  if (ledger.spent + credits > budget + 1e-9) throw new BudgetError(`AI budget reached: ${ledger.spent.toFixed(2)} of ${budget} credits spent (this needs ${credits}). Raise it in Settings → AI images.`);
}

/** The first media URL in the CLI's JSON (image or video), wherever the job object keeps it. */
function resultUrl(json: string, ext: RegExp): string | undefined {
  const urls = [...json.matchAll(/https?:\/\/[^"\s\\]+/g)].map((m) => m[0]);
  return urls.find((u) => ext.test(u.split("?")[0])) ?? undefined;
}

/** Generate (or reuse) one carousel photo. Returns the asset file name. */
export async function generateImage(projectId: string, ai: Pick<SlideAi, "prompt" | "look" | "seed">, opts: { ref?: string } = {}): Promise<string> {
  const file = aiFileName(ai);
  const full = path.join(paths.assets(projectId), file);
  if (await fsp.access(full).then(() => true).catch(() => false)) return file;
  const s = await getSettings();
  if (!s.aiImages) throw new BudgetError("AI images are off (Settings → AI images).");
  const model = s.aiImageModel || DEFAULT_IMAGE_MODEL;
  const params = IMAGE_PARAMS(model);
  const credits = await estimate(model, params);
  await checkBudget(credits);
  const prompt = `${ai.look} ${ai.prompt} ${AI_IMAGE_RULES}`.replace(/\s+/g, " ").trim();
  const args = ["generate", "create", model, "--prompt", prompt, ...params, "--wait", "--wait-timeout", "6m", "--json"];
  if (ai.seed != null && model === "text2image_soul_v2") args.push("--seed", String(ai.seed));
  if (opts.ref) args.push("--image", opts.ref);
  const out = await hf(args, 7 * 60_000);
  const url = resultUrl(out, /\.(png|jpe?g|webp)$/i);
  if (!url) throw new Error(`no image in the result: ${out.slice(0, 300)}`);
  await spend(projectId, "image", model, credits, file, prompt);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  // The carousel canvas exactly: 1080×1440 JPEG.
  const jpg = await sharp(Buffer.from(await res.arrayBuffer())).resize(1080, 1440, { fit: "cover" }).jpeg({ quality: 90 }).toBuffer();
  const asset = await addAsset(projectId, file, jpg);
  return asset.file;
}

/**
 * Before a carousel renders: cache the b-roll stills, then (only with AI images on) generate the AI
 * photos its slides ask for (one locked look and seed per carousel, so they read as one camera roll).
 * Returns the updated spec, or null.
 */
export async function prepareCarousel(projectId: string, spec: VideoSpec): Promise<VideoSpec | null> {
  await ensureBrollStills(projectId).catch((e) => console.log("[stills] skipped:", (e as Error).message));
  const slides = spec.scenes.filter((s): s is Extract<VideoSpec["scenes"][number], { type: "slide" }> => s.type === "slide" && !!s.ai?.prompt);
  if (!slides.length) return null;
  const s = await getSettings();
  const have = new Set((await listAssets(projectId)).map((a) => a.file));
  let changed = false;
  for (const sc of slides) {
    const ai = sc.ai!;
    let file = have.has(aiFileName(ai)) ? aiFileName(ai) : undefined;
    if (!file && s.aiImages) {
      // Consistency comes from the locked look + one seed. A reference image was tested and rejected:
      // Soul copies the reference's pose into every slide instead of the slide's own moment.
      try {
        file = await generateImage(projectId, ai);
      } catch (e) {
        if (e instanceof BudgetError) {
          console.log("[imagegen]", e.message);
          break;
        }
        console.log("[imagegen] failed:", (e as Error).message.slice(0, 300));
        continue;
      }
    }
    if (!file) continue;
    if (sc.image !== `asset:${file}` || ai.file !== `asset:${file}`) {
      sc.image = `asset:${file}`;
      sc.background = undefined;
      ai.file = `asset:${file}`;
      changed = true;
    }
  }
  return changed ? spec : null;
}

/** A reaction hook clip prompt: an invented person, phone-camera selfie framing, one beat of disbelief. */
export function hookClipPrompts(kind: "family" | "generic", seed: number) {
  const who =
    kind === "family"
      ? ["a woman in her mid-30s with shoulder-length brown hair in a loose bun, oatmeal knit sweater, in her kitchen", "a dad in his late 30s with short dark hair and a grey t-shirt, on his couch", "a woman in her early 40s with a blonde bob and a navy striped top, in her car parked outside a school"]
      : ["a woman in her late 20s with brown hair and a cream sweater, in her bright apartment", "a man in his late 20s with curly hair and a black hoodie, at his desk"];
  const person = who[seed % who.length];
  return {
    still: `Front-camera iPhone selfie video still, vertical 9:16, of ${person}, holding the phone at arm's length and looking at the screen with raised eyebrows, mouth slightly open in surprise. Natural indoor light, real phone-camera look, slightly soft focus. ${AI_IMAGE_RULES}`,
    motion: "Handheld front-camera selfie. The person looks down at something on the screen, eyebrows shoot up, they look straight into the camera in disbelief, cover their mouth and laugh. Small natural hand shake. No text.",
  };
}

/**
 * Generate (or reuse) a 3 s AI reaction clip for the project's hook-clip library (`hookclip-<hash>.mp4`,
 * role b-roll). Formats like double-take open on these; without any, they use the real b-roll.
 */
export async function generateHookClip(projectId: string, opts: { kind: "family" | "generic"; seed: number }): Promise<string> {
  const p = hookClipPrompts(opts.kind, opts.seed);
  const file = `hookclip-${hashString(`${p.still}|${p.motion}|${opts.seed}`).toString(36)}.mp4`;
  if (await fsp.access(path.join(paths.assets(projectId), file)).then(() => true).catch(() => false)) return file;
  const s = await getSettings();
  if (!s.aiImages) throw new BudgetError("AI images are off (Settings → AI images).");
  const model = s.aiImageModel || DEFAULT_IMAGE_MODEL;
  const stillCost = await estimate(model, ["--aspect_ratio", "9:16"]);
  const clipCost = await estimate(HOOK_CLIP_MODEL, CLIP_PARAMS);
  await checkBudget(stillCost + clipCost);
  // 1) the first frame (a still of the invented person), 2) animate it.
  const stillOut = await hf(["generate", "create", model, "--prompt", p.still, "--aspect_ratio", "9:16", ...(model === "text2image_soul_v2" ? ["--seed", String(opts.seed)] : []), "--wait", "--json"], 7 * 60_000);
  const stillUrl = resultUrl(stillOut, /\.(png|jpe?g|webp)$/i);
  if (!stillUrl) throw new Error(`no still in the result: ${stillOut.slice(0, 300)}`);
  await spend(projectId, "image", model, stillCost, `${file}.still`, p.still);
  const tmp = path.join(paths.tmp(), `${file}.jpg`);
  await fsp.mkdir(paths.tmp(), { recursive: true });
  await fsp.writeFile(tmp, Buffer.from(await (await fetch(stillUrl)).arrayBuffer()));
  try {
    const clipOut = await hf(["generate", "create", HOOK_CLIP_MODEL, "--prompt", p.motion, "--start-image", tmp, ...CLIP_PARAMS, "--wait", "--wait-timeout", "12m", "--json"], 13 * 60_000);
    const url = resultUrl(clipOut, /\.(mp4|mov|webm)$/i);
    if (!url) throw new Error(`no video in the result: ${clipOut.slice(0, 300)}`);
    await spend(projectId, "clip", HOOK_CLIP_MODEL, clipCost, file, p.motion);
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const asset = await addAsset(projectId, file, buf);
    // AI renders aren't exactly 9:16, so the guess says "screen"; it's real-life-style footage.
    await setAssetRole(projectId, asset.file, "broll");
    return asset.file;
  } finally {
    await fsp.rm(tmp, { force: true });
  }
}

/** Slides in a spec that ask for an AI photo, and how many are already cached (for the UI / API). */
export async function aiNeeds(projectId: string, scenes: SceneInput[]): Promise<{ total: number; cached: number }> {
  const have = new Set((await listAssets(projectId)).map((a) => a.file));
  const asks = scenes.filter((s) => s.type === "slide" && (s as { ai?: SlideAi }).ai?.prompt) as (SceneInput & { ai: SlideAi })[];
  return { total: asks.length, cached: asks.filter((s) => have.has(aiFileName(s.ai))).length };
}
