"""Row/column ink profile for text measurement (python3 -I).
usage: textrows.py <img> x0 y0 x1 y1 <dark|light> [thr]
Prints, per row, the count of ink pixels (dark: lum<thr, light: lum>thr) and summarises bands
(x-height band = rows with count >= 35% of max within each line)."""
import sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(float)
x0, y0, x1, y1 = map(int, sys.argv[2:6]); mode = sys.argv[6]
thr = float(sys.argv[7]) if len(sys.argv) > 7 else (110 if mode == "dark" else 200)
lum = im[y0:y1, x0:x1].mean(axis=2)
ink = lum < thr if mode == "dark" else lum > thr
cnt = ink.sum(axis=1)
# bands of consecutive rows with ink
bands = []; inb = False
for i, c in enumerate(cnt):
    if c > 0 and not inb: s = i; inb = True
    if c == 0 and inb: bands.append((s, i - 1)); inb = False
if inb: bands.append((s, len(cnt) - 1))
for s, e in bands:
    seg = cnt[s:e + 1]; mx = seg.max()
    dense = np.where(seg >= 0.35 * mx)[0]
    cols = np.where(ink[s:e + 1].any(axis=0))[0]
    print(f"band y{y0+s}-{y0+e} ({e-s+1}px)  dense y{y0+s+dense[0]}-{y0+s+dense[-1]} ({dense[-1]-dense[0]+1}px)  ink x{x0+cols[0]}-{x0+cols[-1]} ({cols[-1]-cols[0]+1}px)")
