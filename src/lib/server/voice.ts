import "server-only";
import { execFile } from "node:child_process";
import fsp from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { Asset } from "@/lib/types";
import type { CaptionWord, VideoSpec } from "@/remotion/spec";
import { addAsset, deleteAsset, probe } from "./media";
import { getSecret, paths } from "./store";

const run = promisify(execFile);

export type Voice = { id: string; name: string; engine: "say" | "elevenlabs"; lang?: string; premium?: boolean };

/** macOS novelty voices nobody wants on a marketing video. */
const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Fred|Good News|Jester|Junior|Kathy|Organ|Superstar|Ralph|Trinoids|Whisper|Zarvox|Grandma|Grandpa)\b/;

async function sayVoices(): Promise<Voice[]> {
  if (process.platform !== "darwin") return [];
  try {
    const { stdout } = await run("say", ["-v", "?"]);
    return stdout
      .split("\n")
      .map((l) => /^(.+?)\s{2,}([a-z]{2}_[A-Z]{2})\s+#/.exec(l))
      .filter((m): m is RegExpExecArray => !!m && m[2].startsWith("en_") && !NOVELTY.test(m[1]))
      .map((m) => {
        const raw = m[1].trim();
        const region = m[2].slice(3) === "GB" ? "UK" : m[2].slice(3);
        const name = /\(English \((US|UK)\)\)/.test(raw) ? raw.replace(/ \(English \((US|UK)\)\)/, " ($1)") : `${raw} (${region})`;
        return { id: raw, name, engine: "say" as const, lang: m[2], premium: /premium|enhanced/i.test(raw) };
      })
      .sort((a, b) => Number(!!b.premium) - Number(!!a.premium) || Number(b.lang === "en_US") - Number(a.lang === "en_US") || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

async function elevenVoices(): Promise<Voice[]> {
  const key = await getSecret("elevenlabsKey");
  if (!key) return [];
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": key } });
    if (!res.ok) return [];
    const j = (await res.json()) as { voices?: { voice_id: string; name: string; category?: string; labels?: Record<string, string> }[] };
    return (j.voices ?? []).map((v) => ({ id: v.voice_id, name: [v.name, v.labels?.accent, v.labels?.description].filter(Boolean).join(" · "), engine: "elevenlabs" as const }));
  } catch {
    return [];
  }
}

export async function listVoices(): Promise<Voice[]> {
  const [el, mac] = await Promise.all([elevenVoices(), sayVoices()]);
  return [...el, ...mac];
}

/** Split text into caption words, keeping punctuation attached (so pauses can be weighted). */
function tokenize(text: string): string[] {
  return text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}

/** Non-silent stretches of an audio file, via ffmpeg silencedetect. */
async function speechSegments(file: string, duration: number): Promise<{ start: number; end: number }[]> {
  try {
    const { stderr } = await run("ffmpeg", ["-hide_banner", "-i", file, "-af", "silencedetect=noise=-38dB:d=0.12", "-f", "null", "-"], { maxBuffer: 1 << 24 });
    const silences: { start: number; end: number }[] = [];
    let cur: number | null = null;
    for (const line of stderr.split("\n")) {
      const s = /silence_start: ([\d.]+)/.exec(line);
      const e = /silence_end: ([\d.]+)/.exec(line);
      if (s) cur = Number(s[1]);
      if (e && cur != null) {
        silences.push({ start: cur, end: Number(e[1]) });
        cur = null;
      }
    }
    if (cur != null) silences.push({ start: cur, end: duration });
    const segs: { start: number; end: number }[] = [];
    let t = 0;
    for (const s of silences) {
      if (s.start - t > 0.05) segs.push({ start: t, end: s.start });
      t = s.end;
    }
    if (duration - t > 0.05) segs.push({ start: t, end: duration });
    return segs;
  } catch {
    return [{ start: 0, end: duration }];
  }
}

const weight = (w: string) => w.replace(/[^\p{L}\p{N}]/gu, "").length + 1.6;

function spread(words: string[], start: number, end: number): CaptionWord[] {
  const total = words.reduce((n, w) => n + weight(w), 0) || 1;
  let t = start;
  return words.map((w) => {
    const d = ((end - start) * weight(w)) / total;
    const out = { text: w, start: Number(t.toFixed(3)), end: Number((t + d).toFixed(3)) };
    t += d;
    return out;
  });
}

/**
 * Word timings for a TTS file with no alignment data: match phrases (split at punctuation) to the
 * speech segments between pauses when the counts line up, otherwise spread words by length.
 */
async function estimateWords(file: string, text: string, duration: number): Promise<CaptionWord[]> {
  const words = tokenize(text);
  const segs = await speechSegments(file, duration);
  const phrases: string[][] = [];
  let cur: string[] = [];
  for (const w of words) {
    cur.push(w);
    if (/[.,!?;:…]$/.test(w)) {
      phrases.push(cur);
      cur = [];
    }
  }
  if (cur.length) phrases.push(cur);
  if (!segs.length) return spread(words, 0, duration);
  // Make the counts agree: merge the closest speech segments, or the phrases least likely to have a
  // real pause (commas first), then give each phrase its segment.
  const S = [...segs];
  while (S.length > phrases.length && S.length > 1) {
    let k = 0;
    for (let i = 1; i < S.length - 1; i++) if (S[i + 1].start - S[i].end < S[k + 1].start - S[k].end) k = i;
    S.splice(k, 2, { start: S[k].start, end: S[k + 1].end });
  }
  const P = phrases.map((p) => [...p]);
  while (P.length > S.length && P.length > 1) {
    let k = P.findIndex((p, i) => i < P.length - 1 && /,$/.test(p.at(-1) ?? ""));
    if (k < 0) {
      k = 0;
      for (let i = 1; i < P.length - 1; i++) if (P[i].length + P[i + 1].length < P[k].length + P[k + 1].length) k = i;
    }
    P.splice(k, 2, [...P[k], ...P[k + 1]]);
  }
  return P.flatMap((p, i) => spread(p, S[i].start, S[i].end));
}

async function sayTts(text: string, voice: string, outDir: string): Promise<{ file: string; words: CaptionWord[]; duration: number }> {
  if (process.platform !== "darwin") throw new Error("System voices need macOS. Add an ElevenLabs key in Settings.");
  const aiff = path.join(outDir, `vo-${Date.now()}.aiff`);
  const mp3 = aiff.replace(/\.aiff$/, ".mp3");
  // A touch faster than default: short-form voiceovers run ~190 wpm.
  await run("say", [...(voice ? ["-v", voice] : []), "-r", "188", "-o", aiff, text], { maxBuffer: 1 << 24 });
  await run("ffmpeg", ["-v", "error", "-y", "-i", aiff, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "160k", mp3]);
  await fsp.rm(aiff, { force: true });
  const duration = (await probe(mp3)).durationSec ?? 0;
  return { file: mp3, words: await estimateWords(mp3, text, duration), duration };
}

async function elevenTts(text: string, voiceId: string, outDir: string): Promise<{ file: string; words: CaptionWord[]; duration: number }> {
  const key = await getSecret("elevenlabsKey");
  if (!key) throw new Error("Add your ElevenLabs API key in Settings first.");
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.2, speed: 1.08 } }),
  });
  if (!res.ok) throw new Error(`ElevenLabs: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { audio_base64: string; alignment?: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] } };
  const file = path.join(outDir, `vo-${Date.now()}.mp3`);
  await fsp.writeFile(file, Buffer.from(j.audio_base64, "base64"));
  const duration = (await probe(file)).durationSec ?? 0;
  const a = j.alignment;
  if (!a) return { file, words: await estimateWords(file, text, duration), duration };
  // Characters → words: a word spans from its first character's start to its last character's end.
  const words: CaptionWord[] = [];
  let buf = "";
  let s = 0;
  let e = 0;
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (buf) words.push({ text: buf, start: s, end: e });
      buf = "";
      return;
    }
    if (!buf) s = a.character_start_times_seconds[i];
    buf += ch;
    e = a.character_end_times_seconds[i];
  });
  if (buf) words.push({ text: buf, start: s, end: e });
  return { file, words, duration };
}

/** Generate a voiceover for a video: saves an audio asset, word captions, and (optionally) retimes scenes to fit. */
export async function makeVoiceover(projectId: string, spec: VideoSpec, opts: { text: string; engine: "say" | "elevenlabs"; voice?: string; fit?: boolean }): Promise<{ spec: VideoSpec; asset: Asset }> {
  // Emoji would be read aloud ("loudly crying face"), and *highlight* marks are for the screen only.
  const text = opts.text.replace(/\p{Extended_Pictographic}|\u{FE0F}|\u{200D}/gu, "").replace(/\*/g, "").replace(/\s+([.,!?])/g, "$1").replace(/\s+/g, " ").trim().slice(0, 2500);
  if (!text) throw new Error("The script is empty.");
  const tmp = paths.tmp();
  await fsp.mkdir(tmp, { recursive: true });
  const out = opts.engine === "elevenlabs" ? await elevenTts(text, opts.voice || "21m00Tcm4TlvDq8ikWAM", tmp) : await sayTts(text, opts.voice ?? "", tmp);
  // Replace this video's previous take instead of piling up files.
  const prev = spec.voiceover?.src?.replace(/^asset:/, "");
  if (prev?.startsWith(`voiceover-${spec.id}`)) await deleteAsset(projectId, prev).catch(() => undefined);
  const asset = await addAsset(projectId, `voiceover-${spec.id}.mp3`, await fsp.readFile(out.file));
  await fsp.rm(out.file, { force: true });

  const next: VideoSpec = structuredClone(spec);
  next.voiceover = { src: `asset:${asset.file}`, text, voice: opts.voice, volume: 1 };
  next.captions = { words: out.words, style: spec.captions?.style ?? "hormozi", position: spec.captions?.position ?? "lower", wordsPerPage: spec.captions?.wordsPerPage ?? 3 };
  if (opts.fit && out.duration > 0) {
    // Lengthen (never shorten) the scenes before the CTA so the voice finishes before the call to action.
    const ctaAt = next.scenes.findIndex((s) => s.type === "cta");
    const body = ctaAt > 0 ? next.scenes.slice(0, ctaAt) : next.scenes;
    const current = body.reduce((n, s) => n + s.duration, 0);
    const target = out.duration + 0.4;
    if (target > current) {
      const k = target / Math.max(0.1, current);
      const ids = new Set(body.map((s) => s.id));
      next.scenes = next.scenes.map((s) => (ids.has(s.id) ? { ...s, duration: Math.round(s.duration * k * 10) / 10 } : s));
    }
  }
  return { spec: next, asset };
}

/** Original music via ElevenLabs Music (instrumental, the length of the video). */
export async function composeMusic(projectId: string, prompt: string, seconds: number): Promise<Asset> {
  const key = await getSecret("elevenlabsKey");
  if (!key) throw new Error("Add your ElevenLabs API key in Settings first.");
  const ms = Math.max(3000, Math.min(120_000, Math.round(seconds * 1000)));
  const res = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ prompt: prompt.slice(0, 2000), music_length_ms: ms, force_instrumental: true }),
  });
  if (!res.ok) throw new Error(`ElevenLabs Music: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const name = `music-${prompt.split(/[,.]/)[0].slice(0, 32)}.mp3`;
  return addAsset(projectId, name, buf);
}
