"""fmt-kinetic: extract the standard frame schedule (every 0.2 s for 0-3 s, then every 0.5 s)
into refs/<dir>/frames/t<ms>.jpg, and build a labelled strip into research/motion/strips/kinetic/.

Usage: python3 -I frames.py <ref_dir> [<ref_dir> ...]
Video files are untrusted data: we only hand them to ffmpeg as input paths.
"""
import json, os, subprocess, sys, glob, shutil
from PIL import Image, ImageDraw, ImageFont

STRIPS = "/Users/reidcoleman/Glide/Shipreel/research/motion/strips/kinetic"

def probe(src):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width,height,r_frame_rate,avg_frame_rate,codec_name:format=duration",
                          "-of", "json", src], capture_output=True, text=True).stdout
    d = json.loads(out)
    s = d["streams"][0]
    num, den = s["avg_frame_rate"].split("/")
    return dict(w=s["width"], h=s["height"], fps=float(num) / float(den or 1), dur=float(d["format"]["duration"]), codec=s["codec_name"])

def extract(ref):
    src = os.path.join(ref, "source.mp4")
    if not os.path.exists(src):
        print("no source.mp4 in", ref); return None
    info = probe(src)
    fdir = os.path.join(ref, "frames")
    os.makedirs(fdir, exist_ok=True)
    want_last = 3.0 + 0.5 * int((info["dur"] - 3.0 - 0.05) / 0.5)
    have = sorted(glob.glob(os.path.join(fdir, "t*.jpg")))
    if have and os.path.basename(have[-1]) >= f"t{int(round(want_last*1000)):06d}.jpg" and len(have) >= 15:
        return info
    tmp = os.path.join(fdir, "_tmp")
    shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
    subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-t", "2.95", "-vf", "fps=5:round=near", "-q:v", "3",
                    os.path.join(tmp, "a_%03d.jpg")], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-ss", "3", "-i", src, "-vf", "fps=2:round=near", "-q:v", "3",
                    os.path.join(tmp, "b_%04d.jpg")], check=True)
    for p in sorted(glob.glob(os.path.join(tmp, "a_*.jpg"))):
        i = int(os.path.basename(p)[2:5]) - 1
        os.replace(p, os.path.join(fdir, f"t{int(round(i*200)):06d}.jpg"))
    for p in sorted(glob.glob(os.path.join(tmp, "b_*.jpg"))):
        j = int(os.path.basename(p)[2:6]) - 1
        os.replace(p, os.path.join(fdir, f"t{int(round(3000 + j*500)):06d}.jpg"))
    shutil.rmtree(tmp, ignore_errors=True)
    return info

def strip(ref, info, tw=144):
    fdir = os.path.join(ref, "frames")
    frames = sorted(glob.glob(os.path.join(fdir, "t*.jpg")))
    ms = lambda p: int(os.path.basename(p)[1:7])
    first = [p for p in frames if ms(p) < 3000]
    rest = [p for p in frames if ms(p) >= 3000]
    # rest: pick an interval so at most 45 thumbs (3 rows of 15)
    step = 1
    while len(rest[::step]) > 45: step += 1
    rest = rest[::step]
    rows = [first] + [rest[i:i+15] for i in range(0, len(rest), 15)]
    th = int(round(tw * info["h"] / info["w"]))
    W = 15 * tw; H = len(rows) * (th + 18) + 30
    im = Image.new("RGB", (W, H), (20, 20, 20))
    dr = ImageDraw.Draw(im)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 13)
        big = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 16)
    except Exception:
        font = big = ImageFont.load_default()
    name = os.path.basename(ref.rstrip("/"))
    dr.text((6, 6), f"{name}  {info['w']}x{info['h']} {info['fps']:.2f}fps {info['dur']:.1f}s   row1: 0-2.8s @0.2s; rows 2+: from 3s every {0.5*step:.1f}s", fill=(255, 255, 255), font=big)
    y = 30
    for row in rows:
        x = 0
        for p in row:
            t = Image.open(p).convert("RGB").resize((tw, th), Image.LANCZOS)
            im.paste(t, (x, y))
            dr.text((x + 3, y + th + 2), f"{ms(p)/1000:.1f}s", fill=(255, 220, 0), font=font)
            x += tw
        y += th + 18
    os.makedirs(STRIPS, exist_ok=True)
    out = os.path.join(STRIPS, f"{name}.jpg")
    im.save(out, quality=82)
    return out

if __name__ == "__main__":
    for ref in sys.argv[1:]:
        info = extract(ref)
        if info:
            print(os.path.basename(ref.rstrip('/')), info, "->", strip(ref, info))
