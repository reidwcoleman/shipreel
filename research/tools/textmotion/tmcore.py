"""textmotion core: measure how on-screen text animates in a video.

Pipeline
  pass 1 (detect)  : decode at DET_W px wide, find text-like blocks per frame (morphological
                     top-hat / black-hat strokes grouped into lines and blocks), detect scene cuts,
                     link blocks over time into segments (same content, possibly moving/scaling).
  pass 2 (measure) : decode again at PREC_W px wide; for every segment take a settled reference
                     frame, build a masked template of the text, and track it backwards (entrance)
                     and forwards (exit) frame by frame with a coarse-to-fine multi-scale masked NCC
                     search. Each frame gives scale, centre, NCC score and a contrast/opacity proxy.
  metrics          : entrance duration, initial scale, overshoot, slide distance, easing samples,
                     cubic-bezier + Remotion-spring fits, hold, exit type/duration, word timing.

Everything here is deterministic and depends only on numpy, OpenCV, scipy and the ffmpeg binary.
"""
from __future__ import annotations

import json
import math
import queue
import re
import subprocess
import threading
from dataclasses import dataclass, field

import cv2
import numpy as np

cv2.setNumThreads(2)

# ----------------------------------------------------------------------------------------------
# Video IO
# ----------------------------------------------------------------------------------------------


def _ratio(s: str) -> float:
    try:
        if "/" in s:
            a, b = s.split("/")
            return float(a) / float(b) if float(b) else 0.0
        return float(s)
    except Exception:
        return 0.0


def probe(path: str) -> dict:
    """Display size (rotation applied), nominal fps, duration and codec of the first video stream."""
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height,r_frame_rate,avg_frame_rate,nb_frames,codec_name:stream_side_data=rotation"
         ":stream_tags=rotate:format=duration", "-of", "json", path],
        capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    st = j["streams"][0]
    w, h = int(st["width"]), int(st["height"])
    rot = 0
    for sd in st.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(float(sd["rotation"]))
    if "tags" in st and "rotate" in st["tags"]:
        rot = int(float(st["tags"]["rotate"]))
    if abs(rot) % 180 == 90:
        w, h = h, w
    r = _ratio(st.get("r_frame_rate", "0/1"))
    a = _ratio(st.get("avg_frame_rate", "0/1"))
    dur = float(j.get("format", {}).get("duration", 0) or 0)
    return {"width": w, "height": h, "fps_r": r, "fps_avg": a, "duration": dur,
            "codec": st.get("codec_name"), "nb_frames": int(st.get("nb_frames", 0) or 0)}


_SHOWINFO = re.compile(r"n:\s*(\d+)\s+pts:\s*(-?\d+)\s+pts_time:\s*(-?[0-9.eE+-]+)")


class FrameReader:
    """Decode every frame (no resampling) at a fixed analysis width, with its timestamp.

    Iterates (index, t_seconds, rgb uint8 HxWx3). Timestamps come from ffmpeg's showinfo filter so
    variable-frame-rate sources keep their true timing.
    """

    def __init__(self, path: str, width: int, start: float | None = None, end: float | None = None):
        self.info = probe(path)
        W0, H0 = self.info["width"], self.info["height"]
        self.w = int(width) // 2 * 2
        self.h = int(round(self.w * H0 / W0 / 2.0)) * 2
        self.start = float(start or 0.0)
        cmd = ["ffmpeg", "-hide_banner", "-nostdin", "-loglevel", "info"]
        if start:
            cmd += ["-ss", f"{start:.4f}"]
        cmd += ["-i", path]
        if end is not None:
            cmd += ["-t", f"{max(0.01, end - self.start):.4f}"]
        cmd += ["-map", "0:v:0", "-an", "-sn", "-dn",
                "-vf", f"scale={self.w}:{self.h}:flags=area,showinfo",
                "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"]
        self.cmd = cmd
        self.times: "queue.Queue[float]" = queue.Queue()

    def _stderr(self, proc):
        for raw in iter(proc.stderr.readline, b""):
            m = _SHOWINFO.search(raw.decode("utf-8", "replace"))
            if m:
                self.times.put(float(m.group(3)))
        self.times.put(None)

    def __iter__(self):
        proc = subprocess.Popen(self.cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=10 ** 7)
        th = threading.Thread(target=self._stderr, args=(proc,), daemon=True)
        th.start()
        n = self.w * self.h * 3
        i = 0
        last_t = None
        fps_guess = self.info["fps_avg"] or self.info["fps_r"] or 30.0
        try:
            while True:
                buf = proc.stdout.read(n)
                if not buf or len(buf) < n:
                    break
                try:
                    t = self.times.get(timeout=10)
                except queue.Empty:
                    t = None
                if t is None:
                    t = (last_t + 1.0 / fps_guess) if last_t is not None else 0.0
                last_t = t
                frame = np.frombuffer(buf, np.uint8).reshape(self.h, self.w, 3)
                yield i, t + self.start, frame
                i += 1
        finally:
            try:
                proc.stdout.close()
            except Exception:
                pass
            proc.kill()
            proc.wait()


