"""Build a labelled contact sheet from a set of images (slides or covers).

Usage: python3 -I contact_sheet.py OUT.jpg TITLE img1 [img2 ...] [--cols N] [--w 300]
Each tile is scaled to the same width, keeps its aspect, and gets its index + pixel size printed under it.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont


def font(size):
    for p in ("/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Helvetica.ttc", "/Library/Fonts/Arial.ttf"):
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                pass
    return ImageFont.load_default()


def main():
    args = sys.argv[1:]
    cols, tw = None, 300
    if "--cols" in args:
        i = args.index("--cols"); cols = int(args[i + 1]); del args[i:i + 2]
    if "--w" in args:
        i = args.index("--w"); tw = int(args[i + 1]); del args[i:i + 2]
    out, title, paths = args[0], args[1], args[2:]
    tiles = []
    for p in paths:
        try:
            im = Image.open(p).convert("RGB")
        except Exception as e:  # noqa: BLE001
            print("skip", p, e)
            continue
        w, h = im.size
        th = round(h * tw / w)
        tiles.append((os.path.basename(p), (w, h), im.resize((tw, th), Image.LANCZOS)))
    if not tiles:
        return
    n = len(tiles)
    cols = cols or min(n, 7)
    rows = (n + cols - 1) // cols
    pad, lab, head = 10, 26, 44
    th_max = max(t[2].size[1] for t in tiles)
    W = cols * tw + (cols + 1) * pad
    H = head + rows * (th_max + lab + pad) + pad
    sheet = Image.new("RGB", (W, H), (24, 24, 28))
    d = ImageDraw.Draw(sheet)
    d.text((pad, 10), title, fill=(240, 240, 240), font=font(22))
    f = font(15)
    for k, (name, (w, h), im) in enumerate(tiles):
        r, c = divmod(k, cols)
        x = pad + c * (tw + pad)
        y = head + r * (th_max + lab + pad)
        sheet.paste(im, (x, y))
        d.text((x, y + im.size[1] + 4), f"{k + 1}. {name}  {w}x{h}", fill=(200, 200, 200), font=f)
    sheet.save(out, quality=88)
    print("wrote", out, sheet.size)


if __name__ == "__main__":
    main()
