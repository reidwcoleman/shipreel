#!/usr/bin/env python3
"""Generate synthetic validation clips with exact ground truth (1080x1920, 30 fps,
H.264 CRF 18 yuv420p, same as Shipreel renders).

  cam.mp4     camera moves: punch-in 1.0->1.2 / 6 f (ease-out cubic), punch-out, Ken Burns,
              impact shake, damped 7.5 Hz shake, zoom-cut x1.15, 300 px/s pan, hand-held,
              Remotion SNAPPY spring punch-in 1.0->1.12
  trans.mp4   Shipreel SceneShell transitions (cut, fade 9, slide-left 10, slide-up 10,
              zoom 9, whip 7) + fade-through-black 12, 2-frame white flash, jump cut
  xfade.mp4   third-party ffmpeg xfade transitions (fade, fadeblack, slideleft, slideup,
              zoomin, wipeleft, dissolve)
  sync.mp4    120 BPM synthetic music, cuts on/off the beat by known frames, whooshes
              that peak 1 frame before cuts, pops on caption appearances at known offsets
  tone.mp4    stereo 997 Hz sine at -23 dBFS peak (R128 calibration: -23.0 LUFS, -23.0 dBTP)
  speech.mp4 / music.mp4 / speech_bed.mp4   voice/music heuristics (macOS `say`)

Usage: python3 -I synth.py <outdir>     (writes <outdir>/*.mp4 and <outdir>/truth.json)
"""
from __future__ import annotations

import json
import math
import os
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1080, 1920, 30
BW, BH = 1620, 2880  # base images (1.5x) so moves never show edges
OFF = np.array([(BW - W) / 2, (BH - H) / 2])
FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
ASR = 48000


def font(sz):
    try:
        return ImageFont.truetype(FONT, sz)
    except OSError:
        return ImageFont.load_default()


