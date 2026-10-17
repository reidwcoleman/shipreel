# Photo-carousel slideshows that market apps: replication recipe

*Research date: 2026-10-16. Every number below was measured from real posts I downloaded (slide JPGs from TikTok photo mode, plus MP4s for the video variants) or comes from the post's public stats. Pixel values are **normalized to a 1080 px-wide frame**. Vertical positions are **% of the image's own height**, because TikTok shows photo-mode images at full width and letterboxes them vertically. Raw downloads are in `refs/viral2/slideshow/<id>/` (git-ignored). Contact sheets and crops are in `research/viral/slideshow-sheets/`.*

Corpus: **27 photo-mode carousels from 14 accounts** (100K–7.3M views; 21 of them ≥1M) and **9 video slideshows**. I also checked 14 posts that turned out to be talking-head or skit videos and excluded them; they're listed at the end of §11.

---

## 0. TL;DR: the 12 rules that held across the hits

1. **It's a photo carousel, not a video.** Upload 1–18 still images in TikTok photo mode and add the sound in the app. The median slide count is 6. The two biggest structures sit at opposite ends: **2 slides** (Stronger 7.3M, Hevy 1.1M) and **6–7 slides** (Astra 3.9M, Cray Cray 2.1M, Lense 1.2M).
2. **The canvas is usually 3:4 (1080×1440), not 9:16.** 15 of 27 carousels used 3:4 (native 2160×2880 iPhone photos, 1080×1440, or 858×1143). Four used 4:5 (1200×1500), two used 9:16 and two used 2:3. App screenshots go in at their raw 9:16 size, status bar included, even when the other slides are 3:4.
3. **Slide 1 = one photo + one short line of text.** Hooks run 3–12 words over 1–3 lines, centered horizontally, in the **middle band of the image (25–55% of its height)**. Text never goes in the top 8% or the bottom 20%.
4. **The text is TikTok's own text tool, or a close imitation of it.** The default look is **TikTok Sans ("Classic") in white with a 3–4 px black outline**, about **52–66 px** font size (cap height 38–48 px) and about 1.23× line pitch. The other recurring looks are a **white rounded box with black text** (radius ~15 px) and **white serif text**. No gradients, no brand fonts, no motion.
5. **Photos look like they came from a phone or Pinterest, never from stock or a render.** Common subjects: feet on a gym floor, a messy kitchen counter, a wedding table, a dim street, a bedroom, an AI "before" of the same room. Many don't show a face; when a person appears, it's candid. The colour is warm, grainy, slightly underexposed, with no added filters.
6. **The app appears once, late, and looks like proof rather than an ad.** It's a raw screenshot of the app's own data (workout-history heatmap, calendar streak), a phone held in a hand showing the App Store page, or the app's output as the whole content (Astra rankings, Cray Cray question cards). Logos, phone-frame mockups and "Download now" were never the hook.
7. **Two-slide "setup → receipts" is the highest-reach structure we found.** Slide 1 is a relatable claim or quote over an anonymous photo. Slide 2 is a screenshot of the user's own data from the app, with a short punchline over it. Stronger used it 4 times for 7.3M, 3.5M, 1.2M and 1.1M; Hevy got 1.1M, 1.0M and 483K.
8. **The second-highest-reach structure is a list where every slide is the app's output.** Rankings, "zodiac as boyfriends", "people born on…", question cards. A small byline such as "BY ASTROSCOPE APP" or "@getastraapp" sits on every slide, and the last slide shows the app. This is where saves and shares concentrate: Cray Cray saved 4.2% of views and shared 2.2%; Astroscope shared 1.3%.
9. **The caption is tiny.** Either 2–6 words plus 3–5 niche hashtags ("Sundays off always #GymTok #strongerapp #workoutapp"), or hashtags only. The CTA goes in the photo-mode **title** field and is obfuscated: "BEST MATCHES 👉 ASTROSCOPE APP", "CHECK COMPATIBILITY (|ink in biо)" (with a Cyrillic "о").
10. **The sound is a trending user-uploaded edit** (sped-up, slowed, piano cover) that shows up as "original sound" by another user. It's added in the app, not baked into the file. Brands reuse one sound across a series: Stronger used the same 25 s "Mania ⚜️" sound on its 7.3M and 3.5M posts.
11. **Repeat the template with only the noun swapped.** Stronger reused "I went from zero… / To my own hero" four times with different heatmaps. Astra posted 8 rankings in 9 days, 1.3–3.9M each. Lense reused the same wedding hook three times.
12. **Use like rate to separate organic hits from boosted ones.** Organic hits sit at **3–9% likes/views**: Stronger 4.6–9.2%, Astra 5.9–6.6%, Cray Cray 7.1%, Scratch 5.9%. Several big numbers have a like rate under 1% (Yolandaro 31M at 1.2%, Hevy "Prove it" 1.0M at 0.12%, Opal 954K at 0.4%, Snugly 0.4%). Those were very likely Spark-boosted or paid, so copy their *structure* but don't take their view counts as proof the format works.

---

## 1. The six structures (what actually recurs)

