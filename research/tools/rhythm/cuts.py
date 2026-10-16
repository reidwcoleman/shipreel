"""Shot-boundary detection: hard cuts (incl. zoom-cuts / jump-cuts) and soft transitions.

Hard cut at frame i (boundary between i-1 and i):
  * "cut":       motion-compensated thumb difference spikes (isolated), SSIM low,
                 colour-histogram (HSV 16x4x4, Bhattacharyya) changes, >=45 % of blocks change.
  * "zoom_cut":  the similarity model still fits across the boundary but scale jumps
                 >=3.5 % in one frame while neighbours are steady (punch-in jump cut).
  * "reframe_cut": same, but an isolated translation jump >= 25 px @1080w.
  * "jump_cut":  smaller isolated discontinuity (talking-head jump cut, same framing).
Soft transitions are found as peaks of D_k(i) = 1 - SSIM(frame i-k, frame i+k) that are
not explained by the camera-motion chain; the window is delimited with a progress curve
(distance to the outgoing vs incoming frame) and classified in this order:
fade_black / fade_white / flash (luma), whip (motion blur), push / slide / wipe (strip
composite search), zoom (scale), dissolve (alpha-mix least squares), other.
"""
from __future__ import annotations

import math

import cv2
import numpy as np

from features import bhattacharyya, ssim

EASINGS = {
    "linear": lambda t: t,
    "ease_in_cubic": lambda t: t ** 3,
    "ease_out_quad": lambda t: 1 - (1 - t) ** 2,
    "ease_out_cubic": lambda t: 1 - (1 - t) ** 3,
    "ease_out_quint": lambda t: 1 - (1 - t) ** 5,
    "ease_out_expo": lambda t: np.where(t >= 1, 1.0, 1 - np.power(2.0, -10 * t)),
    "ease_in_out_cubic": lambda t: np.where(t < 0.5, 4 * t ** 3, 1 - (-2 * t + 2) ** 3 / 2),
    "ease_in_out_sine": lambda t: -(np.cos(np.pi * t) - 1) / 2,
}


def classify_easing(progress: np.ndarray) -> dict:
    """progress: samples of normalised progress 0..1 at uniform times incl. both endpoints."""
    p = np.asarray(progress, float)
    n = len(p)
    if n < 3:
        return {"easing": "instant", "t50": 0.0, "rms": 0.0, "overshoot_pct": 0.0}
    t = np.linspace(0, 1, n)
    overshoot = max(0.0, float(p.max() - 1.0)) * 100
    pc = np.clip(p, 0, 1)
    best, best_err = None, 1e9
    errs = {}
    for name, f in EASINGS.items():
        e = float(np.sqrt(np.mean((pc - f(t)) ** 2)))
        errs[name] = round(e, 4)
        if e < best_err:
            best, best_err = name, e
    # time at which 50 % of the move is done (linear interpolation)
    t50 = float(np.interp(0.5, np.maximum.accumulate(pc), t)) if pc[-1] > 0.5 else float("nan")
    name = best
    if overshoot > 2.0:
        name = "spring_overshoot"
    return {"easing": name, "t50": round(t50, 3), "rms": round(best_err, 4), "overshoot_pct": round(overshoot, 2),
            "fit_rms": errs}


def _local_median(x: np.ndarray, i: int, r: int = 8, excl: int = 1) -> float:
    lo, hi = max(0, i - r), min(len(x), i + r + 1)
    vals = np.concatenate([x[lo:max(lo, i - excl)], x[min(hi, i + excl + 1):hi]])
    return float(np.median(vals)) if vals.size else 0.0


