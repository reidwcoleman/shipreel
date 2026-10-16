"""Measure a solid caption background box (white or black or coloured) in a frame.

Usage: python3 -I boxgeom.py <frame.png> x0 y0 x1 y1 <box_hex> [tol=40]
Prints: box bbox, per-row left/right extents (to see per-line vs merged boxes),
corner radius estimate from the rows where the extent shrinks, the glyph (text)
bbox inside the box, line bands, and median colours.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage


def hex2rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=float)


def main():
    path = sys.argv[1]
    x0, y0, x1, y1 = map(int, sys.argv[2:6])
    box = hex2rgb(sys.argv[6])
    tol = float(sys.argv[7]) if len(sys.argv) > 7 else 40
    im = np.asarray(Image.open(path).convert('RGB')).astype(float)
    reg = im[y0:y1, x0:x1]
    d = np.sqrt(((reg - box) ** 2).sum(-1))
    m = d < tol
    # the box = largest connected component after filling holes (glyph holes)
    lab, n = ndimage.label(m)
    if n == 0:
        print('no box pixels'); return
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    k = int(np.argmax(sizes)) + 1
    comp = lab == k
    filled = ndimage.binary_fill_holes(comp)
    ys, xs = np.nonzero(filled)
    bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
    print(f'box bbox (frame px): x {bx0 + x0}-{bx1 + x0}  y {by0 + y0}-{by1 + y0}  w {bx1 - bx0 + 1} h {by1 - by0 + 1}')
    # per-row extents
    rows = []
    for yy in range(by0, by1 + 1):
        r = np.nonzero(filled[yy])[0]
        rows.append((yy + y0, r.min() + x0, r.max() + x0, len(r)))
    # print compressed row extents: only where it changes
    prev = None
    print('row extents (y: left-right) where they change:')
    for (yy, l, rr, c) in rows:
        key = (l, rr)
        if key != prev:
            print(f'  y{yy}: {l}-{rr} (w {rr - l + 1})')
            prev = key
    # glyphs = non-box pixels inside filled box
    glyph = filled & ~comp
    gy, gx = np.nonzero(glyph)
    if len(gy):
        print(f'glyph bbox: x {gx.min() + x0}-{gx.max() + x0}  y {gy.min() + y0}-{gy.max() + y0}')
        prof = glyph.sum(1)
        on = prof > 0
        bands = []
        i = 0
        while i < len(on):
            if on[i]:
                j = i
                while j < len(on) and on[j]:
                    j += 1
                bands.append((i + y0, j - 1 + y0))
                i = j
            else:
                i += 1
        print('text row bands:', bands)
        print('glyph colour median:', np.median(reg[glyph], axis=0).round(1))
        # pad
        print(f'pad left {gx.min() - bx0}  right {bx1 - gx.max()}  top {gy.min() - by0}  bottom {by1 - gy.max()}')
    print('box colour median:', np.median(reg[comp], axis=0).round(1))


if __name__ == '__main__':
    main()
