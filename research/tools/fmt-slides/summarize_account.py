"""Summarise a yt-dlp flat-playlist JSON of a TikTok account: photo-mode posts vs videos, medians, top posts.

Usage: python3 -I summarize_account.py ACCOUNT.json [top_n]
Photo-mode posts are recognised by 'photomode' in the cover thumbnail URL.
"""
import json
import statistics
import sys
from datetime import datetime, timezone


def main(path, top_n=8):
    try:
        d = json.load(open(path))
    except Exception as e:  # noqa: BLE001
        print(f"!! {path}: {e}")
        return
    es = [e for e in d.get("entries", []) if isinstance(e, dict)]
    rows = []
    for e in es:
        thumbs = " ".join(t.get("url", "") for t in (e.get("thumbnails") or []))
        photo = "photomode" in thumbs
        ts = e.get("timestamp")
        date = datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%d") if ts else "?"
        rows.append({
            "id": e.get("id"), "photo": photo, "date": date, "views": e.get("view_count") or 0,
            "likes": e.get("like_count") or 0, "saves": e.get("save_count") or 0,
            "shares": e.get("repost_count") or 0, "comments": e.get("comment_count") or 0,
            "track": e.get("track"), "title": (e.get("title") or "")[:80], "uploader": e.get("uploader"),
        })
    if not rows:
        print(f"== {path}: no entries")
        return
    acct = rows[0]["uploader"]
    ph = [r for r in rows if r["photo"]]
    vi = [r for r in rows if not r["photo"]]
    med = lambda xs: statistics.median(xs) if xs else 0  # noqa: E731
    span = f"{min(r['date'] for r in rows)}..{max(r['date'] for r in rows)}"
    print(f"== @{acct}: {len(rows)} posts ({span}); photo {len(ph)} median views {med([r['views'] for r in ph]):,.0f}; "
          f"video {len(vi)} median views {med([r['views'] for r in vi]):,.0f}")
    if ph:
        lr = [r["likes"] / r["views"] for r in ph if r["views"]]
        sr = [r["saves"] / r["views"] for r in ph if r["views"]]
        print(f"   photo median like-rate {100 * med(lr):.2f}%  save-rate {100 * med(sr):.3f}%")
    for r in sorted(ph, key=lambda r: -r["views"])[:top_n]:
        v = r["views"] or 1
        print(f"   PHOTO {r['date']} {r['views']:>11,} L{100 * r['likes'] / v:5.2f}% S{100 * r['saves'] / v:6.3f}% "
              f"Sh{r['shares']:>7,} id={r['id']} | {r['title']} | {r['track']}")


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 8)
