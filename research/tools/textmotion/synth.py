"""Generate synthetic caption videos with exactly known text motion (for validating measure.py).

    python3 -I research/tools/textmotion/synth.py <out_dir>

Writes synthA.mp4 (1080x1920 @30 fps, CRF 18) and synthB.mp4 (720x1280 @60 fps, CRF 30) plus
synthA.truth.json / synthB.truth.json with the per-frame ground-truth transform of every event.
Backgrounds are moving procedural textures with hard scene cuts, so the detector has to cope with
clutter, motion and compression like on a real phone video.
"""
from __future__ import annotations

import json
import math
import os
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tmcore as T  # noqa: E402

FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
FONT_IMPACT = "/System/Library/Fonts/Supplemental/Impact.ttf"


# ------------------------------------------------------------------ channel models

def chan_value(model, f: float, fps: float):
    """Evaluate a channel model at frame offset f (frames since the event's start)."""
    kind = model["kind"]
    if kind == "const":
        return model["v"]
    if kind == "keys":  # [[frame, value, easing-into-this-key], ...]
        keys = model["keys"]
        if f <= keys[0][0]:
            return keys[0][1]
        for (fa, va, _), (fb, vb, ez) in zip(keys, keys[1:]):
            if f <= fb:
                u = (f - fa) / (fb - fa)
                if isinstance(ez, list):
                    e = float(T.bezier_curve(np.array([u]), *ez)[0])
                else:
                    e = float(T.EASINGS[ez](np.array([u]))[0])
                return va + (vb - va) * e
        return keys[-1][1]
    if kind == "spring":
        s = float(T.remotion_spring(np.array([f - model.get("delay", 0)]), fps, model["damping"], model["stiffness"],
                                    model["mass"])[0])
        return model["from"] + (model["to"] - model["from"]) * s
    raise ValueError(kind)


# ------------------------------------------------------------------ sprites

def render_text_sprite(text, font_path, size, fill, stroke=0, stroke_fill=(0, 0, 0), box=None, shadow=False,
                       word_fills=None):
    """RGBA sprite of a single line of text. Returns (sprite, word_boxes) with word boxes in sprite px."""
    font = ImageFont.truetype(font_path, size)
    words = text.split(" ")
    space = font.getlength(" ")
    widths = [font.getlength(w) for w in words]
    asc, desc = font.getmetrics()
    tw = sum(widths) + space * (len(words) - 1)
    padx, pady = (int(size * box["padx"]), int(size * box["pady"])) if box else (stroke + 6, stroke + 6)
    W = int(math.ceil(tw)) + 2 * padx
    H = asc + desc + 2 * pady
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if box:
        d.rounded_rectangle([0, 0, W - 1, H - 1], radius=int(size * box["radius"]), fill=box["bg"])
    x = padx
    boxes = []
    for i, w in enumerate(words):
        col = fill if not word_fills else word_fills[i]
        if shadow:
            d.text((x + 3, pady + 4), w, font=font, fill=(0, 0, 0, 150))
        d.text((x, pady), w, font=font, fill=col, stroke_width=stroke, stroke_fill=stroke_fill)
        boxes.append([x - stroke, pady - stroke, x + widths[i] + stroke, pady + asc + desc + stroke])
        x += widths[i] + space
    return np.array(img), boxes


