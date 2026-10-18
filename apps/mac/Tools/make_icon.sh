#!/bin/zsh
# Renders docs/media/icon.svg's mark into a macOS AppIcon set (Big Sur+ grid: 824pt
# rounded square on a 1024 canvas, with the standard drop shadow) and a menu bar
# template image. Needs rsvg-convert (brew install librsvg).
set -euo pipefail
HERE=${0:A:h}
MAC=${HERE:h}
ASSETS="$MAC/Resources/Assets.xcassets"
ICONSET="$ASSETS/AppIcon.appiconset"
MENU="$ASSETS/MenuBarIcon.imageset"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$ICONSET" "$MENU"

# The mark from docs/media/icon.svg lives in a 32x32 box; the tile is 824 wide at (100,100).
cat > "$TMP/icon.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#E0FF66"/>
      <stop offset="1" stop-color="#C9F230"/>
    </linearGradient>
    <linearGradient id="hi" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="14"/>
      <feOffset dy="12" result="b"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.32"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#s)">
    <rect x="100" y="100" width="824" height="824" rx="185" fill="url(#g)"/>
  </g>
  <rect x="101.5" y="101.5" width="821" height="821" rx="184" fill="none" stroke="url(#hi)" stroke-width="3"/>
  <g transform="translate(100 100) scale(25.75) translate(16 16) scale(0.92) translate(-16 -16)">
    <path d="M12 9.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L13.5 8.64A1 1 0 0 0 12 9.5Z" fill="#1A2009" transform="rotate(-14 16 16)"/>
    <path d="M6.5 22.5l4-4" stroke="#1A2009" stroke-width="2.4" stroke-linecap="round" fill="none"/>
  </g>
</svg>
SVG

# Menu bar: just the mark, black on transparent (template image).
cat > "$TMP/menu.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="4 5 22 22">
  <path d="M12 9.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L13.5 8.64A1 1 0 0 0 12 9.5Z" fill="#000" transform="rotate(-14 16 16)"/>
  <path d="M6.5 22.5l4-4" stroke="#000" stroke-width="2.4" stroke-linecap="round" fill="none"/>
</svg>
SVG

entries=""
for s in 16 32 128 256 512; do
  for scale in 1 2; do
    px=$((s * scale))
    suffix=""; if [[ $scale == 2 ]]; then suffix="@2x"; fi
    name="icon_${s}x${s}${suffix}.png"
    rsvg-convert -w $px -h $px "$TMP/icon.svg" -o "$ICONSET/$name"
    entries+="{\"idiom\":\"mac\",\"size\":\"${s}x${s}\",\"scale\":\"${scale}x\",\"filename\":\"$name\"},"
  done
done
echo "{\"images\":[${entries%,}],\"info\":{\"author\":\"xcode\",\"version\":1}}" > "$ICONSET/Contents.json"

rsvg-convert -w 18 -h 18 "$TMP/menu.svg" -o "$MENU/menubar.png"
rsvg-convert -w 36 -h 36 "$TMP/menu.svg" -o "$MENU/menubar@2x.png"
cat > "$MENU/Contents.json" <<'JSON'
{"images":[{"idiom":"mac","scale":"1x","filename":"menubar.png"},{"idiom":"mac","scale":"2x","filename":"menubar@2x.png"}],
 "info":{"author":"xcode","version":1},"properties":{"template-rendering-intent":"template"}}
JSON
cp "$TMP/icon.svg" "$MAC/Tools/icon-1024.svg"
echo "AppIcon + MenuBarIcon written to $ASSETS"
