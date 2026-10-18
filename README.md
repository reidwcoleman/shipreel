# Shipreel

The marketing department that lives next to your repo.

Shipreel turns your app (or vibe-coded project) into short-form videos that sell it, and posts them. Point it at your code; Claude Code or Codex reads it and writes the product brief; you swipe through hooks that are working right now; Shipreel builds the videos with your real screens, you tweak them in a full editor (or tell an agent what to change), and they go out on schedule to TikTok, Reels, Shorts, X, LinkedIn, Threads and Bluesky.

Everything runs on your Mac. Your keys and footage never leave it except to reach the service they belong to.

## Start it

```bash
cd ~/Glide/Shipreel
npm install        # first time only
npm run dev        # http://localhost:4747
```

Open http://localhost:4747. The first run walks you through it: pick a project folder (or paste an App Store / website link, or describe the app), watch the agent read it, check the brief, and pick a first video.

For everyday use, the production build is faster: `npm run app` (builds, then serves on port 4747).

Shipreel only listens on this Mac (127.0.0.1), and its API refuses requests from other websites, because it can start agents and post for you.

## What's inside

| Page | What it's for |
| --- | --- |
| **Home** | What's going out today, your streak, the next videos in line. |
| **Hook Lab** | Swipe right on ideas (hook + format + beats) and they're built instantly, or by an agent. |
| **Studio** | Every video, live-rendered from its spec. Hover to play. *New video → Clone a viral video*: paste a TikTok/Reel/Short link and Claude studies its frames, hook, pacing and sound, then rebuilds the format for your app (structure only, never their footage). |
| **Editor** | Scenes, media, voiceover + word captions, music, layers (text, stickers, face cam), timeline, TikTok/Reels/Shorts feed preview with safe zones, a launch check, and “tell Claude what to change”. |
| **Calendar** | Week view of posts, the queue, and Results: log numbers (or drop an analytics screenshot and Claude reads it) and get a verdict, plus “make 3 variations” for winners. |
| **Viral Library** | 25 formats (hot / steady / saturated) previewed with *your* product, 200+ hooks (fill-in templates and real ones from real accounts, with sources), 70 trending sounds and the playbook. |
| **Product** | The brief every video is written from, your media (upload, record the iOS Simulator, import App Store screenshots), the agent memory file, and growth tools (an attribution branch in your repo). |
| **Agents** | Claude Code and Codex status, sign-in, model/effort, “ask your marketing agent”, run history, and how to drive Shipreel from your own agent session. |

The research behind all of this (formats, hooks, sounds, design specs, posting APIs, the competitive landscape and the practitioner playbook, gathered October 2026) is in `research/`.

### Native formats

The viral app accounts don't use phone mockups, zooms or end cards. They post things that look like a person made them on their phone. These formats copy that, measured from ~200 viral app videos (`research/viral/`):

| Format | What it looks like |
| --- | --- |
| `raw-demo` | A full-screen screen recording in one take, with TikTok's boxed text changing at each step. |
| `found-this` | A real-life clip with a Snapchat-bar hook, then the app opened and used in one take. |
| `text-card` | A floating iMessage card over footage, every message read aloud by two voices; the app saves the day mid-story. |
| `mental-load` | One relatable paragraph over a real-life clip. The app is only named in the caption. |
| `that-girl` | “6 reasons why … is THAT girl”: a numbered serif list over lifestyle clips and app screens. |
| `ditch-old-way` | The old way, the app opening, a ✅ list that builds on the beat, then the payoff shot. |
| `backdrop-pov` | One “me checking the app…” line over a single screen. |
| `setup-receipts` | A 3:4 photo carousel: a quoted compliment, then the screens that are the answer. |

### Carousels

13 photo-mode carousel formats copied from what the slideshow tools and the viral app accounts post (`research/viral/competitors.md`, `slideshow.md`): `photo-story` (a six-photo story, AI photos optional), `app-stack`, `wish-i-knew`, `day-in-life`, `before-after-slides`, `texts-receipts`, `notes-carousel`, `old-vs-new`, `rate-my-setup`, `pinterest-tips`, `what-id-do`, `mistakes-list` and `hot-take`. Slides are 3:4 with TikTok's own text; the hook is on slide 1, the app arrives late as a raw screenshot, and the soft CTA sits in the last slide's second text box. Photos come from your uploads and from stills Shipreel pulls out of your b-roll (the two sharpest moments of each clip). Every carousel renders as numbered PNG slides *and* a 9:16 photo-mode MP4 with a swipe on each beat of the music bed.

