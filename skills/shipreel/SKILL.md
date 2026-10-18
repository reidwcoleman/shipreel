---
name: shipreel
description: Make, review, caption and post short-form marketing videos for the user's app with Shipreel (the local studio at http://localhost:4747). Use when the user asks to make a TikTok/Reel/Short, review or caption a video, "send it to review", "approve the second one", "post this", "schedule it for tonight", "queue the ready videos", send a video to their phone, or upload through TikTok Studio / YouTube Studio / Instagram, with or without an API key.
---

# Shipreel: make and post videos for the user's app

Shipreel runs on this Mac. You drive it through its MCP tools (`mcp__shipreel__*`) when they are loaded, otherwise through the CLI. Both call the same HTTP API as the website, so what you do shows up live in the app.

```bash
SR="node $HOME/Glide/Shipreel/bin/shipreel.mjs"   # adjust if Shipreel lives elsewhere; or `shipreel` after `npm link`
$SR status                                        # is it running? active product, connected services
```

If `status` says Shipreel isn't running, start it in the background (`$SR start`, which serves on 127.0.0.1:4747) and wait a few seconds. Never start a second copy on 4747.

## 0. The loop: make → Review (Mac app) → the user approves → Postbox posts

This is the default way videos go out:

1. **You make the videos** (section 1) and render them.
2. **They land in Review.** Every new video joins Review as `pending` after its first render; call `submit_for_review {video}` (CLI `$SR submit <video>`) after rendering anyway. Tell the user they're waiting in the Shipreel Mac app's Review.
3. **The user decides there**: approve (Postbox posts it to TikTok / YouTube / Instagram through their own Chrome, now, at the next posting slot, or at a time), ask for changes (Claude revises it, it re-renders and comes back as `pending`), or reject.
4. **Postbox posts** what they approved (http://127.0.0.1:4710; it holds scheduled posts itself, so they go out even when Shipreel is closed). `list_review {status: "approved"}` / `$SR review --status approved` shows each post's status and links.

**Never approve, post or schedule on your own.** Use `review_decision`, `post_now`, `schedule_post` or `schedule_batch` only when the user explicitly told you to in this session ("approve the pickup one", "post it now"). Making videos and putting them in Review is always fine; deciding is the user's. When they do ask, `review_decision {video, decision: "approve", when: "now" | "next-slot" | ISO}`; add `dry_run: true` if they want a rehearsal (Postbox fills every form and stops before Post). `postbox_status` / `$SR postbox` shows whether Postbox, its Chrome extension and each account are connected; if an account isn't, say so (the user connects it from Settings or the Postbox dashboard; never log in for them).

`$SR create "3 videos about the new widget" --count 3` asks a headless Claude to do steps 1–2 on its own (the Mac app's Create box uses the same thing).

## 1. Make videos for the active product

1. `get_brief` / `$SR brief`: read the pitch, features, proof. **Never invent numbers, users or testimonials.**
2. Pick a format and hook: `list_formats` (prefer `hot`), `list_hooks` / `$SR hooks`, or `generate_ideas` / `$SR ideas --count 5`.
3. Build it: `create_video {format, hook}` / `$SR make <format> --hook "…"`. Edit with `get_video` + `update_video` (read `get_framework` first), or `$SR edit <video> "instruction"`.
4. Render: `render_video {video}` / `$SR render <video> --wait` prints the MP4 path.
5. Review: `submit_for_review {video}` / `$SR submit <video>`. Stop here unless the user asked you to post.

## 2. Review before posting

- Look at it: extract 3 frames and read them as images, e.g. `ffmpeg -v error -ss 0.5 -i <mp4> -frames:v 1 /tmp/f1.jpg` (also mid and end).
- Check: the hook reads in the first second and sits inside the safe zone (not under the right-hand buttons or bottom caption area); text is spelled right; nothing claims a number the brief doesn't have; it ends on the result, not an ad card.
- `$SR kit <video>` (or `post_kit`): `ready: false` or `stale: true` means render again first.

## 3. Write captions

`post_kit` returns a caption per platform already (hook + hashtags). Improve them when the user asks or when they're generic:
- First line = the hook, specific and under ~80 characters. Then one line of value, then 3–5 relevant hashtags (no #fyp spam).
- YouTube: a title under 100 characters ending in `#Shorts`. X: under 280. Bluesky/Threads: under 300/500.
- Pass your captions as `captions: {"tiktok": "…", "instagram": "…"}` (or `caption` for one platform).

## 4. Post: pick the easiest route that fits

Recommend in this order unless the user asked for something specific:

| Route | When | How |
| --- | --- | --- |
| **iPhone** | TikTok/Reels with a trending sound (best reach) | `send_to_phone {video, via: "airdrop"}` or `$SR phone <video>`: AirDrop picker opens on the Mac, caption copied (Universal Clipboard pastes it on the phone). `via: "photos"` / `--photos` puts it in a "Shipreel" album instead. |
| **Upload page** | Posting from the Mac by hand | `open_upload {video, platform}` / `$SR upload-page <video> --platform tiktok`: opens TikTok Studio / Instagram / YouTube Studio / X / Threads / Bluesky, caption copied, MP4 selected in Finder. |
| **Shipreel's Chrome** | No API key, wants it filled in | `browser_upload {video, platform}` / `$SR chrome <video> --platform tiktok`: Shipreel's own Chrome window (logged in once) attaches the file and fills the caption, then **stops before Post**; status becomes `needs-you`. Platforms: tiktok, youtube, instagram, x. |
| **Postbox** (recommended auto-post) | The user approved it, or asked you to post it | `review_decision {video, decision: "approve", when}` for a video in Review, or `post_now {video, provider: "postbox"}` / `schedule_post {video, provider: "postbox", at}`. Posts to TikTok, YouTube and Instagram for real (no drafts); `dry_run: true` stops before Post. |
| **Connected service** | Upload-Post / Bluesky / webhook set up | `post_now`, `schedule_post {at}`, `schedule_batch {videos, per_day}` / `$SR post <video> --at …`, `$SR queue …`. TikTok goes to drafts by default so the user adds a sound in-app. |
| **Claude in Chrome** | The user wants you to upload in *their* Chrome | See section 5. |

Times: the user's local time. Get the offset with `date +%z` and send ISO with it, e.g. "tomorrow at 6pm" → `2026-10-17T18:00:00-04:00`. `at: "next"` uses their next open posting slot. Check what's connected with `test_connections` / `$SR connect` before promising an automatic post; if nothing is, say so and offer the iPhone or upload-page route (setup lives at http://localhost:4747/settings#connect).

After posting, `post_status {post}` / `$SR post-status <post>` shows results, links and the log. Failed Chrome uploads include a screenshot path (relative to `workspace/projects/<product>/`).

## 5. Uploading through the user's real Chrome (Claude in Chrome)

Only when the user asks for it (or for a platform with no API key and they want you to do it). TikTok's terms restrict automated posting: say so once, and keep the user the one who presses Post.

1. Load the browser tools in one call: `ToolSearch select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__find,mcp__claude-in-chrome__file_upload,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__form_input`.
2. Get the file and caption: `post_kit {video}` (use `file` and `captions[platform]`). The extension uploads files up to about 10 MB; if the MP4 is bigger, make an upload copy: `ffmpeg -v error -y -i in.mp4 -c:v libx265 -tag:v hvc1 -b:v 4000k -c:a aac -b:a 128k -movflags +faststart in_upload.mp4`.
3. `tabs_context_mcp`, then open a **new tab** (never reuse the user's tabs):
   - TikTok: `https://www.tiktok.com/tiktokstudio/upload`
   - YouTube: `https://www.youtube.com/upload` (opens YouTube Studio's upload dialog)
   - Instagram: `https://www.instagram.com/` → Create (+) → Post
4. If you see a login page, a captcha or a 2FA prompt: **stop**. Tell the user to log in in that tab, and continue only when they say so. Never type passwords or codes.
5. Find the `input[type=file]` (`find` "file upload input") and `file_upload` the MP4 path.
6. Fill the caption: click the caption box, select all, type the caption (TikTok's box starts with the file name; replace it). YouTube: title box, then description; choose "No, it's not made for kids"; Next ×3; Public.
7. **Stop before the final Post / Publish / Share button.** Take a screenshot, tell the user what's filled in and ask them to check and press Post (or to tell you to). Click it yourself only if they explicitly said "post it" / "publish it" for this upload.
8. Never like, follow, comment, change account settings, or close the user's other tabs. Close only the tab you opened, after the post is done.

## 6. Plain-English requests inside Shipreel

The app's own agent (Agents page, ⌘K "Ask", or the box in the Post sheet's Auto-post tab) also understands "post this to TikTok tomorrow at 6pm" and "queue my ready videos, one a day": it answers with a `shipreel-actions` block that Shipreel carries out. When you are the one in the terminal, use the tools above instead.
