"""Render a text string in several fonts (incl. variable-font instances) for visual matching.

Usage: python3 -I specimen.py <out.png> "<text>" <cap_px> <fontspec> [<fontspec> ...]
fontspec: path[@axis=val,axis=val][#label]   e.g.  TikTokSans-VF.ttf@wght=700,opsz=36#TT700
Each row is rendered with cap height = cap_px (font size solved from the font's 'H' height).
"""
import sys
from PIL import Image, ImageDraw, ImageFont


def load(spec, size):
    label = None
    if '#' in spec:
        spec, label = spec.split('#', 1)
    axes = {}
    if '@' in spec:
        spec, ax = spec.split('@', 1)
        for kv in ax.split(','):
            k, v = kv.split('=')
            axes[k] = float(v)
    f = ImageFont.truetype(spec, size)
    if axes:
        try:
            names = [a['name'] if isinstance(a['name'], str) else a['name'].decode() for a in f.get_variation_axes()]
            tags = {'wght': 'Weight', 'wdth': 'Width', 'opsz': 'Optical size', 'slnt': 'Slant', 'ital': 'Italic'}
            vals = []
            for a in f.get_variation_axes():
                nm = a['name'] if isinstance(a['name'], str) else a['name'].decode()
                v = a['default']
                for t, full in tags.items():
                    if t in axes and (nm.lower().startswith(full.lower()[:5]) or nm.lower() == t):
                        v = axes[t]
                vals.append(v)
            f.set_variation_by_axes(vals)
        except Exception as e:  # noqa
            print('axes fail', spec, e)
    return f, (label or spec.split('/')[-1])


def cap_height(spec):
    f, _ = load(spec, 1000)
    bb = f.getbbox('H')
    return (bb[3] - bb[1]) / 1000.0


def main():
    out, text, cap_px = sys.argv[1], sys.argv[2], float(sys.argv[3])
    specs = sys.argv[4:]
    rows = []
    for s in specs:
        ch = cap_height(s)
        size = int(round(cap_px / ch))
        f, label = load(s, size)
        bb = f.getbbox(text)
        rows.append((f, label, size, bb))
    W = max(bb[2] - bb[0] for _, _, _, bb in rows) + 340
    H = sum(int(cap_px * 2.0) for _ in rows) + 10
    im = Image.new('RGB', (int(W), int(H)), (30, 30, 30))
    d = ImageDraw.Draw(im)
    y = 5
    small = ImageFont.load_default()
    for f, label, size, bb in rows:
        d.text((8, y + 8), f'{label} {size}px w={bb[2] - bb[0]}', fill=(255, 255, 0), font=small)
        d.text((330 - bb[0], y + int(cap_px * 0.35) - bb[1] + 0), text, font=f, fill=(255, 255, 255))
        print(f'{label}: size {size}px, text width {bb[2] - bb[0]} px, width/cap {(bb[2] - bb[0]) / cap_px:.3f}')
        y += int(cap_px * 2.0)
    im.save(out)


if __name__ == '__main__':
    main()