def make_scene(seed: int, kind: str) -> np.ndarray:
    rng = np.random.default_rng(seed)
    if kind == "photo":
        base = np.zeros((BH // 8, BW // 8, 3), np.float32)
        for _ in range(14):
            c = rng.uniform(0, 255, 3)
            cx, cy, r = rng.uniform(0, BW // 8), rng.uniform(0, BH // 8), rng.uniform(15, 80)
            yy, xx = np.mgrid[0:BH // 8, 0:BW // 8]
            m = np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * r * r))[..., None]
            base = base * (1 - m) + c * m
        img = cv2.resize(base, (BW, BH), interpolation=cv2.INTER_CUBIC)
        tex = rng.normal(0, 14, (BH // 2, BW // 2, 1)).astype(np.float32)
        tex = cv2.resize(cv2.GaussianBlur(tex, (0, 0), 1.2), (BW, BH))[..., None]
        img = np.clip(img + tex, 0, 255).astype(np.uint8)
        pil = Image.fromarray(img)
        d = ImageDraw.Draw(pil)
        for _ in range(40):
            x, y = rng.uniform(0, BW), rng.uniform(0, BH)
            s = rng.uniform(20, 90)
            col = tuple(int(v) for v in rng.uniform(0, 255, 3))
            if rng.random() < 0.5:
                d.ellipse([x, y, x + s, y + s], fill=col)
            else:
                d.rectangle([x, y, x + s, y + s * 0.6], fill=col)
        return np.array(pil)
    # UI-like scene
    dark = kind == "ui_dark"
    bg = (18, 18, 22) if dark else (245, 245, 247)
    fg = (235, 235, 240) if dark else (20, 20, 24)
    pil = Image.new("RGB", (BW, BH), bg)
    d = ImageDraw.Draw(pil)
    acc = tuple(int(v) for v in rng.uniform(40, 230, 3))
    y = 80
    while y < BH - 200:
        h = int(rng.uniform(160, 380))
        x0 = int(rng.uniform(40, 120))
        card = (34, 34, 40) if dark else (255, 255, 255)
        d.rounded_rectangle([x0, y, BW - x0, y + h], radius=36, fill=card, outline=acc if rng.random() < 0.3 else None, width=4)
        d.ellipse([x0 + 30, y + 30, x0 + 130, y + 130], fill=acc)
        words = ["Revenue", "Streak", "Habits", "Focus", "MRR", "Workout", "Inbox", "Today", "Goals", "Sleep"]
        d.text((x0 + 160, y + 34), f"{words[int(rng.integers(0, len(words)))]} {int(rng.integers(10, 999))}", font=font(64), fill=fg)
        for k in range(int(rng.integers(1, 4))):
            ww = int(rng.uniform(300, BW - 2 * x0 - 220))
            d.rounded_rectangle([x0 + 160, y + 120 + k * 50, x0 + 160 + ww, y + 150 + k * 50], radius=12,
                                fill=(70, 70, 80) if dark else (200, 200, 208))
        y += h + int(rng.uniform(30, 70))
    return np.array(pil)


def render_view(base: np.ndarray, s=1.0, rot_deg=0.0, tx=0.0, ty=0.0, fx=0.5, fy=0.5,
                blur=0.0, interp=cv2.INTER_LINEAR) -> np.ndarray:
    """Camera view: content scaled by s about focus (fx,fy of the output), rotated, translated by (tx,ty) px."""
    f = np.array([fx * W, fy * H])
    th = math.radians(rot_deg)
    A = s * np.array([[math.cos(th), -math.sin(th)], [math.sin(th), math.cos(th)]])
    # forward map base->out: p = A (q - OFF - f) + f + t
    t = np.array([tx, ty])
    b = -A @ (OFF + f) + f + t
    M = np.hstack([A, b[:, None]])
    out = cv2.warpAffine(base, M, (W, H), flags=interp, borderMode=cv2.BORDER_REFLECT)
    if blur > 0:
        k = int(blur) * 2 + 1
        out = cv2.blur(out, (k, 1))
    return out


class Encoder:
    def __init__(self, path, fps=FPS, size=(W, H)):
        self.p = subprocess.Popen(
            ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{size[0]}x{size[1]}",
             "-r", str(fps), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
             "-movflags", "+faststart", path], stdin=subprocess.PIPE)
        self.n = 0

    def write(self, frame):
        self.p.stdin.write(np.ascontiguousarray(frame, np.uint8).tobytes())
        self.n += 1

    def close(self):
        self.p.stdin.close()
        self.p.wait()


def ease_out_cubic(t):
    return 1 - (1 - t) ** 3


def remotion_spring(n_frames, fps=30, damping=14.0, stiffness=180.0, mass=0.6):
    """Remotion-like spring 0->1 sampled per frame (semi-implicit Euler, 1 ms steps)."""
    x, v = 0.0, 0.0
    out = [0.0]
    dt = 0.001
    steps = int(round(1000 / fps))
    for _ in range(n_frames):
        for _ in range(steps):
            a = (-stiffness * (x - 1.0) - damping * v) / mass
            v += a * dt
            x += v * dt
        out.append(x)
    return np.array(out)


# ------------------------------------------------------------------ cam.mp4
def gen_cam(outdir, truth):
    scenes = [make_scene(1, "photo"), make_scene(2, "ui_light"), make_scene(3, "photo"), make_scene(4, "photo"),
              make_scene(5, "ui_dark"), make_scene(6, "photo"), make_scene(7, "photo")]
    enc = Encoder(os.path.join(outdir, "cam.mp4"))
    rng = np.random.default_rng(42)
    gt = {"punches": [], "zoom_cuts": [], "slow_zooms": [], "shakes": [], "pans": [], "handheld": [], "cuts": []}
    # shot A: frames 0-89 (scene 0)
    for n in range(0, 90):
        if n <= 30:
            s = 1.0
        elif n <= 36:
            s = 1 + 0.2 * ease_out_cubic((n - 30) / 6)
        elif n <= 66:
            s = 1.2
        elif n <= 72:
            s = 1.2 - 0.2 * (n - 66) / 6
        else:
            s = 1.0
        enc.write(render_view(scenes[0], s=s, fx=0.5, fy=0.35))
    gt["punches"].append({"start_frame": 30, "end_frame": 36, "dur_frames": 6, "magnitude": 1.2, "direction": "in",
                          "easing": "ease_out_cubic", "t50": 0.206, "focus": [0.5, 0.35]})
    gt["punches"].append({"start_frame": 66, "end_frame": 72, "dur_frames": 6, "magnitude": round(1 / 1.2, 4),
                          "direction": "out", "easing": "linear", "t50": 0.5})
    # cut at 90 -> shot B: Ken Burns 1.04 -> 1.14 linear over 120 frames
    gt["cuts"].append(90)
    for n in range(90, 210):
        s = 1.04 + 0.10 * (n - 90) / 119
        enc.write(render_view(scenes[1], s=s))
    gt["slow_zooms"].append({"start_frame": 90, "end_frame": 209, "rate_pct_per_s": round((math.pow(1.14 / 1.04, 30 / 119) - 1) * 100, 3),
                             "total": round(1.14 / 1.04, 4)})
    # cut at 210 -> shot C: impact shake at 240 (8 frames, 12 px decaying, random dir, +-1 deg), damped 7.5 Hz at 265
    gt["cuts"].append(210)
    impact = {}
    for k in range(8):
        amp = 12 * (1 - k / 8)
        ang = rng.uniform(0, 2 * math.pi)
        impact[240 + k] = (amp * math.cos(ang), amp * math.sin(ang), (1 if rng.random() < 0.5 else -1) * 1.0 * (1 - k / 8))
    for n in range(210, 300):
        tx = ty = r = 0.0
        if n in impact:
            tx, ty, r = impact[n]
        if 265 <= n < 296:
            k = n - 265
            tx = 10 * math.sin(2 * math.pi * 7.5 * k / 30 + math.pi / 2 * 0) * math.exp(-k / 6)
            r = 0.5 * math.sin(2 * math.pi * 7.5 * k / 30) * math.exp(-k / 6)
        enc.write(render_view(scenes[2], tx=tx, ty=ty, rot_deg=r))
    gt["shakes"].append({"start_frame": 240, "end_frame": 248, "dur_frames": 8, "amp_peak_px": 12.0, "rot_peak_deg": 1.0,
                         "kind": "impact random-direction, linear decay"})
    gt["shakes"].append({"start_frame": 265, "end_frame": 295, "freq_hz": 7.5, "amp_peak_px": round(10 * math.exp(-1 / 6), 2),
                         "decay_tau_frames": 6.0, "rot_peak_deg": 0.5, "kind": "damped sine"})
    # zoom cut at 300: same scene x1.15 instantly
    gt["zoom_cuts"].append({"frame": 300, "scale_ratio": 1.15})
    for n in range(300, 360):
        enc.write(render_view(scenes[2], s=1.15))
    # cut at 360 -> pan 300 px/s (10 px/frame) frames 375..435
    gt["cuts"].append(360)
    for n in range(360, 450):
        tx = -150 + 10 * min(max(n - 375, 0), 60)
        enc.write(render_view(scenes[3], tx=tx))
    gt["pans"].append({"start_frame": 375, "end_frame": 435, "speed_px_s": 300.0, "dist_px": 600.0, "axis": "horizontal"})
    # cut at 450 -> hand-held micro motion (+-3 px, +-0.3 deg, 0.7/1.3 Hz)
    gt["cuts"].append(450)
    ph = rng.uniform(0, 2 * math.pi, 6)
    hx, hy, hr = [], [], []
    for n in range(450, 540):
        t = (n - 450) / FPS
        x = 1.8 * math.sin(2 * math.pi * 0.7 * t + ph[0]) + 1.2 * math.sin(2 * math.pi * 1.3 * t + ph[1])
        y = 1.8 * math.sin(2 * math.pi * 0.6 * t + ph[2]) + 1.2 * math.sin(2 * math.pi * 1.1 * t + ph[3])
        r = 0.18 * math.sin(2 * math.pi * 0.5 * t + ph[4]) + 0.12 * math.sin(2 * math.pi * 0.9 * t + ph[5])
        hx.append(x); hy.append(y); hr.append(r)
        enc.write(render_view(scenes[4], tx=x, ty=y, rot_deg=r))
    gt["handheld"].append({"start_frame": 450, "end_frame": 539, "x": hx, "y": hy, "rot": hr,
                           "peak_px": round(float(np.max(np.hypot(hx, hy))), 2)})
    # cut at 540 -> SNAPPY spring punch-in 1.0 -> 1.12 starting at 555
    gt["cuts"].append(540)
    sp = remotion_spring(40)
    for n in range(540, 630):
        k = n - 555
        s = 1.0 if k <= 0 else 1 + 0.12 * sp[min(k, 40)]
        enc.write(render_view(scenes[5], s=s, fx=0.5, fy=0.45))
    pk = float(sp.max())
    t90 = int(np.argmax(sp >= 0.9))
    gt["punches"].append({"start_frame": 555, "magnitude": 1.12, "direction": "in", "easing": "spring_overshoot",
                          "overshoot_pct": round((pk - 1) * 100, 2), "frames_to_90pct": t90,
                          "spring": {"damping": 14, "stiffness": 180, "mass": 0.6}})
    enc.close()
    truth["cam"] = {"frames": 630, **gt}


# ------------------------------------------------------------------ trans.mp4 (Shipreel SceneShell)
def shell_compose(A, B, kind, t_lin):
    """Replicate ShipreelVideo.tsx SceneShell: incoming B on top of outgoing A at eased progress."""
    t = ease_out_cubic(t_lin)
    if kind == "fade":
        return (A * (1 - t) + B * t).astype(np.uint8)
    if kind in ("slide-left", "slide-up"):
        horiz = kind == "slide-left"
        sa = -t * 0.28
        if horiz:
            a = _shift(A, sa * W, 0)
            b = _shift(B, (1 - t) * W, 0)
        else:
            a = _shift(A, 0, sa * H)
            b = _shift(B, 0, (1 - t) * H)
        a = (a.astype(np.float32) * (1 - 0.5 * t))
        mask = _shift(np.ones(A.shape[:2], np.float32), (1 - t) * W if horiz else 0, 0 if horiz else (1 - t) * H, border=0)[..., None]
        return (a * (1 - mask) + b.astype(np.float32) * mask).clip(0, 255).astype(np.uint8)
    if kind == "zoom":
        a = _scale(A, 1 + 0.18 * t)
        b = _scale(B, 1.28 - 0.28 * t)
        return (a * (1 - t) + b * t).astype(np.uint8)
    if kind == "whip":
        a = _shift(A, t * 1.05 * W, 0)
        a = _gblur(a, t * 18)
        b = _shift(B, -(1 - t) * 1.05 * W, 0)
        b = _gblur(b, (1 - t) * 18)
        mask = _shift(np.ones(A.shape[:2], np.float32), -(1 - t) * 1.05 * W, 0, border=0)
        mask = _gblur(mask, (1 - t) * 18)[..., None] if (1 - t) > 0 else mask[..., None]
        bg = np.zeros_like(A, np.float32)  # scene bg behind both
        amask = _gblur(_shift(np.ones(A.shape[:2], np.float32), t * 1.05 * W, 0, border=0), t * 18)[..., None]
        out = bg * (1 - amask) + a.astype(np.float32) * amask
        out = out * (1 - mask) + b.astype(np.float32) * mask
        return out.clip(0, 255).astype(np.uint8)
    raise ValueError(kind)


def _shift(img, dx, dy, border=None):
    M = np.float32([[1, 0, dx], [0, 1, dy]])
    h, w = img.shape[:2]
    return cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)


def _scale(img, s):
    h, w = img.shape[:2]
    M = cv2.getRotationMatrix2D((w / 2, h / 2), 0, s)
    return cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)


def _gblur(img, px):
    if px < 0.3:
        return img
    # CSS blur(px) == gaussian with sigma = px
    return cv2.GaussianBlur(img, (0, 0), px)


def gen_trans(outdir, truth):
    kinds = ["photo", "ui_light", "photo", "ui_dark", "photo", "ui_light", "photo", "photo", "ui_dark", "photo", "photo"]
    scenes = [render_view(make_scene(100 + i, k)) for i, k in enumerate(kinds)]
    # scene i shown for 45 frames; transitions eat into the previous scene (Shipreel timeline semantics)
    plan = [("cut", 0), ("fade", 9), ("slide-left", 10), ("slide-up", 10), ("zoom", 9), ("whip", 7),
            ("fade_black", 12), ("flash2", 2), ("jump", 0), ("cut", 0)]
    enc = Encoder(os.path.join(outdir, "trans.mp4"))
    gt = []
    n = 0
    hold = 45
    for i in range(len(scenes)):
        A = scenes[i]
        for _ in range(hold):
            enc.write(A); n += 1
        if i == len(scenes) - 1:
            break
        kind, L = plan[i]
        B = scenes[i + 1]
        if kind == "jump":
            # same framing, content slightly moved: a talking-head style jump cut
            B = render_view(make_scene(100 + i, kinds[i]), tx=40, ty=12)
            scenes[i + 1] = B
            gt.append({"type": "jump_cut", "frame": n})
            continue
        if kind == "cut":
            gt.append({"type": "cut", "frame": n})
            continue
        if kind == "fade_black":
            for k in range(L):
                tl = (k + 1) / (L + 1)
                if tl < 0.5:
                    fr = (A.astype(np.float32) * (1 - tl * 2)).astype(np.uint8)
                else:
                    fr = (B.astype(np.float32) * ((tl - 0.5) * 2)).astype(np.uint8)
                enc.write(fr); n += 1
            gt.append({"type": "fade_black", "frame": n - L, "dur_frames": L})
            continue
        if kind == "flash2":
            white = np.full_like(A, 255)
            enc.write(white); enc.write((white * 0.6 + B * 0.4).astype(np.uint8)); n += 2
            gt.append({"type": "flash", "frame": n - 2, "dur_frames": 2})
            continue
        for k in range(L):
            enc.write(shell_compose(A, B, kind, k / L)); n += 1
        gt.append({"type": {"fade": "dissolve", "slide-left": "slide/push", "slide-up": "slide/push", "zoom": "zoom", "whip": "whip"}[kind],
                   "shipreel": kind, "frame": n - L + 1, "dur_frames": L - 1,
                   "note": "frame n-L is A itself (t=0), so L-1 frames are visibly blended"})
    enc.close()
    truth["trans"] = {"frames": n, "boundaries": gt}


def gen_xfade(outdir, truth):
    kinds = ["photo", "ui_light", "photo", "ui_dark", "photo", "ui_light", "photo", "photo"]
    paths = []
    for i, k in enumerate(kinds):
        p = os.path.join(outdir, f"_x{i}.png")
        Image.fromarray(render_view(make_scene(200 + i, k))).save(p)
        paths.append(p)
    trans = [("fade", 0.3), ("fadeblack", 0.4), ("slideleft", 1 / 3), ("slideup", 1 / 3), ("zoomin", 0.3),
             ("wipeleft", 0.3), ("dissolve", 0.4)]
    seg = 1.5
    inputs = []
    for p in paths:
        inputs += ["-loop", "1", "-t", f"{seg}", "-framerate", "30", "-i", p]
    fc = []
    prev = "[0:v]"
    offset = 0.0
    gt = []
    for i, (tr, d) in enumerate(trans):
        offset += seg - d if i == 0 else seg - d
        if i > 0:
            offset = gt[-1]["offset"] + seg - d
        lab = f"[v{i}]"
        fc.append(f"{prev}[{i + 1}:v]xfade=transition={tr}:duration={d:.4f}:offset={offset:.4f}{lab}")
        gt.append({"type": tr, "offset": round(offset, 4), "frame": int(round(offset * 30)), "dur_frames": int(round(d * 30))})
        prev = lab
    cmd = ["ffmpeg", "-y", "-v", "error"] + inputs + ["-filter_complex", ";".join(fc), "-map", prev, "-r", "30",
                                                      "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
                                                      os.path.join(outdir, "xfade.mp4")]
    subprocess.run(cmd, check=True)
    for p in paths:
        os.remove(p)
    truth["xfade"] = {"boundaries": gt}


# ------------------------------------------------------------------ audio helpers
def kick(sr=ASR):
    t = np.arange(int(0.16 * sr)) / sr
    f = 50 + 70 * np.exp(-t / 0.03)
    ph = 2 * np.pi * np.cumsum(f) / sr
    return np.sin(ph) * np.exp(-t / 0.06)


def hat(sr=ASR, rng=np.random.default_rng(3)):
    n = int(0.04 * sr)
    x = np.diff(rng.normal(0, 1, n + 1))
    return x * np.exp(-np.arange(n) / (0.01 * sr)) * 0.25


def pop(sr=ASR):
    t = np.arange(int(0.05 * sr)) / sr
    return np.sin(2 * np.pi * 1200 * t) * np.exp(-t / 0.012)


def whoosh(sr=ASR, rise_f=8, fall_f=4, rng=np.random.default_rng(5)):
    """Noise swell that peaks after rise_f frames then decays over fall_f frames."""
    nr, nf = int(rise_f / 30 * sr), int(fall_f / 30 * sr)
    x = rng.normal(0, 1, nr + nf)
    # band-limit by smoothing (simple low-pass) then remove lows (diff)
    x = np.convolve(x, np.ones(4) / 4, "same")
    x = np.diff(np.concatenate([[0], x]))
    env = np.concatenate([np.linspace(0, 1, nr) ** 2, np.linspace(1, 0, nf) ** 1.5])
    return x * env * 0.8


def boom(sr=ASR):
    t = np.arange(int(0.5 * sr)) / sr
    return np.sin(2 * np.pi * 55 * t) * np.exp(-t / 0.15)


def place(buf, clip, t, gain=1.0):
    i = int(round(t * ASR))
    if i < 0:
        clip, i = clip[-i:], 0
    j = min(len(buf), i + len(clip))
    buf[i:j] += gain * clip[: j - i]


def write_wav(path, x):
    import wave
    x = np.clip(x, -1, 1)
    st = np.stack([x, x], axis=1) if x.ndim == 1 else x
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(ASR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


def mux(video, wav, out):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", video, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", out], check=True)


