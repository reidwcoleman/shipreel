# Faceless screen-demo videos for apps: replication recipe

*Shipreel research · 2026-10-16 · format family: the app's screen (raw full-bleed recording, a phone held on camera, a filmed laptop or projector) with native TikTok text on top. Covers "how to do the ___ trend", "I can't believe I only just found this app", "POV/relatable" hooks over a demo, numbered how-to steps, "apps you need", and indie-dev "I built…" demos.*

**Dataset.** 31 videos kept and measured, out of about 60 candidates downloaded and checked by eye.
- 23 are new. They were found by listing ~120 app and creator TikTok accounts with yt-dlp and taking each account's top posts.
- 8 come from the earlier `refs/` pass.
- 19 are **pure faceless** (no face, or only a hidden face or a ≤4 s reaction): 17 TikToks plus 2 raw indie screen recordings posted on X. 12 are **hybrids or borderline** (face plus screen), kept for contrast.

**Files and method.**
- Each video is in `refs/viral2/screendemo/<id>/`: `source.mp4`, `source.info.json`, `meta.json`, `hook3s.jpg` (first 3 s at 10 fps), `overview.jpg` (20 frames) and, where present, TikTok ASR subtitles.
- Cuts come from ffmpeg `select='gt(scene,0.3)',showinfo`, rerun at 0.12 for handheld jump cuts.
- Caption geometry was measured in pixels on frames scaled to **1080×1920**, using a near-white line-band scanner plus gridded frames (±1%).
- Loudness is ffmpeg `ebur128`. Metrics were pulled on 2026-10-16.
- The best sheets are in `research/viral/screendemo-sheets/` (21 files, 4.7 MB). `00-caption-styles-crops.jpg` is the one to open first.

**Read every view count through the like rate.** Organic hits in this set have likes ≥ 1.5% of views (median ~4%). Several of the biggest numbers have likes ≤ 0.25% of views, use TikTok Commercial Music Library tracks, and sometimes have comments switched off. Those are almost certainly **paid Spark Ads**:
- Remini 138.8M at 0.06%, 55M at 0.12%, 36.8M at 0.21%, 24.9M at 0.06% and 14.2M at 0.07%
- Eddie Lou 140M at 0.07% (0 comments)
- ux_deniza 84M at 0.14% (0 comments)
- Rocket Money and Stronger

They still matter: advertisers only keep spending on creatives that convert. So treat **boosted hits as "what converts"** and **organic hits as "what the algorithm pushes"**. Both groups share the same grammar, described below.

---

## 0. The five most important exact details

