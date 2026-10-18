#!/usr/bin/env node
/**
 * Carousel lab: build carousel (and other) specs offline from a project's brief + media, print the hook
 * (with its lint score) and every slide's text, and optionally render the stills into one contact
 * sheet per format, plus the photo-mode MP4.
 *
 *   node research/tools/lab/carousels.mjs [formatId …] [--project famsync] [--seed 3] [--render <outDir>] [--mp4] [--scale 0.4]
 *
 * No ids = every carousel format. Assets resolve through the running app (http://127.0.0.1:4747/api/media/<project>).
 */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { createJiti } from "jiti";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  if (i < 0) return d;
  const v = args[i + 1];
  args.splice(i, v === undefined || v.startsWith("--") ? 1 : 2);
  return v === undefined || v.startsWith("--") ? true : v;
};
const project = flag("project", "famsync");
const seed = Number(flag("seed", "3"));
const outDir = flag("render", "");
const mp4 = !!flag("mp4", false);
const scale = Number(flag("scale", "0.4"));
const hookArg = flag("hook", "");

const jiti = createJiti(import.meta.url, { alias: { "@": path.join(ROOT, "src"), "server-only": path.join(ROOT, "node_modules/server-only/empty.js") } });
const { buildSpec, bestHook, FORMAT_MAP } = await jiti.import(path.join(ROOT, "src/framework/formats.ts"));
const { CAROUSELS } = await jiti.import(path.join(ROOT, "src/framework/carousels.ts"));
const { scoreHookFor, rankHooks } = await jiti.import(path.join(ROOT, "src/framework/hooks.ts"));
const { normalizeSpec } = await jiti.import(path.join(ROOT, "src/remotion/spec.ts"));
const { layoutScenes } = await jiti.import(path.join(ROOT, "src/remotion/timeline.ts"));

const pdir = path.join(ROOT, "workspace/projects", project);
const proj = JSON.parse(fs.readFileSync(path.join(pdir, "project.json"), "utf8"));
const media = JSON.parse(fs.readFileSync(path.join(pdir, "assets.json"), "utf8")).map((a) => ({ file: a.file, kind: a.kind, role: a.role, width: a.width, height: a.height, durationSec: a.durationSec }));
const ids = args.length ? args : CAROUSELS.map((c) => c.id);

const BASE = "http://127.0.0.1:4747";
let serveUrl;
const specs = {};
for (const id of ids) {
  if (!FORMAT_MAP[id]) {
    console.log(`?? unknown format ${id}`);
    continue;
  }
  const hook = hookArg || bestHook(id, proj, seed);
  const lint = scoreHookFor(hook, proj, id);
  const spec = normalizeSpec({ ...buildSpec(id, { project: proj, hook, media, seed }), id: `lab-${id}` });
  specs[id] = spec;
  const dur = layoutScenes(spec.scenes).totalFrames / 30;
  console.log(`\n■ ${id}  [${lint.score}] “${hook}”  ${spec.scenes.length} slides, ${dur.toFixed(1)}s, music ${spec.audio?.src ?? "none"}`);
  const ranked = rankHooks(id, proj).slice(0, 4).map((h) => `${h.score} ${h.text}`);
  console.log(`   bank: ${ranked.join(" | ")}`);
  spec.scenes.forEach((s, i) => {
    const text = s.type === "slide" ? `${s.title ? `[${s.title}] ` : ""}${s.text}${s.sub ? `  ⟨${s.sub}⟩` : ""}` : s.type === "notes" ? `NOTES ${s.title}: ${s.items.join(" / ")}` : s.type === "chat" ? `CHAT ${s.contact}: ${s.messages.map((m) => m.text).join(" / ")}` : s.type === "media" ? `${s.caption?.text ?? ""} ${(s.lines ?? []).map((l) => l.text).join(" / ")}` : (s.text ?? "");
    const img = s.image ?? s.src ?? "";
    console.log(`   ${String(i + 1).padStart(2)} ${s.type}/${s.layout ?? s.device ?? ""} ${s.duration.toFixed(2)}s ${String(img).replace("asset:", "")}${s.ai ? " (AI)" : ""}\n      ${text.replace(/\n/g, " ⏎ ")}`);
  });
}
console.log(Object.keys(specs).length ? "" : "nothing built");

