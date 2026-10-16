"""Camera motion inside shots: punch-ins, slow zooms (Ken Burns), pans, shakes,
hand-held micro-motion, speed ramps.

Per-frame similarity (scale s, rotation, centre translation) comes from features.py.
Within each shot the per-frame values are integrated into a trajectory:
  L(t) = sum log s   (cumulative log-scale)     X(t), Y(t) = sum centre dx, dy (px @1080w)
Units: zoom rates in %/s, translations in px at 1080w, frequencies in Hz,
durations in frames at the analysis fps and at 30 fps (f30).

Punch-in timing is reported as the AUTHORED animation: the easing family, start t0 and
duration D (frames) that best reproduce the measured linear-scale progress
(scale(t) = s0 + (s1-s0) * f((t-t0)/D), the way CSS/Remotion interpolate). Moves that
overshoot are also fitted with a damped spring (zeta, omega) and mapped to a Remotion
spring config with mass = 1 (stiffness = omega^2, damping = 2*zeta*omega).
"""
from __future__ import annotations

import math

import numpy as np
from scipy.ndimage import uniform_filter1d

from cuts import EASINGS

FAST_RATE = 0.004      # |dlog s| per frame that counts as a "fast" zoom frame (0.4 %/frame)
MIN_PUNCH = math.log(1.03)


def shots_from_boundaries(n: int, boundaries: list[dict]) -> list[tuple[int, int]]:
    shots = []
    start = 0
    for b in sorted(boundaries, key=lambda d: d["frame"]):
        f = b["frame"]
        soft = b.get("dur_frames", 0) > 0
        e = b.get("end_frame", f) if soft else f - 1
        if f - 1 >= start:
            shots.append((start, f - 1))
        start = (e + 1) if soft else f
    if start <= n - 1:
        shots.append((start, n - 1))
    return [s for s in shots if s[1] >= s[0]]


def _runs(mask: np.ndarray, max_gap: int = 1) -> list[tuple[int, int]]:
    idx = np.flatnonzero(mask)
    if idx.size == 0:
        return []
    runs = []
    a = b = int(idx[0])
    for i in idx[1:]:
        i = int(i)
        if i - b <= max_gap + 1:
            b = i
        else:
            runs.append((a, b))
            a = b = i
    runs.append((a, b))
    return runs


def _linfit(y: np.ndarray) -> tuple[float, float]:
    x = np.arange(len(y), dtype=float)
    if len(y) < 3:
        return 0.0, 0.0
    A = np.vstack([x, np.ones_like(x)]).T
    coef, *_ = np.linalg.lstsq(A, y, rcond=None)
    pred = A @ coef
    ss_tot = float(((y - y.mean()) ** 2).sum())
    r2 = 1 - float(((y - pred) ** 2).sum()) / ss_tot if ss_tot > 1e-12 else 0.0
    return float(coef[0]), r2


def _spring_resp(tau: np.ndarray, zeta: float, omega: float) -> np.ndarray:
    tau = np.maximum(tau, 0)
    if zeta < 1:
        wd = omega * math.sqrt(1 - zeta ** 2)
        return 1 - np.exp(-zeta * omega * tau) * (np.cos(wd * tau) + zeta * omega / wd * np.sin(wd * tau))
    return 1 - np.exp(-omega * tau) * (1 + omega * tau)