# ----------------------------------------------------------------------------------------------
# Motion math: Remotion spring (exact port), CSS cubic-bezier, easings
# ----------------------------------------------------------------------------------------------


def spring_curve(t, omega0: float, zeta: float):
    """Remotion spring() progress 0->1 at time t (seconds, array ok), zero initial velocity.

    Remotion (spring-utils.js) integrates the closed-form damped oscillator; for zeta >= 1 it uses
    the *critically damped* formula with omega0 regardless of how large damping is.
    omega0 = sqrt(stiffness/mass) [rad/s], zeta = damping / (2*sqrt(stiffness*mass)).
    """
    t = np.maximum(np.asarray(t, dtype=float), 0.0)
    if zeta < 1.0:
        w1 = omega0 * math.sqrt(1.0 - zeta * zeta)
        env = np.exp(-zeta * omega0 * t)
        return 1.0 - env * (np.cos(w1 * t) + (zeta * omega0 / w1) * np.sin(w1 * t))
    env = np.exp(-omega0 * t)
    return 1.0 - env * (1.0 + omega0 * t)


def remotion_spring(frame, fps: float, damping: float = 10, stiffness: float = 100, mass: float = 1):
    w0 = math.sqrt(stiffness / mass)
    z = damping / (2.0 * math.sqrt(stiffness * mass))
    return spring_curve(np.asarray(frame, dtype=float) / fps, w0, z)


def spring_params(omega0: float, zeta: float, mass: float = 1.0) -> dict:
    k = mass * omega0 ** 2
    c = 2.0 * zeta * math.sqrt(k * mass)
    return {"damping": round(c, 2), "stiffness": round(k, 1), "mass": mass}


def spring_stats(omega0: float, zeta: float, fps: float = 30.0) -> dict:
    """Overshoot (% of travel), time-to-peak and 95%/99% settle frames for a 0->1 spring."""
    t = np.arange(0, 4.0, 1.0 / (fps * 8))
    y = spring_curve(t, omega0, zeta)
    over = max(0.0, float(y.max() - 1.0))
    peak_t = float(t[int(np.argmax(y))]) if over > 1e-4 else None

    def settle(th):
        bad = np.where(np.abs(y - 1.0) > th)[0]
        return float(t[bad[-1] + 1]) if len(bad) and bad[-1] + 1 < len(t) else 0.0

    return {"overshoot_pct": round(100 * over, 2),
            "peak_frame": None if peak_t is None else round(peak_t * fps, 2),
            "settle95_frames": round(settle(0.05) * fps, 2),
            "settle99_frames": round(settle(0.01) * fps, 2)}


def bezier_curve(u, x1: float, y1: float, x2: float, y2: float):
    """CSS cubic-bezier(x1,y1,x2,y2) evaluated at progress u in [0,1] (array ok)."""
    u = np.clip(np.asarray(u, dtype=float), 0.0, 1.0)
    # solve x(s) = u by bisection+Newton (x1,x2 in [0,1] => monotonic)
    s = u.copy()
    for _ in range(8):
        xs = 3 * (1 - s) ** 2 * s * x1 + 3 * (1 - s) * s ** 2 * x2 + s ** 3 - u
        dx = 3 * (1 - s) ** 2 * x1 + 6 * (1 - s) * s * (x2 - x1) + 3 * s ** 2 * (1 - x2)
        ok = np.abs(dx) > 1e-6
        s = np.where(ok, s - xs / np.where(ok, dx, 1), s)
        s = np.clip(s, 0, 1)
    lo = np.zeros_like(u)
    hi = np.ones_like(u)
    xs = 3 * (1 - s) ** 2 * s * x1 + 3 * (1 - s) * s ** 2 * x2 + s ** 3
    bad = np.abs(xs - u) > 1e-5
    if np.any(bad):
        sb = np.full(int(bad.sum()), 0.5)
        ub = u[bad]
        lo_b, hi_b = lo[bad], hi[bad]
        for _ in range(40):
            xb = 3 * (1 - sb) ** 2 * sb * x1 + 3 * (1 - sb) * sb ** 2 * x2 + sb ** 3
            gt = xb > ub
            hi_b = np.where(gt, sb, hi_b)
            lo_b = np.where(gt, lo_b, sb)
            sb = 0.5 * (lo_b + hi_b)
        s[bad] = sb
    return 3 * (1 - s) ** 2 * s * y1 + 3 * (1 - s) * s ** 2 * y2 + s ** 3


