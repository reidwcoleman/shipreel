"""fmt-kinetic: contact sheet of consecutive frames (a time window, optional crop) for motion inspection.
Usage: python3 -I framesheet.py <video> <t0> <t1> <out.jpg> [--crop x0,y0,x1,y1 (fractions)] [--step 1] [--tw 216] [--cols 10]
"""
import argparse, json, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("t0", type=float); ap.add_argument("t1", type=float); ap.add_argument("out")
ap.add_argument("--crop", default="0,0,1,1"); ap.add_argument("--step", type=int, default=1)
ap.add_argument("--tw", type=int, default=216); ap.add_argument("--cols", type=int, default=10)
a = ap.parse_args()
pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,avg_frame_rate", "-of", "json", a.video], capture_output=True, text=True).stdout)["streams"][0]
W, H = pr["width"], pr["height"]; n_, d_ = pr["avg_frame_rate"].split("/"); fps = float(n_) / float(d_)
x0, y0, x1, y1 = [float(v) for v in a.crop.split(",")]
cx0, cy0 = int(x0 * W) // 2 * 2, int(y0 * H) // 2 * 2
cw, ch = (int(x1 * W) - cx0) // 2 * 2, (int(y1 * H) - cy0) // 2 * 2
raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(a.t0), "-i", a.video, "-t", str(a.t1 - a.t0), "-vf", f"crop={cw}:{ch}:{cx0}:{cy0}",
                      "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
fsz = cw * ch * 3; nf = len(raw) // fsz
idx = list(range(0, nf, a.step))
th = int(round(a.tw * ch / cw))
rows = (len(idx) + a.cols - 1) // a.cols
sheet = Image.new("RGB", (a.cols * a.tw, rows * (th + 16)), (15, 15, 15))
d = ImageDraw.Draw(sheet)
f = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12)
for k, i in enumerate(idx):
    fr = Image.fromarray(np.frombuffer(raw[i * fsz:(i + 1) * fsz], np.uint8).reshape(ch, cw, 3)).resize((a.tw, th), Image.LANCZOS)
    x = (k % a.cols) * a.tw; y = (k // a.cols) * (th + 16)
    sheet.paste(fr, (x, y))
    d.text((x + 2, y + th + 1), f"f{i} {a.t0 + i / fps:.3f}s", fill=(255, 220, 0), font=f)
sheet.save(a.out, quality=88)
print(a.out, sheet.size, f"fps={fps:.3f} frames={nf} crop px=({cx0},{cy0},{cw}x{ch})")