def music_bed(dur, bpm=120.0, start=0.2):
    buf = np.zeros(int(dur * ASR) + ASR)
    beat = 60 / bpm
    beats = []
    t = start
    while t < dur:
        place(buf, kick(), t, 0.5)
        place(buf, hat(), t + beat / 2, 0.6)
        beats.append(round(t, 4))
        t += beat
    tt = np.arange(len(buf)) / ASR
    pad = sum(np.sin(2 * np.pi * f * tt) for f in (220.0, 277.18, 329.63)) * 0.03 * (1 + 0.3 * np.sin(2 * np.pi * 0.25 * tt))
    return buf + pad, beats


# ------------------------------------------------------------------ sync.mp4
def gen_sync(outdir, truth):
    dur = 12.0
    nfr = int(dur * FPS)
    rng = np.random.default_rng(9)
    scenes = [render_view(make_scene(300 + i, "photo" if i % 2 == 0 else "ui_dark")) for i in range(8)]
    # beats at 0.2 + 0.5k s -> frames 6 + 15k. cuts at beat frames with known offsets
    beat_frames = [6 + 15 * k for k in range(24)]
    cut_plan = [(3, 0), (5, 0), (7, -1), (9, 2), (11, 0), (14, 1), (17, -2)]  # (beat index, offset frames)
    cut_frames = [beat_frames[b] + o for b, o in cut_plan]
    # captions: appear at fixed frames (inside shots), pop SFX at known offsets
    caps = [(20, 0, "instant"), (70, -1, "pop"), (115, 1, "instant"), (175, 0, "pop"), (245, -2, "instant"), (300, 0, "pop")]
    cap_text = ["no way this works", "3 taps. done.", "it remembers you", "watch this", "$4,218 MRR", "link in bio"]
    enc = Encoder(os.path.join(outdir, "_sync_v.mp4"))
    shot = 0
    active = []  # (start_frame, text, style)
    for n in range(nfr):
        if n in cut_frames:
            shot += 1
            active = []  # captions are cleared on cuts
        for (cf, off, sty), txt in zip(caps, cap_text):
            if n == cf:
                active.append((cf, txt, sty))
        fr = scenes[shot % len(scenes)].copy()
        if active:
            pil = Image.fromarray(fr)
            d = ImageDraw.Draw(pil)
            for j, (cf, txt, sty) in enumerate(active[-1:]):
                k = n - cf
                sc = 1.0
                if sty == "pop" and k < 6:
                    sc = [0.85, 0.95, 1.03, 1.05, 1.02, 1.0][k]
                f = font(int(round(80 * sc)))
                tw = d.textlength(txt, font=f)
                d.text(((W - tw) / 2, 420), txt, font=f, fill=(255, 255, 255), stroke_width=5, stroke_fill=(0, 0, 0))
            fr = np.array(pil)
        enc.write(fr)
    enc.close()
    bed, beats = music_bed(dur)
    sfx = np.zeros_like(bed)
    whoosh_cuts = [cut_frames[1], cut_frames[4]]
    for cf in whoosh_cuts:
        # peak 1 frame before the cut: rise 8 frames -> starts 9 frames before
        place(sfx, whoosh(), (cf - 9) / FPS, 0.9)
    for (cf, off, sty) in caps:
        place(sfx, pop(), (cf + off) / FPS, 0.35)
    mix = 0.5 * bed + sfx
    wav = os.path.join(outdir, "_sync.wav")
    write_wav(wav, mix * 0.9)
    mux(os.path.join(outdir, "_sync_v.mp4"), wav, os.path.join(outdir, "sync.mp4"))
    os.remove(os.path.join(outdir, "_sync_v.mp4"))
    os.remove(wav)
    truth["sync"] = {"bpm": 120.0, "beats_s": beats, "cut_frames": cut_frames,
                     "cut_offsets_to_beat_f": [-o for _, o in cut_plan],
                     "note": "offset = beat(audio) - cut(video) in frames; negative = audio leads",
                     "whoosh": {"cuts": whoosh_cuts, "peak_f30": -1, "start_f30": -9},
                     "captions": [{"frame": cf, "pop_offset_f": off, "style": sty} for cf, off, sty in caps]}