1. **The result comes first, the hook text is on screen at frame 0, and it holds for about 2.8 s.** Every pure-faceless TikTok has its hook text in the first frame (the two X posts carry their hook in the post text instead), with no fade, title card or logo. The hook shows for **1.9–4.0 s (median 2.8 s)** and is replaced at the first hard cut. For AI or "magic" apps, the background during the hook is the **finished output** (Remini's styled photo, the "before" beach photo, a finished lecture summary). The process comes after it.
2. **No phone mockups, no zoom animations, no tap circles: 0 of 31.** The screen is shown in one of three ways:
   - **(a) raw full-bleed iOS screen recording**, with the status bar and the red recording pill left in (Remini 138.8M/24.9M)
   - **(b) a real phone held in a real hand, filmed by another phone** (phone fills 45–60% of the frame width, thumb tapping, blurred desk, car or kitchen behind it)
   - **(c) a laptop, projector or iPad filmed in the wild**

   Motion comes from the hand-held camera, never from keyframed zooms. The only "zoom" seen is a ~1.1× crop that hides the status bar for 1.5 s (Remini 138.8M at 9.0–10.5 s).
3. **One short caption per step, swapped on the cut.** After the hook, each shot gets one caption of 2–7 words describing the action, in imperative lowercase: "download remini" → "open and select high angle shots" → "choose your photos" → "and it's done in 10 seconds". Each one is on screen for **1.5–4 s** and changes exactly on the hard cut. Average shot length is **1.7–2.5 s** for step demos. Phone-movement whips are the only transitions.
4. **Captions are TikTok's own native text, not CapCut word-pop.** Style A (most common) is **TikTok Sans ~Medium, white, soft dark shadow, no box, 60–75 px font (cap/ascender height 46–54 px), centered, line pitch ≈1.25×, ≤22 characters per line, 1–3 lines**. Its position is not a fixed band: it sits in the empty part of the frame that doesn't cover the key UI. The hook block's centre is at y = **18–40%** in 11 of 15 measured hooks. The in-the-wild single takes (Quizard, AnswersAI) and Remini 138.8M put it at **52–66%**, below the subject. Other styles:
   - **white rounded box with black bold text** for steps and CTAs (Cal AI, StudyFetch's "the app is called studyfetch")
   - **Snapchat translucent bar** (Nomad Table)

   CapCut one-word ALL-CAPS captions appear only in the face-led hybrids (Rocket Money, Yorrick).
5. **Short, music-only, and the end is the result.**
   - **Length:** median length is **17.6 s** (pure faceless: 10–21 s for single-feature demos; 35–55 s only for multi-feature lists).
   - **Audio:** 14 of the 17 pure-faceless TikToks have **no speech at all**: a trending sound or Commercial Music Library track at −10 to −23 LUFS. The other 3 use borrowed meme audio (Quizard's "F students are inventors", StudyFetch's movie-scene audio) or audio from the filmed scene (AnswersAI's professor). **None has a narrated voiceover.**
   - **Ending:** there is **no end card**. It ends on the result, held 2.4–3.0 s full-screen with only the app's own watermark (Remini). Some end on one white-box line, "the app is called ___" or "Download Cal AI right now", over the last 2.5–3.5 s of demo footage.

---

## 1. The sub-formats (pick one per video)

| Id | Sub-format | Look | Best examples | Length / shots |
|---|---|---|---|---|
| **SD1** | **Result-first raw recording**: "how to do the ___ trend" | Output image full-bleed with hook (0–2.9 s) → 1.5 s "download ___" beat (splash screen, home-screen icon or App Store page) → raw full-bleed screen recording with a step caption per screen → output held 2.4–3 s | Remini 138.8M, 24.9M | 11–17 s · 6–8 edit shots, ASL ~2 s |
| **SD2** | **Phone-in-hand step demo** | Same beats as SD1, but the phone is held and filmed over a wooden desk or kitchen counter; the hook frame is often a person's hand holding the phone up to show the result | Remini 55M, 36.8M, 14.2M; StudyFetch 13.4M; Cal AI 260K/294K | 10–20 s · ASL 1.7–2.5 s |
| **SD3** | **Reaction or relatable line → phone demo** | 3–4 s of a meme line ("Bro really got rejected like that 😭", "3 years at the gym and NOW i find this?? 😭"), over the problem screen or a 3–4 s shocked face (can be hidden behind a hand), then a phone-in-hand demo with feature captions | Rizz 1.3M, Stronger 851K, StudyFetch 9.6M | 11–36 s |
| **SD4** | **In-the-wild single take** | One handheld shot in a real place (lecture hall, hostel), one meme caption for the whole video, the screen filmed over someone's shoulder | Quizard 2.1M (11% likes) and 963K; Nomad Table 1.0M; AnswersAI 10.9M | 12–18 s · 1–4 shots |
| **SD5** | **Desk feature list** (iPad or phone, top-down) | Title card "7+ ___ features you probably don't know exist!", then one boxed label per feature, hands and pencil only | Goodnotes 214K (6% likes), Tiimo 361K | 50–56 s · ASL 1–1.6 s |
| **SD6** | **Indie raw recording** (X) | Plain screen capture of the thing working, no captions, odd premise stated in the post text | levelsio 13.5M (90 s single take), Marc Lou 1.1M (18.7 s single take) | 1 shot |
| H | Hybrids (face + screen) | "I built…" founder (Eddie 140M, ux_deniza 84M, Sarah Li 32M), "apps you need" talking head (Yorrick, Sam Beckman, Enrique), CapCut word captions (Rocket Money) | | for contrast only |

For Shipreel, SD1 is fully automatable from a screen recording. SD2 and SD3 need real hand-held footage; see §8.

---

## 2. Beat templates (seconds, measured)

### SD1: result-first raw recording (Remini 138.8M, 16.8 s; 24.9M, 11.5 s)
| t (s) | Beat | What's on screen | Text |
|---|---|---|---|
| 0.0–2.9 | Hook = result | The finished AI output, full-bleed (letterboxed if it isn't 9:16, black bars left in) | "how to do the / high angle shots" (2 lines, white, centre y ≈ 65%) |
| 2.9–4.5 | Name drop | The app's own launch/splash screen ("download remini", Remini logo, "Made with ♥ by Bending Spoons") | "download remini" |
| 4.5–8.1 | Step 1 | Raw screen recording of the home feed, scrolled to the feature | "open and select / high angle shots" |
| 8.1–10.5 | Step 2 | Upload screen (status bar briefly cropped out) | "choose your photos" |
| 10.5–14.3 | Step 3 + time skip | "We are generating…" screen, jump cut to the "Your pack is ready!" modal | "and it's done in 10 seconds" |
| 14.3–16.8 | Payoff | The result again, full-bleed, watermark only | none |

Variant (24.9M, "relatable" hook): **0–2.0** the "before" photo with "when the vacation with your bf doesn't go as planned" (white, black outline, y = 31–43%). **2.0–8.5** the raw recording with no captions at all: the "Custom AI Edit" prompt typed live ("remove the man on the left"), "Analyzing prompt…", then the before/after slider dragged. **8.5–11.5** the "after" photo full-bleed. The joke is the edit itself.

### SD2: phone-in-hand step demo (StudyFetch 13.4M, 19.4 s)
| t | Beat | Text |
|---|---|---|
| 0.0–3.0 | Problem screen: a 1:04:22 YouTube lecture on the held phone, slow handheld push-in | "I don't have 1 hour 💀💀💀" (y = 23–27%) |
| 3.0–5.6 | Share → copy link | "I just copy + paste" |
| 5.6–8.9 | Paste into the app, keyboard visible | "watch this…" |
| 8.9–9.6 | Whip/blur (the phone moves) | none |
| 9.6–13.4 | Generated notes scrolled | "detailed notes in seconds 🤯🤯🤯" (y = 12–14%) |
| 13.4–16.5 | Flashcards / practice test | "it even makes flashcards and practice tests 🙌" |
| 16.5–19.4 | The quiz with the mascot | **white box** "the app is called / studyfetch" (box y = 21.5–31.7%, 57% wide) |

Cal AI 260K (15.4 s, one continuous take, three soft cuts): **0–2** "The FASTEST Calorie Tracker" (white box, black heavy text, box 70% wide, y = 13–25%) over the plate on the counter with the phone entering the frame. **2–4.5** "1) Scan your food". **4.5–9** "2) Get the macros". **9–12.5** "3) Edit if necessary" (box moved to y = 80% to clear the UI). **12.5–15.4** "Download Cal AI right now".

### SD3: reaction → demo (Rizz 1.3M, 35.8 s; Stronger 851K, 11.4 s)
Rizz, filmed in a dark car:
- 0–3.9 the friend's rejected iMessage thread on a phone, "Bro really got rejected like that 😭"
- ~4–6.6 "So I had to put him onto my secret 🤫"
- ~8 the home screen, "This app will change his dating life forever 👀"
- 9.6–11.2 App Store page, "It's called RIZZ"
- 11.2–14 "Just screenshot and upload 😮‍💨"
- ~17 "Instantly get all the rizz you need 🤑"
- ~20 "Copy, paste, and send 😎"
- ~24 "Let's hope this works…"
- ~28 the reply arrives, "Like taking candy from a baby 😮‍💨"
- ~30–35.8 "Bro didn't even hesitate 😭💀"

ASL is 2.0 s. The payoff is the story's outcome, not the UI.

Stronger: 0–4.0 shocked face, "3 years at the gym and NOW i find this?? 😭". Then a phone-in-hand demo in a gym, one feature per caption: "muscle map to become more aesthetic", "scores for hundreds of exercises", "unlock new ranks 💪". The app is **never named in the video**; the post caption says "app is called Stronger!".

### SD4: in-the-wild single take (Quizard 2.1M, 15.8 s, 1 shot)
One handheld walk through a lecture hall: the professor at the whiteboard → a student's laptop (ChatGPT) → another laptop where the extension is answering a quiz. **One caption the whole time**: "college literally isn't real anymore 😭💔" (y = 55–61%). The music is "Lil Phoebe x Melodica". It has 11% likes, the highest in the set. Nomad Table works the same way: a 1.7 s hostel bunk room, then the map → join trip → group chat, under one Snapchat-bar caption, "my hostel roommate just showed me this and all my solo travel anxiety is gone 🤯🤯".

### SD5: desk feature list (Goodnotes 214K, 55.5 s)
- 0–1.8: iPad held up to the camera, "7+ Goodnotes features / you probably don't know exist!" (light-blue + white)
- then one feature per 3–6 s, each a small white rounded box with light-blue text and an emoji, at y ≈ 28%: "Turn handwriting into text ✍️", "Clear page with single click", "Hold to draw perfect shape ⭕", "Circle to Lasso 〰️", "Check handwriting spelling ✅"…

Cuts every 1.0 s (pencil-action jump cuts), music "Sweet Tea". It has 6% likes, but saves drive it.

---

## 3. Pacing numbers

| Metric | Pure-faceless TikToks (n = 17) | Notes |
|---|---|---|
| Total length | 10.0–55.5 s, **median 17.6 s** | Single-feature demos 10–21 s; lists 50–56 s |
| Hook text on screen | 1.9–4.0 s, **median 2.8 s** | Always from frame 0. Single-take formats keep it for the whole video |
| App/UI first visible | 0 s (result-first) to 4.0 s | The output is on screen at 0 s in every Remini post |
| App named | 2.5–2.9 s (Remini, "download remini"), 9.6 s (Rizz), last 3 s (StudyFetch, Cal AI 260K), or never (Stronger, Quizard) | Naming early is fine when the hook is the result |
| Average shot (edit cuts) | **1.7–2.5 s** for step demos; 1–4 shots total for in-the-wild; ~1.0 s for desk lists | Scene threshold 0.12; in-app screen changes inside raw recordings not counted |
| Steps shown | 3–5 | Then the result |
| Captions per video | 4–7 step captions + hook (step demos); 1 (single take) | |
| Words per caption | Hook 5–15 (median 7); steps 2–7 | |
| Result hold at end | 2.4–3.0 s, no text | Remini |
| Loudness | Music beds −9 to −23 LUFS (Rizz −9.7, Stronger −9.3, Tiimo −10.1, Cal AI −12.6/−16.1, Remini −21 to −26); filmed-room audio −29 to −33 (AnswersAI, StudyFetch, Quizard) | Nomad Table's download is silent (music stripped) |

---

## 4. Caption style rules (1080×1920, measured)

See `screendemo-sheets/00-caption-styles-crops.jpg`.

| Id | Style | Font / size | Color / effects | Position | Used for |
|---|---|---|---|---|---|
| **A** | TikTok native, plain | TikTok Sans (TikTok's "Classic"), Medium–Semibold. Ascender-to-baseline 46–54 px, line incl. descender 60–68 px → **font ≈ 60–75 px**. Line pitch 78–103 px (≈1.25–1.35×) | White #FFFFFF, soft dark drop shadow (≈2 px offset, 20–40% black, slight blur), **no stroke, no box** | Centered horizontally (centre x = 49–50%). Lines 35–86% of width. Vertical: hook centre at y = 24% (Remini 55M), 24% (36.8M), 36% (14.2M), 19% (Rizz), 25% (StudyFetch 13.4M), 23% (Stronger), 30% (Cal AI 294K), **65%** (Remini 138.8M, below the faces) | Hook + step captions in most hits |
| **B** | TikTok native with outline | Same font, ~68 px | White fill, **~3–4 px black stroke** | y = 31–43% (3 lines) | Relatable/meme hooks (Remini 24.9M "when the vacation…"), TikTok auto-captions (AnswersAI, smaller ~40–45 px at y ≈ 70%) |
| **C** | White box | TikTok Classic **Bold/Heavy**, 60–75 px, black text | White rounded rectangle (radius ≈ 20–28 px, padding ≈ 24 px horizontal, 12 px vertical), no shadow | Cal AI hook box y = 13–25%, 70% wide; steps 80%; StudyFetch CTA y = 21.5–31.7%, 57% wide | Numbered steps, CTAs ("the app is called ___", "Download ___ right now") |
| **C2** | Colored pill title | Rounded condensed bold, orange #F28A1E on cream pill | | y = 42–55% | Tiimo "SUPER TIP FOR STUDENTS!" (an older 2022 look) |
| **D** | Snapchat bar | ~38 px regular | White text on a full-width black bar at ~45% opacity | y = 36.6–41.7% | Nomad Table, for a "my friend sent me this" feel |
| **E** | CapCut 1-word pop | Heavy condensed ALL CAPS, ~90 px | White, thick black stroke/shadow | y ≈ 77% | **Only in face-led hybrids** (Rocket Money, Yorrick) |

Text rules:
- **Case.** Lowercase for "how to" and relatable hooks (Remini). Sentence case with 1–3 trailing emoji for reaction hooks (😭 💀 🤯 🙌 👀 🤫). ALL CAPS only for one shouty reaction line (StudyFetch "I SPENT 4 YEARS IN COLLEGE 💀 …").
- **Line length.** ≤ 22 characters per line, 1–3 lines, centered, ragged.
- **Punctuation.** None at the end, or "…" / "!" / "??". Typos and missing apostrophes are fine ("its ready", "Ratw his glow up").
- **Static, not animated.** Captions cut on and off with the shot. No typewriter, no pop-in scale, no word-by-word highlight.
- **Placement.** Never under the bottom 20% (TikTok UI) or the top 8%. Move the caption per shot so it sits on dead space, not on the UI being demonstrated (Cal AI moves step 3 to y = 80%; Remini moves between 51% and 68%).

---

## 5. Visual treatment

- **Full-bleed raw recording (SD1).**
  - It's the iPhone recording at native 9:16, edge to edge.
  - Status bar, clock, battery and the **red Dynamic Island recording pill are left visible**.
  - No device frame, background, rounded corners, shadow, cursor or tap ripples.
  - Non-9:16 output images are letterboxed on black (Remini's result photos sit with ~9% black above and below).
  - The time compression is a plain jump cut over the loading screen.
- **Phone-in-hand (SD2/SD3).** A second phone films the demo phone.
  - **Phone size:** 45–60% of frame width, top edge at y = 12–25%, bottom at 80–95%, tilted 0–15°.
  - **Hands:** the thumb does the tapping; the other hand sometimes holds it.
  - **Background:** a real background at shallow depth: wood desk (StudyFetch, Remini), granite counter (Cal AI), car at night (Rizz), gym (Stronger).
  - **Capture artifacts:** glare, moiré, autofocus hunting and 0.2–0.7 s whip blurs between steps are kept.
  - **Charger:** a charging cable is often in shot (StudyFetch).
- **In-the-wild (SD4):** a handheld walk, an over-the-shoulder angle, people's backs and heads in frame (never their faces), and a projector or laptop as the "screen".
- **Hook frame:** the output, the problem screen, or a person holding a plate/phone **with the head cropped out** (Cal AI 294K: the frame cuts at the chin).
- **What is absent across all 31:** 3D or flat phone mockups, gradient backgrounds, animated zoom-ins on buttons, cursor highlights, logo stings, end cards, "link in bio" graphics, brand colors in captions.

---

## 6. Sound

- **Pure faceless:** a trending sound or Commercial Music Library track with no voiceover. Remini uses CML titles: "Chill Vibes", "Strawberry", "Ghibli-style nostalgic waltz", "Spooky, quiet, scary atmosphere piano songs", "Wrong Number". Others: Rizz "Trap Mafia", Goodnotes "Sweet Tea", Quizard "Lil Phoebe x Melodica", Tiimo "august". The music is set as a background bed (Remini integrated −21 to −26 LUFS), not slammed.
- **When there's speech, it's borrowed:** a meme monologue (Quizard 963K: "If you're a young boy and you're an F student… you got a bright future"), a movie-scene audio (StudyFetch 13.4M: "Look at this… What a birthday!"), or the room (AnswersAI's professor explaining the tool, with TikTok auto-captions).
- **Spoken VO** belongs to the hybrids and how-tos (Hustle with Gianni 2M, Enrique, Sam Beckman, Knowunity, Yorrick). Those are face-led and run 35–86 s.

---

## 7. Hook bank (verbatim, with views)

**Result-first "how to" (SD1/SD2):**
- "how to do the high angle shots" (Remini, 138.8M, boosted)
- "how to make photobooth images with remini" (Remini, 55M, boosted)
- "how to do the elevator photo trend" (Remini, 36.8M, boosted)
- "how to do the ai winter collage trend" (Remini, 14.2M, boosted)
- "The FASTEST Calorie Tracker" (Cal AI, 260K)
- "7+ Goodnotes features you probably don't know exist!" (Goodnotes, 214K)

**Problem / time-pain:**
- "I don't have 1 hour 💀💀💀" (StudyFetch, 13.4M)
- "Are you in a hurry & don't have time to track your calories?" (Cal AI, 294K)
- "SUPER TIP FOR STUDENTS! If you're a student, this video is for you." (Tiimo, 361K)

**Discovery / "only just found this":**
- "I SPENT 4 YEARS IN COLLEGE 💀 AND I ONLY JUST FOUND THIS APP 😭😭😭" (StudyFetch, 9.6M)
- "3 years at the gym and NOW i find this?? 😭" (Stronger, 851K)
- "my hostel roommate just showed me this and all my solo travel anxiety is gone 🤯🤯" (Nomad Table, 1.0M)
- "our prof showed us how to watch a 1 hour lecture in 2 minutes 😭" (AnswersAI, 10.9M)

**Relatable / meme over the demo:**
- "when the vacation with your bf doesn't go as planned" (Remini, 24.9M)
- "Bro really got rejected like that 😭" (Rizz, 1.3M)
- "college literally isn't real anymore 😭💔" (Quizard, 2.1M, 11% likes)
- "\"the F students are inventors 🧑‍🔬😭\"" (Quizard, 963K)
- "he's living in 3025 🤯" (StudyFetch, 8.3M)

**Hybrids / indie "I built" (spoken or texted):**
- "i built my own unpaid intern" (Eddie Lou, 140M, boosted)
- "mini future-me ON MY DESK" (ux_deniza, 84M, boosted)
- "this year instead of New Year's resolutions I sent my 2026 wishes to space" → "I made this / with Replit" (Sarah Li, 32.2M)
- "$1.8k in 5 minutes using Claude 😭" / "Quit your job. Do this instead." (Hustle with Gianni, 2.0M)
- "Free apps you need on your phone part 1" (Yorrick, 110K)
- "50 aplicaciones que necesitas en tu iPhone · Parte 1" (Enrique Barrón, 1.1M)
- "Guys, you have to check out this app" (Sam Beckman, 290K)

**Step-caption bank:**
- "download remini", "search remini on appstore", "download and open"
- "open and select ___", "click ___", "choose your photos", "add your photos", "upload your pics", "click continue"
- "and it's done in 10 seconds!", "its ready", "done!"
- "I just copy + paste", "I just take a photo of my notes 📲", "watch this…" / "watch this 👀"
- "detailed notes in seconds 🤯🤯🤯", "instant practice quiz 🤓", "it even makes flashcards 🙌"
- "the app is called ___", "It's called RIZZ"
- "Just screenshot and upload 😮‍💨", "Copy, paste, and send 😎", "Let's hope this works…"
- "1) Scan your food" / "2) Get the macros" / "3) Edit if necessary" / "Download Cal AI right now"

Hook formulas that recur:
- `how to do the {trend/output}` over the output
- `I don't have {time unit} 💀💀💀` over the problem
- `{N} years {doing X} and NOW i find this?? 😭`
- `my {person} just showed me this and {pain} is gone 🤯`
- `when {relatable situation}` over the "before"
- `{group} literally isn't real anymore 😭💔` filmed in the place
- `Bro really {failure} like that 😭` → "So I had to put him onto my secret 🤫"

---

## 8. What makes them feel native, and how to build them in Shipreel

**Honest read: the hits are deliberately low-production.** None of them looks designed:
- the iOS recording pill stays in
- the result photos are letterboxed
- the captions are TikTok's own text tool at default style, with typos
- a phone camera films a phone, with glare
- one handheld take in a lecture hall
- no logo or end card

The "editing" is choosing the hook frame, trimming waits, and typing 4–7 captions. Even the most-boosted ads (Remini, 5 videos with 14–139M views) are made this way. A paid ad still has to look like a post.

**Do:**
- Open on the output or the pain, with text from frame 0, held 2–3 s.
- Use TikTok-native text: TikTok Sans Medium, white, soft shadow, 60–75 px, lowercase, ≤22 characters per line, placed in dead space and moved per shot.
- Use 3–5 steps, one short imperative caption each, hard cuts, 1.7–2.5 s shots. Jump-cut every loading wait and say so ("and it's done in 10 seconds").
- End on the result, full-bleed, 2.4–3 s, with no text (or one white-box "the app is called ___").
- Keep it 10–20 s.
- Use a trending/CML music bed and no TTS voiceover.
- Name the app the way a user would: "download remini", "It's called RIZZ", or in the caption.
- Keep the raw recording raw: status bar, real data and real waits.

**Don't:**
- phone mockups, floating devices, gradient backdrops, 3D tilts
- animated Ken-Burns zooms on UI, tap ripples/cursors
- brand-colored captions, word-by-word karaoke captions on a faceless demo
- logo intros/outros, "Download now" end cards, App Store badges
- TTS narration over a silent recording
- explaining features before showing the result
- videos over 25 s for one feature

**Shipreel implementation spec (SD1, fully automatable):**
```
canvas 1080x1920 @30fps, 10–20 s
beat0  hook      0.0–2.8s  source: app output image/clip (full-bleed; letterbox on #000 if not 9:16)
                           text: hook (A), centre y in [0.20,0.40] or below subject, auto-placed on low-detail region
beat1  name      2.8–4.3s  source: app splash / home-screen icon / App Store page (raw)   text: "download {app}"
beat2..n steps   1.7–3.5s each, 3–5 steps, raw screen-recording segments, loading spans jump-cut
                           text: one imperative 2–7 word caption per step (A), moved per step to avoid tapped UI
beatN  payoff    2.4–3.0s  source: output full-bleed, no text (or C: "the app is called {app}")
caption A: TikTok Sans 500, 64px, #FFF, shadow 0 2px 6px rgba(0,0,0,.35), line-height 1.28, max 22 chars/line, center
caption C: TikTok Sans 700, 64px, #000 on #FFF rounded rect r=24, pad 24x12
cuts: hard only; optional 0.2s motion-blur whip between steps (simulates the phone moving)
no: mockup, zoom keyframes, tap indicators, end card, voiceover
audio: one music bed, integrated −14 to −20 LUFS, no ducking needed
```
For SD2/SD3, which are stronger organically: let the user record **5–10 reusable "hand-holding-phone" clips** (phone with a green or black screen on a desk, in a car, in a kitchen), then key the screen recording into them with corner pinning, keeping glare and motion. That matches what the 13.4M and 1.3M posts look like. A rendered mockup will not.

---

## 9. Every example

P = pure faceless, H = hybrid. Like% = likes/views. ⚑ = likely paid (≤0.25% likes at ≥1M views, CML track or comments off).

| # | Video | Account | Views | Likes (%) | Date | Len | Type | Hook (verbatim) | Structure notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | [link](https://www.tiktok.com/@remini/video/7567443872322800927) | @remini | 138.8M | 83.7K (0.06%) ⚑ | 2025-10-31 | 16.8 | P·SD1 | "how to do the high angle shots" | Result 0–2.9 → splash "download remini" 2.9–4.5 → raw recording, 3 steps → result 14.3–16.8. CML "Chill Vibes". Hook y 62–69% |
| 2 | [link](https://www.tiktok.com/@remini/video/7551861967200210207) | @remini | 55.0M | 63.4K (0.12%) ⚑ | 2025-09-19 | 18.4 | P·SD2 | "how to make photobooth images with remini" | Phone held up to camera showing the result 0–2.6 → phone in hand on a wood desk: "download remini / click photobooth photos / add your photos / click continue / its ready" → result 15.4–18.4 |
| 3 | [link](https://www.tiktok.com/@remini/video/7558478313157676319) | @remini | 36.8M | 76.4K (0.21%) ⚑ | 2025-10-07 | 19.8 | P·SD2 | "how to do the elevator photo trend" | Result 0–2.5 → home-screen icon "download remini" → 3 steps → "and its done in 10 seconds!" → result in the phone |
| 4 | [link](https://www.tiktok.com/@remini/video/7540282580520668447) | @remini | 24.9M | 14.5K (0.06%) ⚑ | 2025-08-19 | 11.5 | P·SD1 | "when the vacation with your bf doesn't go as planned" | Before photo 0–2.0 → raw recording with no captions: prompt typed, before/after slider → after photo 8.5–11.5. Outline text |
| 5 | [link](https://www.tiktok.com/@remini/video/7571142724036873503) | @remini | 14.2M | 10.2K (0.07%) ⚑ | 2025-11-10 | 15.3 | P·SD2 | "how to do the ai winter collage trend" | 3-shot collage hook 0–2.8 → "search remini on appstore / download and open / select dream winter collage / upload your pics / done!" ASL 1.1 s |
| 6 | [link](https://www.tiktok.com/@studyfetch/video/7500726429689204010) | @studyfetch | 13.4M | 225.1K (1.68%) | 2025-05-04 | 19.4 | P·SD2 | "I don't have 1 hour 💀💀💀" | YouTube lecture on the phone → copy/paste → notes → flashcards → white box "the app is called studyfetch". Movie-clip audio |
| 7 | [link](https://www.tiktok.com/@studyfetch/video/7498834821666311467) | @studyfetch | 9.6M | 137.3K (1.43%) | 2025-04-29 | 21.0 | P·SD3 | "I SPENT 4 YEARS IN COLLEGE 💀 AND I ONLY JUST FOUND THIS APP 😭😭😭" | Face hidden behind a hand 0–3.2 → "watch this 👀" → photo of notes → quiz → flashcards → white box "the app is called study fetch" |
| 8 | [link](https://www.tiktok.com/@answersai.com/video/7608667020485201166) | @answersai.com | 10.9M | 374.2K (3.43%) | 2026-02-19 | 38.6 | P·SD4 | "our prof showed us how to watch a 1 hour lecture in 2 minutes 😭" | Lecture hall; tool demoed on the projector by the "prof"; room audio with TikTok auto-captions (B, y ≈ 70%) |
| 9 | [link](https://www.tiktok.com/@quizard.ai/video/7540409269011729695) | @quizard.ai | 2.1M | 230.5K (10.98%) | 2025-08-19 | 15.8 | P·SD4 | "college literally isn't real anymore 😭💔" | One handheld shot: professor → ChatGPT laptop → laptop where Quizard answers a quiz. One caption the whole time |
| 10 | [link](https://www.tiktok.com/@quizard.ai/video/7502540387144289567) | @quizard.ai | 963K | 38.4K (3.99%) | 2025-05-09 | 12.6 | P·SD4 | "\"the F students are inventors 🧑‍🔬😭\"" | Classroom, the back of a student's head, laptop auto-answering; meme monologue audio |
| 11 | [link](https://www.tiktok.com/@rizz.app/video/7262832400839789866) | @rizz.app | 1.3M | 25.5K (1.96%) | 2023-08-02 | 35.8 | P·SD3 | "Bro really got rejected like that 😭" | In a car at night; story arc rejected → app → reply lands; 10 captions; "It's called RIZZ" at 9.6 s; "Trap Mafia" |
| 12 | [link](https://www.tiktok.com/@nomadtable/video/7505063333310008607) | @nomadtable | 1.0M | 9.7K (0.97%) | 2025-05-16 | 17.6 | P·SD4 | "my hostel roommate just showed me this and all my solo travel anxiety is gone 🤯🤯" | 1.7 s hostel bunk → phone-in-hand map → join trip → group chat; Snapchat bar the whole time |
| 13 | [link](https://www.tiktok.com/@strongerapp/video/7608498509083446541) | @strongerapp | 851K | 1.9K (0.23%) ⚑ | 2026-02-19 | 11.4 | P·SD3 | "3 years at the gym and NOW i find this?? 😭" | Shocked face 0–4.0 → gym phone-in-hand, 3 feature captions; app never named in the video |
| 14 | [link](https://www.tiktok.com/@calai.app/video/7482403221856587054) | @calai.app | 294K | 1.9K (0.65%) | 2025-03-16 | 10.0 | P·SD2 | "Are you in a hurry & don't have time to track your calories?" | Plate held at chest, head cropped 0–2.5 → snap → "Cal AI will calculate the calories & macros for you!" → "Fast, Simple, Accurate" |
| 15 | [link](https://www.tiktok.com/@calai.app/video/7475920092623047979) | @calai.app | 260K | 4.8K (1.84%) | 2025-02-27 | 15.4 | P·SD2 | "The FASTEST Calorie Tracker" | One take on a counter; white-box numbered steps 1) 2) 3) → "Download Cal AI right now" |
| 16 | [link](https://www.tiktok.com/@goodnotes/video/7673019476446596369) | @goodnotes | 214.5K | 12.9K (6.01%) | 2026-08-12 | 55.5 | P·SD5 | "7+ Goodnotes features you probably don't know exist!" | iPad + pencil top-down, 8 boxed feature labels, ASL 1.0 s, "Sweet Tea" |
| 17 | [link](https://www.tiktok.com/@tiimoapp/video/7137757240777346310) | @tiimoapp | 361K | 2.0K (0.55%) | 2022-08-30 | 50.0 | P·SD5 | "SUPER TIP FOR STUDENTS! If you're a student, this video is for you." | iPad on a stationery desk, hands only; read-along white-box sentences; ends "Download Tiimo and check it out today." |
| 18 | [link](https://www.tiktok.com/@studyfetch/video/7498834181263379758) | @studyfetch | 8.3M | 105.5K (1.27%) | 2025-04-29 | 29.8 | H→P | "he's living in 3025 🤯" | 3 s of a student's profile, then a filmed laptop: paste lecture URL → notes; caption fixed at y ≈ 63% |
| 19 | [link](https://x.com/levelsio/status/1894429987006288259) | @levelsio (X) | 13.5M | 15.3K (0.11%, X impressions) | 2025-02-25 | 90.0 | P·SD6 | post: "IT WORKS!!!!! A FULL multiplayer…" | 1 raw screen capture of a browser game, no captions |
| 20 | [link](https://x.com/marclou/status/2023739768807584186) | Marc Lou (X) | 1.1M | 5.1K (0.46%) | 2026-02-17 | 18.7 | P·SD6 | post: "I made an app to turn web analytics into a Severance episode." | 1 raw capture of the odd-premise UI |
| 21 | [link](https://www.tiktok.com/@eddie_the_lou/video/7675780318602841358) | @eddie_the_lou | 140.2M | 104.6K (0.07%) ⚑ | 2026-08-19 | 38.1 | H | "i built my own unpaid intern" | Founder VO, desk b-roll + screen inserts, comments off, ASL 0.8–1.5 s |
| 22 | [link](https://www.tiktok.com/@ux_deniza/video/7638476458284829960) | @ux_deniza | 84.4M | 114.5K (0.14%) ⚑ | 2026-05-11 | 36.0 | H | "mini future-me ON MY DESK" | Built-with-Cursor widget; face + screen; bold caps captions; comments off |
| 23 | [link](https://www.tiktok.com/@sarahli.mp3/video/7599704724820036882) | @sarahli.mp3 | 32.2M | 167.2K (0.52%) | 2026-01-26 | 27.7 | H | "this year instead of New Year's resolutions I sent my 2026 wishes to space" | Replit-built app; VO; black-box chunk captions; phone in hand + face; URL shown in a box at the end |
| 24 | [link](https://www.tiktok.com/@hustlewithgianni/video/7623171286365179166) | @hustlewithgianni | 2.0M | 105.5K (5.28%) | 2026-03-30 | 56.3 | H | "$1.8k in 5 minutes using Claude 😭" | 75% filmed laptop screen with VO and small auto-captions; face only at start and end |
| 25 | [link](https://www.tiktok.com/@soyenriquebarron/video/7600508866534755592) | @soyenriquebarron | 1.1M | 76.9K (6.99%) | 2026-01-28 | 43.2 | H | "50 aplicaciones que necesitas en tu iPhone · Parte 1" | "Apps you need" series; mostly phone in hand with Spanish VO; small captions |
| 26 | [link](https://www.tiktok.com/@umax.app/video/7326971975946063146) | @umax.app | 1.2M | 48.2K (4.02%) | 2024-01-22 | 17.3 | H | "My bro needed to glow up…" (post: "Ratw his glow up out of 10") | Face → Umax score screens (Overall/Potential) → after |
| 27 | [link](https://www.tiktok.com/@rocketmoney/video/7290586354470243627) | @rocketmoney | 1.1M | 1.9K (0.18%) ⚑ | 2023-10-16 | 24.0 | H | spoken skit; CapCut word captions "BOYFRIEND… PRIME…" | Skit + full-bleed app screen inserts; app logo end screen |
| 28 | [link](https://www.tiktok.com/@rocketmoney/video/7269837937678814506) | @rocketmoney | 600K | 861 (0.14%) ⚑ | 2023-08-21 | 32.2 | H | (same series) | same |
| 29 | [link](https://www.tiktok.com/@sam_beckman/video/7690163755241737524) | @sam_beckman | 290K | 17.7K (6.10%) | 2026-09-27 | 35.4 | H | "Guys, you have to check out this app." | Hidden Android Gems #16; face + floating phone shots; "comment ORION" CTA |
| 30 | [link](https://www.tiktok.com/@knowunity/video/7641665772187618592) | @knowunity | 127K | 1.9K (1.53%) | 2026-05-19 | 86.4 | H | "how I use knowunity to study for my exams📚" | Face bookends, middle 75% is a filmed laptop with VO and auto-captions |
| 31 | [link](https://www.tiktok.com/@yorrriiick/video/7596751886204620065) | @yorrriiick | 110K | 3.0K (2.70%) | 2026-01-18 | 21.8 | H | "Free apps you need on your phone part 1" | Face + phone in hand; CapCut 1-word captions (green "FREE APPS") |

**Checked and rejected** (not this format; downloaded, looked at, then deleted from `refs/viral2/screendemo/`):
- Photomath 9.5M / 3.8M: SpongeBob meme and a logo puppet
- Umax 927K / 655K / 539K / 396K: talking head, green screen, barber b-roll
- Structured 550K: a dancing green-screen person over a WWDC clip
- Solvely 1.8M: a skit
- Mindgrasp 123K: an edited meme montage
- Perplexity 488K / 281K / 187K: podcast clip and street interviews
- Finch 529K / 459K: face skits
- Tiimo 808K: GRWM talking head
- Monarch (allisunday), Rocket Money (financewithfeven), momisavibe, thegratitudeshift, mommacolleen, chris.tech.latte, byarnieverma: face-led how-tos
- Arc 106K: an MKBHD clip
- jad.cinematics: landscape
- Cal AI 241K: a talking head
- doof 750K: food photos, no UI
- Opal 954K: moodboard
- jackfriks (X): a slideshow
- Air Math (YouTube, 10.3M): a landscape ad

The earlier slideshow refs (Grind AI, Visualize AI, Lense, Scratch, Macaron, Opal 1.0M) are photo-mode posts and belong to the slideshow family.

**Sheets index (`screendemo-sheets/`):**
- `00` caption-style crops
- `01–07` overviews and 10 fps hooks of the key posts
- `08–14` gridded measurement frames (red ticks every 10%, orange every 5%)
- `15a/15b` strips of all 17 pure-faceless TikToks
- `16` hybrids strip
- `17` 10 fps hook sheets for Remini 24.9M, StudyFetch 13.4M and Rizz
