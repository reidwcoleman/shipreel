#!/bin/zsh
# Build Shipreel.app: xcodegen + xcodebuild, DerivedData kept under apps/mac/build/
# (gitignored), result copied to apps/mac/build/Shipreel.app.
#   Tools/build.sh            Debug build
#   Tools/build.sh release    Release build
#   Tools/build.sh run        Debug build, then open it
set -euo pipefail
HERE=${0:A:h}
MAC=${HERE:h}
cd "$MAC"

CONFIG=Debug
OPEN=0
for a in "$@"; do
  case $a in
    release) CONFIG=Release ;;
    run) OPEN=1 ;;
  esac
done

command -v xcodegen >/dev/null || { echo "xcodegen not found: brew install xcodegen"; exit 1; }
xcodegen generate --quiet

DD="$MAC/build/DerivedData"
xcodebuild -project Shipreel.xcodeproj -scheme Shipreel -configuration "$CONFIG" \
  -derivedDataPath "$DD" -destination 'platform=macOS' \
  -allowProvisioningUpdates build 2>&1 | grep -E "error:|warning: .*Sources/|BUILD (SUCCEEDED|FAILED)|\*\* " || true

APP="$DD/Build/Products/$CONFIG/Shipreel.app"
[[ -d "$APP" ]] || { echo "Build failed (no $APP)"; exit 1; }
rm -rf "$MAC/build/Shipreel.app"
cp -R "$APP" "$MAC/build/Shipreel.app"
# Keep the disk tidy: intermediates are large and rebuilt on demand.
rm -rf "$DD/Build/Intermediates.noindex/Shipreel.build/$CONFIG/Shipreel.build/Objects-normal"/*/*.o(N) 2>/dev/null || true
rm -rf "$DD/Index.noindex" "$DD/Logs" 2>/dev/null || true
echo "Built $MAC/build/Shipreel.app"
(( OPEN )) && open "$MAC/build/Shipreel.app"
exit 0
