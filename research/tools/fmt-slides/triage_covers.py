"""Print cover-image URLs for candidate posts so they can be eyeballed before a full slide fetch.

Usage: python3 -I triage_covers.py ACCT_DIR VIRLO_JSON id1 id2 ...
Looks each id up in ACCT_DIR/*.json (yt-dlp flat listings) and in the Virlo dataset; prints "id<TAB>url".
"""
import glob
import json
import sys


def main(acct_dir, virlo, ids):
    want = set(ids)
    found = {}
    for f in glob.glob(f"{acct_dir}/*.json"):
        try:
            d = json.load(open(f))
        except Exception:  # noqa: BLE001
            continue
        if not isinstance(d, dict):
            continue
        for e in d.get("entries", []) or []:
            if isinstance(e, dict) and e.get("id") in want:
                for t in e.get("thumbnails") or []:
                    if t.get("id") == "originCover":
                        found[e["id"]] = t["url"]
    try:
        v = json.load(open(virlo))
        for r in v.get("data", []):
            pid = r["url"].rstrip("/").split("/")[-1]
            if pid in want and pid not in found and r.get("thumbnail_url"):
                found[pid] = r["thumbnail_url"]
    except Exception:  # noqa: BLE001
        pass
    for i in ids:
        print(f"{i}\t{found.get(i, '')}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3:])
