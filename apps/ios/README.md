# Shipreel for iPhone

Review, approve and post Shipreel videos from your phone. The phone talks to Shipreel on your Mac
through the phone bridge (`scripts/phone-bridge.mjs`, launchd agent
`com.reidcoleman.shipreel.bridge`): over home Wi-Fi when it can, otherwise through the bridge's
Cloudflare tunnel.

- **Pairing**: on the Mac, Shipreel → Settings → iPhone (or File → Pair iPhone…) shows a code.
  Scan it in the app, or copy the link on the Mac and use *Paste Link*. `shipreel://pair?…` links
  open the app directly. The token is kept in the Keychain.
- **Review**: a full-screen vertical feed of pending videos (swipe up/down, tap to pause, sound
  toggle; carousels swipe sideways). Reject, Request changes (type or dictate), and
  **Approve & Post**, which opens a sheet with captions, platforms, timing and Dry run.
- **Posts**, **Create** (runs Claude Code on the Mac and streams it) and **Accounts** tabs mirror
  the Mac app.

Shares `apps/shared` (models, API client, fonts) with the Mac app.

## Build and install

```bash
cd apps/ios
Tools/install-phone.sh            # Release build, then installs as soon as the phone is reachable
Tools/install-phone.sh --no-build # install the last build
Tools/make_icon.sh                # regenerate the icon from docs/media/icon.svg
```

The phone must be unlocked and on the same Wi-Fi as the Mac (or plugged in). The script retries
every 30 s for about two hours, then launches the app.

For the Simulator: `xcodegen generate`, then build the `ShipreelPhone` scheme. Debug builds accept
launch arguments for testing without taps: `-pairLink <shipreel://pair?…> -tab posts -item 3
-sheet approve`.

If you make a new pairing code on the Mac, phones show “Pair again” and need to scan once more.