def detect_hard_cuts(F: dict, MP: dict) -> list[dict]:
    n = F["n"]
    T, Hs = F["thumbs"], F["hists"]
    mcd, area, mad = F["mcd"], F["area"], F["mad"]
    ok, inl = F["ok"], F["inl"]
    fps = F["fps"]
    ss = np.ones(n)
    hd = np.zeros(n)
    for i in range(1, n):
        ss[i] = ssim(T[i - 1], T[i])
        hd[i] = bhattacharyya(Hs[i - 1], Hs[i])
    F["ss"], F["hd"] = ss, hd
    adl = np.abs(MP["dlogs"])
    tr = np.hypot(MP["dx"], MP["dy"])
    cuts = []
    for i in range(1, n):
        base = _local_median(mcd, i)
        base_hd = _local_median(hd, i)
        nbm = max(mcd[i - 1] if i - 1 >= 1 else 0.0, mcd[i + 1] if i + 1 < n else 0.0)
        spike = mcd[i] > 3 * base + 0.02 and mcd[i] > 2.0 * nbm
        typ = None
        info = {}
        if spike and mcd[i] > 0.04 and area[i] > 0.3 and (ss[i] < 0.55 or hd[i] > max(0.35, 2 * base_hd)):
            typ = "cut"
        elif (ss[i] < 0.4 or hd[i] > 0.45) and area[i] > 0.5 and mcd[i] > 0.05 and mcd[i] > 3 * base + 0.02:
            typ = "cut"  # strong change that is not isolated (fast montage)
        elif ok[i] and inl[i] > 0.5:
            nb = np.concatenate([adl[max(1, i - 4):i], adl[i + 1:i + 5]])
            nbt = np.concatenate([tr[max(1, i - 4):i], tr[i + 1:i + 5]])
            if adl[i] > 0.035 and (nb.size == 0 or np.median(nb) < 0.006) and adl[i] > 5 * (np.max(nb) if nb.size else 0):
                typ = "zoom_cut"
                info = {"scale_ratio": round(float(math.exp(MP["dlogs"][i])), 4)}
            elif tr[i] > 25 and (nbt.size == 0 or np.median(nbt) < 4) and tr[i] > 5 * (np.max(nbt) if nbt.size else 0):
                typ = "reframe_cut"
                info = {"shift_px1080": round(float(tr[i]), 1)}
        if typ is None:
            if (mcd[i] > 0.02 and mcd[i] > 4 * base + 0.008 and mcd[i] > 2.5 * nbm and area[i] > 0.12
                    and ss[i] < _local_median(ss, i) - 0.08):
                typ = "jump_cut"
        if typ:
            d = {"type": typ, "frame": i, "time_s": round(i / fps, 4), "dur_frames": 0, "ssim": round(float(ss[i]), 3),
                 "hist_d": round(float(hd[i]), 3), "mcd": round(float(mcd[i]), 4), "area": round(float(area[i]), 3)}
            d.update(info)
            cuts.append(d)
    # runs of >= 3 single-frame "cuts" are a glitch/whip-like transition, not 3 shots
    out, i = [], 0
    while i < len(cuts):
        j = i
        while j + 1 < len(cuts) and cuts[j + 1]["frame"] - cuts[j]["frame"] == 1:
            j += 1
        if j - i + 1 >= 3:
            a, b = cuts[i]["frame"], cuts[j]["frame"]
            blur = F["sharp"][a:b].min() / max(1e-6, min(F["sharp"][max(0, a - 3):a].mean(), F["sharp"][b + 1:b + 4].mean() if b + 1 < n else 1e9))
            out.append({"type": "whip" if blur < 0.35 else "glitch", "frame": a, "end_frame": b - 1, "time_s": round(a / fps, 4),
                        "dur_frames": b - a, "dur_f30": round((b - a) * 30.0 / fps, 2), "dur_s": round((b - a) / fps, 3),
                        "from_cut_run": True})
        else:
            out.extend(cuts[i:j + 1])
        i = j + 1
    cuts = out
    return cuts


# ---------------------------------------------------------------- soft transitions

def _compose(Ms: np.ndarray, a: int, b: int, okv: np.ndarray) -> tuple[np.ndarray, bool]:
    """Compose per-frame transforms for frames a..b (transform of frame j maps j-1 -> j)."""
    M = np.eye(3)
    allok = True
    for j in range(a, b + 1):
        if not okv[j]:
            allok = False
        Mj = np.vstack([Ms[j], [0, 0, 1]])
        M = Mj @ M
    return M[:2], allok


