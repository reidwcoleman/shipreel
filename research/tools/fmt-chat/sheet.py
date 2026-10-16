"""Contact sheet / strip builder (python3 -I).
usage: sheet.py <out.jpg> <cols> <thumb_h> <img1> [img2 ...]
Labels each tile with its filename stem (timestamp)."""
import sys, os
from PIL import Image, ImageDraw, ImageFont
out, cols, th = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
paths = sys.argv[4:]
ims = []
for p in paths:
    im = Image.open(p).convert("RGB")
    w = round(im.width * th / im.height)
    ims.append((os.path.basename(p).rsplit(".", 1)[0], im.resize((w, th), Image.LANCZOS)))
tw = max(i.width for _, i in ims)
rows = (len(ims) + cols - 1) // cols
pad, lab = 6, 26
sheet = Image.new("RGB", (cols * (tw + pad) + pad, rows * (th + lab + pad) + pad), (30, 30, 30))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 20)
except Exception:
    font = ImageFont.load_default()
for k, (name, im) in enumerate(ims):
    r, c = divmod(k, cols)
    x, y = pad + c * (tw + pad), pad + r * (th + lab + pad)
    sheet.paste(im, (x, y + lab))
    d.text((x + 2, y + 2), name, fill=(255, 255, 0), font=font)
sheet.save(out, quality=88)
print(out, sheet.size)
