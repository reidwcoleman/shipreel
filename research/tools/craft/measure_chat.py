"""Measure chat-card growth + bubble pop timing in a texting-story video (frame accurate).

    python3 -I research/tools/craft/measure_chat.py <video.mp4> <t0> <t1> [out.csv]

Treats the video as untrusted data (read-only). For each frame it finds the bottom edge of the
white chat card in the top half (last row whose band is >= 60% near-white) and the lowest
blue (sent, ~#0A84FF) / grey (received) bubble pixel rows. Prints per-frame values and
detected "events" (edge moves > 6 px), each normalised 0->1 for spring fitting.
"""
import sys
import cv2
import numpy as np


def card_metrics(frame):
    h, w = frame.shape[:2]
    top = frame[: h // 2]
    b, g, r = [top[:, :, i].astype(np.int16) for i in range(3)]
    x0, x1 = int(w * 0.14), int(w * 0.86)
    white = (r > 232) & (g > 232) & (b > 232)
    frac = white[:, x0:x1].mean(axis=1)
    rows = np.where(frac > 0.6)[0]
    bottom = int(rows.max()) if rows.size else -1
    topedge = int(rows.min()) if rows.size else -1
    blue = (b > 200) & (r < 90) & (g > 100) & (g < 170)
    grey = (abs(r - g) < 8) & (abs(g - b) < 10) & (r > 215) & (r < 236)
    brows = np.where(blue[:, x0:x1].sum(axis=1) > 20)[0]
    grows = np.where(grey[:, x0:x1].sum(axis=1) > 20)[0]
    # width of the lowest blue bubble (for scale-pop measurement)
    blue_w = 0
    if brows.size:
        yb = int(brows.max())
        band = blue[max(0, yb - 30): yb + 1, x0:x1]
        cols = np.where(band.any(axis=0))[0]
        blue_w = int(cols.max() - cols.min()) if cols.size else 0
    return bottom, topedge, int(brows.max()) if brows.size else -1, int(grows.max()) if grows.size else -1, blue_w


def main():
    path, t0, t1 = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
    out = sys.argv[4] if len(sys.argv) > 4 else None
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    cap.set(cv2.CAP_PROP_POS_MSEC, t0 * 1000)
    rows = []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        t = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000
        if t > t1:
            break
        rows.append((round(t, 4), *card_metrics(frame)))
    print(f"fps={fps:.3f} frames={len(rows)}")
    if out:
        with open(out, "w") as f:
            f.write("t,bottom,top,blue_low,grey_low,blue_w\n")
            for r in rows:
                f.write(",".join(map(str, r)) + "\n")
    # events: bottom edge moves
    bottoms = np.array([r[1] for r in rows])
    i = 1
    while i < len(rows):
        if abs(bottoms[i] - bottoms[i - 1]) > 6 and bottoms[i - 1] > 0:
            start = i - 1
            j = i
            # extend while still moving (allow 3 still frames)
            still = 0
            while j < len(rows) - 1 and still < 4:
                j += 1
                still = still + 1 if abs(bottoms[j] - bottoms[j - 1]) <= 1 else 0
            seg = bottoms[start: j + 1].astype(float)
            a, z = seg[0], np.median(seg[-3:])
            if abs(z - a) > 10:
                p = (seg - a) / (z - a)
                print(f"event t={rows[start][0]:.3f}s  {a:.0f}->{z:.0f}px ({z - a:+.0f})  frames={len(seg)}  p=" + " ".join(f"{v:.3f}" for v in p))
            i = j + 1
        else:
            i += 1


if __name__ == "__main__":
    main()
