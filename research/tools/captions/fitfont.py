"""Grid-search font instances (+ tracking and size) to best match a measured text crop (max IoU).

Usage: python3 -I fitfont.py <frame.png> x0 y0 x1 y1 "<text>" <polarity> <baseline_y> <cap_px> <candidates.txt|fontspec,...> [thr]
candidates: comma-separated fontspecs (see specimen.py), each may contain {w} to sweep weights, e.g.
   fonts/TikTokSans-VF.ttf@wght={w},opsz=12#TT-op12
Weights swept: 400..900 step 50 where {w} appears. Tracking swept -0.04..+0.06 em step 0.01.
Size swept: cap_px * (0.96..1.04) to absorb cap-height measurement error.
Prints the top results.
"""
import sys
import numpy as np
from PIL import Image, ImageDraw
import importlib.util
spec = importlib.util.spec_from_file_location('specimen', __file__.replace('fitfont.py', 'specimen.py'))
sp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sp)


def frame_mask(path, box, pol, thr):
    x0, y0, x1, y1 = box
    a = np.asarray(Image.open(path).convert('RGB').crop(box)).astype(float)
    luma = a @ np.array([0.299, 0.587, 0.114])
    if pol == 'dark':
        return luma < (thr or 110)
    if pol == 'light':
        return luma > (thr or 200)
    _, hx, tol = pol.split(':')
    c = np.array([int(hx[i:i + 2], 16) for i in (0, 2, 4)], float)
    return np.sqrt(((a - c) ** 2).sum(-1)) < float(tol)


def render(f, text, size, track, W, H, by):
    ren = Image.new('L', (W * 3, H), 0)
    d = ImageDraw.Draw(ren)
    x = 0.0
    for i, c in enumerate(text):
        d.text((x, by), c, font=f, fill=255, anchor='ls')
        adv = f.getlength(c)
        kern = (f.getlength(text[i:i + 2]) - f.getlength(text[i + 1]) - adv) if i + 1 < len(text) else 0
        x += adv + kern + track * size
    return np.asarray(ren) > 128


def iou(mask, r):
    ys, xs = np.nonzero(mask)
    fx0 = xs.min()
    rys, rxs = np.nonzero(r)
    if len(rxs) == 0:
        return 0, 0
    rx0, rx1 = rxs.min(), rxs.max()
    al = np.zeros_like(mask)
    W = mask.shape[1]
    ww = min(r.shape[1] - rx0, W - fx0)
    al[:, fx0:fx0 + ww] = r[:, rx0:rx0 + ww]
    return (mask & al).sum() / (mask | al).sum(), (rx1 - rx0 + 1) / (xs.max() - fx0 + 1)


def main():
    path = sys.argv[1]
    box = tuple(map(int, sys.argv[2:6]))
    text, pol, base, cap = sys.argv[6], sys.argv[7], int(sys.argv[8]), float(sys.argv[9])
    cands = sys.argv[10]
    thr = float(sys.argv[11]) if len(sys.argv) > 11 else None
    if cands.endswith('.txt'):
        cands = [l.strip() for l in open(cands) if l.strip() and not l.startswith('#')]
    else:
        cands = cands.split(',')
    mask = frame_mask(path, box, pol, thr)
    W, H = box[2] - box[0], box[3] - box[1]
    by = base - box[1]
    results = []
    for c in cands:
        ws = list(range(400, 901, 50)) if '{w}' in c else [None]
        for w in ws:
            fs = c.replace('{w}', str(w)) if w else c
            try:
                ch = sp.cap_height(fs)
            except Exception as e:
                print('skip', fs, e)
                continue
            best = None
            for sc in (0.97, 1.0, 1.03):
                size = cap * sc / ch
                f, label = sp.load(fs, int(round(size)))
                for tr in np.arange(-0.04, 0.0601, 0.01):
                    r = render(f, text, size, tr, W, H, by)
                    v, ratio = iou(mask, r)
                    if best is None or v > best[0]:
                        best = (v, ratio, sc, tr, label, int(round(size)))
            results.append(best)
    results.sort(key=lambda t: -t[0])
    for v, ratio, sc, tr, label, size in results[:12]:
        print(f'IoU {v:.3f}  widthratio {ratio:.3f}  capscale {sc:.2f}  tracking {tr:+.2f}em  size {size}px  {label}')


if __name__ == '__main__':
    main()
