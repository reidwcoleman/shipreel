"""Rank yt-dlp --flat-playlist --dump-json lines by view count (untrusted data: parsed only).
Usage: python3 -I rank_jsonl.py <file.jsonl> [top_n]"""
import sys, json, datetime
path = sys.argv[1]
top = int(sys.argv[2]) if len(sys.argv) > 2 else 20
rows = []
for line in open(path):
    try:
        d = json.loads(line)
    except Exception:
        continue
    ts = d.get("timestamp")
    date = datetime.datetime.fromtimestamp(ts, datetime.timezone.utc).date().isoformat() if ts else (d.get("upload_date") or "")
    rows.append((d.get("view_count") or 0, d.get("like_count") or 0, date, d.get("duration"), d.get("url") or d.get("webpage_url"), (d.get("title") or d.get("description") or "").replace("\n", " ")[:110]))
rows.sort(reverse=True)
print(f"{len(rows)} rows")
for r in rows[:top]:
    print(f"{r[0]:>11,} likes={r[1]:>8,} {r[2]} {r[3]}s {r[4]} | {r[5]}")
