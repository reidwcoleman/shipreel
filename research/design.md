# Shipreel design research: what viral app-marketing videos actually look like (Oct 2026)

Compiled 2026-10-15. Companion data file: `design.json` (same folder). All pixel values are at **1080×1920** unless noted. TikTok photo-mode slides are **1080×1440**.

## TL;DR (what to build first)

1. **Hook text on frame 0, no fade-in.** 10 of the 11 posts measured had text, a sticker or a big number on the very first frame. Hooks stay up for **2.3–4.0 s**.
2. **The TikTok-native look wins for app promos.** That means white semibold sans, lowercase, a thin black outline (about 4 px) or a soft shadow, at **6–8 % of frame width** (66–82 px), centred in the upper third. Polished "ad" typography is the exception, not the norm.
3. **There are two winning lengths.** One is under-12-second loopers: a UGC reaction hook, a hard cut on the music swell, then a hand-held phone demo with three feature captions at about 2.1 s each. The other is a 30–120 s narrative or founder demo with captions changing every 1.25–2.5 s.
4. **Slideshows have 6 slides at 1080×1440:** a hook photo with 1–2 lines of text, then 4 value cards made from the app's own output, then a CTA card (6.9 M views measured).
5. **Design to the official ad safe zones**, measured from TikTok's and Google's own template PNGs. TikTok is top 240 / bottom 660 / sides 120, plus the right rail (x>780 for y 840–1260). Shorts is 288 / 672 / 48 / 192. The universal safe rectangle is **x 120–888, y 288–1248**.
6. **Fonts:** use **TikTok Sans** (OFL, on Google Fonts; TikTok calls it "the default font used in millions of TikTok videos") for native looks, Montserrat 900 for Hormozi-style captions, and Inter / Inter Display for founder, Apple-style and Hormozi-2026 looks.

## Method and caveats

- I downloaded 11 posts with `yt-dlp` through the `watch` skill. No Whisper key was configured, so this was frames plus native captions only. I then measured them with ffmpeg and PIL.
- Measurement tools: labelled pixel grids on full-resolution frames, pixel sampling for colours, scene-cut detection (`scene>0.3`), spectral-flux audio onsets, and a "does a transient land on the cut" test against a random baseline.
- Font size is estimated from cap or ascender height divided by about 0.70–0.75 em, so expect ±5 %.
- I downloaded and measured **TikTok's and Google's official safe-zone template PNGs**.
- Platform limits come from official developer docs fetched today. Bluesky limits come from the Bluesky app's source constants.
- **Caveat:** the session's web-search budget ran out partway through. Brand-UI recreations (iMessage, Notes, X, Reddit, App Store, iOS notification, Stripe, RevenueCat) are therefore estimates from known design tokens and are marked as such in the JSON. Verify them against a live screenshot before treating them as pixel-exact.
- **Caveat:** several brand "viral" posts have like/view ratios of **0.15–0.7 %**, which points to Spark-Ad boosting. The organic posts ran at **1.6–4.8 %**. The formats are still valid, because these are the creatives brands chose to scale.

---

## 1. Caption and text styles

### Measured in the wild

