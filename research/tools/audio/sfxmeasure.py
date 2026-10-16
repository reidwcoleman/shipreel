"""Measure short sound effects: duration, envelope (attack/decay), spectrum, loudness, phone-speaker loss.

usage: python3 -I research/tools/audio/sfxmeasure.py <file> [<file> ...] > out.json
       (files may be name@start-end to measure a time slice of a longer file, e.g. mix.wav@3.20-3.90)
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from scipy import signal  # noqa: E402

import common as C  # noqa: E402

SR = 48000


def decode(path: str) -> np.ndarray:
    seg = None
    if "@" in path and os.path.exists(path.split("@")[0]):
        path, rng = path.split("@")
        seg = [float(v) for v in rng.split("-")]
    p = C.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], check=True) if False else None
    import subprocess

    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).astype(np.float64)
    if seg:
        x = x[int(seg[0] * SR): int(seg[1] * SR)]
    return x


def env_db(x: np.ndarray, win_ms: float = 2.0) -> np.ndarray:
    w = max(1, int(SR * win_ms / 1000))
    p = np.convolve(x ** 2, np.ones(w) / w, mode="same")
    return 10 * np.log10(p + 1e-14)


def phone_filter(x: np.ndarray) -> np.ndarray:
    """Rough small-phone-speaker model: 4th-order HPF at 300 Hz + gentle LPF at 12 kHz (see audio.md)."""
    sos = signal.butter(4, 300, "highpass", fs=SR, output="sos")
    y = signal.sosfilt(sos, x)
    sos2 = signal.butter(2, 12000, "lowpass", fs=SR, output="sos")
    return signal.sosfilt(sos2, y)


def kloud_max(x: np.ndarray, win_s: float) -> float:
    xk = C.kweight(x[:, None])
    if len(x) < int(win_s * SR):
        xk = np.concatenate([xk, np.zeros((int(win_s * SR) - len(x), 1))])
    _, L = C.block_lufs(xk, SR, win_s, 0.005)
    return float(L.max())


def measure(path: str) -> dict:
    x = decode(path)
    r = {"file": os.path.basename(path), "file_dur_ms": round(1000 * len(x) / SR)}
    e = env_db(x)
    pk = e.max()
    ipk = int(e.argmax())
    above = np.where(e > pk - 30)[0]
    above40 = np.where(e > pk - 40)[0]
    r["dur_ms_-30dB"] = round(1000 * (above[-1] - above[0]) / SR)
    r["dur_ms_-40dB"] = round(1000 * (above40[-1] - above40[0]) / SR)
    # attack: first crossing of -20 dB rel. peak to the peak (on a 2 ms envelope)
    start = above[0]
    a20 = np.where(e[: ipk + 1] > pk - 20)[0]
    r["attack_ms"] = round(1000 * (ipk - (a20[0] if a20.size else ipk)) / SR, 1)
    r["peak_at_ms"] = round(1000 * (ipk - start) / SR, 1)
    post = e[ipk:]
    d20 = np.where(post < pk - 20)[0]
    r["decay20_ms"] = round(1000 * d20[0] / SR) if d20.size else None
    r["sample_peak_dbfs"] = round(20 * np.log10(np.abs(x).max() + 1e-12), 1)
    seg = x[above[0]: above[-1] + 1]
    r["rms_dbfs"] = round(10 * np.log10((seg ** 2).mean() + 1e-14), 1)
    r["crest_db"] = round(r["sample_peak_dbfs"] - r["rms_dbfs"], 1)
    r["kloud_max100ms"] = round(kloud_max(x, 0.1), 1)
    r["kloud_max400ms"] = round(kloud_max(x, 0.4), 1)
    y = phone_filter(x)
    r["phone_loss_db"] = round(r["kloud_max100ms"] - kloud_max(y, 0.1), 1)
    f, P = signal.welch(seg if len(seg) > 1024 else np.pad(seg, (0, 1024 - len(seg))), fs=SR, nperseg=min(4096, max(256, len(seg))))
    P = P + 1e-20
    cs = np.cumsum(P) / P.sum()
    r["centroid_hz"] = int((f * P).sum() / P.sum())
    r["f10_hz"], r["f50_hz"], r["f90_hz"] = [int(f[np.searchsorted(cs, q)]) for q in (0.1, 0.5, 0.9)]
    r["flatness"] = round(float(np.exp(np.mean(np.log(P[(f > 50) & (f < 16000)]))) / np.mean(P[(f > 50) & (f < 16000)])), 3)
    r["below150_pct"] = round(100 * float(P[f < 150].sum() / P.sum()), 1)
    r["peak_freq_hz"] = int(f[np.argmax(P)])
    # pitch trajectory for tonal sounds: dominant STFT peak at 3 points
    ff, tt, Z = signal.stft(x, fs=SR, nperseg=1024, noverlap=768)
    A = np.abs(Z)
    act = np.where(20 * np.log10(A.max(axis=0) + 1e-12) > 20 * np.log10(A.max() + 1e-12) - 25)[0]
    if act.size >= 3:
        pts = [act[0], act[len(act) // 2], act[-1]]
        r["dom_freq_start_mid_end_hz"] = [int(ff[np.argmax(A[:, i])]) for i in pts]
    return r


if __name__ == "__main__":
    out = [measure(p) for p in sys.argv[1:]]
    print(json.dumps(out, indent=1))
