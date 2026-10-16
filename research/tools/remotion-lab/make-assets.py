# Generates a synthetic iPhone-size app screenshot (1179x2556) with fine text and hairlines,
# used to check how Chrome downsamples screenshots inside phone frames.
import sys
from PIL import Image, ImageDraw, ImageFont
W, H = 1179, 2556
img = Image.new("RGB", (W, H), (246, 246, 248))
d = ImageDraw.Draw(img)
def font(sz):
    for p in ["/System/Library/Fonts/SFNS.ttf", "/System/Library/Fonts/Helvetica.ttc", "/Library/Fonts/Arial.ttf"]:
        try:
            return ImageFont.truetype(p, sz)
        except Exception:
            pass
    return ImageFont.load_default()
d.rectangle([0, 0, W, 300], fill=(16, 16, 20))
d.text((60, 150), "Inbox Zero", font=font(96), fill=(255, 255, 255))
y = 340
for i in range(14):
    d.rounded_rectangle([40, y, W - 40, y + 140], radius=36, fill=(255, 255, 255), outline=(225, 225, 230), width=2)
    d.ellipse([70, y + 30, 150, y + 110], fill=[(255, 90, 90), (90, 160, 255), (60, 200, 120), (255, 180, 40)][i % 4])
    d.text((180, y + 28), f"Message thread number {i+1}", font=font(44), fill=(20, 20, 24))
    d.text((180, y + 84), "Fine 32px caption text that should stay readable", font=font(32), fill=(110, 110, 118))
    y += 158
# 1px hairline grid in the bottom bar to expose aliasing / moire
for x in range(0, W, 6):
    d.line([x, H - 120, x, H], fill=(30, 30, 30), width=1)
img.save(sys.argv[1])
print("wrote", sys.argv[1], img.size)
