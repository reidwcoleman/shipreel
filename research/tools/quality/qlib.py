"""Shared helpers for the export-quality experiments (research only).

Everything writes under research/tools/quality/work/. Encoders come from the system ffmpeg
(libx264 core 165 r3222, the same x264 build Remotion 4.0.535's bundled ffmpeg uses).
"""
import json
import os
import re
import subprocess
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, "work")
MASTER = os.path.join(WORK, "master")
W, H, FPS = 1080, 1920, 30


def run(args, log=None, timeout=None):
    t = time.time()
    r = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"command failed ({r.returncode}): {' '.join(args)}\n{r.stderr[-3000:]}")
    if log is not None:
        log.append(round(time.time() - t, 1))
    return r


def ff(*args):
    return ["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-y", *args]


def probe_kbps(path):
    r = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=bit_rate,nb_frames:format=duration,size",
             "-of", "json", path])
    d = json.loads(r.stdout)
    size = int(d["format"]["size"])
    dur = float(d["format"]["duration"])
    st = d["streams"][0]
    vk = int(st["bit_rate"]) / 1000 if st.get("bit_rate") else size * 8 / dur / 1000
    return {"kbps": round(vk), "bytes": size, "duration": round(dur, 3)}


# ---------------------------------------------------------------- source settings
# Each source candidate = how Shipreel could encode its upload. "x264" args mirror what Remotion passes
# (Remotion: -c:v libx264 -pix_fmt <pixelFormat> [-preset <x264Preset>] -crf <crf>), plus extra args
# that would have to go through ffmpegOverride (tune, profile/level, x264-params).
SOURCES = {
    "lossless": None,  # the reference itself, i.e. a perfect upload (ceiling)
    "crf18_medium": ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18"],  # = production today
    "crf18_slow": ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "slow", "-crf", "18"],
    "crf15_medium": ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "15"],
    "crf15_slow": ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "slow", "-crf", "15"],
    "crf12_slow": ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "slow", "-crf", "12"],
    "crf15_veryslow": ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryslow", "-crf", "15"],
    "crf15_slow_animation": ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "slow", "-tune", "animation", "-crf", "15"],
    "crf15_slow_stillimage": ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "slow", "-tune", "stillimage", "-crf", "15"],
    "crf15_slow_10bit": ["-c:v", "libx264", "-pix_fmt", "yuv420p10le", "-preset", "slow", "-crf", "15"],
}

# ---------------------------------------------------------------- platform simulations
# Calibrated on what the platforms actually SERVE (yt-dlp ladders in refs/, Oct 2026):
#   TikTok: HEVC Main 8-bit, 1080x1920 ~320-1790 kbps (UI-style app videos ~420-700), 720x1280 ~380-560 kbps
#   YouTube Shorts: AV1 1080x1920@30 ~1.58 Mbps (VP9 2.35, H.264 2.87); @60fps AV1 2.75 Mbps
#   X: H.264 High 720x1280 ~745 kbps top rung for non-Premium uploads
#   "h264_3m": the generous case from the brief (IG/Threads/LinkedIn-style H.264 rung)
SIMS = {
    "tt1080_hevc700k": {"scale": None, "args": ["-c:v", "libx265", "-preset", "medium", "-b:v", "700k", "-maxrate", "1050k", "-bufsize", "1400k",
                                                 "-x265-params", "keyint=60:min-keyint=30:log-level=error"]},
    "tt720_hevc400k": {"scale": (720, 1280), "args": ["-c:v", "libx265", "-preset", "medium", "-b:v", "400k", "-maxrate", "600k", "-bufsize", "800k",
                                                       "-x265-params", "keyint=60:min-keyint=30:log-level=error"]},
    "yt_av1_1200k": {"scale": None, "args": ["-c:v", "libsvtav1", "-preset", "8", "-b:v", "1200k", "-g", "60", "-svtav1-params", "rc=1"]},
    "x720_h264_750k": {"scale": (720, 1280), "args": ["-c:v", "libx264", "-preset", "medium", "-profile:v", "high", "-b:v", "750k", "-maxrate", "1100k",
                                                       "-bufsize", "1500k", "-g", "60"]},
    "h264_3m": {"scale": None, "args": ["-c:v", "libx264", "-preset", "medium", "-profile:v", "high", "-b:v", "3000k", "-maxrate", "4500k",
                                        "-bufsize", "6000k", "-g", "60"]},
}


def make_clip_ref(master_dir, frames, out, pix_fmt="yuv420p"):
    """PNG frames (RGB truth) -> lossless x264 (qp 0). RGB->YUV via swscale defaults (BT.601 matrix,
    limited range), exactly what Remotion's colorSpace:"default" produces."""
    if os.path.exists(out):
        return out
    listfile = out + ".txt"
    with open(listfile, "w") as f:
        for n in frames:
            f.write(f"file '{os.path.join(master_dir, f'element-{n:03d}.png')}'\nduration {1 / FPS:.6f}\n")
    run(ff("-f", "concat", "-safe", "0", "-i", listfile, "-r", str(FPS), "-pix_fmt", pix_fmt, "-c:v", "libx264",
           "-preset", "ultrafast", "-qp", "0", "-threads", "4", out))
    return out