EASINGS = {
    "linear": lambda u: np.asarray(u, float),
    "easeOutCubic": lambda u: 1 - (1 - np.asarray(u, float)) ** 3,
    "easeInCubic": lambda u: np.asarray(u, float) ** 3,
    "easeInOutCubic": lambda u: np.where(np.asarray(u, float) < 0.5, 4 * np.asarray(u, float) ** 3,
                                         1 - (-2 * np.asarray(u, float) + 2) ** 3 / 2),
    "easeOutQuad": lambda u: 1 - (1 - np.asarray(u, float)) ** 2,
    "easeOutExpo": lambda u: np.where(np.asarray(u, float) >= 1, 1.0, 1 - 2 ** (-10 * np.asarray(u, float))),
}


# ----------------------------------------------------------------------------------------------
# Pass 1: text-block detection
# ----------------------------------------------------------------------------------------------

DET_W = 480


@dataclass
class Block:
    """One text line (or one boxed caption) found in a frame, in analysis-resolution pixels."""
    x0: int
    y0: int
    x1: int
    y1: int
    style: str           # stroked | plain_light | plain_dark | box_light | box_dark
    text_area: int       # pixels of the text (glyph) mask
    density: float       # text_area / bbox area
    contrast: float      # max - min of blurred luminance in bbox
    glyphs: int          # glyph components in the text mask
    fill_rgb: tuple      # mean colour of the glyph pixels
    bg_rgb: tuple        # mean colour of the non-glyph pixels in the bbox (box colour for boxed captions)
    thumb: np.ndarray    # gray crop (uint8) of the bbox, for appearance matching
    mask: np.ndarray     # glyph mask crop (uint8 0/1)

    @property
    def w(self):
        return self.x1 - self.x0

    @property
    def h(self):
        return self.y1 - self.y0

    @property
    def cx(self):
        return 0.5 * (self.x0 + self.x1)

    @property
    def cy(self):
        return 0.5 * (self.y0 + self.y1)


def stroke_maps(L: np.ndarray, k: int):
    ker = cv2.getStructuringElement(cv2.MORPH_RECT, (k, k))
    th = cv2.morphologyEx(L, cv2.MORPH_TOPHAT, ker)
    bh = cv2.morphologyEx(L, cv2.MORPH_BLACKHAT, ker)
    return th, bh


def candidate_masks(L: np.ndarray, k: int | None = None, t_hat: int = 60):
    """Bright thin strokes (white text, light box fragments) and dark thin strokes (outlines, dark text)."""
    H, W = L.shape
    k = k or (int(round(W * 0.05)) | 1)
    th, bh = stroke_maps(L, k)
    bright = (th >= t_hat) & (L >= 150)
    dark = (bh >= t_hat) & (L <= 115)
    return bright, dark


def classify_line(b: np.ndarray, d: np.ndarray):
    """Decide the caption style from the bright/dark stroke masks inside a line bbox.

    Returns (style, glyph_mask). Boxed captions show up as a dense majority polarity (the box,
    fragmented by the letters) with the letters as the minority polarity.
    """
    area = b.size
    nb, nd = int(b.sum()), int(d.sum())
    dens = (nb + nd) / float(area)
    if dens > 0.72:
        return ("box_dark", b) if nd > nb else ("box_light", d)
    if min(nb, nd) >= 0.3 * max(nb, nd):
        return "stroked", b      # white fill + dark outline: the fill is the glyph
    return ("plain_light", b) if nb >= nd else ("plain_dark", d)


