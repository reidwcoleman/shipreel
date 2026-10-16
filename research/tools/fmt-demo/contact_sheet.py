"""Make a labelled contact sheet from image files (untrusted images: decoded only).
Usage: python3 -I contact_sheet.py <out.jpg> <cell_w> <cols> <img...>"""
import sys
from PIL import Image, ImageDraw
out, cw, cols = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
paths = sys.argv[4:]
cells = []
for p in paths:
    try:
        im = Image.open(p).convert("RGB")
    except Exception:
        continue
    h = int(im.height * cw / im.width)
    im = im.resize((cw, h))
    cells.append((p.split("/")[-1], im))
if not cells:
    sys.exit("no images")
ch = max(im.height for _, im in cells) + 22
rows = (len(cells) + cols - 1) // cols
sheet = Image.new("RGB", (cols * cw, rows * ch), (40, 40, 40))
d = ImageDraw.Draw(sheet)
for i, (name, im) in enumerate(cells):
    x, y = (i % cols) * cw, (i // cols) * ch
    sheet.paste(im, (x, y + 22))
    d.text((x + 3, y + 4), name[:int(cw / 6)], fill=(255, 255, 0))
sheet.save(out, quality=85)
print(out, sheet.size)
