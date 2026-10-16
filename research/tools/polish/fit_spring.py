"""Fit a damped-spring step response to a measured camera channel (scale / cx / cy).

x(t) = x1 + (x0 - x1) * h(t - t0),  h = unit spring response from rest (omega, zeta), h(t<0)=1
Reports omega, zeta, t0, rise times, and the equivalent Remotion spring config for mass=1
(stiffness = omega^2, damping = 2*zeta*omega). Also fits two common ease curves for comparison.

usage: python3 -I fit_spring.py CSV --col scale --from F0 --to F1 [--fps 60]
"""
import argparse
import csv
import math

import numpy as np
from scipy.optimize import least_squares

ap = argparse.ArgumentParser()
ap.add_argument("csv")
ap.add_argument("--col", default="scale")
ap.add_argument("--from", dest="f0", type=int, required=True)
ap.add_argument("--to", dest="f1", type=int, required=True)
ap.add_argument("--fps", type=float, default=60)
ap.add_argument("--log", action="store_true", help="fit log(scale) (perceptually linear zoom)")
a = ap.parse_args()

rows = [r for r in csv.DictReader(open(a.csv)) if a.f0 <= int(r["frame"]) <= a.f1]
t = np.array([int(r["frame"]) / a.fps for r in rows])
y = np.array([float(r[a.col]) for r in rows])
if a.log:
    y = np.log(y)


def spring_unit(tt, w, z):
    """Remaining fraction (1 -> 0) of a spring released from rest."""
    tt = np.maximum(tt, 0)
    if z < 0.999:
        wd = w * math.sqrt(1 - z * z)
        return np.exp(-z * w * tt) * (np.cos(wd * tt) + z * w / wd * np.sin(wd * tt))
    if z > 1.001:
        r1 = -w * (z - math.sqrt(z * z - 1))
        r2 = -w * (z + math.sqrt(z * z - 1))
        c1 = r2 / (r2 - r1)
        c2 = -r1 / (r2 - r1)
        return c1 * np.exp(r1 * tt) + c2 * np.exp(r2 * tt)
    return (1 + w * tt) * np.exp(-w * tt)


def model(p, tt):
    w, z, t0, x0, x1 = p
    return x1 + (x0 - x1) * spring_unit(tt - t0, w, z)


x0g, x1g = y[0], y[-1]
mid = x0g + 0.5 * (x1g - x0g)
k = int(np.argmin(np.abs(y - mid)))
best = None
for z0 in (0.6, 0.85, 1.0, 1.3):
    for w0 in (6, 10, 14, 20):
        p0 = [w0, z0, t[k] - 1.7 / w0, x0g, x1g]
        try:
            r = least_squares(lambda p: model(p, t) - y, p0,
                              bounds=([1, 0.2, t[0] - 1, -10, -10], [80, 4, t[-1], 10, 10]))
        except ValueError:
            continue
        if best is None or r.cost < best.cost:
            best = r
w, z, t0, x0, x1 = best.x
res = model(best.x, t) - y
rms = float(np.sqrt(np.mean(res ** 2)))
span = abs(x1 - x0)


def tcross(frac):
    tt = np.linspace(0, 5, 50001)
    h = 1 - spring_unit(tt, w, z)
    i = np.argmax(h >= frac)
    return float(tt[i])


print(f"col={a.col}{' (log)' if a.log else ''} frames {a.f0}-{a.f1}: {x0:.4f} -> {x1:.4f}")
print(f"spring fit: omega={w:.2f} rad/s  zeta={z:.3f}  t0={t0:.3f}s  rms={rms:.5f} ({100 * rms / max(span, 1e-9):.2f}% of span)")
print(f"  remotion mass=1 -> stiffness={w * w:.0f} damping={2 * z * w:.1f}")
print(f"  t10={tcross(0.1):.3f}s t50={tcross(0.5):.3f}s t90={tcross(0.9):.3f}s t98={tcross(0.98):.3f}s t99.5={tcross(0.995):.3f}s")
overs = 0.0
if z < 1:
    tt = np.linspace(0, 5, 50001)
    overs = float(np.max(1 - spring_unit(tt, w, z)) - 1)
print(f"  overshoot={100 * overs:.2f}%")

# Comparison: cubic ease-out and bezier(0.16,1,0.3,1) with free start/duration


def bez(x1_, y1_, x2_, y2_, u):
    # solve x(s)=u
    s = np.clip(u, 0, 1).copy()
    for _ in range(20):
        xs = 3 * x1_ * (1 - s) ** 2 * s + 3 * x2_ * (1 - s) * s ** 2 + s ** 3
        dx = 3 * x1_ * (1 - s) ** 2 + 6 * (x2_ - x1_) * (1 - s) * s + 3 * (1 - x2_) * s ** 2
        s = np.clip(s - (xs - u) / np.maximum(dx, 1e-6), 0, 1)
    return 3 * y1_ * (1 - s) ** 2 * s + 3 * y2_ * (1 - s) * s ** 2 + s ** 3


for name, f in [("easeOutCubic", lambda u: 1 - (1 - np.clip(u, 0, 1)) ** 3),
                ("bezier(.16,1,.3,1)", lambda u: bez(0.16, 1, 0.3, 1, u)),
                ("easeInOutCubic", lambda u: np.where(np.clip(u, 0, 1) < 0.5, 4 * np.clip(u, 0, 1) ** 3,
                                                       1 - (-2 * np.clip(u, 0, 1) + 2) ** 3 / 2)),
                ("bezier(.25,.1,.25,1) css ease", lambda u: bez(0.25, 0.1, 0.25, 1, u))]:
    def m2(p):
        ts, d, xa, xb = p
        return xa + (xb - xa) * f((t - ts) / max(d, 1e-3))
    bb = None
    for d0 in (0.3, 0.6, 1.0, 1.5):
        r = least_squares(lambda p: m2(p) - y, [t[k] - d0 / 3, d0, x0g, x1g])
        if bb is None or r.cost < bb.cost:
            bb = r
    rr = float(np.sqrt(np.mean((m2(bb.x) - y) ** 2)))
    print(f"  vs {name:28s}: start={bb.x[0]:.3f}s dur={bb.x[1]:.3f}s rms={rr:.5f} ({100 * rr / max(span, 1e-9):.2f}%)")
