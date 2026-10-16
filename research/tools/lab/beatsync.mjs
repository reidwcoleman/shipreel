#!/usr/bin/env node
/**
 * Snap a hand-written spec's cuts to a built-in music bed (same code the formats use).
 *
 *   node research/tools/lab/beatsync.mjs <in.json> <out.json> <trackId> [--volume 0.55]
 */
import { createJiti } from "jiti";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const jiti = createJiti(import.meta.url, { alias: { "@": path.join(ROOT, "src") } });
const { beatSync, trackById } = await jiti.import(path.join(ROOT, "src/framework/music.ts"));
const args = process.argv.slice(2);
const vi = args.indexOf("--volume");
const volume = vi >= 0 ? Number(args.splice(vi, 2)[1]) : undefined;
const di = args.indexOf("--drop");
const dropScene = di >= 0 ? Number(args.splice(di, 2)[1]) : undefined;
const [inPath, outPath, id] = args;
const spec = JSON.parse(fs.readFileSync(inPath, "utf8"));
const track = trackById(id);
if (!track) throw new Error(`no track ${id}`);
const out = beatSync(volume != null ? { ...spec, audio: { ...(spec.audio ?? {}), volume } } : spec, track, { dropScene });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
const cuts = [];
let t = 0;
for (const s of out.scenes) {
  cuts.push(+t.toFixed(2));
  t += s.duration;
}
console.log(`${track.id} ${track.bpm}bpm startFrom ${out.audio.startFrom}s; cuts at ${cuts.join(", ")}; total ${t.toFixed(2)}s`);
