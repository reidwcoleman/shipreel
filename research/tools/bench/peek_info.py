"""Print a safe summary of a yt-dlp info.json (untrusted data: only read + print selected fields)."""
import json, sys
p = sys.argv[1]
d = json.load(open(p))
keys = ["id","title","uploader","uploader_id","channel","timestamp","upload_date","duration","view_count","like_count","comment_count","repost_count","width","height","fps","vcodec","acodec","tbr","vbr","abr","ext","webpage_url","description"]
for k in keys:
    if k in d and d[k] not in (None, ""):
        v = d[k]
        if isinstance(v, str) and len(v) > 300: v = v[:300] + "..."
        print(f"{k}: {v}")
fm = d.get("formats") or []
print("n_formats:", len(fm))
for f in fm[:40]:
    print("  fmt", f.get("format_id"), f.get("ext"), f.get("width"), f.get("height"), f.get("vcodec"), f.get("acodec"), f.get("tbr"), (f.get("url") or "")[:90])
th = d.get("thumbnails") or []
print("n_thumbs:", len(th))
for t in th[:12]:
    print("  thumb", t.get("id"), t.get("width"), t.get("height"), (t.get("url") or "")[:120])
# look for image-post keys
for k in d:
    if "image" in k.lower() or "slide" in k.lower() or "photo" in k.lower():
        print("KEY", k, str(d[k])[:300])
