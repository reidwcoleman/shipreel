"""Audio: EBU R128 loudness (ffmpeg ebur128), voice/music heuristics, spectral-flux
onsets, tempo + DP beat tracking (Ellis 2007), cut/text-to-onset alignment and SFX
lead/lag + level around visual events.

Conventions
  * time is the VIDEO timeline (audio start_time offset is corrected)
  * offset = audio_event_time - visual_event_time; negative = audio LEADS the picture
  * offsets are reported in frames at 30 fps (f30)
"""
from __future__ import annotations

import math
import re
import subprocess

import numpy as np
from scipy.ndimage import maximum_filter1d, uniform_filter1d

SR = 22050
NFFT = 1024
HOP = 256
FR = SR / HOP  # onset-envelope frame rate (~86.13 Hz)


def load_audio(path: str, sr: int = SR) -> np.ndarray:
    cmd = ["ffmpeg", "-v", "error", "-nostdin", "-i", path, "-vn", "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def loudness(path: str) -> dict:
    cmd = ["ffmpeg", "-nostdin", "-hide_banner", "-v", "info", "-i", path, "-vn",
           "-af", "ebur128=peak=true:framelog=info", "-f", "null", "-"]
    err = subprocess.run(cmd, capture_output=True, text=True).stderr
    out = {"lufs_i": None, "lra": None, "true_peak_dbtp": None, "momentary": [], "short_term": []}
    if "Summary:" in err:
        summ = err.split("Summary:")[-1]
        m = re.search(r"I:\s+(-?[\d.]+|-inf)\s+LUFS", summ)
        if m and m.group(1) != "-inf":
            out["lufs_i"] = float(m.group(1))
        m = re.search(r"LRA:\s+(-?[\d.]+)\s+LU", summ)
        if m:
            out["lra"] = float(m.group(1))
        m = re.search(r"True peak:\s+Peak:\s+(-?[\d.]+|-inf)\s+dBFS", summ, re.S)
        if m and m.group(1) != "-inf":
            out["true_peak_dbtp"] = float(m.group(1))
    for t, M, S in re.findall(r"t:\s*([\d.]+)\s+TARGET:.*?M:\s*(-?[\d.]+|-inf)\s+S:\s*(-?[\d.]+|-inf)", err):
        out["momentary"].append((float(t), float(M) if M != "-inf" else -120.0))
        out["short_term"].append((float(t), float(S) if S != "-inf" else -120.0))
    return out


def stft_mag(x: np.ndarray) -> np.ndarray:
    pad = NFFT // 2
    xp = np.pad(x, (pad, pad))
    if len(xp) < NFFT:
        xp = np.pad(xp, (0, NFFT - len(xp)))
    win = np.hanning(NFFT).astype(np.float32)
    frames = np.lib.stride_tricks.sliding_window_view(xp, NFFT)[::HOP]
    return np.abs(np.fft.rfft(frames * win, axis=1)).astype(np.float32)


def onset_envelopes(S: np.ndarray) -> dict:
    """SuperFlux-lite: log magnitude, 3-bin frequency max filter, 1-frame lag, half-wave rectified."""
    freqs = np.fft.rfftfreq(NFFT, 1 / SR)
    LS = np.log1p(100.0 * S)
    LSm = maximum_filter1d(LS, size=3, axis=1)
    d = np.maximum(0.0, LS[1:] - LSm[:-1])
    d = np.vstack([np.zeros((1, d.shape[1]), np.float32), d])
    bands = {"all": (0, SR / 2), "low": (0, 150), "mid": (150, 4000), "high": (4000, SR / 2)}
    out = {}
    for name, (lo, hi) in bands.items():
        m = (freqs >= lo) & (freqs < hi)
        out[name] = d[:, m].sum(axis=1)
    return out


def pick_onsets(o: np.ndarray, delta: float = 0.35, wait_s: float = 0.05) -> tuple[np.ndarray, np.ndarray]:
    """Adaptive peak picking. Returns (frame indices, local relative strength)."""
    if o.size < 5 or o.max() <= 0:
        return np.array([], int), np.array([])
    scale = np.percentile(o, 95) + 1e-9
    on = o / scale
    w_max = 3
    w_pre, w_post = 9, 6
    mx = maximum_filter1d(on, size=2 * w_max + 1)
    avg = uniform_filter1d(on, size=w_pre + w_post + 1, origin=(w_pre - w_post) // 2)
    loc_med = np.array([np.median(on[max(0, i - 130):i + 130]) for i in range(0, len(on), 43)])
    loc_med = np.interp(np.arange(len(on)), np.arange(0, len(on), 43), loc_med) + 1e-3
    peaks = []
    wait = int(round(wait_s * FR))
    last = -10 ** 9
    for i in range(1, len(on) - 1):
        if on[i] == mx[i] and on[i] >= avg[i] + delta and on[i] > 0.15 and i - last > wait:
            peaks.append(i)
            last = i
    peaks = np.array(peaks, int)
    strength = on[peaks] / loc_med[peaks] if peaks.size else np.array([])
    return peaks, strength


def tempo(o: np.ndarray, lo_bpm: float = 60, hi_bpm: float = 200) -> dict:
    if o.size < FR * 4:
        return {"bpm": None, "confidence": 0.0}
    x = o - uniform_filter1d(o, size=int(FR))  # remove slow trend
    x = np.maximum(x, 0)
    x = x - x.mean()
    n = len(x)
    f = np.fft.rfft(x, 2 * n)
    ac = np.fft.irfft(f * np.conj(f))[:n]
    ac /= ac[0] + 1e-12
    lags = np.arange(n)
    bpm = 60.0 * FR / np.maximum(lags, 1)
    valid = (bpm >= lo_bpm) & (bpm <= hi_bpm)
    prior = np.exp(-0.5 * (np.log2(bpm / 120.0) / 1.0) ** 2)
    score = np.where(valid, ac * prior, -np.inf)
    L = int(np.argmax(score))
    # parabolic refinement
    if 1 <= L < n - 1:
        y0, y1, y2 = ac[L - 1], ac[L], ac[L + 1]
        den = y0 - 2 * y1 + y2
        Lr = L + (0.5 * (y0 - y2) / den if abs(den) > 1e-12 else 0)
    else:
        Lr = L
    b = 60.0 * FR / Lr
    return {"bpm": round(float(b), 2), "confidence": round(float(ac[L]), 3), "period_s": round(float(Lr / FR), 4)}


def beat_track(o: np.ndarray, bpm: float, tightness: float = 100.0) -> np.ndarray:
    period = 60.0 * FR / bpm
    on = o / (o.std() + 1e-9)
    # local score: smooth with a gaussian of width period/32 (librosa-style)
    w = np.arange(-int(period), int(period) + 1)
    g = np.exp(-0.5 * (w * 32.0 / period) ** 2)
    local = np.convolve(on, g, mode="same")
    N = len(local)
    window = np.arange(-int(round(2 * period)), -int(round(period / 2)) + 1)
    txwt = -tightness * (np.log(-window / period)) ** 2
    cum = np.zeros(N)
    back = -np.ones(N, int)
    for i in range(N):
        z = i + window
        v = z >= 0
        if v.any():
            cand = cum[z[v]] + txwt[v]
            j = int(np.argmax(cand))
            cum[i] = local[i] + cand[j]
            back[i] = z[v][j]
        else:
            cum[i] = local[i]
    # last beat: highest cumulative score in the last period
    tail = cum[max(0, N - int(period)):]
    i = N - len(tail) + int(np.argmax(tail))
    beats = []
    while i >= 0:
        beats.append(i)
        i = back[i]
    return np.array(beats[::-1], int)


def voice_music(x: np.ndarray, S: np.ndarray) -> dict:
    """1-s windows (0.5-s hop): low-energy ratio, 2-8 Hz speech-band envelope modulation,
    voiced/unvoiced switching rate, bass ratio -> speech score; music = sustained energy
    with low modulation; silence below -55 dBFS RMS."""
    freqs = np.fft.rfftfreq(NFFT, 1 / SR)
    band = (freqs >= 300) & (freqs <= 3400)
    env = np.sqrt((S[:, band] ** 2).sum(axis=1))  # speech-band envelope @ FR
    tot = (S ** 2).sum(axis=1) + 1e-12
    bass = (S[:, freqs < 150] ** 2).sum(axis=1) / tot
    # voicing per 30 ms frame
    fl = int(0.03 * SR)
    nfr = len(x) // fl
    voiced = np.zeros(nfr, bool)
    fr_rms = np.zeros(nfr)
    for i in range(nfr):
        seg = x[i * fl:(i + 1) * fl]
        seg = seg - seg.mean()
        e = float((seg ** 2).sum())
        fr_rms[i] = math.sqrt(e / fl)
        if e < 1e-6:
            continue
        ac = np.correlate(seg, seg, "full")[fl - 1:]
        lo, hi = int(SR / 400), int(SR / 80)
        voiced[i] = ac[lo:hi].max() / (ac[0] + 1e-12) > 0.45
    sub = int(0.02 * SR)
    win_s, hop_s = 1.0, 0.5
    out_w = []
    t = 0.0
    dur = len(x) / SR
    while t + win_s <= dur + 1e-6:
        a, b = int(t * SR), int((t + win_s) * SR)
        seg = x[a:b]
        rms = math.sqrt(float((seg ** 2).mean()) + 1e-12)
        db = 20 * math.log10(rms + 1e-12)
        subr = np.sqrt((seg[: len(seg) // sub * sub].reshape(-1, sub) ** 2).mean(axis=1) + 1e-12)
        ler = float((subr < 0.5 * subr.mean()).mean())
        # modulation of the speech-band envelope over a 2-s window centred here
        ca, cb = int(max(0, (t - 0.5)) * FR), int(min(dur, t + 1.5) * FR)
        e_ = env[ca:cb]
        mod = 0.0
        if len(e_) > 32:
            e2 = e_ - e_.mean()
            sp = np.abs(np.fft.rfft(e2 * np.hanning(len(e2)))) ** 2
            mf = np.fft.rfftfreq(len(e2), 1 / FR)
            num = sp[(mf >= 2) & (mf <= 8)].sum()
            den = sp[(mf >= 0.5) & (mf <= 20)].sum() + 1e-12
            mod = float(num / den)
        va, vb = int(t / 0.03), int((t + win_s) / 0.03)
        vv = voiced[va:vb]
        vtr = float((np.diff(vv.astype(int)) != 0).sum() / win_s) if vv.size > 1 else 0.0
        vfrac = float(vv.mean()) if vv.size else 0.0
        bs = float(bass[int(t * FR):int((t + win_s) * FR)].mean()) if len(bass) else 0.0
        score = (3.0 * (ler - 0.22) / 0.12 + 2.0 * (mod - 0.45) / 0.15 + 1.5 * (vtr - 4.0) / 2.0
                 - 1.5 * (bs - 0.2) / 0.15)
        p = 1 / (1 + math.exp(-score))
        label = "silence" if db < -55 else ("speech" if p > 0.6 else ("music" if p < 0.4 else "mixed"))
        out_w.append({"t": round(t, 2), "db": round(db, 1), "ler": round(ler, 3), "mod": round(mod, 3),
                      "vtr": round(vtr, 2), "vfrac": round(vfrac, 2), "bass": round(bs, 3),
                      "p_speech": round(p, 3), "label": label})
        t += hop_s
    labs = [w["label"] for w in out_w]
    nW = max(1, len(labs))
    frac = {k: round(labs.count(k) / nW, 3) for k in ("speech", "music", "mixed", "silence")}
    if frac["speech"] + 0.5 * frac["mixed"] >= 0.45:
        cls = "speech-led"
    elif frac["music"] + 0.5 * frac["mixed"] >= 0.45:
        cls = "music-led"
    elif frac["silence"] > 0.5:
        cls = "mostly-silent"
    else:
        cls = "mixed"
    # floor under speech (bed level): 10th vs 90th percentile of 30-ms RMS inside speech windows
    sp_mask = np.zeros(nfr, bool)
    for w in out_w:
        if w["label"] == "speech":
            sp_mask[int(w["t"] / 0.03):int((w["t"] + 1.0) / 0.03)] = True
    floor_rel = None
    if sp_mask.sum() > 30:
        r = 20 * np.log10(fr_rms[sp_mask[: len(fr_rms)]] + 1e-9)
        floor_rel = round(float(np.percentile(r, 10) - np.percentile(r, 90)), 1)
    return {"class": cls, "fractions": frac, "speech_floor_rel_db": floor_rel, "windows": out_w}


def _env_db(x: np.ndarray, hop: int = 220) -> np.ndarray:
    n = len(x) // hop
    if n == 0:
        return np.array([])
    r = np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(axis=1) + 1e-12)
    return 20 * np.log10(r + 1e-9)


def event_audio(t_events: list[float], onset_t: np.ndarray, onset_str: np.ndarray, x: np.ndarray, S: np.ndarray,
                lead_f30: int = 10, lag_f30: int = 6, strong: float = 2.5) -> list[dict]:
    """For each visual event time (video timeline, s): nearest onset, strongest transient
    in [-lead, +lag] frames @30, and the broadband-envelope accent (SFX) around it."""
    env = _env_db(x)  # 10 ms hop at 22050/220
    efr = SR / 220.0
    freqs = np.fft.rfftfreq(NFFT, 1 / SR)
    out = []
    for te in t_events:
        d = {"t": round(te, 4)}
        if onset_t.size:
            j = int(np.argmin(np.abs(onset_t - te)))
            d["nearest_onset_f30"] = round(float((onset_t[j] - te) * 30), 2)
            d["nearest_onset_strength"] = round(float(onset_str[j]), 2)
            m = (onset_t >= te - lead_f30 / 30) & (onset_t <= te + lag_f30 / 30) & (onset_str >= strong)
            if m.any():
                jj = np.flatnonzero(m)[int(np.argmax(onset_str[m]))]
                d["transient_f30"] = round(float((onset_t[jj] - te) * 30), 2)
                d["transient_strength"] = round(float(onset_str[jj]), 2)
        # accent: envelope peak vs local bed
        i0 = int(te * efr)
        a, b = int((te - 1.5) * efr), int((te + 1.5) * efr)
        ia, ib = int((te - 0.4) * efr), int((te + 0.3) * efr)
        if a >= 0 and b < len(env) and ib > ia:
            bed_idx = np.r_[a:int((te - 0.5) * efr), int((te + 0.4) * efr):b]
            bed = float(np.median(env[bed_idx])) if bed_idx.size else float(np.median(env[a:b]))
            seg = env[ia:ib]
            k = int(np.argmax(seg))
            peak = float(seg[k])
            rise = peak - bed
            d["bed_db"] = round(bed, 1)
            d["accent_db"] = round(rise, 1)
            if rise >= 4.0:
                pk = ia + k
                st = pk
                while st > a and env[st - 1] > bed + 3:
                    st -= 1
                en = pk
                while en < b - 1 and env[en + 1] > bed + 3:
                    en += 1
                d["accent_peak_f30"] = round((pk / efr - te) * 30, 2)
                d["accent_start_f30"] = round((st / efr - te) * 30, 2)
                d["accent_len_ms"] = round((en - st + 1) / efr * 1000, 0)
                # spectral shape at the peak
                sf = int(pk / efr * FR)
                if 0 <= sf < len(S):
                    sp = S[sf] + 1e-9
                    cen = float((freqs * sp).sum() / sp.sum())
                    flat = float(np.exp(np.mean(np.log(sp))) / np.mean(sp))
                    d["accent_centroid_hz"] = round(cen, 0)
                    d["accent_flatness"] = round(flat, 3)
                    L = d["accent_len_ms"]
                    if cen < 300:
                        g = "boom/low-hit"
                    elif L >= 150 and flat > 0.15 and d["accent_start_f30"] <= -3:
                        g = "whoosh/riser"
                    elif L <= 90:
                        g = "click/pop"
                    elif flat < 0.05:
                        g = "tonal (ding/note)"
                    else:
                        g = "hit/other"
                    d["accent_guess"] = g
        out.append(d)
    return out


def summarize_alignment(ev: list[dict], key: str, n_frames: float, onset_t: np.ndarray, dur: float,
                        tol=(1, 2, 3)) -> dict | None:
    vals = np.array([e[key] for e in ev if key in e], float)
    if vals.size == 0:
        return None
    res = {"n": int(vals.size), "median_signed_f30": round(float(np.median(vals)), 2),
           "median_abs_f30": round(float(np.median(np.abs(vals))), 2)}
    for t in tol:
        res[f"pct_within_{t}f"] = round(float((np.abs(vals) <= t).mean() * 100), 1)
    # random baseline: fraction of the timeline within +-t frames of an onset
    if onset_t.size and dur > 0:
        grid = np.arange(0, dur, 1 / 120.0)
        idx = np.searchsorted(onset_t, grid)
        lo = np.abs(grid - onset_t[np.clip(idx - 1, 0, onset_t.size - 1)])
        hi = np.abs(onset_t[np.clip(idx, 0, onset_t.size - 1)] - grid)
        dist_f = np.minimum(lo, hi) * 30
        for t in tol:
            base = float((dist_f <= t).mean() * 100)
            res[f"baseline_pct_within_{t}f"] = round(base, 1)
            res[f"lift_{t}f"] = round(res[f"pct_within_{t}f"] / base, 2) if base > 0 else None
    return res


def analyze_audio(path: str, a_offset: float, dur_video: float) -> dict:
    x = load_audio(path)
    if x.size < SR // 2:
        return {"present": False}
    # put audio on the video timeline: sample k is at video time k/SR + a_offset
    if a_offset > 0:
        x = np.concatenate([np.zeros(int(round(a_offset * SR)), np.float32), x])
    elif a_offset < 0:
        x = x[int(round(-a_offset * SR)):]
    S = stft_mag(x)
    env = onset_envelopes(S)
    pk, st = pick_onsets(env["all"])
    onset_t = pk / FR
    pkl, stl = pick_onsets(env["low"])
    pkh, sth = pick_onsets(env["high"])
    tp = tempo(env["all"])
    beats = beat_track(env["all"], tp["bpm"]) if tp.get("bpm") else np.array([], int)
    loud = loudness(path)
    vm = voice_music(x, S)
    peak = float(np.abs(x).max()) if x.size else 0.0
    rms = float(np.sqrt((x ** 2).mean())) if x.size else 0.0
    return {
        "present": True,
        "x": x, "S": S, "onset_env": env,
        "onset_t": onset_t, "onset_str": st,
        "onset_low_t": pkl / FR, "onset_high_t": pkh / FR,
        "beats_t": beats / FR,
        "tempo": tp,
        "loudness": {k: loud[k] for k in ("lufs_i", "lra", "true_peak_dbtp")},
        "momentary": loud["momentary"],
        "voice_music": vm,
        "sample_peak_dbfs": round(20 * math.log10(peak + 1e-12), 2),
        "rms_dbfs": round(20 * math.log10(rms + 1e-12), 2),
        "onsets_per_s": round(onset_t.size / max(dur_video, 1e-6), 3),
        "strong_onsets_per_s": round(float((st >= 2.5).sum()) / max(dur_video, 1e-6), 3),
    }
