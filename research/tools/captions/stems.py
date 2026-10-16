"""Stem thickness / cap height / x-height ratios for font specs (to match measured glyphs).

Usage: python3 -I stems.py <fontspec> [<fontspec> ...]
Prints per font: cap height (em), x-height/cap, stem('l')/cap, stem('i')/cap, 'o' width/cap, 'H' width/cap.
"""
import sys
import numpy as np
import importlib.util
from PIL import Image, ImageDraw
spec = importlib.util.spec_from_file_location('specimen', __file__.replace('stems.py', 'specimen.py'))
sp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sp)


def ink(f, ch):
    im = Image.new('L', (2000, 1600), 0)
    ImageDraw.Draw(im).text((200, 200), ch, font=f, fill=255)
    a = np.asarray(im) > 128
    ys, xs = np.nonzero(a)
    return a, xs.min(), xs.max(), ys.min(), ys.max()


for s in sys.argv[1:]:
    f, label = sp.load(s, 1000)
    _, hx0, hx1, hy0, hy1 = ink(f, 'H')
    cap = hy1 - hy0 + 1
    _, xx0, xx1, xy0, xy1 = ink(f, 'x')
    xh = xy1 - xy0 + 1
    a, lx0, lx1, ly0, ly1 = ink(f, 'l')
    stem_l = lx1 - lx0 + 1
    # row-mid width of 'i' stem
    a, ix0, ix1, iy0, iy1 = ink(f, 'i')
    mid = (iy1 + iy0 + (iy1 - iy0) // 2) // 2
    row = np.nonzero(a[iy1 - 50])[0]
    stem_i = row.max() - row.min() + 1
    _, ox0, ox1, oy0, oy1 = ink(f, 'o')
    print(f'{label:16s} cap {cap/1000:.3f}em  x/cap {xh/cap:.3f}  l/cap {stem_l/cap:.3f}  i/cap {stem_i/cap:.3f}  o_w/cap {(ox1-ox0+1)/cap:.3f}  H_w/cap {(hx1-hx0+1)/cap:.3f}  asc_l/cap {(ly1-ly0+1)/cap:.3f}')
