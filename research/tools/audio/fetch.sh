#!/usr/bin/env bash
# Download one reference into refs/<dir>/ (a NEW folder per video; reuse if already present).
# usage: bash research/tools/audio/fetch.sh <dir-name> <url> [subs]
#   subs = also/only fetch auto-captions (json3) — used for YouTube word timing (WPM) only.
set -u
name="$1"; url="$2"; mode="${3:-video}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)/refs"
dir="$ROOT/$name"
if ls "$dir"/source.* >/dev/null 2>&1 && [[ "$mode" == video ]]; then
  if ! ls "$dir"/*.part >/dev/null 2>&1; then echo "reuse $name"; exit 0; fi
fi
if [[ -d "$dir" ]]; then
  # another agent may be downloading: wait up to 180 s
  for i in $(seq 1 36); do
    ls "$dir"/*.part >/dev/null 2>&1 || break
    sleep 5
  done
  if ls "$dir"/source.* >/dev/null 2>&1 && [[ "$mode" == video ]]; then echo "reuse(waited) $name"; exit 0; fi
fi
mkdir -p "$dir"
if [[ "$mode" == subs ]]; then
  yt-dlp --skip-download --write-auto-subs --write-subs --sub-langs "en.*,en" --sub-format json3 \
    -o "$dir/source.%(ext)s" --no-playlist --no-progress "$url" </dev/null
else
  yt-dlp -f "bv*[height<=1920]+ba/b" --merge-output-format mp4 -o "$dir/source.%(ext)s" \
    --write-info-json --no-playlist --max-filesize 60M --no-progress "$url" </dev/null
fi
ls -la "$dir"
