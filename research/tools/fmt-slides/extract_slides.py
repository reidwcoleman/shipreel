"""Pull slide image URLs + post stats out of a TikTok post page saved by `yt-dlp --write-pages`.

Usage: python3 -I extract_slides.py POST_DIR
Reads POST_DIR/*.dump (the saved HTML), parses the __UNIVERSAL_DATA_FOR_REHYDRATION__ JSON as data,
writes POST_DIR/slides.json (stats, sound, caption, per-slide size) and prints "NN<TAB>ext<TAB>url" lines.
Falls back to POST_DIR/source.info.json for stats when the page has no item data.
"""
import glob
import json
import os
import re
import sys
from datetime import datetime, timezone


def find_item(obj):
    """Depth-first search for the dict that carries imagePost (the post itself)."""
    stack = [obj]
    while stack:
        cur = stack.pop()
        if isinstance(cur, dict):
            if "imagePost" in cur and isinstance(cur.get("imagePost"), dict):
                return cur
            stack.extend(cur.values())
        elif isinstance(cur, list):
            stack.extend(cur)
    return None


def best_url(img):
    for key in ("imageURL", "displayImage", "originImage", "image_url", "display_image"):
        u = img.get(key)
        if isinstance(u, dict):
            lst = u.get("urlList") or u.get("url_list") or []
            # prefer jpeg renditions (PIL can read them) over heic/webp
            lst = sorted(lst, key=lambda s: (0 if "jpeg" in s or ".jpg" in s else 1 if "webp" in s else 2))
            if lst:
                return lst[0]
    return None


def main(d):
    item = None
    for path in sorted(glob.glob(os.path.join(d, "*.dump"))):
        html = open(path, encoding="utf-8", errors="replace").read()
        for m in re.finditer(r'<script[^>]*id="(__UNIVERSAL_DATA_FOR_REHYDRATION__|SIGI_STATE|__NEXT_DATA__)"[^>]*>(.*?)</script>', html, re.S):
            try:
                data = json.loads(m.group(2))
            except json.JSONDecodeError:
                continue
            item = find_item(data)
            if item:
                break
        if item:
            break
    info = {}
    ip = os.path.join(d, "source.info.json")
    if os.path.exists(ip):
        try:
            info = json.load(open(ip))
        except json.JSONDecodeError:
            info = {}
    out = {"dir": os.path.basename(d.rstrip("/")), "slides": []}
    if item:
        st = item.get("statsV2") or item.get("stats") or {}
        num = lambda k: int(st.get(k)) if st.get(k) not in (None, "") else None  # noqa: E731
        ip_ = item["imagePost"]
        music = item.get("music") or {}
        out.update({
            "id": item.get("id"), "author": (item.get("author") or {}).get("uniqueId"),
            "created": datetime.fromtimestamp(int(item.get("createTime", 0)), timezone.utc).isoformat() if item.get("createTime") else None,
            "desc": item.get("desc"), "photo_title": ip_.get("title"),
            "views": num("playCount"), "likes": num("diggCount"), "comments": num("commentCount"),
            "shares": num("shareCount"), "saves": num("collectCount"),
            "music": {"title": music.get("title"), "author": music.get("authorName"), "duration": music.get("duration"),
                      "original": music.get("original")},
            "is_ad": item.get("isAd"), "aigc": item.get("aigcLabelType") or item.get("AIGCDescription"),
            "location": (item.get("poi") or {}).get("name") if isinstance(item.get("poi"), dict) else None,
        })
        for i, img in enumerate(ip_.get("images") or []):
            u = best_url(img)
            ext = "jpg" if u and ("jpeg" in u or ".jpg" in u) else "webp" if u and "webp" in u else "img"
            out["slides"].append({"n": f"{i + 1:02d}", "w": img.get("imageWidth"), "h": img.get("imageHeight"), "ext": ext, "url": u})
    else:
        out.update({"id": info.get("id"), "author": info.get("uploader"), "desc": info.get("description"),
                    "views": info.get("view_count"), "likes": info.get("like_count"), "saves": info.get("save_count"),
                    "shares": info.get("repost_count"), "comments": info.get("comment_count"),
                    "music": {"title": info.get("track"), "duration": info.get("duration")}, "note": "no page data; cover only"})
        for t in info.get("thumbnails") or []:
            if t.get("id") == "originCover":
                out["slides"].append({"n": "01", "ext": "jpg", "url": t.get("url")})
    json.dump({k: v for k, v in out.items()}, open(os.path.join(d, "slides.json"), "w"), indent=1, ensure_ascii=False)
    for s in out["slides"]:
        if s.get("url"):
            print(f"{s['n']}\t{s['ext']}\t{s['url']}")


if __name__ == "__main__":
    main(sys.argv[1])
