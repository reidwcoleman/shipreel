"""Shared helpers for the audio research (read-only on refs; writes only to a work dir).

Run every script with `python3 -I` (downloads are untrusted data; nothing in refs/ is ever imported).
"""
from __future__ import annotations

import json
import os
import re
import subprocess

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
WORK = os.environ.get("AUDIO_WORK", "/tmp/audio-work")


def run(cmd: list[str], check=True) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, check=check)


def extract(src: str, out: str, ch: int = 2, sr: int = SR) -> str:
    """Decode any media file to float32 WAV (48 kHz)."""
    if not os.path.exists(out):
        os.makedirs(os.path.dirname(out), exist_ok=True)
        run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vn", "-ac", str(ch), "-ar", str(sr), "-c:a", "pcm_f32le", out])
    return out


def load(wav: str) -> tuple[int, np.ndarray]:
    sr, x = wavfile.read(wav)
    x = x.astype(np.float64)
    if x.ndim == 1:
        x = x[:, None]
    return sr, x


def work_wav(src: str, tag: str, ch: int = 2) -> tuple[int, np.ndarray]:
    out = os.path.join(WORK, "wav", f"{tag}.{ch}ch.wav")
    extract(src, out, ch=ch)
    return load(out)


# --- BS.1770 K-weighting (48 kHz coefficients) --------------------------------------------
_K1 = ([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585])
_K2 = ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])


def kweight(x: np.ndarray) -> np.ndarray:
    y = signal.lfilter(*_K1, x, axis=0)
    return signal.lfilter(*_K2, y, axis=0)


def block_lufs(xk: np.ndarray, sr: int, win_s: float, hop_s: float) -> tuple[np.ndarray, np.ndarray]:
    """Loudness (LUFS, channel-summed, ungated) of sliding blocks of K-weighted audio. Returns (t_center, L)."""
    win, hop = int(win_s * sr), int(hop_s * sr)
    p = (xk ** 2).sum(axis=1)
    c = np.concatenate([[0.0], np.cumsum(p)])
    starts = np.arange(0, max(1, len(p) - win + 1), hop)
    ms = (c[starts + win] - c[starts]) / win
    L = -0.691 + 10 * np.log10(np.maximum(ms, 1e-12))
    return (starts + win / 2) / sr, L


def ebur128(src: str) -> dict:
    """Integrated loudness, LRA and true peak via ffmpeg's ebur128 (on the original stream)."""
    p = run(["ffmpeg", "-hide_banner", "-nostats", "-i", src, "-vn", "-af", "ebur128=peak=true+sample", "-f", "null", "-"], check=False)
    s = p.stderr[p.stderr.rfind("Summary:"):]
    g = lambda pat: (float(m.group(1)) if (m := re.search(pat, s, re.S)) else None)
    return {
        "I": g(r"I:\s+(-?[\d.]+|-inf) LUFS"),
        "LRA": g(r"LRA:\s+(-?[\d.]+) LU"),
        "LRA_low": g(r"LRA low:\s+(-?[\d.]+)"),
        "LRA_high": g(r"LRA high:\s+(-?[\d.]+)"),
        "TP": g(r"True peak:\s+Peak:\s+(-?[\d.]+|-inf)"),
        "SP": g(r"Sample peak:\s+Peak:\s+(-?[\d.]+|-inf)"),
    }


def probe(src: str) -> dict:
    p = run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,r_frame_rate,avg_frame_rate,width,height,bit_rate,sample_rate:format=duration", "-of", "json", src])
    return json.loads(p.stdout)


def video_fps(src: str) -> float | None:
    for s in probe(src).get("streams", []):
        if s.get("codec_type") == "video":
            n, d = s.get("avg_frame_rate", "0/1").split("/")
            if float(d) and float(n):
                return float(n) / float(d)
            n, d = s.get("r_frame_rate", "0/1").split("/")
            return float(n) / float(d) if float(d) else None
    return None


def gray_frames(src: str, w: int = 72, h: int = 128) -> tuple[np.ndarray, float]:
    """All video frames as small grayscale thumbnails, plus their PTS-based rate."""
    fps = video_fps(src)
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-an", "-vf", f"scale={w}:{h}:flags=area,format=gray", "-fps_mode", "passthrough", "-f", "rawvideo", "-"], capture_output=True, check=True)
    a = np.frombuffer(p.stdout, np.uint8)
    n = a.size // (w * h)
    return a[: n * w * h].reshape(n, h, w).astype(np.float32), fps


def cut_frames(frames: np.ndarray, min_gap: int = 4) -> tuple[list[int], np.ndarray]:
    """Hard cuts: frame i where the frame-to-frame difference spikes (i = first frame of the new shot)."""
    d = np.abs(np.diff(frames, axis=0)).mean(axis=(1, 2))
    # histogram difference too (robust to small motion)
    hist = np.stack([np.histogram(f, bins=32, range=(0, 256))[0] for f in frames]).astype(np.float32)
    hist /= hist.sum(axis=1, keepdims=True)
    hd = 0.5 * np.abs(np.diff(hist, axis=0)).sum(axis=1)
    score = d / 255.0 + hd
    cuts = []
    for i in range(len(score)):
        lo, hi = max(0, i - 15), min(len(score), i + 16)
        local = np.median(score[lo:hi])
        prev_ = score[i - 1] if i > 0 else 0
        next_ = score[i + 1] if i + 1 < len(score) else 0
        if score[i] > 0.12 and score[i] > 3.0 * max(local, 0.01) and score[i] >= prev_ and score[i] >= next_:
            if cuts and i - cuts[-1] < min_gap:
                if score[i] > score[cuts[-1]]:
                    cuts[-1] = i
                continue
            cuts.append(i)
    return [c + 1 for c in cuts], score


def stft_db(x: np.ndarray, sr: int, n_fft: int = 2048, hop: int = 240) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Magnitude STFT in dB of a mono signal. Returns (freqs, times, S_db[f, t])."""
    f, t, Z = signal.stft(x, fs=sr, nperseg=n_fft, noverlap=n_fft - hop, boundary=None, padded=False)
    S = 20 * np.log10(np.abs(Z) + 1e-9)
    return f, t, S


def onset_env(x: np.ndarray, sr: int, hop: int = 240, n_fft: int = 1024, fmin: float = 30, fmax: float = 16000) -> tuple[np.ndarray, np.ndarray]:
    """Log-spectral flux onset envelope (half-wave rectified), hop 5 ms at 48 kHz."""
    f, t, Z = signal.stft(x, fs=sr, nperseg=n_fft, noverlap=n_fft - hop, boundary=None, padded=False)
    M = np.log1p(100 * np.abs(Z[(f >= fmin) & (f <= fmax)]))
    flux = np.maximum(0, np.diff(M, axis=1)).sum(axis=0)
    flux = np.concatenate([[0], flux])
    return t, flux


def peaks(env: np.ndarray, t: np.ndarray, k: float = 1.5, win: int = 100, min_dist: int = 10) -> list[tuple[float, float]]:
    """Adaptive-threshold peak picking: (time, strength / local median)."""
    med = signal.medfilt(env, 2 * (win // 2) + 1) if len(env) > win else np.full_like(env, np.median(env))
    mad = np.median(np.abs(env - np.median(env))) + 1e-9
    idx, _ = signal.find_peaks(env, distance=min_dist)
    out = []
    for i in idx:
        if env[i] > med[i] + k * mad * 3 and env[i] > 1.3 * med[i]:
            out.append((float(t[i]), float(env[i] / (med[i] + 1e-9))))
    return out
