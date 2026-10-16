"""Summarise yt-dlp --dump-json metadata files (untrusted data; only parsed, never executed).
Usage: python3 -I meta_summary.py <json files...>"""
import json, sys, datetime
for p in sys.argv[1:]:
    try:
        d = json.load(open(p))
    except Exception as e:
        print(p, "ERR", e); continue
    ts = d.get("timestamp")
    date = datetime.datetime.utcfromtimestamp(ts).strftime("%Y-%m-%d") if ts else d.get("upload_date")
    fmts = d.get("formats") or []
    best = max(((f.get("height") or 0, f.get("width") or 0) for f in fmts), default=(0, 0))
    print(f"{p.split('/')[-1]:50s} views={d.get('view_count')} likes={d.get('like_count')} comments={d.get('comment_count')} reposts={d.get('repost_count')} date={date} dur={d.get('duration')} res={best[1]}x{best[0]} formats={len(fmts)}")
    desc = (d.get("description") or d.get("title") or "").replace("\n", " ")
    print("    desc:", desc[:220])
    tr = d.get("track") or d.get("artist")
    if tr: print("    track:", d.get("track"), "/", d.get("artist"))
