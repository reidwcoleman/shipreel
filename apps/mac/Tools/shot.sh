#!/bin/zsh
# Drive a Debug build of Shipreel for screenshots (no Screen Recording permission needed).
#   Tools/shot.sh route posts        Tools/shot.sh snap /tmp/posts.png
set -euo pipefail
HERE=${0:A:h}
BIN="$HERE/../build/shipreel-debug-post"
if [[ ! -x "$BIN" || "$HERE/debug/post.swift" -nt "$BIN" ]]; then
  mkdir -p "${BIN:h}"
  swiftc -O "$HERE/debug/post.swift" -o "$BIN"
fi
"$BIN" "$@"
