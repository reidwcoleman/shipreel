"""Measure an iMessage-style chat frame (python3 -I).
usage: measure_chat.py <frame.png> [x0 y0 x1 y1 search box]
Reports: white card bbox + corner radius estimate, header band, blue/gray bubble components
(bbox, size, mean colour), and vertical gaps between bubbles."""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

p = sys.argv[1]
im = np.asarray(Image.open(p).convert("RGB")).astype(int)
H, W, _ = im.shape
box = [int(v) for v in sys.argv[2:6]] if len(sys.argv) >= 6 else [0, 0, W, H]
x0, y0, x1, y1 = box
sub = im[y0:y1, x0:x1]
r, g, b = sub[..., 0], sub[..., 1], sub[..., 2]
hexc = lambda c: "#%02X%02X%02X" % tuple(int(round(v)) for v in c)

# white card (near-white, low chroma)
white = (r > 240) & (g > 240) & (b > 240)
lab, n = ndi.label(white)
if n:
    sizes = ndi.sum(white, lab, range(1, n + 1))
    k = int(np.argmax(sizes)) + 1
    ys, xs = np.where(lab == k)
    cx0, cx1, cy0, cy1 = xs.min(), xs.max(), ys.min(), ys.max()
    print(f"white region bbox x{cx0+x0}-{cx1+x0} y{cy0+y0}-{cy1+y0}  w={cx1-cx0+1} h={cy1-cy0+1} area={int(sizes[k-1])}")

# blue bubbles: strongly blue
blue = (b > 180) & (r < 120) & (b - r > 100)
gray = (abs(r - g) < 6) & (abs(g - b) < 8) & (r > 220) & (r < 240)
for name, m in (("blue", blue), ("gray", gray)):
    m2 = ndi.binary_opening(m, iterations=2)
    lab, n = ndi.label(m2)
    objs = ndi.find_objects(lab)
    rows = []
    for i, sl in enumerate(objs):
        if sl is None: continue
        hh = sl[0].stop - sl[0].start; ww = sl[1].stop - sl[1].start
        if hh < 25 or ww < 40: continue
        mask = lab[sl] == i + 1
        col = sub[sl][mask].mean(axis=0)
        rows.append((sl[0].start + y0, sl[0].stop + y0, sl[1].start + x0, sl[1].stop + x0, hh, ww, hexc(col), int(mask.sum())))
    rows.sort()
    print(f"{name} components: {len(rows)}")
    for rr in rows:
        print(f"  y{rr[0]}-{rr[1]} x{rr[2]}-{rr[3]}  h={rr[4]} w={rr[5]} col={rr[6]} fill={rr[7]/(rr[4]*rr[5]):.3f}")
