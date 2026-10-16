"""Loudness survey: integrated LUFS, LRA, true peak, short-term distribution, band balance, stereo width.

usage: AUDIO_WORK=<dir> python3 -I research/tools/audio/loudness.py <tag>=<media> ... > out.json
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from scipy import signal  # noqa: E402

import common as C  # noqa: E402

BANDS = [("sub", 20, 60), ("bass", 60, 250), ("lowmid", 250, 2000), ("presence", 2000, 6000), ("air", 6000, 16000)]


def analyse(tag: str, src: str) -> dict:
    r = {"tag": tag, "src": src}
    r.update(C.ebur128(src))
    sr, x = C.work_wav(src, tag, ch=2)
    xk = C.kweight(x)
    t3, S = C.block_lufs(xk, sr, 3.0, 0.1)  # short-term
    t4, M = C.block_lufs(xk, sr, 0.4, 0.1)  # momentary
    gate = S > -70
    r["S_p10"], r["S_p50"], r["S_p95"] = [round(float(np.percentile(S[gate], q)), 1) for q in (10, 50, 95)] if gate.any() else [None] * 3
    r["M_max"] = round(float(M.max()), 1)
    r["S_max"] = round(float(S.max()), 1)
    if r["I"] is not None and r["TP"] is not None:
        r["PLR"] = round(r["TP"] - r["I"], 1)
    mono = x.mean(axis=1)
    side = (x[:, 0] - x[:, 1]) / 2 if x.shape[1] > 1 else np.zeros_like(mono)
    r["side_db_rel_mid"] = round(10 * np.log10((side ** 2).mean() / max((mono ** 2).mean(), 1e-12) + 1e-12), 1)
    f, P = signal.welch(mono, fs=sr, nperseg=8192)
    tot = P[(f >= 20) & (f <= 16000)].sum()
    for name, lo, hi in BANDS:
        r[f"band_{name}_pct"] = round(100 * float(P[(f >= lo) & (f < hi)].sum() / tot), 1)
    # codec low-pass: highest frequency whose LTAS is within 70 dB of the max
    Pdb = 10 * np.log10(P + 1e-20)
    above = f[Pdb > Pdb.max() - 70]
    r["lowpass_hz"] = int(above.max()) if above.size else None
    r["dur_s"] = round(len(mono) / sr, 2)
    return r


if __name__ == "__main__":
    os.makedirs(C.WORK, exist_ok=True)
    out = []
    for arg in sys.argv[1:]:
        tag, src = arg.split("=", 1)
        try:
            out.append(analyse(tag, src))
        except Exception as e:  # keep going
            out.append({"tag": tag, "error": str(e)})
        print(json.dumps(out[-1]), file=sys.stderr)
    print(json.dumps(out, indent=1))
