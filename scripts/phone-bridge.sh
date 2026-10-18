#!/bin/zsh
# Keep the phone bridge running (launchd agent com.reidcoleman.shipreel.bridge).
#   scripts/phone-bridge.sh install | uninstall | restart | status
set -e
ROOT=${0:A:h:h}
LABEL=com.reidcoleman.shipreel.bridge
PLIST=~/Library/LaunchAgents/$LABEL.plist
LOG=~/Library/Application\ Support/Shipreel/bridge.log
NODE=$(command -v node)
case ${1:-status} in
  install)
    mkdir -p ~/Library/LaunchAgents ~/Library/Application\ Support/Shipreel
    cat > $PLIST <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>$NODE</string><string>$ROOT/scripts/phone-bridge.mjs</string></array>
  <key>WorkingDirectory</key><string>$ROOT</string>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>${NODE:h}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict></plist>
PL
    launchctl bootout gui/$(id -u)/$LABEL 2>/dev/null || true
    launchctl bootstrap gui/$(id -u) $PLIST
    echo "bridge installed" ;;
  uninstall)
    launchctl bootout gui/$(id -u)/$LABEL 2>/dev/null || true
    rm -f $PLIST
    echo "bridge removed" ;;
  restart) launchctl kickstart -k gui/$(id -u)/$LABEL ;;
  status) launchctl print gui/$(id -u)/$LABEL 2>/dev/null | grep -E "state =|pid =" || echo "not installed"
          cat ~/Library/Application\ Support/Shipreel/phone.json 2>/dev/null | grep -E "Url|port" ;;
esac
