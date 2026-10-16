"""Single decoding pass: per-frame features used by cuts / camera / text modules.

Global motion between consecutive frames is a 4-DOF similarity (scale, rotation,
translation) fitted with Shi-Tomasi corners + pyramidal Lucas-Kanade (forward-
backward checked) + RANSAC (cv2.estimateAffinePartial2D). If the dominant model
is the identity but a large second population of points moves coherently, the
moving population is taken as the camera (static captions over a zooming layer).
"""
from __future__ import annotations

import math

import cv2
import numpy as np

from common import Probe, choose_analysis_fps, detect_bars, frames_iter

ANALYSIS_W = 360
THUMB_W = 90
EDGE_W = 180
EDGE_CELL = 20


def ssim(a: np.ndarray, b: np.ndarray, mask: np.ndarray | None = None) -> float:
    a = a.astype(np.float32)
    b = b.astype(np.float32)
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    g = lambda x: cv2.GaussianBlur(x, (7, 7), 1.5)
    ma, mb = g(a), g(b)
    saa = g(a * a) - ma * ma
    sbb = g(b * b) - mb * mb
    sab = g(a * b) - ma * mb
    m = ((2 * ma * mb + c1) * (2 * sab + c2)) / ((ma * ma + mb * mb + c1) * (saa + sbb + c2))
    if mask is not None:
        if mask.sum() < 10:
            return float("nan")
        return float(m[mask].mean())
    return float(m.mean())


def _identity():
    return np.array([[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]], dtype=np.float64)


def decompose(M: np.ndarray, w: int, h: int) -> tuple[float, float, float, float, float, float]:
    """Similarity M (2x3) -> scale, rot_deg, center dx, center dy (analysis px), focus fx, fy (0..1)."""
    a, b = M[0, 0], M[1, 0]
    s = math.hypot(a, b)
    rot = math.degrees(math.atan2(b, a))
    c = np.array([w / 2.0, h / 2.0])
    c2 = M[:, :2] @ c + M[:, 2]
    dx, dy = c2 - c
    fx = fy = float("nan")
    if abs(s - 1) > 0.002:
        A = np.eye(2) - M[:, :2]
        try:
            x = np.linalg.solve(A, M[:, 2])
            fx, fy = x[0] / w, x[1] / h
        except np.linalg.LinAlgError:
            pass
    return s, rot, float(dx), float(dy), fx, fy


