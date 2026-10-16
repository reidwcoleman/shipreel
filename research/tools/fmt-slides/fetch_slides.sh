#!/usr/bin/env bash
# Fetch every slide of TikTok photo-mode posts (plus stats and the sound) into refs/<dir>/.
#   bash research/tools/fmt-slides/fetch_slides.sh research/tools/fmt-slides/refs.tsv
# refs.tsv lines: <dir-name><TAB><tiktok url>   (# lines skipped). Reuses a directory that already exists.
# yt-dlp only returns the audio + cover for photo posts, so it also saves the post page (--write-pages);
# extract_slides.py (run with python -I, treats the page as data) pulls the slide image URLs from it, and the
# images are then downloaded with curl into slides/NN.<ext>. Nothing downloaded is ever executed.
set -u
LIST="$1"
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)/refs"
mkdir -p "$ROOT"
while IFS=$'\t' read -r name url; do
  [[ -z "${name// }" || "$name" == \#* ]] && continue
  dir="$ROOT/$name"
  mkdir -p "$dir/slides"
  if [[ -s "$dir/slides.json" && -n "$(ls "$dir/slides" 2>/dev/null)" ]]; then echo "reuse $name"; continue; fi
  echo "fetch $name <- $url"
  # page dump goes to the cwd, so run yt-dlp from inside the (fresh) post directory
  (cd "$dir" && yt-dlp --no-overwrites --write-pages --write-info-json --no-playlist -f "ba/b" -o "source.%(ext)s" \
      --max-filesize 20M --no-progress "$url" </dev/null >"$dir/fetch.log" 2>&1) || echo "  yt-dlp exit $? (see $dir/fetch.log)"
  python3 -I "$HERE/extract_slides.py" "$dir" >"$dir/urls.txt" || { echo "  extract failed for $name"; continue; }
  i=0
  while IFS=$'\t' read -r n ext u; do
    [[ -z "$u" ]] && continue
    curl -sL -m 60 -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" -e "https://www.tiktok.com/" \
      -o "$dir/slides/$n.$ext" "$u" || echo "  slide $n failed"
    i=$((i+1))
  done <"$dir/urls.txt"
  echo "  $i slides -> $dir/slides"
  sleep 2
done <"$LIST"
