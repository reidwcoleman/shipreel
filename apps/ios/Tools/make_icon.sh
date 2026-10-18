#!/bin/zsh
# iOS app icon from docs/media/icon.svg's mark: one opaque 1024 square (iOS applies the mask).
set -euo pipefail
HERE=${0:A:h}
SET="${HERE:h}/Resources/Assets.xcassets/AppIcon.appiconset"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
mkdir -p "$SET"
cat > "$TMP/icon.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E0FF66"/><stop offset="1" stop-color="#C9F230"/></linearGradient></defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  <g transform="scale(32) translate(16 16) scale(0.8) translate(-16 -16)">
    <path d="M12 9.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L13.5 8.64A1 1 0 0 0 12 9.5Z" fill="#1A2009" transform="rotate(-14 16 16)"/>
    <path d="M6.5 22.5l4-4" stroke="#1A2009" stroke-width="2.4" stroke-linecap="round" fill="none"/>
  </g>
</svg>
SVG
rsvg-convert -w 1024 -h 1024 -b "#D6FA4C" "$TMP/icon.svg" -o "$SET/icon-1024.png"
cat > "$SET/Contents.json" <<'JSON'
{"images":[{"idiom":"universal","platform":"ios","size":"1024x1024","filename":"icon-1024.png"}],"info":{"author":"xcode","version":1}}
JSON
# The mark as an image for in-app use (rounded tile, like docs/media/icon.svg).
MARK="${HERE:h}/Resources/Assets.xcassets/Mark.imageset"
mkdir -p "$MARK"
rsvg-convert -w 240 -h 240 "${HERE:h:h:h}/docs/media/icon.svg" -o "$MARK/mark@3x.png"
echo '{"images":[{"idiom":"universal","scale":"3x","filename":"mark@3x.png"}],"info":{"author":"xcode","version":1}}' > "$MARK/Contents.json"
echo "wrote $SET and $MARK"