if (outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  // Own bundle folder (other tools clean $TMPDIR/remotion-webpack-bundle-* while we render).
  serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/remotion/index.ts"), publicDir: path.join(ROOT, "public"), outDir: fs.mkdtempSync(path.join(os.tmpdir(), "shipreel-lab-bundle-")) });
  const props = (spec) => ({ spec, assetBase: `${BASE}/api/media/${project}`, publicBase: "" });
  for (const [id, spec] of Object.entries(specs)) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "carousel-lab-"));
    const { timed } = layoutScenes(spec.scenes);
    const files = [];
    const full = [];
    if (spec.kind === "slideshow") {
      for (const [i, t] of timed.entries()) {
        const sc = t.scene;
        const built = sc.type === "notes" || (sc.type === "chat" && sc.layout !== "card");
        const solo = (sc.type === "slide" && sc.layout === "screenshot") || built;
        const sp = solo && spec.aspect !== "9:16" ? { ...spec, aspect: "9:16", scenes: [{ ...sc, transition: "cut" }], overlays: [], captions: undefined } : spec;
        const frame = solo && spec.aspect !== "9:16" ? (built ? t.frames - 2 : Math.round(t.frames * 0.55)) : built ? t.from + t.frames - 2 : t.from + Math.min(t.frames - 1, t.enterFrames + Math.round(t.frames * 0.55));
        const comp = await selectComposition({ serveUrl, id: "Shipreel", inputProps: props(sp), timeoutInMilliseconds: 120000 });
        const out = path.join(tmp, `${String(i + 1).padStart(2, "0")}.png`);
        await renderStill({ composition: comp, serveUrl, output: out, frame: Math.min(frame, comp.durationInFrames - 1), inputProps: props(sp), imageFormat: "png", scale: mp4 ? 1 : scale, timeoutInMilliseconds: 120000 });
        files.push(out);
        full.push(out);
      }
    } else {
      // Videos: frames across the timeline.
      const comp = await selectComposition({ serveUrl, id: "Shipreel", inputProps: props(spec), timeoutInMilliseconds: 120000 });
      const n = comp.durationInFrames;
      const times = [0, ...timed.map((t) => t.from + Math.round(t.frames * 0.5)), n - 2];
      for (const [i, f] of times.entries()) {
        const out = path.join(tmp, `${String(i).padStart(2, "0")}.png`);
        await renderStill({ composition: comp, serveUrl, output: out, frame: Math.min(f, n - 1), inputProps: props(spec), imageFormat: "png", scale, timeoutInMilliseconds: 120000 });
        files.push(out);
      }
    }
    const H = 640;
    const sheet = path.join(outDir, `${id}.jpg`);
    execFileSync("ffmpeg", ["-v", "error", "-y", ...files.flatMap((f) => ["-i", f]), "-filter_complex", `${files.map((_, i) => `[${i}]scale=-2:${H}[v${i}]`).join(";")};${files.map((_, i) => `[v${i}]`).join("")}hstack=inputs=${files.length}`, "-q:v", "3", sheet]);
    if (mp4 && spec.kind === "slideshow") {
      const { composeSlideshow } = await jiti.import(path.join(ROOT, "src/lib/server/slideshow.ts"));
      await composeSlideshow(project, spec, full, path.join(outDir, `${id}.mp4`));
    }
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`sheet ${sheet}`);
  }
  fs.rmSync(serveUrl.replace(/^file:\/\//, ""), { recursive: true, force: true });
}
process.exit(0);
