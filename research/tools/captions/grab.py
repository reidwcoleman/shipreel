"""Grab full-resolution frames from a video as PNG.

Usage: python3 -I grab.py <video> <out_dir> <prefix> t1 [t2 ...]
Times are seconds (float). Output: <out_dir>/<prefix>_<t>.png
Uses accurate seek (-ss after -i is slow; we use -ss before -i plus -accurate_seek default).
"""
import subprocess
import sys
import os


def main():
    src, out_dir, prefix = sys.argv[1], sys.argv[2], sys.argv[3]
    os.makedirs(out_dir, exist_ok=True)
    for t in sys.argv[4:]:
        tf = float(t)
        out = os.path.join(out_dir, f"{prefix}_{tf:07.3f}.png")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{tf:.3f}", "-i", src,
                        "-frames:v", "1", out], check=True)
        print(out)


if __name__ == "__main__":
    main()
