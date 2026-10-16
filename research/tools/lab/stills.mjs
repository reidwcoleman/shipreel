#!/usr/bin/env node
/**
 * Fast lab previews: render only the frames a contact sheet needs (the first half second, then
 * 10 frames across the video) for each lab format, straight from the Remotion bundle.
 *
 *   node research/tools/lab/stills.mjs <outDir> [format ...]
 */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const BASE = "http://127.0.0.1:4747";
const PROJECT = "lab-exposed";
const [outArg, ...only] = process.argv.slice(2);
const outDir = path.resolve(outArg ?? path.join(ROOT, "refs/_lab/stills"));
fs.mkdirSync(outDir, { recursive: true });
const state = JSON.parse(fs.readFileSync(path.join(ROOT, "refs/_lab", `${PROJECT}.json`), "utf8"));
const ids = only.length ? only : Object.keys(state);

const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/remotion/index.ts"), publicDir: path.join(ROOT, "public") });
for (const id of ids) {
  const t0 = Date.now();
  try {
    const doc = await (await fetch(`${BASE}/api/projects/${PROJECT}/videos/${state[id]}`)).json();
    const inputProps = { spec: doc.spec, assetBase: `${BASE}/api/media/${PROJECT}`, publicBase: "" };
    const comp = await selectComposition({ serveUrl, id: "Shipreel", inputProps, timeoutInMilliseconds: 120000 });
    const n = comp.durationInFrames;
    const open = [0, 3, 6, 9, 14];
    const across = Array.from({ length: 10 }, (_, i) => Math.round(18 + (i * (n - 22)) / 9));
    const frames = [...open, ...across].map((f) => Math.min(n - 1, f));
    const files = [];
    for (const [i, frame] of frames.entries()) {
      const out = path.join(outDir, `${id}.f${String(i).padStart(2, "0")}.jpg`);
      await renderStill({ composition: comp, serveUrl, output: out, frame, inputProps, imageFormat: "jpeg", jpegQuality: 85, scale: Number(process.env.SCALE ?? 0.25), timeoutInMilliseconds: 120000 });
      files.push(out);
    }
    execFileSync("ffmpeg", ["-v", "error", "-y", ...files.flatMap((f) => ["-i", f]), "-filter_complex", `hstack=inputs=${files.length}`, path.join(outDir, `${id}.jpg`)]);
    files.forEach((f) => fs.rmSync(f, { force: true }));
    console.log(`${id.padEnd(20)} ${((Date.now() - t0) / 1000).toFixed(1)}s  ${(n / 30).toFixed(1)}s video`);
  } catch (e) {
    console.error(`${id.padEnd(20)} FAILED ${e.message}`);
  }
}
process.exit(0);