def gen_audio_tests(outdir, truth):
    black = os.path.join(outdir, "_black.mp4")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=black:s=1080x1920:r=30:d=10",
                    "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", black], check=True)
    # R128 calibration tone
    t = np.arange(10 * ASR) / ASR
    tone = 10 ** (-23 / 20) * np.sin(2 * np.pi * 997 * t)
    wav = os.path.join(outdir, "_tone.wav")
    write_wav(wav, tone)
    mux(black, wav, os.path.join(outdir, "tone.mp4"))
    truth["tone"] = {"lufs_i": -23.0, "true_peak_dbtp": -23.0}
    # music only
    bed, beats = music_bed(10.0, bpm=128.0)
    write_wav(wav, 0.6 * bed[: 10 * ASR])
    mux(black, wav, os.path.join(outdir, "music.mp4"))
    truth["music"] = {"class": "music-led", "bpm": 128.0}
    # speech (macOS say), speech + music bed at -18 dB
    aiff = os.path.join(outdir, "_speech.aiff")
    text = ("I built this app in a weekend. It tracks every habit you care about, and it actually reminds you "
            "at the right moment. Three taps and you are done. People told me nobody would pay for it. "
            "Last month it made four thousand dollars. Here is exactly how it works.")
    ok = subprocess.run(["say", "-r", "190", "-o", aiff, text], capture_output=True).returncode == 0
    if ok:
        sp = subprocess.run(["ffmpeg", "-v", "error", "-i", aiff, "-ac", "1", "-ar", str(ASR), "-f", "f32le", "-"],
                            capture_output=True).stdout
        sp = np.frombuffer(sp, np.float32)[: 10 * ASR]
        sp = np.pad(sp, (0, max(0, 10 * ASR - len(sp))))
        sp = sp / (np.abs(sp).max() + 1e-9) * 0.7
        write_wav(wav, sp)
        mux(black, wav, os.path.join(outdir, "speech.mp4"))
        bed_rms = np.sqrt((bed[: 10 * ASR] ** 2).mean())
        sp_rms = np.sqrt((sp[np.abs(sp) > 0.01] ** 2).mean())
        g = sp_rms / bed_rms * 10 ** (-18 / 20)
        write_wav(wav, sp + g * bed[: 10 * ASR])
        mux(black, wav, os.path.join(outdir, "speech_bed.mp4"))
        truth["speech"] = {"class": "speech-led"}
        truth["speech_bed"] = {"class": "speech-led", "bed_rel_db": -18.0}
        os.remove(aiff)
    os.remove(wav)
    os.remove(black)


def main():
    outdir = sys.argv[1]
    os.makedirs(outdir, exist_ok=True)
    truth = {}
    which = set(sys.argv[2:]) or {"cam", "trans", "xfade", "sync", "audio"}
    if "cam" in which:
        gen_cam(outdir, truth)
    if "trans" in which:
        gen_trans(outdir, truth)
    if "xfade" in which:
        gen_xfade(outdir, truth)
    if "sync" in which:
        gen_sync(outdir, truth)
    if "audio" in which:
        gen_audio_tests(outdir, truth)
    tp = os.path.join(outdir, "truth.json")
    old = json.load(open(tp)) if os.path.exists(tp) else {}
    old.update(truth)
    json.dump(old, open(tp, "w"), indent=1)
    print("wrote", outdir)


if __name__ == "__main__":
    main()
