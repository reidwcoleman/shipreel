#!/usr/bin/env node
/**
 * Long-lived Remotion render worker. The Next server spawns it once and sends jobs as JSON lines on
 * stdin; progress/results come back as JSON lines on stdout. Bundling happens once and is reused
 * until a file under src/remotion changes.
 *
 * job:    {"type":"render","jobId":"…","props":{…},"out":"/abs/file.mp4","stills":[{"frame":12,"out":"/abs/1.png"}]}
 * events: {"type":"progress","jobId","progress":0.42,"stage":"bundling|rendering|stills"}
 *         {"type":"done","jobId"} | {"type":"error","jobId","message"}
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = path.join(ROOT, "src/remotion/index.ts");
const COMPOSITION = "Shipreel";

/** Normalise loudness to −14 LUFS / −1.5 dBTP (what TikTok/Reels/Shorts play back at). Video is copied untouched. */
function loudnorm(file) {
  try {
    const probe = execFileSync("ffprobe", ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", file]).toString().trim();
    if (!probe) return;
    const tmp = file.replace(/\.mp4$/, ".ln.mp4");
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", tmp]);
    fs.renameSync(tmp, file);
  } catch (e) {
    process.stderr.write(`[render-worker] loudnorm skipped: ${e?.message ?? e}\n`);
  }
}

const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");

let bundled = null; // { url, at }

function newestMtime(dir) {
  let newest = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) newest = Math.max(newest, newestMtime(p));
    else newest = Math.max(newest, fs.statSync(p).mtimeMs);
  }
  return newest;
}

async function ensureBundle(jobId) {
  const changed = newestMtime(path.join(ROOT, "src/remotion"));
  if (bundled && bundled.at >= changed) return bundled.url;
  send({ type: "progress", jobId, progress: 0, stage: "bundling" });
  const url = await bundle({
    entryPoint: ENTRY,
    publicDir: path.join(ROOT, "public"),
    onProgress: (p) => send({ type: "progress", jobId, progress: (p / 100) * 0.1, stage: "bundling" }),
  });
  bundled = { url, at: Date.now() };
  return url;
}

const queue = [];
let busy = false;

async function pump() {
  if (busy) return;
  const job = queue.shift();
  if (!job) return;
  busy = true;
  try {
    const serveUrl = await ensureBundle(job.jobId);
    const composition = await selectComposition({ serveUrl, id: COMPOSITION, inputProps: job.props, timeoutInMilliseconds: 120000 });
    fs.mkdirSync(path.dirname(job.out ?? job.stills?.[0]?.out ?? ROOT), { recursive: true });
    if (job.out) {
      let last = 0;
      await renderMedia({
        composition,
        serveUrl,
        codec: "h264",
        // Quality that survives platform re-encoding: low CRF, slow preset, crisp JPEG frames
        // (the 80 default softens text edges), BT.709 tagging so colours don't shift on phones.
        crf: 16,
        x264Preset: "medium",
        jpegQuality: 95,
        colorSpace: "bt709",
        pixelFormat: "yuv420p",
        audioBitrate: "256k",
        // Footage fetches can be slow while the machine is busy; don't fail the render for it.
        timeoutInMilliseconds: 120000,
        outputLocation: job.out,
        inputProps: job.props,
        onProgress: ({ progress }) => {
          if (progress - last >= 0.02 || progress === 1) {
            last = progress;
            send({ type: "progress", jobId: job.jobId, progress: 0.1 + progress * (job.stills?.length ? 0.75 : 0.9), stage: "rendering" });
          }
        },
      });
    }
    if (job.out) loudnorm(job.out);
    if (job.stills?.length) {
      for (let i = 0; i < job.stills.length; i++) {
        const s = job.stills[i];
        fs.mkdirSync(path.dirname(s.out), { recursive: true });
        // A still can carry its own props (a 9:16 screenshot slide inside a 3:4 carousel).
        const comp = s.props ? await selectComposition({ serveUrl, id: COMPOSITION, inputProps: s.props, timeoutInMilliseconds: 120000 }) : composition;
        await renderStill({ composition: comp, serveUrl, output: s.out, frame: Math.min(s.frame, comp.durationInFrames - 1), inputProps: s.props ?? job.props, imageFormat: "png" });
        send({ type: "progress", jobId: job.jobId, progress: 0.85 + ((i + 1) / job.stills.length) * 0.15, stage: "stills" });
      }
    }
    send({ type: "done", jobId: job.jobId });
  } catch (e) {
    send({ type: "error", jobId: job.jobId, message: e?.message ?? String(e) });
  } finally {
    busy = false;
    setImmediate(pump);
  }
}

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    if (msg.type === "render") {
      queue.push(msg);
      pump();
    } else if (msg.type === "ping") send({ type: "pong" });
  } catch (e) {
    send({ type: "error", jobId: null, message: `bad job: ${e?.message}` });
  }
});
rl.on("close", () => process.exit(0));
send({ type: "ready" });
