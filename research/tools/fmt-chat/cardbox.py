"""Find the chat card and its bubbles in one frame (python3 -I).
usage: cardbox.py <img> <light|dark>
light: card body near-white; received bubble neutral gray ~#E6E6E6; header ~#F2F2F2
dark : card body near-black; received bubble ~#252525; header ~#1B1B1C"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
im = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(int)
mode = sys.argv[2]
H, W, _ = im.shape
r, g, b = im[..., 0], im[..., 1], im[..., 2]
lum = im.mean(axis=2)
neutral = (abs(r - g) < 8) & (abs(g - b) < 10)
hexc = lambda c: "#%02X%02X%02X" % tuple(int(round(v)) for v in c)
if mode == "light":
    body = neutral & (lum > 246)
    recv = neutral & (lum > 220) & (lum < 238)
else:
    body = neutral & (lum < 7)
    recv = neutral & (lum > 28) & (lum < 50)
sent = (b > 170) & (r < 100) & (b - r > 110)
lab, n = ndi.label(ndi.binary_opening(body, iterations=1))
sizes = ndi.sum(body, lab, range(1, n + 1))
k = int(np.argmax(sizes)) + 1
ys, xs = np.where(lab == k)
print(f"frame {W}x{H}; body bbox x{xs.min()}-{xs.max()} y{ys.min()}-{ys.max()} (w={xs.max()-xs.min()+1}, {100*(xs.max()-xs.min()+1)/W:.1f}% W)")
for name, m in (("sent", sent), ("recv", recv)):
    m2 = ndi.binary_opening(m, iterations=1)
    lab2, n2 = ndi.label(m2)
    for i, sl in enumerate(ndi.find_objects(lab2)):
        hh = sl[0].stop - sl[0].start; ww = sl[1].stop - sl[1].start
        if hh < 12 or ww < 25: continue
        mask = lab2[sl] == i + 1
        print(f"  {name}: y{sl[0].start}-{sl[0].stop-1} x{sl[1].start}-{sl[1].stop-1} h={hh} w={ww} fill={mask.mean():.2f} col={hexc(im[sl][mask].mean(axis=0))}")
