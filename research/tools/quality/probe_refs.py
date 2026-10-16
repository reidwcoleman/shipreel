#!/usr/bin/env python3
"""Probe platform-served reference files (yt-dlp downloads) for how each platform encodes what it serves.

Run isolated (the inputs are untrusted downloads):
    python3 -I research/tools/quality/probe_refs.py <out.json> <media files or ref dirs...>

For each media file: container/stream facts via ffprobe (codec, profile, level, pix_fmt, size, fps,
bitrates, colour tags, audio rate/channels) plus EBU R128 loudness (integrated LUFS, LRA, true peak)
via ffmpeg's ebur128 filter. If a sibling yt-dlp *.info.json exists, the served format id and the
platform's full format ladder (codec / resolution / bitrate per rendition) are summarised too.
The JSON is only parsed as data; nothing from it is executed or used to build a command line.
"""
import json
import os
import re
import subprocess
import sys

MEDIA_EXT = (".mp4", ".m4a", ".webm", ".mov", ".mkv")


def ffprobe(path):
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", "--", path],
        capture_output=True, text=True, timeout=120,
    )
    return json.loads(r.stdout or "{}")


def loudness(path):
    r = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-map", "0:a:0", "-af",
         "ebur128=peak=true:framelog=quiet", "-f", "null", "-"],
        capture_output=True, text=True, timeout=600,
    )
    s = r.stderr
    tail = s[s.rfind("Summary:"):] if "Summary:" in s else ""

    def grab(label):
        m = re.search(label + r":\s+(-?[\d.]+|-inf)", tail)
        return None if not m or m.group(1) == "-inf" else float(m.group(1))

    return {"I_LUFS": grab("I"), "LRA_LU": grab("LRA"), "truePeak_dBTP": grab("Peak")}


def fps_of(stream):
    try:
        n, d = stream.get("avg_frame_rate", "0/1").split("/")
        return round(int(n) / int(d), 3) if int(d) else None
    except Exception:
        return None


def summarise_info(info_path):
    try:
        info = json.load(open(info_path, encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        return {"error": str(e)}
    keep = ("format_id", "ext", "vcodec", "acodec", "width", "height", "fps", "tbr", "vbr", "abr", "asr",
            "filesize", "dynamic_range", "format_note")
    out = {k: info.get(k) for k in ("extractor", "format_id", "duration", "width", "height", "fps", "vcodec", "acodec")}
    ladder = []
    for f in info.get("formats") or []:
        if not isinstance(f, dict):
            continue
        if f.get("vcodec") in (None, "none") and f.get("acodec") in (None, "none"):
            continue
        if (f.get("protocol") or "").startswith("m3u8") and f.get("vcodec") in (None, "none"):
            continue
        ladder.append({k: f.get(k) for k in keep})
    out["ladder"] = ladder
    return out


def collect(args):
    files = []
    for a in args:
        if os.path.isdir(a):
            for name in sorted(os.listdir(a)):
                if name.lower().endswith(MEDIA_EXT) and not name.startswith("."):
                    files.append(os.path.join(a, name))
        elif a.lower().endswith(MEDIA_EXT):
            files.append(a)
    return files


def main():
    out_path, rest = sys.argv[1], sys.argv[2:]
    rows = []
    for path in collect(rest):
        p = ffprobe(path)
        fmt = p.get("format", {})
        v = next((s for s in p.get("streams", []) if s.get("codec_type") == "video"), None)
        a = next((s for s in p.get("streams", []) if s.get("codec_type") == "audio"), None)
        row = {
            "file": path,
            "container": fmt.get("format_name"),
            "duration_s": float(fmt["duration"]) if fmt.get("duration") else None,
            "size_bytes": int(fmt["size"]) if fmt.get("size") else None,
            "total_kbps": round(int(fmt["bit_rate"]) / 1000) if fmt.get("bit_rate") else None,
        }
        if v:
            row["video"] = {
                "codec": v.get("codec_name"), "tag": v.get("codec_tag_string"), "profile": v.get("profile"),
                "level": v.get("level"), "pix_fmt": v.get("pix_fmt"), "w": v.get("width"), "h": v.get("height"),
                "fps": fps_of(v), "kbps": round(int(v["bit_rate"]) / 1000) if v.get("bit_rate") else None,
                "color_range": v.get("color_range"), "color_space": v.get("color_space"),
                "color_transfer": v.get("color_transfer"), "color_primaries": v.get("color_primaries"),
                "bits": v.get("bits_per_raw_sample"),
            }
        if a:
            row["audio"] = {
                "codec": a.get("codec_name"), "profile": a.get("profile"), "rate": int(a.get("sample_rate", 0) or 0),
                "channels": a.get("channels"), "kbps": round(int(a["bit_rate"]) / 1000) if a.get("bit_rate") else None,
            }
            row["loudness"] = loudness(path)
        stem = os.path.splitext(path)[0]
        for cand in (stem + ".info.json", os.path.join(os.path.dirname(path), "source.info.json")):
            if os.path.exists(cand):
                row["ytdlp"] = summarise_info(cand)
                break
        rows.append(row)
        print(json.dumps({k: row.get(k) for k in ("file", "video", "audio", "loudness")}))
    json.dump(rows, open(out_path, "w"), indent=1)


if __name__ == "__main__":
    main()