def fit_authored(p: np.ndarray, j: np.ndarray, s_guess: float, n_guess: float, fps: float) -> dict:
    """Fit progress samples p at frame positions j with easing families (t0, D) and a spring."""
    best = {"rms": 1e9}
    t0s = np.arange(s_guess - 2.0, s_guess + 1.01, 0.25)
    Ds = np.arange(max(1.0, n_guess - 2), n_guess + 8.01, 0.25)
    for name, f in EASINGS.items():
        for t0 in t0s:
            u = (j[None, :] - t0) / Ds[:, None]
            pred = f(np.clip(u, 0, 1))
            err = np.sqrt(((pred - p[None, :]) ** 2).mean(axis=1))
            k = int(np.argmin(err))
            if err[k] < best["rms"]:
                best = {"rms": float(err[k]), "easing": name, "t0": float(t0), "D": float(Ds[k])}
    f = EASINGS[best["easing"]]
    tt = np.linspace(0, 1, 2001)
    yy = f(tt)
    best["t50"] = float(tt[np.argmax(yy >= 0.5)])
    out = {"easing_fit": best["easing"], "authored_dur_frames": round(best["D"], 2),
           "authored_dur_f30": round(best["D"] * 30.0 / fps, 2), "authored_start_frame": round(best["t0"], 2),
           "t50": round(best["t50"], 3), "fit_rms": round(best["rms"], 4)}
    # spring fit (vectorised over omega)
    sb = {"rms": 1e9}
    omegas = np.arange(4.0, 80.0, 1.0)
    for zeta in np.arange(0.2, 0.999, 0.025):
        wd = omegas * math.sqrt(1 - zeta ** 2)
        for t0 in np.arange(s_guess - 1.5, s_guess + 0.51, 0.25):
            tau = np.maximum((j - t0) / fps, 0)[None, :]
            pred = 1 - np.exp(-zeta * omegas[:, None] * tau) * (np.cos(wd[:, None] * tau) + (zeta * omegas / wd)[:, None] * np.sin(wd[:, None] * tau))
            err = np.sqrt(((pred - p[None, :]) ** 2).mean(axis=1))
            k = int(np.argmin(err))
            if err[k] < sb["rms"]:
                sb = {"rms": float(err[k]), "zeta": float(zeta), "omega": float(omegas[k]), "t0": float(t0)}
    out["spring_fit"] = {"zeta": round(sb["zeta"], 3), "omega_rad_s": round(sb["omega"], 2), "rms": round(sb["rms"], 4),
                         "remotion_mass1": {"mass": 1, "stiffness": round(sb["omega"] ** 2, 1),
                                            "damping": round(2 * sb["zeta"] * sb["omega"], 2)},
                         "overshoot_pct_model": round(100 * math.exp(-sb["zeta"] * math.pi / math.sqrt(1 - sb["zeta"] ** 2)), 2)
                         if sb["zeta"] < 1 else 0.0}
    return out


