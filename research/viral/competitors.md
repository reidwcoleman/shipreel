# What the competitors actually output: formats, construction rules and feedback loops

*Research date: 2026-10-17. Scope: what ReelFarm, Larry/LarryLoop, Genviral, Volume, Fastlane, Blotato, Postiz-based agents, Hooked, Arcads, MakeUGC, TopView, Higgsfield, Virlo, viral.app, Post Bridge and the smaller tools **produce**, and the rules they encode. The goal is to let an engineer copy the formats. Pricing, complaints and positioning are in `research/landscape.md` and are not repeated here. Measured carousel geometry from real posts is in `slideshow.md`, human-UGC beat sheets are in `ugc.md` and `screendemo.md`, and install evidence is in `strategy.md`.*

**Evidence tags**
- **[first-hand]**: I read the primary artifact myself, such as the skill's source files, the API reference or the operator's own write-up. Downloaded copies are in `refs/competitors/` (git-ignored).
- **[vendor]**: the vendor's own marketing claim.
- **[secondary]**: a third-party write-up.
- **[unverified]**: my inference, or a claim with no checkable source.

Every view or revenue number is **self-reported** unless it says otherwise.

---

## 0. TL;DR: 14 patterns that recur in the competitors' output

1. **Six slides is the agent default.** Larry, its forks, Genviral's person-conflict template and Volume's golf example all use six slides: hook → problem → discovery → result ×2 → CTA. ReelFarm and Genviral default to **5** for listicles, and the number in the hook sets the length ("5 habits" = hook + 5 body slides). Sources: [Larry slide-structure](https://github.com/Upload-Post/upload-post-larry-marketing-skill/blob/HEAD/references/slide-structure.md), [Genviral slideshow prompts](https://github.com/fdarkaou/genviral-skill/blob/HEAD/docs/prompts/slideshow.md), [ReelFarm hooks guide](https://reel.farm/guides/tiktok-slideshow-hook-ideas). [first-hand]
2. **Larry's spec is the reference implementation that others copy.** Portrait 1024×1536, `gpt-image-1.5`, white bold text with a black stroke at 15% of the font size, font size 7.5/6.5/5% of the image width by word count, block centred at about 28% from the top, wrapping at 75% of the width, 4–6 words per line, no emoji ([Upload-Post fork SKILL.md](https://github.com/Upload-Post/upload-post-larry-marketing-skill/blob/HEAD/SKILL.md)) [first-hand]. Measured Snugly posts put the first line higher, at about 11% (`slideshow.md` §2).
3. **The top hook formula is "[other person] + [doubt] → showed them [app/AI] → they changed their mind."** Larry's three best posts (234K, 167K, 147K) all follow it. App-focused or price hooks got 879–2,671 views ([Oliver's article, reposted](https://youmind.com/landing/x-viral-articles/viral-tiktok-ai-agent-guide)) [self-reported]. Genviral's skill ranks it as the best formula and suggests 40% of the content mix ([formulas.md](https://github.com/fdarkaou/genviral-skill/blob/HEAD/workspace/hooks/formulas.md)) [first-hand].
4. **Consistency comes from locking the prompt, not from luck.** Write one base description and reuse it on every slide. Lock the subject, camera angle, lighting, background and structure, and vary only the style, colour, decor or expression ([Larry](https://github.com/Upload-Post/upload-post-larry-marketing-skill/blob/HEAD/references/slide-structure.md)). For people, OpenQuok adds a LOCKED/VARIATIONS JSON profile plus face_lock/body_lock reference images that are attached to every request ([character-lock.md](https://github.com/Ratimon/openquok-monorepo/blob/HEAD/agent/skills/openquok-tiktok-slideshow/references/character-lock.md)). [first-hand]
5. **Most tools never put an AI image under the text.** ReelFarm and Volume build slides from **image collections**: 9–15 hand-picked Pinterest or Tumblr images, with separate libraries for hook, body and CTA images, and a dark overlay at 20–30% under the text ([ReelFarm guide](https://reel.farm/guides/automate-tiktok-slideshows-with-ai), [Volume guide](https://tryvolume.app/guides/first-campaign)). Pedro Pérez's agent pulls about 80% of its images from Pinterest, mostly without faces ([Postiz](https://postiz.com/blog/ai-ugc-tiktok-slideshows-26m-views-gpt-6-postiz)). [first-hand/vendor]
6. **The listicle is the volume workhorse, and the product goes in as one list item or the final slide.** ReelFarm's hook library covers listicles, "things I learned", rules/guides, contrarian takes and niche hooks. It puts the product "as one item in the list rather than the headline" and says to use lowercase, small, left-aligned text ([ReelFarm](https://reel.farm/guides/tiktok-slideshow-hook-ideas)). [vendor]
7. **The CTA slide is optional and its position is randomised.** ReelFarm shipped "random CTA slide from an image collection" and "CTA slide at a random position", and says many successful pages skip the CTA slide altogether ([changelog](https://reel.farm/changes), [guide](https://reel.farm/guides/automate-tiktok-slideshows-with-ai)). Larry rotates its slide-6 CTAs between "link in bio", "Search [App] on the App Store", "free to try" and name-only. [first-hand]
8. **Posts go to TikTok as drafts and a human adds a trending sound.** Larry posts as `SELF_ONLY`, LarryLoop says "Draft gets better reach", and Volume recommends drafts while a new account warms up. The reason is the same everywhere: the API can't pick a trending sound, and "silent slideshows look like ads" ([Larry](https://github.com/Upload-Post/upload-post-larry-marketing-skill/blob/HEAD/references/slide-structure.md), [LarryLoop docs](https://larryloop.com/docs/content-scheduling), [Volume](https://tryvolume.app/guides/first-campaign)). [first-hand]
9. **Cadence is 1–3 posts a day at fixed times.** Larry posts 3/day at 07:30, 16:30 and 21:00. ReelFarm suggests 1–2/day for the first two weeks, then 1–3/day. ashen's agent posted 3/day at 9:00, 12:00 and 17:00 EST. LarryLoop's plans are sized at 1, 3 or 10 posts a day. All of them batch-generate a week ahead. [first-hand/vendor]
10. **The loop is a 2×2 of views against conversions, plus view thresholds.** The 2×2 is Larry's: scale / fix CTA / fix hook / reset, plus "app issue" when downloads don't become subscribers. The thresholds: 50K+ → 3 variants; 10–50K → keep; 1–10K → one more try; <1K twice → drop. Genviral swaps conversions for engagement rate. LarryLoop scores views 50%, engagement 30% and download clicks 20%, and kills losers weekly. Pedro clones at >10–15K and kills at <3K. (§5)
11. **Change one variable at a time, and only on slide 1.** Same hook with a different person ("landlord" → "mum" → "boyfriend"), same structure in a different room, proven images with new text ([Larry analytics-loop](https://github.com/Upload-Post/upload-post-larry-marketing-skill/blob/HEAD/references/analytics-loop.md)). viral.app says to hold the hook style, layout, emotion and CTA fixed and vary the wording, people, visuals and sound ([viral.app](https://viral.app/ugc-course/brands/viral-formats)). [first-hand]
12. **AI-UGC video is built as three beats: creator hook → screen demo → creator close.** The demo enters "right when the script starts talking about the app" ([Hooked](https://www.hooked.so/tools/app-demo-ugc-video-generator)). viral.app's timed version: face plus text overlay at 1–3 s, screen recording at 4 s, CTA at 25 s ([viral.app](https://viral.app/ugc-course/brands/viral-formats)). Variants keep one screencast and swap the hook or the creator. [vendor]
13. **Hook + demo is now sold as a commodity format.** ReelFarm ("hook demo" with UGC hooks), Fastlane ("slideshows, wall-of-text, hook + demo, memes"), Hooked, TopHooks and RE/UGC (a library of 182+ reaction clips you edit onto your own demo) all sell it ([Fastlane](https://www.usefastlane.ai/for/mobile-apps), [RE/UGC listing](https://www.stork.ai/en/re-ugc)). Practitioners report the shocked-face version is fatiguing (`hooks.md` #17). [vendor/secondary]
14. **Template libraries carry most of the value.** Named format libraries: Volume (Fade Cover, Quiet List, Photo Dump, Manifesto, X Post, Story Thread, Numbered Essay, Quote Cards, Science Breakdown, Photo Grid, and others), Blotato (tweet cards, quote cards, tutorial carousels, "When X then Y", 21 "infographic" scenes), Fastlane static ads (Chalkboard, Car yapper, Breaking news, Text on body…) and Genviral's 6 prompt templates ([Volume](https://tryvolume.app), [Blotato catalogue](https://help.blotato.com/rest-api-reference/visuals.md), [Fastlane](https://usefastlane.ai)). [vendor]

---

## 1. Per-tool sections

### 1.1 Larry (Oliver Henry's OpenClaw skill) and its forks
Sources: [ClawHub](https://clawhub.ai/olliewazza/skills/larry); the [Upload-Post fork](https://github.com/Upload-Post/upload-post-larry-marketing-skill), whose SKILL.md and references I read in full; [OpenQuok fork](https://github.com/Ratimon/openquok-monorepo/tree/main/agent/skills/openquok-tiktok-slideshow); [Oliver's X article (repost)](https://youmind.com/landing/x-viral-articles/viral-tiktok-ai-agent-guide); [Stack Junkie](https://www.stack-junkie.com/blog/how-to-automate-tiktok-marketing-with-openclaw-larry-skill-deep-dive) [secondary]; [Postiz write-up](https://postiz.com/blog/ai-agent-tiktok-views-postiz-api) [vendor].

**Formats.** One format only: a 6-slide AI-photo photo-mode carousel, with "same subject, same angle, different styles". Video is "supported but not battle-tested" (SKILL.md). [first-hand]

**Slide-by-slide** ([slide-structure.md](https://github.com/Upload-Post/upload-post-larry-marketing-skill/blob/HEAD/references/slide-structure.md)) [first-hand]:

| Slide | Role | Text example |
|---|---|---|
| 1 | Hook | "I showed my landlord / what AI thinks our / kitchen should look like" |
| 2 | Problem | "She said you can't / change anything / challenge accepted" |
| 3 | Discovery | "So I downloaded / this app and / took one photo" |
| 4 | Transformation 1 | "Wait... this actually looks good?" |
| 5 | Transformation 2 | "Okay I'm obsessed" |
| 6 | CTA | "Snugly showed me what's possible / link in bio" |

**Text renderer** (node-canvas, from SKILL.md) [first-hand]:
- Font: `bold Arial`.
- Size by word count: ≤5 words → 7.5% of the image width (77 px at 1024); 6–12 → 6.5% (66 px); more → 5% (51 px).
- Line height 1.3× the font size. Stroke `#000` at 15% of the font size, `lineJoin: round`, then a `#FFF` fill.
- Wrap at 75% of the width. Manual `\n` breaks are preferred, with 4–6 words per line and 3–4 lines per slide.
- Block centred around y = 28%. Nothing in the top 10% or the bottom 20%. No emoji, because canvas can't render them.
- Write reactions, not labels: "Wait... is this actually the same kitchen??", not "Modern minimalist."
- Fixes from Oliver's failure log: images rendered landscape instead of portrait caused black bars, 5% text was too small, text sat behind the status bar, and long lines got squashed horizontally ([article](https://youmind.com/landing/x-viral-articles/viral-tiktok-ai-agent-guide)). [self-reported]

**Hook tiers** (slide-structure.md) [first-hand]:
1. Person + conflict → AI → changed mind (best).
2. Relatable budget pain ("POV: You have good taste but no budget", "IKEA budget, designer taste").
3. Curiosity and self-discovery ("I've always wondered what I'd look like with...").

Listed as not working: self-focused complaints ("My flat is ugly"), fear or insecurity for beauty ("Am I ugly without..."), and a price comparison with no character ("$500 vs $5000"). Oliver's own test for any hook: "Who's the other person, and what's the conflict?" ([article](https://youmind.com/landing/x-viral-articles/viral-tiktok-ai-agent-guide)).

**Caption.** A long story (the skill claims "3x more views", unverified): `[hook] 😭 [2–3 sentences of struggle]. So I found this app called [APP] that [one line] – you just [action] and it [result]. I tried [style 1] and [style 2] and honestly?? [reaction]. [closer]`, then at most 5 hashtags. [first-hand]

**Cadence.**
- At least 3 posts a day, at 07:30, 16:30 and 21:00 in the audience's timezone.
- Hooks are brainstormed 10–15 at a time. Images are pre-generated overnight with OpenAI's Batch API (50% cheaper), at about $0.50 per post, or $0.25 batched.
- Generating six images takes 3–9 minutes.
- Warm-up for new accounts: about 2 weeks of niche scrolling. The skill claims accounts that skip it get "80–90% less reach" [unverified].

**Category templates** ([app-categories.md](https://github.com/Upload-Post/upload-post-larry-marketing-skill/blob/HEAD/references/app-categories.md)) [first-hand]:
- **Home:** the same room in 6 styles. The "before" is "modern but tired, NOT ancient", with a TV on the wall, mugs, a remote, magnolia walls and no decor.
- **Beauty:** "Face shape PIXEL-PERFECT identical… NO skin smoothing… ONLY change the target feature."
- **Fitness:** the same mirror selfie at current → 1 → 3 → 6 months, with subtle changes.
- **Productivity:** screenshots with overlays (messy spreadsheet → clean).
- **Food:** overhead shot, same tableware.

**Results** [self-reported]:
- 500K+ views in under a week; 4 posts over 100K.
- 108 paying subscribers across two apps, about $588 MRR at the time of the article. The skill now says $670/mo.
- Top hooks: 234K, 167K, 147K. Failures: 905, 879, 2,671.
- "Adding people didn't work", meaning AI people in the images.

### 1.2 LarryLoop (the paid product)
Sources: [larryloop.com](https://larryloop.com), [The Loop](https://larryloop.com/docs/the-loop), [Content & Scheduling](https://larryloop.com/docs/content-scheduling). [vendor]
- **Formats:** TikTok and Instagram slideshows only. Four content styles: **Photorealistic** ("high-quality lifestyle imagery"), **Illustrated** ("flat, stylized artwork"), **Minimal** ("clean backgrounds, bold text") and **Product-focused** ("app screenshots + UI callouts"). Images come from `gpt-image-1.5`, batched, taking 10–30 minutes.
- **Posting:** TikTok Draft (a notification arrives and you add music; "Draft gets better reach") or Live. Instagram is always live. You choose the times, or let it space 2+ posts a day evenly.
- **Loop:**
  - Score = **views 50%, engagement rate 30%, download clicks 20%**.
  - Tiers: Dead, Testing, Promising and Winner. No numeric cut-offs are published.
  - Auto-iterates on Sundays at 00:00 UTC, and the next generation run is at 02:00 UTC.
  - Needs at least 10 published posts. Metrics refresh every 12 h.
  - Losing hooks, styles and topics are "never used again". Winners become templates.
  - It also analyses CTA effectiveness by download clicks and revenue.
- **Results:** posts at 413K, 169K and 149K "generated and posted by the loop"; "11,000+ users". [vendor, self-reported]

### 1.3 ReelFarm (reel.farm)
Sources: [home](https://reel.farm), [automation guide](https://reel.farm/guides/automate-tiktok-slideshows-with-ai), [hook ideas](https://reel.farm/guides/tiktok-slideshow-hook-ideas), [changelog](https://reel.farm/changes), [API docs](https://reel.farm/api-docs), [topsocialtools](https://www.topsocialtools.com/insights/reelfarm/) [secondary].

**Formats.**
- Slideshow automations: ordered and unordered lists, "UGC slideshow", and freeform story.
- **Hook + Demo** UGC videos.
- **Greenscreen** meme videos. The API's `video_type` values are `slideshow`, `ugc` and `greenscreen`.
- AI UGC selfies (images and video).
- A "slideshow inspiration library" (Feb 2026), plus format slots: 10, 20 or 200 depending on the plan.

**Slideshow construction** [first-hand from the API docs and guide]:
- Default 5 slides; the API allows 1–20.
- Aspect `4:5` by default; `9:16`, `1:1` and `16:9` are allowed, and "keep original aspect ratio" is an option.
- **Images:** a collection of "around 9–15 images" hand-picked from Pinterest or Tumblr boards (boards "group similar photos", which gives consistency for free), or uploads. There are separate settings for the first slide, all slides and the CTA slide. Grid layouts: `1:2`, `1:3`, `2:1`, `2:2`.
- **Text:**
  - Positions `top` / `center` / `bottom`. Widths 100%, 80%, 50% or full. Align left, centre or right; anchor padded or flush.
  - Styles `outline` (default), `background`, `light_background`, white, black and black-50% backgrounds, plus a yellow option.
  - Fonts: `TikTokDisplay-Bold`, `BebasNeue-Regular`, `CormorantGaramond-Regular/Italic`, `Georgia-Italic`.
  - Sizes are in editor units from 6 to 16 "px"; the guide's hook is "about 10px, left-aligned and flush" with 8px supporting text.
  - Body text runs at about 80% of the width, with supporting copy of about 25–30 words.
  - A dark overlay sits under the text: 30% in the guide, 20% by default in the API.
  - Options for "text on first slide only" and "no text on slides".
- **CTA:** optional. Either a random CTA image from a collection at a random slide position, or "link in bio", or a soft mention inside the list.
- **Other:** a content-uniqueness check (Feb 2026). Video export at 4 s per slide by default. The TikTok caption limit is 89 characters for slideshows.

**Hook library (verbatim examples)** [vendor]:
- "6 apps that feel illegal to know about"
- "things nobody tells you about your 20s"
- "rules for protecting your peace"
- "unpopular opinion: your morning routine is too long"
- "5 tools i use to run my business completely solo"
- "what i'd automate first if i started over"
- "skincare ingredients that don't mix (save this)"

**Cadence:** warm up for 20–30 minutes a day over 3–7 days, then post 1–2/day for 1–2 weeks, then 1–3/day. **Analytics:** views, likes, shares, comments and bookmarks per post, sortable. ReelFarm publishes no kill or clone thresholds.

**Results** [vendor testimonials]: "$96k profit last month" (TikTok Shop) and "over 4M views in 30 days".

### 1.4 Genviral (genviral.io) and its open-source agent skill
Sources: [site](https://www.genviral.io), [genviral-skill repo](https://github.com/fdarkaou/genviral-skill), where I read slideshow.md, hooks.md, formulas.md, analytics-loop.md, slideshows.md and defaults.yaml [first-hand].

**Formats on the site:** Viral Library, Slideshows, AI UGC, Product Photos/Videos, **Video Cloner** ("put my AI creator in this viral reel"), Infographics, "Train your own AI", and App Store screenshot redesign. Studio has 200+ templates and 30+ models, naming Nano Banana Pro, Veo 3 and Kling. [vendor]

**Six slideshow prompt templates** (slide-by-slide in §2):
1. Person + Conflict (6 slides)
2. Educational/Tips (6)
3. Before/After (6)
4. Relatable Pain Point (6)
5. POV/Lifestyle (5–6)
6. Quick Feature Spotlight (4–5)

Rules on every template: "Max 15 words per slide", "readable in under 3 seconds", "Do not use em-dashes", and "include the exact hook text in slide 1. Do not let the AI rephrase your hook."

**Rendering:**
- 1–10 slides (default 5); aspect 9:16, 4:5 or 1:1.
- Text presets: `tiktok` (white with a black stroke), `inverted` (black on a white box), `shadow`, `white`, `black`, `snapchat` (white on a translucent black bar).
- Default font: TikTok Display. Default sizes: title 48 / body 40; "small" is 40 / 33.
- Grids: `2x2`, `1+2`, vertical and horizontal.
- **Image packs carry AI metadata** (description and keywords per image). The agent maps slides to images and must pass `pinned_images`, "without `pinned_images`, the server picks randomly".

**Hook mix** (defaults.yaml): pain_point 35, educational 30, person_conflict 15, before_after 15, pov_lifestyle 5. Each hook can be used at most 3 times, with at least 20 hooks active. formulas.md contradicts this by recommending person-conflict at 40%.

**Cadence default:** 1 post a day at 14:00 ET, every day.

**Result:** "Cart AI: 2.2M views from 90 slideshows over 60 days." [vendor testimonial]

### 1.5 Volume (tryvolume.app)
Sources: [site](https://tryvolume.app), [first-campaign guide](https://tryvolume.app/guides/first-campaign). [vendor]
- **Templates** (names from the site's assets): Fade Cover, Quiet List, Reading List, Photo Dump, Manifesto, X Post, Trip Prices, Bold Captions, Story Thread, Numbered Essay, Quote Cards, Classic TikTok, Science Breakdown, Photo Grid. You can also "paste a post link" and clone it. The editor shows Inter Bold at size 75 with line height 1.12, and a 4:5 export for Instagram.
- **Skeleton:** "a hook screen, content slides, and a call to action." The golf example uses the hook "6 unconventional ways to get better at golf", 5 content slides, then an app slide.
- **Image libraries are kept separate:** hook images ("about four", "with plenty of open space" for the text), content images, and CTA images ("an app shot and the App Store badge"). App shots render an app screenshot into a realistic phone-in-hand photo (`landscape.md` §2a).
- **Content prompt:** "accurate, data-driven, and use numbers wherever possible."
- **Variation:** three hook lines are entered and one is picked at random per run. Content is regenerated on every run.
- **Cadence:** once a day, three times a week, or twice a day, with per-weekday times. Start a new account on drafts. One campaign = one account × one angle.
- **Result:** Scratch AI's golf slideshow reached "15M+ views" and "$100k ARR in 7 days". Vendor case study; `slideshow.md` measured one Scratch post at 578K.

### 1.6 Fastlane (usefastlane.ai)
Sources: [home](https://usefastlane.ai), [for mobile apps](https://www.usefastlane.ai/for/mobile-apps). [vendor]
- **Formats for apps:** "slideshows, wall-of-text, hook + demo, memes."
- **Static ad templates:** Chalkboard, Claymation, Baby podcast, Netflix doc, Competitor remix, Car yapper, Breaking news, Meme, AI podcast, Papermation, Static, Trolley remix, Pills, Text on body.
- **"Blitz" remixes** adapt "hook, pacing, captions and demo footage" from trending videos, using 1,000+ AI UGC characters.
- **Loop:** "Winner found. 6 variations made. Winner saved to memory." It claims per-post install attribution but doesn't explain the method.
- **Results** [vendor]: Snugglyboop at 36.2M views ("made and posted entirely from Fastlane"); Iro AI's 8-image carousel at 495.9K; "one app founder hit 31 million views with a single Fastlane video".

### 1.7 Blotato
Sources: [visual template catalogue](https://help.blotato.com/rest-api-reference/visuals.md), [videos help](https://help.blotato.com/web-app-features/videos.md). [first-hand docs]

The 36 API templates fall into these groups:
- **Slideshows:** "Image Slideshow with Text Overlays", "Instagram Carousel Slideshow" (built from `slidePrompts`) and "Image Slideshow with Prominent Text".
- **Quote cards:** monocolor, and paper background with highlight.
- **Tweet cards:** minimal, and photo/video background.
- **Tutorial carousels:** flat, and monocolor.
- **Video:** "When X then Y Text Slideshow" (output as video), "Video of Images and Text", "AI Video with AI Voice" (built from `scenes`), "**AI Selfie Talking Video with Consistent Character**", "AI Avatar with AI Generated B-roll", and "Combine Clips".
- **Infographics:** 21 scene templates, including TV wall, newspaper, billboard, bus ad, chalkboard, whiteboard, manga panel and "Top Secret".

The docs publish no slide counts or text positions.

### 1.8 Postiz-based agent flows (case studies on Postiz's blog)
- **Pedro Pérez** ([Postiz](https://postiz.com/blog/ai-ugc-tiktok-slideshows-26m-views-gpt-6-postiz)) [vendor/self-reported]:
  - **"AI UGC" story slideshows** of 6–10 slides that look like "a person's phone screenshot, a candid photo, a casual story".
  - Images come from GPT Image 2.5, using a custom "Prompt Builder" that reverse-engineers a competitor's image prompt with that image as the reference. About 80% of base images come from Pinterest, "especially images without visible human faces".
  - **The app appears as a phone notification inside the story on slide 2.** Hooks: "I thought my boyfriend was cheating on me. Then I found this on his phone." / "My girlfriend told me she was going to sleep early. At 2:14 AM, I received this message."
  - Batches of 10–15 per session. Rule: >10–15K views → replicate with small variations; <3K → "killed immediately".
  - Claimed: 7.1M views in a week on one account, with single posts at 1.5M, 1.6M, 2M and 847K.
- **ashen** ([Postiz](https://postiz.com/blog/automate-tiktok-slideshow-marketing-ai-agents-postiz)) [vendor/self-reported]: **3-slide** hook → expansion → resolution/CTA. Images come from Gemini "Nano Banana 2" with the text baked into the image. The style was fixed after about an hour of iteration and saved as a skill file. Posted 3/day (9:00, 12:00, 17:00 EST) for a month. Claimed: 100+ downloads and 1,000+ likes.

### 1.9 AI-UGC video generators (Hooked, Arcads, MakeUGC, Creatify, TopView, Higgsfield, HeyGen/Captions)
- **Hooked (hooked.so)** ([app demo generator](https://www.hooked.so/tools/app-demo-ugc-video-generator)) [vendor]:
  - "The creator opens, the screen demonstrates, the creator closes."
  - Sentences are grouped into 4–10 s clips. The demo appears "right when the script starts talking about the app", either picture-in-picture or full screen while the avatar narrates.
  - Variants: keep the screencast and swap "the hook or new creator". The site advertises "500+ viral hook templates".
  - Sibling generators: product-in-hand, before & after, talking object/fruit/organ, AI podcast.
- **Arcads** ([site](https://www.arcads.ai)) [vendor]: 1,000+ actors, or a custom face that can "hold your product, show your app". Emotion control in plain text, 30+ languages, presets, and a choice of models (Seedance, Kling, Nano Banana, GPT Image, Seedream). It publishes no format timing.
- **MakeUGC** ([site](https://www.makeugc.ai)) [vendor]: talking actors, product-in-hand, B-roll generator, **Batch Mode of "10 variations at once"**, ad remake, motion control, and cartoon templates (Pixar, LEGO, clay, anime). Case studies are e-commerce ROAS, not apps.
- **TopView** ([site](https://www.topview.ai)) [vendor]: URL-to-video ads, UGC-style ads with "natural hooks", and **reference-video recreation** that copies "pacing, shots, hooks, and structure".
- **Higgsfield Marketing Studio** (Higgsfield CLI skill reference, `marketing-modes.md`, local) [first-hand docs]: modes `ugc`, `ugc_how_to`, `ugc_unboxing`, `product_review`, `product_showcase`, `tv_spot`, `wild_card` and try-on. Optional `hook_id`/`setting_id` presets, durations of 4 s and up, and 9:16.
- **HeyGen, Captions/Mirage, Creatify:** avatar or URL-to-video ad generators. Their structure is covered in `landscape.md` §2c, and I found no app-specific format rules beyond that.
- **Cheap hook+demo kits:** RE/UGC sells a library of 182+ reaction clips "sorted by emotion and niche" that you edit onto your own demo ([listing](https://www.stork.ai/en/re-ugc)). TopHooks generates text hooks to pair with demo footage ([TrustMRR](https://trustmrr.com/startup/tophooks)). ClipUGC takes a screen recording plus a chosen hook. [vendor]

### 1.10 Research and ops tools: Virlo, viral.app, Sandcastles, Post Bridge
- **Virlo** ([app hooks page](https://virlo.ai/data/viral-hooks/apps)) [vendor]: 56 app/AI hooks from videos with 50K+ views. "Bold claim" is the most common hook type (16 of 56), and "most app hooks show the phone screen within the first two seconds" (no percentage given). Examples: "Three apps to clear your boredom." (1.4M) and "Stuck at 300 views? Try this, takes 2 seconds" (30.4M).
- **viral.app** ([formats chapter](https://viral.app/ugc-course/brands/viral-formats)) [vendor]:
  - Eight hook families, including "Direct comparison: Tracking expenses manually vs. using this one-click app".
  - Four product entry points: frame 1, second 3–4, mid-story at 15–20 s, or the final frame.
  - Each format needs "at least 5 alternative hooks and 3 niche angles".
  - Score candidate references out of 50 and "scrap anything under 35".
  - Screening by views relative to followers: about 10% = okay, 25%+ = good, 1× = strong, 5× = outlier.
- **Sandcastles and outlier tools:** I couldn't find Sandcastles' formula. The common convention is views ÷ the creator's median, with ≥2× flagged and 5–10× counted as "viral" ([SocialCrawl](https://www.socialcrawl.dev/blog/how-many-views-is-viral)). [secondary]
- **Post Bridge** ([site](https://www.post-bridge.com)) [vendor]: posts only. It supports carousels, but nothing on the page mentions TikTok photo mode or drafts. Its FAQ claims its own tests found no reach difference between manual and API posting.

### 1.11 Thin or unverified tools
- BigMotion turns a product description into slideshow videos ([feedbagel](https://feedbagel.com/post/bigmotion-ai-slideshow-automated-tiktok-video-creation-tool-for-business-growth)) [secondary].
- SlideshowGen turns a title into a slideshow ([alternativeto](https://alternativeto.net/software/slideshowgen)) [secondary].
- I found no format documentation for SlideFarm, ReelMoney or Viralfy [unverified].

---

## 2. Carousel format catalogue

Positions are % of image height. "Classic" means white TikTok Sans or TikTok Display with a black outline. Formats tagged [unverified] are formats I know recur, but this session found no competitor documentation for them.

| # | Format | Slides | Slide-by-slide | Image style | Text style / position | Hook formula examples | CTA slide |
|---|---|---|---|---|---|---|---|
| C1 | **AI-photo doubter story** (Larry) | 6 | hook (before) → problem (before) → "so I tried…" → after A → after B → CTA (best after) | gpt-image-1.5, iPhone-photo realism, same room and angle, style changes only | Bold Arial, white with a 15% black stroke, 51–77 px on a 1024 width, centred ~28% from the top, 3–4 lines | "My landlord said I can't change anything so I showed her what AI thinks it could look like"; "I showed my mum what AI thinks our living room could be" | "[App] showed me what's possible / link in bio" ([Larry](https://github.com/Upload-Post/upload-post-larry-marketing-skill/blob/HEAD/references/slide-structure.md)) |
| C2 | **Person + conflict feature story** (Genviral T1) | 6 | "[person] said [doubt]" → why they thought it → "so I showed them [app]" → the feature → their reaction → CTA | Pack images matched by metadata | `tiktok` preset, ≤15 words per slide | "My roommate said [nobody needs X]…"; "My trainer said [I'd never stick to it]" | "Link in bio / try it free" ([Genviral](https://github.com/fdarkaou/genviral-skill/blob/HEAD/docs/prompts/slideshow.md)) |
| C3 | **Notification story** (Pedro) | 6–10 | emotional hook photo → **the app's push notification on a phone** (slide 2) → story continues → resolution | Candid "phone screenshot / candid photo", mostly faceless Pinterest images remade with GPT Image 2.5 | Story text overlay (spec not published) | "I thought my boyfriend was cheating on me. Then I found this on his phone." | None; the notification is the reveal ([Postiz](https://postiz.com/blog/ai-ugc-tiktok-slideshows-26m-views-gpt-6-postiz)) |
| C4 | **3-slide hook → expand → resolve** (ashen) | 3 | concept and reason to swipe → expansion → emotional pull or CTA | Nano Banana 2 with text baked in, one locked style | Baked into the image | (not published) | "download"-style emotional CTA ([Postiz](https://postiz.com/blog/automate-tiktok-slideshow-marketing-ai-agents-postiz)) |
| C5 | **"N apps that…" app stack** | 1 + N | hook → one app per slide (yours is one of them, often last) | Phone/desk photo or app icon plus screenshot | Classic or lowercase left-aligned | "6 apps that feel illegal to know about"; "apps that replaced my entire team"; "Three apps to clear your boredom." | Your app is the last item ([ReelFarm](https://reel.farm/guides/tiktok-slideshow-hook-ideas), [Virlo](https://virlo.ai/data/viral-hooks/apps)) |
| C6 | **Listicle tips, app as the last tip** | 1 + N (+1) | hook with a number → one tip per slide → "or just use [app]" → CTA | Aesthetic Pinterest collection; separate hook and body libraries | ReelFarm: lowercase, small, left-aligned, 30% dark overlay; Volume: Inter Bold | "6 unconventional ways to get better at golf"; "5 high-protein meals i make every week" | App shot + App Store badge ([Volume](https://tryvolume.app/guides/first-campaign), [Genviral T2](https://github.com/fdarkaou/genviral-skill/blob/HEAD/docs/prompts/slideshow.md)) |
| C7 | **Things I wish I knew / things I learned** | 5–8 | hook → one lesson per slide → optional soft mention | Moody aesthetic photos | Lowercase small text, left-aligned | "things nobody tells you about your 20s"; "what my first failed business taught me" | Optional ([ReelFarm](https://reel.farm/guides/tiktok-slideshow-hook-ideas)) |
| C8 | **Rules / my guide** | 5–8 | "rules for X" → "rule one…" per slide | Same aesthetic set | Numbered-rules prompt style | "rules for protecting your peace"; "my guide to a slow, quiet morning" | Optional ([ReelFarm guide](https://reel.farm/guides/automate-tiktok-slideshows-with-ai)) |
| C9 | **POV / lifestyle** | 5–6 | "POV: you…" → scene → experience → payoff → app woven in → optional CTA | Aspirational but believable lifestyle | `tiktok` preset | "POV: You have good taste but no budget" | Soft or none ([Genviral T5](https://github.com/fdarkaou/genviral-skill/blob/HEAD/docs/prompts/slideshow.md), [Larry tier 2](https://github.com/Upload-Post/upload-post-larry-marketing-skill/blob/HEAD/references/slide-structure.md)) |
| C10 | **Day in my life / routine** | 5–10 | timestamped photo diary, with the app in one moment (e.g. "7:40 checked my plan") | Real-looking phone photos, same person or place | Timestamp plus one line | "A day in my life"; "3 morning habits i refuse to skip" | The app moment is the CTA ([nestscale](https://nestscale.com/?p=47332), [ReelFarm](https://reel.farm/guides/tiktok-slideshow-hook-ideas)) [secondary] |
| C11 | **Before vs after** | 6 (or 2) | claim → before (problem) → before (pain) → "then I started using [app]" → after (numbers) → CTA | Same subject, angle and light (locked prompt) | "Be specific. Numbers and timelines beat vague claims" | "[metric] before [app] vs after" | "Try it yourself. [CTA]" ([Genviral T3](https://github.com/fdarkaou/genviral-skill/blob/HEAD/docs/prompts/slideshow.md), [Larry categories](https://github.com/Upload-Post/upload-post-larry-marketing-skill/blob/HEAD/references/app-categories.md)) |
| C12 | **Setup → receipts / screenshot proof** | 2 | claim or quote over a photo → raw screenshot of the app's data | Anonymous photo, then a native 9:16 screenshot | Classic, middle band | "I went from zero… / To my own hero" | The screenshot is the CTA (`slideshow.md` S1; Blotato tweet cards, Volume "X Post") |
| C13 | **iPhone Notes-app list** [unverified] | 1–4 | a Notes-app style list ("things that fixed my sleep") with the app as one line | A Notes UI screenshot or replica (yellow header, SF font) | Native UI text, no overlay | "my non-negotiables for 2026" | The app name inside the list. Closest documented relatives: Fastlane's "wall-of-text" ([Fastlane](https://www.usefastlane.ai/for/mobile-apps)) and Volume's "Quiet List" (name only) |
| C14 | **Old way vs new way** | 4–5 | hook → the old way (manual, tedious) → how the feature works → the result → CTA | Screenshots or desk photos | ≤15 words | "Tracking expenses manually vs. using this one-click app" | Optional ([Genviral T6](https://github.com/fdarkaou/genviral-skill/blob/HEAD/docs/prompts/slideshow.md), [viral.app](https://viral.app/ugc-course/brands/viral-formats)) |
| C15 | **Rate my setup / my top 5** [partly unverified] | 5–7 | "rate my [home screen / study setup]" → one element per slide → your app as the star element | Real desk or home-screen photos | Classic | "My top 5 [apps/sites]" | Comment bait instead of a CTA ([nestscale "My top 5"](https://nestscale.com/?p=47332)). No competitor documents "rate my" [unverified] |
| C16 | **Pinterest-aesthetic tips** | 5–14 | aesthetic hook → tips → the app as the last tip | Curated Pinterest board (9–15 images), faceless | Serif in white boxes, or lowercase left-aligned | "my guide to romanticizing your own solitude" | Phone showing the App Store page ([ReelFarm](https://reel.farm/guides/automate-tiktok-slideshows-with-ai); `slideshow.md` S3/Lense) |
| C17 | **"What I'd do if I started over"** | 5–7 | hook → one step per slide → "the tool I'd use: [app]" | Desk or founder photos | Classic | "what i'd automate first if i started over"; "how i got my first 100 users with $0" | The app as one step ([ReelFarm](https://reel.farm/guides/tiktok-slideshow-hook-ideas)) |
| C18 | **Mistakes list** | 5–6 | "5 mistakes people make with X" → one mistake and fix per slide → "or just use [app]" | Problem photos | ≤15 words | "5 mistakes people make with [problem]"; "Stop [bad habit]. Here is what to do instead." | Soft ([Genviral hooks](https://github.com/fdarkaou/genviral-skill/blob/HEAD/workspace/hooks/formulas.md), [nestscale "Stop doing this"](https://nestscale.com/?p=47332)) |
| C19 | **Unpopular opinion / contrarian** | 4–6 | the opinion → reasoning slides → the app as the alternative | Plain or moody | Classic | "unpopular opinion: your morning routine is too long"; "why i stopped setting goals" | Optional ([ReelFarm](https://reel.farm/guides/tiktok-slideshow-hook-ideas)) |
| C20 | **This or that / which is better** | 2–6 | two options side by side per slide (grid `1:2` or `2:1`) | Grid layouts | Label on each half | "cheap vs. expensive"; "beginner vs. expert" | The answer slide ([nestscale](https://nestscale.com/?p=47332), [viral.app versus](https://viral.app/ugc-course/brands/viral-formats); grids in the [ReelFarm API](https://reel.farm/api-docs)) |
| C21 | **Checklist / "save this"** | 4–6 | "save this" hook → checklist items → the app as the tracker | Clean background or desk | "(save this)" in the hook | "skincare ingredients that don't mix (save this)"; "the accounts everyone should have (in order)" | Optional ([ReelFarm](https://reel.farm/guides/tiktok-slideshow-hook-ideas)) |
| C22 | **Relatable pain-point meme arc** | 6 | POV pain → vivid frustration → "it gets worse" → "but then I found…" → the fix → soft CTA | Meme-like photos | First 3 slides "should feel like a meme or relatable rant" | "that moment when…", "when you realize…" | "Changed my life honestly. [CTA]" ([Genviral T4](https://github.com/fdarkaou/genviral-skill/blob/HEAD/docs/prompts/slideshow.md)) |
| C23 | **Quote / tweet cards** | 1–8 | one quote or "tweet" per slide | Monocolor, paper, or photo background | Card UI | (any thought-leader line) | Usually none ([Blotato](https://help.blotato.com/rest-api-reference/visuals.md), Volume "Quote Cards") |

---

## 3. Video format catalogue

| # | Format | Timing and structure | How it is reused | Why it works / caveats |
|---|---|---|---|---|
| V1 | **AI-UGC reaction hook + app demo** | **Hook clip 1.5–4 s.** viral.app: face + text overlay at 1–3 s, cut to the screen recording at 4 s, CTA around 25 s ([viral.app](https://viral.app/ugc-course/brands/viral-formats)). The human benchmark is the Stronger reaction cut at 4.0 s (`ugc.md` T1). A vendor 15 s master: hook 1.5 + setup 3 + reveal 5 + demo 4 + CTA 2 ([videoai.me](https://videoai.me/blog/ai-ugc-playbook-for-mobile-apps-2026), internally inconsistent). The text hook sits on the face clip, then one feature line per demo cut | **One reaction clip serves many demos, and one demo serves many hooks.** Hooked: "same screencast, swap the hook or creator". RE/UGC: a library of 182+ reaction clips. videoai.me: "Five hooks, one actor. Or one hook, five actors. Not both" | The reaction borrows a human pattern-interrupt and the demo is the proof. Realistic AI faces underperform and need labels (`ugc.md` T9), and practitioners call the shocked-face template stale (`hooks.md` #17) |
| V2 | **Hook + demo combinatorics** | N hook clips (2–4 s each, with text) × M demo cuts (6–20 s) × K sounds | ReelFarm "hook demo" automations, Fastlane "hook + demo", TopHooks text hooks paired with demo footage | Cheap volume, and testing only the first 3 s isolates the variable. Duplicate-content risk if the variants are too similar ([Superwall/Stronger](https://superwall.com/blog/how-stronger-built-a-usd600k-app-using-viral-on-demand-tiktok-strategy) changed backgrounds and wording to "avoid spam hits") |
| V3 | **Green-screen meme** | A person cut out over a background screenshot or meme (app page, comment, tweet) | ReelFarm `greenscreen` video type ([API](https://reel.farm/api-docs)); "relatable meme videos about products" ([topsocialtools](https://www.topsocialtools.com/insights/reelfarm/)) | Native TikTok grammar. Human beat sheets are in `ugc.md` T3 |
| V4 | **Wall of text** | One dense still or slow-scroll text block held 5–7 s with a sound | Fastlane's app format list ([Fastlane](https://www.usefastlane.ai/for/mobile-apps)); measured equivalent: `slideshow.md` V3 (Doof, StarAstrology) | Rewatches to finish reading inflate watch time [unverified mechanism] |
| V5 | **Text-story video** | "When X then Y" text over images, as a video ([Blotato](https://help.blotato.com/rest-api-reference/visuals.md)); fake-text chats (`brainrot.md`) | A template with the noun swapped | Curiosity plus reading time |
| V6 | **Slideshow exported as video** | ReelFarm `export_as_video`, default 4 s per slide ([API](https://reel.farm/api-docs)); Blotato "Video of Images and Text" | The same carousel posted as Reels or Shorts | Reaches platforms with no photo mode. Pace it to the beat (`slideshow.md` §7) |
| V7 | **AI selfie talking video, consistent character** | A selfie-framed AI person talking ([Blotato](https://help.blotato.com/rest-api-reference/visuals.md)); ReelFarm AI UGC selfies | A reusable avatar library | Cheap. Needs an AI label, and converts poorly by practitioner accounts (`strategy.md` §2 #9) |
| V8 | **AI avatar + AI B-roll** | Talking head cut with generated B-roll ([Blotato](https://help.blotato.com/rest-api-reference/visuals.md), [MakeUGC](https://www.makeugc.ai)) | Batch 10 variations | Built for ads, not native organic posts |
| V9 | **Creator-narrated app demo (PiP)** | Creator opens → screencast full screen or PiP while the avatar narrates → creator closes; 4–10 s clips ([Hooked](https://www.hooked.so/tools/app-demo-ugc-video-generator)) | Swap the creator or hook on the same screencast | Explains a complex app. Longer, so retention risk |
| V10 | **Viral-video clone / remix** | Recreate a reference's "pacing, shots, hooks, and structure" ([TopView](https://www.topview.ai)); "put my AI creator in this viral reel" ([Genviral](https://www.genviral.io)); Fastlane "Blitz" | One per trend | Rides proven structure. IP and unoriginal-content risk if it's too close |
| V11 | **Static "concept" ads** | Chalkboard, Breaking news, Car yapper, Text on body, Netflix doc ([Fastlane](https://usefastlane.ai)); 21 infographic scenes ([Blotato](https://help.blotato.com/rest-api-reference/visuals.md)) | A template with the copy swapped | Novelty frame stops the scroll. Mostly a paid-ads format |
| V12 | **Talking object / mascot** | A talking fruit, organ or object explains the problem ([Hooked tools](https://www.hooked.so/tools/app-demo-ugc-video-generator)) | Recurring character | Openly synthetic characters avoid the uncanny and labelling problem (`ugc.md` T9 Luna) |

---

## 4. Image-generation rules competitors use for consistent slideshow photos

1. **Model choices.**
   - Larry: `gpt-image-1.5`, "ALWAYS 1.5, never 1", because gpt-image-1 "produces noticeably AI-looking images" ([fork SKILL.md](https://github.com/Upload-Post/upload-post-larry-marketing-skill/blob/HEAD/SKILL.md)).
   - Pedro: GPT Image 2.5 ([Postiz](https://postiz.com/blog/ai-ugc-tiktok-slideshows-26m-views-gpt-6-postiz)). ashen: Nano Banana 2 ([Postiz](https://postiz.com/blog/automate-tiktok-slideshow-marketing-ai-agents-postiz)).
   - Genviral Studio: `google/nano-banana-2`, Nano Banana Pro, Veo 3 and Kling ([studio.md](https://github.com/fdarkaou/genviral-skill/blob/HEAD/docs/api/studio.md)). Arcads lists Seedance, Kling, Nano Banana, GPT Image and Seedream.
   - Oliver dropped local Stable Diffusion because it "looked AI-generated".
2. **Portrait always: 1024×1536 (2:3).** The landscape mistake caused black bars. Note that measured hits mostly use 3:4 (`slideshow.md` §2), so render 2:3 and crop to 3:4 if needed [unverified].
3. **One base description per post, pasted verbatim into every slide prompt.** The template from [slide-structure.md](https://github.com/Upload-Post/upload-post-larry-marketing-skill/blob/HEAD/references/slide-structure.md):
   ```
   iPhone photo of a [CONTEXT]. [DETAILED SUBJECT]. Shot from [CAMERA POSITION].
   [SPECIFIC ARCHITECTURAL/PHYSICAL DETAILS]. Natural phone camera quality,
   realistic lighting. Portrait orientation.
   [SLIDE-SPECIFIC STYLE CHANGES ONLY]
   ```
   - **Lock:** subject dimensions and features, camera angle and position, lighting direction, background elements, physical structure (windows, doors, body proportions).
   - **Vary:** style, colours and textures, decor, expression.
4. **Be extremely specific and add everyday clutter.** "A nice modern kitchen" moved the windows and counters between slides. The "before" image should be "modern but tired" with mugs, a remote and a TV ([article](https://youmind.com/landing/x-viral-articles/viral-tiktok-ai-agent-guide), [app-categories.md](https://github.com/Upload-Post/upload-post-larry-marketing-skill/blob/HEAD/references/app-categories.md)).
5. **Realism cues:** "iPhone photo", "phone selfie quality", "natural skin texture with visible pores", "NO skin smoothing or beauty filters", "Natural indoor lighting from window to the left", "phone-camera depth of field" ([Larry](https://github.com/Upload-Post/upload-post-larry-marketing-skill/blob/HEAD/references/app-categories.md), [OpenQuok template](https://github.com/Ratimon/openquok-monorepo/blob/HEAD/agent/skills/openquok-tiktok-slideshow/references/character-profile.template.json)).
6. **People get a character lock.**
   - A LOCKED block: identity, face (shape, eyes, brows, nose, mouth, skin, hair, distinctive marks, plus "do_not_change"), body, and a signature accessory that is "always_present". A VARIATIONS block: outfit, pose, expression, setting, style, framing.
   - Generate `face-lock.png` and `body-lock.png` once, attach both to every request, and also paste the LOCKED text. "LOCKED wins on conflict." Never regenerate the locks mid-campaign ([character-lock.md](https://github.com/Ratimon/openquok-monorepo/blob/HEAD/agent/skills/openquok-tiktok-slideshow/references/character-lock.md)).
   - Caveat: Larry found realistic AI people "didn't work", and Pedro prefers faceless images.
7. **Keep text out of the image and render it afterwards.** Larry and ReelFarm overlay text in code (node-canvas, then Pillow from Feb 2026). ashen bakes text in with Nano Banana, the exception. Rendering afterwards keeps sizing exact and lets one image carry many hooks: "proven images can be reused with new hooks" ([analytics-loop.md](https://github.com/Upload-Post/upload-post-larry-marketing-skill/blob/HEAD/references/analytics-loop.md)).
8. **Copy a competitor's look with image-to-prompt.** Pedro's "Prompt Builder" reverse-engineers a viral image into a prompt and attaches the original as a reference ([Postiz](https://postiz.com/blog/ai-ugc-tiktok-slideshows-26m-views-gpt-6-postiz)). This carries IP risk, so use it for style, not content [unverified judgement].
9. **Lock the style before posting.** Generate a test set of six, iterate on the prompts with the user, then freeze. The forks treat this as a gate: "do not post until the user is happy" ([OpenQuok SKILL.md](https://github.com/Ratimon/openquok-monorepo/blob/HEAD/agent/skills/openquok-tiktok-slideshow/SKILL.md)).
10. **Collections instead of generation** (ReelFarm, Volume, Genviral packs):
    - 9–15 images from one Pinterest board for a consistent aesthetic, with separate hook, body and CTA libraries.
    - Hook images need "open space" for the text.
    - Tag each image with a description and keywords, and pin images to slides deliberately rather than at random.
    - For paid ads "you must own the rights to the images" ([ReelFarm](https://reel.farm/guides/automate-tiktok-slideshows-with-ai)).
11. **Cost and latency:** 30–90 s per gpt-image-1.5 image, so allow a 10-minute timeout for 6 images. The Batch API halves cost overnight. Make generation resumable so finished slides are skipped ([fork SKILL.md](https://github.com/Upload-Post/upload-post-larry-marketing-skill/blob/HEAD/SKILL.md)).

---

## 5. The feedback loop (published rules)

**Larry's 2×2 plus two funnel cells** ([fork SKILL.md](https://github.com/Upload-Post/upload-post-larry-marketing-skill/blob/HEAD/SKILL.md), [ClawHub](https://clawhub.ai/olliewazza/skills/larry)) [first-hand]:

| | High conversions | Low conversions |
|---|---|---|
| **High views** | SCALE: 3 variations of the hook now, test posting times, don't touch the CTA | FIX CTA: rotate slide-6 CTAs (direct vs subtle, "download" vs "search on App Store"), check the App Store page matches the post, test the caption structure |
| **Low views** | FIX HOOK: radically different hooks (person+conflict, POV, listicle, mistakes), new slide-1 image and time, keep the CTA and body identical | FULL RESET: new format, audience angle and hook categories |

Two extra funnel cells:
- **High views, high downloads, low paid:** an app problem. Pause posting and fix onboarding, the paywall or pricing.
- **High views, low downloads:** a CTA problem.

**Thresholds and windows:**

| Source | Rule |
|---|---|
| Larry (views per post) | 50K+ → 3 variations; 10–50K → keep in rotation; 1–10K → one more variation; <1K **twice** → drop and try something radically different ([ClawHub](https://clawhub.ai/olliewazza/skills/larry)) |
| Larry/Upload-Post (account impressions) | Growing 5K+/day → double down; 1–5K/day → keep and tweak; <1K/day → radically different ([analytics-loop.md](https://github.com/Upload-Post/upload-post-larry-marketing-skill/blob/HEAD/references/analytics-loop.md)) |
| Larry conversion benchmark | views→download 1% = average, 1.5–3% = good, 3%+ = great. Daily report pulls the last 3 days; attribution window 24–72 h; cron before the first post (07:00) (same file) [unverified benchmark] |
| Larry what-to-vary list | same hook with a different person; same structure with a different room or feature; same images with different text; same hook at a different time (same file) |
| Genviral skill | Same 4 view tiers as Larry ("twice" = two posts of the same hook pattern). The 2×2 uses **engagement rate** = (likes + comments + shares + saves) / views instead of conversions. Checks at 24 h, 48 h and 168 h. The defaults.yaml tiers (winner 5,000 / solid 500 / under 200) contradict the docs. Max 3 uses per hook; keep 20+ hooks active ([analytics-loop.md](https://github.com/fdarkaou/genviral-skill/blob/HEAD/docs/references/analytics-loop.md), [defaults.yaml](https://github.com/fdarkaou/genviral-skill/blob/HEAD/defaults.yaml)) |
| Genviral hook refresh mix | 10 new hooks: 4 person+conflict, 2 tips, 2 pain, 1 before/after, 1 POV ([hooks.md](https://github.com/fdarkaou/genviral-skill/blob/HEAD/docs/prompts/hooks.md)) |
| LarryLoop | Score = views 50% + engagement 30% + download clicks 20%; tiers Dead/Testing/Promising/Winner; weekly (Sun 00:00 UTC); needs ≥10 posts; 12 h refresh; losers are never reused ([The Loop](https://larryloop.com/docs/the-loop)) |
| Pedro Pérez | >10–15K views → replicate with small variations; <3K → kill immediately ([Postiz](https://postiz.com/blog/ai-ugc-tiktok-slideshows-26m-views-gpt-6-postiz)) [self-reported] |
| viral.app | 5+ hooks × 3 angles per format; hold the constants fixed and vary the wording, people, visuals and sound; 1–2 test videos before changing the plan ([viral.app](https://viral.app/ugc-course/brands/viral-formats)) |
| Outlier screening | views ÷ creator median ≥2× = outlier ([SocialCrawl](https://www.socialcrawl.dev/blog/how-many-views-is-viral)); viral.app views/followers tiers of 10% / 25% / 1× / 5× |
| Paid AI-UGC (vendor) | 3-second view rate ≥30–40% on TikTok; tap-through 1–3%; kill the bottom 6 of 10 every Friday and spin up 3 from the winning family ([videoai.me](https://videoai.me/blog/ai-ugc-playbook-for-mobile-apps-2026)) [vendor] |

**Data model to copy.** Larry's `hook-performance.json` tags every post with its hook text, CTA and conversions. A CTA table records times used, conversions and rate, and a rules block holds `doubleDown`, `testing` and `dropped` hook categories. The CTA rates in the skill's sample (6.7% for "link in bio" vs 14.1% for "Search on App Store") are **illustrative schema values, not data** ([fork SKILL.md](https://github.com/Upload-Post/upload-post-larry-marketing-skill/blob/HEAD/SKILL.md)).

**Hook decay** is real but undocumented in the skills. Larry's landlord variants fell 234K → 147K across rewrites ([article](https://youmind.com/landing/x-viral-articles/viral-tiktok-ai-agent-guide)), and `strategy.md` §3.3 records 132K → 8K → 7K → 4K. Count uses per hook and cap them; Genviral's cap is 3.

---

## 6. What Shipreel should copy (ranked) and what to avoid

**Copy, in priority order:**
1. **The Larry-style 6-slide story generator with a locked scene prompt** (C1/C2/C11): one base description, locked/varied fields in the UI, and gpt-image or Nano Banana at 2:3. Add Shipreel's edge: slide 3 or slide 5 is a **real simulator screenshot or phone-in-hand app shot**, not an AI image of the app.
2. **A code-rendered text layer with presets**:
   - Larry outline: 15% stroke, size by word count, centred at ~28%, wrap at 75%.
   - ReelFarm/Genviral presets: lowercase left-aligned, white box, translucent bar, serif-italic.
   - Safe zones enforced, no emoji in baked text, manual line breaks with 4–6 words per line.
   - One image should be able to carry many hooks.
3. **A hook bank by formula with weights and use caps.** Person+conflict, tips, pain, before/after and POV, with Genviral-style weights, max 3 uses per hook, at least 20 active hooks, and the hook text frozen (no AI rephrasing). Include Oliver's check: "who's the other person, and what's the conflict?"
4. **The views × conversions 2×2 with Larry's thresholds and 24/48/168 h checks.** Show the diagnosis per post ("fix CTA", "fix hook") and suggest the next variant, changing one variable at a time. Feed RevenueCat or install data where available. Otherwise use engagement rate, labelled honestly.
5. **Image collections with metadata and pinned assignment.** Separate hook, body and CTA libraries, open-space detection for hook images, and an owned-rights flag for anything used in ads.
6. **CTA rotation as a first-class variable.** Variants: "link in bio", "Search [App] on the App Store", free-to-try, name-only, and an optional or random-position CTA slide. Track a conversion rate per CTA.
7. **Draft-first TikTok posting plus a "add a trending sound" push.** A fixed 3-slot schedule (07:30, 16:30, 21:00 local) and overnight batch generation.
8. **A format library covering C1–C23**, starting with C1, C5, C6, C11, C12, C14 and C3 (notification story, built natively from the app's real push copy).
9. **A hook + demo assembler (V1/V2)** using the user's real screen recording and either a user-supplied or stock human reaction clip, or a faceless hook shot. Cut to the demo at 3–4 s. Run one-variable combinatorics (N hooks × 1 demo, or 1 hook × N clips) and enforce micro-variation so variants aren't duplicates.
10. **Style-lock gate:** generate a test set of six, approve it, then freeze the prompt or character profile as versioned JSON.

**Avoid:**
- **Realistic AI people as fake users or testimonials.** Larry found "adding people didn't work", fully AI videos underperform (`ugc.md` T9), and FTC and TikTok labelling rules apply. If a character is needed, use an obviously synthetic mascot or a locked faceless scene.
- **Pinterest images in paid ads, or cloning a competitor's image too closely.** Rights risk; ReelFarm itself warns about it.
- **Self-focused, feature or price hooks** ("See your room in 12+ styles", 879 views; "$500 vs $5000", 2,671).
- **Landscape renders, 5% text, text in the top 10% or bottom 20%, squashed long lines, and emoji in canvas text.**
- **Direct API posting of silent slideshows**, and near-duplicate variants across accounts (spam and unoriginality filters).
- **Trusting vendor view counts as evidence.** Every headline number above (36.2M, 15M, 7.1M, 500K) is self-reported, and many big posts are boosted (`slideshow.md` rule 12).

---

## Sources

Primary skill and code sources [first-hand; copies in `refs/competitors/`]:
- Larry on ClawHub: https://clawhub.ai/olliewazza/skills/larry
- Upload-Post Larry fork: https://github.com/Upload-Post/upload-post-larry-marketing-skill. Files: `SKILL.md`, `references/slide-structure.md`, `references/analytics-loop.md`, `references/app-categories.md`, `references/competitor-research.md`
- OpenQuok slideshow skill (character lock): https://github.com/Ratimon/openquok-monorepo/tree/main/agent/skills/openquok-tiktok-slideshow
- Genviral skill: https://github.com/fdarkaou/genviral-skill. Files: `docs/prompts/slideshow.md`, `docs/prompts/hooks.md`, `workspace/hooks/formulas.md`, `docs/references/analytics-loop.md`, `docs/api/slideshows.md`, `docs/api/studio.md`, `defaults.yaml`
- ReelFarm API docs: https://reel.farm/api-docs; changelog: https://reel.farm/changes
- Blotato template catalogue: https://help.blotato.com/rest-api-reference/visuals.md; https://help.blotato.com/web-app-features/videos.md
- Higgsfield Marketing Studio modes: local Higgsfield CLI skill reference (`higgsfield-generate/references/marketing-modes.md`)

Operator write-ups [self-reported]:
- Oliver Henry's X article (repost): https://youmind.com/landing/x-viral-articles/viral-tiktok-ai-agent-guide
- Postiz case studies: https://postiz.com/blog/ai-agent-tiktok-views-postiz-api, https://postiz.com/blog/ai-ugc-tiktok-slideshows-26m-views-gpt-6-postiz, https://postiz.com/blog/automate-tiktok-slideshow-marketing-ai-agents-postiz

Vendor pages:
- https://reel.farm, https://reel.farm/guides, https://reel.farm/guides/automate-tiktok-slideshows-with-ai, https://reel.farm/guides/tiktok-slideshow-hook-ideas
- https://larryloop.com, https://larryloop.com/docs, https://larryloop.com/docs/the-loop, https://larryloop.com/docs/content-scheduling
- https://www.genviral.io
- https://tryvolume.app, https://tryvolume.app/guides/first-campaign
- https://usefastlane.ai, https://www.usefastlane.ai/for/mobile-apps
- https://www.hooked.so/tools/app-demo-ugc-video-generator
- https://www.arcads.ai, https://www.makeugc.ai, https://www.topview.ai
- https://virlo.ai/data/viral-hooks/apps
- https://viral.app, https://viral.app/ugc-course/brands/viral-formats
- https://www.post-bridge.com
- https://videoai.me/blog/ai-ugc-playbook-for-mobile-apps-2026
- https://trustmrr.com/startup/tophooks

Secondary:
- Stack Junkie: https://www.stack-junkie.com/blog/how-to-automate-tiktok-marketing-with-openclaw-larry-skill-deep-dive
- https://www.topsocialtools.com/insights/reelfarm/
- https://www.stork.ai/en/re-ugc
- https://nestscale.com/?p=47332
- https://www.socialcrawl.dev/blog/how-many-views-is-viral
- https://feedbagel.com/post/bigmotion-ai-slideshow-automated-tiktok-video-creation-tool-for-business-growth
- https://alternativeto.net/software/slideshowgen
- https://superwall.com/blog/how-stronger-built-a-usd600k-app-using-viral-on-demand-tiktok-strategy (via `strategy.md`)

Internal cross-references: `research/landscape.md`, `research/viral/slideshow.md`, `ugc.md`, `screendemo.md`, `hooks.md`, `strategy.md`, `brainrot.md`.
