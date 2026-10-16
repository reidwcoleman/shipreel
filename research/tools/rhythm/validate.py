#!/usr/bin/env python3
"""Validate the analyser on synthetic clips with known ground truth (see synth.py).

  python3 -I validate.py <synth_dir> [--out validation.json]

Prints a measured-vs-true table and writes JSON rows {test, metric, truth, measured, error, pass}.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

from analyze import analyze  # noqa: E402

ROWS = []


def row(test, metric, truth, measured, tol, rel=False, unit=""):
    if measured is None:
        ROWS.append({"test": test, "metric": metric, "truth": truth, "measured": None, "error": None, "pass": False, "unit": unit})
        return
    if isinstance(truth, str):
        ok = measured in truth.split("|") if isinstance(measured, str) else False
        err = None
    else:
        err = measured - truth
        ok = abs(err) <= (tol * abs(truth) if rel else tol)
    ROWS.append({"test": test, "metric": metric, "truth": truth, "measured": measured,
                 "error": round(err, 4) if isinstance(err, float) else err, "pass": bool(ok), "unit": unit,
                 "tolerance": f"{tol * 100:.0f}%" if rel else tol})


def nearest(items, frame, key="frame", tol=3, pred=None):
    best = None
    for it in items:
        if pred and not pred(it):
            continue
        dlt = abs(it[key] - frame)
        if dlt <= tol and (best is None or dlt < abs(best[key] - frame)):
            best = it
    return best


def v_cam(d, res):
    T = d["cam"]
    B = res["boundaries"]
    for f in T["cuts"]:
        m = nearest(B, f, tol=1)
        row("cam", f"hard cut @{f}", "cut", m["type"] if m else None, 0)
        if m:
            row("cam", f"hard cut @{f} frame", f, m["frame"], 0, unit="frame")
    for z in T["zoom_cuts"]:
        m = nearest(B, z["frame"], tol=1)
        row("cam", "zoom-cut type", "zoom_cut", m["type"] if m else None, 0)
        row("cam", "zoom-cut scale ratio", z["scale_ratio"], m.get("scale_ratio") if m else None, 0.01, rel=True)
    P = res["camera"]["punches"]
    t1, t2, t3 = T["punches"]
    p1 = nearest(P, t1["start_frame"], "start_frame", 3)
    if p1:
        row("cam", "punch-in magnitude (1.0->1.2 / 6 f ease-out)", t1["magnitude"], p1["magnitude"], 0.01, rel=True)
        row("cam", "punch-in authored duration", float(t1["dur_frames"]), p1["authored_dur_frames"], 1.0, unit="frames")
        row("cam", "punch-in authored start", float(t1["start_frame"]), p1["authored_start_frame"], 1.0, unit="frame")
        row("cam", "punch-in easing", t1["easing"], p1["easing_fit"], 0)
        row("cam", "punch-in t50", t1["t50"], p1["t50"], 0.06)
        row("cam", "punch-in focus y", t1["focus"][1], p1["focus_y"], 0.03)
    else:
        row("cam", "punch-in detected", "yes", None, 0)
    p2 = nearest(P, t2["start_frame"], "start_frame", 3)
    if p2:
        row("cam", "punch-out magnitude (linear 6 f)", t2["magnitude"], p2["magnitude"], 0.01, rel=True)
        row("cam", "punch-out authored duration", float(t2["dur_frames"]), p2["authored_dur_frames"], 1.0, unit="frames")
        row("cam", "punch-out easing", t2["easing"], p2["easing_fit"], 0)
    p3 = nearest(P, t3["start_frame"], "start_frame", 3)
    if p3:
        row("cam", "spring punch magnitude (settled)", t3["magnitude"], p3["magnitude"], 0.01, rel=True)
        row("cam", "spring punch overshoot %", t3["overshoot_pct"], p3["overshoot_pct"], 1.5, unit="%")
        sf = p3["spring_fit"]
        zeta_t = t3["spring"]["damping"] / (2 * math.sqrt(t3["spring"]["stiffness"] * t3["spring"]["mass"]))
        om_t = math.sqrt(t3["spring"]["stiffness"] / t3["spring"]["mass"])
        row("cam", "spring fit zeta (SNAPPY 0.674)", round(zeta_t, 3), sf["zeta"], 0.1, rel=True)
        row("cam", "spring fit omega rad/s (SNAPPY 17.3)", round(om_t, 2), sf["omega_rad_s"], 0.1, rel=True)
    Z = res["camera"]["slow_zooms"]
    tz = T["slow_zooms"][0]
    z = nearest(Z, tz["start_frame"], "start_frame", 15)
    row("cam", "Ken Burns rate %/s (1.04->1.14 over 4 s)", tz["rate_pct_per_s"], z["rate_pct_per_s"] if z else None, 0.1, rel=True)
    S = res["camera"]["shakes"]
    s1, s2 = T["shakes"]
    a = nearest(S, s1["start_frame"], "start_frame", 6)
    row("cam", "impact shake peak px", s1["amp_peak_px"], a["amp_peak_px"] if a else None, 0.15, rel=True, unit="px")
    row("cam", "impact shake rot peak deg", s1["rot_peak_deg"], a["rot_peak_deg"] if a else None, 0.2, rel=True)
    row("cam", "impact shake duration f", float(s1["dur_frames"]), float(a["dur_frames"]) if a else None, 2, unit="frames")
    b = nearest(S, s2["start_frame"], "start_frame", 6)
    row("cam", "damped shake freq Hz", s2["freq_hz"], b["freq_hz"] if b else None, 0.1, rel=True, unit="Hz")
    row("cam", "damped shake peak px", s2["amp_peak_px"], b["amp_peak_px"] if b else None, 0.15, rel=True, unit="px")
    row("cam", "damped shake decay tau f", s2["decay_tau_frames"], b["decay_tau_frames"] if b else None, 0.25, rel=True, unit="frames")
    Pn = res["camera"]["pans"]
    tp = T["pans"][0]
    pn = nearest(Pn, tp["start_frame"], "start_frame", 8)
    row("cam", "pan speed px/s", tp["speed_px_s"], pn["speed_px_s"] if pn else None, 0.1, rel=True)
    row("cam", "pan distance px", tp["dist_px"], pn["dist_px"] if pn else None, 0.05, rel=True)
    hh = [h for h in res["camera"]["handheld"] if h["shot"][0] >= 445 and h["shot"][1] <= 545]
    x, y = np.array(T["handheld"][0]["x"]), np.array(T["handheld"][0]["y"])
    from scipy.ndimage import uniform_filter1d as u
    bx = u(x, 10, mode="nearest") - u(x, 90, mode="nearest")
    by = u(y, 10, mode="nearest") - u(y, 90, mode="nearest")
    row("cam", "hand-held band RMS px", round(float(np.sqrt((bx ** 2 + by ** 2).mean())), 3), hh[0]["rms_px"] if hh else None, 0.2, rel=True)
    row("cam", "false soft transitions", 0.0, float(sum(1 for b_ in B if b_.get("dur_frames", 0) > 0)), 0)
    row("cam", "false speed ramps", 0.0, float(len(res["camera"]["speed_ramps"])), 0)
    row("cam", "false text events", 0.0, float(len(res["text_events"])), 1)


TYPE_OK = {
    "cut": "cut", "jump_cut": "jump_cut|cut", "dissolve": "dissolve", "slide/push": "push|slide",
    "zoom": "zoom", "whip": "whip", "fade_black": "fade_black|dip_black", "flash": "flash",
    "fade": "dissolve", "fadeblack": "fade_black|dip_black", "slideleft": "push|slide", "slideup": "push|slide",
    "zoomin": "zoom", "wipeleft": "wipe", "xdissolve": "dissolve|other",
}


def v_trans(d, res, key):
    B = res["boundaries"]
    for t in d[key]["boundaries"]:
        typ = t["type"] if not (key == "xfade" and t["type"] == "dissolve") else "xdissolve"
        m = nearest(B, t["frame"], tol=3)
        label = t.get("shipreel", t["type"])
        row(key, f"{label} type", TYPE_OK[typ], m["type"] if m else None, 0)
        if m:
            row(key, f"{label} start frame", t["frame"], m["frame"], 1, unit="frame")
            if t.get("dur_frames"):
                row(key, f"{label} duration", float(t["dur_frames"]), float(m.get("dur_frames", 0)), 2, unit="frames")
            if m["type"] in ("push", "slide", "wipe"):
                want = {"slide-left": "left", "slide-up": "up", "slideleft": "left", "slideup": "up", "wipeleft": "left"}.get(label)
                if want:
                    row(key, f"{label} direction", want, m.get("direction"), 0)
    row(key, "extra boundaries (false positives)", 0.0,
        float(max(0, len(B) - len(d[key]["boundaries"]))), 0)


def v_sync(d, res):
    T = d["sync"]
    au = res["audio"]
    row("sync", "tempo BPM", T["bpm"], au["tempo"]["bpm"], 1.0)
    beats = np.array(au["beats_s"])
    for f, off in zip(T["cut_frames"], T["cut_offsets_to_beat_f"]):
        m = nearest(res["boundaries"], f, tol=1)
        row("sync", f"cut @{f} detected", "cut", m["type"] if m else None, 0)
        if beats.size:
            t = f / 30
            j = int(np.argmin(np.abs(beats - t)))
            row("sync", f"cut @{f} beat offset f", float(off), round(float((beats[j] - t) * 30), 2), 1.0, unit="frames")
    ev = {round(e["t"] * 30): e for e in au["events_cuts"]}
    for f in T["whoosh"]["cuts"]:
        e = ev.get(f)
        row("sync", f"whoosh @{f} accent peak f", float(T["whoosh"]["peak_f30"]), e.get("accent_peak_f30") if e else None, 1.5, unit="frames")
        row("sync", f"whoosh @{f} class", "whoosh/riser", e.get("accent_guess") if e else None, 0)
    TE = [t for t in res["text_events"] if t["type"] == "appear"]
    evt = {round(e["t"] * 30): e for e in au["events_text"]}
    for c in T["captions"]:
        m = nearest(TE, c["frame"], tol=2)
        row("sync", f"caption @{c['frame']} ({c['style']}) detected", float(c["frame"]), float(m["frame"]) if m else None, 1, unit="frame")
        if m:
            e = evt.get(m["frame"])
            if e and "transient_f30" in e:
                # convert to offset relative to the TRUE caption frame
                meas = e["transient_f30"] + (m["frame"] - c["frame"])
                row("sync", f"pop @{c['frame']} offset f", float(c["pop_offset_f"]), round(meas, 2), 1.0, unit="frames")
            else:
                row("sync", f"pop @{c['frame']} offset f", float(c["pop_offset_f"]), None, 1.0)


def v_audio(d, results):
    if "tone" in results:
        L = results["tone"]["audio"]["loudness"]
        row("tone", "integrated LUFS", -23.0, L["lufs_i"], 0.3, unit="LUFS")
        row("tone", "true peak dBTP", -23.0, L["true_peak_dbtp"], 0.3, unit="dBTP")
    if "music" in results:
        row("music", "class", "music-led", results["music"]["audio"]["class"], 0)
        row("music", "tempo BPM", 128.0, results["music"]["audio"]["tempo"]["bpm"], 1.0)
    if "speech" in results:
        row("speech", "class", "speech-led", results["speech"]["audio"]["class"], 0)
    if "speech_bed" in results:
        row("speech_bed", "class", "speech-led", results["speech_bed"]["audio"]["class"], 0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("synth_dir")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "validation.json"))
    ap.add_argument("--only", nargs="*")
    a = ap.parse_args()
    truth = json.load(open(os.path.join(a.synth_dir, "truth.json")))
    results = {}
    for name in ("cam", "trans", "xfade", "sync", "tone", "music", "speech", "speech_bed"):
        if a.only and name not in a.only:
            continue
        p = os.path.join(a.synth_dir, f"{name}.mp4")
        if not os.path.exists(p):
            continue
        print("analysing", name, flush=True)
        res, _ = analyze(p, do_audio=name in ("sync", "tone", "music", "speech", "speech_bed"))
        results[name] = res
        json.dump(res, open(os.path.join(a.synth_dir, f"{name}.analysis.json"), "w"), indent=1)
    if "cam" in results:
        v_cam(truth, results["cam"])
    if "trans" in results:
        v_trans(truth, results["trans"], "trans")
    if "xfade" in results:
        v_trans(truth, results["xfade"], "xfade")
    if "sync" in results:
        v_sync(truth, results["sync"])
    v_audio(truth, results)
    n_ok = sum(r["pass"] for r in ROWS)
    print(f"\n{n_ok}/{len(ROWS)} checks pass\n")
    for r in ROWS:
        print(f"{'PASS' if r['pass'] else 'FAIL'}  {r['test']:<10} {r['metric']:<48} truth={r['truth']!s:<14} measured={r['measured']!s:<14} err={r['error']!s}")
    old = {}
    if os.path.exists(a.out) and a.only:
        old = json.load(open(a.out))
        keep = [r for r in old.get("rows", []) if r["test"] not in set(a.only) | {"xfade" if "xfade" in a.only else ""}]
        rows = keep + ROWS
    else:
        rows = ROWS
    json.dump({"passed": sum(r["pass"] for r in rows), "total": len(rows), "rows": rows}, open(a.out, "w"), indent=1)
    print("wrote", a.out)


if __name__ == "__main__":
    main()
