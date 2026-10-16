"""Overlay comparison of a measured text crop and a font rendering, aligned on the baseline.

Usage: python3 -I overlay.py <frame.png> x0 y0 x1 y1 <out.png> "<text>" <fontspec> <cap_px> <polarity> <baseline_y> [tracking_em=0] [thr]
  polarity: dark (black text on light bg) or light (white text on dark bg / outlined), or color:<hex>:<tol>
  baseline_y: absolute frame row of the text baseline (bottom of flat letters such as H, n, x)
Stacks: frame crop / rendering at the same scale / diff (white = both, red = frame only, cyan = font only).
Prints rendered ink width vs frame ink width (ratio > 1 means the font is too wide) and the IoU.
"""
import sys
import numpy as np
from PIL import Image, ImageDraw
import importlib.util
spec = importlib.util.spec_from_file_location('specimen', __file__.replace('overlay.py', 'specimen.py'))
sp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sp)


def main():
    path = sys.argv[1]
    x0, y0, x1, y1 = map(int, sys.argv[2:6])
    out, text, fspec, cap_px, pol = sys.argv[6], sys.argv[7], sys.argv[8], float(sys.argv[9]), sys.argv[10]
    base = int(sys.argv[11])
    track = float(sys.argv[12]) if len(sys.argv) > 12 else 0.0
    thr = float(sys.argv[13]) if len(sys.argv) > 13 else None
    crop = Image.open(path).convert('RGB').crop((x0, y0, x1, y1))
    a = np.asarray(crop).astype(float)
    luma = a @ np.array([0.299, 0.587, 0.114])
    if pol == 'dark':
        mask_frame = luma < (thr or 110)
    elif pol == 'light':
        mask_frame = luma > (thr or 200)
    else:
        _, hx, tol = pol.split(':')
        c = np.array([int(hx[i:i + 2], 16) for i in (0, 2, 4)], float)
        mask_frame = np.sqrt(((a - c) ** 2).sum(-1)) < float(tol)
    ys, xs = np.nonzero(mask_frame)
    fx0, fx1 = xs.min(), xs.max()
    ch = sp.cap_height(fspec)
    size = cap_px / ch
    f, label = sp.load(fspec, int(round(size)))
    W, H = x1 - x0, y1 - y0
    ren = Image.new('L', (W * 3, H), 0)
    d = ImageDraw.Draw(ren)
    by = base - y0
    x = 0.0
    for i, chr_ in enumerate(text):
        d.text((x, by), chr_, font=f, fill=255, anchor='ls')
        adv = f.getlength(chr_)
        kern = (f.getlength(text[i:i + 2]) - f.getlength(text[i + 1]) - adv) if i + 1 < len(text) else 0
        x += adv + kern + track * size
    r = np.asarray(ren) > 128
    rys, rxs = np.nonzero(r)
    rx0, rx1 = rxs.min(), rxs.max()
    al = np.zeros_like(mask_frame)
    ww = min(r.shape[1] - rx0, W - fx0)
    al[:, fx0:fx0 + ww] = r[:, rx0:rx0 + ww]
    inter = (mask_frame & al).sum()
    union = (mask_frame | al).sum()
    print(f'{label}: size {size:.1f}px  rendered ink width {rx1 - rx0 + 1}  frame ink width {fx1 - fx0 + 1}  ratio {(rx1 - rx0 + 1) / (fx1 - fx0 + 1):.3f}  IoU {inter / union:.3f}')
    diff = np.zeros((H, W, 3), np.uint8)
    diff[mask_frame & al] = (255, 255, 255)
    diff[mask_frame & ~al] = (255, 60, 60)
    diff[~mask_frame & al] = (60, 220, 255)
    renimg = np.zeros((H, W, 3), np.uint8)
    renimg[al] = (255, 255, 255)
    stack = np.concatenate([np.asarray(crop), renimg, diff], axis=0)
    Image.fromarray(stack).save(out)


if __name__ == '__main__':
    main()
