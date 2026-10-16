"""fmt-kinetic: scene-cut times via ffmpeg's scene score (select=gt(scene,THR)). Prints cuts, shot lengths, ASL.
Usage: python3 -I cuts.py <video> [thr=0.3]"""
import re, subprocess, sys, json, statistics
v = sys.argv[1]; thr = float(sys.argv[2]) if len(sys.argv) > 2 else 0.3
dur = float(json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", v], capture_output=True, text=True).stdout)["format"]["duration"])
p = subprocess.run(["ffmpeg", "-v", "info", "-i", v, "-an", "-vf", f"scale=270:-2,select='gt(scene,{thr})',metadata=print:key=lavfi.scene_score", "-f", "null", "-"],
                   capture_output=True, text=True)
ts = []; last = None
for line in p.stderr.splitlines():
    m = re.search(r"pts_time:([\d.]+)", line)
    if m: last = float(m.group(1))
    m2 = re.search(r"lavfi.scene_score=([\d.]+)", line)
    if m2 and last is not None:
        ts.append((last, float(m2.group(1)))); last = None
cuts = [t for t, s in ts if t > 0.05]
# merge cuts closer than 0.12 s (transitions)
merged = []
for t in cuts:
    if not merged or t - merged[-1] > 0.12: merged.append(t)
bounds = [0.0] + merged + [dur]
shots = [round(b - a, 2) for a, b in zip(bounds, bounds[1:])]
print(f"dur={dur:.2f}s thr={thr} cuts={len(merged)} ASL={dur/(len(merged)+1):.2f}s median_shot={statistics.median(shots):.2f}s")
print("cut times:", " ".join(f"{t:.2f}" for t in merged))
print("shots:", shots)
