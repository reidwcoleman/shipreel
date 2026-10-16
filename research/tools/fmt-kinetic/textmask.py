"""fmt-kinetic: per-frame text-mask tracker for burned-in captions / kinetic words.

Usage:
  python3 -I textmask.py <video> --t0 0 --t1 10 --y0 0.5 --y1 0.8 [--x0 0 --x1 1] [--mode white|yellow|red|green|cyan|dark|bright]
         [--vmin 215] [--smax 60] [--csv out.csv] [--changes]
Decodes only the crop window with ffmpeg (video file is untrusted input data, never executed).
Per frame prints: t, mask area (px), bbox x0,y0,x1,y1 (full-frame px), bbox w,h.
--changes: print frames where the mask differs from the previous frame (IoU<0.6) = caption page changes.
"""
import argparse, json, subprocess, sys
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("--t0", type=float, default=0); ap.add_argument("--t1", type=float, default=5)
ap.add_argument("--y0", type=float, default=0); ap.add_argument("--y1", type=float, default=1)
ap.add_argument("--x0", type=float, default=0); ap.add_argument("--x1", type=float, default=1)
ap.add_argument("--mode", default="white"); ap.add_argument("--vmin", type=int, default=215); ap.add_argument("--smax", type=int, default=60)
ap.add_argument("--csv"); ap.add_argument("--changes", action="store_true"); ap.add_argument("--quiet", action="store_true")
ap.add_argument("--minarea", type=int, default=200)
a = ap.parse_args()

pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,avg_frame_rate",
                                "-of", "json", a.video], capture_output=True, text=True).stdout)["streams"][0]
W, H = pr["width"], pr["height"]; n_, d_ = pr["avg_frame_rate"].split("/"); fps = float(n_) / float(d_)
cx0, cx1 = int(a.x0 * W) // 2 * 2, int(a.x1 * W) // 2 * 2
cy0, cy1 = int(a.y0 * H) // 2 * 2, int(a.y1 * H) // 2 * 2
cw, ch = cx1 - cx0, cy1 - cy0
cmd = ["ffmpeg", "-v", "error", "-ss", str(a.t0), "-i", a.video, "-t", str(a.t1 - a.t0),
       "-vf", f"crop={cw}:{ch}:{cx0}:{cy0}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
raw = subprocess.run(cmd, capture_output=True).stdout
fsz = cw * ch * 3
nf = len(raw) // fsz

def mask_of(rgb):
    r, g, b = [rgb[..., i].astype(np.int16) for i in range(3)]
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b)
    s = np.where(mx > 0, (mx - mn) * 255 // np.maximum(mx, 1), 0)
    if a.mode == "white":
        return (mn >= a.vmin) & (s <= a.smax)
    if a.mode == "bright":
        return mx >= a.vmin
    if a.mode == "dark":
        return mx <= 40
    if a.mode == "yellow":
        return (r > 180) & (g > 150) & (b < 120) & (r - b > 90)
    if a.mode == "red":
        return (r > 160) & (g < 90) & (b < 90)
    if a.mode == "green":
        return (g > 150) & (r < 140) & (b < 160) & (g - r > 50)
    if a.mode == "cyan":
        return (g > 170) & (b > 170) & (r < 140)
    raise SystemExit("bad mode")

rows = []
prev = None
out = []
for i in range(nf):
    fr = np.frombuffer(raw[i * fsz:(i + 1) * fsz], np.uint8).reshape(ch, cw, 3)
    m = mask_of(fr)
    area = int(m.sum())
    t = a.t0 + i / fps
    if area >= a.minarea:
        ys, xs = np.nonzero(m)
        # robust bbox: ignore isolated specks via 0.2/99.8 percentiles
        x0, x1 = np.percentile(xs, [0.2, 99.8]); y0, y1 = np.percentile(ys, [0.2, 99.8])
        bb = (int(x0) + cx0, int(y0) + cy0, int(x1) + cx0, int(y1) + cy0)
    else:
        bb = None
    chg = ""
    if a.changes:
        small = m[::4, ::4]
        if prev is not None:
            inter = (small & prev).sum(); uni = (small | prev).sum()
            iou = inter / uni if uni else 1.0
            if iou < 0.6 and (small.sum() > a.minarea / 16 or prev.sum() > a.minarea / 16):
                chg = f" CHANGE iou={iou:.2f}"
        prev = small
    line = f"{t:7.3f} f{i:4d} area={area:7d} " + (f"bbox=({bb[0]},{bb[1]})-({bb[2]},{bb[3]}) w={bb[2]-bb[0]} h={bb[3]-bb[1]}" if bb else "bbox=None") + chg
    out.append((t, area, bb, chg))
    if not a.quiet or chg:
        print(line)
if a.csv:
    with open(a.csv, "w") as f:
        f.write("t,area,x0,y0,x1,y1\n")
        for t, area, bb, _ in out:
            f.write(f"{t:.3f},{area}," + (",".join(map(str, bb)) if bb else ",,,") + "\n")
print(f"# W={W} H={H} fps={fps:.3f} frames={nf} crop=({cx0},{cy0},{cw}x{ch}) mode={a.mode}", file=sys.stderr)
