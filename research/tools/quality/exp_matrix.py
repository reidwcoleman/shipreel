#!/usr/bin/env python3
"""Experiment 1+2: which SOURCE encode settings survive platform recompression best, and what grain does.

    python3 research/tools/quality/exp_matrix.py [--workers 3]

Clips (cut from the lossless PNG masters rendered by render_master.mjs, 30 fps, 1080x1920):
  A   v_ooybogkhgb frames 0-74 + 346-421: comment sticker on a dark 160deg gradient, small grey text,
      then the CTA card over a lime radial glow (banding bait), no grain.
  A1  same frames with theme.grain=true (Shipreel's animated SVG grain, opacity 0.07 overlay).
  B   v_bbsxzf06bm frames 84-232: white App Store page with 22-28 px grey text, then CTA over glow,
      with Shipreel's animated grain (as shipped).
  B0  same frames with grain off.
Pipeline per cell: lossless clip -> source encode (candidate upload settings) -> platform simulation
(calibrated to served ladders) -> metrics vs the clean lossless clip: VMAF, VMAF-NEG, PSNR-Y, CAMBI
(banding, 0 = none), edge-contrast retention on text edges (global + small-text ROI).
Results: work/results_matrix.json (resumable; finished cells are skipped).
"""
import argparse
import json
import os
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import qlib as q  # noqa: E402

CLIPS = {
    "A": ("v_ooybogkhgb", list(range(0, 75)) + list(range(346, 422))),
    "A1": ("v_ooybogkhgb_grain1", list(range(0, 75)) + list(range(346, 422))),
    "B": ("v_bbsxzf06bm", list(range(84, 233))),
    "B0": ("v_bbsxzf06bm_grain0", list(range(84, 233))),
}
# Small-text regions (x0, y0, x1, y1) in 1080x1920 coordinates, found on the master frames.
ROIS = {  # (box, first clip frame, last clip frame) - only frames where that text is on screen
    "A": ((60, 330, 680, 700), 0, 74),     # reply sticker: 26-34 px text incl. "Reply to jonny.builds's comment"
    "B": ((0, 640, 1080, 1000), 15, 85),   # App Store info row: AGE / CATEGORY / LANGUAGE, 20-28 px grey text
}
CLEAN = {"A": "A", "A1": "A", "B": "B0", "B0": "B0"}  # the reference each clip is scored against

MAIN_SIMS = ["tt1080_hevc700k", "tt720_hevc400k", "yt_av1_1200k"]
EXTRA_SIMS = ["x720_h264_750k", "h264_3m"]

PLAN = []
# E1: source settings x platforms (clip A gets the full grid, clip B the core rows)
for src in ["lossless", "crf18_medium", "crf18_slow", "crf15_slow", "crf12_slow", "crf15_slow_animation",
            "crf15_slow_stillimage", "crf15_slow_10bit"]:
    for sim in MAIN_SIMS:
        PLAN.append(("A", src, sim))
for src in ["lossless", "crf18_medium", "crf15_slow"]:
    for sim in EXTRA_SIMS:
        PLAN.append(("A", src, sim))
for src in ["lossless", "crf18_medium", "crf15_slow", "crf15_slow_10bit"]:
    for sim in ["tt1080_hevc700k", "tt720_hevc400k"]:
        PLAN.append(("B0", src, sim))
# E2: grain (as shipped vs off vs a coarser static grain), production source settings
for clip in ["A1", "B"]:
    for sim in MAIN_SIMS:
        PLAN.append((clip, "crf18_medium", sim))
for sim in ["tt1080_hevc700k", "tt720_hevc400k", "yt_av1_1200k"]:
    PLAN.append(("B0", "crf18_medium", sim)) if ("B0", "crf18_medium", sim) not in PLAN else None
for clip in ["Astatic", "B0static"]:
    for sim in MAIN_SIMS:
        PLAN.append((clip, "crf18_medium", sim))
# source-only rows (no platform): cost and fidelity of each upload setting
SOURCE_ONLY = [("A", s) for s in ["crf18_medium", "crf18_slow", "crf15_medium", "crf15_slow", "crf12_slow", "crf15_veryslow",
                                    "crf15_slow_animation", "crf15_slow_stillimage", "crf15_slow_10bit"]] + \
              [("A1", "crf18_medium"), ("B", "crf18_medium"), ("B0", "crf18_medium"), ("B0", "crf15_slow"),
               ("Astatic", "crf18_medium"), ("B0static", "crf18_medium")]

LOCK = threading.Lock()
RESULTS_PATH = os.path.join(q.WORK, "results_matrix.json")


def load_results():
    return json.load(open(RESULTS_PATH)) if os.path.exists(RESULTS_PATH) else {}


def put(key, value):
    with LOCK:
        res = load_results()
        res[key] = value
        q.save_json(RESULTS_PATH, res)


def clip_paths(clip):
    d = os.path.join(q.WORK, "clips")
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, f"{clip}.mkv"), os.path.join(d, f"{clip}.txt")