def encode_source(ref, out, name, png_list=None):
    args = SOURCES[name]
    if args is None:
        return ref
    if os.path.exists(out):
        return out
    if "yuv420p10le" in args and png_list:
        # 10-bit must come from the RGB master, not from the 8-bit reference
        run(ff("-f", "concat", "-safe", "0", "-i", png_list, "-r", str(FPS), *args, "-threads", "4", out))
    else:
        run(ff("-i", ref, *args, "-threads", "4", out))
    return out


def platform_sim(src, out, sim):
    if os.path.exists(out):
        return out
    s = SIMS[sim]
    vf = ["-vf", f"scale={s['scale'][0]}:{s['scale'][1]}:flags=bicubic"] if s["scale"] else []
    run(ff("-i", src, *vf, "-pix_fmt", "yuv420p", *s["args"], "-threads", "4", "-an", out))
    return out


def vmaf(dist, ref, json_out, subsample=3, cambi=False, threads=4):
    """VMAF v0.6.1 + VMAF NEG + PSNR (+CAMBI, no-reference banding on the distorted) at 1080x1920.
    Distorted streams below 1080x1920 are bicubic-upscaled first (what a phone player does)."""
    if os.path.exists(json_out):
        return json.load(open(json_out))["pooled_metrics"]
    feats = "name=psnr" + ("|name=cambi" if cambi else "")
    flt = (f"[0:v]scale={W}:{H}:flags=bicubic,format=yuv420p[d];[1:v]format=yuv420p[r];"
           f"[d][r]libvmaf=model='version=vmaf_v0.6.1\\:name=vmaf|version=vmaf_v0.6.1neg\\:name=vmafneg'"
           f":feature='{feats}':log_fmt=json:log_path={json_out}:n_threads={threads}:n_subsample={subsample}")
    run(ff("-i", dist, "-i", ref, "-lavfi", flt, "-f", "null", "-"))
    return json.load(open(json_out))["pooled_metrics"]


def cambi_only(dist, json_out, subsample=5, threads=4):
    """CAMBI banding index of a stream on its own (no reference needed; 0 = none, >~5 visible)."""
    if os.path.exists(json_out):
        return json.load(open(json_out))["pooled_metrics"]["cambi"]
    flt = (f"[0:v]scale={W}:{H}:flags=bicubic,format=yuv420p,split[a][b];"
           f"[a][b]libvmaf=model='version=vmaf_v0.6.1':feature='name=cambi':log_fmt=json:log_path={json_out}"
           f":n_threads={threads}:n_subsample={subsample}")
    run(ff("-i", dist, "-lavfi", flt, "-f", "null", "-"))
    return json.load(open(json_out))["pooled_metrics"]["cambi"]


def read_luma(path, every=6, w=W, h=H):
    """Decode the Y plane (upscaled to 1080x1920 if needed) of every `every`-th frame as uint8 arrays."""
    vf = f"select='not(mod(n\\,{every}))',scale={w}:{h}:flags=bicubic,format=gray"
    p = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", path, "-vf", vf, "-fps_mode", "passthrough",
                        "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True, timeout=1800)
    buf = np.frombuffer(p.stdout, dtype=np.uint8)
    return buf.reshape(-1, h, w)


def edge_retention(ref_frames, dist_frames, roi=None, thresh=80):
    """Edge-contrast retention: mean Sobel magnitude of the output at the reference's strong-edge pixels
    (text, UI borders), divided by the reference's. 1.0 = edges exactly as crisp; <1 = softer/eroded.
    Also returns the overshoot/ringing energy in a 2-px band around those edges (mean |err|)."""
    import cv2

    rs, ds, ring = [], [], []
    for r, d in zip(ref_frames, dist_frames):
        if roi:
            x0, y0, x1, y1 = roi
            r, d = r[y0:y1, x0:x1], d[y0:y1, x0:x1]
        rf, df = r.astype(np.float32), d.astype(np.float32)
        gr = cv2.magnitude(cv2.Sobel(rf, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(rf, cv2.CV_32F, 0, 1, ksize=3))
        gd = cv2.magnitude(cv2.Sobel(df, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(df, cv2.CV_32F, 0, 1, ksize=3))
        m = gr > thresh
        if m.sum() < 50:
            continue
        rs.append(gr[m].mean())
        ds.append(gd[m].mean())
        band = cv2.dilate(m.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool) & ~m
        ring.append(np.abs(rf[band] - df[band]).mean())
    if not rs:
        return None
    return {"ecr": round(float(np.sum(ds) / np.sum(rs)), 4), "edge_band_mae": round(float(np.mean(ring)), 3), "frames": len(rs)}


def save_json(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(obj, f, indent=1)
    os.replace(tmp, path)


def parse_pooled(pm):
    out = {}
    for k in ("vmaf", "vmafneg", "psnr_y", "cambi"):
        if k in pm:
            out[k] = round(pm[k]["mean"], 3)
            if k in ("vmaf", "vmafneg"):
                out[k + "_min"] = round(pm[k]["min"], 2)
                out[k + "_p5"] = None
    return out
