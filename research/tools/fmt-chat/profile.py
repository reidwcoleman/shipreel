"""Pixel profiles for geometry (python3 -I).
usage: profile.py <img> col <x> <y0> <y1>     -> prints runs of similar colour down a column
       profile.py <img> row <y> <x0> <x1>     -> runs along a row
       profile.py <img> mode <x0> <y0> <x1> <y1> -> most common colours in a box
       profile.py <img> edge <x0> <y0> <x1> <y1> <thr> -> for each row, first x from the left where luminance > thr (corner radius)"""
import sys
import numpy as np
from PIL import Image
from collections import Counter
im = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(int)
cmd = sys.argv[2]
hexc = lambda c: "#%02X%02X%02X" % tuple(int(v) for v in c)
def runs(seq, coords, tol=10):
    out = []; start = 0
    for i in range(1, len(seq) + 1):
        if i == len(seq) or np.abs(seq[i] - seq[start]).max() > tol:
            out.append((coords[start], coords[i - 1], hexc(seq[start:i].mean(axis=0))))
            start = i
    return out
if cmd == "col":
    x, a, b = map(int, sys.argv[3:6]); seq = im[a:b, x]
    for s, e, c in runs(seq, list(range(a, b))):
        if e - s >= 1: print(f"y{s}-{e} ({e-s+1}px) {c}")
elif cmd == "row":
    y, a, b = map(int, sys.argv[3:6]); seq = im[y, a:b]
    for s, e, c in runs(seq, list(range(a, b))):
        if e - s >= 1: print(f"x{s}-{e} ({e-s+1}px) {c}")
elif cmd == "mode":
    x0, y0, x1, y1 = map(int, sys.argv[3:7]); px = im[y0:y1, x0:x1].reshape(-1, 3)
    q = (px // 2) * 2
    for c, n in Counter(map(tuple, q)).most_common(8): print(hexc(c), n, f"{n/len(q):.3f}")
elif cmd == "edge":
    x0, y0, x1, y1, thr = map(int, sys.argv[3:8])
    lum = im[..., :3].mean(axis=2)
    for y in range(y0, y1):
        row = lum[y, x0:x1]; idx = np.where(row > thr)[0]
        print(y, (x0 + idx[0]) if len(idx) else None)