| # | Structure | Slides | Examples (views) | Where the app appears | Why it works |
|---|---|---|---|---|---|
| S1 | **Setup → Receipts** (claim/quote over a photo, then the app's data screenshot) | 2 | Stronger 7.3M / 3.5M / 1.2M / 1.1M; Hevy 1.1M / 1.0M / 483K | Slide 2 = raw full-screen app screenshot (heatmap/calendar) | One swipe pays off; the screenshot is the punchline and proof |
| S2 | **App-output list** (rankings, "X as boyfriends", birthday grids, question cards) | 5–13 | Astra 3.9M / 3.8M / 3.7M; Astroscope 4.1M / 2.7M / 1.5M; Astroapp 3.1M; Cray Cray 2.1M | Byline on every slide + last slide with phone mockup + "Search 'Astra Life Advice' in the App Store" | Identity content: viewers find themselves, then save and send it |
| S3 | **Aesthetic tips list, app as the last item** | 5–14 | Lense 1.2M / 655K / 238K; Scratch 578K; Opal 444K | Last slide: real phone showing the App Store page, or an end card with an App Store badge | Useful and saveable; the app is just "the last tip" |
| S4 | **Story with a doubter** ("my landlord/nan said… so I showed her…") | 6 | Snugly 482K / 304K (Larry agent, AI images) | Named in the text on the final slide ("the app is called Snugly…") | Conflict plus before/after; the app is the twist |
| S5 | **Founder or brand story in captions** | 18 | Brick 1.4M ("OUR STORY:") | Product appears throughout; last slide "Check it out and let us know what you think!" | Underdog progress; works for hardware or new apps |
| S6 | **Meme or relatable single image / comment screenshots** | 1–15 | Opal 1.0M / 922K (single image); Co-Star 900K (3-panel meme); Stardust 635K (15 comment screenshots) | None, or only the brand account and caption | Pure reach for brand accounts; converts poorly (no app shown) |

Video-slideshow variants (§7): V1 **beat-cut photo dump** (Opal 954K), V2 **hook clip → fast app-screen montage** (Lemon8 via Yolandaro 31M / 3.2M, Leticia 3.9M), V3 **single dense still held 5–7 s** (Doof 750K, StarAstrology 662K), V4 **clip montage with one caption per cut** (Umax 1.2M, Reload 1.4M).

---

## 2. Canvas and layout specs

**Aspect ratio of the posted images (27 carousels):**
- 3:4 (2160×2880, 1080×1440, 858×1143, 1255×1674): **15**. This covers Stronger, Hevy, Astra, Astroscope, Astroapp, Brick and Stardust.
- 4:5 (1200×1500, 1200×1534): **4** (Lense ×3, Cray Cray)
- 9:16 (1080×1920 / 1080×1918): **2** (Scratch, Opal list)
- 2:3 (1024×1536, gpt-image output): **2** (Snugly)
- Other: Opal single-image memes (1:1 and 2160×2626) and the Co-Star meme (807×763)
- Inside S1, slide 2 is a **raw phone screenshot at its native size** (1178×2096, 1180×1800, 1206×2144). It is not cropped to match slide 1.

**Default for Shipreel:** render carousel slides at **1080×1440 (3:4)**, and screenshot slides at the screenshot's native 9:16 (1080×1920 or the device size). When exporting as a video, put each 3:4 slide on a 1080×1920 canvas with black bars above and below. TikTok does the same with photo mode, so it looks native.

**Where the text sits (top of the text block → bottom, % of image height):**

| Post | Text block | Lines | Notes |
|---|---|---|---|
| Stronger "I went from zero..." | 35–39% | 1 | |
| Stronger slide 2 (screenshot) | 44–52% (center) | 1 | Floats over the heatmap, between the 2024 and 2025 rows |
| Stronger "little too personal" | 32–35% | 1 | Placed left of center (center_x 621) |
| Hevy "I wish I had the discipline…" | 44–56% | 3 | |
| Hevy "I wish I had your genetics" | 29–37% | 2 | |
| Hevy slide 2 box "It was never about genetics" | 51–55% | 1 | Box sits over the calendar |
| Snugly slide 6 | 11–26% | 3 | Larry's spec says "~28% from top"; measured first line is actually at 11% |
| Snugly "nan" slide 1 | 31–40% | 2 | |
| Lense slide 1 boxes | 43–68% | 3 | Over the bride's torso, avoiding faces; position changes per slide to avoid them |
| Opal list hook | 25–31% | 2 | |
| Opal list items | 63–66% | 1 | Left-aligned, x 100–714 |
| Scratch title | 49–52% | 1 | |
| Scratch body | 39–59% | 6 | |
| Cray Cray hook | 22–36% | 3 | |
| Astroscope title | 16–31% | 2 | |
| Astra handle | 8% | – | |
| Astra title | 19–26% | 2 | |
| Astra list | 32–84% | – | Left-aligned at x≈280 |

**Rule:** center the hook block on **30–50% of the image height**, keep it inside x 54–1026 (5% side margins), and keep the bottom 20% and top 8% empty. The bottom is covered by the caption and username, and the right ~12% by the like/comment rail. Move text away from faces.

---

## 3. Text styles: exact specs (see `slideshow-sheets/text-styles-1.jpg` and `-2.jpg`)

TikTok's photo editor burns text into the image, which is why it can be measured. Six styles recur. Text is centered in every style except the list layouts (E, F).

### A. "Classic" with outline: the default (Stronger, Hevy, Brick, Umax, Reload, Cray Cray question lines)
- **Font:** TikTok Sans (the in-app "Classic" font) at Medium–Semibold weight, single-story "g". Fallbacks: Proxima Nova Semibold, or Inter SemiBold with tightened tracking (−1%).
- **Size:** cap height **38 px** (Hevy) to **48 px** (Stronger) → **font-size ≈ 52–66 px**, assuming cap height ≈ 0.72 em. Default to 54 px.
- **Line pitch:** 65 px at a 38 px cap (≈ **1.23 × font-size**). Glyph run per line ≈ 48–51 px.
- **Fill / stroke:** fill `#FFFFFF`. Stroke `#000000`, **3–4 px**, outside the glyph and round-joined. Measured: the "I" stem is 7 px wide and the black edge 3.5 px. No drop shadow.
- **Width:** lines 230–760 px wide. Wrap at **≤ 26 characters/line** (Hevy wraps "I wish I had the discipline / to hit the gym as / consistently as you").
- **Case:** sentence case. Ending with "..." is very common ("I went from zero...", "He went to work...", "Final results...").

### A2. Script-rendered heavy outline (Snugly / Larry)
- Arial/Helvetica **Bold** (double-story "a", not TikTok Sans), with a heavier stroke of **~6 px** black.
- Line pitch 88 px; glyph run 64 px → **font-size ≈ 62 px**.
- 2–3 lines, centered, ≤ 28 characters/line, lowercase allowed ("my nan said my flat / looks like a prison cell").

### B. "Classic" without stroke (Stronger yellow variant, Opal 954K, Yolandaro, Scratch body, Finch)
- TikTok Sans Regular–Medium. Either no shadow, or a soft one (0 2 4 px rgba(0,0,0,.35)).
- **Colours seen:** white; **yellow `#F0CC48`** (Stronger "I went from zero..." 3.5M: sampled fill RGB (240,204,72)); **light pink `#F8C0F8`** (Yolandaro 31M).
- **Size:** Stronger yellow cap ≈ 48 px. Scratch body **≈ 42 px font** (pitch 58, glyph run 45). Opal list **≈ 40 px** (pitch 51).
- Small text over a busy photo is fine *if* the photo is dark or moody.
- Scratch adds a **title line with a thin 2 px black outline** above the stroke-less body, separated by one blank line.

### C. White box (TikTok "text background")
- **Hevy:** box `#FFFFFF` 100%, radius **≈ 15 px**, height **80 px** for one line, horizontal padding **≈ 24–35 px**. Text is `#000` TikTok Sans Semibold at **cap 33 px (≈ 46 px font)**.
- **Lense-655k / 238K:** the same style with smaller text (~34 px font), plus an emoji at the end of the line ("…at our wedding🥰").
- **Multi-line:** each line gets **its own box sized to that line**. Boxes touch vertically with no gap, and where a narrower line meets a wider one the corners are concave. That stepped silhouette is the tell of real TikTok text; replicate it exactly.
- **Lemon8 video variant:** same idea, but the box is **~90% white** with radius ~24 px and text ≈ 44 px. It persists over the fast-cut screenshots.

### D. Serif in per-line white boxes (Lense 1.2M: the most "aesthetic" look)
- **Font:** Cormorant Garamond Medium-like (high-contrast serif), black on white boxes.
- **Size:** cap height **≈ 39 px** (font ≈ 60 px given Cormorant's small cap height ≈ 0.63 em); line pitch ≈ 73 px.
- **Boxes:** per line, padding ~16 px horizontal and ~6 px vertical, radius ~10 px. Lines touch.
- Mixes caps for emphasis ("We got SO MANY compliments…") and ends lines with "..", ":)" or a single emoji (⏰ ❤️ 🤍 🧩 💕).

### E. White serif, no box (Opal list 444K)
- **Font:** Playfair Display. Hook line 1 in *Italic*, line 2 Regular ("*Things you can do in 25 minutes* / (if you're addicted to your phone)").
- **Size:** glyph run 56–59 px → **≈ 48 px font**, tight 1.05 line pitch (60 px).
- **List items:** "1. Make a perfect pizza", same font, one per slide, left-aligned near the bottom third (63–66%) or at varying spots near the subject.

### F. Designed template (Astra, Astroscope, Astroapp, Cray Cray): not TikTok text
- **Astra:** pastel vertical gradients (lilac→periwinkle, peach→amber, mint→pale green, sky→periwinkle), changing per slide.
  - Handle "@getastraapp" at 8%, ~19 px.
  - Title in a condensed serif (Instrument Serif-like) with the key phrase in *italic* ("Most to least likely to *break your heart according to Astra*:"), ~40 px glyph run, 65 px pitch.
  - Numbered list left-aligned at x≈280, 63 px pitch.
  - The last slide is a phone mockup on the same gradient. A "So helpful" white box sticker rotated about −15° sits over the app UI.
- **Astroscope "Zodiac as boyfriends":** cover = red radial gradient + silhouette + heavy sans "ZODIAC AS BOYFRIENDS" + "BY ASTROSCOPE APP". Body slides = blush `#FBE3E3` background, bold geometric sans heading ("Gemini Boyfriend"), small "BY ASTROSCOPE APP" byline, then 5 dense justified serif paragraphs ("His love style / red flags / green flags / What he needs / His best matches: Check out your compatibility (link in bio)"). Footer: ♥ ➤ 🔖 icons as a like/share/save prompt.
- **Astroscope "people born on…":** cream `#EFEBE4` background, heavy serif "people born on" plus dates, and a 3×2 grid of **3D Apple-style emoji objects** (teddy, candle, croissant) with 3–4-line lowercase captions. One grid cell always reads "your destiny matrix is ready (link in bio)".
- **Astroapp:** a deep-red gradient table (sign × Compatibility / Sex / Marriage) filled with emoji. The last slide shows 2 phone mockups plus App Store / Google Play badges and "Check out your full compatibility on the Astroscope app (l!nk in b!o)".
- **Cray Cray:** an illustrated night-sky couple with a condensed serif hook. Each question sits on a dark rounded card (≈55% width, radius ~24) with the app name "Cray Cray 🔥" in the card footer. The last card reads "I found the questions on this free app ⤵".

**Shipreel takeaway:** implement A, B, C and D as first-class TikTok-native text presets with the numbers above. Implement F as a template family (app-output cards). Default to A for the hook and C for the screenshot punchline.

---

## 4. Slide-by-slide templates

### T1: Setup → Receipts (2 slides). Best for apps with a visual history or streak (fitness, habits, screen time, finance, journaling, reading, language)
| Slide | Image | Text (style A or B, ~36–50% height) |
|---|---|---|
| 1 | First-person candid phone photo of the *context*, faceless: feet on gym carpet, a grocery haul on a counter, a dim desk, a city skyline at dusk. 3:4, unedited, slightly dark. | The setup: either a **quote someone said to you** in curly quotes ("“I wish I had your genetics”") or a **half-sentence that demands completion** ("I went from zero...") |
| 2 | **Raw full-screen screenshot of the user's data in the app**: year heatmap or calendar, status bar kept, native resolution. Optional easter egg in the data (Stronger drew "DONT SKIP LEG DAY" in heatmap cells). | The punchline over the data: "To my own hero", "It was never about genetics" (C box), "My consistency:" |

Caption: 2–5 words in the voice of the post ("Sundays off always", "one day off", "Never about it") + `#GymTok #<brand>app #<category>app`. Sound: one trending edit, reused across the series.

### T2: App-output list (6–13 slides). Best for apps that generate personalized or identity content (astrology, personality, couples, quizzes, AI advice, food, style)
| Slide | Content |
|---|---|
| 1 | Cover: a bold claim in identity language ("ZODIAC AS BOYFRIENDS", "Most to least likely to break your heart according to Astra:"). Same template as the body, or an emotional silhouette. Byline "BY <APP>" small under the title. |
| 2–N−1 | One category per slide (one sign, one question, one date group). Dense enough to pause on (Astroscope: 5 paragraphs). Byline on every slide; optional ♥ ➤ 🔖 footer. |
| N | App slide: phone mockup of the actual feature + "Search ‘<App Name>’ in the App Store for …" or "Check out your full compatibility on the <app> app (l!nk in b!o)" + store badges. Cray Cray kept it in-template: "I found the questions on this free app ⤵". |

Photo-mode title: "BEST MATCHES 👉 <APP>" / "CHECK COMPATIBILITY (|ink in biо)". Caption: 1–4 words ("Is this you?", "What's yours?", "Who needs to hear this?", "Ranked by Astra, with love") + 2 hashtags.

### T3: Aesthetic tips list with the app as the last tip (5–7 slides)
| Slide | Image | Text |
|---|---|---|
| 1 | Emotional hero photo of the *outcome* (crying-happy bride, friends at a café table) | Brag/curiosity hook in D or E style: "We got SO MANY compliments for what we did at our wedding..", "Things you can do in 25 minutes (if you're addicted to your phone)" |
| 2–5 | One Pinterest-grade photo per tip (signage, table settings, pizza, books, shop window). The tip is ≤ 10 words, sometimes numbered "1. …". | "first, we let our guests know what to expect⏰", "Not everyone likes to dance :)", "3. Do a little retail therapy" |
| 6 | The tip that *is* the app, shown physically: a QR code sign on the table, the app screen on a phone lying in the scene | "QR-codes for guests to get disposable cameras and take pictures for a shared gallery💕", "4. Block distracted apps so you don't keep going back" |
| 7 | **A real hand holding a real phone showing the App Store page** (photographed, not a mockup) | "Everyone LOVED looking back at all the lovely pictures we all took🫶" + second box "This is the app, more info in bio" / "App: Lense" / "I linked it in my bio if you're curious!" |

Caption: hashtags only (`#bride #2026bride #weddingplanning #weddingtrends`). Title field: "Our guests were OBSESSED with the disposable camera app for our wedding!"

### T4: Doubter story (6 slides; Snugly/Larry). Best for visual-transformation apps (AI room, hair, makeup, filler, outfit, garden)
| Slide | Image | Text (A2, top or middle third) |
|---|---|---|
| 1 | The real "before" (an ordinary or ugly room, phone photo) | "My landlord said I can't change anything" / "my nan said my flat looks like a prison cell" |
| 2 | Same before | "So I showed her what AI thinks it could look like" / "she's not wrong but I literally can't afford to fix it" |
| 3 | AI "after" #1, **same camera angle and layout** | "She was like... wait that's actually nice" |
| 4 | After #2 (different style) | "Then I showed her this one" |
| 5 | After #3 | "She said okay fine let's do it" |
| 6 | Best after | "The Snugly app helped me convince her to finally get our kitchen done" / "the app is called Snugly and my nan wants it on her phone immediately" |

Caption: a long first-person story repeating the hook and naming the app twice. Keep the after images structurally identical to the before; Larry locked the layout in the prompt.

### T5: Founder story (10–18 slides, Brick 1.4M)
"OUR STORY: We used our phones way too much…" → "Apple Screen Time just didn't work" (screenshot) → "A flip phone was too impractical" → "So we decided to start building a solution ourselves" → sketches → "We started coding an app" → prototypes → "Got feedback, continued making it better" → "Got our first sale!" → "Started getting more sales" → "Perfected the design" → "Check it out and let us know what you think!" Every slide uses style A over real build photos, 2 lines max, with text placed across 30–90% of the height.

---

## 5. How the app gets in without feeling like an ad (ranked by how often it worked)

1. **Your own data as the punchline** (S1): the screenshot proves the claim. Keep the status bar, the real numbers and the app's normal UI. No mockup frame.
2. **The app's output is the content** (S2): rankings, cards, compatibility tables. The brand is only a byline ("BY ASTROSCOPE APP", "@getastraapp", "Cray Cray 🔥" in the card footer), plus one end slide.
3. **A physical phone in a real scene** (S3): a hand holding an iPhone on the App Store listing, or the app screen on a phone lying on a café table. A photographed phone looks native, while a rendered mockup reads as an ad.
4. **The last line names it in first person**: "The Snugly app helped me…", "I found the questions on this free app", "This is the app, more info in bio", "App: Lense".
5. **Obfuscated CTA in the title or slide**: "(|ink in biо)", "(l!nk in b!o)", "BEST MATCHES 👉 ASTROSCOPE APP". Never a URL.
6. **No app at all** (S6, Opal/Co-Star/Stardust memes): good reach for brand accounts, weak for installs. Stardust's only insertion is its "Stardust Cycle Tracker · Creator" replies showing in the comment screenshots.

Never seen on a hit: a logo on slide 1, "Download now", feature bullet lists, App Store screenshot banners with marketing headlines, glossy 3D renders of phones, or a brand colour wash over photos.

---

## 6. Hook bank (verbatim from the posts, with formulas)

**Setup → payoff (2-slide)**
1. "I went from zero..." → "To my own hero" (Stronger 7.3M / 3.5M / 1.2M / 1.1M)
2. "“I wish I had the discipline to hit the gym as consistently as you”" → "My consistency:" (Hevy 1.1M)
3. "“I wish I had your genetics”" → "It was never about genetics" (Hevy 483K)
4. "Show me how consistent you are at the gym" (Hevy 1.0M; boosted)
   - *Formula:* **“[compliment/envy someone said to me]” → [the app data that disproves "luck"]**; or **"I went from [low]..." → "[to high]"** over a heatmap.

**Identity list**

5. "Most to least likely to break your heart according to Astra:" (3.9M)
6. "Most to least likely to experience love at first sight:" / "Shows hurt without saying it:" / "Guilty pleasures:" (Astra 3.7M)
7. "Most likely to live a double life:" / "Most unexpected turn-ons:" / "Ideal first dates:" (Astra 3.8M)
8. "ZODIAC AS BOYFRIENDS" (Astroscope 4.1M) / "[Sign] Boyfriend" (2.7M)
9. "people born on 2 / 12 / 13 / 14 / 16 / 18" (Astroscope 1.5M)
10. "5 cute questions you have to ask them" (Cray Cray 2.1M; title "His answers were sooo cute 🥹")
    - *Formula:* **"Most to least likely to [emotional behaviour]"**, **"[group] as [relationship role]"**, **"people born on [dates]"**, **"N [adjective] questions to ask [person]"**.

**Brag or curiosity list**

11. "We got SO MANY compliments for what we did at our wedding.." (Lense 1.2M; title "Our guests were OBSESSED with the disposable camera app for our wedding!")
12. "Our guests didn't expect the last one to work.." (Lense 238K, title)
13. "Things you can do in 25 minutes (if you're addicted to your phone)" (Opal 444K)
14. "12 Golf Tips For Beginners" (Scratch 578K)
    - *Formula:* **"We got SO MANY compliments for [what we did at X].."**, **"Things you can do in [N] minutes (if you're [problem])"**, **"[N] [niche] tips for beginners"**, **"[audience] didn't expect the last one to work.."**

**Doubter story**

15. "My landlord said I can't change anything" (Snugly 482K)
16. "my nan said my flat looks like a prison cell" (Snugly 304K)
17. Caption hooks: "my sister came over and literally said 'this looks like a hospital bathroom' 💀" (175K), "I showed my nan what AI thinks her living room could look like" (206K)
    - *Formula:* **"My [authority/relative] said [harsh verdict]" → "so I showed [them] what AI thinks…" → reaction → "the app is called X"**.

**Founder or underdog**

18. "OUR STORY: We used our phones way too much" (Brick 1.4M)

**Relatable or meme (brand reach)**

19. "Me checking my screen time like it's a horror movie" (Opal 1.0M)
20. "propaganda I AM falling for" + 5-line list (Opal 954K, video)
21. "unhinged and unfortunate things men have said about periods (part two)" (Stardust 635K)
22. "my brain in math: / my brain in science: / My brain when someone tells me their big three:" (Co-Star 900K)
23. "people with this diet... aren't on a diet" (Doof 750K)

**Video-variant hooks**

24. "You look happier. / Thanks, I found the best girly app." (Yolandaro 31M; boosted)
25. "'girl sry we have to reschedule'" → "Lemon8, im coming" (3.2M)
26. "Probably needed a hug" → "So I glowed up instead after being inspired by a random Lemon8 ad" (3.9M)
27. "My bro needed to glow up..." → "So I gave him the ultimate method" → "He went to work..." → "Final results..." (Umax 1.2M)
28. "I was g**ning 10 times a day until..." → "I found this app" → "It has helped me and thousands of others through addiction" → "The name of the app is 'RELOAD'" (Reload 1.4M)

**Most reusable formulas:**
1. "I went from [zero]..." / "[to my own hero]"
2. "“[Envious thing people say to me]”" / "[It was never about X]"
3. "Most to least likely to [X] according to [App]:"
4. "[Category] as [boyfriends/roommates/moms]"
5. "people born on [dates]"
6. "N cute questions you have to ask [them]"
7. "We got SO MANY compliments for [X].."
8. "Things you can do in N minutes (if you're [problem])"
9. "N [niche] tips for beginners"
10. "My [landlord/nan/mum] said [verdict]"
11. "[audience] didn't expect the last one to work.."
12. "OUR STORY: [problem we had]"
13. "[thing] I AM falling for" (propaganda/green-flags list)
14. "Me checking [metric] like it's a horror movie"
15. "[group] with this [habit]... aren't [stereotype]"
16. "My bro needed to [glow up]..." → "Final results..."

---

## 7. Video-slideshow variants: exact timings (720×1280 @ 30 fps sources)

| Variant | Example | Structure and timing (measured by scene detection) |
|---|---|---|
| **V1 beat-cut photo dump** | Opal "propaganda I AM falling for" 954K, 9.9 s | **32 photos in 9.9 s: median 0.27 s per photo** (range 0.23–0.33; one 1.1 s hold early). Hard cuts, no transitions, no zoom. Frame 1 is a phone showing Opal's block screen, so the app is in frame 1. One **static text block for the whole video**: title, blank line, 5 list lines, centered at 41–59% of screen height, style B white ~40 px font, 51 px pitch. Photos are moody street, beach and sunset "film" shots with varied grading. |
| **V2 hook clip → app montage** | Yolandaro "You look happier…" 31M (19 s); Lemon8 "Probably needed a hug" 3.9M (13.3 s); "girl sry we have to reschedule" 3.2M (14.8 s) | **Hook clip 2–12 s** of a person doing a trend dance or reaction, with 1–3 lines of B text (white or pink). Optionally a second "after" clip of 3.6–5 s. Then **7–20 app screenshots or screen-recording frames at 0.33–0.5 s each** (Yolandaro median 0.37 s; "reschedule" median 0.47 s), with a **persistent C-style box**: "I followed these easy glow up routine on Lemon8, and you can do it too!" / "Lemon8 is the 1st girly app for fashion and beauty inspos. Download it rn!💕" |
| **V3 single still as video** | Doof 750K (5.2 s); StarAstrology "Venus Retrograde For Each Sign!" 662K (7.3 s) | One dense image held 5–7 s, with a ~0.5 s fade-in from black on Doof. Doof: white header band with black text "people with this diet... / aren't on a diet" over a 2×2 food-photo grid with small white per-photo labels. Short length plus a dense image makes viewers loop or pause. |
| **V4 clip montage, one caption per cut** | Umax 1.2M (17 s, segments 1.5–5 s); Reload 1.4M (29 s, median 1.1 s) | The story advances one caption per cut in style A or B, mid-screen ("My bro needed to glow up..." → app ratings screen → "Final results..."). The app screen is filmed on a phone, not screen-captured. |

If Shipreel exports a photo carousel as an MP4, use **2.5–3.5 s per slide** for text-heavy slides and a **0.27–0.37 s** cut cadence for V1 and V2 montages, locked to the beat. The per-slide hold is my recommendation: TikTok's own auto-advance timing can't be measured from downloads.

---

## 8. Photo sourcing and aesthetic

- **Faceless or candid first-person:** feet, hands, a counter, a gym floor (Stronger, Hevy). Candid people only when the subject *is* emotion (crying bride, hugging couple).
- **Pinterest-grade lifestyle shots** for S3: wedding signage, table settings, food flat-lays, bookshop windows, golf fairways. Natural light, shallow depth, warm or neutral grading. Multiple accounts reused the same image set across posts (Lense ×3).
- **The real "before" + AI "after"** for transformation apps: same angle, same lens, layout locked (Snugly used gpt-image 1024×1536).
- **Moody "film" city and nature photos** for V1: underexposed, teal/orange, grainy.
- **Raw screenshots:** native resolution with the status bar; dark mode looks better (Stronger and Hevy heatmaps on black). Don't add device frames.
- **Avoid:** stock-photo polish, obvious AI faces, brand colour overlays, borders, collage frames (except Doof's 2×2 grid), and text on top of faces.

---

## 9. Caption, title, hashtags, CTA, sound

- **Photo-mode title** (TikTok's separate title field above the caption): hook restatement or CTA. Examples: "Our guests were OBSESSED with the disposable camera app for our wedding!", "12 Golf Tips For Beginners", "BEST MATCHES 👉 ASTROSCOPE APP", "CHECK COMPATIBILITY (|ink in biо)", "His answers were sooo cute 🥹", "This is your exit. Take it."
- **Caption:** 2–6 words in the voice of the post, or hashtags only. The exception is S4 (Snugly): a long first-person story naming the app twice.
- **Hashtags:** 2–5, niche first, then brand (`#GymTok #strongerapp #workoutapp`; `#astrology #zodiacsigns #zodiacs`; `#golf #golftips #golfswing #beginner #golflife`). No `#fyp` on the best performers. Astroapp and Doof used `#fyp`/`#foryou` and still hit, so it's not harmful, just unnecessary.
- **Sound:** a trending user-uploaded edit (sped-up song, slowed reverb, piano cover, mashup) labelled "original sound" by a third-party account, between −25 and −9 dB mean loudness. Named tracks seen: "where is my mind (piano version)", "until i found you", "Rein Me In" (Sam Fender & Olivia Dean), "100" by Dean Blunt, "my kynda love", "tulsa jesus freak x cinnamon girl mashup ldr". The sound is added in the TikTok app after upload. Reuse one sound across a series.
- **Engagement prompts in the design:** ♥ ➤ 🔖 footer icons (Astroscope), "send this to…", "Is this you?", "What's yours?", "Who needs to hear this?"

---

## 10. Do / Don't

**Do**
- Default to 3:4 slides, TikTok Sans with a black outline, and the text block centered at 30–50% height.
- Make slide 1 a single photo plus ≤ 12 words. Make the last (or second) slide the proof: a real screenshot, a real phone, or real app output.
- Keep a byline on every slide for app-output lists.
- Build series: lock the template, swap the noun or data, and post daily.
- Show the app's *real* UI and numbers. Easter eggs in the data get comments (Stronger's "DONT SKIP LEG DAY" heatmap).
- Use per-line stepped white boxes (C/D) when the photo is busy or light.
- Put the CTA in the title or the last slide, with "link in bio" obfuscated.

**Don't**
- Don't put the logo or app name on slide 1, don't open with features, and don't write "Download now".
- Don't use mockup frames, gradient overlays, motion graphics, brand fonts or animated captions on carousels.
- Don't put text in the bottom 20% or over faces. Don't use more than 3 lines on a hook slide.
- Don't use 9:16 crops of horizontal stock photos. Don't stretch screenshots to 3:4.
- Don't copy view counts from boosted posts (like rate < 1%) as evidence; copy organic structures.

---

## 11. Every example

Like/save/share are % of views. **⚑ = like rate < 1%, so probably boosted or low-quality reach.** Img = number of photo-mode slides (0 = video).

### Photo-mode carousels (in scope)
| id | URL | Account (followers) | Views | Like / Save / Share % | Img | Hook (slide 1 text) | App placement and notes |
|---|---|---|---|---|---|---|---|
| stronger-sundays | https://www.tiktok.com/@strongermobile/video/7658008519278546198 | @strongermobile (77K) | 7.3M | 4.6 / 0.21 / 0.04 | 2 | "I went from zero..." | S1; slide 2 = light-mode Workout History heatmap 2022–26, "To my own hero"; style A; caption "Sundays off always" |
| stronger-onedayoff | https://www.tiktok.com/@strongermobile/video/7662086095538048259 | @strongermobile | 3.5M | 9.2 / 0.42 / 0.11 | 2 | "I went from zero..." (yellow, no stroke) | S1; dark-mode heatmap; style B yellow |
| stronger-personal | https://www.tiktok.com/@strongermobile/video/7658384779410246934 | @strongermobile | 1.2M | 9.0 / 0.23 / 0.20 | 2 | "I went from zero" | S1; heatmap cells spell "DONT SKIP LEG DAY" |
| stronger-everyworkout | https://www.tiktok.com/@strongermobile/video/7660592786688740630 | @strongermobile | 1.1M | 7.4 / 0.22 / 0.12 | 2 | "I went from zero..." | S1; green heatmap with STRONGER wordmark |
| hevy-1m1 | https://www.tiktok.com/@hevyapp/video/7568922689679772950 | @hevyapp (26K) | 1.1M | 4.2 / 0.24 / 0.04 | 2 | "“I wish I had the discipline to hit the gym as consistently as you”" | S1; slide 2 calendar heatmap + "My consistency:" |
| hevy-1m ⚑ | https://www.tiktok.com/@hevyapp/video/7587480839592611094 | @hevyapp | 1.0M | 0.12 / 0.01 / 0.00 | 1 | "Show me how consistent you are at the gym" | Gym mirror selfie only; boosted |
| hevy-483k ⚑ | https://www.tiktok.com/@hevyapp/video/7598583347853511958 | @hevyapp | 483K | 0.45 / 0.03 / 0.01 | 2 | "“I wish I had your genetics”" | S1; slide 2 calendar (78-week streak) + white box "It was never about genetics" (style C) |
| astra-ranked | https://www.tiktok.com/@getastraapp/video/7343668794772163886 | @getastraapp (20K) | 3.9M | 6.6 / 0.61 / 0.07 | 6 | "Most to least likely to break your heart according to Astra:" | S2; pastel gradients; last slide phone mockup "Personalized guidance for your unique journey." |
| astra-whatsyours | https://www.tiktok.com/@getastraapp/video/7340694416954477870 | @getastraapp | 3.8M | 6.3 / 0.58 / 0.02 | 6 | "Most likely to live a double life:" | S2; last slide app UI + rotated "So helpful" box |
| astra-isthisyou | https://www.tiktok.com/@getastraapp/video/7341070399720967466 | @getastraapp | 3.7M | 5.9 / 0.51 / 0.03 | 6 | "Most to least likely to connect with animals spiritually:" | S2; last slide "Search 'Astra Life Advice' in the App Store…" |
| astroscope-4m | https://www.tiktok.com/@astroscope/video/7573064073093385494 | @astroscope (2.0M) | 4.1M | 3.8 / 1.09 / 1.29 | 13 | "ZODIAC AS BOYFRIENDS" | S2; byline on every slide; "His best matches: Check out your compatibility (link in bio)"; title "BEST MATCHES 👉 ASTROSCOPE APP" |
| astroscope-2m7 | https://www.tiktok.com/@astroscope/video/7571216886441069846 | @astroscope | 2.7M | 4.3 / 0.91 / 0.86 | 13 | (same template, different sign set) | S2 |
| astroscope-1m5 | https://www.tiktok.com/@astroscope/video/7555189623396240662 | @astroscope | 1.5M | 2.2 / 0.45 / 0.21 | 5 | "people born on 2/12/13/14/16/18" | S2; 3D-emoji grid; one cell "your destiny matrix is ready (link in bio)"; title "GET DESTINY MATRIX (\|ink in biо)" |
| astroapp-3m | https://www.tiktok.com/@astroapp/video/7502526074035637547 | @astroapp (45K) | 3.1M | 2.1 / 0.36 / 0.10 | 7 | Compatibility emoji table "Aries and…" | S2; last slide 2 mockups + store badges "(l!nk in b!o)"; sound "my kynda love" |
| craycray-2m1 | https://www.tiktok.com/@craycrayquestions71/video/7479574833571892522 | @craycrayquestions71 (7K) | 2.1M | 7.1 / **4.17** / **2.18** | 6 | "5 cute questions you have to ask them" | S2; question cards with the "Cray Cray 🔥" footer; last card "I found the questions on this free app ⤵"; piano cover |
| brick-1m4 | https://www.tiktok.com/@getbrick/video/7308046646221344042 | @getbrick (9K) | 1.4M | 0.9 / 0.15 / 0.04 | 18 | "OUR STORY: We used our phones way too much" | S5 founder story, style A |
| lense-1m2 | https://www.tiktok.com/@lense.app/video/7587759380997672225 | @lense.app (14K) | 1.2M | 3.9 / 1.94 / 0.51 | 7 | "We got SO MANY compliments for what we did at our wedding.." | S3; serif per-line boxes (D); last slide phone App Store page "This is the app, more info in bio" |
| lense-655k ⚑ | https://www.tiktok.com/@lense.app/video/7510322332116765974 | @lense.app | 655K | 0.7 / 0.67 / 0.31 | 6 | "We got SO MANY compliments for what we did at our wedding🥰" | S3; Classic in white boxes (C); last slide phone App Store "All made possible with this app❤️ / I linked it in my bio if you're curious!" |
| lense-238k | https://www.tiktok.com/@lense.app/video/7677330200291478817 | @lense.app | 239K | 2.5 / 1.61 / 0.66 | 7 | Same hook (reused Aug 2026); title "Our guests didn't expect the last one to work.." | S3; last slide phone gallery "App: Lense" |
| scratch-578k | https://www.tiktok.com/@scratch.ai/video/7659912621218352397 | @scratch.ai (10K) | 579K | 5.9 / 1.24 / 0.59 | 14 | "12 Golf Tips For Beginners" | S3; 9:16; style B; last slide "Pro golfers have caddies. With Scratch AI, so do you." + App Store badge |
| opal-anyrec ⚑ | https://www.tiktok.com/@opal/video/7564463679215914262 | @opal (11K) | 445K | 0.6 / 0.08 / 0.01 | 5 | "Things you can do in 25 minutes (if you're addicted to your phone)" | S3; Playfair serif (E); slide 5 "4. Block distracted apps…" with the Opal screen on a phone on a desk |
| snugly-landlord ⚑ | https://www.tiktok.com/@snugly.app/video/7605358179316157718 | @snugly.app (1.4K) | 483K | 0.4 / 0.05 / 0.01 | 6 | "My landlord said I can't change anything" | S4; AI after-images; A2 text; app named on slide 6 |
| snugly-nan ⚑ | https://www.tiktok.com/@snugly.app/video/7612206325409352982 | @snugly.app | 304K | 0.4 / 0.10 / 0.01 | 6 | "my nan said my flat looks like a prison cell" | S4; "the app is called Snugly and my nan wants it on her phone immediately"; sound "Rein Me In" |
| opal-1m | https://www.tiktok.com/@opal/video/7473550803891014934 | @opal | 1.0M | 2.1 / 0.06 / 0.05 | 1 | "Me checking my screen time like it's a horror movie" | S6 single meme; no app shown |
| opal-921k | https://www.tiktok.com/@opal/video/7488034707918179606 | @opal | 922K | 2.3 / 0.12 / 0.03 | 1 | (photo of a sign "THIS IS THE POINT WHERE YOU CLOSE THE APP…"); title "This is your exit. Take it." | S6 |
| costar-900k | https://www.tiktok.com/@costarastrology/video/7290602876282506542 | @costarastrology (352K) | 900K | 15.6 / 1.05 / 1.93 | 3 | "my brain in math:" | S6 3-panel meme; no app |
| stardust-635k | https://www.tiktok.com/@stardust.app/video/7665364041681898765 | @stardust.app (135K) | 635K | 12.6 / 0.60 / 0.93 | 15 | "unhinged and unfortunate things men have said about periods (part two)" | S6; selfie cover + 14 comment screenshots; brand visible only as "Creator" replies |

### Video slideshows (variant)
| id | URL | Account | Views | Like % | Dur | Hook | Notes |
|---|---|---|---|---|---|---|---|
| opal-propaganda ⚑ | https://www.tiktok.com/@opal/video/7564773002391342358 | @opal | 954K | 0.4 | 9.9 s | "propaganda I AM falling for" | V1: 32 photos at 0.27 s |
| yolandaro-31m | https://www.tiktok.com/@yolandaro/video/7658125436743994654 | @yolandaro (9K) | 31.1M | 1.2 | 19 s | "You look happier. / Thanks, I found the best girly app." | V2: 12 s dance → 0.37 s Lemon8 screenshots; ByteDance's own app, almost certainly paid or boosted |
| yolandaro-canceled ⚑ | https://www.tiktok.com/@yolandaro/video/7652567857049505054 | @yolandaro | 3.2M | 0.7 | 14.8 s | "'girl sry we have to reschedule'" → "Lemon8, im coming" | V2: 0.47 s cuts |
| yolandaro-11m ⚑ | https://www.tiktok.com/@yolandaro/video/7652604844347264287 | @yolandaro | 11.3M | 0.8 | 14.8 s | date-night makeup | V2-like |
| lemon8-3m9 | https://www.tiktok.com/@leticialeedaily/video/7490901800887881003 | @leticialeedaily | 3.9M | 1.4 | 13.3 s | "Probably needed a hug" | V2: before/after clip → search-results montage with box text |
| doof-750k | https://www.tiktok.com/@doof.app/video/7485847107870493958 | @doof.app (162) | 750K | 3.4 | 5.2 s | "people with this diet... aren't on a diet" | V3: still 2×2 food grid; 162-follower account |
| starastro-venus ⚑ | https://www.tiktok.com/@starastrologyyy/video/7691909205271301407 | @starastrologyyy | 662K | 0.8 | 7.3 s | "Venus Retrograde For Each Sign!" | V3: dense 12-sign still with black text boxes |
| umax-1m2 | https://www.tiktok.com/@umax.app/video/7326971975946063146 | @umax.app | 1.2M | 4.0 | 17 s | "My bro needed to glow up..." | V4 |
| reload-1m4 ⚑ | https://www.tiktok.com/@reload.apps/video/7610576715240328461 | @reload.apps (326) | 1.4M | 0.4 | 29 s | "I was g**ning 10 times a day until..." | V4: 1.1 s cuts; app filmed on a phone |

### Checked and excluded (not slideshows: talking head, skit, animation or screen recording)
BeFreed/@improvewithkate (893K, 480K), BePresent (7.7M, 1.6M, 1.4M), Unrot (343K, 123K), Finch (813K, 529K, animated meme), CoupleJoy (1.1M, screen recording), Crystal Chavis top-5 apps (699K, talking head), Zaraidonaire apps (358K), Splashaffects app lists (117K, 189K), @https.brunettecore "apps every girl needs" (193K: typewriter text plus **App Store share-sheet cards**, which are worth borrowing as an insert), Ignite (427K), Study Whailey (453K), evel.mov (4.0M, 1.2M). Folders for these are still in `refs/viral2/slideshow/`.

---

## 12. Implementation checklist for Shipreel

1. **Output a ZIP of numbered slides** (`01.jpg`…) at 1080×1440. Screenshot slides go in at native 9:16. Add an optional MP4 export (letterboxed 1080×1920, 2.5–3.5 s per slide), plus a "pick a trending sound in-app" reminder.
2. **Text renderer presets:** A, A2, B, C, D, E with the numbers in §3. C and D must support **per-line boxes with stepped concave corners** and an emoji at the end of a line.
3. **Template engine for T1–T5**, and an S2 "app-output card" designer (gradient or plain backgrounds, serif + italic title, byline, ♥ ➤ 🔖 footer, end slide with a real-UI phone and store badges).
4. **Image sourcing modes:** user camera-roll photos (best), a Pinterest-style library, AI "before/after" with locked layout, and the user's own app screenshots (real data, dark mode preferred).
5. **Hook generator** seeded with the 16 formulas in §6. Enforce ≤ 12 words, ≤ 3 lines and ≤ 26 characters per line on hook slides.
6. **Post kit:** title-field text (obfuscated link-in-bio), a 2–6-word caption, 2–5 niche hashtags, and a pinned-comment suggestion.
7. **Series mode:** one template, N variants with the noun or data swapped, one reused sound, posted daily.

Contact sheets for every in-scope example are in `research/viral/slideshow-sheets/<id>.jpg`. Text-style crops with labels are in `text-styles-1.jpg` and `text-styles-2.jpg`.
