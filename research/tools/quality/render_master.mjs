#!/usr/bin/env node
/**
 * Research-only: renders lossless masters of existing Shipreel videos so encode experiments have a
 * pristine reference (the shipped MP4s are already CRF 18). Writes ONLY under research/tools/quality/work/.
 *
 *   node research/tools/quality/render_master.mjs v_ooybogkhgb v_bbsxzf06bm
 *
 * Per video it writes:
 *   work/master/<id>/element-XXX.png   RGB truth frames (Chrome screenshot, PNG = lossless)
 *   work/master/<id>.wav               the mixed soundtrack, uncompressed (renderMedia codec "wav")
 * Needs the Shipreel Next server on :4747 only if the spec references uploaded assets.
 */
import { bundle } from "@remotion/bundler";
import { renderFrames, renderMedia, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const WORK = path.join(HERE, "work", "master");
const ids = process.argv.slice(2);
if (!ids.length) throw new Error("pass video ids");

const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/remotion/index.ts"), publicDir: path.join(ROOT, "public") });
console.log(`bundled in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

for (const arg of ids) {
  // "<id>" renders the spec as saved; "<id>:grain=0" / "<id>:grain=1" flips theme.grain (props only, files untouched).
  const [id, flag] = arg.split(":");
  const doc = JSON.parse(fs.readFileSync(path.join(ROOT, "workspace/projects/shipreel/videos", `${id}.json`), "utf8"));
  const spec = structuredClone(doc.spec);
  let tag = id;
  if (flag?.startsWith("grain=")) {
    spec.theme = { ...spec.theme, grain: flag.endsWith("1") };
    tag = `${id}_grain${flag.endsWith("1") ? 1 : 0}`;
  }
  const inputProps = { spec, assetBase: `http://127.0.0.1:${process.env.PORT ?? 4747}/api/media/shipreel`, publicBase: "" };
  const composition = await selectComposition({ serveUrl, id: "Shipreel", inputProps });
  const outDir = path.join(WORK, tag);
  fs.mkdirSync(outDir, { recursive: true });
  const t1 = Date.now();
  await renderFrames({
    composition,
    serveUrl,
    inputProps,
    imageFormat: "png",
    outputDir: outDir,
    concurrency: 4,
    onStart: () => undefined,
    onFrameUpdate: () => undefined,
  });
  console.log(`${tag}: ${composition.durationInFrames} frames @ ${composition.fps}fps ${composition.width}x${composition.height} in ${((Date.now() - t1) / 1000).toFixed(1)}s`);
  if (tag === id) {
    await renderMedia({ composition, serveUrl, inputProps, codec: "wav", outputLocation: path.join(WORK, `${id}.wav`) });
    console.log(`${id}: wav done`);
  }
}
