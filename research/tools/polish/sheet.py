"""Labelled contact sheet: every Nth frame, tiled, with the frame index / time burned in.

usage: python3 -I sheet.py VIDEO OUT.jpg --step 4 --cols 8 --width 320 [--start S --end E]
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw  # noqa: E402

from vidio import frames, probe  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("out")
ap.add_argument("--step", type=int, default=4)
ap.add_argument("--cols", type=int, default=8)
ap.add_argument("--width", type=int, default=320)
ap.add_argument("--start", type=float, default=None)
ap.add_argument("--end", type=float, default=None)
ap.add_argument("--max", type=int, default=96)
a = ap.parse_args()

info = probe(a.video)
fps = info["fps"]
off = int(round((a.start or 0) * fps))
tiles = []
for i, f in frames(a.video, width=a.width, start=a.start, end=a.end):
    if i % a.step:
        continue
    im = Image.fromarray(f)
    d = ImageDraw.Draw(im)
    n = i + off
    label = f"{n}  {n / fps:.2f}s"
    d.rectangle([0, 0, 8 + 7 * len(label), 14], fill=(0, 0, 0))
    d.text((4, 2), label, fill=(255, 230, 0))
    tiles.append(im)
    if len(tiles) >= a.max:
        break
w, h = tiles[0].size
rows = (len(tiles) + a.cols - 1) // a.cols
sheet = Image.new("RGB", (a.cols * (w + 2), rows * (h + 2)), (20, 20, 20))
for k, t in enumerate(tiles):
    sheet.paste(t, ((k % a.cols) * (w + 2), (k // a.cols) * (h + 2)))
sheet.save(a.out, quality=85)
print(a.out, len(tiles), "tiles", sheet.size)