def detect_blocks(rgb: np.ndarray, min_line_h_frac: float = 0.011) -> list[Block]:
    """Find text lines / boxed captions in an RGB frame at analysis resolution."""
    H, W = rgb.shape[:2]
    L = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    bright, dark = candidate_masks(L)
    cand = (bright | dark).astype(np.uint8)
    kx = max(3, int(round(W * 0.03)))
    ky = max(1, int(round(W * 0.004)))
    closed = cv2.morphologyEx(cand, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (kx, ky)))
    nl, llab, lst, _ = cv2.connectedComponentsWithStats(closed, connectivity=8)
    min_h = max(7, int(round(H * min_line_h_frac)))
    out = []
    for i in range(1, nl):
        x, y, w, h, a = (int(v) for v in lst[i])
        if h < min_h or h > 0.3 * H or w < max(0.8 * h, 0.03 * W):
            continue
        if a < 0.25 * w * h * 0.3:
            continue
        b = bright[y:y + h, x:x + w]
        d = dark[y:y + h, x:x + w]
        style, gm = classify_line(b, d)
        ta = int(gm.sum())
        dens = ta / float(w * h)
        if dens < 0.05 or dens > 0.8:
            continue
        ng, _, gst, _ = cv2.connectedComponentsWithStats(gm.astype(np.uint8), connectivity=8)
        if ng <= 1:
            continue
        gh = gst[1:, cv2.CC_STAT_HEIGHT]
        gw = gst[1:, cv2.CC_STAT_WIDTH]
        glyphs = int(((gh >= max(3, 0.2 * h)) & (gw <= 2.5 * h)).sum())
        if glyphs < 2 or (w >= 4 * h and glyphs < 3):
            continue
        crop = L[y:y + h, x:x + w]
        bl = cv2.blur(crop, (3, 3)) if min(w, h) >= 3 else crop
        con = float(bl.max()) - float(bl.min())
        if con < 80:
            continue
        rgbc = rgb[y:y + h, x:x + w].reshape(-1, 3)
        gmf = gm.reshape(-1)
        fill = tuple(int(v) for v in rgbc[gmf].mean(0))
        bgm = ~(b | d).reshape(-1) if not style.startswith("box") else ~gmf
        bg = tuple(int(v) for v in rgbc[bgm].mean(0)) if bgm.any() else (0, 0, 0)
        out.append(Block(x, y, x + w, y + h, style, ta, dens, con, glyphs, fill, bg, crop.copy(),
                         gm.astype(np.uint8).copy()))
    return out


# ----------------------------------------------------------------------------------------------
# Pass 1: cuts and tracking
# ----------------------------------------------------------------------------------------------


def thumb_small(rgb: np.ndarray) -> np.ndarray:
    return cv2.resize(cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY), (48, 85), interpolation=cv2.INTER_AREA)


def detect_cuts(thumbs: list[np.ndarray]) -> list[int]:
    """Frame indices i where a hard cut happens between frame i-1 and i."""
    if len(thumbs) < 3:
        return []
    d = np.zeros(len(thumbs))
    for i in range(1, len(thumbs)):
        d[i] = np.mean(np.abs(thumbs[i].astype(np.int16) - thumbs[i - 1].astype(np.int16)))
    cuts = []
    for i in range(1, len(d)):
        lo, hi = max(1, i - 8), min(len(d), i + 9)
        nb = np.concatenate([d[lo:i], d[i + 1:hi]])
        med = np.median(nb) if len(nb) else 0
        if d[i] >= 14 and d[i] >= 3.0 * med + 4:
            cuts.append(i)
    return cuts


def _ncc(a: np.ndarray, b: np.ndarray) -> float:
    a = a.astype(np.float32).ravel()
    b = b.astype(np.float32).ravel()
    a -= a.mean()
    b -= b.mean()
    den = math.sqrt(float((a * a).sum() * (b * b).sum()))
    return float((a * b).sum() / den) if den > 1e-6 else 0.0


def appearance_sim(a: Block, b: Block) -> float:
    """Scale-invariant appearance similarity (NCC of both crops resized to a common size)."""
    ar = math.log((a.w / max(1, a.h)) / (b.w / max(1, b.h)))
    if abs(ar) > 0.22:
        return -1.0
    tw = 64
    th = max(8, int(round(tw * 0.5 * (a.h / max(1, a.w) + b.h / max(1, b.w)))))
    ta = cv2.resize(a.thumb, (tw, th), interpolation=cv2.INTER_AREA)
    tb = cv2.resize(b.thumb, (tw, th), interpolation=cv2.INTER_AREA)
    return _ncc(ta, tb)


