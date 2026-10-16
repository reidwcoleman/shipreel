"""Segment glyphs (connected components) of text inside a region and print their boxes.

Usage: python3 -I glyphs.py <frame.png> x0 y0 x1 y1 <mode> [thr]
mode: dark  -> glyph pixels are dark (luma < thr, default 110)   e.g. black text on white box
      light -> glyph pixels are light (luma > thr, default 200)  e.g. white text with outline
      color:<hex>:<tol> -> pixels within tol of hex
Prints each component (sorted by x): x0-x1, y0-y1, w, h, area.
Also prints line bands and estimates: cap height (median height of tall comps), x-height.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage


def main():
    path = sys.argv[1]
    x0, y0, x1, y1 = map(int, sys.argv[2:6])
    mode = sys.argv[6]
    im = np.asarray(Image.open(path).convert('RGB')).astype(float)
    reg = im[y0:y1, x0:x1]
    luma = 0.299 * reg[..., 0] + 0.587 * reg[..., 1] + 0.114 * reg[..., 2]
    if mode == 'dark':
        thr = float(sys.argv[7]) if len(sys.argv) > 7 else 110
        m = luma < thr
    elif mode == 'light':
        thr = float(sys.argv[7]) if len(sys.argv) > 7 else 200
        m = luma > thr
    elif mode.startswith('color:'):
        _, hx, tol = mode.split(':')
        c = np.array([int(hx[i:i + 2], 16) for i in (0, 2, 4)], float)
        m = np.sqrt(((reg - c) ** 2).sum(-1)) < float(tol)
    else:
        raise SystemExit('bad mode')
    lab, n = ndimage.label(m)
    objs = ndimage.find_objects(lab)
    comps = []
    for i, sl in enumerate(objs):
        if sl is None:
            continue
        area = int((lab[sl] == i + 1).sum())
        if area < 30:
            continue
        ys, xs = sl
        comps.append((xs.start + x0, xs.stop - 1 + x0, ys.start + y0, ys.stop - 1 + y0, area))
    comps.sort()
    for c in comps:
        print(f'x {c[0]}-{c[1]} y {c[2]}-{c[3]}  w {c[1] - c[0] + 1} h {c[3] - c[2] + 1} area {c[4]}')
    hs = np.array([c[3] - c[2] + 1 for c in comps])
    if len(hs):
        print('heights sorted:', sorted(hs.tolist()))


if __name__ == '__main__':
    main()
