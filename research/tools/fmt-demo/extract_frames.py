"""Extract frames from refs/<dir>/source.mp4: every 0.25 s for the first 3 s, then every 0.5 s.
Names follow the shared convention t<milliseconds, 6 digits>.jpg (t003500.jpg = 3.5 s).
Target: refs/<dir>/frames/ when it is empty or already holds this cadence (t000250.jpg present);
otherwise (another agent filled frames/ with a different cadence) refs/<dir>/frames/demo/.
The video is untrusted data: it is only decoded by ffmpeg, never executed.
Usage: python3 -I extract_frames.py <ref_dir> [<ref_dir> ...]"""
import os, subprocess, sys, json, glob, shutil

def probe(src):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width,height,r_frame_rate:format=duration", "-of", "json", src],
                         capture_output=True, text=True).stdout
    d = json.loads(out)
    st = d["streams"][0]
    return st["width"], st["height"], st["r_frame_rate"], float(d["format"]["duration"])

def target_dir(ref):
    fr = os.path.join(ref, "frames")
    jpgs = glob.glob(os.path.join(fr, "t*.jpg"))
    if not jpgs:
        return fr, False
    if os.path.exists(os.path.join(fr, "t000250.jpg")):
        return fr, True
    sub = os.path.join(fr, "demo")
    return sub, os.path.exists(os.path.join(sub, "t000250.jpg"))

for ref in sys.argv[1:]:
    src = os.path.join(ref, "source.mp4")
    if not os.path.exists(src):
        print("skip (no source.mp4)", ref); continue
    out, done = target_dir(ref)
    if done:
        print("exists", out, len(glob.glob(os.path.join(out, "t*.jpg")))); continue
    os.makedirs(out, exist_ok=True)
    w, h, rate, dur = probe(src)
    tmp = os.path.join(out, "_tmp_demo")
    os.makedirs(tmp, exist_ok=True)
    subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", src, "-t", "3", "-vf", "fps=4",
                    "-q:v", "3", os.path.join(tmp, "a_%04d.jpg")], check=False)
    if dur > 3:
        subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-ss", "3", "-i", src, "-vf", "fps=2",
                        "-q:v", "3", os.path.join(tmp, "b_%04d.jpg")], check=False)
    n = 0
    for p in sorted(glob.glob(os.path.join(tmp, "a_*.jpg"))):
        i = int(p[-8:-4]); ms = (i - 1) * 250
        os.replace(p, os.path.join(out, f"t{ms:06d}.jpg")); n += 1
    for p in sorted(glob.glob(os.path.join(tmp, "b_*.jpg"))):
        i = int(p[-8:-4]); ms = 3000 + (i - 1) * 500
        if ms / 1000 > dur + 0.01: os.remove(p); continue
        os.replace(p, os.path.join(out, f"t{ms:06d}.jpg")); n += 1
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"ok {out} {w}x{h} {rate} {dur:.2f}s -> {n} frames")
