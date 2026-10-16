#!/usr/bin/env node
/**
 * Remotion 4.0.535 lab benchmark for research/motion/remotion.md.
 *   node bench.mjs [group ...]     groups: env, render, blur, transitions, devices, probes, all (default)
 * Re-uses Shipreel's downloaded Chrome Headless Shell (Remotion build 157) so nothing is downloaded.
 * Writes results.json next to this file and media into ./out (delete it when done).
 */
import { bundle } from "@remotion/bundler";
import { renderFrames, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, "out");
const RESULTS = path.join(ROOT, "results.json");
const BROWSER =
  process.env.REMOTION_BROWSER ??
  path.resolve(ROOT, "../../../node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell");
const REPS = Number(process.env.REPS ?? 2);
fs.mkdirSync(OUT, { recursive: true });

const groups = new Set(process.argv.slice(2).length ? process.argv.slice(2) : ["all"]);
const want = (g) => groups.has("all") || groups.has(g);

const results = fs.existsSync(RESULTS) ? JSON.parse(fs.readFileSync(RESULTS, "utf8")) : {};
results.machine = { cpu: os.cpus()[0]?.model, cores: os.cpus().length, memGB: Math.round(os.totalmem() / 2 ** 30), node: process.version, when: new Date().toISOString() };
const save = () => fs.writeFileSync(RESULTS, JSON.stringify(results, null, 2));

console.log("bundling…");
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/index.ts"), publicDir: path.join(ROOT, "public") });

const comp = (id, inputProps = {}) => selectComposition({ serveUrl, id, inputProps, browserExecutable: BROWSER });
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

async function timeRender(label, id, opts = {}, reps = REPS) {
  const composition = await comp(id);
  const times = [];
  const renderOnly = [];
  let out;
  for (let r = 0; r < reps; r++) {
    out = path.join(OUT, `${label}.mp4`);
    const logs = [];
    let renderedDoneIn = null;
    const t0 = performance.now();
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: out,
      browserExecutable: BROWSER,
      overwrite: true,
      muted: true,
      crf: opts.hardwareAcceleration ? undefined : (opts.crf ?? 18),
      pixelFormat: "yuv420p",
      ...opts,
      onBrowserLog: (l) => logs.push(l.text),
      onProgress: (p) => {
        if (p.renderedDoneIn !== null) renderedDoneIn = p.renderedDoneIn;
      },
    });
    times.push(performance.now() - t0);
    renderOnly.push(renderedDoneIn ?? NaN);
  }
  const bytes = fs.statSync(out).size;
  const entry = {
    id,
    frames: composition.durationInFrames,
    opts: Object.fromEntries(Object.entries(opts).filter(([k]) => !k.startsWith("on"))),
    wallMs: times.map(Math.round),
    wallMedianMs: Math.round(median(times)),
    renderMsMedian: Math.round(median(renderOnly)),
    msPerFrame: +(median(times) / composition.durationInFrames).toFixed(1),
    sizeKB: Math.round(bytes / 1024),
  };
  results.render ??= {};
  results.render[label] = entry;
  save();
  console.log(label.padEnd(28), `${entry.wallMedianMs} ms`, `${entry.msPerFrame} ms/f`, `${entry.sizeKB} KB`);
  return entry;
}

async function frames(label, id, { start = 0, end, concurrency = 1, gl } = {}) {
  const composition = await comp(id);
  const dir = path.join(OUT, label);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  await renderFrames({
    composition,
    serveUrl,
    inputProps: {},
    outputDir: dir,
    imageFormat: "png",
    concurrency,
    frameRange: [start, end ?? composition.durationInFrames - 1],
    browserExecutable: BROWSER,
    chromiumOptions: gl ? { gl } : {},
    onStart: () => undefined,
    onFrameUpdate: () => undefined,
  });
  return dir;
}

async function still(label, id, frame, extra = {}) {
  const composition = await comp(id);
  const output = path.join(OUT, `${label}.png`);
  const logs = [];
  await renderStill({ composition, serveUrl, output, frame, imageFormat: "png", browserExecutable: BROWSER, overwrite: true, onBrowserLog: (l) => logs.push(l.text), ...extra });
  return { output, logs };
}

