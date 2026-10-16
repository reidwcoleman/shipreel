#!/usr/bin/env bash
# Download reference videos into refs/<dir>/source.mp4 (one NEW directory per video; reuse if present).
# Usage: bash research/tools/fmt-demo/fetch_refs.sh research/tools/fmt-demo/refs.tsv
set -u
LIST="$1"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)/refs"
LOGDIR="${FETCH_LOG_DIR:-${TMPDIR:-/tmp}/fmt-demo-fetch-logs}"
mkdir -p "$ROOT" "$LOGDIR"
while IFS=$'\t' read -r name url; do
  [[ -z "${name// }" || "$name" == \#* ]] && continue
  dir="$ROOT/$name"
  if [[ -f "$dir/source.mp4" ]]; then echo "reuse $name"; continue; fi
  if [[ -d "$dir" ]]; then
    for i in $(seq 1 36); do
      [[ -f "$dir/source.mp4" ]] && break
      ls "$dir"/*.part >/dev/null 2>&1 || ls "$dir"/*.ytdl >/dev/null 2>&1 || break
      sleep 5
    done
    if [[ -f "$dir/source.mp4" ]]; then echo "reuse(waited) $name"; continue; fi
  fi
  mkdir -p "$dir"
  echo "download $name <- $url"
  yt-dlp -f "bv*[height<=1920]+ba/b" --merge-output-format mp4 -o "$dir/source.%(ext)s" \
    --write-info-json --no-playlist --max-filesize 60M --no-progress "$url" </dev/null >"$LOGDIR/$name.log" 2>&1 \
    && echo "ok $name" || echo "FAIL $name (see $LOGDIR/$name.log)"
  ls "$dir"
done <"$LIST"
