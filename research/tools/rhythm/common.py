"""Shared helpers: ffprobe, frame decoding, small stats utilities.

All pixel quantities reported by the toolkit are expressed in "px at 1080w":
pixels of the ORIGINAL frame after scaling it to 1080 px width (so a 720x1280
TikTok and a 1080x1920 render are comparable). Frame counts are reported both
at the analysis frame rate and at 30 fps ("f30"), Shipreel's render rate.
"""
from __future__ import annotations

import json
import math
import re
import subprocess
from dataclasses import dataclass

import numpy as np

SHIPREEL_FPS = 30.0


def run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, check=check)


def _rate(s: str | None) -> float:
    if not s or s in ("0/0", "N/A"):
        return 0.0
    if "/" in s:
        n, d = s.split("/")
        return float(n) / float(d) if float(d) else 0.0
    return float(s)


@dataclass
class Probe:
    path: str
    width: int
    height: int
    fps_r: float
    fps_avg: float
    duration: float
    vcodec: str
    v_start: float
    has_audio: bool
    a_start: float
    audio_codec: str | None
    audio_sr: int | None
    audio_channels: int | None
    nb_frames: int | None

    def as_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items()}


def probe(path: str) -> Probe:
    out = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", path])
    d = json.loads(out.stdout)
    streams = d.get("streams", [])
    v = next(s for s in streams if s.get("codec_type") == "video")
    a = next((s for s in streams if s.get("codec_type") == "audio"), None)
    w, h = int(v["width"]), int(v["height"])
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            try:
                rot = int(float(sd["rotation"]))
            except (TypeError, ValueError):
                pass
    tags_rot = (v.get("tags") or {}).get("rotate")
    if tags_rot:
        try:
            rot = int(tags_rot)
        except ValueError:
            pass
    if abs(rot) % 180 == 90:
        w, h = h, w
    dur = float(d.get("format", {}).get("duration") or v.get("duration") or 0.0)
    nb = v.get("nb_frames")
    return Probe(
        path=path,
        width=w,
        height=h,
        fps_r=_rate(v.get("r_frame_rate")),
        fps_avg=_rate(v.get("avg_frame_rate")),
        duration=dur,
        vcodec=v.get("codec_name", "?"),
        v_start=float(v.get("start_time") or 0.0),
        has_audio=a is not None,
        a_start=float((a or {}).get("start_time") or 0.0),
        audio_codec=(a or {}).get("codec_name"),
        audio_sr=int((a or {}).get("sample_rate") or 0) or None,
        audio_channels=(a or {}).get("channels"),
        nb_frames=int(nb) if nb and str(nb).isdigit() else None,
    )


def choose_analysis_fps(p: Probe, cap: float = 30.0) -> tuple[float, bool]:
    """Return (fps, needs_fps_filter). Native CFR <= cap is analysed natively."""
    r, avg = p.fps_r, p.fps_avg
    vfr = r > 0 and avg > 0 and abs(r - avg) / r > 0.02
    native = avg if avg > 0 else r
    if not vfr and native <= cap + 0.5:
        return native, False
    # VFR or high frame rate: resample (60 -> 30 drops every other frame cleanly)
    target = min(cap, round(native)) if native > 0 else cap
    return float(target), True


def detect_bars(path: str, duration: float) -> tuple[int, int, int, int] | None:
    """Detect constant black letterbox/pillarbox bars. Returns crop (w,h,x,y) or None."""
    ss = 0.0
    cmd = [
        "ffmpeg", "-v", "info", "-nostdin", "-ss", f"{ss}", "-i", path, "-an",
        "-vf", "fps=2,cropdetect=limit=20:round=2:reset=0", "-f", "null", "-",
    ]
    out = run(cmd, check=False).stderr
    m = re.findall(r"crop=(\d+):(\d+):(\d+):(\d+)", out)
    if not m:
        return None
    w, h, x, y = map(int, m[-1])
    return w, h, x, y


def frames_iter(path: str, width: int, height: int, fps: float, use_fps_filter: bool,
                crop: tuple[int, int, int, int] | None = None, start: float | None = None,
                nframes: int | None = None, pix_fmt: str = "rgb24"):
    vf = []
    if use_fps_filter:
        vf.append(f"fps={fps:g}")
    if crop:
        cw, ch, cx, cy = crop
        vf.append(f"crop={cw}:{ch}:{cx}:{cy}")
    vf.append(f"scale={width}:{height}:flags=area")
    cmd = ["ffmpeg", "-v", "error", "-nostdin"]
    if start is not None:
        cmd += ["-ss", f"{start:.4f}"]
    cmd += ["-i", path, "-an", "-sn", "-vf", ",".join(vf)]
    if nframes:
        cmd += ["-frames:v", str(nframes)]
    cmd += ["-f", "rawvideo", "-pix_fmt", pix_fmt, "-"]
    ch_n = 3 if pix_fmt == "rgb24" else 1
    fs = width * height * ch_n
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    try:
        while True:
            buf = p.stdout.read(fs)
            if len(buf) < fs:
                break
            arr = np.frombuffer(buf, np.uint8)
            yield arr.reshape(height, width, ch_n) if ch_n == 3 else arr.reshape(height, width)
    finally:
        p.stdout.close()
        p.wait()


def stats(values, digits: int = 3) -> dict | None:
    """median / IQR / mean / n for a list of numbers (None if empty)."""
    v = np.asarray([x for x in values if x is not None and np.isfinite(x)], dtype=float)
    if v.size == 0:
        return None
    q1, med, q3 = np.percentile(v, [25, 50, 75])
    r = lambda x: round(float(x), digits)
    return {"n": int(v.size), "median": r(med), "q1": r(q1), "q3": r(q3), "mean": r(v.mean()),
            "min": r(v.min()), "max": r(v.max())}


def rnd(x, d=3):
    if x is None:
        return None
    if isinstance(x, (list, tuple)):
        return [rnd(y, d) for y in x]
    if isinstance(x, (np.floating, float)):
        if not math.isfinite(float(x)):
            return None
        return round(float(x), d)
    if isinstance(x, np.integer):
        return int(x)
    return x


def to_jsonable(o):
    if isinstance(o, dict):
        return {str(k): to_jsonable(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [to_jsonable(v) for v in o]
    if isinstance(o, np.ndarray):
        return [to_jsonable(v) for v in o.tolist()]
    if isinstance(o, (np.floating, float)):
        f = float(o)
        return round(f, 4) if math.isfinite(f) else None
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.bool_,)):
        return bool(o)
    return o
