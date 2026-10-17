# Brainrot / retention formats that market apps: replication recipe

*Research date: 2026-10-16. Measurements come from 21 downloaded videos (TikTok, 283K to 41.9M views). I extracted frames with ffmpeg, measured pixels, transcribed audio with faster-whisper (`base.en`, word timestamps), and estimated each word's pitch to tell the TTS voices apart. All pixel values are **normalized to a 1080×1920 frame** (TikTok serves these at 576×1024 or 720×1280, and I scaled them up). Raw downloads are in `refs/viral2/brainrot/<id>/` (git-ignored). Contact sheets are in `research/viral/brainrot-sheets/`.*

Corpus: **21 measured videos**. **13 are fake-text stories** (11 tag Rizz App, 2 tag Plug AI; the 2026 Rizz pages use cooking or pasta B-roll instead of parkour), **2 are Reddit-story TTS videos** (@reddits.stories, 2.0M and 2.7M) as the reference for that style, **4 are "PDF to brainrot" demos** where the app's output *is* brainrot (Memenome 557K–4.0M, Coconote creator 41.9M), and **2 are Halo AI prank-text videos** (15.9M, 1.1M). I also downloaded and excluded 5 videos that turned out to be talking heads or app screen recordings (Answers AI 5.2M, StudyFetch 13.4M/6.5M, ScrollToStudy 688K, Coconote creator 325K).

> **The single most important correction for Shipreel:** none of the 21 measured hits is a 50/50 split screen. The winning text-story and Reddit-story layout is **full-bleed 9:16 background footage with ONE floating card in the upper-middle** (chat card or Reddit title card) and nothing else on screen. The "top half = content, bottom half = Subway Surfers" split exists, but it belongs to clip-repost/podcast brainrot (§6), not to the app-plug text stories that drove Rizz to 550M+ views.

---

## 0. TL;DR: the rules that held across the hits

