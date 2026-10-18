# Shipreel for Mac

A native SwiftUI app (shares `../shared` with the iPhone app) for reviewing the videos Shipreel makes, approving them, and letting
Postbox post them from your Chrome. It talks only to the Shipreel server
(`http://127.0.0.1:4747`, contract in `../REVIEW-API.md`).

- **Review**: queue in the sidebar, 9:16 player (loops, sound, scrub; carousels page with ←/→),
  post settings in the inspector (per-platform captions, platforms with Postbox status, Now /
  Next slot / a time, Dry run). **Approve & Post** ⌘↩, **Request Changes** ⌘R (Claude revises
  it and it comes back), **Reject** ⌘⌫ (with Undo). J/K or ↑/↓ move, Space plays, M mutes.
- **Create**: “Make 3 videos about …” runs Claude Code in the Shipreel folder and streams it
  live; new videos land in Review. **Open in Terminal** (⇧⌘T) starts `claude` in the Shipreel
  folder so you can drive it yourself; what it submits shows up in Review too.
- **Posts**: scheduled, posting, posted and failed posts, links to the live posts, Cancel for
  scheduled ones, and the fix for failures (e.g. Connect YouTube in Postbox).
- **Accounts**: Postbox, its Chrome extension, and TikTok / Instagram / YouTube connections.
- Live updates over `/api/events`, a notification per new video (asked once, after a primer),
  the pending count on the Dock icon and in the menu bar.
- **Pair iPhone** (File menu, Accounts, or Settings → iPhone): a QR code for the iPhone app
  (`apps/ios`), the phone bridge's status (Wi-Fi addresses, tunnel), *Install Phone Bridge*, and
  *New Pairing Code*.
- Approve/Reject ignore auto-repeated keys and items that have been on screen under 1.2 s, so a
  held ⌘↩ can't run down the queue.
- If Shipreel isn't running, **Start Shipreel** runs `npm run start` in the Shipreel folder
  (log: `~/Library/Logs/Shipreel/server.log`). The server keeps running after you quit the app
  so scheduled posts still go out.

## Build and run

Needs Xcode 16+ and [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`).

```bash
cd apps/mac
Tools/build.sh          # Debug build → build/Shipreel.app
Tools/build.sh run      # build and open it
Tools/build.sh release  # Release build
```

DerivedData lives in `apps/mac/build/` (gitignored). To work in Xcode: `xcodegen generate`, then
open `Shipreel.xcodeproj`.

Settings (⌘,): server URL (default `http://127.0.0.1:4747`), Shipreel folder (default
`~/Glide/Shipreel`), dry run by default, notifications, appearance (dark by default).

## Brand

Colors come from the website's CSS variables (`docs/index.html`): near-black ground, the lime
accent only on the primary action and the mark. Big headings use Instrument Serif, bundled from
Google Fonts under the SIL Open Font License 1.1 (`Resources/Fonts/OFL.txt`); everything else
is the system font. The app icon is generated from `docs/media/icon.svg` by `Tools/make_icon.sh`
(needs `rsvg-convert`).

## Developing without the server

Debug builds listen for commands from `Tools/shot.sh`, which helps with screenshots when the
terminal has no Screen Recording permission:

```bash
Tools/shot.sh route posts              # review | create | posts | accounts | caughtup
Tools/shot.sh snap /tmp/posts.png      # the app images its own window
Tools/shot.sh appearance light
```

Point the app at a mock server with
`defaults write com.reidcoleman.shipreel serverURL http://127.0.0.1:4762`
(and `defaults delete com.reidcoleman.shipreel serverURL` to go back).
