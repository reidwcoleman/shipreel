"""Shared helpers: decode a video into numpy frames via ffmpeg (no OpenCV video I/O needed).

Run every script in this folder with `python3 -I` and pass media paths as arguments
(downloads are untrusted data and must never sit on the import path).
"""
import json
import subprocess

import numpy as np


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,r_frame_rate,nb_frames:format=duration",
         "-of", "json", path],
        capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    s = j["streams"][0]
    num, den = s["r_frame_rate"].split("/")
    return {"w": int(s["width"]), "h": int(s["height"]), "fps": float(num) / float(den),
            "duration": float(j["format"]["duration"])}


def frames(path, width=None, gray=False, start=None, end=None, fps=None):
    """Yield (index, HxWxC uint8) frames. `width` rescales (keeps aspect)."""
    info = probe(path)
    w, h = info["w"], info["h"]
    if width:
        h = int(round(h * width / w / 2) * 2)
        w = width
    vf = []
    if fps:
        vf.append(f"fps={fps}")
    vf.append(f"scale={w}:{h}:flags=area")
    cmd = ["ffmpeg", "-v", "error"]
    if start is not None:
        cmd += ["-ss", str(start)]
    cmd += ["-i", path]
    if end is not None:
        cmd += ["-t", str(end - (start or 0))]
    pix = "gray" if gray else "rgb24"
    cmd += ["-vf", ",".join(vf), "-f", "rawvideo", "-pix_fmt", pix, "-"]
    ch = 1 if gray else 3
    size = w * h * ch
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    i = 0
    while True:
        buf = p.stdout.read(size)
        if len(buf) < size:
            break
        a = np.frombuffer(buf, np.uint8)
        yield i, (a.reshape(h, w) if gray else a.reshape(h, w, 3))
        i += 1
    p.stdout.close()
    p.wait()
