#!/usr/bin/env python3
"""Experiment: loudness targets and what platform audio transcodes do to true peak.

    python3 -I research/tools/quality/exp_audio.py

1. Measures the uncompressed Shipreel soundtracks (work/master/*.wav, from renderMedia codec "wav").
2. Two-pass loudnorm to -14 LUFS integrated at several true-peak ceilings.
3. Re-encodes each normalised file the way platforms serve audio (measured from refs/: TikTok AAC-LC
   ~64 kbps 44.1 kHz; X AAC 128 kbps 44.1 kHz; YouTube Opus ~130 kbps 48 kHz; IG/Threads spec AAC
   128 kbps 48 kHz) and re-measures integrated loudness and true peak of the decoded result.
Results: work/results_audio.json
"""
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import qlib as q  # noqa: E402

OUT = os.path.join(q.WORK, "audio")
TARGET_I = -14.0
CEILINGS = [-1.0, -1.5, -2.0]
TRANSCODES = {
    "tiktok_aac64k_44k": ["-c:a", "aac", "-b:a", "64k", "-ar", "44100"],
    "tiktok_aacat64k_44k": ["-c:a", "aac_at", "-b:a", "64k", "-ar", "44100"],
    "x_aac128k_44k": ["-c:a", "aac", "-b:a", "128k", "-ar", "44100"],
    "meta_aac128k_48k": ["-c:a", "aac", "-b:a", "128k", "-ar", "48000"],
    "yt_opus128k": ["-c:a", "libopus", "-b:a", "128k", "-ar", "48000"],
}


def ebur128(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-map", "0:a:0", "-af", "ebur128=peak=true:framelog=quiet",
                        "-f", "null", "-"], capture_output=True, text=True)
    s = r.stderr[r.stderr.rfind("Summary:"):]

    def g(label):
        m = re.search(label + r":\s+(-?[\d.]+|-inf)", s)
        return None if not m or m.group(1) == "-inf" else float(m.group(1))

    return {"I": g("I"), "LRA": g("LRA"), "TP": g("Peak")}


def loudnorm_two_pass(src, dst, I, TP, LRA=11.0):
    """Pass 1 measures, pass 2 applies with linear=true (a single gain when the ceiling allows it;
    loudnorm falls back to its dynamic mode otherwise, which the JSON reports as normalization_type)."""
    p1 = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", src, "-af", f"loudnorm=I={I}:TP={TP}:LRA={LRA}:print_format=json",
                         "-f", "null", "-"], capture_output=True, text=True)
    m = json.loads(p1.stderr[p1.stderr.rfind("{"):])
    af = (f"loudnorm=I={I}:TP={TP}:LRA={LRA}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
          f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true:print_format=json")
    p2 = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-nostdin", "-y", "-i", src, "-af", af, "-ar", "48000",
                         "-c:a", "pcm_s24le", dst], capture_output=True, text=True)
    m2 = json.loads(p2.stderr[p2.stderr.rfind("{"):])
    return {"pass1": {k: m[k] for k in ("input_i", "input_tp", "input_lra", "input_thresh", "target_offset")},
            "normalization_type": m2.get("normalization_type"), "af": af}


def main():
    os.makedirs(OUT, exist_ok=True)
    res = {"masters": {}, "normalized": {}}
    for name in ("v_ooybogkhgb", "v_bbsxzf06bm"):
        wav = os.path.join(q.MASTER, f"{name}.wav")
        res["masters"][name] = ebur128(wav)
        for tp in CEILINGS:
            dst = os.path.join(OUT, f"{name}_I{TARGET_I:g}_TP{tp:g}.wav")
            info = loudnorm_two_pass(wav, dst, TARGET_I, tp)
            row = {"loudnorm": info, "after_norm": ebur128(dst), "transcodes": {}}
            for tname, args in TRANSCODES.items():
                ext = ".ogg" if "opus" in tname else ".m4a"
                enc = os.path.join(OUT, f"{name}_TP{tp:g}_{tname}{ext}")
                q.run(q.ff("-i", dst, *args, enc))
                row["transcodes"][tname] = ebur128(enc)
            res["normalized"][f"{name}|TP{tp:g}"] = row
            print(name, tp, json.dumps({"after": row["after_norm"], "type": info["normalization_type"],
                                        **{k: v["TP"] for k, v in row["transcodes"].items()}}), flush=True)
    q.save_json(os.path.join(q.WORK, "results_audio.json"), res)


if __name__ == "__main__":
    main()
