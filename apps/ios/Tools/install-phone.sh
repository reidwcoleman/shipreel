#!/bin/zsh
# Builds Shipreel for iPhone (Release) and installs it on Reid's iPhone as soon as the phone is
# reachable (unlocked, on the same Wi-Fi as this Mac, or plugged in). Retries every 30 s for up to
# ~2 hours, then launches the app.   Tools/install-phone.sh [--no-build]
set -euo pipefail
cd "${0:A:h:h}"
DEV=${DEVICE_ID:-3DA4E97D-EA6D-5A93-9719-B52E3EB83F25}
BUNDLE=com.reidcoleman.shipreel.phone
DD=build/DerivedData
APP="$DD/Build/Products/Release-iphoneos/Shipreel.app"

# devicectl can hang for minutes; run it with a time limit.
limit() { local secs=$1; shift; "$@" & local pid=$!; ( sleep $secs; kill $pid 2>/dev/null ) & local watcher=$!; wait $pid; local rc=$?; kill $watcher 2>/dev/null; return $rc; }

if [[ "${1:-}" != "--no-build" ]]; then
  xcodegen generate --quiet
  xcodebuild -project ShipreelPhone.xcodeproj -scheme ShipreelPhone -configuration Release \
    -destination 'generic/platform=iOS' -derivedDataPath "$DD" -allowProvisioningUpdates build \
    | grep -E "error:|\*\* BUILD" || true
  rm -rf "$DD/Build/Intermediates.noindex" "$DD/Index.noindex" "$DD/Logs" 2>/dev/null || true
fi
[[ -d "$APP" ]] || { echo "No build at $APP"; exit 1; }

for i in {1..240}; do
  if limit 180 xcrun devicectl device install app --device "$DEV" "$APP" >/dev/null 2>&1; then
    limit 60 xcrun devicectl device process launch --device "$DEV" --terminate-existing "$BUNDLE" >/dev/null 2>&1 || true
    echo "installed $(date)"
    exit 0
  fi
  echo "phone not reachable yet (try $i) $(date +%H:%M:%S)"
  sleep 30
done
echo "gave up $(date)"
exit 1
