"""Print key fields of yt-dlp info.json files (untrusted data: read-only, no execution)."""
import json, sys, datetime
for p in sys.argv[1:]:
    try:
        d = json.load(open(p))
    except Exception as e:
        print(p, "ERR", e); continue
    ud = d.get("upload_date") or ""
    print(f"{p}\n  url={d.get('webpage_url')}\n  uploader={d.get('uploader')} channel={d.get('channel')} date={ud} dur={d.get('duration')}s"
          f"\n  views={d.get('view_count')} likes={d.get('like_count')} comments={d.get('comment_count')} reposts={d.get('repost_count')}"
          f"\n  w x h={d.get('width')}x{d.get('height')} fps={d.get('fps')} vcodec={d.get('vcodec')} filesize={d.get('filesize') or d.get('filesize_approx')}"
          f"\n  title={(d.get('title') or '')[:200]!r}\n  desc={(d.get('description') or '')[:300]!r}\n  track={d.get('track')} artist={d.get('artist')}")
