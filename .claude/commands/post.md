---
description: Post or schedule a Shipreel video (AirDrop, upload page, Chrome, or a connected service)
argument-hint: "[video id or title] [where/when, e.g. tiktok tomorrow 6pm]"
---

Use the `shipreel` skill (skills/shipreel/SKILL.md) to post a Shipreel video.

Request: $ARGUMENTS

1. If no video is named, list the ready ones (`list_videos` with `ready: true`, or `node bin/shipreel.mjs ready`) and pick the one the user means; ask if it's ambiguous.
2. Get its post kit; render first if it isn't ready.
3. Check what's connected (`test_connections` / `node bin/shipreel.mjs connect`), then use the easiest route that matches the request (iPhone → upload page → Shipreel's Chrome → connected service). If no time is given and nothing is connected, recommend AirDrop to the iPhone.
4. Never press a final Post/Publish button unless the request says to. Report what happened and the post id.