def _chain_explained(F: dict, s: int, e: int) -> float:
    """SSIM between frame s-1 warped through the motion chain and frame e (1 = fully explained)."""
    T = F["thumbs"]
    M, allok = _compose(F["M"], s, e, F["ok"])
    if not allok:
        return 0.0
    k = F["TW"] / F["W"]
    Mt = M.copy()
    Mt[:, 2] *= k
    h, w = T[0].shape
    wp = cv2.warpAffine(T[s - 1], Mt, (w, h), flags=cv2.INTER_LINEAR, borderValue=0)
    valid = cv2.warpAffine(np.ones((h, w), np.uint8), Mt, (w, h), flags=cv2.INTER_NEAREST, borderValue=0).astype(bool)
    if valid.mean() < 0.4:
        return 0.0
    return ssim(wp, T[e], valid)


def _progress(T, lo, hi, A, B):
    dA = np.array([1 - ssim(T[j], A) for j in range(lo, hi + 1)])
    dB = np.array([1 - ssim(T[j], B) for j in range(lo, hi + 1)])
    return dA / np.maximum(dA + dB, 1e-6)


def _alpha_fit(T, s, e, A, B):
    a = A.astype(np.float32).ravel()
    b = B.astype(np.float32).ravel()
    ba = b - a
    nrm = float(ba @ ba)
    if nrm < 1e-3:
        return None, None
    alphas, res = [], []
    for j in range(s, e + 1):
        f = T[j].astype(np.float32).ravel()
        al = float((f - a) @ ba / nrm)
        r = f - (a + al * ba)
        alphas.append(al)
        res.append(float(np.sqrt(np.mean(r * r)) / np.sqrt(nrm / a.size)))
    return np.array(alphas), np.array(res)


def _pair_err(Fj: np.ndarray, X: np.ndarray, axis: int) -> np.ndarray:
    """E[i, k] = sum |Fj line i - X line k| over the other axis (lines = columns if axis=1)."""
    if axis == 1:
        f, x = Fj.T, X.T  # (W, H)
    else:
        f, x = Fj, X      # (H, W)
    return np.abs(f[:, None, :] - x[None, :, :]).sum(axis=2)


def _composite_search(T, s, e, A, B):
    """Fit each window frame as a strip composite of outgoing A and incoming B.
    Modes: push (A moves with B), slide (A static), parallax (A moves 0.28x), wipe (no motion).
    Returns per frame (mean abs error, (direction, mode), d_px, d_frac)."""
    h, w = A.shape
    Af, Bf = A.astype(np.float32), B.astype(np.float32)
    out = []
    for j in range(s, e + 1):
        Fj = T[j].astype(np.float32)
        best = (1e9, None, 0, 0.0)
        for axis, L in ((1, w), (0, h)):
            EB = _pair_err(Fj, Bf, axis)
            EA = _pair_err(Fj, Af, axis)
            for d in range(2, L - 1):
                for mode in ("push", "slide", "parallax", "wipe"):
                    sA = {"push": d, "slide": 0, "wipe": 0, "parallax": int(round(0.28 * d))}[mode]
                    # incoming from the far side (content moves toward index 0: "left"/"up")
                    if mode == "wipe":
                        eb = np.diagonal(EB)[L - d:].sum()
                        ea = np.diagonal(EA)[:L - d].sum()
                    else:
                        eb = np.diagonal(EB, offset=-(L - d)).sum()
                        ea = np.diagonal(EA, offset=sA)[:L - d].sum()
                    err = (eb + ea) / (h * w)
                    if err < best[0]:
                        best = (err, ("left" if axis == 1 else "up", mode), d, d / L)
                    # incoming from the near side (content moves toward the far side: "right"/"down")
                    if mode == "wipe":
                        eb = np.diagonal(EB)[:d].sum()
                        ea = np.diagonal(EA)[d:].sum()
                    else:
                        eb = np.diagonal(EB, offset=(L - d)).sum()
                        ea = np.diagonal(EA, offset=-sA)[d - sA:L - sA].sum()
                    err = (eb + ea) / (h * w)
                    if err < best[0]:
                        best = (err, ("right" if axis == 1 else "down", mode), d, d / L)
        out.append(best)
    return out