def analyze_shot(F: dict, MP: dict, a: int, b: int) -> dict:
    fps = F["fps"]
    k30 = 30.0 / fps
    ok = F["ok"]
    idx = np.arange(a + 1, b + 1)  # motion of frame j is (j-1 -> j)
    res = {"punches": [], "slow_zooms": [], "pans": [], "shakes": [], "ramps": [], "handheld": None}
    if idx.size < 3:
        return res
    v_ok = ok[idx]
    l = np.where(v_ok, MP["dlogs"][idx], 0.0)
    x = np.where(v_ok, MP["dx"][idx], 0.0)
    y = np.where(v_ok, MP["dy"][idx], 0.0)
    r = np.where(v_ok, MP["rot"][idx], 0.0)
    bad = (np.abs(l) > 0.25) | (np.hypot(x, y) > 400)
    l[bad] = 0; x[bad] = 0; y[bad] = 0; r[bad] = 0
    # trajectories indexed by frame offset from a (0..len(idx))
    L = np.concatenate([[0], np.cumsum(l)])
    X = np.concatenate([[0], np.cumsum(x)])
    Y = np.concatenate([[0], np.cumsum(y)])
    R = np.concatenate([[0], np.cumsum(r)])
    nT = len(L)

    # ---------------- punch-ins / punch-outs (fast zooms)
    fast = np.abs(l) > FAST_RATE
    used = np.zeros(len(l), bool)          # per motion step
    for s, e in _runs(fast, 1):
        seg = l[s:e + 1]
        sign = np.sign(seg.sum())
        if sign == 0:
            continue
        peak = np.abs(seg).max()
        thr = max(0.0012, 0.12 * peak)
        while s - 1 >= 0 and np.sign(l[s - 1]) == sign and abs(l[s - 1]) > thr and not used[s - 1]:
            s -= 1
        while e + 1 < len(l) and np.sign(l[e + 1]) == sign and abs(l[e + 1]) > thr:
            e += 1
        if abs(l[s:e + 1].sum()) < MIN_PUNCH or peak < 0.006:
            continue
        # trajectory points: step k moves T[k] -> T[k+1]; move spans T[s] .. T[e+1]
        L0 = float(np.median(L[max(0, s - 2):s + 1]))
        hold_end = min(nT - 1, e + 1 + 12)
        nxt_fast = np.flatnonzero(fast[e + 1:])
        if nxt_fast.size:
            hold_end = min(hold_end, e + 1 + int(nxt_fast[0]))
        tail = L[e + 1:hold_end + 1]
        win_end = min(nT - 1, e + 1 + 8)
        if sign > 0:
            Lp = float(L[s:win_end + 1].max())
        else:
            Lp = float(L[s:win_end + 1].min())
        Lf = float(np.median(tail[len(tail) // 2:])) if tail.size >= 4 else float(L[e + 1])
        if abs(Lf - L0) < 1e-4:
            Lf = float(L[e + 1])
        ov = max(0.0, (Lp - Lf) / (Lf - L0) * 100) if abs(Lf - L0) > 1e-6 else 0.0
        steps = e - s + 1
        used[s:e + 1] = True
        # extend 'used' over an overshoot settle
        if ov > 1.5:
            used[e + 1:min(len(used), e + 9)] = True
        jj = np.arange(max(0, s - 3), min(nT, e + 1 + 10))
        sc = np.exp(L[jj] - L0)
        p = (sc - 1) / (math.exp(Lf - L0) - 1)
        fit = fit_authored(p, jj.astype(float), float(s), float(steps), fps)
        fit["authored_start_frame"] = round(fit["authored_start_frame"] + a, 2)
        f0 = a + s
        fx = MP["fx"][idx[s:e + 1]]
        fy = MP["fy"][idx[s:e + 1]]
        mag = math.exp(Lf - L0)
        res["punches"].append({
            "start_frame": int(f0), "end_frame": int(a + e + 1), "time_s": round(f0 / fps, 3),
            "direction": "in" if sign > 0 else "out",
            "magnitude": round(mag, 4), "pct": round((mag - 1) * 100, 2),
            "peak_magnitude": round(math.exp(Lp - L0), 4),
            "overshoot_pct": round(ov, 2),
            "dur_frames": int(steps), "dur_f30": round(steps * k30, 2), "dur_s": round(steps / fps, 3),
            "peak_rate_pct_per_frame": round(float((math.exp(peak) - 1) * 100), 3),
            "focus_x": round(float(np.nanmedian(fx)), 3) if np.isfinite(fx).any() else None,
            "focus_y": round(float(np.nanmedian(fy)), 3) if np.isfinite(fy).any() else None,
            "rot_deg": round(float(r[s:e + 1].sum()), 3),
            "progress": [round(float(v), 3) for v in p],
            "progress_frames": [int(a + v) for v in jj],
            **fit,
            "easing": "spring_overshoot" if ov > 2.0 else fit["easing_fit"],
        })
    P = res["punches"]
    for i, q in enumerate(P):
        nxt = next((u for u in P[i + 1:] if u["direction"] != q["direction"]), None)
        end = nxt["start_frame"] if nxt else b
        q["hold_frames_after"] = int(end - q["end_frame"])
        q["hold_s_after"] = round((end - q["end_frame"]) / fps, 3)
        q["returns"] = bool(nxt)

    # ---------------- slow zooms (Ken Burns): rolling 1 s linear fits of L on non-punch frames
    win = max(12, int(round(fps)))
    lz = np.where(used, 0.0, l)
    Lz = np.concatenate([[0], np.cumsum(lz)])
    if len(Lz) > win:
        cover = np.zeros(len(Lz), bool)
        for i in range(0, len(Lz) - win + 1):
            sl, rr = _linfit(Lz[i:i + win])
            if abs(sl) > 0.00035 and rr > 0.8:
                cover[i:i + win] = True
        for s, e in _runs(cover, 2):
            if e - s + 1 < int(0.8 * fps):
                continue
            sl, rr = _linfit(Lz[s:e + 1])
            if abs(sl) < 0.00035 or rr < 0.8:
                continue
            rate = (math.exp(sl * fps) - 1) * 100
            res["slow_zooms"].append({
                "start_frame": int(a + s), "end_frame": int(a + e), "time_s": round((a + s) / fps, 3),
                "dur_s": round((e - s) / fps, 3), "rate_pct_per_s": round(rate, 3),
                "total": round(float(math.exp(Lz[e] - Lz[s])), 4), "r2": round(rr, 3),
            })

    # ---------------- pans (sustained translation), px/s @1080w
    xs = np.where(used, 0, x)
    ys = np.where(used, 0, y)
    spd = np.hypot(xs, ys) * fps  # per-step speed
    if len(spd) > win:
        sm = uniform_filter1d(spd, size=max(5, win // 3), mode="nearest")
        for s, e in _runs(sm > 45, 2):
            seg = spd[s:e + 1]
            med = float(np.median(seg))
            # trim slow ends (smoothing widens segments)
            while s < e and spd[s] < 0.3 * med:
                s += 1
            while e > s and spd[e] < 0.3 * med:
                e -= 1
            if e - s + 1 < int(0.5 * fps):
                continue
            ddx, ddy = float(xs[s:e + 1].sum()), float(ys[s:e + 1].sum())
            dist = math.hypot(ddx, ddy)
            T = (e - s + 1) / fps
            # direction consistency: net distance vs path length
            path = float(np.hypot(xs[s:e + 1], ys[s:e + 1]).sum())
            if dist / T < 40 or dist < 0.6 * path:
                continue
            ang = math.degrees(math.atan2(ddy, ddx))
            res["pans"].append({
                "start_frame": int(a + s), "end_frame": int(a + e + 1), "time_s": round((a + s) / fps, 3),
                "dur_s": round(T, 3), "speed_px_s": round(dist / T, 1), "peak_speed_px_s": round(float(seg.max()), 1),
                "dist_px": round(dist, 1), "angle_deg": round(ang, 1),
                "axis": "horizontal" if abs(ddx) > 2 * abs(ddy) else ("vertical" if abs(ddy) > 2 * abs(ddx) else "diagonal"),
            })
    pan_steps = np.zeros(len(l), bool)
    for pn in res["pans"]:
        pan_steps[max(0, pn["start_frame"] - a - 1):pn["end_frame"] - a] = True

    # ---------------- shakes: detect on a 9-frame high-pass, measure against the rest pose
    hp_w = 9 if fps >= 24 else 7
    Xh = X - uniform_filter1d(X, size=hp_w, mode="nearest")
    Yh = Y - uniform_filter1d(Y, size=hp_w, mode="nearest")
    mag = np.hypot(Xh, Yh)
    for s, e in _runs(mag > 2.0, 2):
        if e - s + 1 < 3:
            continue
        s0, e0 = max(0, s - 2), min(nT - 1, e + 2)
        vxs, vys = np.diff(X[s0:e0 + 1]), np.diff(Y[s0:e0 + 1])
        main_v = vxs if np.abs(vxs).sum() >= np.abs(vys).sum() else vys
        signs = np.sign(main_v[np.abs(main_v) > 0.5])
        flips = int((np.diff(signs) != 0).sum()) if signs.size > 1 else 0
        if flips < 2:
            continue  # smooth move, not a shake
        if used[max(0, s0 - 1):min(len(used), e0 + 1)].any():
            continue
        # rest pose: linear between the medians before and after the burst
        pre = slice(max(0, s0 - 4), s0 + 1)
        post = slice(e0, min(nT, e0 + 5))
        bx0, bx1 = np.median(X[pre]), np.median(X[post])
        by0, by1 = np.median(Y[pre]), np.median(Y[post])
        br0, br1 = np.median(R[pre]), np.median(R[post])
        tt = np.linspace(0, 1, e0 - s0 + 1)
        dxs = X[s0:e0 + 1] - (bx0 + (bx1 - bx0) * tt)
        dys = Y[s0:e0 + 1] - (by0 + (by1 - by0) * tt)
        drs = R[s0:e0 + 1] - (br0 + (br1 - br0) * tt)
        dm = np.hypot(dxs, dys)
        active = np.flatnonzero(dm > 1.0)
        if active.size:
            s1, e1 = s0 + int(active[0]), s0 + int(active[-1])
        else:
            s1, e1 = s0, e0
        dom = dxs if np.abs(dxs).max() >= np.abs(dys).max() else dys
        ext = [i for i in range(1, len(dom) - 1) if (dom[i] - dom[i - 1]) * (dom[i + 1] - dom[i]) < 0 and abs(dom[i]) > 0.8]
        freq = None
        if len(ext) >= 2:
            half = float(np.mean(np.diff(ext)))
            freq = fps / (2 * half) if half > 0 else None
        tau = decay_ratio = None
        if len(ext) >= 3:
            pa = np.abs(dom[ext])
            t_ = np.array(ext, float)
            sl, _ = np.polyfit(t_, np.log(pa), 1)
            if sl < 0:
                tau = -1.0 / sl
            decay_ratio = float(pa[-1] / pa[0])
        dur = e1 - s1 + 1
        res["shakes"].append({
            "start_frame": int(a + s1), "end_frame": int(a + e1), "time_s": round((a + s1) / fps, 3),
            "dur_frames": int(dur), "dur_f30": round(dur * k30, 2),
            "amp_peak_px": round(float(dm.max()), 2),
            "amp_rms_px": round(float(np.sqrt((dm[max(0, s1 - s0):e1 - s0 + 1] ** 2).mean())), 2),
            "amp_x_px": round(float(np.abs(dxs).max()), 2), "amp_y_px": round(float(np.abs(dys).max()), 2),
            "rot_peak_deg": round(float(np.abs(drs).max()), 3),
            "freq_hz": round(freq, 2) if freq else None,
            "direction_flips": flips,
            "decay_tau_frames": round(tau, 2) if tau else None,
            "decay_tau_f30": round(tau * k30, 2) if tau else None,
            "decay_ratio_last_first": round(decay_ratio, 3) if decay_ratio is not None else None,
        })
    shake_steps = np.zeros(len(l), bool)
    for sh in res["shakes"]:
        shake_steps[max(0, sh["start_frame"] - a - 1):sh["end_frame"] - a] = True

    # ---------------- hand-held micro-motion: 0.3-3 Hz band RMS, only on shots without deliberate moves
    clean = not used.any() and not pan_steps.any() and not res["slow_zooms"]
    if len(X) >= int(1.5 * fps) and clean:
        lo_w = max(3, int(round(fps / 3)))
        hi_w = max(lo_w + 2, int(round(3 * fps)))
        bx = uniform_filter1d(X, lo_w, mode="nearest") - uniform_filter1d(X, hi_w, mode="nearest")
        by = uniform_filter1d(Y, lo_w, mode="nearest") - uniform_filter1d(Y, hi_w, mode="nearest")
        br = uniform_filter1d(R, lo_w, mode="nearest") - uniform_filter1d(R, hi_w, mode="nearest")
        m = ~np.concatenate([[False], shake_steps])
        res["handheld"] = {
            "rms_px": round(float(np.sqrt((bx[m] ** 2 + by[m] ** 2).mean())), 3),
            "rot_rms_deg": round(float(np.sqrt((br[m] ** 2).mean())), 4),
            "dur_s": round(len(X) / fps, 2),
        }

    # ---------------- speed ramps (experimental): steady motion that changes speed >= 2.5x
    cs = F["flow_med"][idx] * F["px1080"] * fps
    if len(cs) > 24:
        for i in range(8, len(cs) - 8):
            bseg, aseg = cs[i - 8:i], cs[i:i + 8]
            mb, ma = bseg.mean(), aseg.mean()
            if min(mb, ma) < 100:
                continue
            if bseg.std() / mb > 0.35 or aseg.std() / ma > 0.35:
                continue
            ratio = ma / mb
            if (ratio > 2.5 or ratio < 0.4) and not (used[i - 8:i + 8].any() or shake_steps[i - 8:i + 8].any()):
                if res["ramps"] and (a + i) - res["ramps"][-1]["frame"] < 12:
                    continue
                res["ramps"].append({"frame": int(a + i), "time_s": round((a + i) / fps, 3), "factor": round(float(ratio), 2),
                                     "speed_before_px_s": round(float(mb), 1), "speed_after_px_s": round(float(ma), 1)})
    return res


def analyze_camera(F: dict, MP: dict, shots: list[tuple[int, int]]) -> dict:
    out = {"punches": [], "slow_zooms": [], "pans": [], "shakes": [], "ramps": [], "handheld": []}
    for a, b in shots:
        r = analyze_shot(F, MP, a, b)
        for k in ("punches", "slow_zooms", "pans", "shakes", "ramps"):
            out[k].extend(r[k])
        if r["handheld"]:
            out["handheld"].append({"shot": [a, b], **r["handheld"]})
    ov = F["overlay"]
    out["static_overlay_frames_pct"] = round(float((ov > 0).mean() * 100), 1) if len(ov) else 0.0
    out["tracking_ok_pct"] = round(float(F["ok"].mean() * 100), 1) if len(F["ok"]) else 0.0
    return out
