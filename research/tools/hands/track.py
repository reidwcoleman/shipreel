#!/usr/bin/env python3
"""Turn a stock clip of a hand holding a green-screen phone into a compositing kit.

    python3 research/tools/hands/track.py <clip.mp4> <outdir> [options]

Writes into <outdir>:
  plate.mp4     the clip cropped/scaled to 1080x1920, 30 fps CFR, H.264 crf 18, no audio
  keyed.webm    the same frames with the phone screen made transparent (VP9 + alpha),
                green spill removed from the thumb/hand edges
  corners.json  {"fps":30,"size":[1080,1920],"frames":[[[x,y]*4], ...]}  TL,TR,BR,BL of the
                screen quad in plate pixels (straight-edge quad; the display's rounded
                corners and any notch/island stay opaque in keyed.webm)
  preview.jpg   6-frame contact sheet of a test composite (a screenshot warped into the quad
                under keyed.webm)
  track.json    the parameters used + accuracy stats (crop, key colour, residuals)

How it works
  1. Crop. Unless --crop is given, the screen is found in a few frames of the chosen window and
     the 9:16 crop is placed so the screen is centred horizontally and its centre sits at --cy
     (default 0.54) of the frame height; --zoom (or --screen-width, the screen's target share of
     the frame width) tightens the crop when the source has resolution to spare.
  2. Key. The key colour is the median colour of the screen blob in the first frame. Each pixel's
     "keyness" is its chroma projected on the key's chroma (1.0 = the key colour, 0 = grey or
     the opposite hue) minus a penalty for chroma off that axis, so pale, cyan or lime screens all
     key the same way. Alpha = 1 - smoothstep(lo, hi, keyness), only inside the tracked quad
     (dilated a few px), so green things elsewhere in the shot (trees, plants) stay put. Edges are
     un-mixed from the key colour and the remaining key-coloured chroma is removed (despill).
  3. Track. Per frame: screen mask = keyed pixels inside the previous quad's neighbourhood,
     largest blob, holes filled, then its CONVEX HULL. A thumb that bites into an edge leaves a hull
     segment that is collinear with that edge; a notch or island disappears. Hull points near each
     previous edge (minus the rounded-corner zones) are fitted with RANSAC + least squares, with
     a prior that rejects lines that jump in angle/offset. Corners are the intersections of the four
     lines, so a corner hidden under a thumb is still placed where the two edges meet. An edge
     with too little support (thumb covering most of it) is carried over from the previous frame,
     shifted by the motion of the well-supported corners.
  4. Smooth. Robust Savitzky-Golay over time (zero lag, offline), outlier frames re-interpolated.

Requires ffmpeg (with libx264 + libvpx-vp9), numpy, opencv-python, scipy.
"""
import argparse
import json
import math
import os
import subprocess
import sys

import cv2
import numpy as np
from scipy.signal import savgol_filter

OW, OH, FPS = 1080, 1920, 30


# ----------------------------------------------------------------------------- io helpers
def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height,r_frame_rate:format=duration", "-of", "json", path],
        check=True, capture_output=True, text=True).stdout
    j = json.loads(out)
    s = j["streams"][0]
    num, den = s["r_frame_rate"].split("/")
    return int(s["width"]), int(s["height"]), float(num) / float(den), float(j["format"]["duration"])


def read_frames(path, w=OW, h=OH):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
                         stdout=subprocess.PIPE)
    n = w * h * 3
    while True:
        buf = p.stdout.read(n)
        if len(buf) < n:
            break
        yield np.frombuffer(buf, np.uint8).reshape(h, w, 3)
    p.stdout.close()
    p.wait()


def grab(path, t, scale_w=None):
    cmd = ["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", path, "-frames:v", "1"]
    if scale_w:
        cmd += ["-vf", f"scale={scale_w}:-2"]
    cmd += ["-f", "image2pipe", "-vcodec", "png", "-"]
    buf = subprocess.run(cmd, check=True, capture_output=True).stdout
    return cv2.imdecode(np.frombuffer(buf, np.uint8), cv2.IMREAD_COLOR)