| Style | Font (fallback) | Size (font px → % W) | Colour / stroke / box | Position | Seen in |
|---|---|---|---|---|---|
| TikTok Classic + outline (hook) | TikTok "Classic" (TikTok Sans 600 / Sora 600) | 82 px → **7.6 %**, line-height 1.05 | #FFF, about 4 px #000 outline + soft shadow | y 323–568 (17–30 %) | Stronger 2.7 M |
| TikTok Classic (demo captions) | same | 68–71 px → 6.3–6.6 % | same | y 275–400, above the phone | Stronger |
| TikTok Classic (story captions) | same | 66 px → 6.1 %; reveal title 97 px → 9 % | #FFF, thin dark outline + shadow, emoji at end | 48–83 % H (varies) | Rizz 1.6 M |
| TikTok Classic plain (list) | same, 500 | 52 px → 4.8 %, 51 px pitch | #FFF, shadow only | 41–57 % H | Opal 954 K |
| TikTok black box | same | 64 px → 5.9 %, line-height 1.12 | #000 box 744×268 px, **radius 42 px**, padding about 38/30 px | y 341–608 | Riley Brown 1.0 M |
| Seam caption (founder demo) | bold grotesque (Inter 800) | 61 px → 5.7 % | #FFF, shadow 0 4 10 rgba(0,0,0,.6) | y 1287–1330 | Riley Brown |
| Hormozi 2026 phrase captions | grotesque + italic (Inter Display 600/800) | 69 px → 6.4 % | host #FFF; guest **#F4E420** italic; keyword in bold weight | 47–53 % H | Hormozi 364 K |
| Red headline box | heavy grotesque uppercase | 65 px → 6.0 % | **#E70003** box 852×192, radius 19 | y 706–897 | Hormozi |
| Kinetic editorial serif | soft serif (Fraunces 800) | about 120 px → 11 % | ink #202C21 + sage #66AA90 on paper #EBE6E0 | upper-left 13–29 % | Greg Isenberg 834 K |
| MrBeast graphic heading | heavy geometric (Montserrat 900) | about 165 px → 15 % | gradient **#FDB13F → #FD9500** + orange glow | 16–25 % | MrBeast 660 M |

**Font finding.** TikTok Sans has a double-storey "a" and no single-storey alternate; I checked the glyph sources on GitHub. The 2025–26 TikTok-native frames (Stronger, Riley Brown, the Stronger slideshow) render a geometric sans with a **single-storey a and g**. The 2023 Rizz frames render a Proxima-Nova-like double-storey "a". The in-app "Classic" face is proprietary and appears to have changed.

- **Recommended default:** TikTok Sans 600. It is official, OFL-licensed, and its proportions are within 3 % of the measured text.
- **For the newer look:** Sora 600, whose word widths are within 2 % of the frame text.
- TikTok Sans's variable axes are opsz 12–36, wdth 75–150, wght 300–900 and slnt −6–0.

### Native in-app styles (documented or convention, not measured)

- **TikTok** has five styles: **Classic, Typewriter, Handwriting, Neon, Serif**. Kapwing's matches are:
  - Classic: Proxima Nova Semibold, or Montserrat as a free alternative.
  - Typewriter: Source Code Pro Bold.
  - Handwriting: Yesteryear.
  - Neon: Abel in all caps, with a glow made from a blurred coloured copy behind the text.
  - Serif: Georgia Bold.
- **TikTok background box.** The "A" toggle cycles plain, solid box and semi-transparent box. Text flips to black on a white box. Native boxes are rounded per line and merge into a blob. Shipreel should support both the per-line mode (`box-decoration-break: clone`) and the block mode measured above. TikTok's text colour palette is in `color_palettes.tiktok_text_palette`.
- **Instagram** has five long-standing styles: **Classic, Modern, Neon, Typewriter, Strong**.
  - "Strong" is the heaviest of them and the most legible over video.
  - Instagram Sans is not distributed. The JSON maps the styles to Inter, Archivo Narrow, Pacifico, Courier Prime and Archivo Black, and these are estimates.
- **Hormozi word-by-word (caption-tool convention).** This is the stereotyped tool preset, not what the channel ships now (see the 2026 row above).
  - Montserrat 900, all caps, 80–120 px.
  - **8–12 px pure-black stroke** (near-black smears after compression).
  - White text with the active word in **#FFD93D**. Green alternatives are #39FF14 and #A6FF00.
  - 1–3 words on screen at 60–70 % of frame height.
  - Each word takes 200–500 ms and snaps in at a scale of 1.05 or less (ascynd).
- **MrBeast-style captions (convention).** Komika Axis or Luckiest Guy, uppercase, white with a heavy black stroke and a hard drop shadow. Keywords are coloured yellow, green or red. The pop runs from scale 0 to 1.15 to 1 in about 180 ms.
- **Apple minimal.** SF Pro Display or Inter Display 600 at about 7.5 % W with −2 % tracking. Use #F5F5F7 on black or #1D1D1F on white. Fade in with a 24 px rise over 500 ms and hold 1.2–2 s.
- **Memes.**
  - Impact or Anton, uppercase, white, with a stroke of about font-size / 12.
  - Or the white caption bar: Inter or Arial 500 in black, in a bar 18–25 % of frame height. Keep the bar below y 240 on TikTok.

