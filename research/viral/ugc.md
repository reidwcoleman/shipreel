# UGC creator formats for apps: replication recipe

*Shipreel research · 2026-10-16 · format family: talking head, green screen, reaction/duet/stitch, comment reply, POV skits, day-in-my-life / GRWM integrations, founder-led, human + AI character.*

**Dataset.** 44 new TikToks downloaded with yt-dlp to `refs/viral2/ugc/<id>/` (42 videos, 2 slideshows), plus 20 earlier refs re-measured (`refs/viral2/ugc/_existing/`). Each has a hook sheet (first 3 s at 10 fps), a 16-frame overview, ffmpeg scene cuts (threshold 0.30, and 0.12 for jump cuts), TikTok ASR transcripts where present, and `analysis.json`. Positions come from gridded full-resolution frames (±1–2%); text heights were measured in pixels. Everything is normalized to **1080×1920**. Metrics are as of 2026-10-16. Spanish and Vietnamese transcripts are TikTok's auto-translations. The best sheets are in `research/viral/ugc-sheets/` (49 files, 5.4 MB).

**Read metrics through one filter: the like rate.** Organic viral posts in this set have likes ≥ 2% of views (median 6–9%). Posts with likes ≤ 0.5% of views at millions of views were almost certainly pushed as paid Spark Ads: Eddie Lou 140M at 0.08%, ux_deniza 84M at 0.14%, MyFitnessPal 41.5M at 0.09%, Jake Abrams 26M at 0.2%, ux_deniza 33.7M at 0.5% ("sponsored by Cursor"), Chris Raroque 3.7M at 0.07%, Stronger 2.7M at 0.15%. Both groups matter:
- **Organic winners** (n = 25) show what the algorithm pushes. Median length 38.6 s, median shot 6.3 s, 2.9 spoken words/s.
- **Boosted winners** (n = 20) show what advertisers keep paying to run, which is a proxy for what converts. Median length 40.6 s, median shot 4.1 s, 3.75 words/s. They are cut faster and talk faster.

---

## 0. The five most important exact details

1. **The hook is on screen at frame 0 and the app is on screen by 4–5 s.** Every example with a text hook shows it in the very first frame (no fade-in, no intro). Rants and vlogs without text start talking within 0.2 s. In the short formats the app's "golden moment" lands at **4.6–5.0 s**: Stronger 4.6 s, Cal AI plate 4.7 s, Nomad Table 4.7 s, AnswersAI ~5 s. Vlog formats allow up to 10–15 s (Cal AI's creator brief: "within 15 s"). The app's name comes last: in the final 15–20% of the runtime, the caption, or a pinned comment.
2. **Two text layers, two fixed bands.** The **hook/title** uses TikTok's native "Classic" look: TikTok Sans 500–600, **64–72 px**, white with a 2–3 px dark outline, 1–3 lines, ~20 characters per line, block centered at **y = 19–30%** (top edge ≥ 270 px). **Spoken captions** are a separate layer: **44–55 px** semibold, white with a 2–3 px black outline, sentence case, 3–7 words per chunk, centered at **y = 73–78%** (bottom ≤ 1,545 px). Nobody uses giant centered captions in this family. The one exception is the single-word chest caption (Cal AI founder: 66 px, 6 px stroke, y = 60.6%).
3. **Green screen geometry.** The background (a raw App Store page, app screenshot, comment, or AI result) is scaled to **cover the full 1080×1920**, status bar and all. The person cutout is **anchored to the bottom edge**, head top at **y = 34–45%**, face **490–600 px wide (45–55%)**, centered at x = 40–55%. There's no border or shadow, and the person is allowed to cover the UI. Variant: a **facecam box over a full-frame screen recording**, about **232×330 px at x = 4.5–26%, y = 39–56%** (EPIK filter tutorial, 2.4M).
4. **Faceless versions are real and proven, but only as POV hands, not AI people.** Hands-only or body-only POV posts hit 5.2M (AnswersAI, filming a laptop in a lecture hall), 1.3M (Rizz, phone in a car), 1.1M (Cal AI what-I-eat with the face shown for 0.7 s), 627K/1.0M (Nomad Table, "the hostel volunteer just showed me this"), 670K (Sam Beckman, top-down hands), 294K (Cal AI, plate held at chest with the head cropped out) and 214K (Goodnotes, iPad + pencil, 3.4% saves). A realistic AI presenter got **14.2K views and 4 likes** (faceaiamerica); an AI influencer account sits at a **258-view median**. *Openly fictional* AI characters work: a cartoon cat at 1.3M and 11.6% likes, a human arguing with an AI tutor at 2.5M and 3.1M.
5. **Phone-in-hand is the standard way to show the app, not a mockup frame.** The phone fills **50–58% of the width** (top edge at y = 12–20%, bottom at 85–92%), held at a 0–8° tilt with the thumb visible and tapping, against a real, softly blurred room (gym, car, kitchen, classroom). It's a phone camera filming a phone screen, with glare and moiré. When the creator is talking, the alternative is a **floating screenshot card** at 55% width (x = 22.5–77.5%, y = 16.5–83.5%, ~24 px radius, no shadow) over the b-roll (MyFitnessPal 2.7M), or a hard cut to a full-frame screen recording.

---

## 1. Shared production spec (all sub-formats)

### 1.1 Canvas, pacing, sound

| Item | Spec (measured) |
|---|---|
| Canvas | 1080×1920, 30 fps (a few are 60). Everything except the Cleo testimonials (landscape, 0.07% likes, i.e. paid) is native 9:16 phone footage. |
| Length | Short hook→demo formats 9–21 s (Umax 9 s, Stronger 11 s, Cal AI 10 s, Nomad 17–21 s, AnswersAI POV 18 s). Talking heads / founder 36–70 s. Vlogs 69–141 s. |
| Shot length | Organic median 6.3 s; boosted 4.1 s. Talking heads keep the face shot 4–10 s between inserts. Jump cuts are rare: Zach's 52-s rant and Verso's 55-s skit have **0 cuts**. Fast montage (shots ≤ 1.3 s) only appears in vlog/b-roll formats (Dafnne 1.3 s, Sasha 1.0 s, Eddie 1.3–1.5 s). |
| Speech rate | 2.9–4.8 words/s; boosted/ad scripts sit at 3.4–4.8 (Chris 4.1–4.5, EPIK 4.8). Rants and confessions are slower (Zach 2.9, Cleo 2.6). |
| Audio | Talking heads: raw phone audio, **no music or a barely audible bed**, unmastered (−18 to −32 LUFS integrated: Zach −17.9, Cal AI founder −19.4, Knowunity −29.4, AnswersAI −31.8). Music-led faceless demos are loud (−9 to −10 LUFS: Stronger −9.3, Rizz −9.7, ux_deniza −9.9). For TTS/VO export, aim for −14 LUFS, and keep raw-mic formats quieter and uncompressed; over-polished audio reads as an ad. |
| Music | Faceless demos use a trending or "type beat" track (Rizz "Trap Mafia", Enrique "Ariana Grande / Doja Cat type beat", Goodnotes "Sweet Tea", MyFitnessPal "Wes Anderson-esque Cute Acoustic"). Skits use original sound (AnswersAI used Gymnopédie No. 1 under dialogue). |
| Camera | Handheld phone everywhere except founder sit-downs (tripod). There are no gimbal moves and no color grading; the AnswersAI hook whips from one desk to the next at 1.0 s. |

### 1.2 Text styles (1080×1920 px)