# ----------------------------------------------------------------------------- keying
def keyness(img_bgr, key_rgb, perp_w):
    """>= ~1 for the key colour, ~0 for neutral/opposite colours.

    Returns (score, s, rgb, kc): s = chroma projected on the key chroma kc (1.0 at the key),
    score = s - perp_w * |chroma off the key axis| (in key-chroma units). rgb is float32 0..1."""
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB).astype(np.float32) * np.float32(1 / 255.0)
    key_rgb = np.asarray(key_rgb, np.float32)
    kc = (key_rgb - key_rgb.mean()).astype(np.float32)
    kn2 = float(kc @ kc)
    s = cv2.transform(rgb, (kc / kn2).reshape(1, 3))  # kc is zero-mean, so rgb.kc == chroma.kc
    C = (np.eye(3) - 1.0 / 3).astype(np.float32)
    pc = cv2.transform(rgb, C)
    pn2 = cv2.transform(pc * pc, np.full((1, 3), 1.0 / kn2, np.float32))
    perp = np.sqrt(np.maximum(pn2 - s * s, 0))
    return s - perp_w * perp, s, rgb, kc


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def find_screen_blob(img_bgr, key_rgb=None):
    """Return (mask, key_rgb) for the most screen-like saturated blob."""
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    if key_rgb is None:
        cand = ((hsv[..., 0] >= 28) & (hsv[..., 0] <= 100) & (hsv[..., 1] >= 70) & (hsv[..., 2] >= 60))
    else:
        k, _, _, _ = keyness(img_bgr, key_rgb, 0.6)
        cand = k > 0.5
    cand = cv2.morphologyEx(cand.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(cand, 8)
    best, best_score = None, 0
    area_min = 0.004 * img_bgr.shape[0] * img_bgr.shape[1]
    for i in range(1, n):
        a = stats[i, cv2.CC_STAT_AREA]
        if a < area_min:
            continue
        m = (lab == i).astype(np.uint8)
        cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        c = max(cs, key=cv2.contourArea)
        hull_a = cv2.contourArea(cv2.convexHull(c))
        solidity = a / max(hull_a, 1)
        sat = hsv[..., 1][lab == i].mean() / 255
        score = a * solidity ** 3 * sat
        if solidity > 0.75 and score > best_score:
            best, best_score = m, score
    if best is None:
        return None, key_rgb
    if key_rgb is None:
        er = cv2.erode(best, np.ones((7, 7), np.uint8))
        px = img_bgr[er.astype(bool)] if er.any() else img_bgr[best.astype(bool)]
        key_rgb = np.median(px[:, ::-1].astype(np.float32) / 255, axis=0).astype(np.float32)
    return best, key_rgb


# ----------------------------------------------------------------------------- geometry
def order_quad(pts):
    """Order 4 points TL,TR,BR,BL with 'top' = the short side with the smaller mean y."""
    pts = np.asarray(pts, np.float64)
    c = pts.mean(0)
    ang = np.arctan2(pts[:, 1] - c[1], pts[:, 0] - c[0])
    pts = pts[np.argsort(ang)]  # clockwise in image coords (y down)
    L = [np.linalg.norm(pts[(i + 1) % 4] - pts[i]) for i in range(4)]
    # short sides are (0,1)&(2,3) or (1,2)&(3,0)
    if L[0] + L[2] <= L[1] + L[3]:
        cands = [0, 2]
    else:
        cands = [1, 3]
    top = min(cands, key=lambda i: (pts[i][1] + pts[(i + 1) % 4][1]))
    return np.roll(pts, -top, axis=0)


def line_from_pts(p):
    """Total-least-squares line: returns (point, unit direction)."""
    c = p.mean(0)
    u, s, vt = np.linalg.svd(p - c, full_matrices=False)
    return c, vt[0]


def intersect(l1, l2):
    (p, d), (q, e) = l1, l2
    A = np.array([d, -e]).T
    if abs(np.linalg.det(A)) < 1e-9:
        return (p + q) / 2
    t = np.linalg.solve(A, q - p)
    return p + t[0] * d


def quad_from_lines(lines):
    top, right, bottom, left = lines
    return np.array([intersect(top, left), intersect(top, right), intersect(bottom, right), intersect(bottom, left)])


def hull_samples(mask):
    cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not cs:
        return None
    c = max(cs, key=cv2.contourArea)
    h = cv2.convexHull(c)[:, 0, :].astype(np.float64)
    pts = []
    for i in range(len(h)):
        a, b = h[i], h[(i + 1) % len(h)]
        n = max(int(np.linalg.norm(b - a)), 1)
        t = np.arange(n)[:, None] / n
        pts.append(a + (b - a) * t)
    return np.vstack(pts)


def fit_edges(pts, quad, band, prev_lines=None, rng=None, corner_frac=0.16):
    """Fit 4 lines to hull sample points near each edge of `quad`. Returns lines, support (0..1), residuals."""
    rng = rng or np.random.default_rng(0)
    lines, support, resid = [], [], []
    short = min(np.linalg.norm(quad[1] - quad[0]), np.linalg.norm(quad[2] - quad[3]))
    rc = corner_frac * short  # rounded-corner radius estimate
    cen = quad.mean(0)
    for i in range(4):
        A, B = quad[i], quad[(i + 1) % 4]
        L = np.linalg.norm(B - A)
        u = (B - A) / L
        n = np.array([-u[1], u[0]])
        if (cen - A) @ n > 0:
            n = -n  # outward normal
        t = (pts - A) @ u / L
        d = (pts - A) @ n
        ex = min(0.3, rc / L + 0.02)
        sel = (t > ex) & (t < 1 - ex) & (np.abs(d) < band)
        P = pts[sel]
        expected = L * (1 - 2 * ex)
        if len(P) < 8:
            lines.append(None); support.append(0.0); resid.append(np.nan)
            continue
        best_in, best_score = None, -1
        for _ in range(80):
            a, b = P[rng.choice(len(P), 2, replace=False)]
            dv = b - a
            nv = np.linalg.norm(dv)
            if nv < 0.15 * expected:
                continue
            dv /= nv
            nn = np.array([-dv[1], dv[0]])
            if prev_lines is not None and prev_lines[i] is not None:
                pd = prev_lines[i][1]
                if abs(dv @ pd) < math.cos(math.radians(4)):
                    continue
            dist = np.abs((P - a) @ nn)
            inl = dist < 1.5
            # prefer support, then the outermost of near-equal candidates (notch/island lie inside)
            outer = float(((P[inl] - A) @ n).mean()) if inl.any() else 0
            score = inl.sum() + 0.02 * outer * inl.sum() / max(expected, 1)
            if score > best_score:
                best_score, best_in = score, inl
        if best_in is None or best_in.sum() < 8:
            lines.append(None); support.append(0.0); resid.append(np.nan)
            continue
        Pin = P[best_in]
        for _ in range(2):
            c, dvec = line_from_pts(Pin)
            nn = np.array([-dvec[1], dvec[0]])
            dist = np.abs((P - c) @ nn)
            Pin = P[dist < 1.2] if (dist < 1.2).sum() >= 8 else Pin
        c, dvec = line_from_pts(Pin)
        if dvec @ u < 0:
            dvec = -dvec
        nn = np.array([-dvec[1], dvec[0]])
        lines.append((c, dvec))
        support.append(min(1.0, len(Pin) / max(expected, 1)))
        resid.append(float(np.median(np.abs((Pin - c) @ nn))))
    return lines, support, resid


def grow_quad(quad, g):
    """Offset every edge of a convex quad outward by g px (negative shrinks)."""
    quad = np.asarray(quad, np.float64)
    cen = quad.mean(0)
    lines = []
    for i in range(4):
        A, B = quad[i], quad[(i + 1) % 4]
        u = (B - A) / max(np.linalg.norm(B - A), 1e-9)
        n = np.array([-u[1], u[0]])
        if (cen - A) @ n > 0:
            n = -n
        lines.append((A + g * n, u))
    return quad_from_lines(lines)


def poly_mask(quad, shape, grow=0):
    m = np.zeros(shape[:2], np.uint8)
    q = grow_quad(quad, grow) if grow else quad
    cv2.fillConvexPoly(m, np.round(q * 4).astype(np.int32), 255, lineType=cv2.LINE_AA, shift=2)
    return m


# ----------------------------------------------------------------------------- crop
def auto_crop(src, sw, sh, start, dur, args):
    ts = np.linspace(start + 0.2, start + dur - 0.2, 8)
    scale = 640.0 / max(sw, sh)
    boxes, key = [], None
    for t in ts:
        im = grab(src, t, int(round(sw * scale / 2) * 2))
        m, key = find_screen_blob(im, key)
        if m is None:
            continue
        x, y, w, h = cv2.boundingRect(m)
        boxes.append(np.array([x, y, x + w, y + h]) / scale)
    if not boxes:
        sys.exit("could not find a green screen to auto-crop around; pass --crop x,y,w,h")
    B = np.array(boxes)
    cx = np.median((B[:, 0] + B[:, 2]) / 2)
    cy = np.median((B[:, 1] + B[:, 3]) / 2)
    scr_w = np.median(B[:, 2] - B[:, 0])
    # largest 9:16 window that fits
    ch_max = min(sh, sw * 16 / 9)
    zoom = args.zoom
    if zoom is None:
        target_cw = scr_w / args.screen_width
        zoom = ch_max / (target_cw * 16 / 9)
        max_zoom = max(1.0, ch_max / (OH / args.max_upscale))
        zoom = float(np.clip(zoom, 1.0, max_zoom))
    ch = ch_max / zoom
    cw = ch * 9 / 16
    x = np.clip(cx + args.cx_offset * cw - cw / 2, 0, sw - cw)
    y = np.clip(cy - args.cy * ch, 0, sh - ch)
    # keep every sampled screen box inside the crop if possible
    x = np.clip(x, max(0, B[:, 2].max() + 8 - cw), min(sw - cw, B[:, 0].min() - 8)) if B[:, 2].max() - B[:, 0].min() + 16 < cw else x
    y = np.clip(y, max(0, B[:, 3].max() + 8 - ch), min(sh - ch, B[:, 1].min() - 8)) if B[:, 3].max() - B[:, 1].min() + 16 < ch else y
    ev = lambda v: int(v) // 2 * 2
    return ev(x), ev(y), ev(cw), ev(ch), zoom


# ----------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("clip")
    ap.add_argument("outdir")
    ap.add_argument("--start", type=float, default=0.0, help="source start time (s)")
    ap.add_argument("--dur", type=float, default=8.0, help="duration (s), max 8 recommended")
    ap.add_argument("--crop", help="x,y,w,h crop in source pixels (9:16); default: auto")
    ap.add_argument("--zoom", type=float, help="crop zoom vs the largest 9:16 window (auto if omitted)")
    ap.add_argument("--screen-width", type=float, default=0.5, help="auto-zoom target: screen width / frame width")
    ap.add_argument("--max-upscale", type=float, default=1.15, help="auto-zoom never upscales source more than this")
    ap.add_argument("--cy", type=float, default=0.54, help="screen centre height in the frame (0..1)")
    ap.add_argument("--cx-offset", type=float, default=0.0, help="shift crop so the screen sits off-centre (fraction of width)")
    ap.add_argument("--hflip", action="store_true", help="mirror the plate (e.g. to make a right hand a left hand)")
    ap.add_argument("--key", help="key colour R,G,B (0-255); default: auto from the screen")
    ap.add_argument("--lo", type=float, default=0.22, help="keyness below this stays opaque")
    ap.add_argument("--hi", type=float, default=0.50, help="keyness above this is fully transparent")
    ap.add_argument("--perp", type=float, default=0.8, help="penalty for chroma off the key axis")
    ap.add_argument("--despill", type=float, default=1.0, help="despill strength 0..1")
    ap.add_argument("--spill-grow", type=int, default=40, help="despill fades out over this many px around the screen")
    ap.add_argument("--spill-base", type=float, default=0.12, help="key-axis chroma kept (skin/wood have some)")
    ap.add_argument("--corner", type=float, default=0.16, help="rounded corner radius / screen short side")
    ap.add_argument("--min-support", type=float, default=0.18, help="edge support below this -> carry previous edge")
    ap.add_argument("--smooth", type=int, default=7, help="Savitzky-Golay window (frames, odd)")
    ap.add_argument("--screenshot", help="image warped into the quad for preview.jpg")
    ap.add_argument("--debug", help="dir for debug output (test composite mp4, key tests)")
    ap.add_argument("--crf", type=int, default=18)
    args = ap.parse_args()

    os.makedirs(args.outdir, exist_ok=True)
    sw, sh, sfps, sdur = probe(args.clip)
    dur = min(args.dur, sdur - args.start)
    if args.crop:
        x, y, cw, ch = [int(v) for v in args.crop.split(",")]
        zoom = None
    else:
        x, y, cw, ch, zoom = auto_crop(args.clip, sw, sh, args.start, dur, args)
    print(f"source {sw}x{sh}@{sfps:.2f} crop {cw}x{ch}+{x}+{y} (zoom {zoom})", flush=True)

    plate = os.path.join(args.outdir, "plate.mp4")
    vf = f"crop={cw}:{ch}:{x}:{y},scale={OW}:{OH}:flags=lanczos"
    if args.hflip:
        vf += ",hflip"
    vf += f",fps={FPS},format=yuv420p"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{args.start:.3f}", "-t", f"{dur:.3f}", "-i", args.clip,
                    "-vf", vf, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", str(args.crf),
                    "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", str(FPS), plate], check=True)

    # ------------------------------------------------------------------ pass 1: track
    key_rgb = np.array([int(v) for v in args.key.split(",")], np.float32) / 255 if args.key else None
    raw, supports, resids = [], [], []
    prev_quad, prev_lines = None, None
    rng = np.random.default_rng(1)
    for fi, fr in enumerate(read_frames(plate)):
        if prev_quad is None:
            blob, key_rgb = find_screen_blob(fr, key_rgb)
            if blob is None:
                sys.exit("no screen found in first plate frame")
            hull = cv2.convexHull(max(cv2.findContours(blob, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0],
                                      key=cv2.contourArea))
            eps = 0.01 * cv2.arcLength(hull, True)
            approx = cv2.approxPolyDP(hull, eps, True)
            while len(approx) > 4:
                eps *= 1.3
                approx = cv2.approxPolyDP(hull, eps, True)
            if len(approx) < 4:
                r = cv2.minAreaRect(hull)
                approx = cv2.boxPoints(r)[:, None, :]
            prev_quad = order_quad(approx[:, 0, :])
            print(f"key colour RGB {np.round(key_rgb * 255).astype(int).tolist()}", flush=True)
        side = max(np.linalg.norm(prev_quad[i] - prev_quad[(i + 1) % 4]) for i in range(4))
        roi = poly_mask(prev_quad, fr.shape, grow=int(0.06 * side + 24)) > 0
        ys, xs = np.where(roi)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        k, _, _, _ = keyness(fr[y0:y1, x0:x1], key_rgb, args.perp)
        m = ((k > (args.lo + args.hi) / 2) & roi[y0:y1, x0:x1]).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        n, lab, stats, _ = cv2.connectedComponentsWithStats(m, 8)
        if n > 1:
            m = (lab == 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
        pts = hull_samples(m)
        if pts is None:
            raw.append(prev_quad.copy()); supports.append([0] * 4); resids.append([np.nan] * 4)
            continue
        pts = pts + [x0, y0]
        q = prev_quad
        lines = None
        for band in (28.0, 6.0):
            lines, sup, res = fit_edges(pts, q, band, prev_lines, rng, args.corner)
            good = [l is not None and s >= args.min_support for l, s in zip(lines, sup)]
            if prev_lines is not None:
                for i in range(4):
                    if not good[i]:
                        lines[i] = prev_lines[i]
            elif not all(good):
                # first frame: fall back to the polygon's own edges
                for i in range(4):
                    if not good[i]:
                        A, B = q[i], q[(i + 1) % 4]
                        lines[i] = (A, (B - A) / np.linalg.norm(B - A))
            qn = quad_from_lines(lines)
            if prev_lines is not None and not all(good):
                # shift carried-over edges by the motion of corners whose two edges are good
                gc = [j for j in range(4) if good[j] and good[(j - 1) % 4]]
                if gc:
                    shift = np.mean([qn[j] - prev_quad[j] for j in gc], axis=0)
                    for i in range(4):
                        if not good[i]:
                            c, d = prev_lines[i]
                            lines[i] = (c + shift, d)
                    qn = quad_from_lines(lines)
            q = qn
        raw.append(q.copy()); supports.append(sup); resids.append(res)
        prev_quad, prev_lines = q, lines
    raw = np.array(raw)  # (N,4,2)
    N = len(raw)

    # ------------------------------------------------------------------ smooth (robust)
    def sg(a):
        w = min(args.smooth, N - (1 - N % 2))
        if w < 5:
            return a.copy()
        return savgol_filter(a, w, 2, axis=0, mode="interp")

    flat = raw.reshape(N, 8)
    sm = sg(flat)
    dev = np.abs(flat - sm).reshape(N, 4, 2).max(axis=(1, 2))
    thr = max(4.0, 4 * np.median(dev) + 1)
    bad = dev > thr
    if bad.any() and (~bad).sum() > 4:
        idx = np.arange(N)
        fixed = flat.copy()
        for c in range(8):
            fixed[bad, c] = np.interp(idx[bad], idx[~bad], flat[~bad, c])
        sm = sg(fixed)
    quads = sm.reshape(N, 4, 2)

    sup = np.array(supports, float)
    res = np.array(resids, float)
    stats = {
        "frames": N,
        "outlierFrames": int(bad.sum()),
        "rawVsSmoothPx": {"median": round(float(np.median(dev)), 2), "p95": round(float(np.percentile(dev, 95)), 2),
                          "max": round(float(dev.max()), 2)},
        "edgeFitResidualPx": round(float(np.nanmedian(res)), 2),
        "edgeSupportMin": [round(float(v), 2) for v in sup.min(axis=0)],
        "framesWithWeakEdge": int((sup < args.min_support).any(axis=1).sum()),
    }

    # ------------------------------------------------------------------ pass 2: key + composites
    shot = cv2.imread(args.screenshot) if args.screenshot else None
    if shot is None:
        shot = checker(1179, 2556)
    sample_idx = set(np.linspace(0, N - 1, 6).round().astype(int).tolist())
    sheet = []
    keyed = os.path.join(args.outdir, "keyed.webm")
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{OW}x{OH}",
                            "-r", str(FPS), "-i", "-", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p",
                            "-auto-alt-ref", "0", "-b:v", "0", "-crf", "24", "-row-mt", "1", "-deadline", "good",
                            "-cpu-used", "4", "-threads", "8", "-an", keyed], stdin=subprocess.PIPE)
    dbg = None
    if args.debug:
        os.makedirs(args.debug, exist_ok=True)
        dbg = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s",
                                f"{OW // 2}x{OH // 2}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "20",
                                "-pix_fmt", "yuv420p", os.path.join(args.debug, "test_composite.mp4")],
                               stdin=subprocess.PIPE)
    kc_full = None
    for fi, fr in enumerate(read_frames(plate)):
        q = quads[min(fi, N - 1)]
        rgba = key_frame(fr, q, key_rgb, args)
        enc.stdin.write(rgba.tobytes())
        if dbg or fi in sample_idx:
            comp = composite(rgba, shot, q)
            if dbg:
                dbg.stdin.write(cv2.resize(comp, (OW // 2, OH // 2), interpolation=cv2.INTER_AREA).tobytes())
            if fi in sample_idx:
                sheet.append(comp)
                if args.debug:
                    cv2.imwrite(os.path.join(args.debug, f"comp_{fi:03d}.jpg"), comp, [cv2.IMWRITE_JPEG_QUALITY, 92])
                    over_m = over(rgba, (255, 0, 255))
                    cv2.imwrite(os.path.join(args.debug, f"magenta_{fi:03d}.jpg"), over_m, [cv2.IMWRITE_JPEG_QUALITY, 92])
                    cv2.imwrite(os.path.join(args.debug, f"white_{fi:03d}.jpg"), over(rgba, (255, 255, 255)),
                                [cv2.IMWRITE_JPEG_QUALITY, 92])
                    dbgq = fr.copy()
                    cv2.polylines(dbgq, [np.round(raw[fi] * 4).astype(np.int32)], True, (0, 0, 255), 1, cv2.LINE_AA, 2)
                    cv2.polylines(dbgq, [np.round(q * 4).astype(np.int32)], True, (255, 0, 255), 1, cv2.LINE_AA, 2)
                    cv2.imwrite(os.path.join(args.debug, f"quad_{fi:03d}.png"), dbgq)
    enc.stdin.close(); enc.wait()
    if dbg:
        dbg.stdin.close(); dbg.wait()

    tiles = [cv2.resize(c, (360, 640), interpolation=cv2.INTER_AREA) for c in sheet]
    cv2.imwrite(os.path.join(args.outdir, "preview.jpg"), np.hstack(tiles), [cv2.IMWRITE_JPEG_QUALITY, 88])

    # ------------------------------------------------------------------ outputs
    def aspect(qq):
        w = (np.linalg.norm(qq[1] - qq[0]) + np.linalg.norm(qq[2] - qq[3])) / 2
        h = (np.linalg.norm(qq[3] - qq[0]) + np.linalg.norm(qq[2] - qq[1])) / 2
        return w / h

    with open(os.path.join(args.outdir, "corners.json"), "w") as f:
        json.dump({"fps": FPS, "size": [OW, OH], "order": "tl,tr,br,bl",
                   "frames": [[[round(float(x), 2), round(float(y), 2)] for x, y in qq] for qq in quads]},
                  f, separators=(",", ":"))
    info = {
        "source": os.path.basename(args.clip), "sourceSize": [sw, sh], "sourceFps": round(sfps, 3),
        "start": args.start, "durationSec": round(N / FPS, 3), "crop": [x, y, cw, ch],
        "zoom": None if zoom is None else round(zoom, 3), "hflip": args.hflip,
        "keyRGB": np.round(key_rgb * 255).astype(int).tolist(),
        "key": {"lo": args.lo, "hi": args.hi, "perp": args.perp, "despill": args.despill,
                "spillBase": args.spill_base, "spillGrow": args.spill_grow},
        "screenAspect": round(float(np.median([aspect(qq) for qq in quads])), 4),
        "screenWidthFrac": round(float(np.median([(np.linalg.norm(qq[1] - qq[0]) + np.linalg.norm(qq[2] - qq[3])) / 2 / OW
                                                for qq in quads])), 3),
        "screenCenterY": round(float(np.median(quads[:, :, 1].mean(1))) / OH, 3),
        "stats": stats,
    }
    with open(os.path.join(args.outdir, "track.json"), "w") as f:
        json.dump(info, f, indent=2)
    print(json.dumps(info, indent=2))


def checker(w, h, n=12):
    s = w // n
    yy, xx = np.mgrid[0:h, 0:w]
    c = (((xx // s) + (yy // s)) % 2).astype(np.uint8)
    img = np.stack([c * 200 + 30, c * 60 + 120, 255 - c * 180], -1).astype(np.uint8)
    cv2.rectangle(img, (0, 0), (w - 1, h - 1), (0, 0, 255), 12)
    cv2.line(img, (0, 0), (w, h), (255, 255, 255), 6)
    cv2.line(img, (w, 0), (0, h), (255, 255, 255), 6)
    return img


def key_frame(fr, q, key_rgb, args):
    """RGBA uint8: screen transparent, spill removed."""
    side = max(np.linalg.norm(q[i] - q[(i + 1) % 4]) for i in range(4))
    roi = poly_mask(q, fr.shape, grow=8)
    spill_roi = poly_mask(q, fr.shape, grow=args.spill_grow)
    ys, xs = np.where(spill_roi > 0)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    sub = fr[y0:y1, x0:x1]
    k, s, rgb, kc = keyness(sub, key_rgb, args.perp)
    alpha = 1 - smoothstep(args.lo, args.hi, k)
    r = roi[y0:y1, x0:x1].astype(np.float32) / 255
    alpha = 1 - (1 - alpha) * r  # keying only inside the (slightly grown) quad
    # remove small opaque specks (reflections, compression noise) inside the screen
    inner = poly_mask(q, fr.shape, grow=0)[y0:y1, x0:x1] > 0
    inner = cv2.erode(inner.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
    op = ((alpha > 0.5) & inner).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(op, 8)
    if n > 1:
        qa = cv2.contourArea(q.astype(np.float32))
        small = np.zeros(n, bool)
        small[1:] = st[1:, cv2.CC_STAT_AREA] < 0.0006 * qa
        # but keep blobs touching the inner border (those belong to fingers/bezel)
        border = inner & ~cv2.erode(inner.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
        touching = np.unique(lab[border & (lab > 0)])
        small[touching] = False
        alpha = np.where(small[lab], 0.0, alpha)
    alpha = cv2.GaussianBlur(alpha.astype(np.float32), (3, 3), 0.6)
    # un-mix semi-transparent edge pixels from the key colour, then despill
    a3 = np.clip(alpha, 1e-3, 1)[..., None]
    unmixed = np.clip((rgb - (1 - a3) * key_rgb) / a3, 0, 1)
    wmix = smoothstep(0.98, 0.6, alpha)[..., None]  # only for clearly mixed pixels
    wmix = wmix * (alpha > 0.08)[..., None]
    col = rgb * (1 - wmix) + unmixed * wmix
    col = col.astype(np.float32)
    # remove only the key-axis chroma above what skin/wood/etc. naturally have (spill_base), with a
    # weight that fades out with distance from the screen so there is no visible boundary
    s2 = np.clip(cv2.transform(col, (kc / float(kc @ kc)).reshape(1, 3)) - args.spill_base, 0, None)
    outside = (poly_mask(q, fr.shape, grow=0)[y0:y1, x0:x1] < 128).astype(np.uint8)
    dist = cv2.distanceTransform(outside, cv2.DIST_L2, 3)
    sp = (1 - smoothstep(0, float(args.spill_grow), dist))[..., None]
    col = np.clip(col - args.despill * sp * s2[..., None] * kc, 0, 1)
    out = np.empty((OH, OW, 4), np.uint8)
    out[..., :3] = fr[..., ::-1]
    out[..., 3] = 255
    out[y0:y1, x0:x1, :3] = np.round(col * 255).astype(np.uint8)
    out[y0:y1, x0:x1, 3] = np.round(np.clip(alpha, 0, 1) * 255).astype(np.uint8)
    return out


def warp_into(img, q, shape):
    h, w = img.shape[:2]
    # pre-shrink so the warp doesn't alias
    tw = max(np.linalg.norm(q[1] - q[0]), np.linalg.norm(q[2] - q[3]))
    if tw < w * 0.8:
        f = tw / w * 1.25
        img = cv2.resize(img, (int(w * f), int(h * f)), interpolation=cv2.INTER_AREA)
        h, w = img.shape[:2]
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    H = cv2.getPerspectiveTransform(src, q.astype(np.float32))
    return cv2.warpPerspective(img, H, (shape[1], shape[0]), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0))


def composite(rgba, shot, q):
    under = warp_into(shot, q, rgba.shape)
    a = rgba[..., 3:4].astype(np.float32) / 255
    fg = rgba[..., 2::-1].astype(np.float32)  # RGBA -> BGR
    return np.clip(fg * a + under.astype(np.float32) * (1 - a), 0, 255).astype(np.uint8)


def over(rgba, color_rgb):
    a = rgba[..., 3:4].astype(np.float32) / 255
    fg = rgba[..., 2::-1].astype(np.float32)
    bg = np.array(color_rgb[::-1], np.float32)
    return np.clip(fg * a + bg * (1 - a), 0, 255).astype(np.uint8)


if __name__ == "__main__":
    main()
