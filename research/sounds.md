# Shipreel audio research: what app marketers use, what's trending, and how to post it legally

As of **2026-10-15**. Companion data files:

- `sounds.json`: 70 sounds, schema-validated.
- `music_sources.json`: 13 royalty-free/library sources, 14 AI generators, 14 SFX sources and a 28-item SFX palette.

---

## TL;DR

1. **App marketing on TikTok is mostly voice-led, not song-led.** In 176 app/tech TikToks I sampled on 2026-10-15, **78% used an "original sound"** (voiceover, talking head or the creator's own audio). Dev, launch and "vibe coding" content ran at **89%**. App listicle and aesthetic slideshows are where songs matter: 31% of those used a library or commercial track.
2. **The public Creative Center "Songs" chart is gone.** Logged out, Creative Center → Trends shows only Hashtag, Creator ("Coming soon") and Video. Music URLs redirect to Hashtags and the page says "Go to TikTok One to view more rankings and data." The 7-day, 30-day and "breakout" song views couldn't be read without logging in, which I did not do.
3. **There is an official, fully licensed way to auto-post TikToks with trending music, but only for Business accounts and only for Commercial Music Library (CML) tracks.** The TikTok API for Business exposes:
   - `GET /open_api/v1.3/discovery/cml/trending_list/`: the top 100 CML tracks by country, genre and a 1/7/30/90-day window.
   - `music_sound_info.music_sound_id`: attaches one of those tracks on `POST /business/video/publish/` and `/business/photo/publish/`, with volume, start and end controls.
   - Limits: 6 posts per minute and 15 per day per account.
4. **No API can attach a non-CML trending song.** The TikTok Content Posting API has no sound parameter for video. Photo posts get only `auto_add_music`, which works in Direct Post mode only and lets TikTok pick the track. The legal route to a trending song is a draft: upload to the TikTok inbox (at most 5 pending per 24 h), then the user adds the sound in the TikTok app.
5. **Never bake a copyrighted trending song into an auto-posted file.** Each platform's own rules block it:
   - **TikTok:** third-party posting makes the user accept the Music Usage Confirmation, which says the video has no copyrighted music or the user has paid for all licenses. Business accounts can't use non-commercial music. TikTok also says its licenses outside the CML "don't cover the commercial use of music in content."
   - **Instagram:** Meta's guidelines prohibit commercial or non-personal music use without a license. Unlicensed audio gets muted or blocked.
   - **YouTube:** Shorts over 1 minute with an active claim are blocked.
6. **Hot right now for app content:**
   - TikTok: "Saxophones getting louder (Sped Up)" (1.8M videos, #1 rising), "Midnight Sun" (Zara Larsson, the most-repeated song in app listicles), "Be OK", "Paper Moon Static", "Patient Zero", "Earrings", "Stop The Wedding!" and the "-A" text hook.
   - Reels: "Nicole Kidman" (ADÉLA), "Upside Down" and "Pure", plus business-available picks such as "Can I See Your Work?", "GEEKIN", "Netflix Documentary", "The Multitasker", "Hello October" and "Autumn Colors".
   - Shorts: "iSpy" (KYLE), "They're Hiding In Plain Sight", "Vibin" and "blue".
7. **Evergreen sounds that keep coming back** (TikTok video counts):

   | Sound | TikTok videos | Note |
   |---|---|---|
   | Monkeys Spinning Monkeys | 27.8M | CC BY: legal to bake in with credit |
   | Aesthetic (Tollan Kim) | 23.3M | |
   | Funny (Gold-Tiger) | 15.9M | |
   | Chopin Nocturne | 7.2M | |
   | snowfall | 6.6M | |
   | Storytelling | 2.4M | |
   | Cornfield Chase | 792K | |
   | No One Else (prodshushy) | 753K | Before/after transitions |

8. **For baked-in audio, generate or license it.**
   - AI: Stable Audio 3.0 costs $0.08 per generation (up to ~6 min). Lyria 3 Clip is $0.04 per 30 s. Eleven Music is $0.15/min, with its commercial terms spelled out. MiniMax Music 2.0 is $0.03 per song via fal.
   - Libraries with an API: Epidemic Sound (Scale plan, with sublicensing), Jamendo, Openverse and Freesound (for SFX).
   - Pixabay, YouTube Audio Library, Uppbeat and Incompetech have no API.
9. **Recommended Shipreel strategy:** split every post into **Owned audio (auto)**, **Licensed trending (auto, TikTok Business + CML)** and **Trending song (human-in-the-loop draft)** lanes. Details in §10.

---

## 1. How this was researched, and what couldn't be reached

| Source | What I got | Notes |
|---|---|---|
| TikTok Creative Center → Trends → Songs (US) | **Not available.** The music URL redirects to `/creative/creativeCenter/trends/hashtag`. Public trends show Hashtag, Creator ("Coming soon") and Video only. | "Go to TikTok One to view more rankings and data." Login would be required, and I didn't log in. |
| Creative Center Top Ads, Apps industry, US, 30 days | Only 4 ads visible logged out. The top one is Momo AI ("Try viral trend with Momo AI!"; Photography; Conversions; 7K likes; CTR top 23%; high budget; CTR highlight frames at 1 s, 8 s and 19 s). The others are an Education app (90 likes) and two Health & Fitness apps (0 and 2K likes). | Music isn't shown on ad detail pages. The ad videos are ad-only posts ("Video currently unavailable"). `yt-dlp` was blocked by TikTok ("Your IP address is blocked", no impersonation backend installed). **The top app ads' music could not be confirmed.** The top app ad's own hook sells "the viral trend" itself. |
| TikTok sample (my own) | 176 videos from 11 TikTok discover pages: aesthetic-apps, productivity-apps, app-launch, vibe-coding, apps-every-girl-needs, iphone-apps, app-recommendations, study-apps, cool-apps, app-reveal, before-and-after-transition-sound. | Each video's sound was read from the page's embedded data. Sound-page video counts were read on 2026-10-15. Discover pages mix dates, but most videos are from 2026. |
| TikTok roundups | Revid (updated Oct 15, hourly sample, excludes library music), Tokchart (Oct 15; top 5 public, the rest paywalled), SocialPilot (Oct 12-25), NewEngen (Oct 14, using the MusicMaestro Week 40 chart), Later (Oct 2 and Oct 9), Metricool (Oct 14) | Tokboard (tokboard.com) no longer resolves. Hootsuite's TikTok-trends post is from March 2026 and is stale. |
| Instagram roundups | CreatorDB (Oct 14, Heat score), ScottSocial (Oct 12, with business-use flags and audio links), Buffer (Oct 14), Later (Oct 9), NewEngen (Oct 1), SocialPilot (Oct 12-25), SocialBee (Oct 14) | Instagram publishes no chart. Business-use flags are third-party, so verify them in-app. |
| YouTube Shorts | **Official** YouTube Charts "Weekly Top Songs on Shorts" (US, Oct 2-8, 2026) and the daily chart (Oct 14) | charts.youtube.com/charts/TopShortsSongs/us/weekly |
| Platform documentation | TikTok Business API docs (read in browser), TikTok Content Posting API docs, TikTok Support and legal pages, Meta developer docs, YouTube Help, vendor pricing pages | Quoted where load-bearing. |

**Limits on this research:**

- The session's shared web-search quota ran out partway through. After that I worked only from direct page fetches and the browser.
- Creator newsletters weren't covered.
- Everything marked "verify" or "unknown" in the JSON couldn't be confirmed from a primary page.

---

## 2. What audio app marketers actually use

| Page group (TikTok discover) | Videos | Original sound | Library or commercial track |
|---|---|---|---|
| Dev, launch, "vibe coding", "cool apps", "app reveal" | 64 | 57 (**89%**) | 7 |
| App listicles and aesthetic: "aesthetic apps", "apps every girl needs", "iPhone apps", "app recommendations", "study apps", "productivity apps" | 96 | 66 (69%) | 30 (**31%**) |
| "Before and after transition sound" | 16 | 15 | 1 |
| **Total** | **176** | **138 (78%)** | **38 (22%)** |

**Repeats among the 38 tracks:**

- **Midnight Sun** (Zara Larsson): 3 videos.
- **Bossa-nova and lo-fi library beds** ("Golden Hour Bossa", "Morning Blend Bossa", "Loop | Cafe, Lofi Game Style Bossa Nova", "Retro Lo-fi beat chill & hiphop for working", "Lo-Fi Hip Hop Radio"): 5. These are planner and productivity brands, i.e. the CML-style safe choice.
- Two videos each: **Better in the Dark** (TV Girl & Jordana), **Smile** (Lily Allen), **Duvet** (cover) and Bad Bunny's **MONACO** (two versions).
- Single uses: "Storytelling" (Adriel), "Insomniac", "A Kissaten at Night", "I Need a Dollar (Instrumental)", "LEGACY" (PIXY), "Party In The U.S.A.", "No One Else" (prodshushy).

**What this means for Shipreel:**

- **Voice is the hook for dev, launch and demo content.** Shipreel's default output should be voiceover or TTS plus on-screen text, a quiet bed and SFX. A trending song is optional seasoning.
- **Songs matter most in slideshows and listicles.** That is exactly the format TikTok's photo API can auto-score (`auto_add_music` or a CML `music_sound_id`).
- **Productivity brands already default to CML-type bossa and lo-fi.** That fits Business accounts, which can only use commercially licensed music.

---

## 3. Trending now (week of Oct 15, 2026)

### TikTok: best bets for app content

| Sound | TikTok videos (10-15) | Status | App use |
|---|---|---|---|
| Saxophones getting louder - Sped Up | 1.8M | Rising, #1 on Revid (+78% WoW) | Build-up reveal: the messy "before", then the app at the loudest point |
| Midnight Sun (Zara Larsson) | 506.2K | Rising, also on the Shorts chart | "Apps you need" listicles and screen-recording montages |
| Paper Moon Static (Marnie Cusk) | 713.8K | Rising | Cozy planner and journal slideshows |
| Be OK (Ingrid Michaelson) | 151.7K | Rising | Pain-point POV: carefree clip plus text naming the frustration |
| Patient Zero (Taylor Swift) | 171.3K | Rising | Launch-day montage that lands on the closing line |
| Earrings (Malcolm Todd) | 392.5K | Rising | "Day in my life as an indie dev" b-roll |
| Stop The Wedding! (Ashe) | 129.1K (top upload) | Rising | 2-4 photo carousel: "STOP THE WEDDING, you still use Notes for X?" |
| "-A" text sound (Pretty Little Liars) | n/a | Rising | Text-message hook signed "-A" calling out a habit |
| Two Fishes (Love Island USA) | 33.2K | Rising | Mock-serious "hot take" lip-sync |
| What You Waiting For? (Gwen Stefani) | 28K (111K Reels) | Rising | Founder origin story ("take a chance 'cause you might grow") |
| Training Season (Dua Lipa) | 1.1M | Rising | Manifesting or grind montage |
| Funny (Gold-Tiger) | 15.9M | Evergreen, +150% WoW | Dev-life skits |

**Seasonal sounds that expire around Nov 1:**

- we fell in love in october: 2.1M, peaking.
- Ramalama (Bang Bang): 457.9K, which Revid already marks "cooling". Format: reveal on the drum drop.
- Hello, October (Tung Tulip): 143.7K.
- Peli De Terror: 460K UGC videos.
- white rabbit's bells: 17.5K, early stage.
- Spooky Scary Skeletons: SocialPilot flags the House VIP Remix as approved for business use on TikTok.

**General TikTok charts:**

- **Tokchart (Oct 15):** Zany Emote Fortnite (716.7K), Peli De Terror, "Na Para Bang x Teach Me How To Dougie" (343K UGC), "Wyw My Sweetie #Jerseyclub (Slowed)".
- **Revid weekly:** Saxophones…, La Mujer del Pelotero (68.2K), Funny, Strangers (SKARS), Steven Universe (L.Dre), Ramalama (cooling).
- **Revid 30-day:** also Paper Moon Static, BLUE WATER CANDY (159.8K), Chopin Nocturne (7.2M), VERITY HARDTEKK Slowed (115.8K), Earrings, Cafe Mariposa (217.7K) and the Nicole Kidman instrumental (95.5K).
- **Metricool weekly** (likely CML tracks, since its song picker is Business-only): Sunset in Girona, Self Aware, DUNG DING BREGA, Gotta Be, Jazz with a warm atmosphere, Espresso Soul, Hushed Aroma, Mint Breeze, Mari-Mari, Zamba Tuya.

### Instagram Reels

"Business" here means the sound is available to business accounts **in Instagram's own audio picker**. It is not a license to bake the track into an uploaded file.

| Audio | Reels | Business? | App use |
|---|---|---|---|
| Nicole Kidman (ADÉLA) | ~185K | No | "Entering my era" glow-up. Buffer flags NSFW lyrics. |
| Patient Zero (Taylor Swift) | ~130K | No | Launch-day montage |
| Upside Down (Diana Ross) | 127-175K | No | Hand-flip before → after |
| Someday We Will Dream About Today (The Sways) | 213-238K | No | Nostalgic founder montage |
| Pure (Sienna Spiro) | 41-70K | No | "I think about it all the time" UI close-ups |
| What You Waiting For? (Gwen Stefani) | 111K | No | Founder story |
| Hello October (Sugar Lime Blue) | 187-200K | **Yes** | Fall slideshow (until Nov) |
| Autumn Colors (LuLuMusic) | 55K | **Yes** | Instrumental fall bed |
| "Can I see your work?" (BEAUTY AND A BEAT X COLA, ALTÉGO MIX) | 91K | **Yes** (verify) | Rapid feature tour |
| GEEKIN (Nemzzz): "I've been ghosting you cause I'm workin" | 18K | **Yes** | Build-in-public BTS |
| Netflix Documentary (original audio) | 164K | **Yes** | Founder lore |
| The multi-tasker (original audio) | 29K | **Yes** | Solo-founder job titles |
| Money Can't Buy You Happiness (original audio) | 125K | **Yes** | Testimonials |
| 9 to 5 (Dolly Parton) | 77K | **Yes** (verify) | "9-5, then 5-9 on my app" |
| Sometimes (Fleetwood Mac): "So, what brought you here?" | 40K | **Yes** (verify) | Why users switched |
| Work & Result; "Wait, let me wipe the camera" (James and Antler) | 5.5K; 2.2K | **Yes** | Before → after reveals |
| Vibin (Wxoda): "& finally…" text | n/a (#5 on Shorts) | Unknown | "& finally… the app is live" |

### YouTube Shorts (official chart: US, weekly, Oct 2-8, 2026)

**Top 12:**

1. iSpy (KYLE ft. Lil Yachty)
2. Dead Girls (Penelope Scott)
3. They're Hiding In Plain Sight. Can't You See? (Crossing Bridges)
4. Botsu 8 (The Last Dance Song) (Torial), new
5. Vibin (Wxoda)
6. misery. (pupsies)
7. The Wonder Pets!, new
8. Oh Klahoma (Jack Stauber)
9. blue (yung kai)
10. STEREO LOVE FUNK (Cotneus, PVNZER, KNGMN)
11. Sunflower (Post Malone, Swae Lee)
12. Ain't In LA (ADÉLA)

**Elsewhere in the top 50:** Midnight Sun, snowfall, Past Lives, we fell in love in october, 9 to 5, BbY WOW, a Spooky Scary Skeletons remix, and several phonk "MONTAGEM … (Slowed)" tracks.

**Biggest mover:** "Jane! (Hoodtrap)", up 32 to #18.

**Daily chart (Oct 14):** misery., Oh Klahoma, iSpy, Meant To Be, ELA PEIDA FUNK, Bow Bow Bow, "Cool (That Or That)", Training Season, LEGACY (Slowed).

**Crossover watch:**

- **Spotify US daily, Oct 9** (via a Shinechart post): BbY WOW, Nicole Kidman, Ain't In LA, the cure, Earrings, Patient Zero, Beauty And A Beat, stupid song, Stop The Wedding!, Die With A Smile.
- **CreatorDB "crossing over next" to Reels:** Choosin' Texas (Ella Langley), Stupid Song (Olivia Rodrigo), Oh Yeah? (Steve Lacy), Rein Me In (Sam Fender), Bring Me to Life (Evanescence).

---

## 4. Format → sound playbook

| Format | What the audio does | Trending picks now | Evergreen | Auto-safe option |
|---|---|---|---|---|
| **slideshow** (photo mode / carousel) | Music *is* the experience | Midnight Sun, Paper Moon Static, Stop The Wedding!, we fell in love in october (Oct only) | snowfall, Aesthetic, Better in the Dark, blue, Chopin Nocturne | TikTok Business photo publish with a CML `music_sound_id`; Direct Post `auto_add_music`; IG business picks (Autumn Colors); AI lo-fi or bossa bed |
| **text-hook-demo** | Quiet bed under text and voice; SFX on every cut | "-A" text, Be OK | Mint Breeze-type beds, bossa or lo-fi library tracks | Owned bed plus SFX (pop, click, whoosh) |
| **pov** | Comic or relatable framing | Be OK, Two Fishes, Zany Emote | Funny, Oh No, Monkeys Spinning Monkeys (CC BY) | Monkeys Spinning Monkeys or Sneaky Snitch with credit |
| **build-in-public** | Voice-led; cinematic or motivational bed | What You Waiting For?, Training Season, GEEKIN, Netflix Documentary, The Multitasker | Storytelling, Cornfield Chase, I Need a Dollar (instr.) | Voice plus an AI cinematic bed |
| **before-after** | Cut the transformation on the drop or switch | Saxophones getting louder, Upside Down, Nicole Kidman, Wipe the camera, Ramalama (until Oct 31) | No One Else, METAMORPHOSIS (phonk), Little Dark Age | AI riser plus impact. Generate "a sax build-up that keeps getting louder" by describing it, **without naming the song** |
| **story** | Emotional arc | Patient Zero, Someday We Will Dream About Today, Vibin | Storytelling, Cornfield Chase, Chopin Nocturne | AI piano or orchestral; public-domain classical recordings |
| **listicle** | Steady energy; cut every item on the beat | Midnight Sun, "Can I see your work?", Funkytown | Sunroof, Insomniac, Aesthetic | AI upbeat pop instrumental |

**On `drop_at_sec` and `bpm`.** Reliable drop timestamps and BPMs aren't published for these sounds, so the JSON leaves them `null` rather than guessing. Shipreel should compute them:

- **CML tracks:** the Business API returns a permanent `preview_url` for each track. Run beat and onset detection in-app (e.g. vDSP/AVAudioEngine, aubio or librosa) to find downbeats and the biggest energy jump, then snap cuts to them. Use the audio for timing only and never export it.
- **Sounds added in-app** (non-CML trending songs): let the user tap the drop once while previewing the sound in TikTok, and store the offset with the sound record.
- **Owned or AI audio:** analyze it freely.

---

## 5. Evergreen sounds

| Sound | TikTok videos | Why it keeps coming back | Bake-in safe? |
|---|---|---|---|
| Monkeys Spinning Monkeys (Kevin MacLeod) | 27.8M | The universal "goofy" bed | **Yes**, CC BY 4.0 with credit |
| Aesthetic (Tollan Kim) | 23.3M | Aesthetic product and setup showcases | Unknown |
| Funny (Gold-Tiger) | 15.9M | Skits, expectation vs reality | Unknown |
| Chopin Nocturne No. 2 (moshimo sound design) | 7.2M | Classy and wistful | The composition is public domain; use a PD/CC0 recording |
| snowfall (Øneheart, reidenshi) | 6.6M | Melancholic slideshows; still on the Shorts chart | Unknown |
| Storytelling (Adriel / "Music for Creators") | 2.4M | Storytime and explainers under voiceover | Unknown, verify |
| Better in the Dark (TV Girl & Jordana) | 807.8K | "Aesthetic app" tours | No |
| Cornfield Chase (Hans Zimmer) | 791.9K | Epic zero-to-launch builds | No |
| No One Else (prodshushy) | 753.1K | Before/after transitions | Unknown |
| Insomniac (Chakra Efendi & MemoBoy) | 548.6K | "Cool apps" roundups | Unknown |
| Little Dark Age (MGMT) | 205.3K (one upload) | "Evolution of…" edits | No |
| Sneaky Snitch (Kevin MacLeod) | not measured | Sneaky or comedic | **Yes**, CC BY 4.0 |
| Sunroof, Oh No (Capone), Wii Shop Channel, METAMORPHOSIS, I Need a Dollar, blue, Sunflower, Past Lives, 9 to 5 | various | Long-running meme and montage staples | No (major-label or game audio) |

---

## 6. Commercially safe music for baked-in audio

"Safe" comes in three kinds, and Shipreel's UI should label them differently.

1. **Platform-library safe (in-app only).** The platform applies the music; you can't export it.
   - **TikTok CML:** ~1M tracks, Business accounts, organic and ads, **TikTok only**. The terms say "Commercial Uses outside of TikTok are not permitted" and the sounds can't be distributed apart from the videos.
   - **Meta Sound Collection / IG business audio:** Meta platforms only.
   - **YouTube Shorts audio picker.**
2. **Portable royalty-free (bake into the file and post anywhere):**
   - YouTube Audio Library: no Content ID claims on YouTube; CC tracks need credit; off-YouTube use isn't addressed.
   - Pixabay Music: free commercial use, no attribution, no standalone redistribution. No audio API, and scraping is banned.
   - Uppbeat: a free account gets 3 downloads for your own channels; Pro is $14.99/mo and Business $34.99/mo for commercial digital use. No public API.
   - Incompetech: CC BY 4.0 with an exact credit line.
   - FMA: only CC BY, CC BY-SA and CC0 tracks; ND can't be synced to video.
   - Mixkit (verify the clauses), Jamendo (paid Jamendo Licensing for commercial use), and public-domain classical recordings.
   - **Epidemic Sound API:** the Scale plan includes a commercial license with sublicensing to end users, "use anywhere: social, websites, ads". The Free API plan is prototyping-only.
3. **Owned or generated:** AI music from the providers in §7. Shipreel or the user holds the output under the provider's terms.

**API or bulk access at a glance:**

| Source | API? | How |
|---|---|---|
| TikTok CML | **Yes** (Business API) | `GET /discovery/cml/trending_list/` → `music_sound_id` on publish. Top 100 only; server-side mix |
| Epidemic Sound | **Yes** | Partner API: search, Soundmatch, Highlights. Commercial use needs the Scale plan |
| Jamendo | **Yes** | API v3 (client_id); 35K req/mo for non-commercial apps; commercial use needs an agreement plus licenses |
| Openverse | **Yes** | `/v1/audio/?license_type=commercial`; anonymous 20/min, 200/day |
| Freesound (SFX) | **Yes** | Token for search and previews; OAuth2 for originals; 60/min, 2,000/day. **Commercial API use is negotiated** |
| Pixabay | No (audio) | API covers images and videos only; scraping prohibited |
| YouTube Audio Library | No | Manual downloads in Studio |
| Uppbeat | No (none found) | Manual |
| FMA | No (none documented) | The research dataset has mixed licenses |
| Incompetech | No | Per-track downloads; ISRC list |
| Meta Sound Collection | Partial or unverified | Only `audio_name` is documented; a vendor-described Audio API (Facebook Login) isn't in Meta's public reference |

---

## 7. AI music and SFX generation APIs

| Provider | Endpoint | Price | Commercial license for social posts | Fit for Shipreel |
|---|---|---|---|---|
| **ElevenLabs Eleven Music** | `POST https://api.elevenlabs.io/v1/music` (prompt or `composition_plan`; 3-600 s; `music_v1`/`v2`/`v2_5`; `force_instrumental`) | **$0.15/min** on all tiers | Commercial on Free through Business, except film, TV, radio and Studio Games. Free requires attribution; Starter and up don't. No real artist, song or label names in prompts. Resellers must co-brand; no library resale. | **Best overall**: quality plus clear terms. Use BYOK so the user is the licensee. |
| **ElevenLabs SFX** | `POST /v1/sound-generation` (0.5-30 s, loop, `eleven_text_to_sound_v2`) | $0.12/min listed ("billed per generation", so verify) | Royalty-free on paid plans | Generate a branded SFX kit once and cache it |
| **Stable Audio 3.0 / 2.5** | `POST https://api.stability.ai/v2beta/audio/stable-audio/text-to-audio` (`model=stable-audio-3`, 1-380 s); 2.5 at `/stable-audio-2/…` (also audio-to-audio and inpaint) | **8 credits = $0.08 per generation** | You own the outputs (Stability terms) | Cheapest per track; good beds and loops |
| **Stable Audio Open** | Local | Free | Community License (<$1M revenue; verify) | Offline SFX and textures |
| **Google Lyria 3 / 3.5** | Gemini Interactions API `POST …/v1beta/interactions` (`lyria-3-clip-preview` 30 s; `lyria-3.5` full song) | **$0.04 per clip**, $0.08 per full song; no free tier | Gemini API terms; SynthID watermark; artist and lyric prompts blocked | Excellent for 30 s beds |
| **MiniMax Music 2.0 (fal)** | `fal-ai/minimax-music/v2` (style plus lyrics) | **$0.03 per song** | "Commercial use via fal partnership" | Cheap vocal jingles |
| **Mubert** | REST plus WebRTC streams | $49/$199/$499 per month | Royalty-free, "cleared for monetization" (confirm) | High-volume variety |
| **SOUNDRAW** | API | $29.99/mo (100 songs), $300/mo (1,000) | "Safe for commercial use" | Flat-rate option |
| **Beatoven (maestro)** | API | Unpublished | "Always cleared for commercial use"; Fairly Trained | Ethically sourced |
| **Loudly** | API | Custom | Royalty-free, perpetual, any digital platform | — |
| **ACE-Step v1.5** | Local (Apache-2.0; ~8 GB VRAM; runs on Apple Silicon) | Free | Apache-2.0 (verify weights) | Local-first fallback |
| **Suno** | **No official API** | Consumer plans | Terms of 2026-08-10: commercial use only on paid tiers *and* only for permitted downloads; Free is non-commercial; scraping and robots banned | Manual import only |
| **Udio** | No public API | — | **Uncertain**: downloads were disabled after the 2025 label settlements | Treat as unavailable |
| **Meta MusicGen** | Local | Free | Weights are **CC-BY-NC**: no commercial use | Avoid |

**Cost for a 30-second bed:** MiniMax ≈ $0.03, Lyria Clip $0.04, ElevenLabs ≈ $0.075, Stable Audio $0.08. Generating fresh beds per post is cheaper than any per-track license.

---

## 8. Sound effects

**Palette** (28 entries in `music_sources.json` with uses and search terms):

| Group | Effects |
|---|---|
| Transitions | whoosh, swipe |
| UI | pop, tap/click, mouse click, keyboard typing, scroll tick |
| Hooks | notification ding, phone vibrate |
| Money and gamification | cash register, coin, level-up, success chime |
| Contrast and failure | error buzz, record scratch, clock tick, heartbeat |
| Emphasis | boom/impact, riser, hit, glitch, sparkle, typewriter, drumroll/ta-da, camera shutter, stamp |
| Crowd | gasp, applause |

**Sources:**

- **Zero-friction:** Kenney Interface Sounds (100 UI sounds, CC0); CC0 sounds on Freesound and Openverse.
- **Professional library, commercial, no attribution:** Sonniss GDC bundles (9-48 GB per year; no redistribution as SFX; no AI training).
- **Other free libraries:** Pixabay, Mixkit, ZapSplat (attribution on the free tier).
- **Licensed APIs:** Epidemic (250K+ SFX); ElevenLabs and Stable Audio generation.
- **Avoid:** BBC Sound Effects (RemArc licence is non-commercial) and meme soundboards.

**Meme SFX warning.** "Vine boom", "bruh", OS sounds (iPhone tri-tone, Windows startup), brand sound marks (Netflix "ta-dum") and game sounds have unclear or proprietary ownership. Roblox's "oof" was pulled in 2022 over a licensing dispute (from memory, not re-verified). Recreate the *effect* with owned or CC0 audio, e.g. a deep 808 boom instead of the vine-boom clip.

---

## 9. The legal and practical side of trending audio when auto-posting

### TikTok

**Can the API attach a library sound?**

- **Content Posting API** (developers.tiktok.com, personal and creator accounts): **no** for video.
  - Photo posts accept `auto_add_music: true`, which only works with `post_mode = DIRECT_POST`. TikTok adds "recommended music" and the creator can change it in the app later.
  - In `MEDIA_UPLOAD` (inbox) mode, every setting except the title and caption is discarded (Postiz docs).
- **TikTok API for Business** (business-api.tiktok.com): **yes, for CML tracks.**
  - `music_sound_info { music_sound_id, music_sound_volume 0-100, music_sound_start, music_sound_end }` and `video_original_sound_volume` on `/v1.3/business/video/publish/`.
  - `music_sound_info.music_sound_id` and `auto_add_music` on `/business/photo/publish/`.
  - IDs come from `/discovery/cml/trending_list/` (top 100; genre, `country_code` and `date_range` filters; `preview_url`; 30-day `trending_history`).
  - Limits: 6 posts per minute and 15 per day per account.
  - Metricool, PostFast and bundle.social are built on this. Metricool's help says that outside the top 100 you finish the post manually in the TikTok app, where the full CML is available.

**Draft (inbox) route:**

- `POST /v2/post/publish/inbox/video/init/` with the `video.upload` scope.
- The creator "must click on inbox notifications to continue the editing flow in TikTok and complete the post". That flow is where they add a trending sound, text or effects.
- Caps: **at most 5 pending inbox shares per 24 h** and 6 requests per minute per token.
- The Business API equivalents are `upload_to_draft: true` (video) and `is_draft` (photo).

**Direct Post rules:**

- Unaudited clients can only post `SELF_ONLY`, for up to 5 users per 24 h. An audit lifts this.
- The UX must show the **Music Usage Confirmation** consent before publishing. The user confirms either that "there is no copyright protected music in the video" or that they "have obtained and paid for all necessary licenses", covering both composition and recording.
- **So a direct-posted file with a baked-in trending song is a false confirmation.**

**Account type and self-promotion:**

- TikTok Support: "If you have a Business Account, you cannot use music on TikTok that's not licensed for commercial use."
- For content promoting a brand, product or service, TikTok recommends the CML because "the licenses we hold for music outside of the CML don't cover the commercial use of music in content". Using non-CML music with the disclosure toggle on requires the Music Usage Confirmation.
- Self-promotion should set `brand_organic_toggle` (the "Promotional content" label). An indie dev promoting their own app on a *personal* account with a trending song is common practice but sits outside TikTok's stated license.
- Risks: audio muted or removed (TikTok can also mute when its own rights lapse) and rights-holder claims. Spark Ads (boosting the post) push you back to CML or original audio.

### Instagram Reels

- **Graph API:**
  - Reels publish with `video_url` (3 s to 15 min, ≤300 MB), `share_to_feed`, `collaborators`, `cover_url`, `user_tags` and `audio_name`. `audio_name` renames your original audio once; "Music tagging is only available for original audio."
  - **No documented way to attach library music.** Vendors describe an Instagram Audio API that attaches Meta-authorized tracks (Sound Collection plus some original sounds) for Facebook-Login-connected accounts. It isn't in Meta's public reference, so treat it as beta and unverified.
- **Pre-publish copyright check:**
  - Before publishing: `GET /{ig-container-id}?fields=copyright_check_status` returns `status` and `matches_found`.
  - After publishing: `copyright_check_information` on the media reports `BLOCK` or `MUTE` mitigations by geo.
  - Shipreel should gate `media_publish` on `matches_found = false`.
- **Limits and testing:**
  - 100 API-published posts per 24 h.
  - **Trial reels** via `trial_params.graduation_strategy` (`MANUAL` or `SS_PERFORMANCE`) show first to non-followers. Good for A/B testing hooks and audio beds.
- **Adding a trending song:** only in the Instagram app.
  - Since October 2023, **Sharing to Reels** has been open to all developers. A *mobile* app hands the video to the Instagram camera, where the user can "customize their reel with audio, effects, voiceover and stickers" before posting. This is Instagram's equivalent of TikTok drafts and needs an iOS or Android companion.
  - Business accounts get a restricted library.
  - Meta's Music Guidelines: "Use of music for commercial or non-personal purposes in particular is prohibited" without licenses; content "may be blocked, muted or removed".

### YouTube Shorts

- The Data API upload has no audio-library hook, so only baked-in audio is possible.
- YouTube Help:
  - "Shorts longer than one minute that have an active copyright claim" are blocked.
  - With YouTube tools you can add up to 90 s of music to a 3-minute Short.
  - Audio Library tracks "won't receive a Content ID claim".
- **Rule for Shipreel:** auto-posted Shorts use owned or Audio Library audio. Any Short that might contain third-party audio stays ≤60 s.

### What pro app marketers actually do

- **The data (§2):** voice-led originals dominate dev and app content. Productivity brands use CML-style bossa and lo-fi beds. Listicle and aesthetic creators use a licensed pop hit chosen in-app (Midnight Sun, Smile, MONACO).
- **The tooling:**
  - Business-account schedulers (Metricool, PostFast, bundle.social) auto-attach CML "Top 100 trending" tracks through the Business API.
  - Open-source schedulers (e.g. Postiz) expose TikTok UPLOAD mode. The post lands as a draft and a human finishes it in-app, which is where the trending sound gets added.
  - Social teams flag which Reels audios are business-available (ScottSocial and CreatorDB publish these flags weekly).
- **Folklore, unverified:** many creators add a trending sound at very low volume under their voiceover, believing it boosts distribution. TikTok hasn't confirmed this, and it doesn't change licensing.

---

## 10. Recommendation: Shipreel's trending-audio and auto-posting strategy

**Principle:** *bake in only audio you own or hold a portable license for. Get trending songs only through each platform's own licensed mechanism, either the API (TikTok CML) or the native app (drafts).*

### Four audio lanes, chosen per post

| Lane | When | What Shipreel does | Automation |
|---|---|---|---|
| **A. Owned audio** (default) | All platforms; required for Shorts and IG API posts | Voiceover (user or TTS) + owned bed (AI via the user's ElevenLabs, Stability or Gemini key, or a curated royalty-free pack with license metadata) + SFX palette. Mix voice-led: bed ~12-18 dB under the voice, SFX on cuts. On IG, set `audio_name` to "<App> - original audio" so others can reuse your sound. | Fully automatic |
| **B. Licensed trending (TikTok Business)** | TikTok **Business** accounts | Weekly pull of `/discovery/cml/trending_list/` (US, 7DAY, by genre). Rank tracks by vibe fit × `trending_history` slope. Beat-analyze the `preview_url` (timing only). Render cuts on the beat with no music. Publish with `music_sound_id`, a start offset and volumes: e.g. 100 music / 0 original for slideshows, ~20-30 music / 100 voice for demos. Respect 15 posts/day. Photo slideshows use `/business/photo/publish/` with `music_sound_info`. | Fully automatic and licensed |
| **C. Trending song, human-in-the-loop** | Personal or creator TikTok; Instagram; any non-CML trending sound | Render the cut to the sound's beat grid (user-tapped drop marker or stored offset). Export with **clean audio**: voice + SFX, or silent for slideshows. Send to **TikTok drafts** (`inbox/video/init`, ≤5 pending a day) or Business `upload_to_draft`. Show a **sound card**: title, TikTok sound link, start offset, suggested volume and why it fits. The user adds the sound in TikTok and posts. For IG, hand off via the companion app's *Sharing to Reels* or a native upload. Show a one-line compliance note when the post promotes the user's own app: "TikTok's license for non-CML music doesn't cover promotional content; prefer CML or owned audio." | Semi-automatic (one tap in-app) |
| **D. Original-sound hooks** | Dev, launch and build-in-public | Lean into what's working: a scripted voice hook in the first 1-2 s, captions, screen recording, low bed. Optionally generate a short **branded jingle or sonic logo** (MiniMax or ElevenLabs) reused on every post to build an ownable sound. | Fully automatic |

### Keeping `sounds.json` fresh (a weekly job)

- **Sources:**
  - YouTube Charts Shorts, weekly and daily (public, official).
  - TikTok CML trending via the user's Business token.
  - TikTok sound-page video counts for tracked IDs, compared week over week.
  - Instagram via curated manual imports from CreatorDB, ScottSocial and Later, keeping their business flags.
- **Status rules:**
  - `rising`: count growth above a threshold week over week.
  - `peaking`: growth decelerating.
  - `fading`: flat or negative growth, or past a seasonal expiry. October and Halloween sounds auto-expire on Nov 1.
  - `evergreen`: more than 12 months old and still adding videos.
- **`commercial_ok` semantics:** `true` means cleared for brand use at least inside the named platform's library (the source field states the scope). It does **not** mean the track can be baked into a file, except CC BY or royalty-free entries such as Kevin MacLeod. Keep a separate `bake_in_ok` boolean in the app's internal model.

### UX safeguards

- **Badges on every sound:**
  - "Auto-licensed (TikTok CML)"
  - "Add in TikTok/Instagram"
  - "Owned / AI"
  - "CC BY: credit auto-added"
- **Auto-insert credit lines** for CC BY tracks, e.g. Incompetech's exact format.
- **Pre-publish gates:**
  - IG: `copyright_check_status`.
  - YouTube: ≤60 s if any third-party audio is present.
  - TikTok Direct Post: block publishing if the audio track is flagged `bake_in_ok=false`, because the Music Usage Confirmation would be false.
- **Prompting rule for AI music:** describe genre, mood, BPM, instruments and structure ("sped-up saxophone build-up that gets louder, 8 bars, big final hit"). **Never** name an artist or song. ElevenLabs forbids it, and it invites infringement claims.

---

## 11. Open items to verify before shipping

- TikTok Business API access: which developer-app approval and scopes are needed for `video.publish`, `video.upload` and Discovery; whether creator (non-business) accounts get `music_sound_id`; and whether the "Premium track" fees apply to organic posts.
- Whether TikTok's inbox drafts expire. Postiz says drafts must be finished within 24 h; TikTok's own docs don't say.
- The Instagram Audio API that vendors describe (Facebook Login, `audio_id` attachment): confirm in Meta's changelog.
- YouTube Audio Library terms for off-YouTube use (in Studio's Audio Library terms).
- The Mixkit, ZapSplat and BBC licence wording (pages couldn't be read); Stable Audio Open's licence and length; whether ACE-Step's weights are Apache-2.0.
- Udio's current status (post-settlement platform, downloads, any API).
- Business availability of every "true" Reels sound, in-app from a business account.
- Usage counts for evergreen sounds whose pages didn't load (Sunroof, Oh No, Wii Shop, METAMORPHOSIS, I Need a Dollar).

---

## Sources

- TikTok Creative Center (checked live): https://ads.tiktok.com/business/creativecenter/inspiration/popular/music/pc/en (redirects to `/creative/creativeCenter/trends/hashtag`); Top Ads: https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en
- TikTok API for Business: publish video https://business-api.tiktok.com/portal/docs/publish-a-public-video-post-to-an-owned-account/v1.3 ; publish photo https://business-api.tiktok.com/portal/docs/publish-a-photo-post-to-an-owned-account/v1.3 ; CML trending list https://business-api.tiktok.com/portal/docs/get-popular-tracks-from-the-commercial-music-library/v1.3
- TikTok Content Posting API: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post ; https://developers.tiktok.com/doc/content-posting-api-reference-upload-video ; https://developers.tiktok.com/doc/content-posting-api-reference-photo-post ; https://developers.tiktok.com/doc/content-sharing-guidelines
- TikTok legal and support: https://www.tiktok.com/legal/page/global/commercial-music-library-user-terms/en ; https://www.tiktok.com/legal/page/global/music-usage-confirmation/en ; https://support.tiktok.com/en/business-and-creator/creator-and-business-accounts/commercial-use-of-music-on-tiktok ; https://ads.tiktok.com/help/article/commercial-music-library?lang=en
- Metricool music help: https://help.metricool.com/how-to-add-music-to-your-tiktok-posts-from-metricool-kap4e ; Postiz TikTok: https://docs.postiz.com/public-api/providers/tiktok ; bundle.social: https://bundle.social/tiktok-music-api ; Ayrshare Instagram: https://www.ayrshare.com/docs/apis/post/social-networks/instagram
- Meta: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/ ; https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/copyright-detection ; https://www.facebook.com/legal/music_guidelines ; Sharing to Reels (TechCrunch, 2023-10-13): https://techcrunch.com/2023/10/13/instagrams-sharing-to-reels-feature-opens-up-to-all-app-developers/
- YouTube: https://support.google.com/youtube/answer/13486873 ; https://support.google.com/youtube/answer/3376882 ; https://charts.youtube.com/charts/TopShortsSongs/us/weekly
- Trend roundups: https://www.revid.ai/viral-tiktok-songs ; https://tokchart.com/ ; https://www.socialpilot.co/blog/tiktok-trends ; https://newengen.com/insights/tiktok-trends/ ; https://later.com/blog/tiktok-trends/ ; https://later.com/blog/instagram-reels-trends/ ; https://buffer.com/resources/trending-audio-instagram/ ; https://creatordb.app/free-tools/trending-instagram-audio/ ; https://www.scottsocialmarketing.com/blog/trending-reels-audio-this-week-on-instagram ; https://socialbee.com/blog/trending-instagram-songs-this-week/ ; https://www.socialpilot.co/blog/instagram-reels-trends ; https://newengen.com/insights/instagram-trends/ ; https://metricool.com/tiktok-songs/
- Music sources: https://pixabay.com/service/license-summary/ ; https://pixabay.com/service/terms/ ; https://pixabay.com/api/docs/ ; https://uppbeat.io/pricing ; https://freemusicarchive.org/License_Guide ; https://incompetech.com/music/royalty-free/licenses/ ; https://incompetech.com/music/royalty-free/faq.html ; https://developer.jamendo.com/v3.0 ; https://api.openverse.org/v1/audio/ ; https://developers.epidemicsound.com/ ; https://freesound.org/docs/api/overview.html ; https://freesound.org/help/tos_api/ ; https://sonniss.com/gameaudiogdc ; https://kenney.nl/assets/interface-sounds
- AI music: https://elevenlabs.io/docs/api-reference/music/compose ; https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert ; https://elevenlabs.io/pricing/api ; https://elevenlabs.io/music-terms ; https://platform.stability.ai/pricing ; https://platform.stability.ai/docs/api-reference ; https://stability.ai/license ; https://ai.google.dev/gemini-api/docs/music-generation ; https://ai.google.dev/gemini-api/docs/pricing ; https://fal.ai/models/fal-ai/minimax-music/v2 ; https://suno.com/terms ; https://mubert.com/api ; https://www.beatoven.ai/api ; https://soundraw.io/api ; https://www.loudly.com/music-api ; https://github.com/ace-step/ACE-Step ; https://github.com/facebookresearch/audiocraft