/* ---------------------------------------------------------------- env */
if (want("env")) {
  results.env = {};
  for (const gl of [null, "angle", "swangle"]) {
    const { logs } = await still(`env-${gl}`, "env", 0, { chromiumOptions: { gl } });
    const line = logs.find((l) => l.startsWith("ENVPROBE "));
    results.env[String(gl)] = line ? JSON.parse(line.slice(9)) : { error: logs.slice(0, 5) };
    console.log("env", gl, results.env[String(gl)]?.htmlInCanvas, results.env[String(gl)]?.glRenderer);
  }
  save();
}

/* ---------------------------------------------------------------- render options */
if (want("render")) {
  await timeRender("baseline", "baseline");
  await timeRender("noShm-jpeg80", "baseline", { disableSharedMemoryCapture: true, imageFormat: "jpeg", jpegQuality: 80 });
  await timeRender("noShm-png", "baseline", { disableSharedMemoryCapture: true, imageFormat: "png" });
  await timeRender("x264-veryfast", "baseline", { x264Preset: "veryfast" });
  await timeRender("x264-slow", "baseline", { x264Preset: "slow" });
  await timeRender("videotoolbox-16M", "baseline", { hardwareAcceleration: "if-possible", videoBitrate: "16M", crf: undefined });
  await timeRender("bt709", "baseline", { colorSpace: "bt709" });
  await timeRender("gl-angle", "baseline", { chromiumOptions: { gl: "angle" } });
  await timeRender("gl-swangle", "baseline", { chromiumOptions: { gl: "swangle" } }, 1);
  await timeRender("concurrency-2", "baseline", { concurrency: 2 });
  await timeRender("concurrency-8", "baseline", { concurrency: 8 });
  await timeRender("scale-2", "baseline", { scale: 2 }, 1);
  // Lossless reference (PNG frames) for PSNR in analyze.py.
  await frames("ref-baseline", "baseline", { concurrency: 4 });
  save();
}

/* ---------------------------------------------------------------- motion blur */
if (want("blur")) {
  await timeRender("baseline", "baseline");
  await timeRender("mb5", "mb5");
  await timeRender("mb10", "mb10");
  await timeRender("mb-transition-only", "mb-transition-only");
  await timeRender("trail6", "trail", {}, 1);
  for (const f of [34, 57]) {
    await still(`mb-frame${f}-baseline`, "baseline", f);
    await still(`mb-frame${f}-mb10`, "mb10", f);
    await still(`mb-frame${f}-transition-only`, "mb-transition-only", f);
  }
  for (const s of [1, 5, 10]) await still(`color-${s}`, `color-${s}`, 15);
}

/* ---------------------------------------------------------------- transitions */
if (want("transitions")) {
  for (const kind of ["none", "css", "whip-svg", "whip-smear", "css-blur-whip", "flash", "lightleak"]) {
    await timeRender(`t-${kind}`, `t-${kind}`);
  }
  await timeRender("t-shader", "t-shader");
  await timeRender("t-shader-angle", "t-shader", { chromiumOptions: { gl: "angle" } });
  for (const kind of ["css", "shader", "whip-svg", "whip-smear", "css-blur-whip", "lightleak"]) {
    await still(`t-${kind}-f30`, `t-${kind}`, 30);
    await still(`t-${kind}-f31`, `t-${kind}`, 31);
  }
}

/* ---------------------------------------------------------------- devices */
if (want("devices")) {
  await timeRender("phone3d", "phone3d");
  await timeRender("three-phone-angle", "three-phone", { chromiumOptions: { gl: "angle" } });
  await timeRender("smooth", "smooth", {}, 1);
  await still("phone3d-f70", "phone3d", 70);
  await still("three-phone-f70", "three-phone", 70, { chromiumOptions: { gl: "angle" } });
  await still("fonts-f10", "fonts", 10);
  await still("smooth-f30", "smooth", 30);
}

/* ---------------------------------------------------------------- probes */
if (want("probes")) {
  for (const mode of ["native", "scaleUp2x", "scaleDown2x", "scaleUp2xWillChange", "popIn", "popInWillChange", "popInWillChangeReset"]) {
    await frames(`text-${mode}`, `text-${mode}`, { concurrency: 1 });
    await still(`text-${mode}-still39`, `text-${mode}`, 39);
  }
  for (const mode of ["plain", "translate3d", "perspectiveWillChange"]) await frames(`subpixel-${mode}`, `subpixel-${mode}`, { concurrency: 1 });
  for (const box of [300, 622]) for (const mode of ["css", "scaledLayer", "preResized"]) await still(`img-${box}-${mode}`, `img-${box}-${mode}`, 0);
}

console.log("done");
