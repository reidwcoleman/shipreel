"""Annotated spectrogram strips (numpy + PIL): log-f spectrogram, 100 ms K-weighted loudness, visual cuts.

usage: AUDIO_WORK=<dir> python3 -I research/tools/audio/viz.py <tag>=<media> [chunk_s] [px_per_s]
writes <WORK>/viz/<tag>-<n>.png and <WORK>/viz/<tag>.cuts.json
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

import common as C  # noqa: E402

ANCH = np.array([[0, 0, 4], [40, 11, 84], [101, 21, 110], [159, 42, 99], [212, 72, 66], [245, 125, 21], [250, 193, 39], [252, 255, 164]], float)


def cmap(v: np.ndarray) -> np.ndarray:
    v = np.clip(v, 0, 1) * (len(ANCH) - 1)
    i = np.floor(v).astype(int).clip(0, len(ANCH) - 2)
    f = (v - i)[..., None]
    return (ANCH[i] * (1 - f) + ANCH[i + 1] * f).astype(np.uint8)


def logspec(x, sr, hop=480, n_fft=4096, rows=220, fmin=40, fmax=16000):
    f, t, S = C.stft_db(x, sr, n_fft=n_fft, hop=hop)
    edges = np.geomspace(fmin, fmax, rows + 1)
    # each row takes the max over its bins (rows narrower than a bin reuse the nearest bin)
    lo = np.clip(np.searchsorted(f, edges[:-1]), 0, len(f) - 1)
    hi = np.clip(np.searchsorted(f, edges[1:]), 0, len(f))
    hi = np.maximum(hi, lo + 1)
    out = np.empty((rows, S.shape[1]))
    for r in range(rows):
        out[r] = S[lo[r]:hi[r]].max(axis=0)
    return t, out[::-1], edges


def main(arg, chunk_s=20.0, pps=80):
    tag, src = arg.split("=", 1)
    sr, x = C.work_wav(src, tag, ch=2)
    mono = x.mean(axis=1)
    dur = len(mono) / sr
    t, S, edges = logspec(mono, sr)
    top = S.max()
    xk = C.kweight(x)
    tl, L = C.block_lufs(xk, sr, 0.1, 0.01)
    cuts_t = []
    fps = None
    if C.video_fps(src):
        fr, fps = C.gray_frames(src)
        cuts, score = C.cut_frames(fr)
        cuts_t = [c / fps for c in cuts]
        json.dump({"fps": fps, "cuts": cuts, "cuts_t": cuts_t, "n_frames": len(fr)}, open(os.path.join(C.WORK, "viz", f"{tag}.cuts.json"), "w"))
    os.makedirs(os.path.join(C.WORK, "viz"), exist_ok=True)
    n = int(np.ceil(dur / chunk_s))
    for k in range(n):
        a, b = k * chunk_s, min(dur, (k + 1) * chunk_s)
        W = int((b - a) * pps) + 60
        H_spec, H_l = 220, 140
        img = Image.new("RGB", (W, H_spec + H_l + 40), (16, 16, 20))
        cols = (t >= a) & (t < b)
        Sv = (S[:, cols] - (top - 75)) / 75
        rgb = cmap(Sv)
        im = Image.fromarray(rgb).resize((int((b - a) * pps), H_spec), Image.BILINEAR)
        img.paste(im, (50, 0))
        d = ImageDraw.Draw(img)
        # frequency labels
        for fl in (100, 300, 1000, 3000, 10000):
            y = H_spec - int(np.log(fl / edges[0]) / np.log(edges[-1] / edges[0]) * H_spec)
            d.line([(44, y), (50, y)], fill=(200, 200, 200))
            d.text((2, y - 6), f"{fl//1000}k" if fl >= 1000 else str(fl), fill=(200, 200, 200))
        # loudness panel: -60..0 LUFS
        y0 = H_spec + 10
        for g in range(0, 61, 10):
            y = y0 + int(g / 60 * H_l)
            d.line([(50, y), (W, y)], fill=(50, 50, 60))
            d.text((2, y - 6), f"-{g}", fill=(160, 160, 160))
        m = (tl >= a) & (tl < b)
        pts = [(50 + (tt - a) * pps, y0 + min(H_l, max(0, -ll / 60 * H_l))) for tt, ll in zip(tl[m], L[m])]
        if len(pts) > 1:
            d.line(pts, fill=(120, 220, 255), width=1)
        for ct in cuts_t:
            if a <= ct < b:
                xx = 50 + (ct - a) * pps
                d.line([(xx, 0), (xx, y0 + H_l)], fill=(255, 40, 40), width=1)
        for s in range(int(np.ceil(a)), int(b) + 1):
            xx = 50 + (s - a) * pps
            d.line([(xx, y0 + H_l), (xx, y0 + H_l + 6)], fill=(220, 220, 220))
            d.text((xx + 2, y0 + H_l + 8), f"{s}s", fill=(220, 220, 220))
        img.save(os.path.join(C.WORK, "viz", f"{tag}-{k}.png"))
    print(tag, f"dur={dur:.1f}s fps={fps} cuts={len(cuts_t)} chunks={n}")


if __name__ == "__main__":
    os.makedirs(os.path.join(C.WORK, "viz"), exist_ok=True)
    main(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 20.0, int(sys.argv[3]) if len(sys.argv) > 3 else 80)
