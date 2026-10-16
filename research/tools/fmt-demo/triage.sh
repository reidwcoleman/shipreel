#!/usr/bin/env bash
# Quick triage: grab frames at fixed times from refs/<dir>/source.mp4 into a scratch folder.
# Usage: triage.sh <out_dir> <ref_dir...>
set -u
OUT="$1"; shift
mkdir -p "$OUT"
for d in "$@"; do
  n=$(basename "$d")
  for t in 0.3 1.5 3 6 10 16; do
    ffmpeg -nostdin -loglevel error -y -ss "$t" -i "$d/source.mp4" -frames:v 1 -vf "scale=270:-2" "$OUT/${n}__${t}.jpg" 2>/dev/null
  done
done
