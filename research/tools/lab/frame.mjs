// node research/tools/lab/frame.mjs <format> <frame> <out.png>  — one full-res lab frame
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const [id, ...rest] = process.argv.slice(2);
const out = rest.pop();
const state = JSON.parse(fs.readFileSync(path.join(ROOT, "refs/_lab/lab-exposed.json"), "utf8"));
const doc = await (await fetch(`http://127.0.0.1:4747/api/projects/lab-exposed/videos/${state[id]}`)).json();
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/remotion/index.ts"), publicDir: path.join(ROOT, "public") });
const inputProps = { spec: doc.spec, assetBase: "http://127.0.0.1:4747/api/media/lab-exposed", publicBase: "" };
const comp = await selectComposition({ serveUrl, id: "Shipreel", inputProps });
for (const [i, f] of rest.entries()) await renderStill({ composition: comp, serveUrl, output: rest.length > 1 ? out.replace(/\.png$/, `.${f}.png`) : out, frame: Math.min(comp.durationInFrames - 1, Number(f)), inputProps, imageFormat: "png" });
process.exit(0);