**AI images (optional, off by default):** Settings → AI images uses your signed-in Higgsfield CLI for the AI-photo story (one locked, faceless look per product, so the photos read as one camera roll) and for 3-second reaction clips in the project's hook-clip library (`double-take` opens on them). Costs are shown from `higgsfield generate cost`, every result is cached, and spending stops at your credit budget (default 25).

New video formats: `double-take` (a 3 s reaction hook, then a hard cut on the drop into the app) and `flip-through` (a hook clip, then a beat-cut flip through every screen under one boxed line).

When a video renders, Shipreel renders it once without text at low resolution and checks what's under each caption. It moves captions off busy UI, and swaps white text for TikTok's boxed text on light screens. Captions you place by hand (a `y` in the text style) are left alone.

## Claude Code and Codex

Shipreel uses the agents you already have, with your own subscriptions:

- **Claude Code**: found automatically (`claude` on your PATH). Sign in once by running `claude` in Terminal.
- **Codex**: not installed on this Mac yet. Agents → *Install Codex* (runs `npm i -g @openai/codex`), then *Sign in to Codex* (or run `codex login`). Until then Shipreel can launch it through `npx`, but it still needs the sign-in.

Agents get a **framework** to work with: each video is a JSON `VideoSpec`, each product has `project.json` and `memory.md`, and `workspace/FRAMEWORK.md` teaches the rules (scene types, formats, hooks, safe zones, never inventing numbers). Reads of your code are read-only. The only thing that writes to your repo is the opt-in *attribution branch*, which works on a new git branch and never pushes.

### Drive Shipreel from your own Claude Code or Codex session (MCP)

```bash
claude mcp add shipreel -- node ~/Glide/Shipreel/bin/shipreel-mcp.mjs
codex mcp add shipreel -- node ~/Glide/Shipreel/bin/shipreel-mcp.mjs
```

Then, in your app's repo: *“make a TikTok about the feature I just shipped and schedule it for tonight.”* The server exposes `get_brief`, `list_formats`, `list_hooks`, `create_video`, `clone_video`, `get_video`, `update_video`, `render_video`, `schedule_post`, `log_results` and more. Shipreel must be running.

Claude Desktop: add this to `~/Library/Application Support/Claude/claude_desktop_config.json` (use the full path to `node` from `which node`; `node bin/shipreel.mjs mcp` prints it filled in):

```json
{ "mcpServers": { "shipreel": { "command": "/usr/local/bin/node", "args": ["/Users/you/Glide/Shipreel/bin/shipreel-mcp.mjs"] } } }
```

**Skill and `/post`**: Claude Code opened in this repo picks up `skills/shipreel/SKILL.md` (linked from `.claude/skills/`) and the `/post` command. To use them from your app's repo too: `ln -s ~/Glide/Shipreel/skills/shipreel ~/.claude/skills/shipreel`.

### CLI

```bash
node bin/shipreel.mjs help
node bin/shipreel.mjs ideas --count 5                 # instant ideas (or --engine claude)
node bin/shipreel.mjs make doubter-reveal             # build a video from a format
node bin/shipreel.mjs clone https://www.tiktok.com/@…/video/…   # rebuild a viral video's format
node bin/shipreel.mjs edit <video> "make the hook punchier"
node bin/shipreel.mjs render <video> --wait           # prints the MP4 path
node bin/shipreel.mjs post <video> --at next --platforms tiktok,instagram
```

(`npm link` puts `shipreel` on your PATH.)

## Review & auto-post