def _phase_shift(prev: np.ndarray, cur: np.ndarray) -> tuple[float, float, float]:
    p = cv2.resize(prev, (prev.shape[1] // 2, prev.shape[0] // 2), interpolation=cv2.INTER_AREA).astype(np.float32)
    c = cv2.resize(cur, (cur.shape[1] // 2, cur.shape[0] // 2), interpolation=cv2.INTER_AREA).astype(np.float32)
    win = cv2.createHanningWindow((p.shape[1], p.shape[0]), cv2.CV_32F)
    (sx, sy), resp = cv2.phaseCorrelate(p, c, win)
    return sx * 2.0, sy * 2.0, float(resp)


def estimate_motion(prev: np.ndarray, cur: np.ndarray) -> dict:
    """Similarity transform prev->cur at analysis resolution, with diagnostics."""
    h, w = prev.shape
    out = {"M": _identity(), "ok": False, "n": 0, "inl": 0.0, "overlay": 0.0, "flow_med": 0.0,
           "flow_p90": 0.0, "method": "none", "resid": float("nan")}
    pts = cv2.goodFeaturesToTrack(prev, maxCorners=400, qualityLevel=0.005, minDistance=7, blockSize=7)
    if pts is not None and len(pts) >= 10:
        crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01)
        nxt, st, _ = cv2.calcOpticalFlowPyrLK(prev, cur, pts, None, winSize=(21, 21), maxLevel=4, criteria=crit)
        back, st2, _ = cv2.calcOpticalFlowPyrLK(cur, prev, nxt, None, winSize=(21, 21), maxLevel=4, criteria=crit)
        p0 = pts.reshape(-1, 2)
        p1 = nxt.reshape(-1, 2)
        fb = np.linalg.norm(back.reshape(-1, 2) - p0, axis=1)
        good = (st.ravel() == 1) & (st2.ravel() == 1) & (fb < 0.8)
        p0, p1 = p0[good], p1[good]
        n = len(p0)
        out["n"] = n
        if n >= 10:
            flow = np.linalg.norm(p1 - p0, axis=1)
            out["flow_med"] = float(np.median(flow))
            out["flow_p90"] = float(np.percentile(flow, 90))
            M, inl = cv2.estimateAffinePartial2D(p0, p1, method=cv2.RANSAC, ransacReprojThreshold=0.8,
                                                 maxIters=2000, confidence=0.995, refineIters=10)
            if M is not None:
                inl = inl.ravel().astype(bool)
                frac = inl.mean()
                s, rot, dx, dy, _, _ = decompose(M, w, h)
                ident = abs(s - 1) < 0.0015 and abs(rot) < 0.05 and math.hypot(dx, dy) < 0.25
                # second population: moving layer under static overlays (or vice versa)
                rest = ~inl
                if rest.sum() >= 12:
                    M2, inl2 = cv2.estimateAffinePartial2D(p0[rest], p1[rest], method=cv2.RANSAC,
                                                           ransacReprojThreshold=0.8, maxIters=2000,
                                                           confidence=0.995, refineIters=10)
                    if M2 is not None:
                        inl2 = inl2.ravel().astype(bool)
                        frac2 = inl2.sum() / n
                        s2, rot2, dx2, dy2, _, _ = decompose(M2, w, h)
                        moving2 = abs(s2 - 1) > 0.002 or abs(rot2) > 0.08 or math.hypot(dx2, dy2) > 0.4
                        ident2 = abs(s2 - 1) < 0.0015 and abs(rot2) < 0.05 and math.hypot(dx2, dy2) < 0.25
                        if ident and moving2 and frac2 >= 0.25:
                            out["overlay"] = float(frac)
                            M, frac = M2, frac2
                            idx = np.flatnonzero(rest)[inl2]
                            inl = np.zeros(n, bool)
                            inl[idx] = True
                        elif (not ident) and ident2 and frac2 >= 0.2:
                            out["overlay"] = float(frac2)
                res = np.linalg.norm((p0[inl] @ M[:, :2].T + M[:, 2]) - p1[inl], axis=1)
                out.update(M=M, ok=frac >= 0.3 and inl.sum() >= 8, inl=float(frac), method="lk",
                           resid=float(np.median(res)) if len(res) else float("nan"))
    if not out["ok"]:
        sx, sy, resp = _phase_shift(prev, cur)
        if resp > 0.08:
            M = _identity()
            M[0, 2], M[1, 2] = sx, sy
            out.update(M=M, ok=resp > 0.15, method="phase", inl=resp)
    return out


def warp_thumb(prev_t: np.ndarray, M: np.ndarray, k: float) -> tuple[np.ndarray, np.ndarray]:
    """Warp a thumbnail with an analysis-resolution transform (k = thumb/analysis scale)."""
    Mt = M.copy()
    Mt[:, 2] *= k
    h, w = prev_t.shape
    warped = cv2.warpAffine(prev_t, Mt, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    valid = cv2.warpAffine(np.ones_like(prev_t), Mt, (w, h), flags=cv2.INTER_NEAREST, borderValue=0).astype(bool)
    return warped, valid


def extract(path: str, p: Probe, fps_cap: float = 30.0, use_crop: bool = True, progress: bool = False) -> dict:
    fps, use_filter = choose_analysis_fps(p, fps_cap)
    crop = None
    if use_crop:
        c = detect_bars(path, p.duration)
        if c:
            cw, ch, cx, cy = c
            # only accept real bars (>=4% removed) that are roughly symmetric
            dw, dh = p.width - cw, p.height - ch
            sym_x = abs((cx) - (p.width - cw - cx)) <= max(8, 0.02 * p.width)
            sym_y = abs((cy) - (p.height - ch - cy)) <= max(8, 0.02 * p.height)
            if (dh >= 0.04 * p.height and sym_y and dw <= 0.02 * p.width) or (dw >= 0.04 * p.width and sym_x and dh <= 0.02 * p.height):
                crop = c
    src_w = crop[0] if crop else p.width
    src_h = crop[1] if crop else p.height
    W = ANALYSIS_W
    H = int(round(W * src_h / src_w / 2.0)) * 2
    TW = THUMB_W
    TH = int(round(TW * src_h / src_w))
    EW = EDGE_W
    EH = int(round(EW * src_h / src_w))
    egh, egw = EH // EDGE_CELL, EW // EDGE_CELL
    k_thumb = TW / W
    # px at analysis -> px at 1080-wide ORIGINAL frame
    px1080 = (src_w / W) * (1080.0 / p.width)

    thumbs, hists, luma, lstd, sat, sharp, gx2, gy2 = [], [], [], [], [], [], [], []
    Ms, ok, nPts, inl, ovl, fmed, fp90, meth, resid = [], [], [], [], [], [], [], [], []
    mad, mcd, area, edges, econ = [], [], [], [], []
    prev_g = prev_t = None
    n = 0
    bs = 6  # block size for changed-area on thumbs
    for rgb in frames_iter(path, W, H, fps, use_filter, crop):
        g = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        small = cv2.resize(rgb, (TW, TH), interpolation=cv2.INTER_AREA)
        t = cv2.cvtColor(small, cv2.COLOR_RGB2GRAY)
        hsv = cv2.cvtColor(small, cv2.COLOR_RGB2HSV)
        hist = cv2.calcHist([hsv], [0, 1, 2], None, [16, 4, 4], [0, 180, 0, 256, 0, 256]).ravel()
        hist /= max(hist.sum(), 1)
        lap = cv2.Laplacian(g, cv2.CV_32F, ksize=3)
        sx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3)
        sy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
        thumbs.append(t)
        hists.append(hist.astype(np.float32))
        luma.append(float(t.mean()))
        lstd.append(float(t.std()))
        sat.append(float(hsv[..., 1].mean()))
        sharp.append(float(lap.var()))
        gx2.append(float((sx * sx).mean()))
        gy2.append(float((sy * sy).mean()))
        eg = cv2.resize(g, (EW, EH), interpolation=cv2.INTER_AREA)
        ed = cv2.Canny(cv2.GaussianBlur(eg, (3, 3), 0), 80, 160) > 0
        ed = ed[: egh * EDGE_CELL, : egw * EDGE_CELL].reshape(egh, EDGE_CELL, egw, EDGE_CELL)
        edges.append(ed.mean(axis=(1, 3)).astype(np.float32))
        blk = eg[: egh * EDGE_CELL, : egw * EDGE_CELL].reshape(egh, EDGE_CELL, egw, EDGE_CELL)
        econ.append((blk.max(axis=(1, 3)).astype(np.int16) - blk.min(axis=(1, 3))).astype(np.uint8))
        if prev_g is None:
            Ms.append(_identity()); ok.append(False); nPts.append(0); inl.append(0.0); ovl.append(0.0)
            fmed.append(0.0); fp90.append(0.0); meth.append("none"); resid.append(float("nan"))
            mad.append(0.0); mcd.append(0.0); area.append(0.0)
        else:
            m = estimate_motion(prev_g, g)
            Ms.append(m["M"]); ok.append(m["ok"]); nPts.append(m["n"]); inl.append(m["inl"]); ovl.append(m["overlay"])
            fmed.append(m["flow_med"]); fp90.append(m["flow_p90"]); meth.append(m["method"]); resid.append(m["resid"])
            d_raw = np.abs(t.astype(np.int16) - prev_t.astype(np.int16))
            mad.append(float(d_raw.mean()) / 255.0)
            if m["ok"]:
                wp, valid = warp_thumb(prev_t, m["M"], k_thumb)
                d = np.abs(t.astype(np.int16) - wp.astype(np.int16)).astype(np.float32)
                d[~valid] = d_raw[~valid]
            else:
                d = d_raw.astype(np.float32)
            mcd.append(float(d.mean()) / 255.0)
            hb, wb = TH // bs, TW // bs
            bd = d[: hb * bs, : wb * bs].reshape(hb, bs, wb, bs).mean(axis=(1, 3))
            area.append(float((bd > 18).mean()))
        prev_g, prev_t = g, t
        n += 1
        if progress and n % 300 == 0:
            print(f"  frame {n}", flush=True)
    return {
        "fps": fps, "fps_filter": use_filter, "crop": crop, "W": W, "H": H, "TW": TW, "TH": TH,
        "px1080": px1080, "n": n,
        "thumbs": np.stack(thumbs) if thumbs else np.zeros((0, TH, TW), np.uint8),
        "hists": np.stack(hists) if hists else np.zeros((0, 256), np.float32),
        "luma": np.array(luma), "lstd": np.array(lstd), "sat": np.array(sat),
        "sharp": np.array(sharp), "gx2": np.array(gx2), "gy2": np.array(gy2),
        "M": np.stack(Ms) if Ms else np.zeros((0, 2, 3)), "ok": np.array(ok, bool), "npts": np.array(nPts),
        "inl": np.array(inl), "overlay": np.array(ovl), "flow_med": np.array(fmed), "flow_p90": np.array(fp90),
        "method": meth, "resid": np.array(resid),
        "mad": np.array(mad), "mcd": np.array(mcd), "area": np.array(area),
        "edges": np.stack(edges) if edges else np.zeros((0, egh, egw), np.float32),
        "econ": np.stack(econ) if econ else np.zeros((0, egh, egw), np.uint8),
    }


def motion_params(F: dict) -> dict:
    """Per-frame decomposed motion (prev->cur), translations in px at 1080w."""
    W, H, k = F["W"], F["H"], F["px1080"]
    n = F["n"]
    s = np.ones(n); rot = np.zeros(n); dx = np.zeros(n); dy = np.zeros(n)
    fx = np.full(n, np.nan); fy = np.full(n, np.nan)
    for i in range(n):
        if not F["ok"][i]:
            continue
        si, ri, dxi, dyi, fxi, fyi = decompose(F["M"][i], W, H)
        s[i], rot[i], dx[i], dy[i], fx[i], fy[i] = si, ri, dxi * k, dyi * k, fxi, fyi
    return {"s": s, "dlogs": np.log(s), "rot": rot, "dx": dx, "dy": dy, "fx": fx, "fy": fy}


def bhattacharyya(h1: np.ndarray, h2: np.ndarray) -> float:
    return float(cv2.compareHist(h1, h2, cv2.HISTCMP_BHATTACHARYYA))
