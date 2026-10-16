#!/usr/bin/env python3
"""Experiment: colour-matrix mismatch in Remotion's default export.

Remotion 4.0.535 with colorSpace "default" converts the BGRA frames with swscale's default matrix
(BT.601) and writes NO matrix tag (color_space=unknown). Every HD player and platform transcoder then
assumes BT.709 for a 1080x1920 stream, so saturated colours shift. This script
  1. proves which matrix the shipped file used, by decoding pixels of a known brand-colour area, and
  2. computes the CIEDE2000 error of each brand colour when 601-encoded pixels are decoded as 709
     (what viewers see today) versus colorSpace "bt709" (encode and decode agree).
    python3 -I research/tools/quality/exp_color.py
"""
import json
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import qlib as q  # noqa: E402

KR = {"601": (0.299, 0.114), "709": (0.2126, 0.0722)}


def rgb_to_ycbcr(rgb, m):
    kr, kb = KR[m]
    kg = 1 - kr - kb
    r, g, b = [c / 255 for c in rgb]
    y = kr * r + kg * g + kb * b
    cb = (b - y) / (2 * (1 - kb))
    cr = (r - y) / (2 * (1 - kr))
    return (16 + 219 * y, 128 + 224 * cb, 128 + 224 * cr)


def ycbcr_to_rgb(ycc, m):
    kr, kb = KR[m]
    kg = 1 - kr - kb
    y = (ycc[0] - 16) / 219
    cb = (ycc[1] - 128) / 224
    cr = (ycc[2] - 128) / 224
    r = y + 2 * (1 - kr) * cr
    b = y + 2 * (1 - kb) * cb
    g = (y - kr * r - kb * b) / kg
    return tuple(float(np.clip(c * 255, 0, 255)) for c in (r, g, b))


def srgb_to_lab(rgb):
    c = np.array(rgb, dtype=float) / 255
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    M = np.array([[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.0721750], [0.0193339, 0.1191920, 0.9503041]])
    xyz = M @ c / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return (116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2]))


def de2000(lab1, lab2):
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2
    C1, C2 = np.hypot(a1, b1), np.hypot(a2, b2)
    Cb = (C1 + C2) / 2
    G = 0.5 * (1 - np.sqrt(Cb**7 / (Cb**7 + 25**7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = np.hypot(a1p, b1), np.hypot(a2p, b2)
    h1p, h2p = np.degrees(np.arctan2(b1, a1p)) % 360, np.degrees(np.arctan2(b2, a2p)) % 360
    dLp, dCp = L2 - L1, C2p - C1p
    dh = h2p - h1p
    if C1p * C2p == 0:
        dh = 0
    elif dh > 180:
        dh -= 360
    elif dh < -180:
        dh += 360
    dHp = 2 * np.sqrt(C1p * C2p) * np.sin(np.radians(dh / 2))
    Lbp, Cbp = (L1 + L2) / 2, (C1p + C2p) / 2
    hbp = h1p + h2p
    if C1p * C2p != 0:
        hbp = (h1p + h2p + 360) / 2 if abs(h1p - h2p) > 180 else (h1p + h2p) / 2
    T = 1 - 0.17 * np.cos(np.radians(hbp - 30)) + 0.24 * np.cos(np.radians(2 * hbp)) + 0.32 * np.cos(np.radians(3 * hbp + 6)) - 0.20 * np.cos(np.radians(4 * hbp - 63))
    dth = 30 * np.exp(-(((hbp - 275) / 25) ** 2))
    Rc = 2 * np.sqrt(Cbp**7 / (Cbp**7 + 25**7))
    Sl = 1 + 0.015 * (Lbp - 50) ** 2 / np.sqrt(20 + (Lbp - 50) ** 2)
    Sc, Sh = 1 + 0.045 * Cbp, 1 + 0.015 * Cbp * T
    Rt = -np.sin(np.radians(2 * dth)) * Rc
    return float(np.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh)))


COLORS = {
    "accent #D7FF3A (lime)": "#D7FF3A",
    "bg #0E0F0B": "#0E0F0B",
    "fg #F0F1EC": "#F0F1EC",
    "iOS blue #007AFF (App Store Get)": "#007AFF",
    "success green #34C759": "#34C759",
    "red #FF3B30": "#FF3B30",
    "TikTok red #FE2C55": "#FE2C55",
    "TikTok cyan #25F4EE": "#25F4EE",
    "purple #8B5CF6": "#8B5CF6",
    "orange #FF9500": "#FF9500",
}


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def shipped_pixel_check():
    """Find lime (#D7FF3A) pixels in a master frame, read the same pixels' Y/Cb/Cr from an encode made
    exactly like production, and see which matrix reproduces the colour."""
    import cv2

    frame = 100
    png = os.path.join(q.MASTER, "v_ooybogkhgb", f"element-{frame:03d}.png")
    rgb = cv2.imread(png)[:, :, ::-1].astype(int)
    target = np.array(hex2rgb("#D7FF3A"))
    mask = (np.abs(rgb - target).sum(axis=2) == 0)
    # keep pixels whose 5x5 neighbourhood is all lime, so 4:2:0 chroma is clean
    mask = cv2.erode(mask.astype(np.uint8), np.ones((7, 7), np.uint8)).astype(bool)
    ys, xs = np.nonzero(mask)
    if len(ys) == 0:
        return {"error": "no lime pixels found"}
    out = {}
    for label, path in [("shipped_like (Remotion default, BT.601 untagged)", os.path.join(q.WORK, "emu_v_ooybogkhgb.mp4"))]:
        if not os.path.exists(path):
            continue
        raw = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", path, "-vf", f"select=eq(n\\,{frame})",
                              "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "yuv444p", "-"], capture_output=True).stdout
        a = np.frombuffer(raw, np.uint8).reshape(3, q.H, q.W).astype(float)
        ycc = [float(a[c][ys, xs].mean()) for c in range(3)]
        out[label] = {
            "YCbCr": [round(v, 2) for v in ycc],
            "decoded_as_601": [round(v) for v in ycbcr_to_rgb(ycc, "601")],
            "decoded_as_709": [round(v) for v in ycbcr_to_rgb(ycc, "709")],
            "expected": list(map(int, target)),
        }
    out["pixels"] = int(len(ys))
    return out


def main():
    rows = []
    for name, hx in COLORS.items():
        rgb = hex2rgb(hx)
        lab = srgb_to_lab(rgb)
        shown = ycbcr_to_rgb(rgb_to_ycbcr(rgb, "601"), "709")  # today: 601 encode, 709 decode
        shown_r = tuple(round(c) for c in shown)
        rows.append({
            "color": name, "rgb": rgb,
            "displayed_today": shown_r,
            "dE2000_today": round(de2000(lab, srgb_to_lab(shown)), 2),
            "dE2000_bt709": round(de2000(lab, srgb_to_lab(ycbcr_to_rgb(rgb_to_ycbcr(rgb, "709"), "709"))), 2),
        })
    res = {"brand_colors": rows, "shipped_pixel_check": shipped_pixel_check()}
    q.save_json(os.path.join(q.WORK, "results_color.json"), res)
    for r in rows:
        print(f"{r['color']:34s} {r['rgb']} -> shown {r['displayed_today']}  dE00 today {r['dE2000_today']:5.2f}  with bt709 {r['dE2000_bt709']:.2f}")
    print(json.dumps(res["shipped_pixel_check"], indent=1))


if __name__ == "__main__":
    main()