---

## 2. UI-card formats

### Measured: TikTok "Reply to @user's comment" sticker (Cal AI)

- **Card:** **541×244 px** (50 % W) at x 89, y 358, white #FFFFFF, **radius 20 px**.
- **Tail:** the bottom-left corner is square, with a right-triangle tail **26 px wide × 21 px tall** hanging below it, flush with the card's left edge.
- **Avatar:** **66 px** circle, 19 px in from the left edge.
- **Header:** "Reply to {user}'s comment" at about **28 px** (2.6 % W), grey about #6F6F6F (≈ rgba(22,24,35,.6)).
- **Comment:** bold black at about **41 px** (3.8 % W), line-height 1.1, up to about 3 lines, text starting at x 192.
- **Timing:** shown for 0–3.57 s, then the video cuts away.

### Measured: other on-video UI

- **Split-screen founder demo:** the screen panel runs y 0–1259 with an iPhone mockup **549 px wide** (51 % W). The webcam panel runs y 1260–1920. The caption sits on the seam.
- **Hand-held POV demo:** a real hand holding the phone, which fills 55–65 % W, with captions above it.
- **CTA end slide** (Stronger, 6.9 M):
  - Dark-green gradient #18211C → #1A3023.
  - **#4BB050** pill with white text "Get Stronger" (about 9 % W).
  - Laurel social-proof badges: "1M+ users" and "10K+ ★★★★★ Reviews".
  - App Store and Google Play badges.
  - A phone mockup with floating circular badges.

### Recreations (estimates; specs in JSON)

- **iMessage:**
  - Sent bubble #0A84FF (the real bubble has a subtle gradient). Received #E9E9EB light / #262628 dark. SMS #34C759.
  - Text is 17 pt SF Pro, 47 px full-bleed.
  - Radius 18 pt (50 px), padding 7/12 pt, maximum width 70–75 %.
  - "Delivered" receipt at 11 pt #8E8E93.
- **Apple Notes:** white background, gold tint about #E3A600, title 28 pt bold, body 17 pt, grey date header.
- **X post:**
  - Chirp, with Inter as the fallback.
  - #0F1419 text and #536471 secondary, #1D9BF0 verified badge, #EFF3F4 border.
  - Dark mode: #000 background, #E7E9EA text, #71767B secondary.
  - For video, scale to a 960 px card with 46 px body text.
- **Reddit:** Reddit Sans (OFL), #FF4500 brand, #0F1A1C text, #576F76 meta, #D93900 upvote, #6A5CFF downvote, 16 px radius on the web (32 px on video).
- **App Store listing:** icon squircle radius **22.37 %**; capsule "Get" button in #007AFF on the product page, gray on lists; title 24 pt bold; ratings row in #8A8A8E.
- **iOS notification:**
  - Blurred material rgba(246,246,246,.82) plus `blur(36px)`, radius about 24 pt.
  - 38 pt icon, 15 pt semibold title and regular body, 13 pt time.
  - Stacked banners drop in 6–8 frames apart, each with a ding.
- **Stripe:** blurple **#635BFF** chart line, navy #0A2540, "Gross volume" big number. Animate it as a count-up.
- **RevenueCat:** six overview tiles (Active Trials, Active Subscriptions, MRR, Revenue, New Customers, Active Users) with a red accent of about #F2545B. Both the tiles and the colour are unverified.

---

## 3. Safe zones at 1080×1920

