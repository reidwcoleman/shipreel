"""Frame extraction for reference videos (run with python3 -I).
usage: extract.py <video> <out_frames_dir> [--keys t1,t2,...] [--maxsec N]
- every 0.25 s for the first 3 s  -> q_SS.ss.jpg
- then 1 frame/s until the end   -> s_SSSS.jpg
- full-res PNG stills at key times -> key_SSS.sss.png
Only calls ffmpeg/ffprobe; never executes anything from the data folder."""
import subprocess, sys, os, json

def probe(v):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", v],
                         capture_output=True, text=True).stdout
    return float(json.loads(out)["format"]["duration"])

def grab(v, t, path, png=False):
    args = ["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", v, "-frames:v", "1"]
    if not png:
        args += ["-q:v", "3"]
    subprocess.run(args + [path], check=False)

def main():
    v, out = sys.argv[1], sys.argv[2]
    keys, maxsec = [], None
    a = sys.argv[3:]
    for i, x in enumerate(a):
        if x == "--keys": keys = [float(s) for s in a[i + 1].split(",") if s]
        if x == "--maxsec": maxsec = float(a[i + 1])
    os.makedirs(out, exist_ok=True)
    dur = probe(v)
    end = min(dur, maxsec) if maxsec else dur
    # quarter-second frames for the first 3 s via one ffmpeg pass
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", v, "-t", "3", "-vf", "fps=4", "-q:v", "3",
                    os.path.join(out, "q_%03d.jpg")], check=False)
    # rename q_001.. -> q_00.00 (frame n covers t=(n-1)*0.25)
    for f in sorted(os.listdir(out)):
        if f.startswith("q_") and f[2:5].isdigit() and len(f) == 9:
            n = int(f[2:5]) - 1
            os.replace(os.path.join(out, f), os.path.join(out, f"q_{n*0.25:05.2f}.jpg"))
    # 1 fps from 3 s to end
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "3", "-i", v, "-t", f"{max(0.0, end-3):.3f}", "-vf", "fps=1",
                    "-q:v", "3", os.path.join(out, "s_%04d.jpg")], check=False)
    for f in sorted(os.listdir(out)):
        if f.startswith("s_") and len(f) == 10 and f[2:6].isdigit():
            n = int(f[2:6]) + 2  # s_0001 -> t=3
            os.replace(os.path.join(out, f), os.path.join(out, f"s_{n:04d}.jpg.tmp"))
    for f in sorted(os.listdir(out)):
        if f.endswith(".jpg.tmp"):
            os.replace(os.path.join(out, f), os.path.join(out, f[:-4]))
    for t in keys:
        grab(v, t, os.path.join(out, f"key_{t:07.3f}.png"), png=True)
    print(out, "duration", dur, "files", len(os.listdir(out)))

main()