| Id | Look | Size / position | Seen in |
|---|---|---|---|
| **S1 Native hook title** | TikTok Sans Medium–Semibold, white, 2–3 px outline rgba(0,0,0,.85) + soft 0 2 4 shadow, centered, lowercase or sentence case, 0–2 emoji | 64–72 px; pitch 72–88 px; max width 760–810 px; block center y 19–30% (lines measured at 18.7/22.8/27.7% and 26.2/29.8/33.8%) | Stronger, Cal AI plate, Rizz, Umax "Y'all kept asking…" (bolder, 85 px, y = 79%), Verso, Cluely |
| **S1b Big hook** | same, larger | 96–100 px, pitch 117 px, y 21–34% | Eddie Lou "telling my parents im dropping out of harvard (pt. 2)" |
| **S2 Native text box** | TikTok's "background" text: white box + black text (Cal AI founder) or black box + white text (Adam Lyttle, Jake Abrams) | Box radius 22–28 px, padding ~24/14 px; text 64–90 px; Cal AI box x 12–88%, y 19–33%; Adam box y 29.5–35%; Jake's persistent 2-line title box y 5–12% + 22 px subtitle line ("From founder of ~30 person creative agency") | Cal AI founder, Jake Abrams 26M, Adam Lyttle 625K |
| **S3 Translucent band** | Full-width rect rgba(0,0,0,.45–.55), white regular text | 40–46 px, pitch 58 px, 2 lines, center y 37–40%, stays on screen for the whole video | Nomad Table (both 1.0M and 627K), Learn with Dat |
| **S4 Spoken captions** (TikTok/CapCut auto-caption) | TikTok Sans / Proxima Semibold, white, 2–3 px black outline, sentence case | 44–55 px (asc+desc 37–51 px), pitch 44–69 px, 1–2 lines, 3–7 words, width ≤ 790 px, center y 72.5–78% | Jack Price, Chris Raroque, Knowunity, AnswersAI, Eddie, Rizz |
| **S5 Single word** | Bold 800 geometric sans, white, **6 px black stroke** | ~66 px em, one word on screen at a time (~0.3 s each), center y 60.6% (on the chest) | Cal AI founder video |
| **S6 Karaoke caps** | ExtraBold Italic (Montserrat-like) caps, white; active word on a **red rounded rectangle** (#D61F2C-ish, radius ~6) | Cap height 29 px (~40 px em), 2 lines, y 76–79% (Jake: y ≈ 81%) | Verso Jobs 2.9M/9.6M, Jake Abrams |
| **S7 Comment-reply sticker** | TikTok's native bubble: white, radius ~20 px, tail at bottom-left; 60 px avatar circle; grey "Reply to …'s comment" header 26 px; bold black body 44 px, 1–2 lines | x 2–45%, y 8.5–17.5% (inside a green screen: x 9–60%, y 12–24%) | Umax 655K/927K, Cal AI replies, Enrique 5.9M |
| **S8 Pill label** | White-ish box at 85% opacity, light-blue text + emoji | ~44 px, y ≈ 24%, a new label per feature | Goodnotes 214K |
| **S9 Aesthetic VO caps** | Small spaced caps (Lexend/Gilroy-like), cream or white, subtle shadow; hook in a stylized display face with a purple outline | 34–38 px caps, 2–4 words, y 82–86% | ux_deniza 33.7M / 84M |

Safe zone (all examples): nothing important above y = 7% except reply stickers, nothing below y = 86%, and nothing in the right 12% between y = 45–85% (the like/comment/share rail). Hook titles never touch the top 13%.

---

## 2. Sub-format templates

Each template gives: evidence → layout → beat sheet → script formula → faceless verdict.

### T1. Reaction hook → phone demo ("someone made X but for Y??")
**Evidence.** Stronger 2.7M (boosted) and its sibling post 851K; Nomad Table 1.0M / 627K / 322K (organic, 1.4% saves); Cal AI plate 294K. Flamme measured 0.3–0.5% installs per view for reaction clips.

**Layout.**
- **Hook shot, 0–4.0 s.** An extreme selfie close-up (face ~70% of the width, eyes at y ≈ 37%, mouth ≈ 51%) with a shocked or "are you kidding" face and lips moving silently or mouthing. S1 title in 3 lines at y 18–28%.
- **Demo shot, 4.0 s to end.** Phone-in-hand in the real place (gym, hostel, kitchen). S1 feature line at y 15–21%, swapped every 1.5–2.5 s. No voice; a trending sound.

**Beat sheet (Stronger, 11.35 s).**

| Time | Beat |
|---|---|
| 0.0 | Face + "someone made strava but for the gym??" |
| 4.0 | Cut to phone: "muscle map to become more aesthetic" |
| 6.7 | "scores for hundreds of exercises" |
| 8.9–11.3 | "unlock new ranks 💪" |

Caption: "erm who was gonna tell me? 3 years wasted 😭". The app is named only in the caption and the account name.

**Script formula.** `[someone made | my roommate just showed me | the hostel volunteer just showed me] [familiar app] but for [niche]?? / [this] and all my [problem] is GONE 🤯🤯` → 3 feature lines of ≤ 6 words each (benefit, not UI) → loop end (no outro; the last screen holds so the replay feels seamless).

**Faceless verdict: YES (two proven substitutes).** (a) Nomad: the hook shot is a scene with a person far away (no readable face) plus the S3 band caption kept on screen the whole time, then the phone. (b) Cal AI: the torso holds a plate at chest height, head out of frame, S1 question "Are you in a hurry & don't have time to track your calories?", then phone-in-hand. Shipreel can build both from stock "person holding X" or "POV place" clips plus a corner-pinned screen recording.

### T2. Faceless POV hands demo
**Evidence.**
- AnswersAI "college students these days 😭": 5.2M (likely boosted, 0.4% likes, but 3.5K shares)
- Rizz "Bro really got rejected like that 😹": 1.3M, 2.0% likes
- Adam Lyttle "What game is she playing?": 625K
- Sam Beckman Samsung tip: 670K, 4.4% likes, 0.85% saves
- Goodnotes "7+ features you probably don't know exist": 214K, **3.4% saves**
- Sasha's what-I-eat-in-a-day: 1.1M, 9.6% likes

**Camera variants.**
1. **Over-the-shoulder at a laptop** (AnswersAI). The phone films a laptop; a hand points at the screen; on-screen reactions every 1–2 s ("wow", "wait 👀", "wtf is he doing? 😭", "he takes a snapshot", "gets the answer ✔️ & explanation", "what?? 😭", "he passed 😭"). Text is S4-size (≈40–44 px) at y 50–76% and follows the action.
2. **Phone in hand, POV** (Rizz in a car, Adam Lyttle in a living room with a toddler). Phone at 50–58% width; S1 lines change with each tap.
3. **Top-down hands on a desk** (Sam Beckman, Goodnotes). The device is centered at ~60% width on a light desk; a pill label (S8) per feature; a VO tutorial or music.
4. **Food/object + phone** (Sasha, Cal AI). Cooking shots of 1–1.5 s each with time stamps ("10:00 AM", 32 px white, centered at y 30–55%), then the phone scans the plate. A colored tag ("using Cal AI app💗", pink with a white outline, 40 px, top-right at y 19–24%) sits only on the app shots.

**Beat sheet (Rizz, 35.8 s, 13 cuts).**

| Time | Beat |
|---|---|
| 0–3.4 | Friend's rejected iMessage on the phone: "Bro really got rejected like that 😹" |
| 5.6 | "So I had to put him onto my secret 🤫" |
| 7.8 | Home screen: "This app will change his dating life forever 👀" |
| 10.1 | App Store page: "It's called RIZZ" |
| 12.3 | "Just screenshot and upload 😮" |
| 16.8 | "Instantly get all the rizz you need 😮‍💨" |
| 21.3 | "Copy, paste, and send 😎" |
| 28.0 | Reply lands: "Like taking candy from a baby 😮‍💨" |
| 32.5 | Friend's blurry reaction: "Bro didn't even hesitate 🤣💀" |

**Faceless verdict: YES, the strongest faceless family.** What makes it work is the real environment and a real hand. Shipreel options, best first: (1) prompt the owner to film his own hands (a shot list: "phone in your left hand, thumb on the button, 5 s of a kitchen / car / desk behind it"); (2) stock "hand holding phone, green screen" clips with the recording corner-pinned in, plus ±6 px / ±0.6° handheld drift at ~0.5 Hz, a light glare gradient and slight blur. Avoid the clean device-mockup look.

### T3. Green screen (person over screenshot, App Store page, comment, tweet, or AI result)
**Evidence.**
- Umax "Dylan Latham did not get invited": 927K, 1.3K comments
- Umax "They won't even show their face" (copycat rant): 539K
- Cal AI "Do you still not believe in Cal AI? #greenscreenvideo": 443K
- Structured "Sorry we can not hear you we're kinda busy being featured in the new Apple Keynote": 550K, 3.9% likes
- EPIK sunset filter (facecam variant): 2.4M (boosted) and 4.5M
- EVO Marketing called green-screen reactions "probably the most viral" format of late 2026 (`formats.md`)

**Layouts.**
- **L1 Full-bleed (Umax).** The background screenshot covers the frame. The cutout is anchored to the bottom, head top at y ≈ 34%, face 54% wide (x 18–72%), chin at y ≈ 76%. Background regions get swapped as the creator talks (score card → AI "potential" photo → Instagram share sheet). No captions; the reply sticker sits on top at x 9–60%, y 12–24%.
- **L2 Facecam box (EPIK).** The screen recording is full-frame, played live (slider dragged from 63 to 100). The cutout box is ~232×330 px at x 4.5–26%, y 39–56%. The S1 hook stays on screen: `"What camera?" / "Drop the settings" / Me: just this app 📸` at y 12–19%. The ending cuts to the App Store page (38 s) with a small text "This is the app! Go download it now".
- **L3 POV clip + small cutout (Cal AI 443K).** For the first 6 s, someone else's clip fills the frame below a 12% black top band. A 4-line S1 POV text sits centered at y 46–68%, and the creator's cutout is small at bottom-left (x 0–25%, y 66–100%). Then a hard cut to a walking selfie and full-frame scanner recordings.
- **L4 Split (Structured).** A black top band (y 0–34%) with S1 text at y 17–24%, a keynote clip/screen at y 34–66%, and the founder's dancing cutout overlapping y 34–100%.

**Script formula (rebuttal/rage-bait).**
1. `Hi, I'm [name], the founder of [app]. And the truth is, you guys are [stupid / wrong].` (0–7 s)
2. The objection, stated literally: "You think our app has X-ray vision where it could see chocolate hidden under oatmeal? Of course not."
3. The mechanism that answers it.
4. The number: "90% accuracy … better than the FDA margin of error for packaged foods."
5. A concession plus an alternative: "But hey, I get it … use our barcode scanner and you'll get 100%."
6. The mission plus social proof: "we've already helped so many people lose over 100 pounds."
7. A soft ask for support.

(Cal AI founder, 70.9 s, 1.7% likes, 156 comments.)

**Faceless verdict: NO for L1/L3 (needs the founder's face; the person is the argument). PARTIAL for L2.** The facecam box is small and can show the founder recorded once. A cartoon/mascot cutout in the box (Luna-style, see T9) is plausible but untested in this exact layout. **Shipreel should ship a selfie recorder/importer with background removal** so that one 30–60-s founder clip can be reused across L1/L2/L4 templates.

### T4. Comment-reply video
**Evidence.**
- Umax "Replying to … bro android maxx plesse": 655K, **986 comments**
- Umax Dylan reply: 927K
- Cal AI replies: 230K, 42K
- Enrique "la funda que todos me preguntaron": 5.9M, 18K saves; answering the "what is that?" comment is the reveal

**Layout and beats (Umax Android, 9.17 s).**

| Time | Beat |
|---|---|
| 0.0–5.3 | Selfie (face 40–50% wide), S7 sticker at x 2–45%, y 8.5–17.5%; S1-bold "Y'all kept asking…" (85 px, y = 79%), a smug face and a chin rub |
| 5.3–9.2 | Cut to a phone filming the monitor showing the Google Play listing: "So we did it 😈😈😈" |

The sticker stays on screen the whole time.

**Faceless verdict: YES.** The sticker plus a phone-in-hand demo carries it; the 5-s face can be swapped for a POV shot. Seed real comments first. Never fake a username: show the sticker with a blank or initial avatar, as TikTok itself does for deleted users ("Reply to 's comment").

### T5. Creator talking head: "here's how I use [app] to …", tips, "I found…"
**Evidence.**
- Knowunity biology test: 127K, 1.3% saves
- Cal AI scan tips: 241K, 0.4% saves
- EPIK VO: 2.4M boosted
- MyFitnessPal what-I-eat-in-a-day: 2.7M boosted
- Sam Beckman: 670K, 4.4% likes
- Jake Abrams agents: 26M boosted
- Earlier refs: SideShift 9.6M, Coconote 18M (self-reported)

**Framing (measured).**
- Chest-up selfie: face 28–32% wide, eyes at y 31–33%, phone held at arm's length.
- Desk/tripod medium: face ~22% wide, head top at y 35%, eyes at 42%; static, with a bookshelf or plant behind.
- Close selfie: face 42–48% wide, eyes at y 45–48%.

**Insert grammar.**
1. Hard cut to the phone filming the screen. Knowunity filmed her laptop at an angle with her reflection visible: 8.6 s → 83 s, back to the face for the sign-off.
2. A floating card at 55% width over the vlog (MyFitnessPal).
3. White document/screenshot cards ~45% wide pasted over the face at y 37–48% for 2–4 s (Jake Abrams).

S4 captions run through all inserts.

**Script formula.**
1. `okay so I have a big [stake] coming up [time] and here's how I've been using [app] to [outcome]` (0–9 s)
2. `first I …` → `and then it asks …` → `after you put in all that …` → `and not to mention …`
3. A proof detail: "questions are all from students who already got fives on the exams".
4. `so far so I would [recommend]` plus a free/price line ("and the best part, it's free").

Hook alternatives: `Here's a really neat hidden trick for anyone using a [device/app] that …` (Sam); `everyone's always like what camera do you use, what settings… girl, it's just this one filter` (EPIK).

**Faceless verdict: PARTIAL.** Sam Beckman shows his face for only 1.6 s and EPIK for 0 s on full-frame screen. A **VO-only tutorial over top-down hands or a screen recording with a facecam box** is feasible with TTS or the owner's voice. The talking-head version itself needs a face.

### T6. Founder-led
**(a) Selfie rant or brag: needs the founder's face.**
- Zach Yadegari "I'm 18. I built an app that's making more than $30 million a year. … Why not you?": 283K, 8.8% likes, 1.6% saves. One 51.6-s take at night, close selfie (face 45% wide), **no captions, no cuts, no music**.
- Cal AI founder rebuttal (T3).
- Umax "companies copy everything we do" (green screen).

These work when the founder has a striking claim (a number, an age, a fight).

**(b) "I built an app that…" VO over b-roll: semi-faceless.** ux_deniza 33.7M and 84M, Eddie Lou 140M (all boosted, 0.1–0.5% likes), Chris Raroque 913K / 3.7M (boosted), Deniza: 18 cuts in 42.6 s.

Layout for (b): lifestyle b-roll of the founder *not talking to camera* (writing, lying on the bed, walking, eating), phone-screen close-ups of the app (phone ~60% wide), laptop/IDE shots, and S9 captions at y 82–86%. The hook card says "REWIRES MY BRAIN EVERY DAY" in a stylized face at y 75–82% on the first shot.

Beat sheet (deniza-journal, 42.6 s).

| Time | Line |
|---|---|
| 0.0 | "I built an app that rewires my brain every day using a neuroscience-based technique." |
| 4.9 | Method claim: "there is a method that helps you attract things more easily…" |
| 10.0 | Why: "Because I wanted to make this habit easier to stick to, I built this app using Cursor." |
| 14.1 | What it does, over phone close-ups, ~3 s per screen |
| 27.5 | How it was built (sponsor beat) |
| 37.4 | "I challenge you to try this for 14 days and see what happens. Check the link for the app in my bio." |

Eddie (140M):
- 0.0 "i built my own unpaid intern" (S1, y ≈ 20%)
- Medium talking head at a desk (face ~28% wide)
- Inserts every 2–3 s: logo cards (SpaceX / Grok Bot), app UI, Slack notification card, GitHub card
- S4 captions at y 73%
- CTA "to try out GrokBot"

Feasibility: the founder appears but never lip-syncs, so the owner can shoot b-roll of himself (back of head, hands, walking) or use stock. VO can be his own voice or TTS.

**(c) Build-IRL demo** (Jack Price NFC stickers: 418K, 6.9% likes, 3.2% saves, 13.4K saves). The S1 series title "Vibe Coding things in the real world / Part 1 - NFC Stickers" sits at y = 14% for the whole video. Medium selfie, holding the object, with sticker-style overlays (screenshots ~30% wide, near the face), then IDE and phone shots, a real-world payoff (the dog bowl tap), and "Like + Follow". Needs a face for the talking parts.

**What fails.** Eddie's "I left Harvard to build a timelapse app" storytime (9.3K, 43 cuts, launch CTA "comment latent") vs his boosted 140M demo. Knowunity's "I'm a valedictorian but I genuinely hate studying" ambassador intro got 50K at 0.2% likes. Stakes without a product payoff don't travel. Build-in-public progress logs: see `formats.md` §4.

### T7. Day-in-my-life / GRWM / what-I-eat-in-a-day (WIEIAD) integration
**Evidence.**
- Taylor's mom vlog: 6.2M, 19.2K shares, "use code TAYLER" in the caption
- Destinee's hairstylist DIML: 1.6M, 18.3% likes
- Dafnne's GRWM (Spanish): 852K, 6.7% likes
- Sasha's WIEIAD: 1.1M, 9.6% likes (she tags Cal AI on a 15–24-s template)
- MyFitnessPal WIEIAD: 2.7M boosted

**Grammar.** The app appears **once**, as a 2–4-s moment in the routine: Taylor at 13.2 s (phone held to camera, "Tracking with Cal AI" in serif S1 at y ≈ 80%); Dafnne at 10.8–19 s ("viendo que contiene mi desayuno…", small white text at y ≈ 40%); Sasha at 9.3–13.6 s (scan → result). The verbal mention, if any, comes at the end: Dafnne at 58 s, "many ask me what I use for scanning food: Cal AI". Cal AI's brief: no script, don't say the name, pin a comment, put the code in the caption.

**Faceless verdict.** WIEIAD: **YES** (Sasha shows her face for 0.7 s; the rest is hands, food, phone and time stamps). DIML/GRWM: **NO**; the person is the content, and Cal AI's whole engine is renting creators' audiences.

### T8. POV skits and sitcoms
**Evidence.**
- Verso Jobs "POV: You walked into a corporate meeting of people who make 10x your salary": 2.9M, 8.7% likes, 1.3% shares; 9.6M earlier
- Cluely "POV: your chopped coworker gets a girlfriend" (Ep 3): 3.0M, **14.5% likes**
- AnswersAI professor skit "Lily? It says you finished the exam in nine minutes": 1.0M
- Cleo mime prank: 155K (landscape, flop)

**Verso layout (fully templatable once you have footage).**
- Black background
- S1 POV text in 3 lines at y 13–23%
- A Zoom 2×2 grid at y 26–73% (x 4–96%) with name tags
- S6 karaoke captions at y 76–79%
- Brand logo at y 86–90%
- One take, 0 cuts, 55 s

Cluely: S1 POV text at y ≈ 17% for 6 s, then confessional cut-ins (a person on a chair against a white wall) between scenes, S4 captions at y ≈ 75%, 15 cuts in 44 s. Product never shown (its conversion problem is documented in `formats.md` §3.8).

**Faceless verdict: NO for sitcoms (needs actors).** The POV-from-behind variant (AnswersAI 5.2M: faces never visible, the professor only as a blurred webcam tile) is feasible by filming your own laptop or desk.

### T9. Human + AI character, and the AI-avatar question
**What works: openly AI characters.**
- **Luna (Depuff AI)**: an AI cartoon cat-girl on a crumpled-paper background. 1.3M, 11.6% likes, 2.5% saves; account median 80K over 56 posts.
  - Word-by-word captions: ~64 px black Comic-style font with a white glow, one word at a time, y ≈ 12–16%.
  - Character cutouts change pose every ~2.5 s (30 cuts at the 0.12 threshold).
  - Real-photo inserts.
  - From 28 s: an App Store banner card (x ≈ 14–81%, y ≈ 19–32%) above a phone screen recording; a small Luna sticker bottom-left.
- **Praktika**: a creator argues with the AI tutor on a propped phone or iPad. Learn with Dat 2.5M (66.8K shares, 2.7%); Imane 3.1M.
  - One locked-off shot, 0–1 cuts, 37 s.
  - Bilingual, bold, two-color captions: white + green/red highlight words, y 70–80%.
  - The tutor's phone sits on screen bottom-left at x 0–42%, y 47–100%.
  - No hard CTA; #praktika in the caption.

**What fails: realistic AI people.**
- faceaiamerica's realistic AI presenter ("Hack your style transformation in 2025. With the new Style Mirror app…"): **14.2K views, 4 likes**.
- heyitsnova.ai (AI influencer, aesthetic NYC-window b-roll): **median 258 views** over 60 posts.
- Liply's AI-face slideshows: median 850.
- Lightreel's Oct 2026 weekly review: comparable fully AI videos got **175–3,000 views vs 100K–369K for human UGC**.

Also: TikTok requires labeling realistic AI people; the FTC bans testimonials from people who don't exist; the EU AI Act disclosure rule applied from Aug 2, 2026; users can turn AI content down in their feed settings.

**Verdict.** Don't generate fake creators or fake testimonials. Do offer a **recurring mascot/character mode** (cartoon or obviously synthetic, with a name and a personality) and a **"your voice, your hands, AI only behind the scenes"** pipeline.

### T10. Stitch / duet
Cal AI "#stitch with @Martin Rios — This guy needs to slowwww down" (148K):
- 0–3.3 s: the original creator's clip, with a red TikTok-style "Stitch incoming…" pill (white text on #E6343F, ~36 px) at y ≈ 64–67%.
- Then the founder's selfie rebuttal (face ~30% wide, eyes at y ≈ 33%), one take, 32 s.

Needs a face for the response. The stitched clip must be someone's public post, using the platform's own Stitch feature; never re-upload it.

---

## 3. Faceless feasibility matrix

| Sub-format | Face needed? | Faceless substitute | Best evidence | Verdict |
|---|---|---|---|---|
| T2 POV hands demo (phone, laptop, iPad, top-down, food) | No | owner's hands or stock hand-held clips + corner-pinned recording | AnswersAI 5.2M, Rizz 1.3M, Sasha 1.1M, Sam 670K, Adam 625K, Goodnotes 214K | **Build first** |
| T1 Reaction → demo | 4 s of face | body-and-plate shot, or a "far person + S3 band" scene | Nomad 627K–1.0M, Cal AI plate 294K | **Build** (offer a selfie slot too) |
| T4 Comment reply | No | sticker + phone/screen demo | Umax 655K (face 5 s), Enrique 5.9M (hands only) | **Build** |
| T7 WIEIAD | No | food, hands, phone, time stamps | Sasha 1.1M (face 0.7 s) | **Build** |
| T5 Tutorial / tips | Optional | VO + top-down hands or full-frame screen + facecam box | Sam 670K, EPIK 2.4M | **Build** (VO = owner's voice or TTS) |
| T6b "I built an app…" VO + b-roll | Founder in b-roll, no lip sync | owner's own b-roll (hands, back, walking) + stock | ux_deniza 33.7M/84M (boosted), Eddie 140M | **Build** (b-roll shot list) |
| T9 AI mascot explainer | No (openly AI) | named cartoon/mascot character | Luna 1.3M | **Build**, with disclosure |
| T8 POV-from-behind skit | No | film your own desk/laptop | AnswersAI 5.2M | Possible (needs owner footage) |
| T3 Green screen L1/L3, T6a selfie rant, T10 stitch reply | **Yes** | none convincing | Umax 927K, Zach 283K, Cal AI 443K | **Selfie recorder/import + background removal** |
| T7 DIML/GRWM, T8 sitcoms, human+AI banter | **Yes (people/actors)** | creator program (outside Shipreel's scope) | Taylor 6.2M, Cluely 3.0M, Dat 2.5M | Don't fake; export a brief for creators instead |
| Realistic AI avatar testimonial | — | — | faceai 14K / 4 likes; nova median 258 | **Don't build** |

---

## 4. Hook bank (verbatim, with results)

On-screen text is in quotes; **VO** marks a spoken line.

**Reaction / discovery**
- "someone made strava but for the gym??": Stronger 2.7M
- "the hostel volunteer just showed me this and all my solo travel anxiety is GONE 🤯🤯": Nomad 627K
- "my hostel roommate just showed me this and all my solo travel anxiety is gone 🤯🤯": Nomad 1.0M
- "Are you in a hurry & don't have time to track your calories?": Cal AI 294K
- "college students these days 😭": AnswersAI 5.2M
- "our prof showed us how to watch a 1 hour lecture in 5 minutes 😭": AnswersAI 10.9M
- "Bro really got rejected like that 😹": Rizz 1.3M
- "What game is she playing?": Adam Lyttle 625K (comment bait)
- "⁉️ I studied for one day and got a 98 ⁉️": Adam Huda 2.8M (founder posing as a user)

**Talking head / tips**
- **VO** "Here's a really neat hidden trick for anyone using a Samsung phone that levels up how smooth your phone feels.": 670K
- **VO** "okay so I have a big biology test coming up this week and here's how I've been using Knowunity to prepare for it": 127K
- **VO** "everyone's always like what camera do you use what settings do you use, girl it's just this one filter": 2.4M
- "\"What camera?\" \"Drop the settings\" Me: just this app 📸": EPIK 2.4M
- **VO** "Hey guys, I just wanted to quickly share a few tips on how to use Cal AI's scan feature with more accuracy.": 241K
- "7+ Goodnotes features you probably don't know exist!": 214K, 3.4% saves
- "3 mindblowing yet simple Claude Cowork agents / From founder of ~30 person creative agency": 26.3M (boosted)
- **VO** "What I eat in a day as somebody who's trying to grow my glutes, but I also want a six pack": 2.7M (boosted)
- **VO** "Let's meal prep breakfast, lunch and dinner for the next 3 days.": 41.5M (boosted)

**Comment reply**
- Sticker "bro android maxx plesse" + "Y'all kept asking…" → "So we did it 😈😈😈": Umax 655K
- **VO** "Dylan Latham did not get invited. Sub-90 Umax scores are not allowed on this trip.": 927K
- **VO** "hey, I saw that many people commented on the last video that they liked the case and wanted to know where I bought it…": Enrique 5.9M
- "Replying to @… Cal AI may not be free, but it is super affordable": Cal AI 42K

**Founder**
- **VO** "I'm 18. I built an app that's making more than $30 million a year.": Zach 283K, 8.8% likes
- "The truth about Cal AI…" + **VO** "Hi, I'm Zach, the founder and CEO of Cal AI. And the truth is, you guys are stupid.": 294K
- **VO** "As some of y'all might know, there are companies that copy everything that we do.": Umax 539K
- "i built my own unpaid intern": Eddie 140M (boosted)
- **VO** "I built an app that rewires my brain every day using a neuroscience based technique.": ux_deniza 33.7M (boosted)
- "built a tiny 'future me' desk widget that hypes me up based on my goals": ux_deniza 84M (boosted)
- "how i built an apple watch app in 2 hours": Chris 913K (boosted)
- "the app launch checklist i wish i had for my first app" + **VO** "I'm about to launch my fifth app and here's everything I set up": 388K
- "Vibe Coding things in the real world / Part 1 - NFC Stickers" + **VO** "So this is an NFC sticker…": 418K, 3.2% saves
- "Sorry we can not hear you we're kinda busy being featured in the new Apple Keynote": Structured 550K
- **Weak:** "telling my parents im dropping out of harvard (pt. 2)": 9.3K; "I'm a valedictorian, but I genuinely hate studying": 50K

**POV / skit**
- "POV: You walked into a corporate meeting of people who make 10x your salary": 2.9M
- "POV: your chopped coworker gets a girlfriend": 3.0M
- "Pov: cal ai is offering you 20k a month but you turned it down because it's basically the same as having a j*b": 443K
- **VO** "Lily? … It says you finished the exam in nine minutes.": 1.0M

**Vlog / transformation**
- "WHAT I EAT IN A DAY as a pilates girl": 1.1M
- "grwm" + **VO** "join me to get ready because I have a very long day": 852K
- "october 2025" → "october 2026": 343K, 7.1% likes (a creator's own transformation; trust-building for her Cal AI code)

**Openly AI character**
- "¿Quieres destacar y verte más atractiva que las demás?" + "EXPLICADO POR LUNA": 1.3M
- "IM LẶNG VÀ ĐẾM ĐI 😭" (Vietnamese for "be quiet and count"; the AI tutor is asked to count to 1,000,000): 2.5M

---

## 5. Full example scripts (ready to template; `[APP]`, `[X]` are slots)

**A. Faceless reaction → demo, 11 s, music only** (Stronger / Nomad structure)

| Time | Shot | On-screen text |
|---|---|---|
| 0.0–4.0 | POV hook shot: a person far away in a hostel/gym/kitchen, or a body holding the object | S1 or S3: "my roommate just showed me this and all my [problem] is GONE 🤯🤯" |
| 4.0 | Phone in hand: home screen of [APP] | "[feature 1, ≤6 words]" |
| 6.5 | Tap → result | "[feature 2]" |
| 8.9–11.0 | Hold on the best result | "[feature 3 + emoji]" |

Caption: "erm who was gonna tell me? [N] years wasted 😭 #[niche]". Pinned comment: "it's called [APP]".

**B. Faceless POV hands, laptop or phone, 18 s** (AnswersAI)

| Time | On-screen text |
|---|---|
| 0.0 | "[group] these days 😭" (S4-size at y ≈ 60%) |
| 1.0 | Whip to the target screen |
| 3.0 | "wait 👀" |
| 5.0 | Popup with the [APP] result: "wtf is he doing? 😭" |
| 8.0 | "he [action]s" |
| 11.0 | "gets the [result] ✔️ & [extra]" |
| 15.0 | "what?? 😭" |
| 17.0 | Proof screen ("Score 21 out of 21"): "he passed 😭" |

**C. Comment reply, 9 s**

| Time | Shot | Text |
|---|---|---|
| 0.0–5.3 | Selfie or POV; S7 sticker with a real comment ("bro [platform/feature] plesse") | "Y'all kept asking…" (y ≈ 79%) |
| 5.3–9.2 | Phone filming the store listing / new feature | "So we did it 😈😈😈" |

Caption: "Replying to @user — [feature] out now 😮‍💨".

**D. Founder green-screen rebuttal, 60–70 s** (needs a selfie clip)

| Time | Beat |
|---|---|
| 0.0 | S2 white box "The truth about [APP]…" (y 19–33%); seated medium shot or L1 green screen over the critic's comment/clip. **VO** "Hi, I'm [name], the founder of [APP]. And the truth is, you guys are [wrong]." |
| 9.7 | Cut to the critic's clip or screenshot with its original text: "[APP] has no shame" |
| 13.0 | Full-frame screen recording showing the fix |
| 21.0 | Back to the face; **VO** "[mechanism] … [number] … better than [benchmark]." |
| 38.0 | **VO** "But hey, I get it … for you, use [alt feature]." |
| 50.0 | **VO** "At the end of the day, the biggest thing stopping people from [goal] is [root problem]. That's what we're trying to solve." |
| 61.0 | **VO** "[social proof]. We're very excited to keep going." |

S5 single-word captions at y ≈ 60%.

**E. Talking-head tutorial with screen inserts, 60–85 s** (Knowunity)

| Time | Beat |
|---|---|
| 0.0 | Chest-up selfie. **VO** "okay so I have a big [stake] coming up [when] and here's how I've been using [APP] to [outcome]" |
| 8.6 | Cut to the phone filming the screen at a slight angle; S4 captions continue. "first I open the app and go to [tab]" → each step 3–6 s |
| 35.0 | **VO** "and not to mention, [differentiator]" |
| 55.0 | **VO** "[proof detail]" |
| 80.0 | Back to the face. **VO** "so far so good, I'd definitely recommend it, and the best part, it's free" |

**F. "I built an app that…" VO + b-roll, 40 s** (ux_deniza)

| Time | Beat |
|---|---|
| 0.0 | Hook card on a lifestyle shot: "[OUTCOME] EVERY DAY". **VO** "I built an app that [does X] every day using [credible method]." |
| 5.0 | **VO** "There's a method that [promise], all based on [why it works]." (b-roll: writing, walking) |
| 10.0 | **VO** "Because I wanted to make this easier to stick to, I built [APP]." |
| 14.0 | Phone close-ups, 3 s per screen. **VO** "The app helps you [step 1]… then [step 2]… and turns everything into [simple output]." |
| 37.0 | **VO** "I challenge you to try this for [N] days and see what happens. Link's in my bio." |

S9 captions at y 82–86%, 2–4 words, a cut every 1.5–2.5 s.

**G. Faceless what-I-eat-in-a-day / routine, 23 s**

| Time | Shot | Text |
|---|---|---|
| 0.0–0.7 | Establishing shot (optional person, no face needed) | "WHAT I EAT IN A DAY / as a [identity]" |
| 0.7 | 1–1.5-s process shots | Time stamps "10:00 AM" |
| 9.3–13.6 | Phone scans the result | "using [APP] app💗" tag top-right |
| 14.0–22.9 | More meals with time stamps; end on the most appetizing shot | — |

Caption: "[identity] what I eat in a day 💗 @[APP] code: [CODE]".

**H. Openly-AI mascot explainer, 39 s** (Luna)

| Time | Beat |
|---|---|
| 0.0 | Mascot full-body on a textured background; one-word captions at the top. "[question the target asks themselves]?" |
| 3.7 | Title card "EXPLICADO POR [NAME]" in neon |
| 6–25 | 3–4 tips; the mascot changes pose every ~2.5 s; real-photo inserts |
| 25.8 | "[problem] … you can fix it" |
| 28.2 | App Store banner card + screen recording of [APP]'s result; small mascot bottom-left |
| 38.0 | "[download/link]" |

---

## 6. Production details that make it feel native (checklist)

1. Hook text is visible at frame 0; nothing animates in. The title stays 3–6 s (short formats) or for the whole video (S2/S3 boxes, POV titles, series titles).
2. Use TikTok's own text styles (S1/S2/S3/S7) in TikTok Sans, not designer fonts. Lowercase and an emoji at the end of the line ("😭", "🤯🤯", "👀", "😈😈😈", "💗").
3. Spoken captions are small (44–55 px), y 73–78%, sentence case, 3–7 words. Don't run spoken captions and the hook title in the same band.
4. Show the app as a phone filmed by a phone, held in a hand in a real room. Keep glare, the thumb and slight motion. No device frames, no 3D mockups, no gradients.
5. Show the app within 5 s (short) or 15 s (vlog). Show it once, at its best moment (the result, not the onboarding).
6. Say the name late, or not at all: put it in the caption, a pinned comment, a code, or the App Store page in the last 2–3 s. Name it in first person ("It's called RIZZ"; "what I use for scanning food is Cal AI").
7. Keep the room tone. Talking heads have no music; demos ride one trending track. Unpolished audio is fine.
8. Keep shots long while someone talks (4–10 s); only b-roll montages cut fast (1–2 s). Zero-cut one-takes work for rants and skits.
9. End on a loopable frame or a payoff reaction ("he passed 😭", "Bro didn't even hesitate 🤣💀"). No end cards, logos or "download now" slates. Brand logos only appear in brand-account skits (Verso).
10. Watch the like rate. If a post sits under 1% likes, it isn't organic proof; don't clone it as an organic format. Use it as an ad template instead.

---

## 7. What Shipreel needs to build (from the measurements)

- **Native text layer presets S1–S9** with the pixel specs in §1.2, locked to the measured bands, plus a lint that flags hook text below y = 35% or captions outside y 70–80%.
- **Phone-in-hand compositor:** a library of stock and user-shot "hand holding phone" clips (green screen), 4-point corner pin of the app's screen recording, handheld drift, glare. Plus a **"film your hands" shot list** (5-s clips: kitchen, desk, car, gym, couch).
- **Green-screen compositor:** background = screenshot / App Store page / comment / AI result scaled to cover; person cutout via background removal from a **selfie clip recorded or imported in Shipreel**; presets L1 (bottom-anchored, face 45–55% wide), L2 (232×330 box at x 4.5%, y 39%), L3 (clip on top + small cutout), L4 (split).
- **Comment-reply sticker** (S7) fed from real comments the user pastes in. Never invent usernames.
- **Floating screen card** (55% width, y 16.5–83.5%) and **full-frame screen cut** insert modes for talking-head and VO formats.
- **Mascot mode** (T9): a named, obviously synthetic character with pose cutouts and one-word captions. Block "realistic AI person speaking as a customer".
- **Templates T1, T2, T4, T5-VO, T6b, T7-WIEIAD, T9 as fully faceless**; T3, T6a and T10 unlock once a selfie clip exists.
- **Metric triage:** compute the like rate on cloned references and label them "organic" (≥ 2%) or "ad" (< 1%).

---

## 8. Example table

Views and rates were verified with yt-dlp on 2026-10-16. "Like %" = likes/views; "Save %" = saves/views. Like % under 1% at 1M+ views → likely paid boost.

| id | Account / URL | Date | Views | Like % | Save % | Dur (s) | Cuts (0.30) | Hook (verbatim) | Notes |
|---|---|---|---|---|---|---|---|---|---|
| ans-newgen | [@answersai.com](https://www.tiktok.com/@answersai.com/video/7681731630674857230) | 2026-09-04 | 5.2M | 0.4 | 0.08 | 18 | 0 (+whips) | "college students these days 😭" | T2/T8 POV from behind at a laptop; faceless; 3.5K shares |
| ans-prof | [@answersai.com](https://www.tiktok.com/@answersai.com/video/7647704464454995214) | 2026-06-05 | 1.0M | 2.1 | 0.30 | 74 | 5 | **VO** "Lily? … you finished the exam in nine minutes" | T8 skit; app on a laptop at 17–43 s |
| tt-answersai (existing) | [@answersai.com](https://www.tiktok.com/@answersai.com/video/7608667020485201166) | 2026-02-19 | 10.9M | 3.4 | 0.96 | 39 | 4 | "our prof showed us how to watch a 1 hour lecture in 5 minutes 😭" | POV from the audience; demo on a projector |
| calai-sorry | [@calai.app](https://www.tiktok.com/@calai.app/video/7515106146567343402) | 2025-06-12 | 294K | 1.7 | 0.30 | 71 | 8 | "The truth about Cal AI…" / **VO** "…you guys are stupid" | T3/T6a founder rebuttal, S2 box + S5 words |
| calai-busy | [@calai.app](https://www.tiktok.com/@calai.app/video/7482403221856587054) | 2025-03-16 | 294K | 0.7 | 0.28 | 10 | 1 | "Are you in a hurry & don't have time to track your calories?" | T1 faceless (plate at chest) → phone at 2.5 s |
| calai-ingred | [@calai.app](https://www.tiktok.com/@calai.app/video/7482853151062854958) | 2025-03-17 | 241K | 1.0 | 0.40 | 37 | 7 | **VO** "Hey guys, I just wanted to quickly share a few tips…" | T5 tips; selfie + b-roll + phone |
| tt-calai 7516 (existing) | [@calai.app](https://www.tiktok.com/@calai.app/video/7516324544035065134) | 2025-06-15 | 443K | 0.7 | 0.12 | 36 | 9 | "Pov: cal ai is offering you 20k a month but you turned it down…" | T3 L3 clip-on-top green screen |
| tt-calai 7482851 (existing) | [@calai.app](https://www.tiktok.com/@calai.app/video/7482851722008775979) | 2025-03-17 | 148K | 0.7 | 0.13 | 36 | 4 | "Stitch incoming…" | T10 stitch |
| umax-reply | [@umax.app](https://www.tiktok.com/@umax.app/video/7346807147713269035) | 2024-03-16 | 927K | 2.0 | 0.17 | 13 | 2 | **VO** "Dylan Latham did not get invited." | T3 L1 + S7 sticker; 1.3K comments |
| umax-android | [@umax.app](https://www.tiktok.com/@umax.app/video/7325842619873971499) | 2024-01-19 | 655K | 1.8 | 0.27 | 9 | 1 | "Y'all kept asking…" → "So we did it 😈😈😈" | T4; 986 comments |
| umax-face | [@umax.app](https://www.tiktok.com/@umax.app/video/7342593196087872814) | 2024-03-04 | 539K | 0.9 | 0.13 | 31 | 5 | **VO** "there are companies that copy everything that we do" | T3 L1 rant over AI results |
| tt-umax (existing) | [@umax.app](https://www.tiktok.com/@umax.app/video/7326971975946063146) | 2024-01-22 | 1.2M | 4.0 | 0.51 | 17 | 4 | "Rate his glow up out of 10" | green screen over score |
| stronger-react | [@strongerapp](https://www.tiktok.com/@strongerapp/video/7611280708153150733) | 2026-02-26 | 2.7M | 0.2 | 0.02 | 11 | 1 | "someone made strava but for the gym??" | T1 canonical; boosted |
| tt-stronger (existing) | [@strongerapp](https://www.tiktok.com/@strongerapp/video/7608498509083446541) | 2026-02-19 | 851K | 0.2 | 0.01 | 11 | 1 | "app is called Stronger!" (caption) | T1 sibling |
| nomad-ayoub | [@nomadtable](https://www.tiktok.com/@nomadtable/video/7504344756852395310) | 2025-05-14 | 627K | 2.8 | 1.43 | 21 | 0 | "the hostel volunteer just showed me this and all my solo travel anxiety is GONE 🤯🤯" | T1 faceless, S3 band all video |
| tt-nomad (existing) | [@nomadtable](https://www.tiktok.com/@nomadtable/video/7505063333310008607) | 2025-05-16 | 1.0M | 1.0 | 0.48 | 18 | 0 | "my hostel roommate just showed me this…" | same template |
| rizz-ult | [@rizz.app](https://www.tiktok.com/@rizz.app/video/7262832400839789866) | 2023-08-02 | 1.3M | 2.0 | 0.36 | 36 | 13 | "Bro really got rejected like that 😹" | T2 POV car, faceless |
| tt-rizz (existing) | [@rizz.app](https://www.tiktok.com/@rizz.app/video/7282099257552325934) | 2023-09-23 | 1.6M | 1.6 | 0.30 | 33 | 13 | "Struggling to text?" | T2 |
| adam-cat | [@adamlyttleapps](https://www.tiktok.com/@adamlyttleapps/video/7580708262970969362) | 2025-12-06 | 625K | 0.1 | 0.01 | 14 | 0 | "What game is she playing?" | T2 POV, toddler plays; S2 black box; boosted |
| sam-samsung | [@sam_beckman](https://www.tiktok.com/@sam_beckman/video/7607222841599151376) | 2026-02-28 | 670K | 4.4 | 0.85 | 25 | 3 | **VO** "Here's a really neat hidden trick for anyone using a Samsung phone…" | T5/T2 top-down hands; face 1.6 s |
| tt-sam (existing) | [@sam_beckman](https://www.tiktok.com/@sam_beckman/video/7690163755241737524) | 2026-09-27 | 290K | 6.1 | 3.03 | 35 | 5 | "This App is filled with SECRET Android Apps 🔥" | T5 |
| goodnotes-7 | [@goodnotes](https://www.tiktok.com/@goodnotes/video/7673019476446596369) | 2026-08-12 | 214K | 6.0 | 3.41 | 56 | 41 | "7+ Goodnotes features you probably don't know exist!" | T2 hands + iPad, S8 pills |
| sasha-wieiad | [@sashalusslover](https://www.tiktok.com/@sashalusslover/video/7665709864848575777) | 2026-07-23 | 1.1M | 9.6 | 0.85 | 23 | 21 | "WHAT I EAT IN A DAY as a pilates girl" | T7 faceless WIEIAD, Cal AI at 9.3 s |
| dafnne-grwm | [@dafnnejm](https://www.tiktok.com/@dafnnejm/video/7673549091711896852) | 2026-08-13 | 852K | 6.7 | 0.21 | 69 | 4 | "grwm" / **VO** "join me to get ready…" | T7 GRWM (ES); app 10.8 s, name 58 s |
| tay-mom | [@taaaaylerr](https://www.tiktok.com/@taaaaylerr/video/7633980082628988173) | 2026-04-29 | 6.2M | 1.2 | 0.10 | 141 | 13 | **VO** "Hi. Good morning." | T7 DIML; app 13.2 s; code in caption |
| tay-why | [@taaaaylerr](https://www.tiktok.com/@taaaaylerr/video/7657365942455880974) | 2026-07-01 | 140K | 3.1 | 0.05 | 101 | 9 | **VO** "I have a busy afternoon, and I'm taking you along with me." | T7 baseline (most vlogs land here) |
| tay-stuck | [@taaaaylerr](https://www.tiktok.com/@taaaaylerr/video/7696680140092247309) | 2026-10-15 | 343K | 7.1 | 0.07 | 10 | 1 | "october 2025" → "october 2026" | transformation proof by a partner creator |
| tt-destinee (existing) | [@destineeroseofficial](https://www.tiktok.com/@destineeroseofficial/video/7650359249490562318) | 2026-06-12 | 1.6M | 18.3 | 0.40 | 82 | 27 | "SPEND THE DAY WITH ME 🤭" | T7; app never said |
| mfp-meals | [@myfitnesspal](https://www.tiktok.com/@myfitnesspal/video/7572602746864520478) | 2025-11-14 | 2.7M | 0.4 | 0.04 | 45 | 23 | **VO** "What I eat in a day as somebody who's trying to grow my glutes…" | T5/T7, floating screen card; boosted |
| mfp-41m | [@myfitnesspal](https://www.tiktok.com/@myfitnesspal/video/7561452572280704286) | 2025-10-15 | 41.5M | 0.1 | 0.00 | 53 | 24 | **VO** "Let's meal prep breakfast, lunch and dinner for the next 3 days." | creator ad; boosted |
| epik-filter | [@lexi.degraw](https://www.tiktok.com/@lexi.degraw/video/7673922715174161672) | 2026-08-14 | 2.4M | 0.2 | 0.05 | 39 | 4 | "\"What camera?\" \"Drop the settings\" Me: just this app 📸" | T3 L2 facecam box; App Store end |
| tt-lexi (existing) | [@lexi.degraw](https://www.tiktok.com/@lexi.degraw/video/7655486056904609031) | 2026-06-25 | 4.5M | 0.4 | 0.04 | 38 | 7 | "Summer photo hackkk" | same creator/app |
| knowu-free | [@knowunity](https://www.tiktok.com/@knowunity/video/7641665772187618592) | 2026-05-19 | 127K | 1.5 | 1.30 | 86 | 15 | **VO** "okay so I have a big biology test coming up this week…" | T5 talking head → laptop |
| knowu-valed | [@knowunity](https://www.tiktok.com/@knowunity/video/7682950601143029025) | 2026-09-08 | 50K | 0.2 | 0.04 | 55 | 20 | **VO** "I'm a valedictorian, but I genuinely hate studying." | weak: story without product |
| enrique-case | [@soyenriquebarron](https://www.tiktok.com/@soyenriquebarron/video/7595393080967089415) | 2026-01-15 | 5.9M | 1.5 | 0.31 | 43 | 2 | sticker "¿Dónde conseguiste tu funda?" | T4 hands-only reply (physical product; structure applies) |
| zach-whynot | [@zachyadegari](https://www.tiktok.com/@zachyadegari/video/7553080628154060046) | 2025-09-23 | 283K | 8.8 | 1.63 | 52 | 0 | **VO** "I'm 18. I built an app that's making more than $30 million a year." | T6a one-take selfie, no captions |
| deniza-journal | [@ux_deniza](https://www.tiktok.com/@ux_deniza/video/7640535174647663890) | 2026-05-16 | 33.7M | 0.5 | 0.02 | 43 | 18 | "REWIRES MY BRAIN EVERY DAY" / **VO** "I built an app that…" | T6b VO + b-roll; Cursor-sponsored, boosted |
| tt-deniza (existing) | [@ux_deniza](https://www.tiktok.com/@ux_deniza/video/7638476458284829960) | 2026-05-11 | 84.4M | 0.1 | 0.01 | 36 | 16 | "mini future-me" widget | T6b; boosted |
| tt-eddie (existing) | [@eddie_the_lou](https://www.tiktok.com/@eddie_the_lou/video/7675780318602841358) | 2026-08-19 | 140.2M | 0.1 | 0.01 | 38 | 24 | "i built my own unpaid intern" | T6b talking head + inserts; boosted |
| eddie-harvard | [@eddie_the_lou](https://www.tiktok.com/@eddie_the_lou/video/7695524080585362701) | 2026-10-11 | 9.3K | 4.5 | 0.31 | 55 | 43 | "telling my parents im dropping out of harvard (pt. 2)" | founder storytime flop |
| chris-story | [@chris.raroque](https://www.tiktok.com/@chris.raroque/video/7668389913334648095) | 2026-07-30 | 913K | 0.2 | 0.10 | 42 | 9 | "how i built an apple watch app in 2 hours" | T6b VO over screen; OpenAI-sponsored |
| chris-checklist | [@chris.raroque](https://www.tiktok.com/@chris.raroque/video/7694010705644670239) | 2026-10-07 | 388K | 0.4 | 0.28 | 65 | 15 | "the app launch checklist i wish i had for my first app" | T6b/T5; sponsored |
| tt-chris (existing) | [@chris.raroque](https://www.tiktok.com/@chris.raroque/video/7686971092572835103) | 2026-09-18 | 3.7M | 0.1 | 0.04 | 49 | 10 | "First, I keep choosing Claude Code for iOS…" | boosted |
| jack-nfc | [@byjackprice](https://www.tiktok.com/@byjackprice/video/7651100452481682696) | 2026-06-14 | 418K | 6.9 | 3.22 | 63 | 13 | "Vibe Coding things in the real world / Part 1 - NFC Stickers" | T6c build-IRL; series title |
| tt-jake (existing) | [@jakeabrams21](https://www.tiktok.com/@jakeabrams21/video/7621000999339035934) | 2026-03-25 | 26.3M | 0.2 | 0.12 | 87 | 0 | "3 mindblowing yet simple Claude Cowork agents" | T5; persistent S2 title + S6 captions + doc cards; boosted |
| tt-adamhuda (existing) | [@theadamhuda](https://www.tiktok.com/@theadamhuda/video/7464620023945039137) | 2025-01-27 | 2.8M | 7.7 | 3.85 | 37 | 5 | "⁉️ I studied for one day and got a 98 ⁉️" | founder as user; screen inserts |
| structured-wwdc | [@structured.app](https://www.tiktok.com/@structured.app/video/7649417658676333857) | 2026-06-09 | 550K | 3.9 | 0.54 | 11 | 0 | "Sorry we can not hear you we're kinda busy being featured in the new Apple Keynote" | T3 L4 split, dancing cutout |
| verso-ai | [@versojobs](https://www.tiktok.com/@versojobs/video/7672924338689019167) | 2026-08-11 | 2.9M | 8.7 | 0.69 | 55 | 0 | "POV: You walked into a corporate meeting of people who make 10x your salary" | T8 Zoom-grid skit, S6 captions |
| tt-verso (existing) | [@versojobs](https://www.tiktok.com/@versojobs/video/7607122961522248991) | 2026-02-15 | 9.6M | 9.9 | 0.81 | 32 | 0 | — | T8 |
| cluely-ep3 | [@cluely](https://www.tiktok.com/@cluely/video/7552668453300161810) | 2025-09-21 | 3.0M | 14.5 | 0.70 | 44 | 15 | "POV: your chopped coworker gets a girlfriend" | T8 sitcom; product absent |
| cleo-office | [@meetcleo](https://www.tiktok.com/@meetcleo/video/7647227021461966112) | 2026-06-03 | 155K | 0.3 | 0.06 | 67 | 27 | "we brought a mime into work" | landscape prank; weak |
| cleo-grief | [@meetcleo](https://www.tiktok.com/@meetcleo/video/7673201718871592225) | 2026-08-12 | 1.4M | 0.07 | 0.00 | 74 | 4 | **VO** "I've always been a what they call a very frugal person." | landscape testimonial; paid |
| luna-glow | [@lunaglowup__](https://www.tiktok.com/@lunaglowup__/video/7693642025723383062) | 2026-10-06 | 1.3M | 11.6 | 2.47 | 39 | 9 | "¿Quieres destacar y verte más atractiva…?" | T9 openly AI mascot (Depuff AI) |
| dat-count | [@learnwithdat](https://www.tiktok.com/@learnwithdat/video/7693441670112677138) | 2026-10-06 | 2.5M | 6.1 | 0.32 | 37 | 1 | "IM LẶNG VÀ ĐẾM ĐI 😭" | T9 human vs AI tutor (Praktika); 66.8K shares |
| tt-dat (existing) | [@learnwithdat](https://www.tiktok.com/@learnwithdat/video/7693024368682601735) | 2026-10-05 | 544K | 4.1 | 0.26 | 17 | 0 | reply to a comment | T9 + T4 |
| imane-praktika | [@englishwithimane8](https://www.tiktok.com/@englishwithimane8/video/7683870094807567649) | 2026-09-10 | 3.1M | 1.3 | 0.14 | 37 | 0 | "اخدع الذكاء الاصطناعي حقي" (Arabic, roughly "pranking my AI") | T9, second creator, same format |
| faceai-avatar | [@faceaiamerica](https://www.tiktok.com/@faceaiamerica/video/7692611975028706591) | 2026-10-04 | 14K | 0.03 | 0.00 | 21 | 5 | **VO** "Hack your style transformation in 2025." | realistic AI presenter: **flop** |
| nova-aiinfl | [@heyitsnova.ai](https://www.tiktok.com/@heyitsnova.ai/video/7664848745229585678) | 2026-07-21 | 1.2K | 6.4 | 1.18 | 7 | 5 | "It won't happen overnight… but if you quit, it won't happen at all." | AI influencer, account median 258 |
| liply-ai (slides) | [@liply.app](https://www.tiktok.com/@liply.app/photo/7605144789255720215) | 2026-02 | 55K | — | — | — | — | "I tried every amount of lip filler on my face so you don't have to" | AI faces; account median 850 |
| brick-goals | [@getbrick](https://www.tiktok.com/@getbrick/video/7581939895850110239) | 2025-12-09 | 883K | 0.08 | 0.01 | 15 | 39 | "One tap. A world of possibilities." | polished ad, boosted; counter-example |
| opal-rec (slides) | [@opal](https://www.tiktok.com/@opal/video/7564463679215914262) | 2025-10-23 | 445K | 0.6 | — | 20 | — | "Any rec?" | slideshow, for reference |

---

## Sources

- Videos and metrics: TikTok via yt-dlp 2026.08.19; files in `refs/viral2/ugc/` (git-ignored), sheets in `research/viral/ugc-sheets/`.
- AI-UGC performance: [Lightreel, AI-generated UGC weekly report, Oct 2026](https://lightreel.ai/blogs/ai-generated-ugc-videos) (175–3,000 vs 100K–369K views; Luna, Praktika and faceaiamerica examples); account medians verified with yt-dlp.
- AI backlash context: [DroneXL on DJI's deleted AI-presenter ad, Jul 2026](https://dronexl.co/2026/07/17/dji-ai-avatar-ad-mic-mini-creator-backlash/); [eMarketer on GenAI avatars](https://www.emarketer.com/content/genai-avatars-reshape-ad-production-low-costs-high-reach).
- Program and brief details (Cal AI "golden moment in 15 s, don't say the name", Flamme install rates, EVO on green screens) come from `research/formats.md` and its cited podcasts.
