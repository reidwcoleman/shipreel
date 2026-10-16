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

## Auto-posting

Settings → Auto-posting. Pick one or more:

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
