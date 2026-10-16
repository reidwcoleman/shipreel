"""Print key metadata from yt-dlp info.json files (treated as untrusted data; values only)."""
import json, sys, os, datetime
for p in sys.argv[1:]:
    try:
        d = json.load(open(p))
    except Exception as e:
        print(p, "ERR", e); continue
    ts = d.get("timestamp")
    date = d.get("upload_date") or (datetime.datetime.utcfromtimestamp(ts).strftime("%Y%m%d") if ts else None)
    title = (d.get("title") or d.get("description") or "")[:110].replace("\n", " ")
    print(f"{os.path.basename(os.path.dirname(p))}\n   views={d.get('view_count')} likes={d.get('like_count')} comments={d.get('comment_count')} date={date} dur={d.get('duration')} {d.get('width')}x{d.get('height')} fps={d.get('fps')}\n   title={title!r}\n   track={(d.get('track') or '')[:60]!r} uploader={d.get('uploader')}")