The loop: make videos (in the terminal with Claude, the Mac app's Create box, the Hook Lab or by hand) → each one lands in **Review** after its first render → you watch it in the Shipreel Mac app and **approve**, **ask for changes** (Claude edits it, it re-renders and comes back) or **reject** → approved videos are posted by **[Postbox](http://127.0.0.1:4710)** (`~/Postbox`), the local poster that uploads to TikTok, YouTube and Instagram through your own logged-in Chrome. Postbox holds scheduled posts itself, so they go out even when Shipreel is closed; Shipreel syncs the status and links back.

- API (the Mac app's contract): `apps/REVIEW-API.md`: `/api/review`, `/api/postbox`, `/api/create` (Claude Code makes videos from a prompt with the Shipreel MCP server; it never posts).
- Terminal: `shipreel create "2 videos about the new widget" --count 2`, `shipreel review`, `shipreel approve <video> --when next-slot [--dry-run]`, `shipreel revise <video> "shorter hook"`, `shipreel postbox`. MCP: `submit_for_review`, `list_review`, `review_decision`, `postbox_status`; `post_now` / `schedule_post` take `provider: "postbox"`.
- Editor → ⋯ → *Send to review* puts any video in the queue. Settings → Connect accounts shows Postbox, its Chrome extension and each account (*Connect* opens the login page in your Chrome). Postbox becomes the default posting service the first time Shipreel sees it running.
- Claude never approves or posts on its own; that's your call in Review (or an explicit "post it" in the terminal).
- **Mac app** (`apps/mac`, build with `apps/mac/Tools/build.sh`): Review with a phone-sized player, Posts, Create (a prompt box that streams Claude's run like a terminal, plus *Open in Terminal*), Accounts, notifications and a Dock badge. *Approve & Post* is blocked until Postbox can really post (its Chrome extension is connected); scheduling and dry runs still work.
- **iPhone app** (`apps/ios`, install with `apps/ios/Tools/install-phone.sh` while the phone is unlocked on the same Wi-Fi): the same Review queue as a full-screen swipe feed, with Posts, Create and Accounts. Pair it from the Mac app (Settings → iPhone): scan the QR code. The phone reaches the Mac through `scripts/phone-bridge.mjs` (launchd agent, `scripts/phone-bridge.sh install`): port 4748 on home Wi-Fi and an encrypted Cloudflare quick tunnel elsewhere, token-protected, passing only the review/posts/create/accounts endpoints. Shipreel itself still only listens on 127.0.0.1.

## Posting

Every video has a **Post** button (editor, Studio and Home cards; *Open post kit* in the Calendar). Easiest first:

1. **iPhone**: *AirDrop to iPhone* opens the AirDrop picker with the MP4 and copies the caption (paste it on the phone through Universal Clipboard), or *Save to Photos* puts it in a "Shipreel" album that iCloud syncs. Post from the app with a trending sound: the best reach on TikTok. If macOS blocks Photos, allow it in System Settings → Privacy & Security → Automation.
2. **Upload page**: one click per platform copies that caption, selects the MP4 in Finder and opens TikTok Studio, Instagram, YouTube Studio, X, Threads or Bluesky. Drag the file in, paste.
3. **Chrome**: Shipreel opens the upload page in its own Chrome window (`workspace/browser-profile`; log in once), attaches the video, fills the caption and stops before Post. Turn on *Press Post for me* per platform in Settings → Connect accounts if you want it to finish on its own. TikTok, YouTube, Instagram and X. No captcha or 2FA solving: if a login is needed, it waits for you.
4. **Auto-post**: *Post now* or *Schedule* through a connected service (below). *Post all ready* in the Studio spreads your rendered videos across the next days at your posting times.
5. **Let Claude do it**: in Claude Code, `/post` or "post the newest video to TikTok tomorrow at 6pm" (MCP tools `send_to_phone`, `open_upload`, `browser_upload`, `post_now`, `schedule_post`, `schedule_batch`, `post_status`; CLI `shipreel phone|upload-page|chrome|queue`). The in-app agent understands the same requests.

## Auto-posting

Settings → Connect accounts (each has a *Test* button). Pick one or more:

- **Upload-Post** (recommended): one API key posts to TikTok (including drafts), Instagram, YouTube, X, LinkedIn, Threads, Facebook, Pinterest and Bluesky. Paste the key, press *Connect accounts*, link your socials on their page. TikTok needs their paid Basic plan (about $16–24/month); the free tier is 10 uploads a month without TikTok.
- **Bluesky**: direct and free with an app password.
- **Webhook**: Shipreel POSTs the post, captions per platform and the file URL to Zapier, Make, n8n or your own server. Answer with `{"urls": {"tiktok": "https://…"}}` to link the live posts.
- **Manual handoff**: always works. At post time you get a Mac notification, and the Calendar has the file and captions ready.
- **Claude in Chrome (experimental, off by default)**: Claude Code uploads through TikTok Studio in your logged-in Chrome. TikTok's terms prohibit automated posting, so accounts can be restricted. Use it only on accounts you can afford to lose.

Posts go out while the app is running (it checks every 30 seconds and renders first). TikTok posts go to **drafts** by default so you can add a trending sound in the app: copyrighted songs can't be added through the API, and baking them into the file gets videos muted.

## Voice, music, sound

- **Voiceover**: Editor → Audio. Free Mac voices work offline; with an ElevenLabs key you get natural voices with exact word timing. Either way Shipreel adds animated word captions and can lengthen scenes to fit the voice.
- **Music**: every new video gets one of 8 built-in royalty-free beds (`public/music`, Mixkit Free License, details in `public/music/LICENSES.md`) with its cuts snapped to the beat and the drop on the cut into the app. Editor → Audio → *Built-in beds* re-snaps to another track. You can also upload tracks you own or compose one with ElevenLabs Music (about $0.15/minute). For trending songs, remove the bed and add the song in TikTok when you post the draft.
- **Real footage**: upload real-life clips under Product → Media and give them the role *B-roll* (9:16 camera clips get it automatically). Formats like *Problem → app → payoff* open on the problem clip and end on the payoff clip. Free stock (Pexels, Mixkit) is fine; Pexels asks that people in clips aren't shown endorsing your product.
- **Taps and pop-out cards**: on any clip, Editor → *Taps* adds touch ripples with a click, and *Pop-out cards* lifts a piece of the screen out of the phone toward the camera.
- **Sound effects**: whooshes, pops, dings and risers are generated locally and placed automatically (toggle per video or per scene).

If you already have an ElevenLabs key in `~/.config/explainer-video/.env`, Settings offers to import it (the key stays on the server side).

## Where things live

```
workspace/                  your data (git-ignored); move it with SHIPREEL_HOME=/path
  FRAMEWORK.md              the rules agents follow
  settings.json, .secrets.json (0600)
  projects/<id>/
    project.json            the brief
    memory.md               what worked and what flopped (agents read it)
    videos/<id>.json        one VideoSpec per video
    assets/                 your footage, voiceovers, music
    renders/                MP4s and carousel stills
    posts.json, ideas.json
src/remotion/               the video engine (16 scene types, caption styles from the feed)
src/framework/              formats, hooks, sounds, scoring, playbook
src/lib/server/             agents, rendering, posting, scheduler
bin/                        CLI and MCP server
research/                   the October 2026 social media research
```

Keys can also come from environment variables: `SHIPREEL_UPLOAD_POST_KEY`, `SHIPREEL_ELEVENLABS_KEY`, `SHIPREEL_BLUESKY_HANDLE`, `SHIPREEL_BLUESKY_APP_PASSWORD`, `SHIPREEL_WEBHOOK_URL`.

## Good to know

- **Remotion license**: videos render with Remotion, free for individuals and companies of up to 3 people. If you sell Shipreel to other people or use it in a bigger company, Remotion needs a company license (remotion.pro).
- **Honesty**: templates that show numbers (revenue, users, payments) are marked until you replace them with real ones, and the launch check flags them. App Store cards only show a rating or chart rank you type in, and mock tweets and Reddit posts only show the counts you give them.
- **Platform rules change**: trending sounds and formats move weekly. Library → Sounds → *Refresh with Claude* researches the current week.
- If the dev server ever serves stale code after you edit Shipreel itself, stop it, `rm -rf .next`, and start again.
- **Local only**: the server binds to 127.0.0.1 and answers only `localhost`/`127.0.0.1` hostnames. To reach it through a tunnel or a container you trust, list those hostnames in `SHIPREEL_ALLOWED_HOSTS=host1,host2`.
