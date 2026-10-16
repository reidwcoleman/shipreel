"""Frame strip around the most interesting camera move / transition of an analysed video."""
from __future__ import annotations

import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from common import frames_iter

TILE_W = 200


def _font(sz):
    for p in ("/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/Helvetica.ttc"):
        try:
            return ImageFont.truetype(p, sz)
        except OSError:
            continue
    return ImageFont.load_default()


def pick_event(res: dict) -> dict | None:
    cands = []
    cam = res["camera"]
    for p in cam["punches"]:
        sc = abs(math.log(max(1e-3, p["magnitude"]))) / math.log(1.1) * (1.2 if p["direction"] == "in" else 0.9)
        desc = (f"punch-{p['direction']} x{p['magnitude']:.3f} ({p['pct']:+.1f}%) in {p['dur_f30']:.0f} f@30 "
                f"[{p['easing']}, t50 {p['t50']:.2f}, authored {p['authored_dur_f30']:.1f} f]")
        cands.append((sc, p["start_frame"], p["end_frame"], desc, "punch", p))
    for z in cam["zoom_cuts"]:
        r = z.get("scale_ratio") or 1
        cands.append((abs(math.log(r)) / math.log(1.1) * 0.9, z["frame"] - 1, z["frame"], f"zoom-cut x{r:.3f}", "zoomcut", z))
    for s in cam["shakes"]:
        cands.append((s["amp_peak_px"] / 8.0, s["start_frame"], s["end_frame"],
                      f"shake {s['amp_peak_px']:.1f}px peak, {s.get('freq_hz') or 0:.1f} Hz, {s['dur_f30']:.0f} f@30, rot {s['rot_peak_deg']:.2f} deg",
                      "shake", s))
    for b in res["boundaries"]:
        if b.get("dur_frames", 0) > 0:
            w = {"whip": 1.3, "push": 1.2, "slide": 1.2, "zoom": 1.2, "wipe": 1.0, "dissolve": 0.9, "flash": 1.0,
                 "fade_black": 0.8, "fade_white": 0.9, "dip_black": 0.7, "glitch": 1.0}.get(b["type"], 0.6)
            extra = f" {b.get('direction', '')} {b.get('mode', '')}" if b["type"] in ("push", "slide", "wipe") else ""
            cands.append((w, b["frame"], b.get("end_frame", b["frame"]), f"{b['type']}{extra} transition, {b['dur_f30']:.0f} f@30", "trans", b))
    for pn in cam["pans"]:
        cands.append((min(1.2, pn["speed_px_s"] / 500), pn["start_frame"], min(pn["end_frame"], pn["start_frame"] + 20),
                      f"pan {pn['axis']} {pn['speed_px_s']:.0f} px/s", "pan", pn))
    for z in cam["slow_zooms"]:
        cands.append((min(1.0, abs(z["rate_pct_per_s"]) / 5), z["start_frame"], z["end_frame"],
                      f"slow zoom {z['rate_pct_per_s']:+.1f} %/s over {z['dur_s']:.1f}s", "slowzoom", z))
    if not cands:
        cuts = [b for b in res["boundaries"]]
        if cuts:
            b = cuts[0]
            return {"start": b["frame"] - 2, "end": b["frame"] + 1, "desc": f"first {b['type']} at {b['time_s']:.2f}s", "kind": "cut", "ev": b}
        return None
    cands.sort(key=lambda c: -c[0])
    sc, a, b, desc, kind, ev = cands[0]
    return {"start": a, "end": b, "desc": desc, "kind": kind, "ev": ev}


def save_strip(path: str, res: dict, ctx: dict, out: str, max_tiles: int = 10) -> str | None:
    ev = pick_event(res)
    if ev is None:
        return None
    F = ctx["F"]
    fps = F["fps"]
    a = max(0, int(ev["start"]) - 2)
    b = min(F["n"] - 1, int(ev["end"]) + 2)
    if ev["kind"] == "slowzoom":
        b = min(b, a + int(3 * fps))
    frames_idx = list(range(a, b + 1))
    if len(frames_idx) > max_tiles:
        frames_idx = sorted(set(np.linspace(a, b, max_tiles).round().astype(int).tolist()))
    W, H = F["W"], F["H"]
    tw = TILE_W
    th = int(round(tw * H / W))
    need = frames_idx[-1] - frames_idx[0] + 1
    imgs = {}
    for k, fr in enumerate(frames_iter(path, tw, th, fps, F["fps_filter"], F["crop"], start=frames_idx[0] / fps, nframes=need)):
        imgs[frames_idx[0] + k] = fr
    tiles = [imgs[i] for i in frames_idx if i in imgs]
    if not tiles:
        return None
    MP = ctx["MP"]
    L = np.cumsum(MP["dlogs"][frames_idx[0]:frames_idx[-1] + 1])
    X = np.cumsum(MP["dx"][frames_idx[0]:frames_idx[-1] + 1])
    Y = np.cumsum(MP["dy"][frames_idx[0]:frames_idx[-1] + 1])
    pad, head, foot, plot_h = 6, 44, 30, 110
    Wt = len(tiles) * (tw + pad) + pad
    Ht = head + th + foot + plot_h + pad
    canvas = Image.new("RGB", (Wt, Ht), (16, 16, 18))
    d = ImageDraw.Draw(canvas)
    name = os.path.basename(os.path.dirname(path)) or os.path.basename(path)
    d.text((pad, 4), name, font=_font(16), fill=(235, 235, 235))
    d.text((pad, 23), ev["desc"], font=_font(15), fill=(120, 200, 255))
    for k, (i, t) in enumerate(zip([i for i in frames_idx if i in imgs], tiles)):
        x0 = pad + k * (tw + pad)
        canvas.paste(Image.fromarray(t), (x0, head))
        sc = math.exp(L[i - frames_idx[0]] - L[0]) if len(L) else 1.0
        lab = f"f{i}  {i / fps:.2f}s  x{sc:.3f}"
        d.text((x0 + 2, head + th + 6), lab, font=_font(12), fill=(210, 210, 210))
    # trajectory plot: scale (blue) and translation magnitude (orange)
    py0 = head + th + foot
    d.rectangle([pad, py0, Wt - pad, py0 + plot_h], outline=(60, 60, 66))
    idx = np.arange(frames_idx[0], frames_idx[-1] + 1)
    xs = pad + (idx - frames_idx[0] + 0.5) / max(1, len(idx)) * (Wt - 2 * pad)

    def poly(vals, col, lab, k):
        v = np.asarray(vals, float)
        if v.size < 2 or not np.isfinite(v).all():
            return
        lo, hi = v.min(), v.max()
        if hi - lo < 1e-9:
            hi = lo + 1
        ys = py0 + plot_h - 8 - (v - lo) / (hi - lo) * (plot_h - 16)
        d.line(list(zip(xs.tolist(), ys.tolist())), fill=col, width=2)
        d.text((pad + 4, py0 + 4 + 14 * k), f"{lab} {lo:.3g}..{hi:.3g}", font=_font(11), fill=col)

    poly(np.exp(L - L[0]), (90, 170, 255), "scale", 0)
    poly(np.hypot(X - X[0], Y - Y[0]), (255, 160, 60), "shift px@1080w", 1)
    poly(F["luma"][frames_idx[0]:frames_idx[-1] + 1], (150, 150, 150), "luma", 2)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    canvas.save(out, quality=88)
    return out
