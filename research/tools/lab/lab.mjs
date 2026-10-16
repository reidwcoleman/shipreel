#!/usr/bin/env node
/**
 * Format lab: rebuild one video per format for a test product, force-render them all, and save
 * MP4s + contact sheets for side-by-side comparison with reference videos.
 *
 *   node research/tools/lab/lab.mjs make [--project lab-exposed]            (re)create one video per format
 *   node research/tools/lab/lab.mjs render <outDir> [format ...]            render + copy + contact sheets
 *   node research/tools/lab/lab.mjs sheet <video.mp4> <out.jpg>              contact sheet for any video
 *
 * Talks to the running Shipreel app (SHIPREEL_URL, default http://127.0.0.1:4747).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const BASE = (process.env.SHIPREEL_URL || "http://127.0.0.1:4747").replace(/\/$/, "");
const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const PROJECT = flag("project", "lab-exposed");
const STATE = path.join(ROOT, "refs", "_lab", `${PROJECT}.json`);

async function api(method, route, body) {
  const res = await fetch(`${BASE}${route}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) throw new Error(`${method} ${route} → ${res.status}: ${typeof data === "string" ? data.slice(0, 200) : data.error ?? JSON.stringify(data).slice(0, 200)}`);
  return data;
}

function formatIds() {
  const src = fs.readFileSync(path.join(ROOT, "src/framework/formats.ts"), "utf8");
  const ids = [];
  const re = /F\.push\(\{\s*id: "([a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(src))) ids.push(m[1]);
  return ids;
}

const readState = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {});
const ff = (a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a], { stdio: ["ignore", "ignore", "inherit"] });
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());

/** Overview: 10 frames across the video. Entrance: frames 0..30 every 3 (the first second, where motion lives). */
function sheets(video, outBase) {
  const d = dur(video);
  const times = Array.from({ length: 10 }, (_, i) => Math.min(d - 0.25, 0.05 + (i * (d - 0.3)) / 9));
  const tiles = times.map((t, i) => {
    const p = `${outBase}.t${i}.png`;
    ff(["-ss", t.toFixed(3), "-i", video, "-frames:v", "1", "-vf", "scale=216:-2", p]);
    return p;
  });
  ff([...tiles.flatMap((p) => ["-i", p]), "-filter_complex", `hstack=inputs=${tiles.length}`, `${outBase}.jpg`]);
  tiles.forEach((p) => fs.rmSync(p, { force: true }));
  ff(["-i", video, "-vf", "select='lt(n\\,33)*not(mod(n\\,3))',scale=216:-2,tile=11x1", "-frames:v", "1", "-fps_mode", "passthrough", `${outBase}.open.jpg`]);
}

async function make() {
  const ids = formatIds();
  const old = await api("GET", `/api/projects/${PROJECT}/videos`);
  for (const v of old) await api("DELETE", `/api/projects/${PROJECT}/videos/${v.id}`);
  const state = {};
  for (const id of ids) {
    const doc = await api("POST", `/api/projects/${PROJECT}/videos`, { formatId: id });
    state[id] = doc.id;
    process.stdout.write(`${id} → ${doc.id}\n`);
  }
  fs.mkdirSync(path.dirname(STATE), { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2));
}

async function render(outDir, only) {
  const state = readState();
  const ids = only.length ? only : Object.keys(state);
  fs.mkdirSync(outDir, { recursive: true });
  const projectDir = path.join(ROOT, "workspace", "projects", PROJECT);
  for (const id of ids) {
    const vid = state[id];
    if (!vid) {
      console.error(`no lab video for ${id} (run make)`);
      continue;
    }
    const t0 = Date.now();
    try {
      const before = (await api("GET", `/api/projects/${PROJECT}/videos/${vid}`)).render?.renderedAt;
      await api("POST", `/api/projects/${PROJECT}/videos/${vid}/render`, { force: true });
      let doc;
      for (;;) {
        await new Promise((r) => setTimeout(r, 2000));
        doc = await api("GET", `/api/projects/${PROJECT}/videos/${vid}`);
        if (doc.status === "failed") throw new Error(doc.error ?? "render failed");
        if (doc.status === "rendered" && doc.render?.renderedAt !== before) break;
        if (Date.now() - t0 > 20 * 60_000) throw new Error("timed out");
      }
      const src = path.join(projectDir, doc.render.file);
      const out = path.join(outDir, `${id}.mp4`);
      fs.copyFileSync(src, out);
      for (const [i, s] of (doc.render.slides ?? []).entries()) fs.copyFileSync(path.join(projectDir, s), path.join(outDir, `${id}.slide${i + 1}.png`));
      sheets(out, path.join(outDir, id));
      console.log(`${id.padEnd(20)} ${((Date.now() - t0) / 1000).toFixed(1)}s  ${doc.render.durationSec.toFixed(1)}s video`);
    } catch (e) {
      console.error(`${id.padEnd(20)} FAILED ${e.message}`);
    }
  }
}

const cmd = args.shift();
if (cmd === "make") await make();
else if (cmd === "render") await render(path.resolve(args.shift() ?? path.join(ROOT, "refs", "_lab", "latest")), args);
else if (cmd === "sheet") sheets(path.resolve(args[0]), path.resolve(args[1]).replace(/\.jpg$/, ""));
else console.log("usage: lab.mjs make | render <outDir> [format…] | sheet <video> <out.jpg>");
