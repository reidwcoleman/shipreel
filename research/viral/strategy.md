# Shipreel strategy layer: what actually drives installs (short-form, 2024–2026)

Compiled 2026-10-16 for the Shipreel rebuild. This file covers strategy. Sibling files in `research/viral/` cover individual visual formats.

This builds on `research/playbook.md`, `research/formats.md` and `research/posting.md`, which were compiled on 2026-10-15 and include transcribed podcasts. I re-checked the claims that matter most against primary pages where I could, and I added the 2026 platform-rule changes that affect auto-posting.

**Evidence tags used below**
- **[official]**: the platform's own policy, docs or blog.
- **[first-hand]**: an operator describing their own app.
- **[vendor]**: data from a company selling the thing it measures.
- **[secondary]**: journalism or someone else's write-up.
- **[unverified]**: a common practitioner belief with no controlled test.

A self-reported revenue figure is still self-reported. Fake-MRR screenshots are a known 2026 problem ([IndieRadar](https://indieradar.app/blog/fake-mrr-pandemic-real-benchmarks)).

---

## 0. One-screen summary

1. **Installs follow the "magic moment", not the format.** Every install engine with real numbers shows a one-two-three product beat on screen that makes viewers do a double take. Cal AI's beat was scan → analyse → result. Umax's was face scan → score. Stronger's was the strength heat map. Cal AI's COO: "if it feels like an ad, it's not going to go viral. If it's not going to go viral, it's not going to be profitable" ([RevenueCat/Sub Club, 2026-10-14](https://www.revenuecat.com/blog/growth/jake-castillo-cal-ai-sub-club-podcast-2026)) [first-hand].
2. **Formats ranked by install evidence (not views):**
   1. Creator lifestyle integration.
   2. Faceless screen demo of the magic moment.
   3. Talking-head or founder story.
   4. Reaction hook → demo.
   5. Story slideshow with a named-app CTA.
   6. Faceless theme-page and texting-story networks.
   7. Micro-loops such as the fade-in.
   8. Mascot or brand entertainment.
   9. AI-avatar testimonials (last).

   Details are in §2.
3. **Video beats photo carousels on TikTok reach.** Across 2.31M posts in Jan–Feb 2026, video got 5.6× the views and 7.8× the interactions of image/carousel posts. Carousel reach fell about 20% year on year while carousel volume rose about 140% ([Metricool via NetInfluencer](https://www.netinfluencer.com/tiktok-content-volume-up-nearly-80-percent-in-early-2026-as-per-post-performance-declined-report-finds/)) [vendor]. Buffer's 45M-post study agrees: TikTok video has 3.39% median engagement vs 1.92% for carousels ([Buffer, 2026-03-19](https://buffer.com/resources/data-best-content-format-social-media/)) [vendor]. Slideshows are still the cheapest test bed, but Shipreel should render every slideshow as a video too.
4. **TikTok's Aug 2026 Community Guidelines (effective 2026-09-24) change auto-posting defaults** ([TikTok CG 2026H2](https://www.tiktok.com/community-guidelines/en/fyf-standards)) [official]:
   - Promoting your own product **requires the content-disclosure setting**. Undisclosed content can have its visibility reduced, and repeat offences can get the account restricted or banned.
   - "Reused or unoriginal content posted without creative edits, such as clips that show someone else's watermark or logo" is **ineligible for the For You feed (FYF)**.
   - "Using automation to run many accounts or send repetitive content" is listed as **spam**.
5. **Faces convert and AI faces don't.** AI is fine for things, scripts and openly fictional characters. Realistic AI people must be labelled on TikTok, Instagram and YouTube. Practitioners report AI-UGC gets views but not installs (§8).

---

## 1. Who the evidence comes from

| Operator / app | What they did | Hard numbers | Source |
|---|---|---|---|
| **Cal AI** (Zach Yadegari, Blake Anderson, COO Jake Castillo) | Paid fitness and food creators to film integrations where the creator scans a meal on camera. Then ran the organic winners as ads. | One early post brought ~1,000 users in 2 days ([hyper.ai summary of TechCrunch Disrupt 2026 talk](https://hyper.ai/en/stories/3f579372e804f00928cce70aac63e3f3)). ~150 creators posting by month 7. ~$5 CPM target. $7K/day ads by end of 2024 ([Koerner newsletter](https://newsletter.chrisjkoerner.com/p/1m-month-by-month-7-fed4)). 50–70 creators posting per day at peak. >$30M revenue before the MyFitnessPal acquisition (Mar 2026) | [Sub Club, 2026-10-14](https://www.revenuecat.com/blog/growth/jake-castillo-cal-ai-sub-club-podcast-2026) [first-hand] |
| **Rizz** | Texting-story videos over Minecraft/game b-roll, run across 15+ themed TikTok accounts | 550M+ views. ~450K average views per video. Accounts at 9–25% "1M+ rate". Videos are 2–5 min long | [Shortimize, 2024-10-21](https://www.shortimize.com/blog/rizz-apps-b-roll-strategy-that-got-them-half-a-billion-views-on-tiktok) [secondary] |
| **RizzGPT / Umax** (Blake Anderson) | Paid faceless niche accounts ($50 per promo). The app sat in the middle of 10-image slideshows. For Umax, faceless looksmaxxing edits with a "get your score" CTA | Umax: "first $30k+ from 2 faceless posts from Instagram theme pages" | [Blake playbook summary](https://julianivaldy.com/the-viral-app-playbook), [Rork playbook](https://docs.rork.com/rork-playbook/seven-ways-to-scale-your-app) [secondary] |
| **Stronger** (Peter, 3 engineers) | 6-second "fade-in" (black → image) posted ~300 times as micro-variants across several accounts. Brand sound. Reply/stitch loop answering comments | 200–300M views. Average watch time above 2× the video length. Conversion "not spectacular". $600K ARR | [Superwall, 2025-10-27](https://superwall.com/blog/how-stronger-built-a-usd600k-app-using-viral-on-demand-tiktok-strategy) [first-hand recap] |
| **Opal** (Kenneth Schlenker) | Hired a TikTok creator who already used Opal organically ("Olivia Unplugged"). Licensed an organic creator video and ran it as an ad | 0 → 700K followers in months. The licensed video reached tens of millions | [Better Launch, from Sub Club](https://www.betterlaunch.co/playbooks/kenneth-schlenker-opal-billion-user-9) [first-hand quote] |
| **Duolingo** (Zaria Parvez) | Mascot-as-creator. "The comment section is your social brief." Influencers make no sales pitch | "Direct correlation between when a post on TikTok hits and an increase in new learners who choose 'TikTok' in our 'how did you hear about us' survey" | [Milk Karten, 2024-02-15](https://www.milkkarten.net/p/yes-duolingos-viral-tiktoks-lead) [first-hand] |
| **Locket** (Matt Moss) | Founder demo posted on a company account. Users reused its sound | ~100K views in 2 days. One UK user's video using the sound hit 5M in a day. #1 in the App Store with no paid influencers or ads | [TechCrunch, 2022-01-11](https://techcrunch.com/2022/01/11/locket-an-app-for-sharing-photos-to-friends-homescreens-hits-the-top-of-the-app-store) [secondary] |
| **Feynman AI** (Alex Nguyen, solo) | "Dozens of TikTok accounts", reverse-engineered fast slideshows. The arc is pain (messy notes) → satisfying result (mind map). Paired with ASO | 370K users, ~$19K/mo (May 2026) | [MRR Story](https://www.mrrstory.com/stories/from-0-to-370k-users-using-tiktok-app-store-seo) [first-hand, compiled] |
| **Snugly / Larry** (Oliver Henry) | AI-agent TikTok slideshows (6 slides). Hook iteration tied to RevenueCat | 137K–482K-view posts. A 170K-view post with a vague CTA sold ~nothing | [Larry skill](https://clawhub.ai/olliewazza/skills/larry), [Greg Isenberg pod](https://www.youtube.com/watch?v=OV5eK91YY68) [first-hand] |
| **Alberto** (budget app "for girls") | Daily TikTok slideshows, no ads, Spain first | 100K downloads, 2–5M views/mo, ~$8K/mo | [Tap and Swipe pod](https://www.youtube.com/watch?v=NgsLwjkNo7A) [first-hand, transcribed in `playbook.md`] |
| **Speechify** (Cliff Weitzman) | Hires people with a viral TikTok track record to make ads. An in-house system tests ~1,300 AI-made ads/day and moves spend to winners | Says strong TikTok views converted weakly back to the core product, so only conversion counts | [Speechify/20VC](https://speechify.com/news/speechify-ceo-cliff-weitzman-20vc-podcast/), [Better Launch](https://www.betterlaunch.co/playbooks/cliff-weitzman-speechify-12) [first-hand/secondary] |
| **Bible Chat** | 500+ TikToks of before/after "less phone, more faith" stories | Appfigures credits the Mar 2025 revenue spike to SEO and Apple Ads, not TikTok. The TikTok account had gone quiet | [Appfigures](https://appfigures.com/resources/insights/20250418/5-this-is-how-to-drive-demand-for-the-oldest-book-in-the-world) [secondary] |

**Social-graph apps (Gas, BeReal, Lapse, Locket).** Their growth came mostly from in-product loops: school-by-school rollout, invites, home-screen widgets. Short-form helped mainly when users filmed the product themselves. Gas launched in a few states at a time and capped downloads ([Wikipedia](https://en.wikipedia.org/wiki/Gas_(app))). For Shipreel, the lesson is to make the product's shareable artifact (a widget, score or result card) the visual centrepiece. That artifact is what users and creators re-film.

---

## 2. Formats ranked by evidence of installs

The ranking uses evidence of installs or revenue first, then installs-per-view benchmarks, then views. Flamme's per-view install ladder [first-hand]:
- Memes: 0.05–0.2%.
- Question slideshows: 0.2–0.5%.
- Reaction clips: 0.3–0.5%.
- Straight app demos: 0.5–1%.

Source: Joseph Choi, Feb 2026, via `formats.md`: [X article](https://x.com/JosephKChoi/article/2024201897322709065).

A vendor study of 5,800+ videos found slideshows at 0.2–0.4% view→install and talking head at 1–2% (`playbook.md`, [Agniverse](https://agniverse.co/ugc-content-benchmarks)) [vendor].

| # | Format | Install evidence | Why it converts / fails | Can Shipreel make it alone? |
|---|---|---|---|---|
| 1 | **Creator lifestyle integration**: a real person in their normal content uses the app at its magic moment | Strongest: Cal AI scaled to >$30M on this. "Each post reliably converted a roughly fixed share of its viewers" ([hyper.ai](https://hyper.ai/en/stories/3f579372e804f00928cce70aac63e3f3)). Opal's hired user-creator ([Better Launch](https://www.betterlaunch.co/playbooks/kenneth-schlenker-opal-billion-user-9)) | Viewer trust plus a visible result. Failure case: an audience that doesn't want the problem solved. Cal AI's UFC creators drew "crickets" after "thousands and thousands of dollars" ([Sub Club](https://www.revenuecat.com/blog/growth/jake-castillo-cal-ai-sub-club-podcast-2026)) | **No** (needs humans). Shipreel should produce the **creator brief**, the clean screen-recording insert and caption/CTA text |
| 2 | **Faceless screen demo of the magic moment**: hook text → real app screens doing the one-two-three beat → result → named CTA | 0.5–1% installs/view, the best per-view rate among faceless formats (Flamme). Cal AI's thesis ("Show, Don't Tell": snap a photo → calories) | Show, don't tell. Needs an app with a visual one-tap result | **Yes**. This should be Shipreel's default |
| 3 | **Talking-head story / founder-led** (to camera, stakes first) | 1–2% view→install [vendor]. Push Scroll: $100K/mo on founder-led content plus ads ([Rork](https://docs.rork.com/rork-playbook/seven-ways-to-scale-your-app)). Stronger's founder reply/stitch loop ([Superwall](https://superwall.com/blog/how-stronger-built-a-usd600k-app-using-viral-on-demand-tiktok-strategy)) | A face plus a story. TikTok's own ad guidance: "We recommend featuring people such as creators, employees, or customers" ([TikTok Ads Help, Jun 2025](https://ads.tiktok.com/help/article/creative-best-practices)) [official] | **Partly**: founder face-cam + screen inserts + captions. Never a synthetic founder |
| 4 | **Reaction hook → demo**: a 1–3 s face reaction plus text hook, then a screen recording | 0.3–0.5% (Flamme). The core of most UGC programs, but "viewers are used to hook-and-demo" (`formats.md`) | A cheap human hook | **Partly**: user-supplied or stock reaction clips. Avoid AI faces |
| 5 | **Story slideshow with named-app CTA** (doubter/reveal, landlord/mum, pain → result) | Alberto: 100K downloads. Snugly: 482K-view hits. Feynman AI: 370K users (with ASO). But 0.2–0.4% view→install, and Snugly's 170K-view post with "She's redecorating now. Snugly." got ~0 downloads | Cheap to test hooks. Conversion depends almost entirely on the last-slide CTA naming the app and the outcome | **Yes**. Also render it as a video (see Metricool data above) |
| 6 | **Faceless theme-page / texting-story networks** (looksmaxxing edits, Minecraft b-roll texting) | Umax's first $30K from 2 theme-page posts. Rizz 550M views over 15+ accounts | Huge views on borrowed attention. App as a plot device. **Saturated in 2026**, and on the wrong side of TikTok's "many accounts / repetitive content" spam rule when automated (§9) | Technically yes; **do not default** |
| 7 | **Micro-format loops** (6 s fade-in, wall-of-text loop) | Stronger: 200–300M views, 2× watch-through, "conversion rates aren't spectacular" | Cheap reach. Weak intent. Decays in 3–6 months | Yes, as a reach supplement only |
| 8 | **Mascot / brand entertainment** (Duolingo) | Survey attribution only ("how did you hear about us") | Brand-scale awareness. No direct CTA by design | Yes for recurring characters. Low priority |
| 9 | **AI-avatar testimonials** | "AI UGC, great for vanity views, terrible for conversions… I've not seen it convert" (SideShift co-founder Nick Lawton, [podcast](https://www.youtube.com/watch?v=F2dVvzvwtBY), via `formats.json`). Vendor studies range from a 63% lower conversion rate to "within 10–20%" ([Moburst](https://intercept.moburst.com/ai-avatar-ads-vs-real-creators-which-wins-on-meta/), [dansugc](https://dansugc.com/blog/ai-ugc-vs-real-human-ugc-converts-better-2026)) [vendor, conflicting] | Trust gap. Mandatory labels. The FTC rule bans testimonials from people who don't exist ([FTC 2024](https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials)) | Should be **off by default** |

**What works with AI.** AI works when the artificiality *is* the content: a recurring openly-fictional character (Depuff's "Luna") or an AI result being revealed. It fails when it impersonates a human reviewer ([Lightreel, 2026-10-10](https://lightreel.ai/blogs/ai-generated-ugc-videos)) [vendor].

---

## 3. Operator playbooks

### 3.1 The sequence the winners followed
1. **Design the filmable moment before marketing.** Cal AI's "magic moment" test: "If your app doesn't have a magic moment, it doesn't lend itself well to a seamless integration because it's not going to cause that double take." Apps that need a paragraph of explanation should use hard-sell paid ads instead ([Sub Club](https://www.revenuecat.com/blog/growth/jake-castillo-cal-ai-sub-club-podcast-2026)). Blake Anderson's apps are each "one action = one result (immediate)" ([Ivaldy](https://julianivaldy.com/the-viral-app-playbook)).
2. **Consume the niche with a dedicated account first.** Blake and Zach created new TikTok accounts that only watch the niche, to find formats and creators ([Koerner](https://newsletter.chrisjkoerner.com/p/1m-month-by-month-7-fed4), [Superwall Part 2](https://superwall.com/blog/part-2-how-to-design-a-viral-app-in-2025)).
3. **Find the format yourself (founder-led) before paying anyone.** Rork: "Founder-led content also builds the viral sense in you… you can write better briefs." When replicating a viral format, "replicate everything: the music, the length of the video, the pacing, the vibe" ([Rork](https://docs.rork.com/rork-playbook/seven-ways-to-scale-your-app)).
4. **Pick creators by their comments, not their views.** "Views can lie. Followers can lie, but comments cannot." Look for commenters asking for the solution your app gives ([Sub Club](https://www.revenuecat.com/blog/growth/jake-castillo-cal-ai-sub-club-podcast-2026)).
5. **Cap pay at your revenue per 1,000 views (RPM).** "You can't pay like a CPM that is higher than that RPM." Prefer flat-rate deals so outlier videos are pure profit (same source). Blake's rule: prioritise channels where 2×RPM > CPM ([Ivaldy](https://julianivaldy.com/the-viral-app-playbook)).
6. **Boost organic winners as paid ads.** Cal AI used organic winners as its ad creative ([Koerner](https://newsletter.chrisjkoerner.com/p/1m-month-by-month-7-fed4)). But Cal AI's "viral creator posts underperformed as paid ads until the team made dedicated creative" ([Sub Club](https://www.revenuecat.com/blog/growth/jake-castillo-cal-ai-sub-club-podcast-2026)). Opal licensed a creator's organic video as an ad ([Better Launch](https://www.betterlaunch.co/playbooks/kenneth-schlenker-opal-billion-user-9)). Rork: start at $50–100/day and raise 25%/week once ROAS is 1.2–2× ([Rork](https://docs.rork.com/rork-playbook/seven-ways-to-scale-your-app)).

### 3.2 Cadence and account counts

| Who | Posts | Accounts | Source |
|---|---|---|---|
| Single honest account (Buffer, 11.4M TikToks) | 2–5/week ≈ +17% views/post vs 1/week; 11+/week ≈ +34%. The median stays ~500 | 1 | [SEJ on Buffer](https://www.searchenginejournal.com/study-shows-2-5-weekly-tiktoks-deliver-biggest-view-increase/558641/) [vendor] |
| Larry (Snugly) | 3/day at 07:30, 16:30, 21:00 | 1 per app | [Larry skill](https://clawhub.ai/olliewazza/skills/larry) [first-hand] |
| Alberto | ~3/day | 6–7 on one phone, posting on 5 | `playbook.md` (transcript) |
| UGC creator programs | 30–60 videos/month per creator. $10–15 base plus view bonuses ($150 @100K … $1,000 @1M). Start with 1–3 creators, scale to 10–20 once a format works | 1 new account per creator | [Rork](https://docs.rork.com/rork-playbook/seven-ways-to-scale-your-app) |
| Influencers on their own accounts | $1–2 CPM capped at $1,000/video (Rork). Cal AI targeted ~$5 CPM | n/a | [Rork](https://docs.rork.com/rork-playbook/seven-ways-to-scale-your-app), [Koerner](https://newsletter.chrisjkoerner.com/p/1m-month-by-month-7-fed4) |
| Cal AI at peak | 50–70 influencers posting on a given day | n/a | [Sub Club](https://www.revenuecat.com/blog/growth/jake-castillo-cal-ai-sub-club-podcast-2026) |
| Clipping / pay-per-view marketplaces | ≈$1 per 1K views (Whop, before ~7–10% fee) | n/a | [clipaffiliates](https://www.clipaffiliates.com/blog/clipping-cpm-rates-2026), [clipspeed](https://www.clipspeed.ai/blog/whop-content-rewards-clipping-guide.html) [vendor] |
| Stronger | ~300 micro-variants of one format | "Multiple accounts" | [Superwall](https://superwall.com/blog/how-stronger-built-a-usd600k-app-using-viral-on-demand-tiktok-strategy) |

Notes on timing and decay:
- **96% of a TikTok post's reach and ~98% of its interactions arrive within 10 days.** Judge a post at 24 h / 72 h / day 10, then archive the verdict.
- **The global peak viewing window is 18:00–21:00 local, with 20:00 the highest hour** (Metricool, 2.31M posts) ([NetInfluencer](https://www.netinfluencer.com/tiktok-content-volume-up-nearly-80-percent-in-early-2026-as-per-post-performance-declined-report-finds/)) [vendor].
- tap-3 reports bio-link installs peak at 19:00–21:00 (`playbook.md`) [vendor].

### 3.3 Hook A/B testing (what operators actually do)
- **Change one variable at a time.** Keep the body, images and CTA fixed; vary only the slide-1 or first-3-second hook. Schedule one variant per slot at the same time of day (Larry, `playbook.md`).
- **Use thresholds, not taste.** Larry skill thresholds:
  - <1K views twice → drop the hook.
  - 1–10K → try one more variation.
  - 10–50K → keep it in rotation.
  - 50K+ → make 3 variations.

  Hooks decay: Snugly's "landlord" hook went 132K → 8K → 7K → 4K and was retired ([Larry skill](https://clawhub.ai/olliewazza/skills/larry); `playbook.md`).
- **Make variants that are very different.** TikTok's ad guidance is 3–5 creatives per ad group, and "it is always better to use creatives with big differences" ([TikTok Ads Help](https://ads.tiktok.com/help/article/creative-best-practices)) [official]. Blake's paid-test note: put variations of one format in an ad group, not wildly different creatives, because TikTok optimises toward CPM/CTR, not CPI ([Ivaldy](https://julianivaldy.com/the-viral-app-playbook)).
- **Instagram Trial Reels are the clean hook test.** They show to non-followers first, give metrics after ~24 h, and can auto-share to followers based on the first 72 h ([inro](https://www.inro.social/blog/what-is-a-reel-trial-and-how-does-it-work), [Storrito](https://storrito.com/resources/how-instagram-trial-reels-work-72-hours/)) [secondary].
- **Make micro-variants, never duplicates.** Stronger changed "backgrounds, legend placements, hook wording, and visual elements" so there was "enough variation to help avoid spam hits" ([Superwall](https://superwall.com/blog/how-stronger-built-a-usd600k-app-using-viral-on-demand-tiktok-strategy)).

### 3.4 Warm-up, geo and posting method
- **Warm-up.** 3–14 days of niche-only scrolling and engagement before posting, depending on the source. Every source says this; none has a controlled test [unverified] ([Larry skill](https://clawhub.ai/olliewazza/skills/larry), [ReelFarm](https://reel.farm/guides/how-to-warm-up-tiktok-account)).
- **API vs manual posting.** A scheduler vendor's 202-video test found no reach difference between API-scheduled and manual posts ([ZoomSphere citing Metricool](https://www.zoomsphere.com/blog/does-scheduling-kill-your-tiktok-reach-in-2026)) [vendor, self-interested].
  - The real "zero views" trap is different: **unaudited API clients can only post `SELF_ONLY`** ([TikTok Direct Post API](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)) [official].
  - Practitioners still upload as drafts so they can add a trending sound in-app ([Larry skill](https://clawhub.ai/olliewazza/skills/larry)).
- **Stagger portfolio accounts.** Best-time features push every account into the same window. ZoomSphere recommends staggering accounts across three daily windows at least 45 minutes apart ([ZoomSphere](https://www.zoomsphere.com/blog/does-scheduling-kill-your-tiktok-reach-in-2026)) [vendor].

---

## 4. Exact production specs

### 4.1 Canvas and encode
- **Canvas:** 1080×1920, 9:16, at least 720p. TikTok's own conversion study:
  - 720p+ → **+312% conversion** vs lower resolution.
  - Full 9:16 → **+91%** vs black-bar framing.

  Source: [TikTok for Business blog, 2021-12-21](https://ads.tiktok.com/business/en-US/blog/creative-that-drives-conversions) [official, older ad data].
- **Never letterbox or pillarbox.** Don't post landscape crops (same source; Oliver Henry also saw landscape crops underperform, `playbook.md`).

### 4.2 Safe zones at 1080×1920 (published ad-spec numbers)

| Platform | Top | Bottom | Left | Right | Notes | Source |
|---|---|---|---|---|---|---|
| TikTok (in-feed template) | 240 | 660 | 120 | 120, **plus a 180 px button column from y=840 down** (so 300 px right margin below y=840) | Scaled from TikTok's 720×1280 template (160/440/80) | [Socialync](https://www.socialync.io/tools/safe-zones/tiktok), [AdKit v2026-09-10](https://adkit.so/tools/safe-zones/tiktok) |
| Instagram Reels | 269 (14%) | 672 (35%) | 65 (6%) | 65 (6%) | Meta's percentages for Reels ads | [Socialync](https://www.socialync.io/tools/safe-zones/instagram-reels) |
| YouTube Shorts | 288 | 672 | 48 | 192 | Google's numbers for vertical video ads in Shorts | [Socialync](https://www.socialync.io/tools/safe-zones/youtube-shorts) |
| **Shipreel cross-post union (use this)** | **288** | **672** | **120** | **192 above y=840; 300 below y=840** | Key text box = x 120–888, y 288–1248 (768×960); narrows to x 120–780 below y=840 | derived from the three rows above |

Practitioner organic rule of thumb: no text in the bottom 20% (384 px) or top 10% (192 px). The hook is centred ~28% from the top, about y≈540 ([Larry skill code](https://clawhub.ai/olliewazza/skills/larry)). The union box above is stricter and contains that position, so use the union for anything that will be cross-posted.

Meta data relayed by agencies: Reels ads that broke the safe zone had **28% lower CTR** ([Adsmurai](https://www.adsmurai.com/en/articles/meta-reels-ads)) [secondary, not verified on Meta's site].

Shipreel's current `useSafeArea()` uses TikTok's 240/660/120. Switch it to the union so Reels and Shorts cross-posts don't clip.

### 4.3 Text
- **Font:** **TikTok Sans**. TikTok's own typeface, open-sourced under OFL 1.1, available on Google Fonts. TikTok says it is "available in the TikTok app as 'Classic,' 'Bold,' and 'Oblique'" ([TikTok for Developers](https://developers.tiktok.com/blog/tiktok-sans-open-source), [GitHub](https://github.com/tiktok/TikTokSans)) [official]. Rendering with TikTok Sans makes baked text look like it was typed in the app.
- **Two native looks:**
  1. White fill with black outline (Larry's renderer).
  2. TikTok's white rounded label box with black text.

  Alberto types text in TikTok's editor with native fonts (`playbook.md`).
- **Size and length (Larry spec, on a 1024 px wide image):**

  | Hook length | Font size (% of width) | ≈ px at 1080 w |
  |---|---|---|
  | ≤5 words | 7.5% | ~81 px |
  | ≤12 words | 6.5% | ~70 px |
  | Longer | 5% | ~54 px |

  - **4–6 words per line, 3–4 lines.**
  - Write **reactions, not labels**: "Wait... this is actually nice??" instead of "Modern minimalist".
  - No emoji in baked text ([Larry skill](https://clawhub.ai/olliewazza/skills/larry)) [first-hand].
- **Timing:**
  - Text visible on frame 1. Gaming ads showing on-screen text in the first 7 s got **+43% conversion** ([TikTok blog](https://ads.tiktok.com/business/en-US/blog/creative-that-drives-conversions)).
  - "Introduce your content proposition in the first 3 seconds… Prioritize your hook in the first 6 seconds."
  - Use captions or text overlays; TikTok suggests "5–10 words per second" ([TikTok Ads Help, Jun 2025](https://ads.tiktok.com/help/article/creative-best-practices)) [official].
  - Treat 5–10 wps as the ceiling for *animated word captions*. Static slide text must stay up long enough to read twice.
- **Voice:** lowercase, conversational. Jack Friks: lowercase helps it "feel not AI" (`formats.md`).

### 4.4 Length

| Format | Length | Source |
|---|---|---|
| Paid/organic conversion sweet spot (TikTok) | **21–34 s** got +280% conversion vs shorter or longer (ad data, 2021) | [TikTok blog](https://ads.tiktok.com/business/en-US/blog/creative-that-drives-conversions) |
| Hook-test cuts | 6–15 s; one hook, one proof, one CTA | [inBeat benchmark](https://inbeat.agency/blog/ugc-video-length-benchmark) [vendor] |
| Fade-in / loop micro-format | 6 s (watch time >2× length) | [Superwall/Stronger](https://superwall.com/blog/how-stronger-built-a-usd600k-app-using-viral-on-demand-tiktok-strategy) |
| Story slideshow | 6 slides (hook → problem → reveal → reaction → CTA → follow) at 1024×1536 source; max 35 images | [Larry skill](https://clawhub.ai/olliewazza/skills/larry), [TikTok Photo API](https://developers.tiktok.com/doc/content-posting-api-reference-photo-post) |
| Texting-story b-roll | 2–5 min | [Shortimize/Rizz](https://www.shortimize.com/blog/rizz-apps-b-roll-strategy-that-got-them-half-a-billion-views-on-tiktok) |
| YouTube Shorts ceiling | 3 min (since 2024-10-15). Shorts views count from first play since 2025-03-31, so they aren't comparable to TikTok views | [Engadget](https://engadget.com/entertainment/youtube/youtube-shorts-can-now-run-up-to-three-minutes-160002081.html), [PPC Land](https://ppc.land/youtube-changes-how-shorts-views-are-counted-from-march-31/) |

Shipreel default: **demo videos 15–30 s** (target ~22 s), **hook tests 7–12 s**, **slideshows 5–7 slides**.

### 4.5 Sound
- **Sound is mandatory.** "Using sound/music" is in TikTok's basic checklist ([TikTok Ads Help](https://ads.tiktok.com/help/article/creative-best-practices)). The Larry skill says "silent slideshows get buried" ([Larry skill](https://clawhub.ai/olliewazza/skills/larry)) [first-hand].
- **Trending songs can't go through the API.** They have to be added in-app, so Shipreel's draft workflow should stay.
  - For **photo posts**, TikTok's Direct Post API has **`auto_add_music: true`**: "recommended music will be automatically added to photos" ([TikTok Photo Post API](https://developers.tiktok.com/doc/content-posting-api-reference-photo-post)) [official]. Use it whenever a slideshow goes out via Direct Post.
- **Business accounts are limited to the Commercial Music Library** for in-app sound picking. Mainstream music on a business account risks muting ([Soundstripe](https://www.soundstripe.com/blogs/why-can-i-only-use-commercial-sounds-on-tiktok), [Planoly](https://planoly.com/blog/commercially-licensed-vs-trending-sounds-what-can-brands-use)) [secondary].
- **Match the emotion.** "Put reggaeton on a sad video and it won't go viral" (Alberto, `playbook.md`).
- **A brand sound builds recall** (Stronger). Locket's founder sound became the trend others reused ([TechCrunch](https://techcrunch.com/2022/01/11/locket-an-app-for-sharing-photos-to-friends-homescreens-hits-the-top-of-the-app-store)).
- **Sound is a categorisation signal, not a traffic source.** It brings <1% of direct traffic (Metricool, [NetInfluencer](https://www.netinfluencer.com/tiktok-content-volume-up-nearly-80-percent-in-early-2026-as-per-post-performance-declined-report-finds/)) [vendor].

### 4.6 Caption and hashtags
- **Hashtags:** 1–2 targeted ones, never #fyp/#viral. Posts with ≥1 hashtag got +5% views; hashtag traffic grew 114% YoY; FYP is still 73% of views (Metricool, same source) [vendor].
- **Ask a question.** Captions that ask a question get +26% comments. Asking for likes gets **−60% likes** (same source).
- **Caption limits:** TikTok video captions max 2,200 UTF-16 runes. Photo posts: title 90, description 4,000 ([TikTok API docs](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post), [photo](https://developers.tiktok.com/doc/content-posting-api-reference-photo-post)).

---

## 5. CTA mechanics (where installs leak)
1. **Name the app and the outcome in first person, on the last frame or slide.** Snugly's "She's redecorating now. Snugly." → ~0 downloads. "The Snugly app helped me finally convince her to get the kitchen done" → converted ([Greg Isenberg pod](https://www.youtube.com/watch?v=OV5eK91YY68), `playbook.md`). TikTok data: a text CTA gave **+152% conversion** vs no clear CTA ([TikTok blog](https://ads.tiktok.com/business/en-US/blog/creative-that-drives-conversions)) [official].
2. **Caption the app name when the integration is subtle.** Cal AI added an on-screen caption naming the app only for subtle integrations, because the caption "cost views" when the integration was already obvious ([Sub Club](https://www.revenuecat.com/blog/growth/jake-castillo-cal-ai-sub-club-podcast-2026)).
3. **Put the app name in three places:** last frame, caption and pinned comment. Comments asking "what's the app?" are a conversion surface. Reply to them and pin the reply (`playbook.md`: Lovely's 4M-view post drew 503 comments, mostly asking the name).
4. **Prefer "search [App] on the App Store" over a link.** TikTok needs 1,000 followers (personal) or a verified business account for a bio link. Personal accounts can't link App Store pages ([TechCrunch 2023](https://techcrunch.com/2023/03/08/tiktok-begins-blocking-links-to-app-store-pages-from-creators-bios/)). A store-search CTA also lifts ASO, as Stronger noted with copycats ([Superwall](https://superwall.com/blog/how-stronger-built-a-usd600k-app-using-viral-on-demand-tiktok-strategy)).
5. **Don't rely on caption links:** TikTok caption links aren't clickable. Use bio, comments or store search.
6. **Attribute every post.** Add a "How did you hear about us?" onboarding step (Duolingo uses it to tie TikTok spikes to signups: [Milk Karten](https://www.milkkarten.net/p/yes-duolingos-viral-tiktoks-lead)). Use per-creator codes and RevenueCat revenue per post. Cal AI read creator RPM straight off the download chart when nothing else was running ([Sub Club](https://www.revenuecat.com/blog/growth/jake-castillo-cal-ai-sub-club-podcast-2026)).

---

## 6. Metrics operators optimise

| Metric | Target | Why | Source |
|---|---|---|---|
| **Installs (or revenue) per 1K views** | Format-dependent: memes ~0.5–2 per 1K; demos 5–10 per 1K | The only metric that pays. Cap creator CPM below it | Flamme ([X](https://x.com/JosephKChoi/article/2024201897322709065)); [Sub Club](https://www.revenuecat.com/blog/growth/jake-castillo-cal-ai-sub-club-podcast-2026) |
| **3-second hold** (TikTok) | ≥70% good; 75–80% predicts a viral post | The hook works | Nomad Table via `formats.md` [first-hand] |
| **Viewed vs swiped away** (Shorts) | 70%+ strong; ~50% average | Shorts' version of the hook metric | [ReelRise](https://reelrise.app/guide/viewed-vs-swiped-away-the-only-youtube-shorts-metric-that-matters/) [vendor] |
| **Average watch time / completion** | Above video length means rewatches (Stronger >2×) | The body holds attention | [Superwall](https://superwall.com/blog/how-stronger-built-a-usd600k-app-using-viral-on-demand-tiktok-strategy) |
| **Instagram: watch time, likes per reach, sends per reach** | Mosseri's top 3 signals. "Sends are slightly more important for unconnected content" (non-followers) | Reach beyond followers | [Social Media Today, Jan 2025](https://www.socialmediatoday.com/news/instagram-shares-algorithm-insights-2025/738034/) [official quote] |
| **Engagement rate** (likes+comments+saves+shares / views) | ≥5% boost it; 7.5–8% good; 12%+ very viral | Spark/partnership-ad candidate | SideShift via `formats.md` |
| **Comments that ask for the solution** | Qualitative | Predicts conversion better than views ("comments cannot lie") | [Sub Club](https://www.revenuecat.com/blog/growth/jake-castillo-cal-ai-sub-club-podcast-2026) |

Reality check: TikTok views per post fell 31% YoY in early 2026 as content volume rose 72–140%. Medium and big accounts lost about 40% ([Metricool via NetInfluencer](https://www.netinfluencer.com/tiktok-content-volume-up-nearly-80-percent-in-early-2026-as-per-post-performance-declined-report-finds/)). Benchmark each account against its own median, not against 2024 screenshots.

---

## 7. Native vs ad vs AI: the tells checklist

Shipreel's "launch check" should flag every item below. Each one is either platform-stated or reported first-hand.

**Reads as an ad (gets scrolled past)**
- [ ] **Studio polish.** Slick motion graphics, perfect lighting, stock-music swells. TikTok's own guidance: "go for a DIY or not overly polished style so that it fits in with the user-generated content" ([TikTok Ads Help](https://ads.tiktok.com/help/article/creative-best-practices)). Stronger: "Overproduction signals advertising, which triggers skepticism" ([Superwall](https://superwall.com/blog/how-stronger-built-a-usd600k-app-using-viral-on-demand-tiktok-strategy)).
- [ ] **Brand-first first frame.** A logo, app icon, product name or feature name in the hook. Snugly's feature-first hooks got ~1K views vs 100–480K for person+conflict hooks (`formats.md`).
- [ ] **A paragraph of explanation before the result.** No magic moment in the first beat ([Sub Club](https://www.revenuecat.com/blog/growth/jake-castillo-cal-ai-sub-club-podcast-2026)).
- [ ] **Agency-template typography** (thin geometric sans, gradient pills, lower-thirds) instead of TikTok Sans / Classic with outline or a white label box.
- [ ] **Polished launch-film look.** "Sleek 3D animations, minimalist sans-serif typography, swooshing sound design" now reads as generic (`formats.md`).
- [ ] **A hard pitch mid-video.** Duolingo's influencer rule: "No promo codes, no 'download Duolingo!' calls to action" ([Milk Karten](https://www.milkkarten.net/p/yes-duolingos-viral-tiktoks-lead)). Exception: the last-frame CTA in §5, which still names the app.
- [ ] **Letterboxing, sub-720p, text under the UI** (see §4.1–4.2).

**Reads as AI-generated / slop**
- [ ] **AI human faces.** Watch for overly smooth skin with no pores, too-even lighting, hair moving in clumps, hands clipping through objects, and garbled text on packaging ([Lightreel](https://lightreel.ai/blogs/ai-generated-ugc-videos)). Oliver Henry: "humans are extremely good at recognizing what an AI human is" (`playbook.md`).
- [ ] **Scene drift between slides.** Each slide looks like a different room. Lock one detailed scene description into every image prompt ([Larry skill](https://clawhub.ai/olliewazza/skills/larry)).
- [ ] **Generic prompts** ("a nice living room"). Larry: they "get scrolled past"; be "extremely specific" and include everyday clutter ([Larry skill](https://clawhub.ai/olliewazza/skills/larry)).
- [ ] **Template sameness across posts.** Identical layouts, caption structures or rigid schedules ([OpenClip guide](https://openclip.app/guides/tiktok-slideshow-unoriginal-content-flag), [vendor, unverified]). Rotate visual templates every ~10–15 posts.
- [ ] **Recognisable TTS voices** on a "personal" story. Generic TTS is allowed and needs no label on TikTok, but a cloned real voice needs one ([TikTok CG 2026H2](https://www.tiktok.com/community-guidelines/en/fyf-standards)).
- [ ] **C2PA/Content Credentials left in the file** from AI tools. These trigger automatic AI labels on TikTok and Meta ([TikTok newsroom, 2026-07-10](https://newsroom.tiktok.com/helping-people-spot-and-understand-aigc-on-tiktok?lang=en-150); [howsociable](https://howsociable.com/news/2026/04/instagram-ai-content-labels-required-april-2026)). Disclose honestly when content is realistic; don't strip metadata to dodge a label.

**Reads as native / human (what to do instead)**
- [ ] Hook = **person + conflict + curiosity**, readable with the sound off, on frame 1. Examples: "my landlord said I can't change anything…", "I showed my nan what AI thinks…".
- [ ] **Real app screens recorded on a real device or simulator**, phone-camera b-roll, slight imperfection. Snugly's best image had a mistake that commenters rushed to correct (`playbook.md`).
- [ ] **Lowercase, Gen-Z voice, reactions not labels.**
- [ ] **In-app sound** (draft + trending) or `auto_add_music` for photo posts.
- [ ] **Variety of scenes.** In TikTok's e-commerce data, multi-scene videos got +38% conversion vs one continuous shot. In gaming, 5+ scenes got +171% ([TikTok blog](https://ads.tiktok.com/business/en-US/blog/creative-that-drives-conversions)).

---

## 8. AI-generated video: does it perform, and how is it labelled?

**Performance**
- Practitioners agree AI avatars get views but don't convert well: SideShift's "terrible for conversions" and FaithFull's real-creator reshoot beating its best AI ad (`formats.md`).
- Vendor studies conflict wildly (−63% conversion vs "within 10–20%") ([dansugc](https://dansugc.com/blog/ai-ugc-vs-real-human-ugc-converts-better-2026), [tok-vibes](https://tok-vibes.com/blog/ugc-vs-ai-avatar-ads)) [vendor].
- **Where AI is proven:** high-volume *paid* creative testing (Speechify's ~1,300 AI ads/day, judged only on conversion: [Speechify/20VC](https://speechify.com/news/speechify-ceo-cliff-weitzman-20vc-podcast/)), images of things, scripts, and openly fictional recurring characters ([Lightreel](https://lightreel.ai/blogs/ai-generated-ugc-videos)).
- **Audience controls:** since Nov 2025, TikTok users can turn AI content *down* with a slider in Manage Topics ([TechSpot](https://www.techspot.com/news/110315-sick-ai-slop-feed-tiktok-finally-you-turn.html)). Every AI-labelled post therefore reaches a smaller pool.

**Labelling rules (2026)**

| Platform | Rule | Penalty | API field |
|---|---|---|---|
| TikTok | "You must label content that uses AI or includes significant edits to show realistic-looking people or scenes." Not required for colour correction, crops, artistic styles or generic TTS ([CG 2026H2](https://www.tiktok.com/community-guidelines/en/fyf-standards)) | "Unlabeled content may be removed, restricted, or labeled by our team." TikTok has labelled 3B+ videos via C2PA, creator tools and invisible watermarks, and is testing detection of AI-spam accounts ([newsroom 2026-07-10](https://newsroom.tiktok.com/helping-people-spot-and-understand-aigc-on-tiktok?lang=en-150)). Help Center (as quoted by a third party): the label "will not affect distribution" for compliant posts ([jackrighteous](https://jackrighteous.com/blogs/ai-art-visuals-creatives/tiktok-ai-music-video-labels-spam-reach-2026)) | `post_info.is_aigc: true` (video and photo) ([Direct Post API](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)) |
| Instagram / Meta | From 2026-04-30, Reels with substantially AI-generated realistic imagery, video or voice need the AI label. Unlabelled-but-detected content is reported to be demoted and auto-labelled, with escalating demotions ([howsociable, 2026-04-18](https://howsociable.com/news/2026/04/instagram-ai-content-labels-required-april-2026)) [secondary; Meta wording not verified] | Demotion in Reels recommendations (reported) | "AI info" label; read from C2PA/IPTC metadata |
| YouTube | Disclose realistic altered or synthetic content. The "inauthentic content" (formerly "repetitious") monetisation policy took effect 2025-07-15: mass-produced or repetitive uploads lose YPP eligibility ([Gulf News](https://gulfnews.com/technology/youtube-updates-monetisation-policies-ai-and-repetitive-content-ban-begins-july-15-1.500192660), [Plagiarism Today](https://www.plagiarismtoday.com/2025/07/08/youtube-targets-inauthentic-content/)). Mohan's 2026 letter targets "AI slop" ([Decrypt](https://decrypt.co/355373/youtube-plans-ai-expansion-2026-promising-crackdown-ai-slop)) | Demonetisation and removal of slop channels | `status.containsSyntheticMedia` (videos.insert/update, since 2024-10-30) ([YouTube API revision history](https://developers.google.com/youtube/v3/revision_history)) |
| Legal | The FTC bans fake testimonials, including from people who don't exist ([FTC](https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials)). EU AI Act Art. 50 disclosure applies from 2026-08-02 ([AI Act](https://artificialintelligenceact.eu/article/50/)) | Regulatory | n/a |

---

## 9. Platform rules that matter for auto-posting

**TikTok** (Community Guidelines released 2026-08-25, effective 2026-09-24; [source](https://www.tiktok.com/community-guidelines/en/fyf-standards)) [official]:
1. **Commercial disclosure:** "Disclosure is required when you're: Promoting your own business, product, or service." If undisclosed, "we may reduce its visibility or apply the content disclosure setting. Repeated failure… temporarily restricted… or… account ban."
   - API: set **`brand_organic_toggle: true`** for your own app.
   - Set `brand_content_toggle: true` for paid creator partnerships ([Direct Post API](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)).
2. **FYF-ineligible:** "Reused or unoriginal content posted without creative edits, such as clips that show someone else's watermark or logo"; "Low-quality or minimally edited content, such as short clips made from GIFs only." Also "Content is also ineligible for the FYF if it includes unoriginal or reused material without anything new."
3. **Spam:**
   - "Using automation to run many accounts or send repetitive content."
   - "Using bots or scripts to write fake reviews or comments, or to increase likes or shares."
   - "Pretending to be a fake person or organization with the goal of misleading people."

   Faceless "fake user" farms and seeded comments from sock-puppet accounts fall squarely here.
4. **AIGC labels:** see §8.
5. **API audit:** unaudited Content Posting API clients can only post `SELF_ONLY`. Photo posts must be `PULL_FROM_URL` from a verified domain and allow up to 35 images ([Photo Post API](https://developers.tiktok.com/doc/content-posting-api-reference-photo-post)) [official].

**Instagram**
- **Originality:** reposting aggregators lose recommendations. Since 2026-04-30 this covers photos and carousels as well as Reels. Speed changes or credit screenshots don't count as original; "humor, social commentary… or a relatable take" do ([Tubefilter](https://tubefilter.com/2026/04/30/instagram-removes-algorithm-recommendations-repost-content-aggregator)).
- **Watermarks:** Reels with other apps' watermarks or logos are made "less discoverable" ([Tubefilter, 2021](https://tubefilter.com/2021/02/10/instagram-reels-with-tiktok-watermark-less-discoverable/)). Shipreel must export clean masters per platform, never a re-download of the TikTok.

**YouTube Shorts**
- The inauthentic-content policy (2025-07-15) hits mass-produced, repetitive uploads (§8).
- Views count from the first frame since 2025-03-31, so compare Shorts by viewed-vs-swiped and engaged views, not raw views ([PPC Land](https://ppc.land/youtube-changes-how-shorts-views-are-counted-from-march-31/)).

---

## 10. What Shipreel's generator must do by default

Concrete defaults, in priority order:

1. **Default format = magic-moment demo.** Use a 1–2 s person/conflict hook, then real app screens showing the one-two-three beat, then the result screen, then a first-person CTA naming the app and the outcome. Target ~22 s (15–30 s range) and also render a 7–12 s hook-test cut. The product brief must contain a field "magic moment (3 beats)". If the brief can't fill it, warn that organic may not work and suggest paid/hard-sell creative.
2. **Safe-zone union at 1080×1920.** Key text in x 120–888, y 288–1248. Keep x > 780 empty below y=840 (TikTok's button column). Hook text centred near y≈540, on frame 1.
3. **Text defaults:**
   - TikTok Sans 700–800.
   - White with a ~6–8 px black stroke, or the white label-box style.
   - 4–6 words per line, ≤4 lines.
   - Size ~80 px for ≤5 words, ~70 px for ≤12, ~54 px for longer.
   - Lowercase allowed. No baked emoji.
   - Animated word captions ≤5–10 wps.
4. **Every slideshow ships twice:** as a TikTok photo post (5–7 slides, `auto_add_music: true` on Direct Post, otherwise a draft) **and** as a 1080×1920 video. Metricool shows video gets 5.6× the views.
5. **Sound always.** Draft-to-inbox plus a "pick a trending sound" reminder (TikTok video). `auto_add_music` (TikTok photos). Emotion-matched licensed track baked into Reels/Shorts masters only. Never bake mainstream copyrighted songs. Offer a per-app "brand sound".
6. **Compliance flags on by default:**
   - `brand_organic_toggle: true` on every post promoting the user's own app.
   - `is_aigc: true` / `containsSyntheticMedia: true` / Instagram AI label whenever a scene contains realistic AI people or scenes. Auto-detect this from the scene spec.
   - Paid creator posts → `brand_content_toggle: true`.
7. **Uniqueness engine.** Each post and each account gets a different hook wording, background, scene order and layout offset. Never byte-identical files. Never a file carrying another platform's watermark. Rotate visual templates every ~10–15 posts.
8. **AI people off by default.** AI avatars and AI-generated humans are allowed only as openly fictional characters, behind a confirm-and-label step. Never as a "real user testimonial" (FTC; TikTok "fake person" spam rule).
9. **CTA linter.** Fail the launch check if:
   - the app name is missing from the last frame, the caption or the suggested pinned comment;
   - the CTA lacks an outcome;
   - the CTA asks for likes (−60% likes).

   Default caption: one question + 1–2 niche hashtags. Default CTA: "search *App* on the App Store".
10. **Measurement loop.** Pull stats at 24 h, 72 h and day 10. Compute per-post:
    - installs/1K views,
    - 3 s hold,
    - watch time vs length,
    - engagement rate.

    Apply the Larry thresholds automatically: <1K twice → drop; 50K+ → 3 variants. Track hook decay. Add an onboarding "how did you hear about us" snippet to the attribution branch.
11. **Scheduling.** Default 1–3 posts/day per account, with the primary slot at 18:00–21:00 local. Stagger multiple accounts across three windows ≥45 min apart. Warn when the API client is unaudited (posts will be private).
12. **Creator-brief export (for format #1).** One click produces a brief a real creator can film: the magic moment shot list, "don't show the first scan of the day" style gotchas, the caption with the app name, and a clean screen-recording insert. Cal AI's engine was humans. Shipreel should feed them, not replace them.

**Don't build as defaults:** multi-account "faceless user" farms, comment seeding, AI-testimonial actors, or metadata stripping to avoid AI labels. Each is explicitly against TikTok's 2026 rules (§9) or FTC rules, and those are the accounts collapsing to near-zero views in 2026 (Scratch AI 0–5 views/post, `formats.md`).

---

## 11. Open questions / weak spots
- **TikTok organic safe zones** aren't published; the numbers above are ad specs, which are stricter. Verify with a screenshot overlay on a current iOS build.
- **No independent test** shows API-posted vs manual reach on TikTok in 2026. Metricool's test is self-interested.
- **Instagram's AI-label demotion schedule** comes from secondary coverage only; Meta's wording isn't verified.
- **TikTok's 21–34 s and +152% CTA findings** are 2021 *ad* data. Directionally useful, not organic proof.
- **The Bible Chat and Umax origin stories** rest on secondary write-ups.

---

## Sources (all accessed 2026-10-16 unless dated)

**Platform / official**
- [TikTok Community Guidelines 2026H2 (FYF, spam, AIGC, commercial disclosure)](https://www.tiktok.com/community-guidelines/en/fyf-standards)
- [TikTok Newsroom, 2026-07-10, AIGC/spam](https://newsroom.tiktok.com/helping-people-spot-and-understand-aigc-on-tiktok?lang=en-150)
- [TikTok Ads Help: creative best practices (Jun 2025)](https://ads.tiktok.com/help/article/creative-best-practices)
- [TikTok for Business blog: conversion creative study (2021-12-21)](https://ads.tiktok.com/business/en-US/blog/creative-that-drives-conversions)
- [TikTok Direct Post API](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)
- [TikTok Photo Post API](https://developers.tiktok.com/doc/content-posting-api-reference-photo-post)
- [TikTok Sans open source](https://developers.tiktok.com/blog/tiktok-sans-open-source)
- [TikTok Sans on GitHub](https://github.com/tiktok/TikTokSans)
- [YouTube Data API revision history (containsSyntheticMedia)](https://developers.google.com/youtube/v3/revision_history)
- [FTC fake-testimonial rule](https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials)
- [EU AI Act Art. 50](https://artificialintelligenceact.eu/article/50/)

**Operators (first-hand or close to it)**
- [Sub Club: Jake Castillo, Cal AI (2026-10-14)](https://www.revenuecat.com/blog/growth/jake-castillo-cal-ai-sub-club-podcast-2026)
- [Koerner on Cal AI](https://newsletter.chrisjkoerner.com/p/1m-month-by-month-7-fed4)
- [hyper.ai on Yadegari's Disrupt talk](https://hyper.ai/en/stories/3f579372e804f00928cce70aac63e3f3)
- [Superwall on Stronger (2025-10-27)](https://superwall.com/blog/how-stronger-built-a-usd600k-app-using-viral-on-demand-tiktok-strategy)
- [Superwall: Blake Anderson, Part 2](https://superwall.com/blog/part-2-how-to-design-a-viral-app-in-2025)
- [Blake Anderson playbook (Ivaldy)](https://julianivaldy.com/the-viral-app-playbook)
- [Rork: 7 ways to scale](https://docs.rork.com/rork-playbook/seven-ways-to-scale-your-app)
- [Better Launch: Opal](https://www.betterlaunch.co/playbooks/kenneth-schlenker-opal-billion-user-9)
- [Milk Karten: Duolingo](https://www.milkkarten.net/p/yes-duolingos-viral-tiktoks-lead)
- [MRR Story: Feynman AI](https://www.mrrstory.com/stories/from-0-to-370k-users-using-tiktok-app-store-seo)
- [Speechify on 20VC](https://speechify.com/news/speechify-ceo-cliff-weitzman-20vc-podcast/)
- [Larry skill (Oliver Henry)](https://clawhub.ai/olliewazza/skills/larry)
- [Greg Isenberg × Oliver Henry](https://www.youtube.com/watch?v=OV5eK91YY68)
- [Tap and Swipe × Alberto](https://www.youtube.com/watch?v=NgsLwjkNo7A)
- [SideShift / Nick Lawton](https://www.youtube.com/watch?v=F2dVvzvwtBY)
- [Joseph Choi / Flamme](https://x.com/JosephKChoi/article/2024201897322709065)
- [TechCrunch: Locket (2022)](https://techcrunch.com/2022/01/11/locket-an-app-for-sharing-photos-to-friends-homescreens-hits-the-top-of-the-app-store)

**Data / benchmarks**
- [Metricool 2026 TikTok study via NetInfluencer](https://www.netinfluencer.com/tiktok-content-volume-up-nearly-80-percent-in-early-2026-as-per-post-performance-declined-report-finds/)
- [Buffer formats, 45M posts (2026-03-19)](https://buffer.com/resources/data-best-content-format-social-media/)
- [Buffer cadence via SEJ](https://www.searchenginejournal.com/study-shows-2-5-weekly-tiktoks-deliver-biggest-view-increase/558641/)
- [Mosseri signals, Social Media Today](https://www.socialmediatoday.com/news/instagram-shares-algorithm-insights-2025/738034/)
- [inBeat length benchmark](https://inbeat.agency/blog/ugc-video-length-benchmark)
- [Agniverse UGC benchmarks](https://agniverse.co/ugc-content-benchmarks)
- [ReelRise viewed-vs-swiped](https://reelrise.app/guide/viewed-vs-swiped-away-the-only-youtube-shorts-metric-that-matters/)
- [ZoomSphere scheduling and reach](https://www.zoomsphere.com/blog/does-scheduling-kill-your-tiktok-reach-in-2026)
- [Shortimize on Rizz](https://www.shortimize.com/blog/rizz-apps-b-roll-strategy-that-got-them-half-a-billion-views-on-tiktok)
- [Appfigures on Bible Chat](https://appfigures.com/resources/insights/20250418/5-this-is-how-to-drive-demand-for-the-oldest-book-in-the-world)
- [Lightreel AI-UGC report (2026-10-10)](https://lightreel.ai/blogs/ai-generated-ugc-videos)
- [Moburst AI avatar vs creators](https://intercept.moburst.com/ai-avatar-ads-vs-real-creators-which-wins-on-meta/)
- [dansugc AI vs human UGC](https://dansugc.com/blog/ai-ugc-vs-real-human-ugc-converts-better-2026)
- [clipaffiliates CPM rates](https://www.clipaffiliates.com/blog/clipping-cpm-rates-2026)
- [clipspeed Whop guide](https://www.clipspeed.ai/blog/whop-content-rewards-clipping-guide.html)

**Safe zones**
- [Socialync TikTok](https://www.socialync.io/tools/safe-zones/tiktok)
- [Socialync Instagram Reels](https://www.socialync.io/tools/safe-zones/instagram-reels)
- [Socialync YouTube Shorts](https://www.socialync.io/tools/safe-zones/youtube-shorts)
- [AdKit TikTok (v2026-09-10)](https://adkit.so/tools/safe-zones/tiktok)
- [Adsmurai on Meta Reels](https://www.adsmurai.com/en/articles/meta-reels-ads)

**Platform-rule coverage**
- [Tubefilter: Instagram originality, 2026-04-30](https://tubefilter.com/2026/04/30/instagram-removes-algorithm-recommendations-repost-content-aggregator)
- [Tubefilter: watermarks, 2021](https://tubefilter.com/2021/02/10/instagram-reels-with-tiktok-watermark-less-discoverable/)
- [howsociable: Instagram AI labels, Apr 2026](https://howsociable.com/news/2026/04/instagram-ai-content-labels-required-april-2026)
- [TechSpot: TikTok AI slider](https://www.techspot.com/news/110315-sick-ai-slop-feed-tiktok-finally-you-turn.html)
- [jackrighteous: TikTok AI label and reach](https://jackrighteous.com/blogs/ai-art-visuals-creatives/tiktok-ai-music-video-labels-spam-reach-2026)
- [Gulf News: YouTube inauthentic content](https://gulfnews.com/technology/youtube-updates-monetisation-policies-ai-and-repetitive-content-ban-begins-july-15-1.500192660)
- [Plagiarism Today: YouTube inauthentic content](https://www.plagiarismtoday.com/2025/07/08/youtube-targets-inauthentic-content/)
- [Decrypt: YouTube AI slop 2026](https://decrypt.co/355373/youtube-plans-ai-expansion-2026-promising-crackdown-ai-slop)
- [PPC Land: Shorts view counting](https://ppc.land/youtube-changes-how-shorts-views-are-counted-from-march-31/)
- [Engadget: 3-minute Shorts](https://engadget.com/entertainment/youtube/youtube-shorts-can-now-run-up-to-three-minutes-160002081.html)
- [TechCrunch 2023: App Store bio links](https://techcrunch.com/2023/03/08/tiktok-begins-blocking-links-to-app-store-pages-from-creators-bios/)
- [Soundstripe: commercial sounds](https://www.soundstripe.com/blogs/why-can-i-only-use-commercial-sounds-on-tiktok)
- [Planoly: commercial vs trending sounds](https://planoly.com/blog/commercially-licensed-vs-trending-sounds-what-can-brands-use)
- [inro: Trial Reels](https://www.inro.social/blog/what-is-a-reel-trial-and-how-does-it-work)
- [Storrito: Trial Reels](https://storrito.com/resources/how-instagram-trial-reels-work-72-hours/)
- [OpenClip: unoriginal flag](https://openclip.app/guides/tiktok-slideshow-unoriginal-content-flag)
- [IndieRadar: fake MRR](https://indieradar.app/blog/fake-mrr-pandemic-real-benchmarks)

**Companion research in this repo:** `research/playbook.md`, `research/formats.md`, `research/formats.json`, `research/posting.md` (transcripts and verified view counts).
