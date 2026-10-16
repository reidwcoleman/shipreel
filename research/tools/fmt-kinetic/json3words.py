"""Parse YouTube json3 auto-captions into word timings (seconds) and print speech-rate stats.
Usage: python3 -I json3words.py <file.json3> [--dump]"""
import json, sys
d = json.load(open(sys.argv[1]))
words = []
for ev in d.get("events", []):
    t0 = ev.get("tStartMs", 0)
    for s in ev.get("segs", []) or []:
        w = (s.get("utf8") or "").strip()
        if not w or w == "\n":
            continue
        words.append((round((t0 + s.get("tOffsetMs", 0)) / 1000, 3), w))
words.sort()
if "--dump" in sys.argv:
    for t, w in words:
        print(f"{t:7.2f} {w}")
n = len(words)
if n:
    span = words[-1][0] - words[0][0]
    print(f"words={n} first={words[0][0]} last={words[-1][0]} span={span:.1f}s rate={n/span:.2f} w/s")
    # rate in first 3s / 10s windows
    for a, b in [(0, 3), (0, 10), (10, 30), (30, 60)]:
        k = sum(1 for t, _ in words if a <= t < b)
        print(f"  {a}-{b}s: {k} words -> {k/(b-a):.2f} w/s")
