"""Recover the zoom (scale) curve of a shot by registering consecutive frames.

    python3 -I research/tools/craft/measure_zoom.py <video.mp4> <t0> <t1> [--mask y0:y1,...] [--csv out.csv]

Reads the video as untrusted data. ORB features + RANSAC similarity (estimateAffinePartial2D)
between frame i-1 and i on a 540-px-wide grayscale copy; cumulative scale is the product of
per-frame scales and resets on cuts (few inliers / big pixel change). Masked horizontal bands
(fractions of height, e.g. caption text) are ignored because overlays do not zoom with the shot.
Prints per-frame scale and a summary of zoom segments (rate in %/s, punch-ins within <= 4 frames).
"""
import sys
import cv2
import numpy as np


def parse_args(argv):
    path, t0, t1 = argv[1], float(argv[2]), float(argv[3])
    masks, csv = [], None
    i = 4
    while i < len(argv):
        if argv[i] == "--mask":
            for part in argv[i + 1].split(","):
                a, b = part.split(":")
                masks.append((float(a), float(b)))
            i += 2
        elif argv[i] == "--csv":
            csv = argv[i + 1]
            i += 2
        else:
            i += 1
    return path, t0, t1, masks, csv


def main():
    path, t0, t1, masks, csv = parse_args(sys.argv)
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    cap.set(cv2.CAP_PROP_POS_MSEC, t0 * 1000)
    orb = cv2.ORB_create(nfeatures=2500, fastThreshold=10)
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    prev = None
    prev_kp = prev_des = None
    cum = 1.0
    rows = []
    mask_img = None
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        t = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000
        if t > t1:
            break
        h, w = frame.shape[:2]
        sw = 540
        sh = int(h * sw / w)
        g = cv2.cvtColor(cv2.resize(frame, (sw, sh), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
        if mask_img is None:
            mask_img = np.full((sh, sw), 255, np.uint8)
            for a, b in masks:
                mask_img[int(a * sh): int(b * sh)] = 0
        kp, des = orb.detectAndCompute(g, mask_img)
        step, tx, ty, inl, cut = 1.0, 0.0, 0.0, 0, False
        if prev is not None:
            diff = float(np.mean(cv2.absdiff(g, prev)))
            if des is None or prev_des is None or len(kp) < 20:
                cut = True
            else:
                m = bf.match(prev_des, des)
                if len(m) < 25:
                    cut = True
                else:
                    src = np.float32([prev_kp[x.queryIdx].pt for x in m])
                    dst = np.float32([kp[x.trainIdx].pt for x in m])
                    M, inliers = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=1.5, maxIters=4000, confidence=0.995)
                    inl = int(inliers.sum()) if inliers is not None else 0
                    if M is None or inl < 20 or diff > 40:
                        cut = True
                    else:
                        step = float(np.hypot(M[0, 0], M[1, 0]))
                        tx, ty = float(M[0, 2]) * w / sw, float(M[1, 2]) * w / sw
            if cut:
                cum = 1.0
            else:
                cum *= step
        rows.append((round(t, 4), step, cum, tx, ty, inl, int(cut)))
        prev, prev_kp, prev_des = g, kp, des
    print(f"fps={fps:.3f} frames={len(rows)}")
    if csv:
        with open(csv, "w") as f:
            f.write("t,step,cum,tx,ty,inliers,cut\n")
            for r in rows:
                f.write(",".join(f"{v:.5f}" if isinstance(v, float) else str(v) for v in r) + "\n")
    # segments between cuts
    seg_start = 0
    for i in range(1, len(rows) + 1):
        if i == len(rows) or rows[i][6]:
            seg = rows[seg_start:i]
            if len(seg) >= 6:
                scales = np.array([r[2] for r in seg]) / seg[0][2]
                dur = seg[-1][0] - seg[0][0]
                total = scales[-1] - 1
                rate = (np.log(scales[-1]) / dur * 100) if dur > 0 else 0
                # punch: >= 3% change within 4 frames
                punches = []
                for j in range(len(seg) - 4):
                    d = scales[j + 4] / scales[j] - 1
                    if abs(d) >= 0.03 and (not punches or j > punches[-1][0] + 4):
                        punches.append((j, d))
                print(f"shot {seg[0][0]:.2f}-{seg[-1][0]:.2f}s ({len(seg)} f): zoom {total * 100:+.1f}%  rate {rate:+.2f}%/s  punches=" + ", ".join(f"@{seg[j][0]:.2f}s {d * 100:+.1f}%" for j, d in punches))
            seg_start = i


if __name__ == "__main__":
    main()