| Platform | Top | Bottom | Left | Right | Source |
|---|---|---|---|---|---|
| **TikTok** (official In-Feed template, measured) | **240** | **660** | **120** | **120**, and **300** for y 840–1260 (action rail) | TikTok "In-Feed-Standard Version LTR.zip": 2880×5120 PNG labelled in 720×1280 units (160 / 440 / 80 / rail 120), scaled ×1.5 |
| TikTok organic (third-party) | 130 | 484 | 44 | 140 | cadenus.io (unverified) |
| **Reels** (Meta ads guidance as reported) | **≈270** (14 %) | **≈670** (35 %) | **65** (6 %) | **65** | 1clickreport citing Meta Help Center; community organic values are 220–250 top and 320–430 bottom |
| **Shorts** (official Google vertical overlay, measured) | **288** | **672** | **48** | **192** | `youtubesafezoneoverlay_vertical_final.png` (Google Ads Help 13547298) |
| Shorts organic (third-party) | ≈380 | ≈390 | ≈60 | ≈201 | adchecklab (author's in-app measurement) |
| **Shipreel universal** | **288** | **672** | **120** | **192** (keep x≤780 for y 840–1260) | Intersection of the three: rectangle x 120–888, y 288–1248 |

TikTok notes that the safe zone shrinks as the caption gets longer. Instagram's and TikTok's grids crop the cover to the **centre 3:4 (y 240–1680)**. That same 240 px band also shows up as the letterbox bars in the Opal montage.

---

## 4. Pacing and motion

- **Average shot length** of edited videos, measured: Rizz 2.6 s, efewissie 2.3 s, Hormozi 3.1 s, Stronger demo captions 2.1 s.
- **Extremes:** the Opal montage runs 0.35 s per shot, and the Cal AI talking head 8.7 s.
- **Motion-graphic explainers** (Greg) have hard cuts every 5.8 s but an animated change every 1–2 s.
- **Founder demos** (Riley) change captions about every 1.25 s, so 115 s still holds.
- **Default to:** a visual change every **2–3 s**, a caption change every **1.5–2.5 s**, a hook dwell of **2.3–4.0 s**, and loopers of **12 s or less**.
- **Motion recipes** (exact parameters in `motion_patterns`):
  - Punch-in 1.00 → 1.12 over 4–6 frames.
  - Screen Studio-style zoom 1.0 → 1.8× with a spring.
  - Hand-held micro-motion ±3 px.
  - Impact shake over 6–10 frames.
  - Whip pan in 8 frames with 60–120 px blur.
  - Text pop 0.85 → 1.05 → 1 in 6 frames.
  - Word-by-word reveal 1–2 frames before each word.
  - Beat-grid montage with a cut every 8–10 frames.
  - Stronger's 6-second "fade-in from black" looper. Superwall reports an estimated 200–300 M views across hundreds of posts, with average watch time over 2× the length.
  - Micro-variant reposting: the same footage with a new hook. Measured on Stronger: the 2.7 M and 851 K posts share an identical edit and differ only in the hook text.

## 5. Sound design

- **Whooshes on cuts.** On Greg's Short, the cuts at 4.42 s and 15.21 s land on 7.2× and 7.7× spectral-flux spikes. Overall, 38 % of its cuts carry a transient, against a 15 % random baseline.
- **Cut on the swell.** Stronger's hard cut (3.97 s) comes 0.15 s after the strongest transient in its audio (3.82 s).
- **Reveal hits.** MrBeast's "WINNERS" reveal lands on a 7.2× transient at 10.0 s.
- **Speech-led videos** show no cut-to-SFX correlation, because speech onsets dominate the audio.
- **Conventions** (with levels in the JSON): pop or click for each caption block, key clicks for typing, a ding for notification cards, ticks then a cha-ching for revenue, a thump for punch-ins, a vine boom for fails.
- **Levels.** Music-only Stronger averages −11.7 dBFS RMS. Speech-led videos average −18 to −26 dBFS. Master to about −14 LUFS and −1 dBTP. None of the music-led videos has a silent gap longer than 0.5 s.

## 6. Slideshows

### TikTok photo mode

- Up to **35** images, JPEG/WebP, at most 20 MB each and at most 1080p.
- Title up to 90 characters, description up to 4,000 (Content Posting API).
- The 6.9 M Stronger slideshow stores **6 slides at 1080×1440** and is letterboxed in the 9:16 feed.

### Instagram carousel

- **1080×1350** (4:5) is the default. 1080×1440 (3:4) also fits the 2025 grid.
- Up to 20 items in-app and 10 via the API. JPEG at most 8 MB.

### Text overlay

- TikTok Classic look in white with a thin black outline, about **69 px (6.4 % W)**.
- 1–2 short lines separated by a blank line.
- Block centred at **41–52 %** of the slide height.
- Never in the top 240 px. OpenClaw's "Larry" agent learned this the hard way: its text was "too small" and "positioned too high, hidden behind TikTok's status bar".

### Recipe

- **Slide 1, hook:** a dark, real-looking photo with an identity or question hook. Measured example: "am I strong? / male 75kg edition". Alternatively use Larry's formula: "[another person] + [doubt] → showed them AI → changed their mind". His best posts got 234 K, 167 K and 147 K views.
- **Slides 2–5, value:** the app's own output repackaged as standalone content. Stronger used strength-standard tables on #131315 cards under the app wordmark.
- **Slide 6, CTA:** a brand pill, social proof, store badges and a phone mockup.
- **Caption:** a story-style mention, such as "got these from the stronger app…", plus 3–5 hashtags and a trending or original sound.

## 7. Covers and thumbnails

- **TikTok's cover defaults to the first frame**, so a legible frame-0 hook doubles as the cover.
- **Keep the title in the centre 3:4.** Profile grids crop to that band, y 240–1680.
- **Patterns:**
  - A series template: same box, same spot, 3–6 words at 8–10 % W.
  - Result-first numbers, such as "$4,218 MRR", at 12–15 % W.
  - A before/after split.
  - A visible reply sticker.
  - For photo mode, `photo_cover_index = 0`.
- **Shorts:** pick the frame in the mobile app. Use a face plus 3–5 centred words, clear of the bottom 672 px and the right 192 px.
- **Reels:** a 9:16 JPEG cover of at most 8 MB, with the grid crop at the centre 3:4.

## 8. Colour palettes (hex in JSON)

| Palette | Colours | Source |
|---|---|---|
| TikTok text palette | 15 colours | Kapwing |
| TikTok brand | #FE2C55 / #25F4EE / #000 | Brand |
| Hormozi 2026 | #E70003 / #FFF / #F4E420 | Measured |
| Hormozi tools | #FFD93D / #39FF14 | ascynd |
| MrBeast | #FDB13F → #FD9500 | Measured |
| Editorial AI explainer | #EBE6E0 / #1B2C22 / #2E5B47 / #66AA90 / #D87651 / #202C21 | Measured, Greg |
| Dark app data cards | #131315 / #4BB050 | Measured, Stronger |
| iOS system | #007AFF etc. | Apple HIG |
| Money dashboard | #635BFF / #0A2540 / #F6F9FC (Stripe), #F2545B (RevenueCat, estimated) | Brand |
| Night-POV | #050505 / #36302E + #8C65B2 | Measured, Rizz |
| Film-aesthetic montage | #393022 / #675640 / #3F6C76 + lavender #CDBFEE | Measured, Opal |

## 9. Platform upload specs (official docs; full detail in JSON)

| | Resolution / aspect | fps | Codec | Bitrate | Max length | Max size | Text limit | Hashtags |
|---|---|---|---|---|---|---|---|---|
| **TikTok** | 1080×1920; 360–4096 px | 23–60 | H.264 (rec.), H.265, VP8/9; MP4/WebM/MOV | none stated; ads ≥516 kbps; delivered HEVC measured at 0.42–1.6 Mbps, so upload at 15–25 Mbps | 10 min (API) | 4 GB (API), 500 MB (ads) | 2,200 runes (video, API); photo title 90 / description 4,000 | no cap; norm 3–5 |
| **Reels** | max width 1920; 0.01:1–10:1, 9:16 rec. | 23–60 | H.264/HEVC, closed GOP, 4:2:0; AAC ≤48 kHz, 128 kbps | VBR ≤25 Mbps | 3 s–15 min (API) | 300 MB | 2,200 | ≤30 (API); 20 mentions |
| **Shorts** | vertical or square, 1080×1920 | as recorded | H.264 High, closed GOP half fps; AAC/Opus 48 kHz | 8 Mbps (≤30 fps) / 12 Mbps (≥48 fps) at 1080p | **3 min** | general YouTube cap | title 100 / description 5,000 | 3 shown; >60 = all ignored |
| **X** | 32×32–1280×1024 (720×1280 rec.); 1:3–3:1 | ≤60 | H.264 High, AAC-LC | ≥5 Mbps rec. | 20 min (125 min Premium) | 8 GB / 16 GB | 280 (25 K Premium) | 0–2 |
| **LinkedIn** | 256×144–4096×2304; 1:2.4–2.4:1 | 10–60 | MP4/MOV/WEBM/… | 192 kbps–30 Mbps | 15 min | 5 GB | 3,000 | 3–5 |
| **Threads** | max width 1920; 0.01:1–10:1 | 23–60 | H.264/HEVC; AAC 48 kHz | ≤100 Mbps | 5 min | 1 GB | 500; carousel 2–20 | 1 topic tag |
| **Bluesky** | any | – | mp4/mpeg/webm/mov/gif | – | **10 min** | **300 MB** | 300 graphemes; 4 images | facets, no cap |
| **FB Reels** | 1080×1920 rec.; min 540×960 | 24–60 | H.264/H.265 (VP9/AV1 ok); AAC-LC 48 kHz stereo | – | 3–90 s (API) | – | – | 3–5 |

In-app limits sometimes exceed the API limits, for example TikTok's 4,000-character captions and Instagram's 20-item carousels. The values not re-fetched this session are marked in the JSON.

---

## 10. Per-video teardowns

### V1. Stronger app: UGC reaction hook, then phone demo

- **Post:** https://www.tiktok.com/@strongerapp/video/7611280708153150733
- **Stats:** 2.7 M views, 4,157 likes (0.15 %, probably boosted). Posted 2026-02-26. 11.4 s, 1080×1920 HEVC at 30 fps.
- **0–3.97 s:** a borrowed creator clip of a reaction face with "someone made strava but for the gym??".
  - 82 px TikTok Classic (single-storey a), white with a 4 px black outline.
  - 3 lines at y 323–568, line pitch 84–88 px.
  - The hard cut at **3.97 s** lands on the music swell (transient at 3.82 s).
- **4.0–11.4 s:** a hand holds an iPhone in a dark gym while app screens are tapped.
  - Three captions swap at **4.0, 6.1 and 8.3 s**: "muscle map to become more aesthetic", "scores for hundreds of exercises", "unlock new ranks 💪".
  - Captions are 68–71 px at y 275–400, sitting above the phone.
- **Variant V9** (https://www.tiktok.com/@strongerapp/video/7608498509083446541, 851 K views): identical edit and audio. Only the hook changed, to "3 years at the gym and NOW i find this?? 😭". This is the micro-variant engine Superwall describes.

### V2. Rizz app: night-car POV story

- **Post:** https://www.tiktok.com/@rizz.app/video/7282099257552325934
- **Stats:** 1.6 M views, 26 K likes (1.6 %), 864 comments. Posted 2023-09-23. 33.5 s at 720p.
- **Beats:**
  1. "Bro is really struggling texting shawty 🤣"
  2. A real chat screen: "Why she do him like that 😭"
  3. "No worries I got the solution 👀"
  4. The app reveal "Rizz AI 😏" at 97 px (9 % W)
  5. "Instantly get a response 😮‍💨"
  6. "Copy paste and send 🫡"
  7. "And watch the shawtys roll in 😮‍💨"
  8. The payoff, "Bro is jumping for joy 🤣", over real footage of him leaving the car
- **Text:** 13 cuts (ASL 2.6 s) and about 4 s per caption. Body captions are 66 px (6.1 % W) in white with a thin outline and an emoji at the end of every line. Positions drift between 48 % and 83 % of the height, and some sit inside the bottom UI zone.

### V3. Riley Brown / Vibecode: founder vibe-coding demo

- **Post:** https://www.tiktok.com/@rileybrown.ai/video/7605369643275963679
- **Stats:** 1.0 M views, 37.7 K likes (3.8 %). Posted 2026-02-10. 115.5 s.
- **Layout:**
  - **Top 1260 px:** a screen recording of the prompt UI and an iPhone mockup (549 px wide) showing the generated app.
  - **Bottom 660 px:** the webcam.
- **Opener:** a TikTok black box, "Vibe Coding With Claude Opus 4.6 Max 😯😮😱", **744×268 px with radius 42**, 64 px white text, removed at about 3 s.
- **Captions:** 61 px bold white with a drop shadow, 1–4 words each, on the seam at y about 1290–1330. There are 92 caption swaps in 115 s.
- **Cuts:** only 2 hard cuts, because the screen states provide the visual change.

### V4. Cal AI: reply-to-comment objection handling

- **Post:** https://www.tiktok.com/@calai.app/video/7482898906242633006
- **Stats:** 230.6 K views, 1,610 likes. Posted 2025-03-17. 34.7 s. Below 500 K, but included because it is the canonical reply-sticker format.
- **Sticker:** the comment reads "90% accuracy is not good enough sorry bro". The measured sticker specs are in §2. It is on screen for 0–3.57 s.
- **Body:** a talking head with no burned-in captions. A Business Insider screenshot appears as proof on black at 13.2–18.3 s. 3 cuts, ASL 8.7 s.

### V5. Opal: "propaganda I'm falling for" list montage

- **Post:** https://www.tiktok.com/@opal/video/7564773002391342358
- **Stats:** 954 K views, 3,979 likes (likely boosted). Posted 2025-10-24. 9.9 s.
- **Visuals:** film-look 3:4 photos letterboxed inside 9:16 with **240 px black bars**. **27 cuts, 0.35 s per shot**. The music beat period is 1.37 s and the cuts fall on its quarter-beat grid.
- **Text:**
  - 52 px plain white with a shadow.
  - A title line, a blank line, then 5 list items: "blocking TikTok before 9am", "screen time under 3h", "« App not available right now »", "focus mode = personality", "not checking Slack on weekends".
  - Centred at 41–57 % of the height.
- **Frame 0:** a phone showing Opal blocking TikTok.

### V6. efewissie (Cal AI creator programme)

- **Post:** https://www.tiktok.com/@efewissie/video/7691387722195291400
- **Stats:** 7.0 M views, 338 K likes (4.8 %). Posted 2026-09-30. 9.1 s, trending track "EL ACABADO FUNK".
- **Format:** a hairdresser skit built around an AI hairstyle image on a phone. **No on-screen text.** 3 cuts, ASL 2.3 s.
- The creator integrates the app in the caption on other posts ("I calculate my macros using @Cal AI").
- This is the text-free, organic end of the spectrum. The Playkit newsletter puts the creator's earlier Cal AI hit, "Bodybuilder vs Fat", at 11.3 M views.

### V7. Greg Isenberg: premium motion explainer (YouTube Short)

- **Post:** https://www.youtube.com/shorts/ovLAIhbk3ek
- **Stats:** 834 K views, 39 K likes (4.7 %). Posted 2026-03-31. 46.8 s at 24 fps.
- **Look:**
  - Paper background #EBE6E0 with a faint grid.
  - Forest-green 3D cards (#1B2C22 → #2E5B47) with soft shadows.
  - Coral sunburst #D87651 and sage accent #66AA90.
- **Type:** the "Why / would / you" intro is staggered in a heavy serif at about 120 px. Labels such as "Agents.md" are in serif italic.
- **Edit:** face-cam cutaways with kinetic words beside the head. 8 hard cuts with whoosh transients, but an animated change every 1–2 s.

### V8. Stronger: 6-slide photo-mode carousel

- **Post:** https://www.tiktok.com/@strongerapp/video/7505459642022186286
- **Stats:** 6.9 M views, 35.3 K likes, 3,946 saves, 811 shares. Posted 2025-05-17. Original-sound track, 56 s.
- **Slides (1080×1440):**
  1. A dark gym photo with "am I strong? / male 75kg edition", 69 px white with an outline, at y 590–744.
  2. to 5. Tier tables (Beginner → World class) on #131315 cards under the "STRONGER" wordmark.
  6. The CTA: a #4BB050 "Get Stronger" pill, laurels, store badges and a phone mockup.
- **Caption:** "got these from the stronger app. they've got 1M+ people lifting with it, so it's probs pretty accurate" plus 3 hashtags.

### Style references (not app promos)

- **R1. Hormozi** (https://www.youtube.com/shorts/l7IU2eMQjVs; 364 K views, 2026-10-08, 145 s, 47 cuts at ASL 3.1 s):
  - Red title box #E70003 that persists across the split seam.
  - 2–4-word captions at 69 px. The guest is in yellow #F4E420 italic, the host in white, and the keyword in bold.
  - **The 2026 channel no longer uses the all-caps Montserrat preset** that caption tools sell as "Hormozi".
- **R2. MrBeast** (https://www.youtube.com/shorts/QAkEMtJpq3c; 660 M views, 21 s):
  - No burned-in captions. Graphics carry the text: a "WINNERS" gradient heading at about 15 % W, glowing name chips, and a SUBSCRIBE → SUBSCRIBED pill CTA at 14–15 s.
  - Essentially a single take with one reveal cut at 10.2 s.

---

## Sources

- TikTok Content Posting API: [media transfer guide](https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide), [direct post](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post), [photo post](https://developers.tiktok.com/doc/content-posting-api-reference-photo-post)
- TikTok [video ad specs and safe-zone templates](https://ads.tiktok.com/help/article/video-ads-specifications) (template zip measured)
- [TikTok Sans repository](https://github.com/tiktok/TikTokSans) (README, designspace axes, glyph list)
- [Instagram Graph API media reference](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media), [Facebook Reels publishing](https://developers.facebook.com/docs/video-api/guides/reels-publishing), [Threads API overview](https://developers.facebook.com/docs/threads/overview)
- YouTube: [3-minute Shorts](https://support.google.com/youtube/answer/15424877), [upload encoding settings](https://support.google.com/youtube/answer/1722171), [hashtags](https://support.google.com/youtube/answer/6390658), [Google Ads video specs and safe-zone overlay](https://support.google.com/google-ads/answer/13547298) (overlay PNG measured)
- [X media best practices](https://docs.x.com/x-api/media/quickstart/best-practices); [LinkedIn video specs](https://www.linkedin.com/help/linkedin/answer/a548372); [Bluesky social-app constants](https://github.com/bluesky-social/social-app/blob/main/src/lib/constants.ts)
- Safe-zone secondary sources: [cadenus.io](https://cadenus.io/resources/blog/tiktok-safe-zone/), [1clickreport](https://www.1clickreport.com/blog/meta-ads-creative-safe-zones-2026-guide), [adchecklab](https://adchecklab.com/articles/youtube-shorts-safe-area-dimensions), [Verve](https://vervecreative.studio/instagram-reels-safe-zones-and-tips/), [Xyla](https://www.xyla.ai/tools/social-media-sizes/)
- Fonts and captions: [Kapwing: TikTok fonts](https://kapwing.com/resources/what-fonts-does-tiktok-use-and-how-to-get-them), [ascynd: Hormozi caption specs](https://ascynd.io/en/blog/hormozi-captions), [SendShort](https://sendshort.ai/guides/hormozi-captions/), [Picsart: Instagram fonts](https://picsart.com/blog/instagram-fonts/), [creativeflywheel TikTok fonts](https://creativeflywheel.notion.site/TikTok-Fonts-c41d5b5dbeba458c889cdea81ed39632)
- Formats and case studies: [Superwall: Stronger "viral on demand"](https://superwall.com/blog/how-stronger-built-a-usd600k-app-using-viral-on-demand-tiktok-strategy), [Playkit: Cal AI UGC](https://playkit.substack.com/p/calorie-tracker-app), [Shortimize: Rayz AI](https://www.shortimize.com/blog/from-zero-to-80k-mrr-in-75-days-how-rayz-ai-mastered-tiktok-marketing), [Larry / OpenClaw slideshows](https://gameplaydev.substack.com/p/how-his-openclaw-agent-larry-got), [stack-junkie Larry deep dive](https://www.stack-junkie.com/blog/how-to-automate-tiktok-marketing-with-openclaw-larry-skill-deep-dive)
- Apple HIG system colours (values as published before iOS 26)
