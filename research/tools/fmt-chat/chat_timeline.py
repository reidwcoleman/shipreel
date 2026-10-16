"""Per-frame chat-card metrics for a video (python3 -I).
usage: chat_timeline.py <video> <light|dark> <x0> <y0> <x1> <y1> <marginx0> <marginx1> <out.csv> [fps=native] [downscale=1]
Crops the card column range, finds the card's body rows using the margin columns (inside card,
left of the bubbles), and counts sent-blue and received-gray pixels inside the card.
Writes: frame,t,card_top,card_bottom,sent,recv,diff"""
import sys, subprocess, json
import numpy as np

v, mode = sys.argv[1], sys.argv[2]
x0, y0, x1, y1, mx0, mx1 = map(int, sys.argv[3:9])
out = sys.argv[9]
every = 1
sfps = float(sys.argv[10]) if len(sys.argv) > 10 else 0
sc = int(sys.argv[11]) if len(sys.argv) > 11 else 1
info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                  "stream=r_frame_rate", "-of", "json", v], capture_output=True, text=True).stdout)
num, den = map(int, info["streams"][0]["r_frame_rate"].split("/")); fps = num / den
cw, ch = x1 - x0, y1 - y0
w, h = cw // sc, ch // sc
vf = (f"fps={sfps}," if sfps else "") + f"crop={cw}:{ch}:{x0}:{y0},scale={w}:{h}:flags=area"
if sfps: fps = sfps
cmd = ["ffmpeg", "-v", "error", "-threads", "4", "-i", v, "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
fsz = w * h * 3
rows = []; prev = None; i = -1
while True:
    buf = p.stdout.read(fsz)
    if len(buf) < fsz: break
    i += 1
    if i % every: continue
    a = np.frombuffer(buf, np.uint8).reshape(h, w, 3).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lum = (r + g + b) / 3
    neutral = (np.abs(r - g) < 9) & (np.abs(g - b) < 11)
    if mode == "light":
        body = neutral & (lum > 244); recv = neutral & (lum > 218) & (lum < 239)
    else:
        body = neutral & (lum < 8); recv = neutral & (lum > 28) & (lum < 52)
    sent = (b > 170) & (r < 100) & ((b - r) > 110)
    marg = body[:, (mx0 - x0) // sc: max((mx1 - x0) // sc, (mx0 - x0) // sc + 1)].mean(axis=1) > 0.6
    idx = np.where(marg)[0]
    if len(idx):
        # longest contiguous run of body rows in the margin
        splits = np.where(np.diff(idx) > 3)[0]
        starts = np.r_[idx[0], idx[splits + 1]]; ends = np.r_[idx[splits], idx[-1]]
        j = int(np.argmax(ends - starts)); top, bot = int(starts[j]), int(ends[j])
    else:
        top = bot = -1
    if top >= 0:
        s = int(sent[top:bot + 1].sum()); rc = int(recv[top:bot + 1].sum())
    else:
        s = rc = 0
    d = float(np.abs(a - prev).mean()) if prev is not None else 0.0
    prev = a
    rows.append((i, i / fps, top * sc + y0 if top >= 0 else -1, bot * sc + y0 if bot >= 0 else -1, s * sc * sc, rc * sc * sc, d))
p.wait()
with open(out, "w") as f:
    f.write("frame,t,card_top,card_bottom,sent,recv,diff\n")
    for r_ in rows: f.write("%d,%.4f,%d,%d,%d,%d,%.2f\n" % r_)
print(out, len(rows), "frames at", fps, "fps")
