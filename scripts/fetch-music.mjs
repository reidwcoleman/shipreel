#!/usr/bin/env node
/**
 * Downloads the built-in music beds from Mixkit and cuts them exactly like the shipped library
 * (start offset, ~50 s, -14 LUFS, 1 s fade-out). The MP3s aren't in the repo: Mixkit's free license
 * allows using them in videos but not handing them out as standalone downloads.
 *
 *   npm run fetch-music          (runs automatically after npm install; safe to re-run)
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "music");
const library = JSON.parse(fs.readFileSync(path.join(DIR, "library.json"), "utf8"));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "shipreel-music-"));
let ok = 0;
for (const t of library) {
  const out = path.join(DIR, `${t.id}.mp3`);
  if (fs.existsSync(out) && fs.statSync(out).size > 100_000) {
    ok++;
    continue;
  }
  try {
    const res = await fetch(t.sourceUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const src = path.join(tmp, `${t.id}.src.mp3`);
    fs.writeFileSync(src, Buffer.from(await res.arrayBuffer()));
    const len = Math.min(52, Math.max(10, (t.durationSec ?? 51) + 0.5));
    execFileSync("ffmpeg", [
      "-v", "error", "-y", "-ss", String(t.srcOffset ?? 0), "-t", String(len), "-i", src,
      "-af", `loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=${(len - 1).toFixed(2)}:d=1`,
      "-ar", "44100", "-ac", "2", "-b:a", "192k", out,
    ]);
    ok++;
    console.log(`music: ${t.id} ✓`);
  } catch (e) {
    console.warn(`music: couldn't fetch ${t.id} (${e.message}). Videos still render; this bed will be silent until you re-run npm run fetch-music.`);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`music: ${ok}/${library.length} beds ready`);