def detect_soft_transitions(F: dict, MP: dict, hard: list[dict]) -> list[dict]:
    n = F["n"]
    T = F["thumbs"]
    fps = F["fps"]
    luma, sharp = F["luma"], F["sharp"]
    hard_frames = {c["frame"] for c in hard}
    cands = []
    for k in (3, 6, 12):
        D = np.zeros(n)
        for i in range(k, n - k):
            D[i] = 1 - ssim(T[i - k], T[i + k])
        for i in range(k + 1, n - k - 1):
            if D[i] < 0.35 or D[i] < D[i - 1] or D[i] < D[i + 1]:
                continue
            if any(abs(i - hf) <= k for hf in hard_frames):
                # a hard cut sits inside the window: only keep if it is not just that cut
                continue
            cands.append((i, k, D[i]))
    cands.sort(key=lambda c: -c[2])
    taken = np.zeros(n, bool)
    trans = []
    for c, k, dval in cands:
        if taken[max(0, c - 2):c + 3].any():
            continue
        K = max(2 * k, 8)
        lo, hi = max(1, c - K), min(n - 2, c + K)
        # do not straddle hard cuts
        for hf in sorted(hard_frames):
            if lo < hf <= c:
                lo = hf
            if c < hf <= hi:
                hi = hf - 1
        if hi - lo < 3:
            continue
        p = _progress(T, lo, hi, T[lo], T[hi])
        idx = np.arange(lo, hi + 1)
        above = idx[p > 0.1]
        below = idx[p < 0.9]
        if above.size == 0 or below.size == 0:
            continue
        s, e = int(above[0]), int(below[-1])
        if e < s:
            s, e = e, s
        s = max(s, 1)
        e = min(e, n - 2)
        if e - s + 1 < 2 or taken[s:e + 1].any():
            continue
        A, B = T[s - 1], T[e + 1]
        across = 1 - ssim(A, B)
        if across < 0.3:
            continue
        lm = luma[s:e + 1]
        lA, lB = luma[s - 1], luma[e + 1]
        typ, info = None, {}
        if lm.min() < 22 and lm.min() < 0.45 * min(lA, lB) and F["lstd"][s + int(np.argmin(lm))] < 12:
            typ = "fade_black"
        elif lm.max() > 205 and lm.max() > max(lA, lB) + 30:
            typ = "flash" if e - s + 1 <= 4 else "fade_white"
        if typ is None:
            chain = _chain_explained(F, s, e + 1)
            if chain > 0.72:
                continue  # camera move inside a shot, not a transition
            info["chain_ssim"] = round(chain, 3)
            shp = sharp[s:e + 1]
            base_sharp = min(sharp[max(0, s - 4):s].mean(), sharp[e + 1:e + 5].mean())
            if base_sharp > 0 and shp.min() < 0.35 * base_sharp:
                typ = "whip"
                an = np.log((F["gx2"][s:e + 1] + 1) / (F["gy2"][s:e + 1] + 1))
                an0 = np.log((F["gx2"][s - 1] + 1) / (F["gy2"][s - 1] + 1))
                info["blur_axis"] = "horizontal" if (an.min() - an0) < -(an.max() - an0) else "vertical"
                info["min_sharp_ratio"] = round(float(shp.min() / base_sharp), 3)
        if typ is None:
            comp = _composite_search(T, s, e, A, B)
            errs = np.array([c_[0] for c_ in comp])
            al, res = _alpha_fit(T, s, e, A, B)
            mix_err = []
            for jj, j in enumerate(range(s, e + 1)):
                if al is None:
                    mix_err.append(1e9)
                    continue
                pred = (1 - al[jj]) * A.astype(np.float32) + al[jj] * B.astype(np.float32)
                mix_err.append(float(np.abs(T[j].astype(np.float32) - pred).mean()))
            mix_err = np.array(mix_err)
            modes = [c_[1] for c_ in comp]
            dvals = np.array([c_[3] for c_ in comp])
            comp_better = (errs < 0.75 * mix_err) & (errs < 14)
            if comp_better.mean() >= 0.6:
                from collections import Counter
                (direction, mode), _ = Counter([m for m, b in zip(modes, comp_better) if b]).most_common(1)[0]
                mono = np.all(np.diff(dvals[comp_better]) >= -0.03) if comp_better.sum() > 1 else True
                if mono:
                    typ = "wipe" if mode == "wipe" else ("push" if mode in ("push", "parallax") else "slide")
                    info.update({"direction": direction, "mode": mode,
                                 "position_curve": [round(float(x), 3) for x in dvals],
                                 **classify_easing(np.concatenate([[0], dvals, [1]]))})
            if typ is None:
                sc = MP["dlogs"][s:e + 2]
                if np.abs(sc).sum() > 0.08 and F["ok"][s:e + 2].mean() > 0.5:
                    typ = "zoom"
                    info["scale_total"] = round(float(math.exp(sc.sum())), 3)
                elif al is not None and np.median(res) < 0.45 and np.corrcoef(np.arange(len(al)), al)[0, 1] > 0.9 \
                        if al is not None and len(al) > 2 else False:
                    typ = "dissolve"
                    info["alpha_curve"] = [round(float(x), 3) for x in al]
                    info.update(classify_easing(np.concatenate([[0], np.clip(al, 0, 1.2), [1]])))
                elif al is not None and len(al) <= 2 and np.median(res) < 0.45:
                    typ = "dissolve"
                    info["alpha_curve"] = [round(float(x), 3) for x in al]
                else:
                    typ = "other"
        dur = e - s + 1
        taken[s:e + 1] = True
        trans.append({"type": typ, "frame": s, "end_frame": e, "time_s": round(s / fps, 4),
                      "mid_s": round((s + e + 1) / 2 / fps, 4), "dur_frames": dur,
                      "dur_f30": round(dur * 30.0 / fps, 2), "dur_s": round(dur / fps, 3),
                      "across_d": round(float(across), 3), **info})
    trans.sort(key=lambda t: t["frame"])
    return trans


