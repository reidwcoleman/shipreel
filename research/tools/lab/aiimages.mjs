#!/usr/bin/env node
/**
 * AI image lab (spends Higgsfield credits only when Settings → AI images is on, within the budget).
 *
 *   node research/tools/lab/aiimages.mjs prompts [formatId] [--project famsync]   print the AI prompts a carousel asks for
 *   node research/tools/lab/aiimages.mjs generate [formatId] [--project famsync]  generate + cache them (src/lib/server/imagegen.ts)
 *   node research/tools/lab/aiimages.mjs clip [--project famsync] [--seed 1]      one 3 s AI reaction hook clip for the library
 *   node research/tools/lab/aiimages.mjs status                                    signed in? cost per image/clip, spent / budget
 */
import { createJiti } from "jiti";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
process.chdir(ROOT);
const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  if (i < 0) return d;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const project = flag("project", "famsync");
const seed = Number(flag("seed", "3"));
const [cmd = "status", formatId = "photo-story"] = args;
const jiti = createJiti(import.meta.url, { alias: { "@": path.join(ROOT, "src"), "server-only": path.join(ROOT, "node_modules/server-only/empty.js") } });
const { buildSpec, bestHook } = await jiti.import(path.join(ROOT, "src/framework/formats.ts"));
const { AI_IMAGE_RULES, aiFileName } = await jiti.import(path.join(ROOT, "src/framework/carousels.ts"));
const { normalizeSpec } = await jiti.import(path.join(ROOT, "src/remotion/spec.ts"));
const img = await jiti.import(path.join(ROOT, "src/lib/server/imagegen.ts"));
const pdir = path.join(ROOT, "workspace/projects", project);
const proj = JSON.parse(fs.readFileSync(path.join(pdir, "project.json"), "utf8"));
const media = JSON.parse(fs.readFileSync(path.join(pdir, "assets.json"), "utf8"));
const spec = () => normalizeSpec({ ...buildSpec(formatId, { project: proj, hook: bestHook(formatId, proj, seed), media, seed }), id: "lab" });

if (cmd === "status") console.log(await img.aiStatus());
else if (cmd === "prompts") for (const s of spec().scenes.filter((x) => x.ai)) console.log(`${aiFileName(s.ai)}  seed ${s.ai.seed}\n  ${s.ai.look} ${s.ai.prompt} ${AI_IMAGE_RULES}\n`);
else if (cmd === "generate") {
  const t0 = Date.now();
  const out = await img.prepareCarousel(project, spec());
  console.log(out ? out.scenes.filter((s) => s.ai).map((s) => s.image).join("\n") : "nothing generated");
  console.log(`${((Date.now() - t0) / 1000).toFixed(0)}s`, await img.aiStatus());
} else if (cmd === "clip") console.log(await img.generateHookClip(project, { kind: "family", seed }), await img.aiStatus());
process.exit(0);
