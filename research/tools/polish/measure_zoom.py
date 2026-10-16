"""Measure a virtual camera (zoom scale + pan) frame by frame in a screen-recording promo.

Two estimators:
  chain : similarity transform between consecutive frames (AKAZE/ORB + RANSAC, ECC fallback),
          accumulated into a global transform relative to frame `--ref`.
  tmpl  : multi-scale normalised cross-correlation of every frame against the reference frame
          (robust through motion blur; slower).

Output CSV: frame,t,scale,cx,cy,inliers,method  (cx,cy = centre of the current view expressed in
reference-frame pixel coordinates normalised 0..1; scale = magnification vs the reference frame).

usage: python3 -I measure_zoom.py VIDEO OUT.csv [--width 960] [--method chain|tmpl] [--ref 0]
       [--start S --end E] [--smin 0.8 --smax 4]
"""
import argparse
import csv
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cv2  # noqa: E402
import numpy as np  # noqa: E402

from vidio import frames, probe  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("out")
ap.add_argument("--width", type=int, default=960)
ap.add_argument("--method", default="chain")
ap.add_argument("--ref", type=int, default=0)
ap.add_argument("--start", type=float, default=None)
ap.add_argument("--end", type=float, default=None)
ap.add_argument("--smin", type=float, default=0.8)
ap.add_argument("--smax", type=float, default=4.0)
ap.add_argument("--roi", default=None, help="x0,y0,x1,y1 normalised: only use this part of the frame")
a = ap.parse_args()

info = probe(a.video)
fps = info["fps"]
F = [f for _, f in frames(a.video, width=a.width, gray=True, start=a.start, end=a.end)]
H, W = F[0].shape
off = int(round((a.start or 0) * fps))
print("frames", len(F), "size", W, H, "fps", fps)


def similarity(prev, cur):
    """Return 2x3 matrix mapping prev -> cur, and inlier count."""
    det = cv2.SIFT_create(nfeatures=3000, contrastThreshold=0.02)
    k1, d1 = det.detectAndCompute(prev, None)
    k2, d2 = det.detectAndCompute(cur, None)
    if d1 is not None and d2 is not None and len(k1) > 8 and len(k2) > 8:
        bf = cv2.BFMatcher(cv2.NORM_L2)
        m = bf.knnMatch(d1, d2, k=2)
        good = [p[0] for p in m if len(p) == 2 and p[0].distance < 0.8 * p[1].distance]
        if len(good) >= 8:
            src = np.float32([k1[g.queryIdx].pt for g in good])
            dst = np.float32([k2[g.trainIdx].pt for g in good])
            M, inl = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC,
                                                 ransacReprojThreshold=2.0, maxIters=4000)
            if M is not None and inl is not None and inl.sum() >= 10:
                return M, int(inl.sum()), "sift"
    # ECC fallback on blurred images (handles motion blur better than features)
    p = cv2.GaussianBlur(prev, (0, 0), 2).astype(np.float32) / 255
    c = cv2.GaussianBlur(cur, (0, 0), 2).astype(np.float32) / 255
    M = np.eye(2, 3, dtype=np.float32)
    try:
        _, M = cv2.findTransformECC(p, c, M, cv2.MOTION_AFFINE,
                                    (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), None, 5)
        # ECC returns warp mapping cur->prev coordinates for MOTION_AFFINE (template=p, input=c):
        # findTransformECC(template, input) finds W s.t. input(W(x)) ~ template(x), i.e. x_prev -> x_cur.
        return M.astype(np.float64), -1, "ecc"
    except cv2.error:
        return np.eye(2, 3), 0, "fail"


def to3(M):
    return np.vstack([M, [0, 0, 1]])


rows = []
if a.method == "chain":
    G = np.eye(3)  # maps reference coords -> current frame coords
    ref = a.ref
    # forward from ref
    Gs = {ref: np.eye(3)}
    info_m = {ref: (0, "ref")}
    for i in range(ref + 1, len(F)):
        M, n, how = similarity(F[i - 1], F[i])
        Gs[i] = to3(M) @ Gs[i - 1]
        info_m[i] = (n, how)
    for i in range(ref - 1, -1, -1):
        M, n, how = similarity(F[i + 1], F[i])
        Gs[i] = to3(M) @ Gs[i + 1]
        info_m[i] = (n, how)
    for i in range(len(F)):
        G = Gs[i]
        s = math.sqrt(abs(np.linalg.det(G[:2, :2])))
        Ginv = np.linalg.inv(G)
        c = Ginv @ np.array([W / 2, H / 2, 1.0])
        rows.append([i + off, (i + off) / fps, s, c[0] / W, c[1] / H, info_m[i][0], info_m[i][1]])
else:
    R = cv2.GaussianBlur(F[a.ref], (0, 0), 1.2).astype(np.float32)
    prev_s = 1.0
    for i in range(len(F)):
        cur = cv2.GaussianBlur(F[i], (0, 0), 1.2).astype(np.float32)
        best = (-2, 1.0, 0, 0)
        # coarse-to-fine log search around previous scale
        cands = np.exp(np.linspace(math.log(a.smin), math.log(a.smax), 60))
        for it in range(3):
            for s in cands:
                tw, th = int(W / s), int(H / s)
                if tw < 40 or th < 40 or tw > W or th > H:
                    continue
                t = cv2.resize(cur, (tw, th), interpolation=cv2.INTER_AREA)
                r = cv2.matchTemplate(R, t, cv2.TM_CCOEFF_NORMED)
                _, mx, _, loc = cv2.minMaxLoc(r)
                if mx > best[0]:
                    best = (mx, s, loc[0] + tw / 2, loc[1] + th / 2)
            s0 = best[1]
            span = 1.06 if it == 0 else 1.015
            cands = np.exp(np.linspace(math.log(s0 / span), math.log(s0 * span), 13))
        prev_s = best[1]
        rows.append([i + off, (i + off) / fps, best[1], best[2] / W, best[3] / H, round(best[0], 3), "tmpl"])

with open(a.out, "w", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["frame", "t", "scale", "cx", "cy", "inliers", "method"])
    for r in rows:
        w.writerow([r[0], f"{r[1]:.4f}", f"{r[2]:.4f}", f"{r[3]:.4f}", f"{r[4]:.4f}", r[5], r[6]])
print("wrote", a.out)