def merge_boundaries(hard: list[dict], soft: list[dict], F: dict) -> list[dict]:
    """Merge cuts that form a flash (A | white | B) and order everything."""
    fps = F["fps"]
    luma = F["luma"]
    out = []
    hard = sorted(hard, key=lambda c: c["frame"])
    skip = set()
    for a_i, a in enumerate(hard):
        if a_i in skip:
            continue
        # flash: two cuts 1-3 frames apart with bright frames between
        if a_i + 1 < len(hard):
            b = hard[a_i + 1]
            gap = b["frame"] - a["frame"]
            if 1 <= gap <= 3:
                mid = luma[a["frame"]:b["frame"]]
                around = max(luma[a["frame"] - 1], luma[min(len(luma) - 1, b["frame"])])
                if mid.size and mid.mean() > 200 and mid.mean() > around + 30:
                    out.append({"type": "flash", "frame": a["frame"], "end_frame": b["frame"] - 1,
                                "time_s": round(a["frame"] / fps, 4), "dur_frames": gap,
                                "dur_f30": round(gap * 30.0 / fps, 2), "dur_s": round(gap / fps, 3)})
                    skip.add(a_i + 1)
                    continue
                if mid.size and mid.mean() < 20 and mid.mean() < around - 30:
                    out.append({"type": "dip_black", "frame": a["frame"], "end_frame": b["frame"] - 1,
                                "time_s": round(a["frame"] / fps, 4), "dur_frames": gap,
                                "dur_f30": round(gap * 30.0 / fps, 2), "dur_s": round(gap / fps, 3)})
                    skip.add(a_i + 1)
                    continue
        out.append(a)
    for s in soft:
        if not any(s["frame"] - 1 <= o["frame"] <= s["end_frame"] + 1 for o in out):
            out.append(s)
    out.sort(key=lambda d: d["frame"])
    return out


def video_start_fade(F: dict) -> dict | None:
    """Fade-in from black at the very start (e.g. Stronger's looper)."""
    luma = F["luma"]
    fps = F["fps"]
    if len(luma) < 10 or luma[0] > 25:
        return None
    ref = np.median(luma[: int(4 * fps)][-int(fps):]) if len(luma) > 4 * fps else luma.max()
    if ref < 40:
        return None
    above = np.flatnonzero(luma >= 0.9 * ref)
    if above.size == 0:
        return None
    e = int(above[0])
    return {"type": "fade_in_from_black", "frame": 0, "end_frame": e, "dur_frames": e + 1,
            "dur_s": round((e + 1) / fps, 3), "dur_f30": round((e + 1) * 30 / fps, 2)}
