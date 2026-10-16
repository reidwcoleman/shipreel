"""On-screen element appearance events (captions, stickers, UI pop-ins).

Heuristic: Canny edge density on a 180-px-wide grey frame in 20x20 px cells
(= 120x120 px at 1080w). An "appear" event is a cluster of >= 2 cells whose edge
density jumps by > 0.05 in one frame, stays up 4 frames later, and has high
local contrast (max-min >= 110 grey levels), outside cuts/transitions and outside
fast camera motion. Consecutive detections of the same region within 8 frames
(pop-in growth) are merged to the earliest frame.
"""
from __future__ import annotations

import numpy as np
from scipy import ndimage


def detect_text_events(F: dict, MP: dict, boundaries: list[dict], persist: int = 4) -> list[dict]:
    E, C = F["edges"], F["econ"]
    n = len(E)
    fps = F["fps"]
    if n < persist + 3:
        return []
    gh, gw = E.shape[1:]
    excl = np.zeros(n, bool)
    for b in boundaries:
        a = b["frame"]
        e = b.get("end_frame", a)
        excl[max(0, a - 2):min(n, e + 3)] = True
    moving = (np.abs(MP["dlogs"]) > 0.004) | (np.hypot(MP["dx"], MP["dy"]) > 8)
    events = []
    for kind, sign in (("appear", 1), ("disappear", -1)):
        last = []
        for i in range(1, n - persist):
            if excl[i] or moving[i] or excl[min(n - 1, i + persist)]:
                continue
            dE = sign * (E[i] - E[i - 1])
            keep = sign * (E[i + persist] - E[i - 1])
            con = C[i] if sign > 0 else C[i - 1]
            cells = (dE > 0.05) & (keep > 0.04) & (con >= 110)
            # ignore the outer ring of cells (120 px at 1080w): content entering/leaving the frame edge
            cells[0, :] = cells[-1, :] = False
            cells[:, 0] = cells[:, -1] = False
            if cells.sum() < 2:
                continue
            lab, k = ndimage.label(cells, structure=np.ones((3, 3)))
            for comp in range(1, k + 1):
                m = lab == comp
                if m.sum() < 2:
                    continue
                ys, xs = np.nonzero(m)
                box = (xs.min() / gw, ys.min() / gh, (xs.max() + 1) / gw, (ys.max() + 1) / gh)
                # merge with a recent event of the same kind overlapping this box
                dup = False
                for ev in last:
                    if i - ev["frame"] <= 8:
                        bx = ev["box"]
                        ix = min(bx[2], box[2]) - max(bx[0], box[0])
                        iy = min(bx[3], box[3]) - max(bx[1], box[1])
                        if ix > 0 and iy > 0:
                            dup = True
                            break
                if dup:
                    continue
                ev = {"type": kind, "frame": i, "time_s": round(i / fps, 4), "cells": int(m.sum()),
                      "box": [round(float(v), 3) for v in box], "strength": round(float(dE[m].mean()), 3)}
                events.append(ev)
                last.append(ev)
            last = [ev for ev in last if i - ev["frame"] <= 8]
    events.sort(key=lambda e: e["frame"])
    return events
