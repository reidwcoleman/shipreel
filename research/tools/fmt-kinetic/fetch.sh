#!/usr/bin/env bash
# fmt-kinetic: download reference videos, one NEW directory per video under refs/.
# Usage: bash research/tools/fmt-kinetic/fetch.sh <dir-name> <url>
# Reuses refs/<dir>/source.mp4 when another agent already fetched it; waits for in-flight .part files.
set -u
name="$1"; url="$2"
ROOT="/Users/reidcoleman/Glide/Shipreel/refs"
LOGDIR="/private/tmp/claude-501/-Users-reidcoleman-Glide-TradeBot/4d5a8376-3bef-4ef1-bbea-c35a494d3377/scratchpad/fetchlogs"
mkdir -p "$LOGDIR"
dir="$ROOT/$name"
if [[ -f "$dir/source.mp4" ]]; then echo "reuse $name"; exit 0; fi
if [[ -d "$dir" ]]; then
  for i in $(seq 1 36); do
    [[ -f "$dir/source.mp4" ]] && break
    ls "$dir"/*.part >/dev/null 2>&1 || ls "$dir"/*.ytdl >/dev/null 2>&1 || break
    sleep 5
  done
  if [[ -f "$dir/source.mp4" ]]; then echo "reuse(waited) $name"; exit 0; fi
fi
mkdir -p "$dir"
cd "$LOGDIR"
yt-dlp -f "bv*[height<=1920]+ba/b" --merge-output-format mp4 -o "$dir/source.%(ext)s" \
  --write-info-json --no-playlist --max-filesize 60M --no-progress "$url" </dev/null >"$LOGDIR/$name.log" 2>&1 \
  && echo "ok $name" || { echo "FAIL $name"; tail -3 "$LOGDIR/$name.log"; }
ls "$dir"
