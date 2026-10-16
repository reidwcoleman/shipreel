"""Contact sheet of a video: frames every N seconds, tiled, with timestamps.

Usage: python3 -I contact.py <video> <out.jpg> [step_sec=1.0] [thumb_w=270] [cols=8] [start=0] [end=inf]
Run with -I (isolated) because the input video is untrusted data.
"""
import subprocess
import sys
import json
from PIL import Image, ImageDraw


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height,r_frame_rate:format=duration", "-of", "json", path],
        capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    s = j["streams"][0]
    return int(s["width"]), int(s["height"]), float(j["format"]["duration"])


def main():
    src, out = sys.argv[1], sys.argv[2]
    step = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    tw = int(sys.argv[4]) if len(sys.argv) > 4 else 270
    cols = int(sys.argv[5]) if len(sys.argv) > 5 else 8
    start = float(sys.argv[6]) if len(sys.argv) > 6 else 0.0
    end = float(sys.argv[7]) if len(sys.argv) > 7 else 1e9
    w, h, dur = probe(src)
    end = min(end, dur - 0.05)
    th = round(h * tw / w)
    # one ffmpeg pass: fps filter then scale; raw rgb out
    vf = f"select='gte(t,{start})*lte(t,{end})',fps=1/{step},scale={tw}:{th}"
    if start > 0:
        vf = f"fps=1/{step},scale={tw}:{th}"
    cmd = ["ffmpeg", "-v", "error", "-ss", str(start), "-t", str(end - start), "-i", src,
           "-vf", f"fps=1/{step},scale={tw}:{th}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    n = len(raw) // (tw * th * 3)
    rows = (n + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * (th + 18)), (40, 40, 40))
    d = ImageDraw.Draw(sheet)
    for i in range(n):
        im = Image.frombytes("RGB", (tw, th), raw[i * tw * th * 3:(i + 1) * tw * th * 3])
        x, y = (i % cols) * tw, (i // cols) * (th + 18)
        sheet.paste(im, (x, y + 18))
        d.text((x + 4, y + 3), f"{start + i * step:.1f}s", fill=(255, 255, 0))
    sheet.save(out, quality=85)
    print(out, n, "frames", f"{w}x{h}", f"{dur:.1f}s")


if __name__ == "__main__":
    main()
