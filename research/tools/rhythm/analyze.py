#!/usr/bin/env python3
"""Cut rhythm / camera motion / audio sync analysis of one video.

  python3 -I research/tools/rhythm/analyze.py <video.mp4> --out <file.json>
        [--fps-cap 30] [--no-audio] [--no-crop] [--strip <file.jpg>] [--series]

Writes a JSON with: probe, summary (ASL, first cut, transitions, punch-ins, shakes,
LUFS, beat alignment, SFX sync...), boundaries, shots, camera events, text events,
audio events. See README.md in this folder for field definitions.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

from common import SHIPREEL_FPS, probe, stats, to_jsonable  # noqa: E402
from features import extract, motion_params  # noqa: E402
from cuts import detect_hard_cuts, detect_soft_transitions, merge_boundaries, video_start_fade  # noqa: E402
from camera import analyze_camera, shots_from_boundaries  # noqa: E402
from textev import detect_text_events  # noqa: E402
import audio as au  # noqa: E402

VERSION = "1.0"
CUT_TYPES = ("cut", "zoom_cut", "reframe_cut", "jump_cut")


def _intervals(times: list[float], dur: float) -> list[float]:
    t = sorted(set(round(x, 3) for x in times))
    pts = [0.0] + t + [dur]
    return [b - a for a, b in zip(pts[:-1], pts[1:]) if b - a > 1e-6]


def _merge_close(times: list[float], tol: float) -> list[float]:
    out = []
    for t in sorted(times):
        if not out or t - out[-1] > tol:
            out.append(t)
    return out


def analyze(path: str, fps_cap: float = 30.0, do_audio: bool = True, use_crop: bool = True,
            keep_series: bool = False, progress: bool = False) -> tuple[dict, dict]:
    t0 = time.time()
    p = probe(path)
    F = extract(path, p, fps_cap=fps_cap, use_crop=use_crop, progress=progress)
    fps = F["fps"]
    n = F["n"]
    dur = n / fps if fps else p.duration
    MP = motion_params(F)
    hard = detect_hard_cuts(F, MP)
    soft = detect_soft_transitions(F, MP, hard)
    bounds = merge_boundaries(hard, soft, F)
    for b in bounds:
        b.setdefault("dur_frames", 0)
        b["time_s"] = round(b["frame"] / fps, 4)
        b["frame_f30"] = round(b["frame"] * SHIPREEL_FPS / fps, 2)
        b.setdefault("dur_f30", round(b["dur_frames"] * SHIPREEL_FPS / fps, 2))
    start_fade = video_start_fade(F)
    shots = shots_from_boundaries(n, bounds)
    cam = analyze_camera(F, MP, shots)
    zoom_cuts = [b for b in bounds if b["type"] == "zoom_cut"]
    text = detect_text_events(F, MP, bounds)

    # ------------------------------------------------------------------ summary
    shot_len = [(b - a + 1) / fps for a, b in shots]
    cut_times = [b["time_s"] for b in bounds]
    hard_times = [b["time_s"] for b in bounds if b["type"] == "cut"]
    types = Counter(b["type"] for b in bounds)
    trans_dur = {}
    for b in bounds:
        if b["dur_frames"] > 0:
            trans_dur.setdefault(b["type"], []).append(b["dur_f30"])
    appear = [e["time_s"] for e in text if e["type"] == "appear"]
    punch_in = [q for q in cam["punches"] if q["direction"] == "in"]
    vis_changes = _merge_close(cut_times + appear + [q["time_s"] for q in cam["punches"]], 0.1)
    vis_int = _intervals(vis_changes, dur)
    mins = dur / 60.0 if dur else 1.0
    summary = {
        "duration_s": round(dur, 3),
        "fps_analysis": round(fps, 3),
        "n_shots": len(shots),
        "n_boundaries": len(bounds),
        "boundary_types": dict(types),
        "asl_s": round(dur / max(1, len(shots)), 3),
        "shot_len_s": stats(shot_len),
        "first_cut_s": round(cut_times[0], 3) if cut_times else None,
        "first_hard_cut_s": round(hard_times[0], 3) if hard_times else None,
        "cuts_per_min": round(len(bounds) / mins, 2),
        "start_fade": start_fade,
        "transition_dur_f30": {k: stats(v, 2) for k, v in trans_dur.items()},
        "soft_transition_share_pct": round(100 * sum(1 for b in bounds if b["dur_frames"] > 0) / max(1, len(bounds)), 1),
        "visual_change_interval_s": stats(vis_int),
        "longest_static_s": round(max(vis_int), 3) if vis_int else None,
        "text_appear_events": len(appear),
        "text_appear_interval_s": stats(_intervals(appear, dur)[1:-1]) if len(appear) > 2 else None,
        "punch_ins": {
            "count": len(punch_in), "per_min": round(len(punch_in) / mins, 2),
            "magnitude_pct": stats([q["pct"] for q in punch_in], 2),
            "dur_f30": stats([q["dur_f30"] for q in punch_in], 2),
            "t50": stats([q["t50"] for q in punch_in], 3),
            "authored_dur_f30": stats([q["authored_dur_f30"] for q in punch_in], 2),
            "overshoot_pct": stats([q["overshoot_pct"] for q in punch_in], 2),
            "focus_y": stats([q["focus_y"] for q in punch_in], 3),
            "easing": dict(Counter(q["easing"] for q in punch_in)),
            "returns_pct": round(100 * sum(q["returns"] for q in punch_in) / len(punch_in), 1) if punch_in else None,
            "hold_s": stats([q["hold_s_after"] for q in punch_in], 2),
        },
        "punch_outs": len([q for q in cam["punches"] if q["direction"] == "out"]),
        "zoom_cuts": {"count": len(zoom_cuts), "scale_ratio": stats([b.get("scale_ratio") for b in zoom_cuts], 3)},
        "slow_zooms": {"count": len(cam["slow_zooms"]), "rate_pct_per_s": stats([z["rate_pct_per_s"] for z in cam["slow_zooms"]], 2),
                       "covered_pct": round(100 * sum(z["dur_s"] for z in cam["slow_zooms"]) / dur, 1) if dur else 0},
        "pans": {"count": len(cam["pans"]), "speed_px_s": stats([z["speed_px_s"] for z in cam["pans"]], 1)},
        "shakes": {"count": len(cam["shakes"]), "per_min": round(len(cam["shakes"]) / mins, 2),
                   "amp_peak_px": stats([z["amp_peak_px"] for z in cam["shakes"]], 2),
                   "freq_hz": stats([z["freq_hz"] for z in cam["shakes"]], 2),
                   "dur_f30": stats([z["dur_f30"] for z in cam["shakes"]], 2),
                   "decay_tau_f30": stats([z["decay_tau_f30"] for z in cam["shakes"]], 2),
                   "rot_peak_deg": stats([z["rot_peak_deg"] for z in cam["shakes"]], 3)},
        "handheld_rms_px": stats([h["rms_px"] for h in cam["handheld"]], 2),
        "speed_ramps": len(cam["ramps"]),
        "static_overlay_frames_pct": cam["static_overlay_frames_pct"],
        "tracking_ok_pct": cam["tracking_ok_pct"],
    }

    # ------------------------------------------------------------------ audio
    A = {"present": False}
    audio_out = {"present": False}
    if do_audio and p.has_audio:
        A = au.analyze_audio(path, p.a_start - p.v_start, dur)
    if A.get("present"):
        on_t, on_s = A["onset_t"], A["onset_str"]
        strong_t = on_t[on_s >= 2.5]
        strong_s = on_s[on_s >= 2.5]
        beats = A["beats_t"]
        cut_ev_t = [b["time_s"] if b["dur_frames"] == 0 else (b["frame"] + b["dur_frames"] / 2) / fps for b in bounds]
        ev_cuts = au.event_audio(cut_ev_t, on_t, on_s, A["x"], A["S"])
        ev_text = au.event_audio(appear, on_t, on_s, A["x"], A["S"])
        ev_punch = au.event_audio([q["time_s"] for q in punch_in], on_t, on_s, A["x"], A["S"])
        rng = np.random.default_rng(0)
        rand_t = list(rng.uniform(1.6, max(1.7, dur - 1.6), 80)) if dur > 4 else []
        ev_rand = au.event_audio(rand_t, on_t, on_s, A["x"], A["S"])

        def beat_off(times):
            if beats.size < 4:
                return None
            per = float(np.median(np.diff(beats)))
            offs = []
            for t in times:
                j = int(np.argmin(np.abs(beats - t)))
                offs.append((beats[j] - t) * 30)
            o = np.array(offs)
            half = per * 30 / 2
            # uniform baseline: P(|offset| <= k frames) = 2k / beat period (in frames)
            return {"n": len(o), "median_signed_f30": round(float(np.median(o)), 2),
                    "median_abs_f30": round(float(np.median(np.abs(o))), 2),
                    "pct_within_2f": round(float((np.abs(o) <= 2).mean() * 100), 1),
                    "baseline_pct_within_2f": round(min(100.0, 100 * 4 / (per * 30)), 1),
                    "beat_period_f30": round(per * 30, 2), "max_abs_possible_f30": round(half, 2)}

        def sfx_summary(ev):
            if not ev:
                return None
            acc = [e for e in ev if e.get("accent_db") is not None and e["accent_db"] >= 4]
            tr = [e for e in ev if "transient_f30" in e]
            return {
                "n": len(ev),
                "with_transient_pct": round(100 * len(tr) / len(ev), 1),
                "transient_offset_f30": stats([e["transient_f30"] for e in tr], 2),
                "with_accent_pct": round(100 * len(acc) / len(ev), 1),
                "accent_db": stats([e["accent_db"] for e in acc], 1),
                "accent_peak_f30": stats([e["accent_peak_f30"] for e in acc], 2),
                "accent_start_f30": stats([e["accent_start_f30"] for e in acc], 2),
                "accent_len_ms": stats([e["accent_len_ms"] for e in acc], 0),
                "accent_types": dict(Counter(e.get("accent_guess", "?") for e in acc)),
            }

        vm = A["voice_music"]
        audio_out = {
            "present": True,
            "loudness": A["loudness"],
            "sample_peak_dbfs": A["sample_peak_dbfs"],
            "rms_dbfs": A["rms_dbfs"],
            "class": vm["class"], "fractions": vm["fractions"], "speech_floor_rel_db": vm["speech_floor_rel_db"],
            "tempo": A["tempo"],
            "onsets_per_s": A["onsets_per_s"], "strong_onsets_per_s": A["strong_onsets_per_s"],
            "cut_onset_alignment": au.summarize_alignment(ev_cuts, "nearest_onset_f30", n, strong_t, dur)
            if strong_t.size else None,
            "cut_beat_alignment": beat_off(cut_ev_t) if A["tempo"].get("confidence", 0) >= 0.1 else None,
            "sfx_at_cuts": sfx_summary(ev_cuts),
            "sfx_at_text": sfx_summary(ev_text),
            "sfx_at_punch_ins": sfx_summary(ev_punch),
            "sfx_at_random_times": sfx_summary(ev_rand),
            "events_cuts": ev_cuts, "events_text": ev_text, "events_punch": ev_punch,
            "onsets_strong_s": [round(float(t), 3) for t in strong_t],
            "onsets_strong_strength": [round(float(s), 2) for s in strong_s],
            "beats_s": [round(float(t), 3) for t in beats],
            "voice_music_windows": vm["windows"],
        }
        # cut-to-onset alignment recomputed against STRONG onsets only (nearest strong onset)
        if strong_t.size:
            ev_cs = au.event_audio(cut_ev_t, strong_t, strong_s, A["x"][:1], A["S"][:1])
            audio_out["cut_onset_alignment"] = au.summarize_alignment(ev_cs, "nearest_onset_f30", n, strong_t, dur)
            if appear:
                ev_ts = au.event_audio(appear, strong_t, strong_s, A["x"][:1], A["S"][:1])
                audio_out["text_onset_alignment"] = au.summarize_alignment(ev_ts, "nearest_onset_f30", n, strong_t, dur)
        summary["audio"] = {
            "lufs_i": A["loudness"]["lufs_i"], "true_peak_dbtp": A["loudness"]["true_peak_dbtp"],
            "lra": A["loudness"]["lra"], "class": vm["class"], "speech_pct": round(100 * vm["fractions"]["speech"], 1),
            "music_pct": round(100 * vm["fractions"]["music"], 1), "tempo_bpm": A["tempo"].get("bpm"),
            "tempo_conf": A["tempo"].get("confidence"),
            "cut_onset_within_2f_pct": (audio_out["cut_onset_alignment"] or {}).get("pct_within_2f"),
            "cut_onset_lift_2f": (audio_out["cut_onset_alignment"] or {}).get("lift_2f"),
            "sfx_at_cuts_pct": (audio_out["sfx_at_cuts"] or {}).get("with_accent_pct"),
            "sfx_at_random_pct": (audio_out["sfx_at_random_times"] or {}).get("with_accent_pct"),
        }
    else:
        summary["audio"] = None

    result = {
        "tool": "shipreel-rhythm", "version": VERSION, "file": os.path.abspath(path),
        "probe": p.as_dict(),
        "analysis": {"fps": fps, "fps_filter": F["fps_filter"], "crop": F["crop"], "width": F["W"], "height": F["H"],
                     "frames": n, "px_per_analysis_px_at_1080w": round(F["px1080"], 4), "seconds": round(time.time() - t0, 1)},
        "summary": summary,
        "boundaries": bounds,
        "shots": [{"start_frame": a, "end_frame": b, "start_s": round(a / fps, 3), "dur_s": round((b - a + 1) / fps, 3)} for a, b in shots],
        "camera": {"punches": cam["punches"], "zoom_cuts": zoom_cuts, "slow_zooms": cam["slow_zooms"], "pans": cam["pans"],
                   "shakes": cam["shakes"], "speed_ramps": cam["ramps"], "handheld": cam["handheld"]},
        "text_events": text,
        "audio": audio_out,
    }
    if keep_series:
        result["series"] = {
            "dlogs": MP["dlogs"], "dx": MP["dx"], "dy": MP["dy"], "rot": MP["rot"], "ok": F["ok"],
            "luma": F["luma"], "sharp": F["sharp"], "mcd": F["mcd"], "ssim": F.get("ss"), "hist_d": F.get("hd"),
        }
    ctx = {"F": F, "MP": MP, "A": A, "probe": p, "shots": shots}
    return to_jsonable(result), ctx


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("--out", required=True)
    ap.add_argument("--fps-cap", type=float, default=30.0)
    ap.add_argument("--no-audio", action="store_true")
    ap.add_argument("--no-crop", action="store_true")
    ap.add_argument("--series", action="store_true", help="include per-frame motion series")
    ap.add_argument("--strip", help="also save a frame strip around the most interesting camera move")
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()
    res, ctx = analyze(a.video, a.fps_cap, not a.no_audio, not a.no_crop, a.series, progress=not a.quiet)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w") as f:
        json.dump(res, f, indent=1)
    if a.strip:
        from strip import save_strip
        save_strip(a.video, res, ctx, a.strip)
    s = res["summary"]
    if not a.quiet:
        print(json.dumps({k: s[k] for k in ("duration_s", "n_shots", "asl_s", "first_cut_s", "boundary_types")}, indent=None))
        print("punch-ins:", s["punch_ins"]["count"], "shakes:", s["shakes"]["count"], "audio:", s.get("audio"))
        print("wrote", a.out)


if __name__ == "__main__":
    main()
