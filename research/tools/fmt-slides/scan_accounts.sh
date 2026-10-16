#!/usr/bin/env bash
# List recent posts (metadata only, no media) for TikTok accounts and summarise their photo-mode posts.
# Usage: bash research/tools/fmt-slides/scan_accounts.sh OUT_DIR N account1 account2 ...
# Writes OUT_DIR/<account>.json (yt-dlp flat playlist) and prints a summary via summarize_account.py.
set -u
OUT="$1"; N="$2"; shift 2
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$OUT"
for acct in "$@"; do
  f="$OUT/$acct.json"
  if [[ ! -s "$f" ]]; then
    yt-dlp --flat-playlist -J --playlist-end "$N" "https://www.tiktok.com/@$acct" >"$f" 2>"$OUT/$acct.err" </dev/null || echo "FAIL $acct"
  fi
  python3 -I "$HERE/summarize_account.py" "$f"
done