def static_grain_clip(base_clip, out, sigma=2.0, blob=2, seed=7):
    """Add a fixed (non-animated) luma grain: Gaussian sigma ~2 code values at 2-px blob size, the same
    pattern every frame. This is the 'dither that survives' candidate."""
    if os.path.exists(out):
        return out
    import subprocess
    src, _ = clip_paths(base_clip)
    rng = np.random.default_rng(seed)
    g = rng.normal(0, 1, (q.H // blob, q.W // blob)).astype(np.float32)
    g = np.kron(g, np.ones((blob, blob), np.float32))
    g = g / g.std() * sigma
    fsz = q.W * q.H * 3 // 2
    dec = subprocess.Popen(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "yuv420p", "-"],
                           stdout=subprocess.PIPE)
    enc = subprocess.Popen(q.ff("-f", "rawvideo", "-pix_fmt", "yuv420p", "-s", f"{q.W}x{q.H}", "-r", str(q.FPS), "-i", "-",
                                "-c:v", "libx264", "-preset", "ultrafast", "-qp", "0", "-threads", "4", out), stdin=subprocess.PIPE)
    while True:
        b = dec.stdout.read(fsz)
        if len(b) < fsz:
            break
        f = np.frombuffer(b, np.uint8).copy()
        y = f[: q.W * q.H].reshape(q.H, q.W).astype(np.float32)
        f[: q.W * q.H] = np.clip(np.rint(y + g), 16, 235).astype(np.uint8).ravel()
        enc.stdin.write(f.tobytes())
    enc.stdin.close()
    enc.wait()
    dec.wait()
    if enc.returncode != 0:
        raise RuntimeError("static grain encode failed")
    return out


def ensure_clip(clip):
    path, lst = clip_paths(clip)
    if clip.endswith("static"):
        base = clip[: -len("static")]
        ensure_clip(base)
        return static_grain_clip(base, path), None
    master, frames = CLIPS[clip]
    q.make_clip_ref(os.path.join(q.MASTER, master), frames, path)
    return path, lst


def ensure_source(clip, src):
    ref, lst = ensure_clip(clip)
    d = os.path.join(q.WORK, "src")
    os.makedirs(d, exist_ok=True)
    out = os.path.join(d, f"{clip}__{src}.mp4")
    return q.encode_source(ref, out, src, png_list=lst)


ROI_CACHE = {}


def ref_luma(clip):
    with LOCK:
        if clip not in ROI_CACHE:
            ROI_CACHE[clip] = q.read_luma(ensure_clip(clip)[0])
        return ROI_CACHE[clip]


def score(dist, clip, tag):
    clean = CLEAN.get(clip, CLEAN.get(clip.replace("static", ""), clip))
    clean_ref = ensure_clip(clean)[0]
    d = os.path.join(q.WORK, "metrics")
    os.makedirs(d, exist_ok=True)
    pm = q.vmaf(dist, clean_ref, os.path.join(d, f"{tag}.json"), subsample=3, cambi=True)
    row = q.parse_pooled(pm)
    rl = ref_luma(clean)
    dl = q.read_luma(dist)
    n = min(len(rl), len(dl))
    row["edges_all"] = q.edge_retention(rl[:n], dl[:n])
    roi = ROIS.get(clean[0])
    if roi:
        box, lo, hi = roi
        idx = [k for k in range(n) if lo <= 6 * k <= hi]
        row["edges_small_text"] = q.edge_retention(rl[idx], dl[idx], roi=box, thresh=60)
    return row


def cell(clip, src, sim):
    key = f"{clip}|{src}|{sim}"
    if key in load_results():
        return key, "cached"
    s = ensure_source(clip, src)
    d = os.path.join(q.WORK, "sim")
    os.makedirs(d, exist_ok=True)
    out = q.platform_sim(s, os.path.join(d, f"{clip}__{src}__{sim}.mp4"), sim)
    row = {"clip": clip, "source": src, "sim": sim, "out_kbps": q.probe_kbps(out)["kbps"]}
    if src != "lossless":
        row["source_kbps"] = q.probe_kbps(s)["kbps"]
    row.update(score(out, clip, f"{clip}__{src}__{sim}"))
    put(key, row)
    return key, row


def source_only(clip, src):
    key = f"{clip}|{src}|-"
    if key in load_results():
        return key, "cached"
    s = ensure_source(clip, src)
    row = {"clip": clip, "source": src, "sim": None, "source_kbps": q.probe_kbps(s)["kbps"],
           "source_bytes_per_s": round(q.probe_kbps(s)["bytes"] / q.probe_kbps(s)["duration"])}
    row.update(score(s, clip, f"{clip}__{src}__nosim"))
    put(key, row)
    return key, row


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--only", default=None, help="substring filter on cell keys")
    a = ap.parse_args()
    # phase 1: clips + sources (serial per clip to avoid duplicate work)
    for clip in ["A", "A1", "B", "B0", "Astatic", "B0static"]:
        ensure_clip(clip)
        print("clip ready", clip, flush=True)
    srcs = sorted({(c, s) for c, s, _ in PLAN} | set(SOURCE_ONLY))
    with ThreadPoolExecutor(a.workers) as ex:
        for f in as_completed([ex.submit(ensure_source, c, s) for c, s in srcs]):
            print("source ready", f.result(), flush=True)
    jobs = [("cell", c) for c in PLAN] + [("src", c) for c in SOURCE_ONLY]
    if a.only:
        jobs = [j for j in jobs if a.only in "|".join(j[1])]
    with ThreadPoolExecutor(a.workers) as ex:
        futs = {ex.submit(cell if kind == "cell" else source_only, *args): args for kind, args in jobs}
        for f in as_completed(futs):
            try:
                k, row = f.result()
                print(k, json.dumps(row) if isinstance(row, dict) else row, flush=True)
            except Exception as e:  # noqa: BLE001
                print("FAILED", futs[f], str(e)[:600], flush=True)


if __name__ == "__main__":
    main()