def contained_sim(old: Block, new: Block) -> float:
    """How well the old block's crop (same scale) appears inside the new, larger block."""
    if new.w < old.w * 0.98 or new.h < old.h * 0.85:
        return -1.0
    big = new.thumb
    sm = old.thumb
    if sm.shape[0] > big.shape[0] or sm.shape[1] > big.shape[1]:
        pad_y = max(0, sm.shape[0] - big.shape[0])
        pad_x = max(0, sm.shape[1] - big.shape[1])
        big = cv2.copyMakeBorder(big, 0, pad_y, 0, pad_x, cv2.BORDER_REPLICATE)
    r = cv2.matchTemplate(big.astype(np.float32), sm.astype(np.float32), cv2.TM_CCOEFF_NORMED)
    return float(r.max()) if r.size else -1.0


def content_change(a: Block, b: Block) -> tuple[float, float]:
    """(lost, gained): fraction of old glyph pixels missing in new, and of new ones absent in old.

    Only meaningful when the two boxes are (nearly) at the same place and scale.
    """
    ux0, uy0 = min(a.x0, b.x0), min(a.y0, b.y0)
    ux1, uy1 = max(a.x1, b.x1), max(a.y1, b.y1)
    ma = np.zeros((uy1 - uy0, ux1 - ux0), np.uint8)
    mb = np.zeros_like(ma)
    ma[a.y0 - uy0:a.y1 - uy0, a.x0 - ux0:a.x1 - ux0] = a.mask
    mb[b.y0 - uy0:b.y1 - uy0, b.x0 - ux0:b.x1 - ux0] = b.mask
    k = np.ones((3, 3), np.uint8)
    da = cv2.dilate(ma, k)
    db = cv2.dilate(mb, k)
    lost = float((ma & (1 - db)).sum()) / max(1.0, float(ma.sum()))
    gained = float((mb & (1 - da)).sum()) / max(1.0, float(mb.sum()))
    return lost, gained


def iou(a: Block, b: Block) -> float:
    ix = max(0.0, min(a.x1, b.x1) - max(a.x0, b.x0))
    iy = max(0.0, min(a.y1, b.y1) - max(a.y0, b.y0))
    inter = ix * iy
    u = a.w * a.h + b.w * b.h - inter
    return inter / u if u > 0 else 0.0


@dataclass
class Segment:
    id: int
    frames: list = field(default_factory=list)
    blocks: list = field(default_factory=list)
    parent: int | None = None
    relation: str = "new"     # new | grow | swap

    @property
    def start(self):
        return self.frames[0]

    @property
    def end(self):
        return self.frames[-1]

    @property
    def last(self) -> Block:
        return self.blocks[-1]


def link_segments(per_frame: list[list[Block]], max_gap: int = 2) -> list[Segment]:
    """Link per-frame blocks into segments of constant content (allowing scale/position animation)."""
    segs: list[Segment] = []
    active: list[Segment] = []
    for t, blocks in enumerate(per_frame):
        active = [s for s in active if t - s.end <= max_gap + 1]
        cands = []
        for bi, b in enumerate(blocks):
            for si, s in enumerate(active):
                a = s.last
                ov = iou(a, b)
                dist = math.hypot(a.cx - b.cx, a.cy - b.cy)
                ar = (b.w * b.h) / max(1.0, a.w * a.h)
                if not (ov >= 0.2 or (dist <= 0.75 * max(a.h, b.h) and 0.4 <= ar <= 2.5)):
                    continue
                sim = appearance_sim(a, b)
                if sim < 0.5:
                    continue
                if ov >= 0.8 and t - s.end == 1:
                    lost, gained = content_change(a, b)
                    if lost >= 0.07 and gained >= 0.07:
                        continue   # same place, different text: a swap
                cands.append((ov + sim, bi, si))
        cands.sort(reverse=True)
        used_b, used_s = set(), set()
        for sc, bi, si in cands:
            if bi in used_b or si in used_s:
                continue
            used_b.add(bi)
            used_s.add(si)
            active[si].frames.append(t)
            active[si].blocks.append(blocks[bi])
        for bi, b in enumerate(blocks):
            if bi in used_b:
                continue
            rel, parent, best = "new", None, -1.0
            for s in active:
                if s.end < t - 2:
                    continue
                a = s.last
                if iou(a, b) <= 0.05 and math.hypot(a.cx - b.cx, a.cy - b.cy) > 2 * max(a.h, b.h):
                    continue
                cs = contained_sim(a, b)
                if cs > best:
                    best, parent = cs, s
            if parent is not None and best >= 0.7 and (b.w * b.h) > 1.04 * parent.last.w * parent.last.h:
                rel = "grow"
            elif parent is not None:
                rel = "swap"
            seg = Segment(len(segs), [t], [b], parent.id if parent is not None else None, rel)
            segs.append(seg)
            active.append(seg)
    return segs