1. **Full-bleed background + one floating card.** The background is 1080×1920 footage with no letterbox and no blur. The card is **68–80% of frame width, horizontally centered**, with its **top edge at 15–23% of frame height**. It grows downward as messages arrive and is capped at about **75–80% height (y≈1450–1530)**, at which point it "pages" (clears and restarts from the top).
2. **Background = first-person Minecraft parkour (2024 to 2026) or top-down cooking/craft hands (2026 trend).** Parkour is one continuous take (0–2 cuts per 90 s). The 2026 Rizz pages (@golden_textes 1.9M, @textsrampage 1.2M) switched to overhead cooking and pasta-making ASMR with **one cut every 9–15 s**. Reddit stories use a **satisfying-clip montage with a cut every ~5 s**, keeping the source creators' watermarks.
3. **Audio = two AI voices reading every single message, at ~4.6–5.4 words/s.** Sent (blue) messages use one voice and received (gray) messages use the other, matched to each character's gender (male F0 ≈ 90–140 Hz, female ≈ 210–300 Hz). There is **no music and no silence**: the first word is at **0.00 s** in all 15 text- and Reddit-story videos, and the median gap between words is **0.00 s**. Gameplay audio is muted.
4. **Every bubble appears on the exact frame its TTS line starts (±50 ms).** It is a hard cut, or a 2-frame fade in the 2026 renders. There's no typing indicator, no slide-up and no sound effect. The hook pace is **~1.4 messages per second** (textcube 8.5M: 8 bubbles in the first 5.5 s).
5. **The hook is a mid-conflict first line, under 8 words, read at 0.00 s.** Examples: "Ready for our wedding?" / "Our wedding?" / "You're getting married to my sister", "Babe, whose car is in the driveway?", "Babe, what's your phone passcode?" / "It's my ex's birthday." The second line contradicts or escalates within 1.5 s.
6. **The app is a character in the story, not an ad.** At **7–46% of the runtime** (median ~30%), the protagonist is stuck and the TTS says "Rizz app, help me out here" or "Rizz app saved me". A **branded "assist panel"** then replaces the chat card for **3–5 s**: app logo, a mini screenshot of the chat, "👇 AI generated RIZZ 👇", and a suggested reply in a white card with a copy icon. The TTS reads the reply, and it is then **sent as a blue bubble and read a second time**. 2026 variant: a character says "I just downloaded the Rizz app, get it from my bio", a fake TikTok profile card appears with "GET RIZZAPP HERE" and a bio link, and a **red ⬇ arrow points at the real bio**.
7. **The caption carries the tag. There is no end card.** Every app-plug post's caption starts with an @mention: "@RIZZ APP clutched up", "@RIZZ APP always comes in clutch. Link in Bio", "@Plug AI "pretty" heavy 💀". Videos end mid-story or on a cliffhanger. 2026 pages add "comment 'VACATION' for part 2".
8. **Length: text stories 60–557 s (median ~170 s), Reddit stories 137–179 s.** Long is the point: TikTok's Creator Rewards pays for >60 s, and every extra message is another reason to stay.
9. **Reddit-story style:** a Reddit/Twitter-style **title card that scales in from ~55% to 100% over 0.4 s**, holds while the title is read (~2.8 s), then disappears. After that come **1–2-word captions centered at 50% height**, in white heavy sans (Montserrat ExtraBold/Black look), **sentence case**, **~90 px**, with a **~10 px black stroke** plus a soft dark shadow. They hard-cut on every word group, with no pop, no colour highlight and no karaoke.
10. **Rizz ran it as a network, not a brand account.** 15+ rented pages posted 1–3 times a day from one blueprint. @textcube averaged 1.4M views over 66 videos ([Shortimize, Oct 2024](https://www.shortimize.com/blog/rizz-apps-b-roll-strategy-that-got-them-half-a-billion-views-on-tiktok): 550M+ views across @textcube, @okaygesture, @textsrampage, @textbix, @texttension, @textvox, @sentimental.texting and others; competitors Astra via @textiify (150M+; by 2026 @textiify tags Rizz, so pages switch sponsors) and Plug AI via @textfun/@textswildin (~126M)). Like rates on the organic hits are **3.5–9%**. Treat @textvox (283K views, 1.4% likes) as probably boosted.
11. **The two biggest app-plug numbers in this family are *not* TTS-over-gameplay.** Coconote's 41.9M (11% likes) and Halo AI's 15.9M (10.7% likes) are raw phone captures of the app doing something petty to a real person: turning a boyfriend's wall of text into a Minecraft brainrot video, or AI-faking a cooked koi fish to prank Dad. A trending or ironic song plays under them (Nicki Minaj "Anaconda", a sad Chopin piano piece), the hook is TikTok Classic text, there's no voiceover, and the app is visible doing the trick (§9b, §9c). Their like rates are ~2× the Rizz pages' (3.5–9%). If Shipreel wants a brainrot format that *sells the app*, build this "app-powered prank/clapback" template alongside the TTS text story.

---

## 1. Layout geometry (1080×1920)

### 1a. Fake text story, dark mode (the 2024 default; 9 of 13)

```
 y=0    ┌──────────────────────────────────────┐
        │                                      │  full-bleed Minecraft parkour,
        │        (background footage)          │  first-person, motion-blurred,
 y≈440  │   ┌──────────────────────────────┐   │  saturated (lava, leaves, sky)
        │   │ <   ( avatar 100px )     [▭◁]│   │  header #1C1C1C, ~200 px tall
        │   │        olivia (crush)        │   │  name 24-26 px, white
 y≈645  │   ├──────────────────────────────┤   │
        │   │                     [ hey ]  │   │  body #000000
        │   │             [is this olivia?]│   │  sent: #0A7AF6-ish blue, white text
        │   │ [ maybe ]                    │   │  recv: #262626 gray, white text
        │   │ [ who's asking? ]            │   │  bubble 72-76 px tall (1 line)
        │   │                  [ it's henry]│   │
        │   └──────────────────────────────┘   │  card grows ↓ per message
 y≈1450 │      (page resets at this depth)     │  max bottom 1450-1530
        │                                      │
 y=1920 └──────────────────────────────────────┘
          x=106                          x=972     (card width 866 = 80%)
```

Measured values (median over frames sampled every 3 s):

| Account (views) | Card x0–x1 (width %) | Card top y (% H) | Max bottom y | Corner radius | 1-line bubble height | Theme |
|---|---|---|---|---|---|---|
| textcube 8.5M / 3.1M | 106–972 (80%) | 444 (23%) | 1454–1476 | 0 (square) | 70–72 | dark |
| textbix 3.9M | 108–974 (80%) | 442 (23%) | 1480 | 0 | 72 | dark |
| okaygesture 5.2M / 4.9M | 132–948 (76%) | 272 (14%) | ~1200 | 0 | 68 | dark |
| textfun 844K (Plug AI) | 138–940 (74%) | 404 (21%) | 1210 | 0 | 60 | dark |
| textiify 1.7M / 406K (2026) | 175–907 (68%) | 340 (18%) | ~1530 | ~40 | 76–80 | dark, iOS 17+ header |
| textsrampage 1.2M (2026) | ~160–920 (70%) | ~270 (14%) | ~1300 | ~30 | 82 | dark |
| golden_textes 1.9M (2026) | 108–971 (80%) | 301 (16%) | ~800–1000 | ~50–70 | ~80 (2-line 130) | **light** |
| texttension 2.3M | 146–934 (73%) | 187 (10%) | ~1450 | 0 | ~78 | **light Instagram-DM**: white body, received bubbles white with a 1 px #DBDBDB outline, 52 px round avatar beside the last received bubble, sent bubbles IG blue; dim blue-tinted parkour |
| textswildin 575K (Plug AI) | ~150–930 (72%) | 45–190 (2–10%) | ~1450 | 0 | ~56 | **light** iMessage/IG hybrid, profile header with a red censor bar over the username |

Bubble and type details (textcube 8.5M frame at 2.9 s, measured):
- Sent bubble fill **rgb(8,120,246)** ≈ `#0878F6` (render it as iOS `#0A84FF` or `#007AFF`; compression shifts it). Received fill **rgb(38,38,38)** `#262626` in dark mode and **rgb(233,233,235)** `#E9E9EB` in light mode. Text is white on both dark bubbles and black on the light gray one.
- Font is **SF Pro Text, ~36–38 px** at 1080 width (cap height ≈ 26 px), regular weight. Bubble horizontal padding is ~26 px and vertical padding ~18 px. Corner radius is ~36 px (a full pill on one-liners), with an iOS tail on the **last bubble of each run only**.
- Vertical rhythm: **4 px between consecutive bubbles from the same sender** and **~22–26 px when the sender switches**. Bubbles sit 34 px from the card edges (right edge for sent, left for received). Max bubble width is ~70% of card width.
- Header (dark): bg `#1C1C1C`, blue back chevron at x≈158, a 100 px gray default-person avatar (or a gray circle with a white initial "S"/"M"), contact name below it with an emoji and a ">" chevron, and a FaceTime outline icon at right in `#0A84FF`. 2026 renders add an **unread-count pill** ("6767", "+44") next to the back chevron.
- Contact names are a character role plus an emoji: "olivia (crush)", "Sophie🍑", "my boy 💙", "Hot Neighbor 😏", "Mom", "Ethan's Mom", "Unknown", "9999999+".
- There is a soft drop shadow under the card (~20 px blur, ~40% black) so it lifts off bright footage.

### 1b. Paging (how a long chat stays readable)
- New bubbles are appended at the bottom, and the card's bottom edge grows by the bubble height.
- When the next bubble would pass y≈1450 (dark) or ≈1000 (golden light), the card **cuts to a fresh page**: same top y, **no header**, starting with the incoming bubble. The header only reappears when the story jumps in time ("next day") or switches to another contact.
- A page holds **5–9 bubbles**, roughly **5–8 s** of audio.

### 1c. Reddit-story title card + captions (@reddits.stories 2.7M)

```
 y=0    ┌──────────────────────────────────────┐ watermark of the source clip creator
        │                                      │ top-left, left in place
 y=322  │  ┌────────────────────────────────┐  │ card bg #F0E8F2 (light lavender)
        │  │ (snoo 136px) @RedditReloop ✔   │  │ radius ~36 px
        │  │              🏅🎖️🏆 award row   │  │
        │  │ While I was late for school,   │  │ title: Helvetica/Arial Bold,
        │  │ I realized I forgot to take my │  │ ~52 px, black, 4 lines
        │  │ epilepsy medication.           │  │
        │  │ ♡420+   ⇪420+                  │  │
 y=757  │  └────────────────────────────────┘  │ x 165–915 (69% width)
        │                                      │
 y≈962  │              I forgot                │ caption centre at 50% H
        │                                      │
        │   (satisfying clip, cut every ~5 s)  │
 y=1920 └──────────────────────────────────────┘
```

- Card animation: **scale 0.55 → 1.0 over 12 frames (0.4 s)**, ease-out, anchored at the centre, with no fade. It holds while the title is read (0–2.9 s), then cuts away with a 3-frame fade. After that, only captions remain.
- The 2.0M video uses the same card at the same position with a 3-line title.
- Captions: see §3.

---

## 2. Timing

| Metric | Text stories (13) | Reddit stories (2) |
|---|---|---|
| First spoken word | **0.00 s** (all) | **0.00 s** |
| Speech rate while talking | **4.2–5.4 words/s** (median 4.8) | **5.46 words/s** |
| Overall rate incl. pauses (first 100 s) | 3.2–4.8 words/s | 5.3 words/s |
| Gaps > 0.3 s per 100 s | 8–65 (median ~25) | 7–10 |
| New bubble / caption cadence | ~1.4 bubbles/s in the hook, 0.5–1/s later | a new 1–2-word caption every ~0.3 s |
| Words per message | median **5**, mostly 1–13, rarely >17 (textcube 8.5M, 37 messages in 50 s) | n/a |
| Total length | 60–557 s (median ~170 s) | 152–170 s (account range 137–179 s) |
| Background cut interval | parkour: 45–90 s+ (one take); cooking: 9–15 s | ~5 s |
| App plug at | 7–46% of runtime; assist panel shown **3–5 s** | n/a in these two |

Bubble ↔ audio sync, measured on textcube 8.5M:

| Bubble appears (card grows) | First word of its TTS |
|---|---|
| 0.0 s "hey" | 0.00 "Hey," |
| 0.5 s "is this olivia?" | 0.46 "is" |
| 1.2 s "maybe" | 1.22 "Maybe," |
| 1.7 s "who's asking?" | 1.74 "who's" |
| 2.7 s "it's henry" | 2.66 "It's" |
| 3.4 s "wait henry jensen…" | 3.34 "Wait," |
| 4.3 s "the one in my bio class?" | 4.26 "the" |
| 5.4 s "yeah" | 5.48 "Yeah." |

**Rule for Shipreel:** `bubble.start = tts_line.start`. Lines are concatenated with **0–80 ms** gaps. Add a **~400 ms** pause only at a page break or a dramatic beat (a photo reveal, a "…", a "Delivered" receipt).

---

## 3. Caption presets (for TTS narration formats)

### 3a. "Reddit-story" preset (measured, @reddits.stories 2.7M / 2.0M), the one to ship first
| Property | Value |
|---|---|
| Font | **Montserrat ExtraBold (800)**. Black (900) also matches, as does Proxima Nova Extrabold. |
| Size | **~88–92 px** at 1080 width (x-height ~48 px; "the driveway" ≈ 720 px wide) |
| Case | as spoken (sentence case, keeps punctuation: "school,", "medication.") |
| Fill | `#FFFFFF` |
| Stroke | **black, ~10 px** (outer), round joins |
| Shadow | soft black, ~8 px blur, 0 offset (a glow that thickens the stroke) |
| Words on screen | **1–2**, measured mean **1.3–1.55 words per group**, with a new group every **0.24–0.27 s** (3.6–4.2 changes/s). Short function words get paired: "I was", "out of", "when I", "the driveway". |
| Position | centred horizontally; **vertical centre y = 960 (50%)** |
| Animation | **none**, a hard cut on each group, synced to word start times |
| Highlight | none (all white) |
| Max width | ~900 px. Never wraps; a long word stands alone. |

### 3b. Other presets people use (from vendor docs and my knowledge; not measured here)
| Preset | Font | Case | Colours | Stroke / shadow | Words | Motion |
|---|---|---|---|---|---|---|
| **Hormozi (old)** | The Bold Font | UPPERCASE | white, keyword in yellow `#F7C204` or green `#02FB23` | no stroke, heavy shadow (CapCut: opacity 100%, blur 70%, distance 14%) | 2–3 per line, 4–6 over 2 lines | word pop-in |
| **Hormozi (new)** | Anton | UPPERCASE | white + one colour keyword | thin yellow stroke + small shadow | 2–4 | pop-in from bottom to top |
| **Hormozi (free clone)** | Montserrat Black 900 | UPPERCASE | white, one keyword yellow/green/red per line | 5–8 px black outline | 3–5 per line | word pop, keyword scaled +10–20% |
| **Beast (MrBeast)** | Komika Axis | UPPERCASE | white, keyword yellow/green | thick black outline + drop shadow | 1–3 | bounce/pop, optional glow (Submagic S/M/L) |
| **Karaoke** | Montserrat/Poppins Bold | sentence or UPPER | all words white, **current word** recoloured (green `#00FF66` or yellow) or boxed | black outline | 3–6 visible, highlight moves per word | colour swap on the word's start time |
| **TikTok Classic** | TikTok Sans Bold | as typed | white | 3–4 px black outline | full sentence | none |

Sources: [Submagic Hormozi guide](https://www.submagic.co/blog/how-to-make-alex-hormozi-captions), [Submagic MrBeast guide](https://submagic.co/blog/how-to-make-captions-like-mrbeast), [BlitzCut font specs](https://blitzcutai.com/blog/best-caption-fonts-tiktok), [SendShort Hormozi](https://sendshort.ai/guides/hormozi-captions/), [Kapwing Hormozi template](https://www.kapwing.com/explore/hormozi-style-captions-template).

**Why the Reddit preset beats Hormozi/Beast for this format:** these viewers watch the background, not the words. One centred word at a time, with no colour or motion, reads at a glance and never competes with the footage. Pop animations at 5+ words/s turn into strobing. Keep pop and highlight presets for talking-head formats.

### 3c. Text-story formats have **no captions at all.** The chat bubbles are the captions.

---

## 4. TTS voices

**What the hits use (measured):**
- **Text stories:** **two voices**, one per side of the chat, matched to each character's gender. Per-word pitch analysis shows clean alternation, e.g. okaygesture 5.2M "Hello?" 216 Hz (female) → "Uh, hi? Who's this?" 80–153 Hz (male) → "I'm the person in the apartment below you" 210–290 Hz (female). Female lines sit at a median F0 of **~240–290 Hz** and male lines at **~90–130 Hz**. The sound is neural TTS in the ElevenLabs / TikTok-TTS class, delivered fast and flat, with no added effects. In the Rizz plug the "app" has no voice of its own: the protagonist's voice says "Rizz app suggests replying with…".
- **Reddit stories:** **one narrator voice.** 2.7M: a high female voice (median F0 **266 Hz**, P10–P90 235–344 Hz). 2.0M: a mid male/neutral voice (median **157 Hz**). Both run at **5.46 words/s**, which is about 1.5× natural speech (~3.3 words/s). These are almost certainly normal TTS sped up 1.3–1.5×. The pitch is raised too, so it's speed-up without pitch preservation (or a naturally high voice).
- TechCrunch describes the voice as "monotone, computer-like"; an RSM study says most posters use **ElevenLabs**. ElevenLabs lists **Brian, Liam, Adam** as its most popular social voices. TikTok's native "Jessie" voice (Kat Callaghan) is the other iconic one. ([TechCrunch](https://techcrunch.com/2024/11/20/pdf-to-brainrot-study-tools-are-a-strange-iteration-on-a-tiktok-trend), [RSM](https://digitalstrategy.rsm.nl/2024/10/09/the-anatomy-of-an-ai-generated-tiktok-post/), [ElevenLabs](https://elevenlabs.io/docs/help-center/product/voices/voice-library/what-voices-are-popular-on-tik-tok-you-tube-and-social-media))

**Target spec for Shipreel:** about **5.0 words/s** (≈300 wpm) for Reddit narration and **4.6–5.0 words/s** for chat lines, loudness about −14 LUFS, no music bed, no reverb, and no gap between lines (≤80 ms).

**macOS `say` (tested on this Mac, 37-word sentence):**

| Voice | Default rate | `-r 300` | `-r 330` | Use |
|---|---|---|---|---|
| Samantha (en_US, female) | 3.33 w/s | **5.29 w/s** | 5.70 | Best built-in female narrator. Closest to the 2.7M Reddit voice at `-r 300`. |
| Daniel (en_GB, male) | 3.17 w/s | **5.05 w/s** | 5.44 | Best male voice. A British accent is fine for Reddit narration. |
| Reed (English (US)), male | 2.96 w/s | 4.78 | **5.36** | Male side of a chat |
| Flo (English (US)), female | 2.96 w/s | 4.78 | **5.36** | Female side of a chat |
| Eddy / Rocko / Sandy / Shelley (US) | 2.96 w/s | 4.78 | 5.36 | Eloquence family: robotic, a "classic TikTok TTS" feel |
| Fred, Kathy, Ralph, Albert, Junior | 2.1–2.8 | — | — | Too dated or robotic; avoid |

Recipe: `say -v Samantha -r 300 -o line.aiff "<line>"`, then `ffmpeg -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-14"` to trim the head and tail silence of every line. Only the compact voices are installed on this Mac (no "Premium/Enhanced" Ava/Zoe/Evan). Downloading those in System Settings → Accessibility → Spoken Content would sound much closer to neural TTS.

Better local or near-free options (untested here): **Kokoro-82M** (Apache-2.0, runs on CPU; `af_heart`/`af_bella` for female, `am_adam`/`am_michael` for male) is the closest free match to the ElevenLabs sound these pages use. Piper (MIT) is lighter but flatter. For production quality, use **ElevenLabs** (Brian/Adam male, Jessica/Lily female) at speed 1.15–1.2, or synthesize at normal speed and apply `atempo=1.4`.

---

## 5. Story and plug structure (fake text)

```
0.0 s   HOOK: mid-conflict line + contradiction (2-4 bubbles in 1.5 s)
0-30 s  ESCALATION: misunderstanding deepens; a photo bubble or censored word
        every ~20 s; contact header shows a role ("olivia (crush)", "Hot Neighbor 😏")
~30%    STUCK: protagonist doesn't know what to say → "Rizz app, help me out here"
        → ASSIST PANEL 3-5 s (TTS reads the suggestion) → suggestion sent as blue
        bubble (read again) → other side melts ("Wow, that's... smooth")
30-90%  SECOND ACT: new conflict, often a 2nd contact (Mom, sister, ex), time skip
        (header returns). Optional 2nd assist.
END     cliffhanger or twist; no end card; caption "@APP clutched up"; 2026: "comment
        'BRIDE' for part 2"
```

**Assist panel spec** (Rizz, 7 of 13 videos; Plug AI uses the same layout with its own logo):
- A light card replaces the chat card: **x 136–943 (75%)**, **y 185–1111** (okaygesture 5.2M). The fill is a pastel diagonal gradient, lavender top-left **rgb(204,201,240)** `#CCC9F0` to pale mint bottom **rgb(201,225,229)** `#C9E1E5`, with square corners and a soft drop shadow.
- Top bar: a "<" chevron, the app wordmark centred at ~80 px tall (Rizz's chrome outline display font), and a "+" icon.
- A mini chat screenshot of the last 4–7 messages (the dark chat, scaled ~0.6×, radius 24) sits at y 340–755.
- Divider: a thin gray rule with "👇 **AI generated RIZZ** 👇" (bold, ~40 px) at y≈828. Alternate copies are "hold a reply for more" and "AI generated lines".
- The suggestion card is white, radius ~32, with bold 40 px dark text (2 lines) and a copy icon on the right, at y 900–1068.
- The panel appears on the frame where the TTS says the app name. It is held while the TTS reads the suggestion (2.5–4 s), then cuts back to the chat card, where the same text arrives as a blue sent bubble.
- textcube 3.1M variant: a full **phone screen recording** of the app (status bar 12:02, "Get NSFW Reply 😈" button) in a 770 px-wide frame for ~3 s.

**2026 in-story plug** (golden_textes 1.9M):
1. A character texts: "i just downloaded the rizz app, get it from my bio".
2. A **red down-arrow**, a block arrow ~125 px wide × 290 px tall, fill **rgb(223,37,45)** `#DF252D` with a ~5 px white outline, sits at **x 245–370, y 1358–1645**. That's left of centre, pointing at TikTok's @username/caption area, which is the tap target to reach the profile. It stays on for ~6 s while the chat continues above.
3. A white card shaped like a TikTok profile appears for ~3 s: avatar, "Dessert Texts 9+", "45 Following / 7,894 Followers / 624.6K Likes", "GET RIZZAPP HERE 💖⬇️", and the link `https://rizz.app/c/Dessert_texts`. The chat continues underneath it.

**Other recurring beats:**
- Photo bubbles: an image in the chat (a selfie, "Mrs. Alabama" winner, a party photo) at ~420×420, radius 24. These show up every 20–40 s and are the visual reset.
- Censorship: a red bar over swear words or usernames.
- Read receipts: "Delivered" in 18 px gray under the last sent bubble, used for tension before a reply.

---

## 6. Split-screen "satisfying + content" (for completeness)

In the Rizz/Plug corpus nobody used a horizontal split. The split layout is the clip-repost brainrot style: a TV/podcast/movie clip on top and Subway Surfers, Minecraft parkour or a satisfying video below. "PDF to brainrot" study tools (Coconote, StudyFetch, StudyRot, Memenome) also produce it: TTS reads your notes over "oddly satisfying" footage ([TechCrunch](https://techcrunch.com/2024/11/20/pdf-to-brainrot-study-tools-are-a-strange-iteration-on-a-tiktok-trend)). Know Your Meme's definition is "a split-screen of at least two videos". Coconote reported 100–200M views from its "PDF to brainrot" output but only ~3,000 trials (see `research/formats.md`). That is the cautionary tale: **split-screen brainrot about the app's topic drives views, not installs, unless the app is the story's plot device.**

Geometry to use if Shipreel offers it (standard CapCut split, as used by the clip pages):
```
 y=0     ┌──────────────┐  TOP: content clip, scaled to fill 1080×960 (crop centre),
         │   content    │        face/subject in the middle 60%
 y=960   ├──────────────┤  no gap, no divider line (some pages use a 4 px black seam)
         │  gameplay    │  BOTTOM: gameplay 1080×960, crop the centre of a 9:16 source
         │              │          (keep the runner/player in frame), muted
 y=1920  └──────────────┘  CAPTIONS: Reddit preset (§3a) centred ON THE SEAM, y≈960
```
Captions sit on the seam because that is where both halves' viewers look. Some pages use a 60/40 split (content 0–1150) when the content clip has a face.

---

## 7. Background footage: what to use and where to get it legally

What the hits use: first-person Minecraft parkour (custom maps: lush caves, ocean monuments, nether lava, colourful wool) at high FOV with motion blur, 60 fps downsampled to 30. Also Subway Surfers runs (textvox), overhead cooking with gloved hands (textsrampage 2026), overhead fresh-pasta/ravioli making (golden_textes 2026), and a satisfying-clip montage with creator watermarks (reddits.stories). All of these are ripped from other creators or games. **Don't do that in Shipreel.**

Clean sources:

| Source | What | License | Notes |
|---|---|---|---|
| **Record it yourself in Luanti (Minetest) + a CC parkour map** | First-person voxel parkour that looks like Minecraft | Engine LGPL-2.1+. Minetest Game media are **CC BY-SA 3.0** (a few files WTFPL/CC BY) per the [Debian copyright file](https://metadata.ftp-master.debian.org/changelogs/main/l/luanti/stable_copyright). Mineclonia's Pixel Perfection-based textures are **CC BY-SA 3.0** ([README](https://bytes.keithhacks.cyou/etc/Mineclonia/commit/9456e90aba7bfbc2a87dcef12c0fa1270bb3fa34)). Check VoxeLibre's LEGAL.md. | The best match for the look, and fully owned. Set FOV 90–100, enable motion blur and fast movement, render 1080×1920. Credit the texture pack in the description. |
| Minecraft footage you record yourself | Real Minecraft parkour | Mojang Usage Guidelines allow monetized gameplay videos; ads in-game are banned. Using it **to advertise a third-party app** is a grey area. | ([summary](https://conductatlas.com/platform/minecraft/minecraft-usage-guidelines/video-content-monetization-carve-out/)). Maps such as [Biome Parkour](https://www.curseforge.com/minecraft-bedrock/maps/biome-parkour) are CC BY-SA 4.0 (credit + link). |
| **Pexels** (pexels.com/license) | Cooking/hands/craft vertical clips (pasta, chopping, pouring, slime-like fluids) | Free for commercial use, no attribution; don't resell unaltered | The 2026 cooking-B-roll look is the easiest to source legally. Search "pasta making", "chopping vegetables top view", "paint pouring", "kinetic sand" with `orientation=portrait`. |
| **Pixabay** (Content License) | "satisfying" loops, abstract fluids, 3D cubes | Free for commercial use, no attribution | Few real-world satisfying clips (15 vertical results for "satisfying"). The 3D/abstract ones work as fallback. |
| **Generate it** (three.js / Blender in Shipreel) | Endless runner, marble run, soap/sand cutting sim, ball-bounce | Owned | Deterministic, infinitely long, no licensing. A voxel runner in three.js gets close to Subway/Minecraft energy. |

Don't use: YouTube "no copyright parkour" packs or Gumroad "free gameplay" bundles (provenance unknown), Subway Surfers footage (SYBO IP), or other creators' satisfying clips (the reddits.stories montage keeps their watermarks).

---

## 8. Hook bank (verbatim from the hits)

Fake-text openers (first 2–3 bubbles; all read at 0.00 s):
1. "Ready for our wedding?" / "Our wedding?" / "You're getting married to my sister" (textiify 1.7M)
2. "hey" / "is this olivia?" / "maybe" / "who's asking?" (textcube 8.5M)
3. "Babe, whose car is in the driveway?" / "Oh, I'm not sure. I think the camera is glitching" (textbix 3.9M)
4. "Babe, what's your phone passcode?" / "It's my ex's birthday." (texttension 2.3M)
5. "Hello?" / "Uh, hi? Who's this?" / "I'm the person in the apartment below you." (okaygesture 5.2M "NEW NEIGHBOR")
6. "Can I call you?" / "This is serious. It's about Lily." (okaygesture 4.9M "PHONE SWAP")
7. "Hey baby, we need to talk." / "What babe? Is it bad?" (textcube 3.1M)
8. "Check your email right now." / "Michael, we haven't spoken in eight months." (textsrampage 1.2M)
9. "you never guess what song just came on" / "if you say our song i'm going to scream" (golden_textes 1.9M)
10. "Can I cheat on you?" / [photo] / "they asked if I wanted to run some solo vs duos" (textfun 844K, Plug AI)
11. "Alex!" / "Alex!" / "Alex!" / "Jess just won Mrs. Alabama!" [photo] (textswildin 575K, Plug AI)
12. "Hey babe, wanna go out?" / "Can you stop calling me that and use my actual name for once?" (textvox 283K)

Reddit-story first lines (title card; account's top 10 by views):
"While I was late for school, I realized I forgot to take my epilepsy medication." (2.7M) · "When my little brother got home from school he said, 'Did you know Tic Tacs make pain go away?'" (2.0M) · "My daughter came home and asked, 'Mommy, why does my skin make people…'" (1.5M) · "While driving home, someone started spam texting my phone." (1.4M) · "My doctor set down my test results and said, 'Before I explain this…'" (1.0M) · "A customer came back into our restaurant right after leaving and said…" (983K) · "I looked at my parents during my brother's funeral, and they didn't…" (933K) · "At a wedding, someone tried to 'expose' me and stole my service dog." (874K) · "We were in the middle of class, when the fire sprinklers started…" (824K)

Pattern: **[ordinary setting] + [a quote or event that breaks it]**, written in the first person and in the past tense. Every title includes a person (mom, brother, doctor, customer) and leaves the reveal hanging.

Caption-field formulas: "@APP clutched up" · "@APP saved me" · "@APP saved the day" · "@APP always comes in clutch. Link in Bio" · "@APP WITH the assist 💪" · "@APP [STORY NAME] (Part 2)" · "@APP comment 'VACATION' for part 2... link in bio". Hashtags: #texts #textstory #textingstory #textingstories #rizzapp #storytime #redditstories #minecraftparkour #tiktok_collaboration.

---

## 9. Example table

Measured (downloaded, frames + transcript):

| ID | URL | Account | Views | Likes (rate) | Date | Len | Background | Plug | Hook (first TTS words) |
|---|---|---|---|---|---|---|---|---|---|
| textcube-8.5M | https://www.tiktok.com/@textcube/video/7363859568079785248 | @textcube | 8.5M | 620K (7.3%) | 2024-05 | 300 s | MC parkour, 1 take | Rizz panel @20 s (7%) | "Hey, is this Olivia? Maybe, who's asking? It's Henry." |
| okaygesture-5.2M | https://www.tiktok.com/@okaygesture/video/7411945270843395360 | @okaygesture | 5.2M | 272K (5.2%) | 2024-09 | 145 s | MC parkour | Rizz panel @40–44 s (28%) | "Hello? Uh, hi? Who's this? I'm the person in the apartment below you." |
| okaygesture-4.9M | https://www.tiktok.com/@okaygesture/video/7411320095428873505 | @okaygesture | 4.9M | 275K (5.6%) | 2024-09 | 268 s | MC parkour | Rizz panel @100–107 s (37%) | "Can I call you? This is serious. It's about Lily." |
| textbix-3.9M | https://www.tiktok.com/@textbix/video/7365467235483159840 | @textbix | 3.9M | 332K (8.5%) | 2024-05 | 133 s | MC parkour | Rizz panel @22.5–25 s (17%) | "Babe, whose car is in the driveway?" |
| textcube-3.1M | https://www.tiktok.com/@textcube/video/7407250194334551329 | @textcube | 3.1M | 286K (9.2%) | 2024-08 | 313 s | MC parkour | Rizz phone recording @121 s (39%) | "Hey baby, we need to talk." |
| texttension-2.3M | https://www.tiktok.com/@texttension/video/7336255475354176801 | @texttension | 2.3M | 109K (4.7%) | 2024-02 | 85 s | MC parkour (lava) | light Instagram-DM chat; @rizz.app tag | "Babe, what's your phone passcode? It's my ex's birthday." |
| golden-1.9M | https://www.tiktok.com/@golden_textes/video/7605595090408525078 | @golden_textes | 1.9M | 74K (3.9%) | 2026-02 | 173 s | overhead pasta making | in-story "get it from my bio" + profile card + red arrow @80 s (46%) | "you never guess what song just came on" |
| textiify-1.7M | https://www.tiktok.com/@textiify/video/7676293032320208158 | @textiify | 1.7M | 80K (4.7%) | 2026-08 | 380 s | MC parkour (night) | Rizz panel @168 s (44%) | "Ready for our wedding? Our wedding?" |
| textsrampage-1.2M | https://www.tiktok.com/@textsrampage/video/7681711809509772566 | @textsrampage | 1.2M | 65K (5.4%) | 2026-09 | 441 s | overhead cooking (gloved) | Rizz panel @105 s and @215 s; "comment 'VACATION' for part 2" | "Check your email right now." |
| textfun-844K | https://www.tiktok.com/@textfun/video/7410074052557098272 | @textfun | 844K | 57K (6.7%) | 2024-09 | 85 s | MC parkour | Plug AI panel @36 s (42%) | "Can I cheat on you?" |
| textswildin-575K | https://www.tiktok.com/@textswildin/video/7400490670873382177 | @textswildin | 575K | 49K (8.5%) | 2024-08 | 60 s | MC parkour | Plug AI panel @~22 s (37%), light theme | "Alex! Alex! Alex!" |
| textiify-406K | https://www.tiktok.com/@textiify/video/7691219708799929630 | @textiify | 406K | 19K (4.7%) | 2026-09 | 557 s | MC parkour | Rizz (late) | "…can you stop screaming at your game?" |
| textvox-283K | https://www.tiktok.com/@textvox/video/7415355157363428639 | @textvox | 283K | 3.9K (1.4%, likely boosted) | 2024-09 | 82 s | **Subway Surfers** | "RizzApp, help me out here" + panel @16.5–20 s (20%) | "Hey, babe, wanna go out?" |
| redditstories-2.7M | https://www.tiktok.com/@reddits.stories/video/7600223379337121046 | @reddits.stories | 2.7M | 20K (0.7%) | 2026-01 | 152 s | satisfying montage, 5 s cuts | none (generic reference) | "While I was late for school, I realized I forgot to take my epilepsy medication." |
| redditstories-2.0M | https://www.tiktok.com/@reddits.stories/video/7599480618711289110 | @reddits.stories | 2.0M | 85K (4.2%) | 2026-01 | 170 s | satisfying montage | none | "When my little brother got home from school, he said, 'Did you know Tic Tacs make pain go away?'" |

Account-level context (from yt-dlp listings of the last 25–40 posts): @textcube posts 1.2M / 1.5M / 2.3M / 3.0M / 3.1M among 30K–1M others, 1–3 posts a day in Aug–Oct 2024. @okaygesture 5.2M / 4.9M / 3.6M / 2.3M / 1.8M with multi-part series ("PHONE SWAP (Part 2)", "Marc & Beck (P1)"). @textbix 3.9M / 3.0M / 2.3M. @textswildin (Plug AI) 575K / 460K / 268K. @golden_textes peaked at 1.9M / 649K / 460K in Feb 2026. @textiify 2026: 150K–406K per post at 5–9-minute lengths. @textsrampage 2026: 300K–1.2M with "comment X for part 2".

### 9b. Format (d): an app whose *output* is brainrot (measured)

| ID | URL | Account | Views | Likes (rate) | Date | Len | What's on screen | Plug | Hook |
|---|---|---|---|---|---|---|---|---|---|
| memenome-4.0M | https://www.tiktok.com/@memenomeai/video/7430384330163096875 | @memenomeai | 4.0M | 494K (12.4%) | 2024-10 | 36 s | Phone filming a laptop: "PDF to Brainrot" page → a 1957 "Powerhouse of the Cell" PDF is uploaded → Generate → spinner → the output plays: **the exact Reddit-story format** (white title card "Mitochondria: The Hype House of the Cell" scaling in over parkour, then 1-word white captions) | The product *is* the video. Caption: "Are we cooked? #memenome" | ~11 s of silent UI (title text "PDF to Brainrot" visible from frame 1), then TTS: "Mitochondria, the hype house of the cell. Yo, mitochondria be the ultimate MVPs…" |
| coconote-sid-41.9M | https://www.tiktok.com/@sidstudiesadhd/video/7438758153044413742 | @sidstudiesadhd (Coconote creator) | **41.9M** | 4.6M (11.0%) | 2024-11 | 13 s | Phone filming a laptop. A guy's wall-of-text iMessage, "I'm not reading all that.", she opens coconote.app/brainrot, "Video background: Minecraft parkour", and the generated video plays (UPPERCASE yellow/green word captions + "coconote.app" watermark). She sends it back: "Go head and watch it then since you have the braincells of an 8 year old". | Overlay text the whole time: "oh he don't wanna read all that?????? #womeninmalefields" (TikTok Classic white, black outline, y≈35%). Caption: "(website is Coconote ai for those of you asking)". Sound: Nicki Minaj "Anaconda" (trending), **no TTS**. | The overlay text *is* the hook |
| memenome-841K | https://www.tiktok.com/@memenomeai/video/7362454974493625643 | @memenomeai | 841K | 112K (13.3%) | 2024-04 | 23 s | Phone filming a laptop: "Brainrot Translator", the Bee Movie script pasted in, Translate, the output text and audio player | Product UI throughout | "According to all known laws of mewing, there is no way a bee should be able to rizz." |
| memenome-557K | https://www.tiktok.com/@memenomeai/video/7435590880452529450 | @memenomeai | 557K | 74K (13.4%) | 2024-11 | 43 s | Same laptop demo, Declaration of Independence → brainrot narration | Product UI + output | "You ever just break up with a country mid-letter?" |

Takeaways: (1) if the app *makes* content, the highest-liked brainrot (12–13% like rate, the best in this corpus) is a **raw, shaky phone-on-laptop demo whose payoff is the brainrot output**, with no edit polish. (2) The input is a famous or absurd text (the Bee Movie, the Declaration, a 1957 biology paper), so the hook is "what will it do to *this*?". (3) Per `research/formats.md`, Coconote's version got 100–200M views and ~3,000 trials: this sells to people who want to *make* brainrot, not to the topic's audience.

### 9c. Format (c) variant: AI-prank text story (Halo AI, from the founder's interview)

Measured examples:

| ID | URL | Account | Views | Likes (rate) | Date | Len | Notes |
|---|---|---|---|---|---|---|---|
| halo-jason-15.9M | https://www.tiktok.com/@jason.pranks/video/7582334187261185310 | @jason.pranks | **15.9M** | 1.7M (10.7%) | 2025-12 | 56 s | 0–~1.5 s: an AI photo (koi fish in a pot on a stove), letterboxed 3:4 inside 9:16, with TikTok Classic white text and black outline at y≈20–30%: "Pranking my dad / I cooked his koi fish 😭💀 / (he asian asf)". ~1.5–4 s: a screen recording of the Halo app (photo + prompt "Add a c…" + black "Generate" button). The rest is a **real iPhone iMessage screen recording**: dark mode, keyboard up, live typing, "Delivered", typing dots, contact "Dad" with a photo avatar, the AI photo sent mid-thread, Dad melting down ("MY KOI FISH?", "R U OUT YOUR MIND", "My koi fish more expensive than you"). Sound: a sad piano piece ("Chopin… Deep deep clear beauty"); **no TTS, no captions**. Post caption: "he finally gonna kick me out #asian #dad #prankvideo #prank #ai". |
| halo-official-1.1M | https://www.tiktok.com/@halo.ai0/video/7570046476462722311 | @halo.ai0 | 1.1M | 47K (4.2%) | 2025-11 | 60 s | Same structure: an AI cow head in a frying pan, "Pranking my vegan gf (it's our anniversary😭💀)" at y≈50%, then the texts. Sound: Mozart "Lacrimosa". |

Also reported (metadata only): @halo.ai0 "Told my sister I cooked her hamsters" 262K; @jason.pranks "got his name TATTED on my neck" 1.5M (probably Halo); @plug_ai fake-text carousel 2.3M (photo mode, not video).

Source: [Joseph Choi × Dillion Verma (Halo AI)](https://www.youtube.com/watch?v=PFfo4JySptw), auto-transcript. Claims (self-reported): **600M views in 60 days, 1.2B in 120 days, 85 creators, ~300 posts/day, "one single TikTok format… no deviation"**, conversion "like 0.5% or 0.3%" of viewers, and brand-new accounts' first videos reaching 10M.
- Structure, verbatim: "in the beginning we show an absurd hook and absurd image or video… *Pranking my dad I cooked his koi fish (he Asian AF)*… then the screen recording of texting the dad and sending him a picture [the AI image]… the text conversation is the rest of the video, and then there's nothing after that. Those are the constraints."
- Rules: the hook image is generated in the app (absurd but plausible); the caption must say "prank"; the rest is a **real-looking iMessage screen recording** of the target reacting ("My koi fish are more expensive than you. They are my children."); there is no end card or CTA. Mostly pranks, with parents as the most common target.
- Difference from Rizz pages: the app's output (the fake image) **is the hook** at 0 s rather than the mid-story assist, and the chat is a *phone screen recording*, not a floating card over gameplay.

### 9d. Split-screen app-marketing examples

I couldn't verify any 100K+ app-plug video using a true top/bottom split during this session. A delegated search of Coconote, StudyFetch, StudyRot, Memenome, Turbolearn, Crayo, Opus Clip, Revid and Vizard accounts found study apps posting talking heads and phone demos instead, and the AI clip tools had no split-screen hits over 100K. What I did find is tangential: StudyFetch 13.4M/9.6M/8.3M/6.5M are phone demos, Opus Clip 1.1M is a creator explainer, and Coconote creator @jonstudies 318K/103K ("the app is called coconote btw") is a talking head. Split screen remains the native look of clip-repost pages (podcast/TV clip + Subway Surfers). §6 gives the geometry if Shipreel wants it. In the evidence gathered here, it is not how apps got their big numbers.

---

## 10. Why these retain (the mechanics to copy)

1. **There is something to read every 0.7 s in the opening.** Every bubble is a micro-reveal, and reading speed is set by the TTS at ~1.4 bubbles/s. Viewers can't skim ahead because the next line isn't on screen yet.
2. **Two channels at once.** The card carries the meaning and the background carries the motion. Parkour moves forward constantly and cooking keeps completing small tasks, so the eye never has an "idle" frame even during a long message.
3. **Zero dead air.** The first word lands at 0.00 s, the median gap is 0 ms, and there's no intro, logo or music fade-in.
4. **Open loops stack.** "Who's this?", "It's about Lily", "my passcode is my ex's birthday": every page ends on a question, and the story usually runs 2–5 minutes with a time skip (header re-appears) as a mid-point re-hook.
5. **The app is a turning point, not an interruption.** It appears when the viewer *wants* the protagonist to have a good line, and the payoff (the other side melting) is the reward for watching the ad.
6. **Familiar UI = zero learning cost.** It's the exact iMessage look, with real-looking contact names, unread badges and read receipts. Any stylization (custom colours, brand fonts) breaks it.
7. **Length × completion.** Long videos with high completion get more watch time and pay out under Creator Rewards (>60 s). Parts 1/2/3 and "comment X for part 2" turn one story into a series and push comments.

---

## 11. Exact template for Shipreel: `fake-text-story` v2

```yaml
canvas: 1080x1920 @30fps
background:
  source: [voxel_parkour_fp, overhead_cooking, satisfying_loop]   # owned/licensed only
  fit: cover (no blur, no letterbox), audio muted
  cuts: parkour none | cooking every 9-15 s | satisfying every 4-6 s
chat_card:
  theme: dark (default) | light
  x: 106..972 (w=866)   # or "2026 compact": 175..907 (w=732, radius 40)
  top: 444  (dark/2024) | 300-340 (2026)
  max_bottom: 1450      # then page-break: clear, no header, same top
  radius: 0 (2024) | 40-60 (2026)
  shadow: 0 8px 24px rgba(0,0,0,.45)
  header: h=200, bg #1C1C1E (dark) / #F2F2F2 + 1px #D1D1D6 divider (light),
          back chevron + unread pill ("6767"), avatar 100px (initial or default person),
          name 26px + emoji + ">", FaceTime icon #0A84FF
  body_bg: #000000 (dark) / #FFFFFF (light)
  bubble:
    font: SF Pro Text 37px regular, line-height 1.2
    pad: 18px 26px, radius 36, max_w 70% of card, inset 34px
    sent: #0A84FF / text #FFFFFF, right; recv: #262628 (dark) or #E9E9EB (light), text #FFF / #000, left
    gap_same_sender: 4px, gap_switch: 24px, tail on last bubble of a run
  photo_bubble: 420x420 radius 24, every 20-40 s
  appear: on tts_line.start, hard cut (or 2-frame fade), no typing dots, no SFX
voices:
  sent: voice A (protagonist gender), recv: voice B
  rate: 4.6-5.0 words/s, gap <=80 ms, page-break pause 400 ms, no music
plug (assist panel):
  at: 25-40% of runtime, right after the protagonist is stuck
  tts: "<App> help me out here" / "<App> suggests replying with…"
  panel: x 136..943, y 185..1111, gradient #CCC9F0 (top-left) -> #C9E1E5 (bottom), logo 80px,
         mini-chat 0.6x, divider "👇 AI generated <APP> 👇", suggestion card + copy icon
  hold: 3-5 s, then the suggestion is sent as a blue bubble and read again
  alt_2026: character says "get it from my bio" + profile card 3 s + red down-arrow (x 245-370, y 1358-1645, #DF252D, white 5px outline) 6 s
length: 90-300 s (min 61 s), cliffhanger end, no end card
caption: "@<APP> clutched up 😭 Link in bio #texts #textstory #textingstory #<app>"
```

`reddit-story` v2:
```yaml
background: satisfying montage (cut every ~5 s) or parkour; full-bleed; muted
title_card: x 165..915, y 322..757, bg #F0E8F2, radius 36, avatar 136px, handle bold 34px + ✔,
            award-emoji row, title Helvetica Bold 52px black, "♡420+ ⇪420+" 28px gray
            anim: scale 0.55→1.0 in 0.4 s ease-out; hold for title read; then cut (3-frame fade)
captions: Montserrat ExtraBold 90px, white, 10px black stroke + 8px soft shadow,
          1-2 words, centre (540, 960), hard cuts on word timestamps, sentence case
voice: one narrator, 5.0-5.5 words/s, no music
length: 140-180 s
plug options: (a) the story itself mentions the app as the fix (like Rizz), (b) a pinned
          "app in bio" comment + caption tag. No end card was observed on any hit.
```

`app-prank` / `app-clapback` v1 (Halo 15.9M, Coconote 41.9M):
```yaml
canvas: 1080x1920, raw phone capture look (screen recording, or phone filming a laptop); no gameplay bg
0.0-1.5 s: the app's most absurd output full-screen (AI photo letterboxed 3:4, or the brainrot video)
           + TikTok Classic text (white, 3-4px black outline, ~56px, centred, y 20-50%, 1-3 lines):
           "Pranking my <relation> <did absurd thing> 😭💀 (<one-line justification>)"
           or "oh he don't wanna read all that?????? #<trend tag>"  (stays on screen for the whole video)
1.5-4 s:   app screen recording: input -> "Generate" -> output (the only product moment, no logo card)
4 s-end:   real iMessage screen recording (dark mode, keyboard up, live typing, "Delivered", typing dots),
           the output sent into the thread, the target's escalating reaction; ends on the best reaction
audio:     trending or ironic song (sad piano for pranks, a rap hook for clapbacks); no TTS, no captions
length:    13-60 s
caption:   one joke line + "#prank #ai" or "(website is <App> for those of you asking)"
```
