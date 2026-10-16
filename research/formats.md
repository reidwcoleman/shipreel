# Short-form formats that sell apps (2025–2026)

*Research for Shipreel · compiled 2026-10-15 · companion files: `formats.json` (25 formats), `hooks.json` (156 hooks)*

**How to read this.** Numbers marked **(verified)** were pulled with yt-dlp (or X's public tweet endpoint) on 2026-10-15. Everything else is a claim from a founder, operator or vendor, and is labeled with its source. Founders' revenue and "views across the program" figures are self-reported and can be inflated: Cluely's CEO publicly admitted to lying about revenue. The web-search quota ran out partway through, so a few leads ("choose your path" slideshows, street interviews, LinkedIn founder-video view counts) stayed unverified. Primary sources were 21 podcast transcripts from 2025–2026 (19 Superwall episodes, 2 Startup Ideas Podcast), about 90 individual TikTok/YouTube/X posts and dozens of account histories checked with yt-dlp, and operator write-ups.

---

## 1. Top insights

1. **Views and installs are different games, and the format decides which one you're playing.** Install rates reported per view: memes 0.05–0.2%; question slideshows 0.2–0.5%; reaction clips 0.3–0.5%; straight app demos 0.5–1% (Flamme, [Joseph Choi, Feb 2026](https://x.com/JosephKChoi/article/2024201897322709065)). Halo AI says a given format converts "always like 0.5% or 0.3%". The cautionary tales are big: Cluely's founder said a 49M-view video drove fewer than 100 downloads; Coconote's "PDF to brainrot" videos got 100–200M views and ~3,000 trials; one founder's AI slideshows did 4.1M views for $1,007.
2. **The machine is plural.** The apps with big organic numbers run many accounts or many creators, not one brand account: Halo AI ran 85 creators and ~300 posts/day; Nomad Table 60–70 creators; Flamme 20–30 phones; Rizz rented 15+ texting-story pages while its own account has 7 posts. Brand accounts that post product content sit at 1–12K median views (Opal ~1.2K, Cal AI ~3.7K, Finch 9.6K, Locket 12.3K, all verified).
3. **Clone, don't invent.** "Cloning is 90% of every campaign" (Clover Labs, $8M/yr agency). Only copy a format that has already hit 100K+ on accounts under 5K followers (Flamme's VSC rule), then change 10–20%. Exact copies on new accounts flop.
4. **The hook that wins is a person + a conflict + a reveal, never the feature.** Snugly's "my landlord said I can't change anything, so I showed her what AI thinks it could look like" got 482.5K (verified); its feature-first hooks got ~1K.
5. **Name the app explicitly at the end, but don't let the body look like an ad.** Snugly's 170K-view post sold nothing because the CTA slide just said "She's redecorating now / Snugly"; rewritten as "The Snugly app helped me convince her to finally get our kitchen done", it converted. Cal AI's best creators never said the name; a pinned comment and caption did the work.
6. **Faces convert; AI faces don't.** Talking to camera for 3+ seconds converts best (EVO Marketing's ladder: text loops < reaction→demo < talking head). AI UGC is "great for vanity views, terrible for conversions" (SideShift, Aug 2026), and FaithFull's real-creator reshoot beat its best AI ad. The AI that works is openly AI: recurring characters and AI-as-comic-foil (Depuff's "Luna", Praktika's tutor).
7. **Every format is perishable (3–6 months).** Stronger's fade-in (150–300M views) is "getting faded out"; Snugly fell from 2.09M views in February to 60K in April; Cray Cray's question-slideshow accounts are dead; "Day N until $X" vibe-coding series now get ~100–3,000 views.
8. **Slideshows are hot in tooling and hype, cooling in results.** Arcads launched "AI Slideshows" (Sep 24, 2026), LarryLoop claims 11,000 users, and TikTok has been promoting carousels. But automated slideshow networks are collapsing (two of Scratch AI's three accounts dropped to 0–5 views/post in Sep 2026), and Instagram stopped recommending carousel-reposting accounts on Apr 30, 2026. Useful list slideshows with saves still work (Lense 236.6K in Aug 2026).
9. **The comment section is the second engine.** AI mistakes that viewers rush to correct, seeded "what's the app?" comments, comment-reply videos and keyword auto-DM CTAs (Payout: ~50% of DM'd viewers clicked; Sam Beckman's "comment ORION" drew 962 comments) all convert attention into action.
10. **Founder content works when it's entertainment or a story, not a progress log.** Wins: Cluely's launch skit (13.3M on X), Megabonk's stakes-first devlogs (5.25M on Shorts), Marc Lou's odd-premise demo (1.1M), Jack Friks' Lovelee twist (314K likes). Losses: build-in-public TikToks rarely pass a few thousand views, and the audience is other builders.

---

## 2. The 25 formats at a glance

| Format (id) | Category | Status | Effort | Conversion read |
|---|---|---|---|---|
| Doubter Reveal Slideshow (`ai-reveal-slideshow`) | slideshow | steady | low | big views, thin installs unless CTA names app |
| Useful List Slideshow (`listicle-slideshow`) | slideshow | **hot** | low | high saves; app on last slide |
| Question Prompt Slideshow (`question-slideshow`) | slideshow | saturated | low | 0.2–0.5% (Flamme) |
| Faceless Screen Demo (`faceless-screen-demo`) | demo | steady | low | best per-view (0.5–1%) |
| How-To Shortcut Demo (`how-to-tutorial`) | demo | steady | medium | long-tail search; Payout earned 500+ days |
| Comment Reply Demo (`comment-reply-demo`) | demo | steady | low | objection handling |
| Odd-Premise Demo Post (`x-demo-post`) | demo | **hot** | low | dev tools on X |
| Reaction Hook + Demo (`reaction-hook-demo`) | reaction | steady | low | 0.3–0.5% |
| Green-Screen Reaction (`green-screen-reaction`) | reaction | **hot** | low | "most viral format" late 2026 (EVO) |
| Talking-Head Story (`creator-talking-head`) | ugc | **hot** | medium | best UGC conversion |
| Lifestyle Integration (`lifestyle-integration`) | ugc | **hot** | high | Cal AI's engine |
| AI Avatar Testimonial (`ai-avatar-ugc`) | ugc | saturated | low | "terrible for conversions" |
| Founder Origin Story (`founder-origin-story`) | founder-led | steady | low | platform-dependent |
| Founder Launch Film (`launch-video`) | founder-led | steady | high | median launch 28K views |
| Stakes Devlog Short (`stakes-devlog`) | build-in-public | **hot** | medium | games/dev tools |
| Day-N Build Series (`build-in-public-series`) | build-in-public | saturated | medium | audience = builders |
| Mascot Character Skit (`mascot-character-skit`) | skit | **hot** | medium | brand habit, soft CTA |
| POV Sitcom Skit (`pov-skit`) | skit | steady | high | doesn't scale across accounts |
| Trend Meme Remix (`meme-remix`) | skit | steady | low | lowest (0.05–0.2%) |
| Fake Text Story (`fake-text-story`) | story | saturated | low | needs app as plot device |
| Long-Text Loop (`wall-of-text-loop`) | text-on-screen | steady | low | weakest face format |
| Fade-In Screenshot Loop (`fade-in-reveal`) | text-on-screen | saturated | low | low (Stronger's own words) |
| Apps That Feel Illegal (`apps-listicle-video`) | listicle | saturated | medium | low intent per app |
| Before/After Reveal (`before-after-reveal`) | comparison | steady | low | score reveals drive comments |
| Side-by-Side Showdown (`old-vs-new-comparison`) | comparison | steady | medium | proof for AI/dev tools |

---

## 3. Case studies

### 3.1 Larry: an AI agent running TikTok slideshows (Oliver Henry, Snugly + Liply), Jan–Jun 2026
- **Setup.** An OpenClaw agent on an old gaming PC researches the niche, writes hooks, generates six "iPhone photo" images of one room (gpt-image-1.5, 1024×1536, layout locked), burns in text (bold white, black outline, ~28% from top, nothing in the top 10% or bottom 20%), and uploads a **draft** via the Postiz API. Oliver adds a popular song on his phone and publishes (~60 s/post). One TikTok account per app. ([ClawHub skill spec](https://clawhub.ai/olliewazza/larry), [Postiz](https://postiz.com/blog/ai-agent-tiktok-views-postiz-api), [podcast, 81.7K views](https://www.youtube.com/watch?v=OV5eK91YY68))
- **Verified account data.** @snugly.app: 97 posts (Jan 18–Jun 3, 2026), 2.89M views, median 5.2K. The first 24 posts all stayed under 6.7K; the breakout came Feb 7 (138.7K); all nine 100K+ posts landed Feb 7–Mar 1; best week was 13 posts for 1.30M. Monthly views then fell: Feb 2.09M → Mar 0.42M → Apr 60K. No posts since June. @liply.app (AI faces) never broke out: 49 posts, median 850.
- **Claimed money.** $588 MRR / 108 subscribers (Postiz, Apr 2026); his own Feb 8 tweet: "over 200k views on tiktok in 24 hours > 2 new paying subscribers". The widely shared "8M views in a week" doesn't match the two public TikTok accounts (~3.05M total).
- **Lessons.** (1) The 170K-view mum post sold nothing because the CTA was vague. Rule from Oliver: low views = bad hook; views without installs = bad CTA. (2) The best post (482.5K) had an AI glitch (the hob vanished) and text near the top; older viewers flooded the comments to correct it. (3) Hooks fatigue: "landlord" fell to 2K–8K while "nan" variants hit 200–300K. (4) Story slideshows earned ~0.35% likes and 0.06% saves, far below utility lists.
- **Productized.** LarryLoop launched ~Mar 20, 2026 at $39/$99/$249 a month for 1/3/10 posts a day ("used by over 11,000 people", unverified).

### 3.2 Flamme: a 20–30-phone farm and the conversion ladder (An Nayal), 2024–2026
- 20–30 TikTok accounts, each on its own iPhone, Apple ID and proxy; 150–200 posts a day at peak; 50M+ views; ~150–200K users; $3K → $10K MRR. Sharing one Apple ID across phones got accounts flagged en masse. The founder scrolled TikTok 4 hours a day for two months before posting. ([Choi article](https://x.com/JosephKChoi/article/2024201897322709065), [interview, 24.7K views](https://www.youtube.com/watch?v=pb4JIH8FubE), [Mobile UA Show, Jun 2026](https://mobileuseracquisitionshow.com/episode/how-to-produce-200-tiktoks-a-day-ankit-nayal/))
- He says more than half the 50M views were "wasted" because conversion wasn't in the framework. The fix was the **VSC** filter (Viral on small accounts, Scalable without refilming, Convertible = comments ask "what's the app?") and a shift to straight demos (0.5–1%).
- **View diagnostics:** <300 views = account problem; 300–1K = content quality; 1K–5K = iterate the format; 5K–100K = the hook works; 100K+ = scale it.

### 3.3 Cal AI: a creator network at industrial scale, 2024–2026
- Grew from ~20 to 200+ creators posting at once (50–70 on any day). Outreach: 25 assistants × ~100 emails/day; ~220K creators contacted, ~2K signed. Pay ~$350–450 for 4 posts plus capped view bonuses; creators priced on the average of their 5 worst recent videos; 700–800K minimum-view clauses. Peak ~$60M/yr; acquired by MyFitnessPal (Dec 2025 per one source, Mar 2026 per another). ([Superwall, Aug 2026](https://www.youtube.com/watch?v=l0vswWcGmMs), [Sub Club / RevenueCat, 2026](https://www.revenuecat.com/blog/growth/jake-castillo-cal-ai-sub-club-podcast-2026))
- **The brief:** show the "golden moment" (photo → calories) within 15 s, no script, don't say the name, pin a comment, "keep doing what you're doing and sneak our app in".
- **Verified creator posts:** @taaaaylerr 6.2M (Apr 2026, mom vlog, code in caption); @destineeroseofficial 1.6M (Jun 2026, hairstylist, app never said); @sashalusslover 1.2M (Nov 2025); @dafnnejm 992K (Aug 2026, Spanish GRWM).
- **What didn't work:** mukbang, recipe and UFC creators; a 100M-view video "didn't meaningfully convert"; paid ads only worked with dedicated hard-sell creative. By Sep 2026 "influencers have gotten increasingly expensive", and @taaaaylerr had switched to a rival's code.

### 3.4 Halo AI: one format, 85 creators, milestone pay (2025–2026)
- $300K MRR in 45 days; 600M views in 60 days, 1.2B in 120 (self-reported). Format: an absurd AI image made in the app with a prank caption ("Pranking my dad I cooked his koi fish"), 2 s of a giant "Halo AI" loading screen as the only CTA, then an iMessage-thread twist. Pay: $20/video + one-time bonuses at 20K/100K/500K/1M views ($60/$200/$500/$800); 29 of 30 creators preferred it to pure CPM. ~300 posts/day; any viral hit is sent to every creator to remake the same day. ~5% of videos pass 100K, ~1% pass 1M. ([Superwall, Mar 2026](https://www.youtube.com/watch?v=PFfo4JySptw))

### 3.5 Rizz: renting a fake-texting page network
- Rizz pages totaled 550M+ views across 15+ texting-story accounts ([Shortimize, Oct 2024](https://www.shortimize.com/blog/rizz-apps-b-roll-strategy-that-got-them-half-a-billion-views-on-tiktok)), while Rizz's own account has 7 posts. Verified: @textcube → Rizz 8.5M (May 2024, 300 s); @textiify → Rizz 1.7M (Aug 2026, 380 s; page median 192.6K). The app appears as the "assist" at the turning point; caption "@RIZZ APP … Link in bio". Medians on the genre's pages have fallen since 2024; new pages rarely break through.

### 3.6 Payout: a how-to that keeps paying (Casper, 2026)
- Class-action settlement finder: $217K in 5 months. One 17M-view how-to did 2.9M in week 1, 7.5M in month 1, and still gets 30–50 views/hour 500+ days later. Format: dollar promise → slow Google route → "an easier way… an app" → three payouts → "comment CLAIM and I'll send you the app". ~50% of auto-DM'd viewers clicked; 6.7% of downloads paid. Five creators posting on the same day put it at #70–80 in Finance and made $9.7K that day. Explaining the lawsuit (instead of the viewer's payout) got views and no signups. ([Superwall, Mar 2026](https://www.youtube.com/watch?v=I10xtUiXfeY))

### 3.7 Nomad Table: hook → demo with a 3-second retention rule (solo founder, 2026)
- $65K MRR, 1M+ downloads, 30–44M views/month from 60–70 creators paid $1–2 CPM uncapped. The founder tests formats himself; creators only remake winners. Metric: share of viewers past 3 s — 75–80% means the format will go viral eventually, ≥70% is good, under ~50% drop it. Verified: "my hostel roommate just showed me this and all my solo travel anxiety is gone 🤯🤯" 1.0M (May 2025); the same template did 627K and 322K. A clickbait variant got 300K views and 174 likes. ([Superwall, Feb 2026](https://www.youtube.com/watch?v=RVnnqTrSKZY), [TikTok](https://www.tiktok.com/@nomadtable/video/7505063333310008607))

### 3.8 Cluely: virality without conversion (2025–2026)
- Launch skit "Cluely is out. cheat on everything." 13.3M views on X (verified, Apr 2025); "Ep N" office sitcom on TikTok up to 4.3M (verified), now stronger on Instagram (2.2–2.8M) than TikTok (102–465K, reported). Reality check: Roy Lee said a 49M-view UGC video drove under 100 downloads ("Viral sense gets you from 1→100, not 0→1") and later admitted inflating ARR ([TechCrunch](https://techcrunch.com/2025/11/05/cluelys-roy-lee-hints-that-viral-hype-is-not-enough/)). Scale behind it: 60+ paid creators and ~700 clippers ([SF Standard](https://sfstandard.com/2025/07/18/cluely-startups-roy-lee-columbia-cheating-viral-tiktok/)).

### 3.9 Stronger: one 6-second format reposted ~300 times
- Fade from black to one app screenshot, same song every time; 150–300M views across ~300 reposts; average watch time over 2× the length; micro-variants to dodge spam flags. But "low conversion", and after 5–6 months it is "getting faded out"; ~20 copycat apps diluted it, and a competitor running it on ~10 accounts beat their 1–2. Verified: "am I strong? male 75kg edition" 6.9M (May 2025). $600K ARR, 1.2M users. ([Superwall blog](https://superwall.com/blog/how-stronger-built-a-usd600k-app-using-viral-on-demand-tiktok-strategy), [podcast](https://www.youtube.com/watch?v=si3HzkBTPl4))

### 3.10 Lense: the steady slideshow
- Wedding-camera app. Lists of wedding ideas with the app as one item and an App Store screenshot last: 1.2M (Dec 2025), 679.5K (Mar 2025), 253.1K (Jan 2026), and 236.6K in Aug 2026 by reusing the Dec hook and images (all verified). Utility lists earn saves: Lense 1.9%, Scratch AI 1.2%, Cray Cray 4.2%, vs Snugly's 0.06%.

### 3.11 Characters people return for (2026)
- Duolingo's mascot account: median 718K over its last 60 posts (Aug–Oct 2026), 12 s median length, 18M top (verified). Depuff AI's AI character "Luna" (Spanish glow-up advice): median 153.8K over 40 posts, best 1.1M (Oct 2026). Praktika's AI tutor as the comic foil in a creator's skits: 2.5M (Oct 2026). An Oct 2026 review of AI-made promo content found that "AI UGC is working when the artificiality creates the entertainment, proof, or character", while polished synthetic testimonials flopped ([Lightreel](https://lightreel.ai/blogs/ai-generated-ugc-videos)).

### 3.12 Indie founders on X vs TikTok
- Jack Friks' Lovelee post ("i made an app to send love notes to your partner and its getting used as a grocery list reminder") got 314K likes on X (verified; ~14.3M views reported) and 5.7K views as a TikTok. His Doof "day 18/30 … 707 downloads, $74 revenue" did 154K on X; daily TikTok updates ~1.4K, so he stopped. His Instagram lesson: 30–100 posts before a format hits; a 5-second food-grid post for his Doof app got 749.8K on TikTok (verified). Marc Lou's 19-second "web analytics as a Severance episode" demo: 1.11M (verified). Megabonk's solo dev: stakes-first devlog Shorts of 5.25M / 4.5M / 3.5M (verified) and 1M+ copies sold in two weeks (reported).

---

## 4. What's working in 2026 vs. what's saturated

**Working (with evidence)**
- **Green-screen reactions** over founder clips, headlines and critics: called "probably the most viral" format of late 2026 by EVO Marketing; also fixes trust for considered purchases (SMB Market's 45% churn fell after switching to 35–40-year-old creators + founder green screens).
- **Lifestyle integrations with creators outside your niche** (moms, stylists, Spanish-language GRWM): verified 6.2M / 1.6M / 1.2M / 992K for Cal AI in 2025–26.
- **Talking-head stories with stakes**: SideShift's job-market story (9.6M, 16% engagement); 10-minute stories with the CTA at minute 9 are an emerging variant.
- **Recurring characters**, including openly AI ones (Luna, Praktika's tutor, Duolingo).
- **Utility list slideshows** that people save (Lense, Scratch AI's tips lists).
- **Odd-premise demo posts on X** and **stakes-first devlogs** for builders and games.
- **Cloning + localization**: each new country adds ≈20% views (Clover Labs: Spain, Germany, Australia first); organic wins often show first in non-US English App Stores; one Spanish founder sees 1 in 6–10 posts go viral in Spain vs 1 in 30–35 in the US.
- **Comment mechanics**: keyword auto-DM CTAs, seeded comments, reply videos.
- **Boosting organic winners** (TikTok Spark / Meta partnership ads) once engagement is ≥5–7.5%.

**Steady**
- Reaction hook → demo (core of most UGC programs, but "viewers are used to hook-and-demo"), faceless demos, how-tos, before/after with a score, comparisons, comment replies, POV/sitcom skits, memes (reach without conversion), long-text loops.

**Saturated or decaying**
- **AI avatar testimonials** (vanity views, poor conversion, labeling and FTC/EU disclosure rules).
- **"Day N until $X MRR" and "I built X in N minutes with AI"**: 2026 entrants get ~100–3,300 views. The App Store is flooded (557K submissions in 2025; an 84% one-quarter surge reported in 2026, per [9to5Mac](https://9to5mac.com/2026/04/06/app-store-sees-84-surge-in-new-apps-as-ai-coding-tools-take-off/)), and Apple reportedly blocked updates to the Vibecode and Replit apps in March 2026. MRR screenshots are distrusted after fake-MRR scandals.
- **Question/couples slideshows**: "viewers are blind to this format" (May 2026); the big 2025 question accounts are dead.
- **Stronger-style fade-in loops**, **"apps that feel illegal" on TikTok** (still fine on YouTube: Fireship 1.56M, Feb 2026), **new fake-texting pages**, **Reddit-story/brainrot gameplay splits**.
- **Mass-automated slideshow networks**: Scratch AI went from 600–1,300 median views to 0–5 in Sep 2026 across two accounts; a repetitive auto-posted account (@curiosityquench) sits at a median of 10 views (both verified). ReelFarm's founder: "tiktok throttles bots/automated accounts".
- **Polished, look-alike launch films** ("sleek 3D animations, minimalist sans-serif typography, swooshing sound design"), now generated by agent tools like [/brag](https://github.com/latent-spaces/brag) (16.2K GitHub stars).

---

## 5. Benchmarks worth building into the tool

| Metric | Threshold | Source |
|---|---|---|
| Installs per view by format | memes 0.05–0.2%; question slideshows 0.2–0.5%; reaction clips 0.3–0.5%; demos 0.5–1% | Flamme (2026) |
| Downloads per 1K organic views | ~3–7 | UGC operators (2026) |
| Viewers past 3 s | 75–80% → will go viral; ≥70% good; <50% drop | Nomad Table (2026) |
| Engagement (likes+comments+saves+shares)/views | ≥5% boost it; 7.5–8% good; 12%+ very viral | SideShift (2026) |
| "Content-market fit" | 5–6 videos over 10K in the first campaign | SideShift (2026) |
| Per-post triage | <300 setup; 300–1K content; 1K–5K iterate; 5K–100K hook works; 100K+ scale | Flamme |
| Hook iteration | 50K+ → make 3 variations; 10–50K keep rotating; 1–10K one more try; <1K twice → drop | Larry skill |
| Paid-view smell test | likes under ~1% of views usually means a paid boost (2M views / 2K likes = boosted; 2M / 50K = organic) | researcher inference; Payout's Casper |
| Clone yield | a clone's median ≈ 20% of the original; outliers 2–6× | Clover Labs |
| Launch films | median 28,258 views; top 10% ≥762,640; ~80% of top decile show the founder; bookmark/view ≥0.6% → signups | [Flowjam, 1,173 launches](https://www.flowjam.com/blog/state-of-launch-videos-2026) (vendor) |

---

## 6. Posting cadence and volume norms

There are two games here, and most confusion comes from mixing them up.

**Game 1: one honest account (founder, brand or creator).** Buffer's study of 11.4M TikToks from 150K+ accounts (Oct 2025) found that versus 1 post/week, 2–5/week lifted views per post ~17%, 6–10 ~29%, and 11+ ~34%. But the median post stayed at ~500 views; what volume buys is lottery tickets (the 90th-percentile post went from 3,722 to 14,401 views). Buffer's 2026 guide: TikTok 2–5/week, Instagram 3–5/week, Shorts 1–3/week, X 3–5/day, LinkedIn 2–5/week. ([SEJ on Buffer](https://www.searchenginejournal.com/study-shows-2-5-weekly-tiktoks-deliver-biggest-view-increase/558641/), [Buffer](https://buffer.com/resources/social-media-frequency-guide/))

**Game 2: the consumer-app volume machine.**
- **Per account:** 1–3 posts/day, spaced 2–4 hours (Larry targets 3/day at 7:30, 16:30, 21:00; ReelFarm "do not exceed 2–3x a day"; Jack Friks 1/day on new accounts). UGC creators typically make 1–2 unique videos/day and cross-post each to TikTok, Reels, Shorts (+ Facebook/Snap): SideShift's top package is 60 videos/month = 8 posts/day across platforms. TikTok tolerates a ramp (3 → 5 → 10/day); Instagram and YouTube tolerate more.
- **Accounts and creators:** Larry 1 account per app; Bloom 5–10 core accounts, winners copied to ~20; Flamme 20–30 phones; Clover Labs up to 20 accounts per country in 20 countries; one reposter opens 50–100 new accounts a week. Creator programs: SideShift 5 creators × 2/day ≈ 300 posts → 16–20M views in 30 days; Playkit 10 creators × 15/week × 4 weeks = 600 videos; Nomad Table 60–70 daily; Halo 85 creators, ~300 posts/day.
- **Patience:** the first two weeks are usually dead (SideShift); expect 30–100 posts to find a format (Jack Friks), 20–30 for an outlier (Sizzle), 25 videos for a new creator to pass 10K (Jenni AI); "90 days is the minimum" (Bloom).
- **Pay norms (2026):** $600–800/month for 30–60 videos + $1–2 CPM; $20/video + milestone bonuses; Whop clipping campaigns median $1.30 per 1K views. All-in CPM tends to fall from $5–8 in month 1 to under $1 by month 3+.

**Warm-up (new accounts).** 3–7 days of normal use before posting (20–30 min/day scrolling and engaging only in your niche, as your target user would); first posts without CTAs; then 1–2/day. Post from the phone, or upload as a draft and publish from the phone with an in-app sound; Oliver Henry says API-published posts "get very little chance". A healthy first post gets ~150–300 views; zero views means re-warm for 5–7 days or start over. Don't reuse one Apple ID across devices (Flamme). Business accounts lose most trending sounds (Commercial Music Library only), which is why practitioners avoid them. ([reel.farm guide](https://reel.farm/guides/how-to-warm-up-tiktok-account), [Jack Friks on Startup Ideas Pod](https://www.youtube.com/watch?v=9tOmppsiO2w))

**Boosting and charting.** Spark winners once engagement reaches 5–10% ($20 test, then $50–100/day for a week, kill under 5%); never boost a post that's still climbing (SideShift). App Store rank responds to concentrated bursts: Payout charted with five creators posting the same day, and one reposter saw 100–200K-view outliers move rank more than a 16M-view post.

**Rules risk.** Multi-account farms, comment seeding from fake accounts and device/proxy setups sit in a gray zone with platform rules on spam and inauthentic behavior; bans and shadowbans are routine for operators. Instagram (Apr 30, 2026) now strips recommendations from accounts that mostly repost photos/carousels; "unique text, creative edits and voiceover" count as original ([Tubefilter](https://tubefilter.com/2026/04/30/instagram-removes-algorithm-recommendations-repost-content-aggregator)).

---

## 7. Platform shifts that matter in 2026

- **TikTok (US).** The USDS joint venture closed in January 2026 and said it "will retrain" the recommendation system on US data. Creators report lower reach, but no audited before/after data exists; compare your own median views, not your best posts. ([fact-check](https://fastclips.app/learn/tiktok-algorithm-myths))
- **TikTok AI controls.** Since Nov 2025 users can turn AI-generated content down (not off) in Manage Topics; TikTok is testing invisible watermarks on top of C2PA labels, and realistic AI people and scenes must be labeled. ([TechCrunch](https://techcrunch.com/?p=3068861), [TikTok newsroom](https://newsroom.tiktok.com/more-ways-to-spot-shape-and-understand-ai-generated-content?lang=en)) The FTC's 2024 rule bans testimonials from people who don't exist, and the EU AI Act's disclosure duty for synthetic people applies from Aug 2, 2026.
- **Instagram.** Trial Reels (since Dec 2024) test a Reel on non-followers first; insights after 24 h, optional auto-share after 72 h. It's the cheapest A/B test for hooks. Originality enforcement now covers carousels (Apr 2026). Reels reportedly beat TikTok at ≤15 s and reach 100K faster (65.7% within a day vs 38.1%), while TikTok favors >60 s ([viral.app, ~150K cross-posts](https://viral.app/blog/insights/tiktok-hooks-vs-instagram-hooks); vendor data).
- **YouTube Shorts.** Views count from the first frame since Mar 31, 2025, so Shorts view numbers aren't comparable to TikTok's. A ranking change favoring original content (Oct 1, 2026) is reported by trackers but unconfirmed.
- **X.** Native video autoplays muted; link posts are deboosted (estimates range widely), so the norm is video in the post and the link in the first reply.
- **LinkedIn.** A vertical video feed exists, but reach data still favors document carousels for larger accounts and images for small ones; posts with external links or product CTAs reportedly lost reach in an April 2026 update (unverified).

---

## 8. Design patterns that recur

- **Text:** TikTok's native "Classic" font or bold Arial-like sans, white with a black outline (or the native white label box), 1–4 short lines, often lowercase and Gen-Z-voiced ("use lowercase… those things make it feel not AI" — Jack Friks). Keep it inside the central ~900×1600 of a 1080×1920 frame: nothing in the top 10% or bottom 20%, away from the right-side buttons. Typing text in TikTok's editor (instead of baking it into images) makes each repost easy to vary.
- **Images:** phone-camera realism beats polish ("it should look a little bit rough" — Stronger; "if it looks like an ad… the algorithm is going to give it 20 views" — Jack Friks). Lock the subject across slides; avoid AI faces and landscape images.
- **Length:** memes 5–11 s; reaction→demo 7–15 s; fade-in 6 s; text loops 4–10 s (text takes ~15 s to read, so viewers loop); food diaries 17–21 s; slideshows 6–7 slides (lists up to 14); founder TikToks median ~53 s; X demos 10–40 s; launch films 45–145 s; vlogs and stories 1–10 minutes.
- **Sound:** add trending or emotion-matched sound in-app for slideshows (no API can); reuse one song as a brand sound (Stronger); original voice for talking heads; AI TTS for texting stories.
- **CTA:** the app named on the last slide/frame in first person ("the app is called Snugly and my nan wants it on her phone immediately"); caption + pinned comment ("the one I use in the video is called Payout"); keyword auto-DM ("comment CLAIM"); a memorable redirect domain typed on screen for forgettable names (flightcheatcode.com); promo codes for creators. On X and LinkedIn, the link goes in the first reply.

---

## 9. The 10 most important rules

1. **Choose formats by installs per 1,000 views, not views.** Track it per post. Demos and talking heads convert several times better than memes, brainrot or story slideshows (0.5–1% vs 0.05–0.2%), and the giant-view failures (Cluely's 49M → <100 downloads, Coconote's 100–200M → ~3,000 trials) are common.
2. **Clone proven formats and change 10–20%.** Only copy what already hit 100K+ on small accounts, then vary hook, images, order and sound. Inventing from scratch and posting exact copies both fail.
3. **Hook in under 2 seconds with a person, a conflict and a curiosity gap, readable with the sound off.** Never lead with the feature (Snugly's feature-first hooks: ~1K views; story hooks: 100–480K). Aim for 70–80% of viewers past 3 s.
4. **Keep the body native, but name the app unmistakably at the end** — last slide, caption and pinned comment. Vague CTAs waste viral posts.
5. **Look like a person, not a brand.** Phone-camera images, native fonts, lowercase, real faces. Use AI for scripts, images of things and openly fictional characters — not fake humans.
6. **Make volume with variation.** 1–3 unique posts a day per account, cross-posted to TikTok, Reels and Shorts; expect 30–100 posts before a format clicks and treat the first two weeks as warm-up. Volume raises the ceiling, not the median.
7. **Treat every hook and format as perishable.** Rotate winners, retire decaying ones (Snugly's landlord hook fell from 234K to 2K), and expect a format to last 3–6 months.
8. **Run the comment section as a second engine.** Invite corrections and "what's the app?" questions, answer objections with reply videos, and use keyword auto-DM CTAs.
9. **Publish like a human.** Warm up new accounts, post from the phone with an in-app sound, never share device identities, and don't mass-automate publishing — automated networks are the ones collapsing to zero views in 2026.
10. **Match the messenger and the platform to the buyer.** Peers and lifestyle creators for impulse apps, credible experts and older creators for considered purchases, founder build stories only when your buyers are builders (and on X/Shorts rather than TikTok).

---

## 10. What this means for Shipreel

- **Start with the formats that convert and template well:** faceless screen demo, reaction hook → demo, useful list slideshow (app on the last slide), comment-reply demo, green-screen reaction, doubter-reveal slideshow and X demo posts. Flag the saturated ones in the UI.
- **Ship a hook lab, not a hook list:** generate 10–15 hooks per idea from `hooks.json` formulas, log views and installs per hook, and apply the triage thresholds in §5 automatically.
- **Build a variation engine, not a cloner:** randomize image sets, slide order, text phrasing and sound per post so each one passes 2026 originality filters.
- **Export drafts for phone publishing** (with a "pick a sound" reminder) rather than auto-posting through APIs.
- **Lint every post:** hook length and position, safe zones, AI-face warning, and "is the app named on the last frame, in the caption and in a pinned comment?"
- **Offer one-click localization** (ES/DE/PT first) and per-post install attribution (App Store campaign links / RevenueCat).

---

## Key sources

Podcasts and transcripts: [Superwall: Clover Labs](https://www.youtube.com/watch?v=ka3gqzmUuvc) · [Yannis reposters](https://www.youtube.com/watch?v=eh1SDHX84vQ) · [Cal AI program](https://www.youtube.com/watch?v=l0vswWcGmMs) · [SideShift/Nick Lawton](https://www.youtube.com/watch?v=F2dVvzvwtBY) · [Payout](https://www.youtube.com/watch?v=I10xtUiXfeY) · [Cluely UGC/Dris](https://www.youtube.com/watch?v=szgT-8gXd3s) · [Nomad Table](https://www.youtube.com/watch?v=RVnnqTrSKZY) · [Noise](https://www.youtube.com/watch?v=_aNVPMvd8WU) · [EVO Marketing](https://www.youtube.com/watch?v=VGJWRjz6nq8) · [Coconote](https://www.youtube.com/watch?v=E_4gRy4O03w) · [Halo AI](https://www.youtube.com/watch?v=PFfo4JySptw) · [Bloom](https://www.youtube.com/watch?v=AtYlYzw40vo) · [SideShift launch](https://www.youtube.com/watch?v=_a4ch3pk_U0) · [Joseph Choi solo](https://www.youtube.com/watch?v=0mOLs315i04) · [Jenni AI](https://www.youtube.com/watch?v=Ca_VnMTosRo) · [Drew Levin](https://www.youtube.com/watch?v=qnDdabj8Fok) · [Stronger](https://www.youtube.com/watch?v=si3HzkBTPl4) · [Flamme](https://www.youtube.com/watch?v=pb4JIH8FubE) · [Oliver Henry on Startup Ideas Pod](https://www.youtube.com/watch?v=OV5eK91YY68) · [Jack Friks on Startup Ideas Pod](https://www.youtube.com/watch?v=9tOmppsiO2w) · [Sub Club: Joseph Choi](https://subclub.com/episode/how-to-go-viral-on-tiktok-and-profit-from-it-joseph-choi-viral-app-founders) · [Mobile UA Show: Flamme](https://mobileuseracquisitionshow.com/episode/how-to-produce-200-tiktoks-a-day-ankit-nayal/)

Write-ups and data: [Joseph Choi, TikTok farming playbook](https://x.com/JosephKChoi/article/2024201897322709065) · [Postiz on Larry](https://postiz.com/blog/ai-agent-tiktok-views-postiz-api) · [Larry skill spec](https://clawhub.ai/olliewazza/larry) · [Superwall on Stronger](https://superwall.com/blog/how-stronger-built-a-usd600k-app-using-viral-on-demand-tiktok-strategy) · [Playkit sprint](https://theplaybookbysuzanna.substack.com/p/how-150-creators-and-600-tiktoks) · [Shortimize on Rizz](https://www.shortimize.com/blog/rizz-apps-b-roll-strategy-that-got-them-half-a-billion-views-on-tiktok) · [Blake Anderson playbook](https://julianivaldy.com/the-viral-app-playbook) · [Cal AI on Sub Club](https://www.revenuecat.com/blog/growth/jake-castillo-cal-ai-sub-club-podcast-2026) · [Lightreel AI-UGC review, Oct 2026](https://lightreel.ai/blogs/ai-generated-ugc-videos) · [Flowjam launch-video report](https://www.flowjam.com/blog/state-of-launch-videos-2026) · [viral.app TikTok vs Reels](https://viral.app/blog/insights/tiktok-hooks-vs-instagram-hooks) · [Buffer frequency study via SEJ](https://www.searchenginejournal.com/study-shows-2-5-weekly-tiktoks-deliver-biggest-view-increase/558641/) · [WilkeBuilds slideshow funnel](https://x.com/WilkeBuilds/status/2103294618339057770) · [Palimio on Duolingo](https://www.palimio.com/blog/duolingo-tiktok-strategy) · [Tubefilter on Instagram originality](https://tubefilter.com/2026/04/30/instagram-removes-algorithm-recommendations-repost-content-aggregator) · [TechCrunch on TikTok AI controls](https://techcrunch.com/?p=3068861) · [FTC fake-testimonial rule](https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials) · [EU AI Act Art. 50](https://artificialintelligenceact.eu/article/50/)

Verified posts are linked individually in `formats.json` (`examples[].url`).