def composite(frame: np.ndarray, sprite: np.ndarray, cx: float, cy: float, scale: float, opacity: float,
              clip_box=None):
    """Alpha-composite sprite (RGBA) centred at (cx, cy) with uniform scale (sub-pixel exact warp)."""
    if opacity <= 0 or scale <= 0.01:
        return
    H, W = frame.shape[:2]
    sh, sw = sprite.shape[:2]
    M = np.array([[scale, 0, cx - scale * sw / 2.0], [0, scale, cy - scale * sh / 2.0]], np.float32)
    # warp only the region that matters
    x0 = int(max(0, math.floor(cx - scale * sw / 2.0) - 2))
    y0 = int(max(0, math.floor(cy - scale * sh / 2.0) - 2))
    x1 = int(min(W, math.ceil(cx + scale * sw / 2.0) + 2))
    y1 = int(min(H, math.ceil(cy + scale * sh / 2.0) + 2))
    if x1 <= x0 or y1 <= y0:
        return
    M[0, 2] -= x0
    M[1, 2] -= y0
    src = sprite.astype(np.float32)
    # premultiply to avoid dark fringes
    src[..., :3] *= src[..., 3:4] / 255.0
    interp = cv2.INTER_AREA if scale < 0.9 else cv2.INTER_LINEAR
    if scale < 0.9:
        # area-resample first, then sub-pixel shift
        small = cv2.resize(src, (max(1, int(round(sw * scale))), max(1, int(round(sh * scale)))),
                           interpolation=cv2.INTER_AREA)
        sx = small.shape[1] / sw
        sy = small.shape[0] / sh
        M2 = np.array([[scale / sx, 0, M[0, 2]], [0, scale / sy, M[1, 2]]], np.float32)
        warped = cv2.warpAffine(small, M2, (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR,
                                borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    else:
        warped = cv2.warpAffine(src, M, (x1 - x0, y1 - y0), flags=interp, borderMode=cv2.BORDER_CONSTANT,
                                borderValue=0)
    a = warped[..., 3:4] / 255.0 * opacity
    region = frame[y0:y1, x0:x1].astype(np.float32)
    out = region * (1 - a) + warped[..., :3] * opacity
    frame[y0:y1, x0:x1] = np.clip(out + 0.5, 0, 255).astype(np.uint8)


# ------------------------------------------------------------------ backgrounds

def make_background(W, H, seed, n_frames, fps):
    """Return a function f -> RGB frame (moving textured background)."""
    rng = np.random.default_rng(seed)
    big = (int(W * 1.3), int(H * 1.3))
    low = rng.random((12, 8, 3)).astype(np.float32)
    base = cv2.resize(low, big, interpolation=cv2.INTER_CUBIC)
    mid = cv2.resize(rng.random((96, 64, 3)).astype(np.float32), big, interpolation=cv2.INTER_CUBIC)
    hi = rng.random((big[1], big[0], 1)).astype(np.float32)
    tex = np.clip(0.55 * base + 0.3 * mid + 0.15 * hi, 0, 1)
    tex = (tex * 200 + 25).astype(np.uint8)
    # a few bright/dark rectangles (clutter that is not text)
    for _ in range(14):
        x, y = rng.integers(0, big[0] - 80), rng.integers(0, big[1] - 80)
        w, h = rng.integers(20, 200), rng.integers(4, 40)
        tex[y:y + h, x:x + w] = 245 if rng.random() < 0.5 else 15
    vx, vy = rng.uniform(-60, 60), rng.uniform(-40, 40)  # px / s drift

    def bg(f):
        t = f / fps
        ox = int((W * 0.15) + vx * t + 8 * math.sin(2.1 * t))
        oy = int((H * 0.15) + vy * t + 6 * math.cos(1.7 * t))
        ox = max(0, min(big[0] - W, ox))
        oy = max(0, min(big[1] - H, oy))
        return tex[oy:oy + H, ox:ox + W].copy()

    return bg


# ------------------------------------------------------------------ scene description

def S(v):
    return {"kind": "const", "v": v}


def build_A():
    W, H, fps, N = 1080, 1920, 30, 450
    cuts = [150, 300]
    ev = []
    # E1: pop with overshoot 0.70 -> 1.08 -> 1.00 over 6 frames (visible from frame 0), hard-cut exit
    ev.append(dict(id="A1_pop_overshoot", text="this app is insane", style="stroke", font=FONT_BOLD, size=84,
                   cx=540, cy=560, start=10, end=70,
                   scale={"kind": "keys", "keys": [[0, 0.70, "linear"], [3, 1.08, "easeOutCubic"],
                                                   [6, 1.0, "easeInOutCubic"]]},
                   opacity=S(1.0), dx=S(0), dy=S(0), exit={"type": "cut"}))
    # E2: white box slide-up 8% H with ease-out cubic over 9 frames + linear fade 0->1 over 5 frames, fade exit 6 f
    ev.append(dict(id="A2_box_slide_up", text="1) Scan your food", style="box_white", font=FONT_BOLD, size=64,
                   cx=540, cy=1300, start=80, end=140,
                   scale=S(1.0), opacity={"kind": "keys", "keys": [[0, 0.0, "linear"], [5, 1.0, "linear"]]},
                   dx=S(0), dy={"kind": "keys", "keys": [[0, 0.08 * H, "linear"], [9, 0.0, "easeOutCubic"]]},
                   exit={"type": "fade", "frames": 6}))
    # E3: Shipreel's current pop (SNAPPY spring 0.78->1, opacity [0,4]); exits with the scene cut at 300
    ev.append(dict(id="A3_snappy_pop", text="stop scrolling", style="stroke", font=FONT_BOLD, size=96,
                   cx=540, cy=700, start=160, end=300,
                   scale={"kind": "spring", "damping": 14, "stiffness": 180, "mass": 0.6, "from": 0.78, "to": 1.0},
                   opacity={"kind": "keys", "keys": [[0, 0.0, "linear"], [4, 1.0, "linear"]]},
                   dx=S(0), dy=S(0), exit={"type": "cut"}))
    # E4: slam (spring 11/260/0.6 from 2.1) on a black box; scale-out exit 5 frames easeInCubic + fade
    ev.append(dict(id="A4_slam", text="WAIT FOR IT", style="box_black", font=FONT_BLACK, size=70,
                   cx=540, cy=1150, start=170, end=240,
                   scale={"kind": "spring", "damping": 11, "stiffness": 260, "mass": 0.6, "from": 2.1, "to": 1.0},
                   opacity={"kind": "keys", "keys": [[0, 0.0, "linear"], [3, 1.0, "linear"]]},
                   dx=S(0), dy=S(0), exit={"type": "scale_out", "frames": 5}))
    # E5: word-by-word, 4 words every 5 frames, each word pops 0.6->1 (SNAPPY) with opacity [0,3]
    ev.append(dict(id="A5_word_by_word", text="you need this app", style="stroke", font=FONT_BLACK, size=80,
                   cx=540, cy=900, start=310, end=372, words={"interval": 5,
                   "scale": {"kind": "spring", "damping": 14, "stiffness": 180, "mass": 0.6, "from": 0.6, "to": 1.0},
                   "opacity": {"kind": "keys", "keys": [[0, 0.0, "linear"], [3, 1.0, "linear"]]}},
                   scale=S(1.0), opacity=S(1.0), dx=S(0), dy=S(0), exit={"type": "cut"}))
    # E6/E7: instant caption, swapped instantly for another at the same place
    ev.append(dict(id="A6_instant", text="day 1 of building", style="shadow", font=FONT_BOLD, size=72,
                   cx=540, cy=420, start=20, end=65, scale=S(1.0), opacity=S(1.0), dx=S(0), dy=S(0),
                   exit={"type": "cut"}))
    ev.append(dict(id="A7_instant_swap", text="day 2 of building", style="shadow", font=FONT_BOLD, size=72,
                   cx=540, cy=420, start=65, end=125, scale=S(1.0), opacity=S(1.0), dx=S(0), dy=S(0),
                   exit={"type": "cut"}))
    # E8: BOUNCY spring 0.5 -> 1 in yellow; slide-out to the left over 8 frames
    ev.append(dict(id="A8_bouncy", text="+$4,218 MRR", style="stroke_yellow", font=FONT_BLACK, size=110,
                   cx=540, cy=1500, start=380, end=430,
                   scale={"kind": "spring", "damping": 9, "stiffness": 160, "mass": 0.7, "from": 0.5, "to": 1.0},
                   opacity={"kind": "keys", "keys": [[0, 0.0, "linear"], [3, 1.0, "linear"]]},
                   dx=S(0), dy=S(0), exit={"type": "slide_left", "frames": 8}))
    return dict(name="synthA", W=W, H=H, fps=fps, N=N, cuts=cuts, crf=18, events=ev, seed=3)


def build_B():
    W, H, fps, N = 720, 1280, 60, 620
    cuts = [300]
    ev = []
    # B1: cubic-bezier(0.34,1.56,0.64,1) 0.6 -> 1 over 10 frames @60 (= 5 @30), visible at frame 0; fade exit 8 f
    ev.append(dict(id="B1_bezier_back", text="POV: you found it", style="stroke", font=FONT_BLACK, size=52,
                   cx=360, cy=330, start=20, end=150,
                   scale={"kind": "keys", "keys": [[0, 0.6, "linear"], [10, 1.0, [0.34, 1.56, 0.64, 1.0]]]},
                   opacity=S(1.0), dx=S(0), dy=S(0), exit={"type": "fade", "frames": 8}))
    # B2: karaoke highlight; all words instant, active word turns #FFD93D for 12 frames each
    ev.append(dict(id="B2_karaoke", text="your new favorite app", style="stroke", font=FONT_BOLD, size=50,
                   cx=360, cy=800, start=40, end=140, highlight={"interval": 12, "color": (255, 217, 61)},
                   scale=S(1.0), opacity=S(1.0), dx=S(0), dy=S(0), exit={"type": "cut"}))
    # B3: Shipreel-style "fade": opacity 0->1 over 18 f (@60) + rise 16 px easeOutCubic over 30 f; exit slide-down+fade
    ev.append(dict(id="B3_fade_rise", text="built in 3 days", style="shadow", font=FONT_BOLD, size=48,
                   cx=360, cy=560, start=160, end=290,
                   scale=S(1.0), opacity={"kind": "keys", "keys": [[0, 0.0, "linear"], [18, 1.0, "linear"]]},
                   dx=S(0), dy={"kind": "keys", "keys": [[0, 16.0, "linear"], [30, 0.0, "easeOutCubic"]]},
                   exit={"type": "slide_down_fade", "frames": 12}))
    # B4: word-by-word on a dark box, 8-frame spacing (@60), words appear instantly
    ev.append(dict(id="B4_words_box", text="no code needed at all", style="box_black", font=FONT_BOLD, size=44,
                   cx=360, cy=950, start=330, end=430, words={"interval": 8, "scale": S(1.0), "opacity": S(1.0)},
                   scale=S(1.0), opacity=S(1.0), dx=S(0), dy=S(0), exit={"type": "cut"}))
    # B5: SMOOTH-ish critically damped slide from the left (dx -40% W -> 0) with SNAPPY spring
    ev.append(dict(id="B5_slide_in_left", text="watch this", style="box_white", font=FONT_BLACK, size=50,
                   cx=360, cy=420, start=450, end=590,
                   scale=S(1.0), opacity=S(1.0),
                   dx={"kind": "spring", "damping": 14, "stiffness": 180, "mass": 0.6, "from": -0.4 * W, "to": 0.0},
                   dy=S(0), exit={"type": "cut"}))
    return dict(name="synthB", W=W, H=H, fps=fps, N=N, cuts=cuts, crf=30, events=ev, seed=11)


STYLES = {
    "stroke": dict(fill=(255, 255, 255, 255), stroke=5),
    "stroke_yellow": dict(fill=(255, 217, 61, 255), stroke=7),
    "shadow": dict(fill=(255, 255, 255, 255), stroke=0, shadow=True),
    "box_white": dict(fill=(0, 0, 0, 255), stroke=0, box={"bg": (255, 255, 255, 255), "padx": 0.45, "pady": 0.2,
                                                          "radius": 0.35}),
    "box_black": dict(fill=(255, 255, 255, 255), stroke=0, box={"bg": (0, 0, 0, 255), "padx": 0.45, "pady": 0.2,
                                                                "radius": 0.35}),
}


def exit_transform(e, g, fps):
    """Extra (scale_mul, opacity_mul, dx, dy) during the exit; g = frames since exit start."""
    x = e["exit"]
    n = x.get("frames", 0)
    if x["type"] == "cut" or g < 0:
        return 1.0, 1.0, 0.0, 0.0
    u = min(1.0, (g + 1) / n)
    if x["type"] == "fade":
        return 1.0, 1 - u, 0.0, 0.0
    if x["type"] == "scale_out":
        k = float(T.EASINGS["easeInCubic"](np.array([u]))[0])
        return 1 - k, 1 - k, 0.0, 0.0
    if x["type"] == "slide_left":   # moves one full frame width to the left
        k = float(T.EASINGS["easeInCubic"](np.array([u]))[0])
        return 1.0, 1.0, -k, 0.0
    if x["type"] == "slide_down_fade":  # drops 3% of frame height while fading
        k = float(T.EASINGS["easeInCubic"](np.array([u]))[0])
        return 1.0, 1 - u, 0.0, 0.03 * k
    raise ValueError(x["type"])


def render(scene, out_dir):
    W, H, fps, N = scene["W"], scene["H"], scene["fps"], scene["N"]
    k = W / 1080.0
    bgs = [make_background(W, H, scene["seed"] + i, N, fps) for i in range(len(scene["cuts"]) + 1)]
    sprites = {}
    for e in scene["events"]:
        st = STYLES[e["style"]]
        size = int(round(e["size"] * k))
        stroke = int(round(st.get("stroke", 0) * k))
        box = st.get("box")
        spr, wboxes = render_text_sprite(e["text"], e["font"], size, st["fill"], stroke, (0, 0, 0, 255), box,
                                         st.get("shadow", False))
        e["_sprite"], e["_wboxes"] = spr, wboxes
        if "words" in e:  # per-word sprites cut from the full sprite (keeps layout identical)
            # contiguous pieces split at the middle of each inter-word gap
            cuts_x = [0] + [int(round(0.5 * (wboxes[i][2] + wboxes[i + 1][0]))) for i in range(len(wboxes) - 1)] \
                + [spr.shape[1]]
            e["_wsprites"] = [(cuts_x[i], cuts_x[i + 1]) for i in range(len(wboxes))]
        if "highlight" in e:
            hl = e["highlight"]
            e["_hl_sprites"] = []
            nw = len(e["text"].split(" "))
            for wi in range(nw):
                fills = [st["fill"]] * nw
                fills[wi] = tuple(hl["color"]) + (255,)
                s2, _ = render_text_sprite(e["text"], e["font"], size, st["fill"], stroke, (0, 0, 0, 255), box,
                                           st.get("shadow", False), word_fills=fills)
                e["_hl_sprites"].append(s2)
    truth = {"name": scene["name"], "width": W, "height": H, "fps": fps, "frames": N, "cuts": scene["cuts"],
             "events": []}
    per_event = {e["id"]: {"frames": [], "scale": [], "opacity": [], "cx": [], "cy": []} for e in scene["events"]}
    word_tr = {e["id"]: [] for e in scene["events"] if "words" in e}
    path = os.path.join(out_dir, scene["name"] + ".mp4")
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(fps), "-i", "pipe:0", "-c:v", "libx264", "-preset", "medium", "-crf", str(scene["crf"]),
           "-pix_fmt", "yuv420p", "-movflags", "+faststart", path]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for f in range(N):
        seg = sum(1 for c in scene["cuts"] if f >= c)
        frame = bgs[seg](f)
        for e in scene["events"]:
            if f < e["start"]:
                continue
            g = f - e["start"]
            exit_g = f - e["end"]
            if e["exit"]["type"] == "cut" and f >= e["end"]:
                continue
            if exit_g >= e["exit"].get("frames", 0) and e["exit"]["type"] != "cut":
                continue
            sm, om, edx, edy = exit_transform(e, exit_g, fps)
            s = chan_value(e["scale"], g, fps) * sm
            o = chan_value(e["opacity"], g, fps) * om
            # all channel values are canvas pixels; exit offsets are fractions of the canvas
            dx = chan_value(e["dx"], g, fps) + edx * W
            dy = chan_value(e["dy"], g, fps) + edy * H
            cx = e["cx"] + dx
            cy = e["cy"] + dy
            spr = e["_sprite"]
            if "highlight" in e:
                wi = (g // e["highlight"]["interval"]) % len(e["_hl_sprites"])
                spr = e["_hl_sprites"][wi]
            if "words" in e:
                wd = e["words"]
                sw = spr.shape[1]
                wtr = []
                for wi, (x0i, x1i) in enumerate(e["_wsprites"]):
                    gw = g - wi * wd["interval"]
                    if gw < 0:
                        wtr.append(None)
                        continue
                    ws = chan_value(wd["scale"], gw, fps) * s
                    wo = chan_value(wd["opacity"], gw, fps) * o
                    piece = spr[:, x0i:x1i]
                    wcx = cx + ((x0i + x1i) / 2.0 - sw / 2.0) * s
                    composite(frame, piece, wcx, cy, ws, wo)
                    wtr.append([round(ws, 5), round(wo, 5), round(wcx, 3)])
                word_tr[e["id"]].append([f, wtr])
            else:
                composite(frame, spr, cx, cy, s, o)
            pe = per_event[e["id"]]
            pe["frames"].append(f)
            pe["scale"].append(round(float(s), 6))
            pe["opacity"].append(round(float(o), 6))
            pe["cx"].append(round(float(cx), 3))
            pe["cy"].append(round(float(cy), 3))
        proc.stdin.write(frame.tobytes())
    proc.stdin.close()
    proc.wait()
    for e in scene["events"]:
        d = {k2: v for k2, v in e.items() if not k2.startswith("_") and k2 != "font"}
        d["font"] = os.path.basename(e["font"])
        d["sprite_size"] = [int(e["_sprite"].shape[1]), int(e["_sprite"].shape[0])]
        d["truth"] = per_event[e["id"]]
        if e["id"] in word_tr:
            d["word_truth"] = word_tr[e["id"]]
        truth["events"].append(d)
    with open(os.path.join(out_dir, scene["name"] + ".truth.json"), "w") as fh:
        json.dump(truth, fh, indent=1)
    return path


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    for sc in (build_A(), build_B()):
        print(render(sc, out))
