#!/usr/bin/env node
/**
 * Render chosen frames of any spec JSON (no app round-trip) into one contact sheet.
 *
 *   node research/tools/lab/specstills.mjs <spec.json> <out.jpg> [--project famsync] [--scale 0.3] [--at 0,0.5,1.2 | --every 0.5]
 *
 * Times are seconds. Assets resolve through the running app (http://127.0.0.1:4747/api/media/<project>).
 */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
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
  args.splice(i, 2);
  return v;
};
const project = flag("project", "famsync");
const scale = Number(flag("scale", "0.3"));
const atArg = flag("at", "");
const every = Number(flag("every", "0"));
const cols = Number(flag("cols", "0"));
const [specPath, outPath] = args;
const raw = JSON.parse(fs.readFileSync(specPath, "utf8"));
const spec = raw.spec ?? raw;
const BASE = "http://127.0.0.1:4747";
const inputProps = { spec, assetBase: `${BASE}/api/media/${project}`, publicBase: "" };

const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/remotion/index.ts"), publicDir: path.join(ROOT, "public") });
const comp = await selectComposition({ serveUrl, id: "Shipreel", inputProps, timeoutInMilliseconds: 120000 });
const n = comp.durationInFrames;
let times = atArg ? atArg.split(",").map(Number) : [];
if (!times.length) {
  const step = every || Math.max(0.25, n / 30 / 16);
  for (let t = 0; t < n / 30; t += step) times.push(+t.toFixed(3));
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "specstills-"));
const files = [];
for (const [i, t] of times.entries()) {
  const out = path.join(tmp, `f${String(i).padStart(3, "0")}.jpg`);
  await renderStill({ composition: comp, serveUrl, output: out, frame: Math.min(n - 1, Math.round(t * 30)), inputProps, imageFormat: "jpeg", jpegQuality: 88, scale, timeoutInMilliseconds: 120000 });
  files.push(out);
}
const c = cols || Math.min(files.length, 8);
const rows = Math.ceil(files.length / c);
const w = Math.round(1080 * scale);
const h = Math.round(1920 * scale);
const layout = files.map((_, i) => `${(i % c) * w}_${Math.floor(i / c) * h}`).join("|");
execFileSync("ffmpeg", ["-v", "error", "-y", ...files.flatMap((f) => ["-i", f]), "-filter_complex", files.length > 1 ? `xstack=inputs=${files.length}:layout=${layout}:fill=black` : "null", outPath]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${outPath}  ${(n / 30).toFixed(2)}s  frames at ${times.join(", ")}  (${rows}x${c})`);
process.exit(0);
