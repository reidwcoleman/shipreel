# Viral hooks for consumer-app short-form video (TikTok / Reels / Shorts)

Compiled 2026-10-16 for Shipreel. This is a bank of real hooks (on-screen text on frame 1, or the first spoken line), each with its source, plus a measured analysis of the top performers. Sibling files in `research/viral/` cover formats. This file only covers the hook.

## How to read this file

- **Every hook is real.** Each one comes from a post, a founder's own account, a published breakdown, or a sibling research file. Nothing here was written as an example.
  - **Not included:** hooks.json entries whose source is "common pattern", the "in the niche's own voice" bank in `family.md` §5 (written by the analyst), and template-only entries with no recoverable original text.
- **Origin tag** in the Source column:
  - **[R]**: from the existing research (`slideshow.md`, `screendemo.md`, `ugc.md`, `brainrot.md`, `family.md`, `research/formats.md`, `src/framework/data/hooks.json`).
  - **[W]**: new this session from the web or from TikTok directly.
  - **[R+W]**: in both, with the web pass adding or checking something.
- **"frame-read"** hooks (51) are new this session. The text was read from frames at 0.5 / 2 / 4 s (or from slide 1 of a photo post). Views were pulled with yt-dlp on 2026-10-16. These are primary data.
- **Views:**
  - A number with no note is from the post itself, via yt-dlp (this session or the sibling files).
  - "per Playkit", "per Superwall", "per Virlo (vendor)" and so on mean the figure is the publisher's claim and was not re-checked.
  - **‡** in the top-30 table marks the same thing.
  - "n/a" means no source gives a number.
- **Inline tags:**
  - *(likely paid/boosted)*: the source flagged a like rate under ~1% at 1M+ views, or a known paid push. Treat the reach as bought.
  - *(spoken)*: the first spoken line, not on-screen text.
  - *(post caption, not on-screen)*: the post's caption.
  - *(paraphrased)*: the source describes or translates the line rather than quoting it, or the text was rebuilt from a template plus a note.
  - *(aggregate, not one post)*: the figure is a campaign or account total.

## Summary

- **399 hooks**: 382 working hooks plus 17 flops kept for contrast.
  - 370 have a view count. 114 of those counts come from a secondary source.
- **Where they come from:**
  - 222 from the existing research files only.
  - 161 new from web or TikTok sources this session.
  - 16 in both.
  - New this session: 161 hooks, 157 of them with views.
- **Top patterns.** I counted the 197 hooks that have at least 1M views on a single post, are app-related, are not on X and are not flagged as boosted. The top five patterns are:
  1. Relatable moment / POV: 35.
  2. Dialogue / quote: 20 (9 of these are fake-text-story openers).
  3. Identity call-out: 15.
  4. Before / after: 15.
  5. Curiosity gap: 13.

  Relatable pain and discovery follow at 12 each.
- **Headline findings:**
  - **The app is almost never named.** It appears in 3 of the top 30 and in 17 of the 223 hooks with 1M+ views (7.6%). Seven of those 17 are BeReal or Locket, where the brand name is the activity itself. Flops name the app more often: 4 of 17 (24%).
  - **Top hooks are short and unpunctuated.** The median length is 7.5 words, and 27 of the top 30 run 5–14 words. 19 of 30 have no closing punctuation.

---

## 1. Hook bank, grouped by pattern

Within each group, rows are sorted by views. Numbering runs through the whole bank. A hook sits in its single strongest pattern. Overlaps are common: "POV: Madelyn Cline takes your BeReal" is filed under specificity but is also a POV.

### Curiosity gap (26)

Withholds the object, the outcome or the reason. The viewer stays to close the gap.

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 1 | How the f is this kid acing every exam? *(post caption, not on-screen; aggregate, not one post)* | Kunch AI (Dan Kwon) | 220M (lifetime across platforms incl. reposts, per Superwall; TikTok 15-16M on day one) | 'Frankensteined' Snapchat-style clip | [W] Superwall blog https://superwall.com/blog/he-made-usd2-2m-from-building-simple-apps-heres-how-no-code |
| 2 | How did he hide that sleeping 😭 | Splashin (Senior Assassin game app) | 11.4M (per Playkit) | Snapchat video + caption | [W] Playkit Report https://playkit.substack.com/p/114-videos-116m-likes-250k-mrr |
| 3 | Let me show you what the future of social media looks like, okay? *(spoken)* | @gage_sampson (app not named by source) | 9.5M (per Virlo (vendor)) | talking head (spoken) | [W] Virlo https://virlo.ai/data/viral-hooks/apps |
| 4 | he's living in 3025 🤯 | StudyFetch @studyfetch | 8.3M | hybrid → screen demo | [R] screendemo.md §9 #18 https://www.tiktok.com/@studyfetch/video/7498834181263379758 |
| 5 | I went to the NYC party where they give you an envelope with the name of your date | Matchbox | 6.2M (per Playkit) | party clips + caption + VO | [W] Playkit Report https://playkit.substack.com/p/matchbox |
| 6 | PDF to Brainrot | Memenome @memenomeai | 4M | phone-filming-laptop demo | [R] brainrot.md §9 memenome-4.0M https://www.tiktok.com/@memenomeai/video/7430384330163096875 |
| 7 | nah I don't wanna know what me and my bf baby will look like | AI Baby Generator (Wowoo) | 3.5M (per Playkit) | selfie POV + app demo timelapse | [W] Playkit Report https://playkit.substack.com/p/ai-baby-generator-making-100k-mrr-created-new-trend-tiktok |
| 8 | The CEO of snapchat got asked an insane question by a US Senator | Superlocal | 3.4M (per Playkit) | Senate hearing clip + caption | [W] Playkit Report https://playkit.substack.com/p/superlocal |
| 9 | How many calories are in this one small scoop of Nutella? *(spoken)* | @moreomegaluke (app not named by source) | 2.4M (per Virlo (vendor)) | talking head (spoken) | [W] Virlo https://virlo.ai/data/viral-hooks/apps |
| 10 | this is the \*only\* party I've ever heard of that pairs everyone up with a date… | Matchbox | 2.1M (per Playkit) | party clips + caption + VO | [W] Playkit Report (same post) |
| 11 | Imagine not having to remind your kids about their routines | Hearth @hearthdisplay | 2M | install → kids using it | [R] family.md §2 hearth-easier https://www.tiktok.com/@hearthdisplay/video/7368866166900657450 |
| 12 | This freshman walked in blasting his music | Styl | 1.8M (per Playkit) | third-person shot + app | [W] Playkit Report https://playkit.substack.com/p/styl-app |
| 13 | why did I make an app that shows you the percent of the world you've been to? | Superlocal | 1.5M (per Playkit) | 2x footage + screen recording + AI VO | [W] Playkit Report (same post) |
| 14 | Oh my.. this shouldn't be possible | Vibecode @rileybrown.ai | 1M (per hooks.json) | X/TikTok demo | [R] hooks.json (@rileybrown.ai, Feb 2026) |
| 15 | My biggest crush 😍 | AI Baby Generator (Wowoo) | 880K (per Playkit) | screenshot zoom + app demo | [W] Playkit Report (same post) |
| 16 | Oh my god. How much was this? *(spoken; likely paid/boosted)* | TikTok Shop affiliate (digital calendar) | 640K | affiliate demo (spoken) | [R] family.md §2 allithatglitters-hype |
| 17 | What game is she playing? *(likely paid/boosted)* | Adam Lyttle @adamlyttleapps | 625K | POV, faceless | [R] ugc.md §8 adam-cat https://www.tiktok.com/@adamlyttleapps/video/7580708262970969362 |
| 18 | Imagine if artists can get traded like pro athletes and you can trade Kendrick Lamar for Ice Spice + Kanye | Sound Map | 350K (per Playkit) | selfie POV + app shots | [W] Playkit Report https://playkit.substack.com/p/sound-map |
| 19 | my sister called me CRYING the day after our wedding.. here's why: *(paraphrased)* | Lense @lense.app | 253K (per hooks.json) | listicle slideshow | [R] hooks.json (@lense.app wedding, Jan 2026) |
| 20 | Our guests didn't expect the last one to work.. | Lense @lense.app | 239K | slideshow (title) | [R] slideshow.md §11 lense-238k https://www.tiktok.com/@lense.app/video/7677330200291478817 |
| 21 | he's living in 2099 | EVO Marketing creator (app unnamed) | 214K (per Superwall via hooks.json) | green screen | [R] hooks.json (EVO Marketing, Superwall Oct 2026) |
| 22 | Five years later…and people STILL ask me about this command center wall | @just_cari | 208K | 7 s static empty-wall tease | [R] family.md §2 cari-commandcenter |
| 23 | I showed my nan what AI thinks her living room could look like *(post caption, not on-screen)* | Snugly @snugly.app | 206K | slideshow (caption hook) | [R] slideshow.md §6 #17 |
| 24 | I showed my mum what AI thinks our living room could be | Snugly @snugly.app | 170K | AI-reveal slideshow | [R] hooks.json (Snugly living room, Feb 2026); views but no installs until CTA named app |
| 25 | Hey, I just found this site. This is crazy. What is our attention span coming to? *(spoken)* | Coconote creator | n/a | creator demo (spoken) | [R] hooks.json (Coconote, Superwall Apr 2026) |
| 26 | I hope she wins a million dollars in the next 24 hours because of what she just did for me *(spoken)* | EVO Marketing creator | n/a | talking head / green screen | [R] hooks.json (EVO Marketing, Superwall Oct 2026) |

### Relatable moment / "POV" (50)

A scene the viewer has lived, often with "POV:", "me…", "when…". The app is usually a prop inside the scene.

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 27 | they almost got caught during the exam 😭 | AnswersAI @answersai.com | 32.9M | classroom POV skit | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@answersai.com/video/7616430951190514974 |
| 28 | just seen a girl in the library writing an essay. no notes, no open tabs, no chatgpt… just her and her own thoughts like a psychopath | Jenni AI creator | 30M (~30M on X, per Superwall via hooks.json) | wall-of-text loop | [R] hooks.json (Superwall Nov 2025) |
| 29 | Us leaving school early knowing Answer.ai gave us all the right answers to pass all our assignments | Answer.AI | 25M (per Playkit) | text overlay + b-roll + demo | [W] Playkit Report https://playkit.substack.com/p/answer-ai-app |
| 30 | when the vacation with your bf doesn't go as planned *(likely paid/boosted)* | Remini @remini | 24.9M | faceless screen demo | [R] screendemo.md §9 #4 https://www.tiktok.com/@remini/video/7540282580520668447 |
| 31 | me checking my friend's shared calendar every day to make silly lil plans together 🤭🤭 *(likely paid/boosted)* | Howbout @howbout_app | 21.4M | green screen over app calendar | [R] family.md §2 howbout-stalking https://www.tiktok.com/@howbout_app/video/7191929695892409605 |
| 32 | Doing my silly goofy laundry because a bird on my phone told me to 🧚 | Finch @finchcare | 20.3M | creator vlog, text overlay | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@finchcare/video/7568893795727658254 |
| 33 | Me practicing for my on-time BeReal today | BeReal @bereal | 20M | creator clip (ski) | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@bereal/video/7352886217291124000 |
| 34 | Pov: you are waiting for that one person to see your BeReal | BeReal @bereal | 12.8M | dance / lip-sync | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@bereal/video/7352701307804798240 |
| 35 | pov you just ordered bodyguards to pick us up from the airport | Protectors @getprotectors | 12M (per Playkit) | text overlay + story | [W] Playkit Report https://playkit.substack.com/p/bodyguard-uber-app |
| 36 | pov: you and your bf can't decide what to watch | Queue | 7.9M (per Playkit) | multi-phone app demo + caption | [W] Playkit Report https://playkit.substack.com/p/queue |
| 37 | When your friend group gets a shared calendar app so you actually make plans | Howbout UGC @daniertuuzw | 7.7M | green-screen dance over app | [R] family.md §2 groupcal-socialife |
| 38 | Me listening to house music and scrolling through noplace is the vibe of the summer | noplace | 7.2M (per Playkit) | candid shot + text | [W] Playkit Report https://playkit.substack.com/p/thenoplace |
| 39 | Regular alarm / Silent alarm | @praisefinds (app not named by source) | 7.1M (per Virlo (vendor)) | comparison | [W] Virlo https://virlo.ai/data/viral-hooks/apps |
| 40 | locket like it's my job >>> | Locket @locketcamera | 6.4M | phone-in-hand demo | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@locketcamera/video/7423911542195850542 |
| 41 | Me actually doing my schoolwork because I can't be ugly and dumb at the same time | Answer.AI | 6.2M (per Playkit) | text + b-roll + demo | [W] Playkit Report (same post) |
| 42 | Look at me I'm brushing my teeth... ✨🌈for rainbow stones🌈✨ | Finch @finchcare | 6.1M | talking head + app task card | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@finchcare/video/7631664797347499278 |
| 43 | pov: you have a type A mom | @mukenshome | 5.4M | organizing ASMR b-roll | [R] family.md §2 mukens-typea |
| 44 | college students these days 😭 *(likely paid/boosted)* | AnswersAI @answersai.com | 5.2M | faceless POV at laptop | [R] ugc.md §8 ans-newgen https://www.tiktok.com/@answersai.com/video/7681731630674857230 |
| 45 | professor almost caught us during the exam 😭 | AnswersAI @answersai.com | 5.2M | classroom POV skit | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@answersai.com/video/7622749516365581582 |
| 46 | Ep 9: coworkers dating | Cluely @cluely | 4.3M (per hooks.json) | sitcom skit | [R] hooks.json (Nov 2025) |
| 47 | locket every 5 seconds | Locket @locketcamera | 3.8M | phone-in-hand demo | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@locketcamera/video/7439118621961473326 |
| 48 | our bodyguards got us matcha | Protectors | 3.5M (per Playkit) | text overlay + b-roll | [W] Playkit Report (same post) |
| 49 | Kids be like… | @sharon.a.life | 3.3M | reenactment skit | [R] family.md §2 sharon-defaultskit |
| 50 | POV: your chopped coworker gets a girlfriend | Cluely @cluely | 3M | sitcom skit | [R] ugc.md §8 cluely-ep3 https://www.tiktok.com/@cluely/video/7552668453300161810 |
| 51 | POV: You walked into a corporate meeting of people who make 10x your salary | Verso @versojobs | 2.9M (Virlo lists 9.4M for this hook text (possibly the sibling post)) | Zoom-grid skit | [R+W] ugc.md §8 verso-ai https://www.tiktok.com/@versojobs/video/7672924338689019167 |
| 52 | college literally isn't real anymore 😭💔 | Quizard @quizard.ai | 2.1M | in-the-wild single take | [R] screendemo.md §9 #9 https://www.tiktok.com/@quizard.ai/video/7540409269011729695 |
| 53 | POV: google maps says 2 mils but you're in Italy | TripBFF | 2M (per Playkit) | travel clips + VO | [W] Playkit Report https://playkit.substack.com/p/tripbff |
| 54 | POV: you just found out that the gym's Strava exists | Hevy @hevyapp | 2M | gym clip + app stat overlay | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@hevyapp/video/7539936100186361110 |
| 55 | when youve been training push pull skip, but finally get exposed | Stronger @strongerapp | 1.9M | talking head over app strength map | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@strongerapp/video/7442695514472123679 |
| 56 | remember it's okay to skip the gym today... | Stronger @strongerapp | 1.9M | photo slideshow | [W] TikTok post; on-screen text read from slide 1 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@strongerapp/video/7369982906363825454 |
| 57 | Over shared about my Situationship to my co workers and he's picking me up from work core | Howbout @howbout_app | 1.7M | office skit | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@howbout_app/video/7467618223001799969 |
| 58 | When he responds to your sarcasm with more sarcasm instead of getting upset | GiGi (AI dating app) | 1.5M (per Playkit) | selfie reaction + text | [W] Playkit Report https://playkit.substack.com/p/french-dating-app-just-passed-tinder-app-store |
| 59 | When you accidentally grab the setting spray instead of pepper spray | Finch @finchcare | 1.5M | creator skit with plush birb | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@finchcare/video/7591947648811207950 |
| 60 | "Remember when I was a baby birb?" | Finch @finchcare | 1.5M | photo slideshow (mascot art) | [W] TikTok post; on-screen text read from slide 1 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@finchcare/video/7623128764431617311 |
| 61 | POV: your camera sucks in the dark 😭 | GlowCam | 1.4M (per Playkit) | educational color guide | [W] Playkit Report https://playkit.substack.com/p/glowcam-selfie-lighting-app |
| 62 | How it feels to finally clean my water bottle after carrying it around everywhere with me for months 😭💪 | Finch @finchcare | 1.4M | creator vlog | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@finchcare/video/7558751618426998030 |
| 63 | Finally recording my manipulating, toxic, awful manager. Sent recording to HR. | @reece.notex (recording app, not named by source) | 1.4M (per Virlo (vendor)) | POV | [W] Virlo https://virlo.ai/data/viral-hooks/apps |
| 64 | pov: Drake walking around his 50,000 soft mansion playing Pokemon go for music but the only songs he's catching are the Weekend Songs RIP | Sound Map | 1.3M (per Playkit) | Drake clip + demo | [W] Playkit Report https://playkit.substack.com/p/sound-map |
| 65 | Seducing hr so she will approve my annual leave | Howbout @howbout_app | 1.2M | office skit | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@howbout_app/video/7450094654390930721 |
| 66 | Me and my friend 7 hours into casual after work drinks (We have work in 48 minutes) | Howbout @howbout_app | 1.1M | night-out selfie clip | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@howbout_app/video/7545152676254960918 |
| 67 | Me checking my screen time like it's a horror movie | Opal @opal | 1M | single-image meme | [R] slideshow.md §11 opal-1m https://www.tiktok.com/@opal/video/7473550803891014934 |
| 68 | POV: trying to socialize with Ling Long | Cluely @cluely | 939K (per hooks.json) | sitcom skit | [R] hooks.json (Oct 2026) |
| 69 | POV: you put disposable cameras all over your wedding but the flower girls got ALL of them | @brooke_hassett (non-app; template wedding-camera apps copy) | 739K (per hooks.json) | photo-dump slideshow | [R] hooks.json (Aug 2025) |
| 70 | Pov: cal ai is offering you 20k a month but you turned it down because it's basically the same as having a j\*b *(likely paid/boosted)* | Cal AI @calai.app | 443K (VO: "First of all, we didn't offer him 20K. We offered him 100K." (hooks.json)) | green screen | [R] ugc.md §8 tt-calai 7516 https://www.tiktok.com/@calai.app/video/7516324544035065134 |
| 71 | Who tf needs preworkout when.. | Recent Follow | 300K (per Playkit (hook truncated in source)) | text + b-roll | [W] Playkit Report (same post) |
| 72 | POV: MOM JUST NEEDS TO VENT | Tolan partner @jenmariegreer | 128K | POV skit with AI voice | [R] family.md §2 tolan-momguilt |
| 73 | POV crashing out because.. | Recent Follow | 128K (per Playkit (hook truncated in source)) | dramatic POV | [W] Playkit Report https://playkit.substack.com/p/social-media-stalking-app |
| 74 | Burning distracting apps 🫡 | Opal @opal | 125K | hands + paper app icons | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@opal/video/7565894283702570262 |
| 75 | POV: you finally convince your husband to pay to decorate the living room | Snugly @snugly.app | 63K (per hooks.json) | AI-reveal slideshow | [R] hooks.json |
| 76 | POV: we just found out a girl recorded the entire Bible and made it sound like tea | Bible BFF creator | n/a | POV / talking head | [R] hooks.json (EVO Marketing, Superwall Oct 2026) |

### Relatable pain (problem stated) (21)

Names the problem or asks about it ("tired of…?", "I don't have 1 hour").

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 77 | Tired of losing viral recipes? *(aggregate, not one post)* | ReciMe | 50M (50M+ across 200+ videos, per Tiny Empires) | short demo + text overlay | [R+W] Tiny Empires https://tinyempires.substack.com/p/9-founders-who-hit-6-figures-with ; hooks.json |
| 78 | Stuck at 300 views? Try this, takes 2 seconds | @dawn_flaherty (tool not named by source) | 30.4M (per Virlo (vendor)) | on-screen hook | [W] Virlo https://virlo.ai/data/viral-hooks/apps |
| 79 | So you want to travel this summer but have no one to go with? | TripBFF | 13.7M (per Playkit) | travel clips + demo | [W] Playkit Report https://playkit.substack.com/p/tripbff |
| 80 | I don't have 1 hour 💀💀💀 | StudyFetch @studyfetch | 13.4M | phone-in-hand step demo | [R] screendemo.md §9 #6 https://www.tiktok.com/@studyfetch/video/7500726429689204010 |
| 81 | Do you know all the food you can and can't eat in pregnancy? *(likely paid/boosted)* | Bounty app @mumlifewithjoanna | 10.7M | question → green-screen app tour | [R] family.md §2 joanna-bountyapp |
| 82 | You ever get tired of the 3 months rule and want a genuine connection? | Duet @duet.us.official | 10M (per Playkit) | lip-sync + text narration | [W] Playkit Report https://playkit.substack.com/p/duet-dating-app |
| 83 | I graduated from Yale and I can't even get an interview *(spoken)* | SideShift job-market creator | 9.6M (per Superwall via hooks.json) | talking head | [R] hooks.json (Superwall Jun 2026) |
| 84 | How do you find parties while traveling? | TripBFF | 9.4M (per Playkit) | question + demo | [W] Playkit Report (same post) |
| 85 | often forget where you put your cellphone after using it *(paraphrased)* | AntiLost (Indonesian creator) | 9M (per Playkit) | text + song + use-case demo | [W] Playkit Report https://playkit.substack.com/p/anti-lost-app |
| 86 | Job marker is cooked | AIApply @aiapply.co | 7.3M (per Playkit (sic; post titled 'Job Market is cooked')) | text overlay + product b-roll | [W] Playkit Report https://playkit.substack.com/p/aiapply-app |
| 87 | tired of these dark and blurry photos on your phone? | GlowCam | 7.1M (per Playkit) | tutorial + live download demo | [W] Playkit Report https://playkit.substack.com/p/glowcam-selfie-lighting-app |
| 88 | tired of dull photos? | GlowCam | 5.2M (per Playkit) | before/after + tutorial | [W] Playkit Report (same post) |
| 89 | you have an essay to submit in five minutes *(paraphrased)* | Natural Write | 4M (about 4M, per Postiz) | Jim Carrey bit riff → app payoff | [W] Postiz https://postiz.com/blog/tiktok-marketing-strategy-100k-90-days |
| 90 | why do summer photos never do me justice my camera always makes everything look so flat *(spoken)* | @lexi.degraw (EPIK creator per ugc.md) | 3.7M (per Virlo (vendor)) | talking head (spoken) | [W] Virlo https://virlo.ai/data/viral-hooks/apps |
| 91 | Struggling to text? | Rizz @rizz.app | 1.6M | faceless POV demo | [R] ugc.md §8 tt-rizz https://www.tiktok.com/@rizz.app/video/7282099257552325934 |
| 92 | Stuck on formulas? *(aggregate, not one post)* | FormulaBot | 1M (1M+ campaign-wide, per Tiny Empires) | daily demo | [W] Tiny Empires https://tinyempires.substack.com/p/9-founders-who-hit-6-figures-with |
| 93 | Are you in a hurry & don't have time to track your calories? | Cal AI @calai.app | 294K | faceless step demo | [R] screendemo.md §9 #14 https://www.tiktok.com/@calai.app/video/7482403221856587054 |
| 94 | Denied from a cashier's job, I have a master's degree | SideShift creator | n/a | talking head / text | [R] hooks.json (Superwall Jun 2026) |
| 95 | My job has a mandatory secret Santa and the requirement is $60… what are we doing for extra funds this year? | Noise (Playbite) comment-bait | n/a (seeded reply got 1,686 likes) | wall-of-text | [R] hooks.json (Superwall Jan 2026) |
| 96 | Imagine being scared of solo traveling when this literally exists. | Nomad Table | n/a | reaction → demo | [R] hooks.json (Superwall Feb 2026) |
| 97 | Where was this when I had the most unsocial hostel in Thailand? | Nomad Table | n/a | reaction → demo | [R] hooks.json (Superwall Feb 2026) |

### Contrarian / rage-bait (15)

Picks a fight with a belief, a competitor or the viewer.

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 98 | You don't have a discipline problem, you have a visibility problem. *(spoken)* | @financewithfeven (Rocket Money creator per screendemo.md) | 5.7M (per Virlo (vendor)) | talking head (spoken) | [W] Virlo https://virlo.ai/data/viral-hooks/apps |
| 99 | Control Yourself | FocusTree | 4.7M (per Playkit) | text + song + app demo | [W] Playkit Report https://playkit.substack.com/p/study-focus-app |
| 100 | Don't let your colleagues ruin your day | @greenpark.digital (app not named by source) | 4.3M (per Virlo (vendor)) | on-screen hook | [W] Virlo https://virlo.ai/data/viral-hooks/apps |
| 101 | This generation has 0 f\*\*k's to give | AIApply | 3.4M (per Playkit) | text commentary + skit | [W] Playkit Report https://playkit.substack.com/p/aiapply-app |
| 102 | I love it when men tell me that the mental load isn't real… *(spoken)* | @sheisapaigeturner | 2.1M | talking head (spoken) | [R] family.md §2 paigeturner-grocery |
| 103 | Skylight Calendar is the WORST | @retrodenverfinds (pitching FamilyWall) | 1.5M | angry talking head | [R] family.md §2 retrodenver-dontbuy |
| 104 | Are you really friends if you're not all on Howbout? | Howbout @howboutwithnona | 1.1M | text over app | [R] family.md §2 howbout-friends |
| 105 | THIS IS THE POINT WHERE YOU CLOSE THE APP… | Opal @opal | 922K | photo of a sign (title 'This is your exit. Take it.') | [R] slideshow.md §11 opal-921k https://www.tiktok.com/@opal/video/7488034707918179606 |
| 106 | people with this diet... aren't on a diet | Doof @doof.app | 750K | still 2x2 food grid | [R] slideshow.md §11 doof-750k https://www.tiktok.com/@doof.app/video/7485847107870493958 |
| 107 | As some of y'all might know, there are companies that copy everything that we do. *(spoken)* | Umax @umax.app | 539K | rant over AI results (spoken) | [R] ugc.md §8 umax-face https://www.tiktok.com/@umax.app/video/7342593196087872814 |
| 108 | The truth about Cal AI… | Cal AI founder Zach Yadegari | 294K (VO: "Hi, I'm Zach, the founder and CEO of Cal AI. And the truth is, you guys are stupid.") | founder rebuttal | [R] ugc.md §8 calai-sorry https://www.tiktok.com/@calai.app/video/7515106146567343402 |
| 109 | 90% accuracy is not good enough. Sorry bro. | Cal AI @calai.app | 231K | comment-reply demo | [R+W] hooks.json; listing https://www.tiktok.com/@calai.app/video/7482898906242633006 |
| 110 | Hey Apple, I Just Fixed Your Camera App. | indie camera app (Superwall guest) | 10K (10,000+ views in a couple of days (blog/forum post, not TikTok)) | post title | [W] Superwall blog https://superwall.com/blog/how-to-market-your-app-for-free-5-strategies-for-generating-growth |
| 111 | Stop using LinkedIn to apply to jobs | Massive (Dan); hooks.json attributes to a SideShift creator | n/a (converts 'incredibly well'; 'Stop using Indeed…' got views, poor conversion) | talking head | [R+W] Superwall blog https://superwall.com/blog/this-app-makes-usd2m-year-using-this-ridiculously-easy-strategy |
| 112 | Amazon will hate me for exposing this secret. | Payout (Casper) | n/a | how-to | [R] hooks.json (Superwall Mar 2026) |

### Identity call-out (33)

Names who the video is for (a mom of 8, a pilates girl, people born on…, a student).

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 113 | Hands-on CHORE TIME with a MOM of 8 | Skylight partner @livjowen | 19.6M | chaotic family vlog | [R] family.md §2 livjowen-chores https://www.tiktok.com/@livjowen/video/7535998044823719198 |
| 114 | I wish I knew this as a first-time mom | @easylife.withme | 14.5M (metadata only (not downloaded) per family.md) | unknown | [R] family.md §2 'also found' |
| 115 | Evening Routine with a MOM of 8 | Skylight partner @livjowen | 14.1M | routine vlog | [R] family.md §2 livjowen-skyfeature |
| 116 | If you've been eyeing one of these digital calendars, then today is your lucky day… *(spoken; likely paid/boosted)* | @heathermommode (affiliate) | 10M | deal demo (spoken) | [R] family.md §2 heather-gamechanger |
| 117 | If you are a baddie and you're tired of dating dusties, keep watching. *(spoken)* | @aribaricarii (app not named by source) | 7.1M (per Virlo (vendor)) | talking head (spoken) | [W] Virlo https://virlo.ai/data/viral-hooks/apps |
| 118 | am I strong? male 75kg edition | Stronger @strongerapp | 6.9M | photo slideshow | [R+W] TikTok post; on-screen text read from slide 1 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@strongerapp/video/7505459642022186286 ; hooks.json |
| 119 | I'm the older sibling, ofc I went to medical school so my younger brother could be unemployed | Styl | 6.7M (per Playkit) | POV conversational | [W] Playkit Report https://playkit.substack.com/p/styl-app |
| 120 | ZODIAC AS BOYFRIENDS | Astroscope @astroscope | 4.1M | 13-slide slideshow | [R] slideshow.md §11 astroscope-4m https://www.tiktok.com/@astroscope/video/7573064073093385494 |
| 121 | For the man in your life who may have everything | Hearth @hearthdisplay | 3.4M (metadata only per family.md) | unknown | [R] family.md §2 'also found' |
| 122 | I'm the mother of six and here are six small things we do in our family that make our big family life a little bit easier. *(spoken)* | @sharon.a.life | 2.9M | numbered talking head (spoken) | [R] family.md §2 sharon-organizedmom |
| 123 | What I eat in a day as somebody who's trying to grow my glutes, but I also want a six pack *(spoken; likely paid/boosted)* | MyFitnessPal @myfitnesspal | 2.7M | creator ad (spoken) | [R] ugc.md §8 mfp-meals https://www.tiktok.com/@myfitnesspal/video/7572602746864520478 |
| 124 | People with these hobbies have +999999 aura | Rise (66-day reset app) | 2.6M (Instagram, per Playkit) | fade-in meme (Reel) | [W] Playkit Report https://playkit.substack.com/p/rise-app |
| 125 | You have an iPhone and you're tired of that storage full message, but you hate paying for iCloud monthly fees. You need this. *(spoken)* | @mojuetech (app not named by source) | 2.6M (per Virlo (vendor)) | talking head (spoken) | [W] Virlo https://virlo.ai/data/viral-hooks/apps |
| 126 | Necklines that don't flatter a round face | Style DNA | 2.3M (per Playkit) | photo collage video | [W] Playkit Report https://playkit.substack.com/p/styledna |
| 127 | people with these hobbies > > > | Curiosity Quench | 1.9M (per Playkit) | fade-in + caption | [W] Playkit Report https://playkit.substack.com/p/curiosity-quench |
| 128 | people born on 2/12/13/14/16/18 | Astroscope @astroscope | 1.5M | slideshow, emoji grid | [R] slideshow.md §11 astroscope-1m5 https://www.tiktok.com/@astroscope/video/7555189623396240662 |
| 129 | ¿Quieres destacar y verte más atractiva que las demás? | Depuff AI character @lunaglowup__ | 1.3M | openly-AI mascot | [R] ugc.md §8 luna-glow https://www.tiktok.com/@lunaglowup__/video/7693642025723383062 |
| 130 | +99999999999999 aura to the people with these hobbies | Curiosity Quench | 1.3M (per Playkit) | fade-in + caption | [W] Playkit Report (same post) |
| 131 | WHAT I EAT IN A DAY as a pilates girl | Cal AI creator @sashalusslover | 1.1M | faceless WIEIAD | [R] ugc.md §8 sasha-wieiad https://www.tiktok.com/@sashalusslover/video/7665709864848575777 |
| 132 | Señales que eres más atractiva que tus amigas | Depuff AI @lunaglowup__ | 915K (per hooks.json) | openly-AI mascot | [R] hooks.json (Sep 2026) |
| 133 | Send this to all the friends you love but never write to | GiGi | 914K (per Playkit) | selfie video + text | [W] Playkit Report https://playkit.substack.com/p/french-dating-app-just-passed-tinder-app-store |
| 134 | If you're always scrolling on your phone or watching videos in bed, you're gonna love this. *(spoken)* | @gorziwwg (app not named by source) | 868K (per Virlo (vendor)) | talking head (spoken) | [W] Virlo https://virlo.ai/data/viral-hooks/apps |
| 135 | 🫁 What type of lungs do you have? 🫁 | Breathquest | 787K (per Playkit) | Pacman loop | [W] Playkit Report https://playkit.substack.com/p/breathquest |
| 136 | Here's a really neat hidden trick for anyone using a Samsung phone that levels up how smooth your phone feels. *(spoken)* | @sam_beckman | 670K | talking head / hands (spoken) | [R] ugc.md §8 sam-samsung https://www.tiktok.com/@sam_beckman/video/7607222841599151376 |
| 137 | Venus Retrograde For Each Sign! *(likely paid/boosted)* | @starastrologyyy | 662K | video slideshow | [R] slideshow.md §11 starastro-venus |
| 138 | 3 señales de que tienes una genética atractiva | Depuff AI @lunaglowup__ | 551K (per hooks.json) | openly-AI mascot | [R] hooks.json (Sep 2026) |
| 139 | SUPER TIP FOR STUDENTS! If you're a student, this video is for you. | Tiimo @tiimoapp | 361K | desk feature demo | [R] screendemo.md §9 #17 https://www.tiktok.com/@tiimoapp/video/7137757240777346310 |
| 140 | FOUR APPS WORTH HAVING IF YOU'RE A MUM. | @thesuitelifeofissy | 270K | talking head app listicle | [R] family.md §2 issy-appsformums |
| 141 | three of the most powerful ⚡ novenas | Hallow @hallowapp | 156K | talking head in car + app screens | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@hallowapp/video/7148275167813487918 |
| 142 | If your notes app looks anything like this, let's chat *(spoken)* | @victoriaharderxo | 59K | screen tutorial (spoken) | [R] family.md §2 victoria-reminders |
| 143 | If you love God but you're trying to work on your health, you need to see this. *(spoken)* | FaithFull | n/a (best ad per Starter Story via hooks.json) | creator ad | [R] hooks.json (Starter Story May 2026) |
| 144 | My mom's an interior designer… *(spoken)* | Dupe.com creator | n/a | talking head (spoken) | [R] hooks.json (EVO, Superwall Oct 2026) |
| 145 | I've been a flight attendant for 3 years now *(spoken)* | JetBack creators | n/a | talking head (spoken), then '#1 flight hack' | [R] hooks.json (EVO, Superwall Oct 2026) |

### List / number (24)

A count or ranking promises a bounded, skimmable payoff.

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 146 | Secret websites that feel illegal to know *(aggregate, not one post)* | @carlo.digital | 58.9M (58.9M across 92 versions, per Shortimize) | 3-4 s hook clip → reveal | [W] Shortimize https://shortimize.com/blog/tiktok-fomo-hooks-driving-millions-of-views |
| 147 | 3 mindblowing yet simple Claude Cowork agents *(likely paid/boosted)* | @jakeabrams21 | 26.3M | talking head + doc cards | [R] ugc.md §8 tt-jake https://www.tiktok.com/@jakeabrams21/video/7621000999339035934 |
| 148 | Fast food, Hot showers, No exercise, 2L of water… | Umax (Blake Anderson) | 11.3M (per Playkit) | slow slideshow | [W] Playkit Report https://playkit.substack.com/p/this-content-helped-a-lifestyle-app-reach-500k-mrr-in-12-months |
| 149 | Most to least likely to break your heart according to Astra: | Astra @getastraapp | 3.9M | 6-slide ranked slideshow | [R] slideshow.md §11 astra-ranked https://www.tiktok.com/@getastraapp/video/7343668794772163886 |
| 150 | Most likely to live a double life: | Astra @getastraapp | 3.8M | 6-slide slideshow | [R] slideshow.md §11 astra-whatsyours https://www.tiktok.com/@getastraapp/video/7340694416954477870 |
| 151 | Most to least likely to connect with animals spiritually: | Astra @getastraapp | 3.7M | 6-slide slideshow | [R] slideshow.md §11 astra-isthisyou https://www.tiktok.com/@getastraapp/video/7341070399720967466 |
| 152 | ranking the biggest movies of 2022 | Queue | 3.3M (per Playkit) | tripod shot + caption | [W] Playkit Report https://playkit.substack.com/p/queue |
| 153 | Here are the top five best side hustle apps to make the most amount of money in the least amount of time. *(spoken)* | @gimmeaquis | 3.2M (per Virlo (vendor)) | talking head (spoken) | [W] Virlo https://virlo.ai/data/viral-hooks/apps |
| 154 | Emojis that need to exist | Font Art @fontartapp | 2.4M (per Playkit) | text overlay + tutorial | [W] Playkit Report https://playkit.substack.com/p/custom-fonts-emojis-app |
| 155 | 5 cute questions you have to ask them | Cray Cray @craycrayquestions71 | 2.1M | question cards | [R] slideshow.md §11 craycray-2m1 https://www.tiktok.com/@craycrayquestions71/video/7479574833571892522 |
| 156 | rating movies I've watched on planes | Queue | 1.9M (per Playkit) | slideshow + caption | [W] Playkit Report (same post) |
| 157 | Three apps to clear your boredom. *(spoken)* | @leezo361 | 1.4M (per Virlo (vendor)) | talking head (spoken) | [W] Virlo https://virlo.ai/data/viral-hooks/apps |
| 158 | 50 aplicaciones que necesitas en tu iPhone · Parte 1 | @soyenriquebarron (x HiNoter) | 1.1M | apps-you-need series | [R] screendemo.md §9 #25 https://www.tiktok.com/@soyenriquebarron/video/7600508866534755592 |
| 159 | 7 reasons why Hearth is THAT girl | Hearth @hearthdisplay | 754K | numbered listicle over home b-roll | [R] family.md §2 hearth-thatgirl https://www.tiktok.com/@hearthdisplay/video/7622362289127034142 |
| 160 | unhinged and unfortunate things men have said about periods (part two) | Stardust @stardust.app | 635K | selfie cover + 14 comment screenshots | [R] slideshow.md §11 stardust-635k https://www.tiktok.com/@stardust.app/video/7665364041681898765 |
| 161 | 12 Golf Tips For Beginners | Scratch AI @scratch.ai | 579K | 14-slide slideshow | [R] slideshow.md §11 scratch-578k https://www.tiktok.com/@scratch.ai/video/7659912621218352397 |
| 162 | 7 Golf Cheat Codes | Scratch AI @scratchaiapp | 547K (per hooks.json) | listicle slideshow | [R] hooks.json (Apr 2026) |
| 163 | Things you can do in 25 minutes (if you're addicted to your phone) *(likely paid/boosted)* | Opal @opal | 445K | serif slideshow | [R] slideshow.md §11 opal-anyrec https://www.tiktok.com/@opal/video/7564463679215914262 |
| 164 | the app launch checklist i wish i had for my first app | @chris.raroque | 388K | VO over screen | [R] ugc.md §8 chris-checklist |
| 165 | Our essential for the summertime »»» | GiGi | 317K (per Playkit) | slideshow + product screenshot | [W] Playkit Report https://playkit.substack.com/p/french-dating-app-just-passed-tinder-app-store |
| 166 | 7+ Goodnotes features you probably don't know exist! | Goodnotes @goodnotes | 214K | top-down iPad demo | [R] screendemo.md §9 #16 https://www.tiktok.com/@goodnotes/video/7673019476446596369 |
| 167 | Free apps you need on your phone part 1 | @yorrriiick | 110K | face + phone in hand | [R] screendemo.md §9 #31 |
| 168 | 5 ways I cut my calories down | Stronger | n/a | listicle slideshow | [R] hooks.json (Superwall Aug 2025) |
| 169 | Here's five controversial rules that we had at our wedding recently... *(spoken)* | POV (disposable camera app) | n/a | wedding listicle (spoken) | [R+W] Better Launch https://www.betterlaunch.co/playbooks/episodes/joseph-choi-viral-app-founders ; hooks.json |

### Discovery / "what app is this" (22)

"I only just found this", "someone showed me this". Disbelief that the thing exists.

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 170 | been shopping at Aldi literally for 7 years and I'm JUST NOWWW FINDING THIS???? | Potto UGC @madimugc444 | 29.3M (brand repost on @potto.app did 2.9M (yt-dlp)) | reaction → phone walkthrough | [R+W] family.md §2 potto-wishfound https://www.tiktok.com/@madimugc444/video/7654996077086510349 ; https://www.tiktok.com/@potto.app/video/7664629885800959245 |
| 171 | our prof showed us how to watch a 1 hour lecture in 2 minutes 😭 | AnswersAI @answersai.com | 10.9M (ugc.md quotes '5 minutes'; screendemo.md and Virlo say '2 minutes') | in-the-wild lecture POV | [R+W] screendemo.md §9 #8 https://www.tiktok.com/@answersai.com/video/7608667020485201166 |
| 172 | been shopping at Trader Joe's for years and I'm JUST FINDING THISSS??!! | Potto UGC @taliameals | 10.5M | same template, iPad | [R] family.md §2 taliameals-love |
| 173 | I SPENT 4 YEARS IN COLLEGE 💀 AND I ONLY JUST FOUND THIS APP 😭😭😭 | StudyFetch @studyfetch | 9.6M | reaction → demo | [R] screendemo.md §9 #7 https://www.tiktok.com/@studyfetch/video/7498834821666311467 |
| 174 | This is what college looks like for this new generation | Coconote | 7.5M (per Playkit) | classroom pan + app demo + caption | [W] Playkit Report (same post) |
| 175 | I JUST STARTED MY FINAL SEMESTER IN COLLEGE AND I FIND THIS NOW????? 💀 | StudyFetch @studyfetch | 6.5M | shocked face → demo | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@studyfetch/video/7498835717200629034 |
| 176 | how did i find this- | Locket @locketcamera | 6.2M | selfie reaction → home-screen widget | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@locketcamera/video/7331071674336415018 |
| 177 | new favorite way to study 📚🥽✨ | StudyFetch @studyfetch | 6.1M | talking head → demo | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@studyfetch/video/7501854875584564526 |
| 178 | Welcome to the new future of college education… | Coconote | 5.6M (per Playkit) | classroom + app demo + caption | [W] Playkit Report https://playkit.substack.com/p/coconote |
| 179 | Mom hack I wish I would have found sooner… | @juneandivoryfarms | 5M | mom-hack build | [R] family.md §2 juneivory-momhack |
| 180 | college in 2025 just became so easy 🤯 | StudyFetch @studyfetch | 3.5M | lecture-hall POV → phone demo | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@studyfetch/video/7498835369333509419 |
| 181 | Oh my God, I finally have it | Font Art @fontartapp | 3M (per Playkit) | text overlay + tutorial | [W] Playkit Report https://playkit.substack.com/p/custom-fonts-emojis-app |
| 182 | someone made strava but for the gym?? *(likely paid/boosted)* | Stronger @strongerapp | 2.7M (a sibling cut, 'someone made Strava for the gym??', did 1.0M (yt-dlp)) | reaction → demo | [R+W] ugc.md §8 stronger-react https://www.tiktok.com/@strongerapp/video/7611280708153150733 ; https://www.tiktok.com/@strongerapp/video/7522197104001862926 |
| 183 | my hostel roommate just showed me this and all my solo travel anxiety is gone 🤯🤯 | Nomad Table @nomadtable | 1M | faceless hook → demo | [R] screendemo.md §9 #12 https://www.tiktok.com/@nomadtable/video/7505063333310008607 |
| 184 | 3 years at the gym and NOW i find this?? 😭 *(likely paid/boosted)* | Stronger @strongerapp | 851K | shocked face → gym demo | [R] screendemo.md §9 #13 https://www.tiktok.com/@strongerapp/video/7608498509083446541 |
| 185 | been shopping at Walmart for 10 years and NOW I FIND THIS??? | Potto @potto.app | 692K | reaction → phone walkthrough | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@potto.app/video/7654589603214544159 |
| 186 | the hostel volunteer just showed me this and all my solo travel anxiety is GONE 🤯🤯 | Nomad Table @nomadtable | 627K | faceless hook → demo | [R] ugc.md §8 nomad-ayoub https://www.tiktok.com/@nomadtable/video/7504344756852395310 |
| 187 | I just found the best app for your academic comeback this 2025 😳📚 | FocusTree | 400K (per Playkit) | text overlay + b-roll | [W] Playkit Report https://playkit.substack.com/p/study-focus-app |
| 188 | Guys, you have to check out this app. *(spoken)* | @sam_beckman (Hidden Android Gems) | 290K (on-screen: 'This App is filled with SECRET Android Apps 🔥') | face + floating phone (spoken) | [R] screendemo.md §9 #29 https://www.tiktok.com/@sam_beckman/video/7690163755241737524 |
| 189 | I've been solo traveling for 2 years and now I find out about this | Nomad Table | n/a | reaction → demo | [R] hooks.json (Superwall Feb 2026) |
| 190 | She showed me this app, and all I do is hit record. *(spoken)* | Coconote creator | n/a | creator demo (spoken) | [R] hooks.json (Superwall Apr 2026) |
| 191 | Underrated iPhone app. The Bloom app lets you buy stock while also holding your hand through the process. | Bloom | n/a | text story / demo | [R] hooks.json (Superwall Jul 2025) |

### Social proof / roast / comment-reply (22)

Other people's reaction is the hook: compliments, a roast, a comment being answered, press.

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 192 | Closest to your BFF without texting *(aggregate, not one post)* | Locket (nano-influencer UGC) | 250M (250M+ campaign-wide, per Tiny Empires) | UGC | [W] Tiny Empires https://tinyempires.substack.com/p/9-founders-who-hit-6-figures-with |
| 193 | oh he don't wanna read all that?????? #womeninmalefields | Coconote creator @sidstudiesadhd | 41.9M | phone filming laptop, overlay whole time | [R] brainrot.md §9 coconote-sid-41.9M https://www.tiktok.com/@sidstudiesadhd/video/7438758153044413742 |
| 194 | hey, I saw that many people commented on the last video that they liked the case and wanted to know where I bought it… *(spoken)* | @soyenriquebarron (phone case) | 5.9M | comment-reply, hands only (spoken) | [R] ugc.md §8 enrique-case |
| 195 | IM CRYING LOOK AT WHAT MY BESTIE MADE ME GET>>> | Locket @locketcamera | 5.8M | dorm dance → widget | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@locketcamera/video/7312888409507269918 |
| 196 | SHUT UP MY LONG DISTANCE BOYFRIEND IS THE CUTEST EVER🥹❤️ | Locket @locketcamera | 4.8M | selfie reaction → app | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@locketcamera/video/7320610773632388382 |
| 197 | ‼️How to study 1 DAY before your EXAM‼️ | StudyFetch @studyfetch | 4.4M (with comment-reply sticker 'soo just so u all know she saying studying, as in this video does not apply to ppl such as me who r learning the whole class a day before the exam.') | comment-reply talking head | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@studyfetch/video/7501854760115490091 |
| 198 | NOT MY BFF CASUALLY DROPPING HER NEW MAN ON MY LOCKET. SPEECHLESS. | Locket @locketcamera | 3.1M | selfie reaction → widget screenshot | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@locketcamera/video/7314023473658072350 |
| 199 | We got SO MANY compliments for what we did at our wedding 🥰 | Lense @lense.app | 2.9M (Dec 2023 original; reruns 1.2M (Dec 2025, '..'), 655K (May 2025), 239K (Aug 2026) per slideshow.md) | 7-slide photo slideshow | [R+W] TikTok post; on-screen text read from slide 1 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@lense.app/video/7313978237091188000 ; slideshow.md §11 lense-1m2 |
| 200 | Bro is cooked | Umax | 2.3M (per Playkit) | selfie glow-up + product UI | [W] Playkit Report https://playkit.substack.com/p/this-content-helped-a-lifestyle-app-reach-500k-mrr-in-12-months |
| 201 | Any cool Mother's Day recs for my wife who has a deep passion for organization? | Skylight @myskylight | 2.1M | comment-reply sticker + VO + UI | [R] family.md §2 sky-mothersday https://www.tiktok.com/@myskylight/video/7356736324960816426 |
| 202 | Bro really got rejected like that 😭 | Rizz @rizz.app | 1.3M | faceless car POV → demo | [R] screendemo.md §9 #11 https://www.tiktok.com/@rizz.app/video/7262832400839789866 |
| 203 | Rate his glow up out of 10 *(post caption, not on-screen)* | Umax @umax.app | 1.2M (post caption 'Ratw his glow up out of 10' (sic)) | green screen over score | [R] ugc.md §8 tt-umax https://www.tiktok.com/@umax.app/video/7326971975946063146 |
| 204 | Dylan Latham did not get invited. Sub-90 Umax scores are not allowed on this trip. *(spoken)* | Umax @umax.app | 927K | green screen (spoken) | [R] ugc.md §8 umax-reply https://www.tiktok.com/@umax.app/video/7346807147713269035 |
| 205 | Meet Rizz: Your AI Dating Wingman and Response Generator | Rizz @rizz.app | 757K | press-screenshot slideshow (InsideHook) | [W] TikTok post; on-screen text read from slide 1 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@rizz.app/video/7254714211081751851 |
| 206 | Bro thought I was going to accept this trade 💀 | Sound Map | 749K (per Playkit) | slideshow + app screenshot | [W] Playkit Report https://playkit.substack.com/p/sound-map |
| 207 | Our wedding guests were SHOCKED by what we did | Lense @lense.app | 680K (per hooks.json) | listicle slideshow | [R] hooks.json (Mar 2025) |
| 208 | Y'all kept asking… | Umax @umax.app | 655K (sticker 'bro android maxx plesse' → 'So we did it 😈😈😈') | comment-reply | [R] ugc.md §8 umax-android https://www.tiktok.com/@umax.app/video/7325842619873971499 |
| 209 | Sorry we can not hear you we're kinda busy being featured in the new Apple Keynote | Structured @structured.app | 550K | split green screen, dancing cutout | [R] ugc.md §8 structured-wwdc https://www.tiktok.com/@structured.app/video/7649417658676333857 |
| 210 | RATING CELEBRITIES PART 2 | Umax @umax.app | 217K (per hooks.json; listing caption 'Lmk who u want next!!!') | score reveal | [R+W] hooks.json ; https://www.tiktok.com/@umax.app/video/7310021789755641130 |
| 211 | we made an app that has helped 50k+ men quit their p\*rn 🌽 addiction | QUITTR @quittr.app | 164K (post title 'Stop Gooning ❌') | tweet-screenshot slideshow | [W] TikTok post; on-screen text read from slide 1 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@quittr.app/video/7421283899273121056 |
| 212 | Wow! A politician actually responded 🙈 | Autopilot | 68K (per Playkit) | tweet screenshots carousel | [W] Playkit Report https://playkit.substack.com/p/autopilot |
| 213 | Replying to @… Cal AI may not be free, but it is super affordable | Cal AI @calai.app | 42K | comment-reply | [R] ugc.md §4 |

### Before / after (18)

A transformation promised or shown; often a fade-in or a 2-slide setup → payoff.

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 214 | I replaced social media with.. | Bible Chat @biblechatapp | 94M (per Playkit) | testimonial screenshot + music | [W] Playkit Report https://playkit.substack.com/p/bible-chat-app |
| 215 | Bro: 'that breakup didn't hurt me' | Rise | 14.6M (Instagram, per Playkit) | fade-in meme (Reel) | [W] Playkit Report https://playkit.substack.com/p/rise-app |
| 216 | When you decide to ditch the paper calendars and go digital | Hearth @hearthdisplay | 9.3M | before → after transformation | [R] family.md §2 hearth-chaos https://www.tiktok.com/@hearthdisplay/video/7398340567748463918 |
| 217 | I went from zero... | Stronger @strongermobile | 7.3M (same hook also 3.5M, 1.2M, 1.1M) | 2-slide setup → heatmap | [R] slideshow.md §11 stronger-sundays https://www.tiktok.com/@strongermobile/video/7658008519278546198 |
| 218 | After convincing my husband to use Bible Chat just 5 minutes a day.. | Bible Chat @biblechatapp | 6M (per Playkit) | text overlay + b-roll | [W] Playkit Report (same post) |
| 219 | DAY 0 vs DAY 40 *(paraphrased)* | Bible Chat @biblechatapp | 4M (per Playkit (described as a visual comparison)) | brain-scan comparison | [W] Playkit Report (same post) |
| 220 | Probably needed a hug | Lemon8 @leticialeedaily | 3.9M | before/after clip → search montage | [R] slideshow.md §11 lemon8-3m9 |
| 221 | Bro: 'I won't achieve sh\*t in my life | Rise | 2.9M (Instagram, per Playkit) | fade-in meme (Reel) | [W] Playkit Report (same post) |
| 222 | No tinder, no hinge | Hevy @hevyapp | 2.9M | 2-slide gym slideshow | [W] TikTok post; on-screen text read from slide 1 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@hevyapp/video/7538469108602408214 |
| 223 | To become the person you want | Hevy @hevyapp | 2.7M | 2-slide gym slideshow | [W] TikTok post; on-screen text read from slide 1 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@hevyapp/video/7528376637088484630 |
| 224 | Imagine buying 100 disposable cameras for your wedding.. | Lense @lense.app | 2M (→ 'Instead, turn your guest's phones into one') | phone-in-hand demo | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@lense.app/video/7281172985744985377 |
| 225 | Anne Hathaway before and after she found her colors | Style DNA | 1.9M (per Playkit) | photo collage video | [W] Playkit Report https://playkit.substack.com/p/styledna |
| 226 | War is over, (I finally got a job offer cause I used AI better than the company could) | AIApply | 1.6M (per Playkit) | text + demo + reaction | [W] Playkit Report https://playkit.substack.com/p/aiapply-app |
| 227 | here's 100% AI-generated text → click → 100% human-written text. *(paraphrased)* | Natural Write | 1.5M (about 1.5M, per Postiz) | before/after demo | [W] Postiz https://postiz.com/blog/tiktok-marketing-strategy-100k-90-days |
| 228 | My bro needed to glow up... | Umax @umax.app | 1.2M | video slideshow | [R] slideshow.md §11 umax-1m2 |
| 229 | How to glow up in less than 7 minutes | Umax @umax.app | 466K | talking head | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@umax.app/video/7324917493011647786 |
| 230 | Bye bye paper calendar! | @missjessicanicoleblog | 402K | DIY command-center build | [R] family.md §2 jessica-byepaper |
| 231 | october 2025 | Cal AI partner @taaaaylerr | 343K (→ 'october 2026') | transformation proof | [R] ugc.md §8 tay-stuck https://www.tiktok.com/@taaaaylerr/video/7696680140092247309 |

### Confession (12)

First-person admission of something embarrassing, risky or vulnerable.

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 232 | I'm me again…it feels like its been years… | noplace | 16.4M (per Playkit) | candid shot + text | [W] Playkit Report https://playkit.substack.com/p/thenoplace |
| 233 | I faked an interview to eliminate my target after his game | Splashin | 13.9M (per Playkit) | interview + text overlay | [W] Playkit Report https://playkit.substack.com/p/114-videos-116m-likes-250k-mrr |
| 234 | I'm jealous of my co-workers without kids… I've lived an entire life before 9am. *(likely paid/boosted)* | Skylight @myskylight | 5M (card signed '– Mom, 32') | confession cards → UI | [R] family.md §2 sky-parentinghard |
| 235 | SET UP MY SKYLIGHT CALENDER W ME !! | @truthfullycharlie | 3.6M (VO: 'This may sound and look sponsored, but I swear it's not.') | set-up-with-me | [R] family.md §2 charlie-setup |
| 236 | parents are spilling their secrets and we're putting them up on a wall *(spoken; likely paid/boosted)* | Skylight @myskylight | 3.2M | IRL activation (spoken) | [R] family.md §2 sky-mural |
| 237 | I had a point where I pay all my bills, check my account and still feel like I had no idea what was actually going on… *(spoken)* | @allisunday (Monarch creator per screendemo.md) | 3M (per Virlo (vendor)) | talking head (spoken) | [W] Virlo https://virlo.ai/data/viral-hooks/apps |
| 238 | crashing out bc I wasted MONTHS building the most INSANE app 😭😭 | Fitdrop @fitdropapp | 2.3M (per Playkit) | text overlay | [W] Playkit Report https://playkit.substack.com/p/social-outfit-sharing-app |
| 239 | Whenever I get tempted to Sin | PrayScreen @prayscreenio | 1.5M (per Playkit) | text overlay | [W] Playkit Report https://playkit.substack.com/p/prayscreen-app |
| 240 | OUR STORY: We used our phones way too much | Brick @getbrick | 1.4M | 18-slide founder story | [R] slideshow.md §11 brick-1m4 https://www.tiktok.com/@getbrick/video/7308046646221344042 |
| 241 | I was g\*\*ning 10 times a day until... *(likely paid/boosted)* | Reload @reload.apps | 1.4M | video slideshow | [R] slideshow.md §11 reload-1m4 https://www.tiktok.com/@reload.apps/video/7610576715240328461 |
| 242 | I've always been a what they call a very frugal person. *(spoken; likely paid/boosted)* | Cleo @meetcleo | 1.4M | landscape testimonial (spoken) | [R] ugc.md §8 cleo-grief |
| 243 | YALL IM COOKED 😭 I spent my COLLEGE TUITION building... | Fitdrop @fitdropapp | 830K (per Playkit) | text overlay | [W] Playkit Report (same post) |

### Dialogue / quote (36)

Opens on something someone said (or a text-message exchange).

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 244 | Me staring at the 'I thought I'll never meet anyone like you'.. | Duet @duet.us.official | 65M (per Playkit) | text overlay + acting | [W] Playkit Report https://playkit.substack.com/p/duet-dating-app |
| 245 | Ariana? … finished the exam in nine minutes? *(spoken)* | AnswersAI @answersai.com | 35.8M | classroom skit, burned-in dialogue captions | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@answersai.com/video/7609769616419720462 |
| 246 | You look happier. / Thanks, I found the best girly app. *(likely paid/boosted)* | Lemon8 @yolandaro | 31.1M (ByteDance's own app; almost certainly paid) | dance → screenshots | [R] slideshow.md §11 yolandaro-31m https://www.tiktok.com/@yolandaro/video/7658125436743994654 |
| 247 | "your music taste is so bad🤮😵😵" my airpods: | Duolingo @duolingo | 17.2M | mascot meme over game footage | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@duolingo/video/7577139807084760334 |
| 248 | Ariana, what are you doing? *(spoken)* | AnswersAI @answersai.com | 16.3M | classroom skit, burned-in dialogue captions | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@answersai.com/video/7633852097674366221 |
| 249 | hey / is this olivia? / maybe / who's asking? | Rizz via @textcube | 8.5M | fake text story over Minecraft parkour | [R] brainrot.md §9 textcube-8.5M https://www.tiktok.com/@textcube/video/7363859568079785248 |
| 250 | "I have no motivation to wash the dishes" lol can't relate bc I wanna get more rainbow stones for my birb 😜😂😂 | Finch @finchcare | 6.1M | creator vlog + app task card | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@finchcare/video/7584470449040510221 |
| 251 | Hello? / Uh, hi? Who's this? / I'm the person in the apartment below you. | Rizz via @okaygesture | 5.2M | fake text story | [R] brainrot.md §9 okaygesture-5.2M https://www.tiktok.com/@okaygesture/video/7411945270843395360 |
| 252 | Can I call you? / This is serious. It's about Lily. | Rizz via @okaygesture | 4.9M | fake text story | [R] brainrot.md §9 okaygesture-4.9M https://www.tiktok.com/@okaygesture/video/7411320095428873505 |
| 253 | The mental load: 'just tell me what to do' | @zachmentalloadcoach | 4.4M | stitch | [R] family.md §2 zach-stitchpaige |
| 254 | This is a robbery! *(spoken)* | @messengerpigeonhq (app not named by source) | 4.2M (per Virlo (vendor)) | skit (spoken) | [W] Virlo https://virlo.ai/data/viral-hooks/apps |
| 255 | Babe, whose car is in the driveway? | Rizz via @textbix | 3.9M | fake text story | [R] brainrot.md §9 textbix-3.9M https://www.tiktok.com/@textbix/video/7365467235483159840 |
| 256 | "Training legs is boring" | Hevy @hevyapp | 3.3M | 2-slide gym slideshow | [W] TikTok post; on-screen text read from slide 1 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@hevyapp/video/7551439183890435350 |
| 257 | 'girl sry we have to reschedule' *(likely paid/boosted)* | Lemon8 @yolandaro | 3.2M (→ 'Lemon8, im coming') | dance → screenshots | [R] slideshow.md §11 yolandaro-canceled |
| 258 | Hey baby, we need to talk. | Rizz via @textcube | 3.1M | fake text story | [R] brainrot.md §9 textcube-3.1M https://www.tiktok.com/@textcube/video/7407250194334551329 |
| 259 | IM LẶNG VÀ ĐẾM ĐI 😭 | Praktika creator @learnwithdat | 2.5M (Vietnamese for 'be quiet and count') | human vs AI tutor skit | [R] ugc.md §8 dat-count https://www.tiktok.com/@learnwithdat/video/7693441670112677138 |
| 260 | "What camera?" "Drop the settings" Me: just this app 📸 *(likely paid/boosted)* | EPIK creator @lexi.degraw | 2.4M (VO: 'everyone's always like what camera do you use what settings do you use, girl it's just this one filter') | facecam box + App Store end | [R] ugc.md §8 epik-filter https://www.tiktok.com/@lexi.degraw/video/7673922715174161672 |
| 261 | Babe, what's your phone passcode? / It's my ex's birthday. | Rizz via @texttension | 2.3M | fake text story | [R] brainrot.md §9 texttension-2.3M https://www.tiktok.com/@texttension/video/7336255475354176801 |
| 262 | you never guess what song just came on | @golden_textes (bio-link app) | 1.9M | fake text story over cooking b-roll | [R] brainrot.md §9 golden-1.9M https://www.tiktok.com/@golden_textes/video/7605595090408525078 |
| 263 | Ready for our wedding? / Our wedding? / You're getting married to my sister | Rizz via @textiify | 1.7M | fake text story | [R] brainrot.md §9 textiify-1.7M https://www.tiktok.com/@textiify/video/7676293032320208158 |
| 264 | Check your email right now. / Michael, we haven't spoken in eight months. | Rizz via @textsrampage | 1.2M | fake text story | [R] brainrot.md §9 textsrampage-1.2M https://www.tiktok.com/@textsrampage/video/7681711809509772566 |
| 265 | “I wish I had the discipline to hit the gym as consistently as you” | Hevy @hevyapp | 1.1M | 2-slide setup → calendar | [R] slideshow.md §11 hevy-1m1 https://www.tiktok.com/@hevyapp/video/7568922689679772950 |
| 266 | "what made your wedding so unique?" | Lense @lense.app | 1.1M (→ 'A disposable camera app for my guest!') | phone-in-hand demo | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@lense.app/video/7278952371512724768 |
| 267 | Lily? … It says you finished the exam in nine minutes. *(spoken)* | AnswersAI @answersai.com | 1M | classroom skit (spoken) | [R] ugc.md §8 ans-prof https://www.tiktok.com/@answersai.com/video/7647704464454995214 |
| 268 | "the F students are inventors 🧑‍🔬😭" | Quizard @quizard.ai | 963K | classroom single take | [R] screendemo.md §9 #10 https://www.tiktok.com/@quizard.ai/video/7502540387144289567 |
| 269 | Can I cheat on you? | Plug AI via @textfun | 844K | fake text story | [R] brainrot.md §9 textfun-844K https://www.tiktok.com/@textfun/video/7410074052557098272 |
| 270 | Alex! / Alex! / Alex! / Jess just won Mrs. Alabama! | Plug AI via @textswildin | 575K | fake text story | [R] brainrot.md §9 textswildin-575K https://www.tiktok.com/@textswildin/video/7400490670873382177 |
| 271 | “I wish I had your genetics” *(likely paid/boosted)* | Hevy @hevyapp | 483K | 2-slide setup → calendar | [R] slideshow.md §11 hevy-483k https://www.tiktok.com/@hevyapp/video/7598583347853511958 |
| 272 | My landlord said I can't change anything *(likely paid/boosted)* | Snugly @snugly.app | 483K (full line in hooks.json: '…, so I showed her what AI thinks it could look like'; landlord hook later decayed to 2-8K) | AI-reveal slideshow | [R] slideshow.md §11 snugly-landlord https://www.tiktok.com/@snugly.app/video/7605358179316157718 |
| 273 | my nan said my flat looks like a prison cell *(likely paid/boosted)* | Snugly @snugly.app | 304K | AI-reveal slideshow | [R] slideshow.md §11 snugly-nan https://www.tiktok.com/@snugly.app/video/7612206325409352982 |
| 274 | Hey babe, wanna go out? / Can you stop calling me that and use my actual name for once? *(likely paid/boosted)* | Rizz via @textvox | 283K | fake text story over Subway Surfers | [R] brainrot.md §9 textvox-283K https://www.tiktok.com/@textvox/video/7415355157363428639 |
| 275 | my sister came over and literally said 'this looks like a hospital bathroom' 💀 *(post caption, not on-screen)* | Snugly @snugly.app | 175K | AI-reveal slideshow (caption hook) | [R] slideshow.md §6 #17 |
| 276 | Our professor just said, 'If I even think ChatGPT wrote your essay, you get a zero.' Whole class goes silent. | Jenni AI creator | n/a | wall-of-text / skit | [R] hooks.json (Superwall Nov 2025) |
| 277 | Oh, I was with your boyfriend last night | NGL (Hunter Isaacson) | n/a | text story | [R] hooks.json (Superwall Jul 2025) |
| 278 | Hey Temu, is it true that I can make a thousand dollars from your lawsuit? | Payout | n/a | POV skit | [R] hooks.json (Superwall Mar 2026) |
| 279 | What would you do if this happend to you? *(post caption, not on-screen)* | @sentimental.texting (Rizz network) | n/a | texting story (caption) | [W] Shortimize https://www.shortimize.com/blog/rizz-apps-b-roll-strategy-that-got-them-half-a-billion-views-on-tiktok |

### Mental load (family / household invisible labour) (7)

Family-niche posts naming the invisible planning work. Mostly non-app references; see family.md.

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 280 | What would the holidays look like if women didn't do any of the work? | @sheisapaigeturner | 6.9M | talking head, one take | [R] family.md §2 paigeturner-holiday https://www.tiktok.com/@sheisapaigeturner/video/7586483763064884493 |
| 281 | The Default Parent! | @casseysjourney | 6.3M | car talking head | [R] family.md §2 cassey-defaultparent |
| 282 | thank you for this perfect example of how often invisible labor gets missed *(spoken)* | @world.shaker | 5.8M | stitch (spoken) | [R] family.md §2 worldshaker-fairplay |
| 283 | This is a perfect example of what healthy coparenting looks like (he has no obligation to my youngest but he still makes her feel included) | @lexpartain (non-app) | 5.8M | doorbell-cam footage + text | [R] family.md §2 lexpartain-coparent |
| 284 | POV: Your first vacation with a man who quietly takes the mental load | @michellebellexo | 4.9M | two-character POV skit | [R] family.md §2 michelle-vacation |
| 285 | This is the mental load women carry for the people they love | @fitzywippakate | 4.7M (metadata only per family.md) | unknown | [R] family.md §2 'also found' |
| 286 | Rare sighting: DAD is the default parent | @oliviamariebliss | 4M | vlog skit | [R] family.md §2 olivia-dadleaves |

### "Nobody talks about…" (4)

Frames the pain as unspoken, which invites "same" comments.

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 287 | Nobody talks about the feelings of resentment that can surface from being the default parent. | @therealsideoffour | 3M | 7 s wall of text | [R] family.md §2 sideoffour-default7s |
| 288 | No one talks about how exhausting it is to live with a man who is perfectly willing to help... but somehow needs you to notice the problem, explain the problem, assign the task, and then remember to follow up on the task. At that point am I your partner or your project manager? | Orbits partner @dayinthelifewith.ari | 1.4M | 6 s wall of text over selfie | [R] family.md §2 orbits-ari https://www.tiktok.com/@dayinthelifewith.ari/video/7693629259906141470 |
| 289 | No one hands you a manual for running a home… so I made one. | @bytaylorrada | 623K | 8 s series opener | [R] family.md §2 taylorrada-manual |
| 290 | No one talks about the exhaustion of living with a man who will do almost anything you ask but rarely notices what needs to be done before you ask. | Orbits partner @dayinthelifewith.ari | 426K (same text + 'i just use Orbits now…' on @syd.isorganized got 5.4K) | 7 s text over selfie | [R] family.md §2 orbits-ari-draining |

### Specificity (a real time, name or number is the hook) (11)

The concrete detail is what stops the scroll.

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 291 | ⚠️It will be time to BeReal at 3:42pm on Monday⚠️ | BeReal @bereal | 17M | office clip, white-box text | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@bereal/video/7352553325553798433 |
| 292 | バス2人席しか空いてない *(likely paid/boosted)* | TimeTree #PR @maipan_03 | 15.8M ('only 2 seats free on the bus…') | mini-drama, app as plot device | [R] family.md §2 timetree-maipan |
| 293 | 3am school morning routine | Me+ (Lifestyle Routine) | 14.1M (per Playkit) | text + song + vlog | [W] Playkit Report https://playkit.substack.com/p/habit-tracker-app-ac63 |
| 294 | POV: Madelyn Cline takes your BeReal | BeReal @bereal | 12.5M | in-app capture | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@bereal/video/7351306332114373920 |
| 295 | We are so back. According to QuiverQuant, Nancy Pelosi has made $10M in the stock market just this week. | Autopilot | 3.3M (per Playkit) | tweet → 'we are so back' | [W] Playkit Report https://playkit.substack.com/p/autopilot |
| 296 | ⁉️ I studied for one day and got a 98 ⁉️ | Palmy founder @theadamhuda (posing as user) | 2.8M | founder as user + screen inserts | [R] ugc.md §8 tt-adamhuda https://www.tiktok.com/@theadamhuda/video/7464620023945039137 |
| 297 | $1.8k in 5 minutes using Claude 😭 | @hustlewithgianni | 2M | filmed laptop + VO | [R] screendemo.md §9 #24 https://www.tiktok.com/@hustlewithgianni/video/7623171286365179166 |
| 298 | This is insane / Up $10,000,000 or 44x yearly salary in one week | Autopilot | 131K (per Playkit) | green screen + caption | [W] Playkit Report (same post) |
| 299 | My mum hasn't changed her bedroom in 15 years | Snugly @snugly.app | 76K (per hooks.json) | AI-reveal slideshow | [R] hooks.json (2026) |
| 300 | my nan has had the same kitchen since 1997 and she thinks it's fine *(paraphrased)* | Snugly @snugly.app | 72K (per hooks.json; text rebuilt from its template + 'kitchen' note) | AI-reveal slideshow | [R] hooks.json |
| 301 | you deadlifted 10 Donald Trumps | Stronger (founder reply loop) | n/a | comment-reply / fade-in | [R] hooks.json (Superwall Aug 2025) |

### Forbidden / secret / "illegal" (3)

Promises insider or slightly transgressive knowledge.

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 302 | Secret websites for students *(aggregate, not one post)* | @isha.muc | 30M (30M+ across 8 variations, per Shortimize) | 3-4 s hook clip → reveal | [W] Shortimize https://shortimize.com/blog/tiktok-fomo-hooks-driving-millions-of-views |
| 303 | Cluely is out. cheat on everything. | Cluely (Roy Lee) | 13.3M (X views, per formats.md) | launch skit (X) | [R] research/formats.md §3.8 ; hooks.json |
| 304 | Playbite's the fastest way to get gems if you know, you know | Noise creator (Playbite) | n/a | wall-of-text / meme | [R] hooks.json (Superwall Jan 2026) |

### Challenge / stakes / prank (14)

A test, a dare, a countdown or a prank with someone's reaction at stake.

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 305 | How strong are your lungs? 🫁💪 | Breathquest | 20.6M (per Playkit) | Pacman looped video | [W] Playkit Report https://playkit.substack.com/p/breathquest |
| 306 | Pranking my dad / I cooked his koi fish 😭💀 / (he asian asf) | Halo AI via @jason.pranks | 15.9M | AI image → real iMessage recording | [R] brainrot.md §9 §9c halo-jason-15.9M https://www.tiktok.com/@jason.pranks/video/7582334187261185310 |
| 307 | Day 1 of getting dressed using Fitted Laundry | Fitted | 3.4M (per Playkit) | talking to camera + app demo | [W] Playkit Report https://playkit.substack.com/p/fitted-laundry |
| 308 | اخدع الذكاء الاصطناعي حقي | Praktika creator @englishwithimane8 | 3.1M (Arabic, roughly 'pranking my AI') | human vs AI tutor skit | [R] ugc.md §8 imane-praktika https://www.tiktok.com/@englishwithimane8/video/7683870094807567649 |
| 309 | Pranking my vegan gf (it's our anniversary😭💀) | Halo AI @halo.ai0 | 1.1M | AI image → iMessage recording | [R] brainrot.md §9 §9c halo-official-1.1M https://www.tiktok.com/@halo.ai0/video/7570046476462722311 |
| 310 | Day 0 of not shaving my mustache until 100K girls download my app | Styl (Dhruv Bindra) | 1.1M (per Playkit) | conversational shot + product clips | [W] Playkit Report https://playkit.substack.com/p/styl-app |
| 311 | Show me how consistent you are at the gym *(likely paid/boosted)* | Hevy @hevyapp | 1M | single gym-mirror selfie | [R] slideshow.md §11 hevy-1m https://www.tiktok.com/@hevyapp/video/7587480839592611094 |
| 312 | Calling my attractive friends to see how attractive they really are | Umax | 1M (per Playkit) | FaceTime screen recording + app demo | [W] Playkit Report https://playkit.substack.com/p/this-content-helped-a-lifestyle-app-reach-500k-mrr-in-12-months |
| 313 | Told my sister I cooked her hamsters | Halo AI @halo.ai0 | 262K (metadata only per brainrot.md) | AI prank | [R] brainrot.md §9 §9c |
| 314 | Lets solve this problem together / Question of the day | Gauth | 142K (per Playkit) | whiteboard + AI robot voice | [W] Playkit Report https://playkit.substack.com/p/ai-homework-tutor-app |
| 315 | Which one builds flappy bird the best? Claude or ChatGPT? | @adamlyttleapps | 99K (per hooks.json; 1,056 saves) | comparison | [R] hooks.json (Feb 2026) |
| 316 | I tried every amount of lip filler on my face so you don't have to | Liply @liply.app | 55K | AI-face slideshow | [R] ugc.md §8 liply-ai |
| 317 | If you're seeing this before May 7th... *(paraphrased)* | Copia (Phoenix & Chloe) | n/a (format's breakthrough video did 10M on Instagram per Superwall; exact hook of that video not given) | time-sensitive hook → affirmations demo | [W] Superwall blog https://superwall.com/blog/copy-this-strategy-itll-blow-up-your-app |
| 318 | Repeat these affirmations for the next 7 days. *(spoken)* | Sarah Pearl (manifesting creator) | n/a | talking head | [W] Superwall blog (same post) |

### Build in public / founder (24)

"I built…", "I made an app that…", devlog stakes. Strongest on X and for tool apps.

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 319 | i built my own unpaid intern *(likely paid/boosted)* | @eddie_the_lou | 140.2M (Virlo lists 27.8M for this hook) | founder VO + desk b-roll | [R+W] screendemo.md §9 #21 https://www.tiktok.com/@eddie_the_lou/video/7675780318602841358 |
| 320 | mini future-me ON MY DESK *(likely paid/boosted)* | @ux_deniza | 84.4M | face + screen | [R+W] screendemo.md §9 #22 https://www.tiktok.com/@ux_deniza/video/7638476458284829960 |
| 321 | Guys, I made my own handwriting font *(spoken)* | Font Art @fontartapp | 64M (per Playkit (AI voice)) | text overlay + tutorial | [W] Playkit Report https://playkit.substack.com/p/custom-fonts-emojis-app |
| 322 | I built an app that rewires my brain every day using a neuroscience based technique. *(spoken; likely paid/boosted)* | @ux_deniza | 33.7M (on-screen 'REWIRES MY BRAIN EVERY DAY') | VO + b-roll (spoken) | [R] ugc.md §8 deniza-journal https://www.tiktok.com/@ux_deniza/video/7640535174647663890 |
| 323 | this year instead of New Year's resolutions I sent my 2026 wishes to space | @sarahli.mp3 (Replit) | 32.2M | VO + phone in hand | [R+W] screendemo.md §9 #23 https://www.tiktok.com/@sarahli.mp3/video/7599704724820036882 |
| 324 | IT WORKS!!!!! A FULL multiplayer… | Pieter Levels @levelsio (X) | 13.5M (X impressions) | raw screen capture | [R] screendemo.md §9 #19 https://x.com/levelsio/status/1894429987006288259 |
| 325 | He BROKE my Game Launch in 1 day... | Megabonk devlog | 5.2M (YouTube Shorts, per hooks.json) | stakes devlog | [R] hooks.json (Sep 2025) |
| 326 | im hiring 50 interns in san francisco for @trycluely. $50/hr. | Roy Lee (X) | 5M (X views, per hooks.json) | X post | [R] hooks.json |
| 327 | I'm selling my body. | Marc Lou (X) | 5M (X views, per hooks.json) | stunt post | [R] hooks.json (Sep 2026) |
| 328 | My game is in TROUBLE! | Megabonk devlog | 4.5M (per hooks.json) | stakes devlog | [R] hooks.json (Aug 2025) |
| 329 | POV: you use Superlocal to see the percent of the world you've explored | Superlocal | 4.1M (per Playkit) | 2x footage + screen recording + AI VO | [W] Playkit Report https://playkit.substack.com/p/superlocal |
| 330 | I just quit my job to build a cooking app that will be better than Uber Eats by end of 2025 | Sizzle founder | 2.7M (reported, per hooks.json) | founder talking head | [R] hooks.json (Apr 2025) |
| 331 | Bye Bye fake MRR screenshots | Marc Lou TrustMRR (X) | 2M (reported 2M+ views, per hooks.json) | launch post | [R] hooks.json (Oct 2025) |
| 332 | App idea: what if there was an app like bereal but for fitchecks? | Fitdrop @fitdropapp | 1.3M (per Playkit) | text overlay | [W] Playkit Report https://playkit.substack.com/p/social-outfit-sharing-app |
| 333 | I made an app to turn web analytics into a Severance episode. | Marc Lou (X) | 1.1M (X impressions) | raw capture | [R] screendemo.md §9 #20 https://x.com/marclou/status/2023739768807584186 |
| 334 | how i built an apple watch app in 2 hours *(likely paid/boosted)* | @chris.raroque | 913K | VO over screen | [R] ugc.md §8 chris-story |
| 335 | pov: you've been making an apt cure brainr0t everyday for the last 332 days | Curiosity Quench | 520K (per Playkit (sic)) | auto slideshow + caption | [W] Playkit Report https://playkit.substack.com/p/curiosity-quench |
| 336 | Vibe Coding things in the real world / Part 1 - NFC Stickers | @byjackprice | 418K | build-IRL series | [R] ugc.md §8 jack-nfc https://www.tiktok.com/@byjackprice/video/7651100452481682696 |
| 337 | I'm 18. I built an app that's making more than $30 million a year. *(spoken)* | Cal AI founder @zachyadegari | 283K | one-take selfie (spoken) | [R] ugc.md §8 zach-whynot https://www.tiktok.com/@zachyadegari/video/7553080628154060046 |
| 338 | MISTAKE NO. 3/10: I chose the wrong database for my app | @chris.raroque | 180K (per hooks.json) | devlog | [R] hooks.json (Aug 2026) |
| 339 | day 18/30 making a mobile app from 0 — 707 downloads - $74 revenue *(paraphrased)* | Jack Friks (X) | 154K (per hooks.json; source quotes it with an ellipsis) | build-in-public series | [R] hooks.json (Mar 2025) |
| 340 | i made an app to send love notes to your partner and its getting used as a grocery list reminder | Jack Friks (X) | n/a (314K likes on X, per hooks.json) | X post | [R] hooks.json (Oct 2025) |
| 341 | Story time… I remember trying to build an Apple Watch app 3 years ago and giving up | @chris.raroque | n/a | founder story | [R] hooks.json |
| 342 | the difference between an app that gets a thousand views and a million is sometimes just one design change 👀 | @chris.raroque | n/a | founder tip | [R] hooks.json |

### How-to / tutorial (15)

"How to do the [trend]", "how I use [app] to…". Result first works best.

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 343 | how to do the high angle shots *(likely paid/boosted)* | Remini @remini | 138.8M | result-first raw recording | [R] screendemo.md §9 #1 https://www.tiktok.com/@remini/video/7567443872322800927 |
| 344 | how to make photobooth images with remini *(likely paid/boosted)* | Remini @remini | 55M | phone-in-hand step demo | [R] screendemo.md §9 #2 https://www.tiktok.com/@remini/video/7551861967200210207 |
| 345 | Let's meal prep breakfast, lunch and dinner for the next 3 days. *(spoken; likely paid/boosted)* | MyFitnessPal @myfitnesspal | 41.5M | creator ad (spoken) | [R] ugc.md §8 mfp-41m https://www.tiktok.com/@myfitnesspal/video/7561452572280704286 |
| 346 | how to do the elevator photo trend *(likely paid/boosted)* | Remini @remini | 36.8M | phone-in-hand step demo | [R] screendemo.md §9 #3 https://www.tiktok.com/@remini/video/7558478313157676319 |
| 347 | how to do the ai winter collage trend *(likely paid/boosted)* | Remini @remini | 14.2M | step demo | [R] screendemo.md §9 #5 https://www.tiktok.com/@remini/video/7571142724036873503 |
| 348 | I'm gonna show you how to turn a picture into a video that can help you go viral. *(spoken)* | @momisavibe | 13.9M (per Virlo (vendor)) | talking head (spoken) | [W] Virlo https://virlo.ai/data/viral-hooks/apps |
| 349 | You can now make an AI video right here in TikTok. *(spoken)* | @mommacolleen.7 | 8.9M (per Virlo (vendor)) | talking head (spoken) | [W] Virlo https://virlo.ai/data/viral-hooks/apps |
| 350 | Summer photo hackkk *(likely paid/boosted)* | EPIK creator @lexi.degraw | 4.5M | facecam + app | [R] ugc.md §8 tt-lexi https://www.tiktok.com/@lexi.degraw/video/7655486056904609031 |
| 351 | New wedding idea! | Lense @lense.app | 3.4M (→ 'Place QR codes for your guests to scan') | couple photo → QR demo | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@lense.app/video/7248148151377431834 |
| 352 | How to use the fitted closet | Fitted | 2M (per Playkit) | talking hook + green screen | [W] Playkit Report https://playkit.substack.com/p/fitted-laundry |
| 353 | FASTEST Calorie Tracking EVER: | Cal AI @calai.app (@getcalai watermark) | 552K (with 'Cal AI' box on frame 1) | counter top demo, numbered steps | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@calai.app/video/7366326897233382698 |
| 354 | The FASTEST Calorie Tracker | Cal AI @calai.app | 260K | one take, numbered white-box steps | [R] screendemo.md §9 #15 https://www.tiktok.com/@calai.app/video/7475920092623047979 |
| 355 | Hey guys, I just wanted to quickly share a few tips on how to use Cal AI's scan feature with more accuracy. *(spoken)* | Cal AI @calai.app | 241K | selfie + b-roll (spoken) | [R] ugc.md §8 calai-ingred https://www.tiktok.com/@calai.app/video/7482853151062854958 |
| 356 | How to start wearing all your clothes | Fitted | 235K (per Playkit) | talking hook + app demo | [W] Playkit Report (same post) |
| 357 | how I use knowunity to study for my exams📚 | Knowunity @knowunity | 127K (VO: 'okay so I have a big biology test coming up this week and here's how I've been using Knowunity to prepare for it') | face bookends + laptop | [R] screendemo.md §9 #30 https://www.tiktok.com/@knowunity/video/7641665772187618592 |

### Routine / day-in-the-life integration (9)

The hook sells the vlog; the app is a prop inside it.

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 358 | Sunday Reset | @therealvbrown | 17.1M | cleaning-reset montage | [R] family.md §2 vbrown-sundayreset |
| 359 | Afterschool routine with sister | Me+ (Lifestyle Routine) | 12.3M (per Playkit) | vlog snapshots + demo | [W] Playkit Report https://playkit.substack.com/p/habit-tracker-app-ac63 |
| 360 | Hi. Good morning. *(spoken)* | Cal AI partner @taaaaylerr | 6.2M (hooks.json quotes a line from the same video: 'Gonna have seriously the smallest breakfast') | day-in-life vlog (spoken) | [R] ugc.md §8 tay-mom https://www.tiktok.com/@taaaaylerr/video/7633980082628988173 |
| 361 | Cleaning my room | Me+ (Lifestyle Routine) | 4.5M (per Playkit) | text + vlog | [W] Playkit Report (same post) |
| 362 | Everyday God wakes me up | PrayScreen @prayscreenio | 4.1M (per Playkit) | text overlay | [W] Playkit Report https://playkit.substack.com/p/prayscreen-app |
| 363 | SPEND THE DAY WITH ME 🤭 | @destineeroseofficial | 1.6M (app never said) | day-in-life vlog | [R] ugc.md §8 tt-destinee https://www.tiktok.com/@destineeroseofficial/video/7650359249490562318 |
| 364 | here's realistic what I eat in a day!! | Cal AI creator @sashalusslover | 1.2M (per hooks.json) | WIEIAD | [R] hooks.json (Nov 2025) |
| 365 | grwm | @dafnnejm | 852K (VO: 'join me to get ready because I have a very long day') | GRWM (ES) | [R] ugc.md §8 dafnne-grwm |
| 366 | Picked up bestie with bodyguards on her bday | Protectors | 800K (per Playkit) | text + vlog | [W] Playkit Report https://playkit.substack.com/p/bodyguard-uber-app |

### Mascot / meme / absurd (16)

Entertainment first (Duolingo, Co-Star, Memenome). Brand reach, weak direct intent.

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 367 | whatchu know about the wuxi finger hold | Duolingo @duolingo | 102.1M (caption '6 7') | mascot skit | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@duolingo/video/7553379326708731150 |
| 368 | can you speak @MrBeast rizz *(post caption, not on-screen)* | Duolingo @duolingo | 29.3M (caption; on-screen text not checked) | mascot meme | [R+W] hooks.json ; listing https://www.tiktok.com/@duolingo/video/7665422713770511646 |
| 369 | lady dimitrescu & mr. x 67.41% accuracy | Duolingo @duolingo | 25.8M | mascot costume skit | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@duolingo/video/7571189734593121591 |
| 370 | are my abs distracting you from your lesson today 😏 *(post caption, not on-screen)* | Duolingo @duolingo | 18M (caption; on-screen text not checked) | mascot meme | [R+W] hooks.json ; listing https://www.tiktok.com/@duolingo/video/7673613020710456590 |
| 371 | No way he actually kicked that... | Duolingo @duolingo | 14.9M | mascot skit | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@duolingo/video/7572721535761370382 |
| 372 | got accidentally sendy while playing chess | Duolingo @duolingo | 14.7M | mascot skit | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@duolingo/video/7553732360928316686 |
| 373 | i don't need to Be Real... ..I need to Be Skiing with my ski buddy | BeReal @bereal | 10.6M | in-app capture (ski) | [W] TikTok post; on-screen text read from frames 2026-10-16; views via yt-dlp 2026-10-16 https://www.tiktok.com/@bereal/video/7303683682248690977 |
| 374 | when all you can say in French is 'bonjour' | Duolingo @duolingo | 4.7M (more than 4.7M, per NBC News (2021)) | mascot meme | [W] NBC News https://www.nbcnews.com/pop-culture/pop-culture-news/duo-big-green-owl-became-tiktok-star-rcna4445 |
| 375 | the friend who sent you this thinks you're slacking rn | Duolingo @duolingo | 3.2M (per hooks.json; 539.5K reposts) | mascot meme | [R] hooks.json (Jan 2026) |
| 376 | clean my litter box or do your lesson | Duolingo @duolingo | 2.1M (per hooks.json) | mascot meme | [R] hooks.json (Oct 2026) |
| 377 | propaganda I AM falling for *(likely paid/boosted)* | Opal @opal | 954K | 32-photo video moodboard | [R] slideshow.md §11 opal-propaganda https://www.tiktok.com/@opal/video/7564773002391342358 |
| 378 | my brain in math: | Co-Star @costarastrology | 900K | 3-panel meme | [R] slideshow.md §11 costar-900k https://www.tiktok.com/@costarastrology/video/7290602876282506542 |
| 379 | According to all known laws of mewing, there is no way a bee should be able to rizz. *(spoken)* | Memenome @memenomeai | 841K | laptop demo, app output | [R] brainrot.md §9 memenome-841K https://www.tiktok.com/@memenomeai/video/7362454974493625643 |
| 380 | casually talking to my bestie | Duet | 800K (per Playkit) | text + animated story | [W] Playkit Report https://playkit.substack.com/p/duet-dating-app |
| 381 | You ever just break up with a country mid-letter? *(spoken)* | Memenome @memenomeai | 557K | laptop demo, app output | [R] brainrot.md §9 memenome-557K https://www.tiktok.com/@memenomeai/video/7435590880452529450 |
| 382 | when you're just tryna do your work without being terrorized by an owl | Duolingo @duolingo (first viral video) | n/a | mascot meme | [W] AdRoll https://www.adroll.com/blog/unrolling-duolingo-how-unhinged-tiktoks-made-the-brand-a-winner |

### Flops and weak hooks (kept for contrast) (17)

Same niches, low views. Used in the anti-pattern list.

| # | Hook (verbatim) | App / account | Views | Format | Source |
|---|---|---|---|---|---|
| 383 | One tap. A world of possibilities. *(likely paid/boosted)* | Brick @getbrick | 883K (0.08% likes: paid reach, counter-example) | polished ad | [R] ugc.md §8 brick-goals https://www.tiktok.com/@getbrick/video/7581939895850110239 |
| 384 | we brought a mime into work | Cleo @meetcleo | 155K (landscape prank; weak) | prank | [R] ugc.md §8 cleo-office |
| 385 | I'm a valedictorian, but I genuinely hate studying. *(spoken)* | Knowunity @knowunity | 50K (story without product) | talking head (spoken) | [R] ugc.md §8 knowu-valed |
| 386 | Hack your style transformation in 2025. *(spoken)* | @faceaiamerica (realistic AI presenter) | 14K | AI avatar (spoken) | [R] ugc.md §8 faceai-avatar |
| 387 | telling my parents im dropping out of harvard (pt. 2) | @eddie_the_lou | 9K | founder storytime | [R] ugc.md §8 eddie-harvard |
| 388 | At this point, my phone knows more about my family schedule than I do. *(spoken)* | Orbits @dayinthelifewithlinds | 6K (product-first) | green screen over app (spoken) | [R] family.md §2 orbits-linds-forgetting |
| 389 | The difference between $500 and $5,000 taste | Oliver Henry's first Canva slideshow | 6K (per hooks.json) | slideshow | [R] hooks.json (Startup Ideas Pod) |
| 390 | Him: I'm not a mind reader… Me: …or check Orbits which reminds you what needs to be done | Orbits @dayinthelifewith.ari | 6K (app named in overlay) | text over selfie | [R] family.md §2 orbits-ari-nothard |
| 391 | A man who cooks, cleans & does laundry isn't 'special.' He's a functional adult. 😭 The bar is LOW. Just check off your chores on Orbits… | Orbits @dayinthelifewith.ari | 6K | text over selfie | [R] family.md §2 orbits-ari-justsaying |
| 392 | Tired of mindless scrolling? I build an app called Free Time… | Free Time founder | 5K (no stakes, no payoff) | founder video | [R] hooks.json (Feb 2026) |
| 393 | Idk who needs to hear this but just because you go to work… instead share your home tasks with Orbits so everyone knows what they need to do | Orbits @dayinthelifewith.ari | 5K | text over selfie | [R] family.md §2 orbits-ari-workloads |
| 394 | It won't happen overnight… but if you quit, it won't happen at all. | AI influencer @heyitsnova.ai | 1K (account median 258) | AI influencer | [R] ugc.md §8 nova-aiinfl |
| 395 | why does my flat look like a student loan | Snugly @snugly.app | 1K (joke with no person or conflict) | AI-reveal slideshow | [R] hooks.json |
| 396 | One thing that has actually made living with my boyfriend so much easier is having assigned chores… *(spoken)* | Orbits @dayinthelifewith.ari | 1K (testimonial) | talking testimonial (spoken) | [R] family.md §2 orbits-ari-lifechanging |
| 397 | There's something I wish people understood, and it's not that the kids are the stressor… *(spoken)* | Orbits @dayinthelifewithpamela | 1K (good script, no visual hook) | talking head (spoken) | [R] family.md §2 orbits-pamela-game |
| 398 | See your room in 12+ styles before you commit | Snugly (Larry agent) | 879 (per an X article surfaced by web search (unverified)) | AI-reveal slideshow | [W] web search result citing X article https://x.com/wickedguro/article/2046261869963587636 (paywalled; unverified) |
| 399 | WHY CANT PEOPLE JUST DO THIER CHORES!!!! | Orbits @everydaywithmiaaa | 522 (anger without specificity) | rant | [R] family.md §2 orbits-mia-infuriating |

---

## 2. What makes the top ones work

### 2.1 The set measured

I ranked every hook with a view count and kept the top 30 after these exclusions:

- Aggregate counts.
- Flops.
- X/Twitter posts.
- Family-niche posts with no app behind them (the mental-load references).
- Posts the sources flag as likely paid or boosted.

Two caveats apply:

- **Duolingo takes 7 of the 30 slots.** Where that skews a count, I also give it without Duolingo (n = 23).
- **11 of the 30 view counts are secondary** (Playkit's per-video figures and one Virlo figure).
  - Playkit's hook transcriptions appear to normalise capitalisation: 10 of those 11 are in sentence case.
  - So the casing counts below are also given for the 19 hooks whose text I or the sibling files read from the video itself.

| # | Hook | App | Views | Words | Specific detail | Emotion | Gap it opens | App named? | Emoji | Source of text |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | whatchu know about the wuxi finger hold | Duolingo | 102.1M | 7 | named reference (wuxi finger hold) | humour | visual payoff | no | no | frame-read |
| 2 | I replaced social media with.. | Bible Chat | 94.0M ‡ | 5 | none | relief / aspiration | object withheld (with what?) | no | no | secondary (Playkit) |
| 3 | Me staring at the 'I thought I'll never meet anyone like you'.. | Duet | 65.0M ‡ | 12 | a quoted line | longing | what happens next | no | no | secondary (Playkit) |
| 4 | Guys, I made my own handwriting font *(spoken)* | Font Art | 64.0M ‡ | 7 | none | delight | how? show me | no | no | secondary (Playkit) |
| 5 | oh he don't wanna read all that?????? #womeninmalefields | Coconote creator | 41.9M | 8 | none | humour (petty revenge) | what happens next | no | no | research file / listing |
| 6 | Ariana? … finished the exam in nine minutes? *(spoken)* | AnswersAI | 35.8M | 7 | name + number (Ariana, nine minutes) | suspense | what happens next | no | no | frame-read |
| 7 | they almost got caught during the exam 😭 | AnswersAI | 32.9M | 7 | none | suspense | what happens next | no | yes | frame-read |
| 8 | this year instead of New Year's resolutions I sent my 2026 wishes to space | @sarahli.mp3 | 32.2M | 14 | number (2026) | wonder | how? | no | no | research file / listing |
| 9 | been shopping at Aldi literally for 7 years and I'm JUST NOWWW FINDING THIS???? | Potto UGC | 29.3M | 14 | place + number (Aldi, 7 years) | frustration / regret | object withheld (this?) | no | no | research file / listing |
| 10 | can you speak @MrBeast rizz *(caption)* | Duolingo | 29.3M | 5 | name (MrBeast) | humour | visual payoff | no | no | research file / listing |
| 11 | lady dimitrescu & mr. x 67.41% accuracy | Duolingo | 25.8M | 6 | names + number (67.41%) | humour | visual payoff | no | no | frame-read |
| 12 | Us leaving school early knowing Answer.ai gave us all the right answers to pass all our assignments | Answer.AI | 25.0M ‡ | 17 | none | smugness | how? | yes (Answer.ai) | no | secondary (Playkit) |
| 13 | How strong are your lungs? 🫁💪 | Breathquest | 20.6M ‡ | 5 | none | competition | self-test | no | yes | secondary (Playkit) |
| 14 | Doing my silly goofy laundry because a bird on my phone told me to 🧚 | Finch | 20.3M | 14 | none | humour (self-mockery) | object withheld (what bird?) | no | yes | frame-read |
| 15 | Me practicing for my on-time BeReal today | BeReal | 20.0M | 7 | none | humour | visual payoff | yes (BeReal) | no | frame-read |
| 16 | Hands-on CHORE TIME with a MOM of 8 | Skylight partner | 19.6M | 8 | number (8) | awe | how? | no | no | research file / listing |
| 17 | are my abs distracting you from your lesson today 😏 *(caption)* | Duolingo | 18.0M | 9 | none | humour (flirt) | visual payoff | no | yes | research file / listing |
| 18 | "your music taste is so bad🤮😵😵" my airpods: | Duolingo | 17.2M | 8 | none | humour (defiance) | visual payoff | no | yes | frame-read |
| 19 | ⚠️It will be time to BeReal at 3:42pm on Monday⚠️ | BeReal | 17.0M | 10 | time (3:42pm on Monday) | urgency / FOMO | what happens next | yes (BeReal) | yes | frame-read |
| 20 | I'm me again…it feels like its been years… | noplace | 16.4M ‡ | 8 | none | relief | what changed? | no | no | secondary (Playkit) |
| 21 | Ariana, what are you doing? *(spoken)* | AnswersAI | 16.3M | 5 | name (Ariana) | suspense | what happens next | no | no | frame-read |
| 22 | Pranking my dad / I cooked his koi fish 😭💀 / (he asian asf) | Halo AI (@jason.pranks) | 15.9M | 11 | detail (koi fish, dad) | shock | reaction | no | yes | research file / listing |
| 23 | No way he actually kicked that... | Duolingo | 14.9M | 6 | none | surprise / humour | visual payoff | no | no | frame-read |
| 24 | got accidentally sendy while playing chess | Duolingo | 14.7M | 6 | none | humour | visual payoff | no | no | frame-read |
| 25 | Bro: 'that breakup didn't hurt me' | Rise | 14.6M ‡ | 6 | none | humour (denial) | twist / reveal | no | no | secondary (Playkit) |
| 26 | Evening Routine with a MOM of 8 | Skylight partner | 14.1M | 7 | number (8) | awe | how? | no | no | research file / listing |
| 27 | 3am school morning routine | Me+ | 14.1M ‡ | 4 | time (3am) | awe | how? why? | no | no | secondary (Playkit) |
| 28 | I faked an interview to eliminate my target after his game | Splashin | 13.9M ‡ | 11 | none | mischief | what happens next | no | no | secondary (Playkit) |
| 29 | I'm gonna show you how to turn a picture into a video that can help you go viral. *(spoken)* | @momisavibe | 13.9M ‡ | 18 | none | aspiration | how? | no | no | research file / listing |
| 30 | So you want to travel this summer but have no one to go with? | TripBFF | 13.7M ‡ | 14 | none | loneliness / frustration | how? (solution) | no | no | secondary (Playkit) |

‡ = view count from a secondary source (Playkit or Virlo). "frame-read" = on-screen text read from the post's frames this session.

### 2.2 Measurements (top 30, non-boosted)

| Measure | Result |
|---|---|
| **Length** | Median 7.5 words, mean 8.9, range 4–18. Without Duolingo the median is 8. 27/30 are 5–14 words. The only ones over 14 are the 17-word "Us leaving school early knowing Answer.ai…" and the 18-word spoken "I'm gonna show you how to…". |
| **First two words** | All 30 pairs are different. No formula opener dominates. |
| **Openers that recur** | "I" / "I'm": 4 ("I replaced", "I'm me again", "I faked", "I'm gonna show you"). "Me …": 2 ("Me staring", "Me practicing"). "Ariana": 2 (the same AnswersAI skit series). "How": 1. "So you": 1. **"POV:" 0, "my mom" 0, "nobody" 0, "this app" 0, "if you" 0, "stop" 0, "why" 0.** |
| **Specific detail** (a real number, time or proper name) | 10/30: Ariana + nine minutes, 2026, Aldi + 7 years, MrBeast, 67.41%, mom of 8 (×2), 3:42pm on Monday, Ariana, 3am. 13/30 if you also count a quoted line, a named reference ("wuxi finger hold") and a concrete object ("koi fish"). 8/30 contain a number, 7 of them written in digits. |
| **Emotion** | Humour 11, of which 7 are Duolingo. Awe / wonder / delight 5. Suspense / shock 4. Relief / aspiration 3. Frustration / regret / loneliness 2. Smugness / mischief 2. Competition / FOMO 2. Longing 1. **Without Duolingo (n = 23):** awe/wonder/delight 5, humour 4, suspense/shock 4, relief/aspiration 3, then 2 / 2 / 2 / 1. No single emotion dominates once mascot content is removed. |
| **Gap it opens** | Visual payoff ("see it"): 8. What happens next / their reaction: 8. How? (method or result): 8. Object withheld ("with what?", "finding THIS"): 3. What changed / twist: 2. Self-test: 1. |
| **App named in the hook** | 3/30: "Answer.ai", "BeReal" ×2. Both BeReal hooks use the brand as the activity ("my on-time BeReal", "time to BeReal"). |
| **Emoji** | 7/30. Always at the end or wrapping the line (😭, 💪🫁, 🧚, 😏, ⚠️ … ⚠️). Never as the first character, except the ⚠️ alert frame. |
| **Casing (all 30)** | Sentence / title case 17, all lowercase 8, CAPS-emphasis words 3, lowercase start with some caps 2, full ALL CAPS 0. |
| **Casing (19 read from the video)** | Lowercase or lowercase-led 9, sentence case 7, CAPS emphasis 3. Lowercase is the native default. CAPS appear only on the payload words ("JUST NOWWW FINDING THIS", "CHORE TIME", "MOM of 8"). |
| **Punctuation** | No closing punctuation 19 (one of them, #5, ends on a hashtag). "?" 4. "????" 1 (#9). ".." / "…" 4. Colon 1 ("my airpods:"). Period 1, and that one is spoken. Stacked question marks appear only on disbelief: "????" (#9) and "??????" in the middle of #5. |
| **Spoken vs on-screen** | 4/30 are spoken first lines. The two AnswersAI skits burn the dialogue in as captions. Playkit lists Font Art's format as "Text Overlay". @momisavibe's on-screen text is unknown. |
| **Pattern mix** | Meme 6 (all Duolingo). POV 4. Dialogue 4. Before/after, build, challenge, identity, specificity and confession 2 each. Proof, discovery, how-to and pain 1 each. |

### 2.3 Same measures with boosted posts left in

When the paid and boosted posts stay in, 11 of the top 30 carry the boosted flag. Three things change:

- **"how to" becomes the most common opener (3 posts).** All three are Remini's paid trend tutorials, which have a like rate under 0.25%.
- **All-lowercase casing rises from 8 to 12.**
- **"I built" appears twice.** Both are sponsored builder content.

The median length stays at 7.5 words. Boosted reach rewards bland, literal hooks ("how to do the elevator photo trend") because the reach is bought. **Don't copy hooks from boosted posts.**

### 2.4 Across the whole bank (not just the top 30)

- **Openers across the 382 working hooks:**
  - "I" / "I'm": 34
  - "POV": 21
  - "we" / "our" / "us": 11
  - "when": 9
  - "what": 9
  - "how to": 8
  - "me …": 7
  - "my mom / mum / nan / sister / landlord": 7
  - "if you": 6
  - "bro": 5
  - "nobody" / "no one": 4
  - "why": 2
  - "stop" / "don't": 2
  - "this app": 0

  217 (57%) start with none of these. Formula openers are a minority.
- **Among the 223 hooks with 1M+ views on a single post:**
  - "I": 21
  - "POV": 11
  - "when": 8
  - "me …": 7
  - **"POV" is common in the bank but absent from the non-boosted top 30.** It works, but it isn't what produced the biggest outliers.
- **Emoji:** 35 of 223 high-view hooks (16%).
- **Naming the app:** 17 of 223 high-view hooks (7.6%), against 4 of 17 flops (24%).
  - **Orbits ran a controlled pair:** the same "No one talks about the exhaustion…" text got 426K without the app and 5.4K with "i just use Orbits now…" added.
- **The most cloned hooks:**
  - **"[N years at store] and I'm JUST NOW finding this????"** (Potto). It ran on the original creator at 29.3M, on a second creator at 10.5M, and on the brand repost at 2.9M. A Walmart variant got 692K. StudyFetch and Stronger used the same frame at 9.6M, 6.5M and 851K.
  - **"We got SO MANY compliments for what we did at our wedding"** (Lense). It got 2.9M in Dec 2023, then reruns did 655K (May 2025), 1.2M (Dec 2025) and 239K (Aug 2026).
  - **Decay is real.** Snugly's landlord hook fell from 132K to 4K (`formats.md`, `strategy.md` §3.3).

---

## 3. Rules distilled

1. **Lead with a person in a moment, not the product.** Only 3 of the top 30 name the app, and only 7.6% of 1M+ hooks do. Snugly's feature-first hooks got about 1K views against 100–480K for person-plus-conflict hooks (`formats.md`).
2. **Exception: name the brand when it is the verb or the ritual.** Examples are "time to BeReal", "my on-time BeReal" and "locket like it's my job". 7 of the 17 high-view hooks that name their own app are BeReal or Locket.
3. **Aim for 5–14 words.** 27 of the top 30 fit. A slide or opening frame should read in under two seconds.
4. **Open exactly one gap that the next 2–5 seconds of footage can pay off.** Use "see it", "what happens next" or "how?". These three account for 24 of the top 30.
5. **Put in one concrete detail:** a store, a number of years, a time, a name, or a quoted line. Examples are "Aldi literally 7 years", "3:42pm on Monday", "Ariana?" and "mom of 8". About a third of the top 30 do this, and the most-cloned hooks in the bank all do.
6. **Let someone else speak.** Quotes and dialogue are the second most common high-view pattern (20 non-boosted 1M+ hooks). Examples are "“I wish I had your genetics”", "\"what made your wedding so unique?\"", the professor's "Ariana?", and text-story openers like "Babe, whose car is in the driveway?".
7. **Disbelief at discovery is the most reliably clonable converter.** Use "[time spent the hard way] and I'm JUST NOW finding this????" or "my [person] just showed me this and [pain] is gone 🤯". Keep CAPS and "????" on the disbelief only.
8. **Type it like a person.** Leave off the closing period (19 of 30 have none). Lowercase is the default (9 of the 19 verified-casing hooks). Use CAPS only on the payload word. Use at most one emoji tone marker at the end (😭 💀 🤯).
9. **Call out the viewer by a specific trait, not a demographic.** Examples are "MOM of 8", "a pilates girl", "people born on 2/12/13…", "Stop using LinkedIn to apply to jobs". The call-out word picks the audience: Massive's "LinkedIn" version converted and the "Indeed" version did not (Superwall).
10. **Humour reaches furthest, but it needs a recurring character to pay off.** Duolingo holds 7 of the top 30, all humour. Outside mascot accounts, no single emotion dominates, and suspense, awe and relief do as well as jokes.
11. **For family and household apps, the hook is the invisible work, not the calendar.** Examples are "What would the holidays look like if women didn't do any of the work?" (6.9M) and "No one talks about how exhausting it is…" (1.4M on a 537-median account). Keep the app out of the hook and put it in the caption or a reply.
12. **Clone proven hooks onto new creators and new nouns, then retire them when they decay.** Lense reran one hook four times. Potto's Aldi line became Trader Joe's and Walmart. Snugly's landlord hook decayed from 132K to 4K.
13. **Pair every viral top-of-funnel hook with a comment-reply follow-up.** Umax's "Y'all kept asking…" did 655K. StudyFetch's comment-sticker "How to study 1 DAY before your EXAM" did 4.4M. Playkit's Feb 2026 recap calls this the "comment-to-conversion system": the video earns comments and the replies plug the app.
14. **Don't copy hooks from boosted posts.** Their reach was bought, and bought reach favours literal "how to" lines that don't travel organically (§2.3).
15. **A shock hook still needs a demo.** Copia's stunt got 5M views and a couple of thousand downloads. Its hook-plus-demo videos hit about 10% view-to-download (Superwall).

---

## 4. Twenty anti-patterns (marketing-copy hooks that flop)

| # | Anti-pattern | Example (real) | Result | Why it fails |
|---|---|---|---|---|
| 1 | Logo or brand first | Cozi YouTube ad: logo at 0 s, then "One shared family calendar" | 211K views, 3 likes (`family.md`) | Announces an ad before any reason to care |
| 2 | Tagline copy | "One tap. A world of possibilities." (Brick) | 883K at 0.08% likes, paid (`ugc.md`) | Abstract benefit, no person, no gap. Reach was bought |
| 3 | Feature-first | "See your room in 12+ styles before you commit" (Snugly) | 879 views (unverified X report); sibling feature hooks about 1.2K (`hooks.json`) | Describes the product instead of a moment |
| 4 | "Tired of X? I built Y" | "Tired of mindless scrolling? I build an app called Free Time…" | 5.2K (`hooks.json`) | Pain and pitch in one breath. No stakes, no payoff |
| 5 | App name tacked onto a relatable line | Same "No one talks about…" text plus "i just use Orbits now…" | 5.4K vs 426K without the app (`family.md`) | The product mention turns a relatable post into an ad |
| 6 | App named in the overlay of a rant | "Him: I'm not a mind reader… Me: …or check Orbits…" | 5.9K | Same reason |
| 7 | Testimonial opener | "One thing that has actually made living with my boyfriend so much easier is having assigned chores…" | 1.0K | Reads as a review. The conclusion arrives before the curiosity |
| 8 | Anger without specifics | "WHY CANT PEOPLE JUST DO THIER CHORES!!!!" | 522 | Emotion with no scene, name or detail to recognise |
| 9 | Joke with no person or conflict | "why does my flat look like a student loan" (Snugly) | about 1.2K | A pun with no one to root for |
| 10 | Realistic AI presenter | "Hack your style transformation in 2025." (faceaiamerica) | 14K (`ugc.md`) | People spot synthetic humans, and the line is an ad slogan |
| 11 | Generic motivational quote | "It won't happen overnight… but if you quit, it won't happen at all." (AI influencer) | 1.2K | No gap, and seen a thousand times |
| 12 | Brag with no product or payoff | "I'm a valedictorian, but I genuinely hate studying." (Knowunity) | 50K vs 127K for the same account's how-to | Identity with nothing to see next |
| 13 | Leading with "AI-powered" | (Playkit, State of Tech UGC 2025) | "Viewers are fatigued by the word 'AI'" | The technology isn't the outcome |
| 14 | Wrong-audience call-out | "Stop using Indeed to apply to jobs" (vs "…LinkedIn…") | Views but "terrible conversions" (Superwall) | The call-out word selects people who won't pay |
| 15 | Explaining the backstory instead of the viewer's payoff | Payout explaining the lawsuit | Views, no signups (`formats.md`) | The viewer's question is "what do I get?" |
| 16 | Shock stunt with no demo | Copia's fake "Astronomer CEO's daughter" video | 5M views, a couple of thousand downloads (Superwall) | Attention goes to the drama, not the app |
| 17 | Stale "shocked face + demo" | Playkit: "the traditional shocked face + demo of the app is OUT" (Jun 2026). "The classic 'hook + demo' UGC format is losing its effectiveness" (Nov 2025) | Practitioner report | Viewers now recognise the template as an ad. It still worked for StudyFetch in spring 2025 |
| 18 | Get-rich hook for a finance app | "How do I make a million dollars in 5 minutes" | Flagged as an anti-pattern by reposter Yannis (`hooks.json`, Superwall) | Attracts the wrong crowd and erodes trust |
| 19 | Saturated list templates | "N uncomfortable questions for your boyfriend". "Apps that feel illegal to know" | "Viewers are now blind to this format" (`hooks.json`). Copycat "Day N vibe coding…" posts get about 100–3,300 views | Formats decay in 3–6 months |
| 20 | Product-description hook carried only by paid reach | "A visual chore chart that helps kids follow routines". The Skylight confession cards ("Parenting is hard. Skylight Calendar can help.") | 2.6M at 0.31% likes. 5.0M at 0.06% likes (`family.md`) | The views are bought. The organic version of this line goes nowhere |

Hook-adjacent: the CTA on the last frame matters as much as the hook. "She's redecorating now. Snugly." got about 0 downloads. "The Snugly app helped me finally convince her to get the kitchen done" converted (`strategy.md` §5).

---

## 5. Sources

**Existing Shipreel research (cited inline as [R]).** All are under `/Users/reidcoleman/Glide/Shipreel/`:
- `research/viral/slideshow.md` §6, §11
- `research/viral/screendemo.md` §7, §9
- `research/viral/ugc.md` §4, §8
- `research/viral/brainrot.md` §8, §9
- `research/viral/family.md` §2
- `research/viral/strategy.md`
- `research/formats.md`
- `src/framework/data/hooks.json` (only entries whose `source` names a real post or account)

**TikTok, primary (this session).**
- **yt-dlp 2026.08.19 listings**, pulled 2026-10-16. Accounts:
  - @duolingo, @finchcare, @locketcamera, @lense.app, @howbout_app
  - @calai.app, @studyfetch, @answersai.com, @bereal, @hevyapp
  - @potto.app, @strongerapp, @opal, @quittr.app, @hallowapp
  - @umax.app, @rizz.app, @risescience
- **On-screen text** was read from frames at 0.5 / 2 / 4 s, or from slide 1 of photo posts. Post URLs are in the bank.
- **Empty or unrelated handles:** @speakapp (3 posts), @cozi (unrelated), @biblechatapp, @bible.chat (tiny), @quittr (unrelated). Bible Chat, Speak and Cozi hooks therefore come only from secondary sources, or are absent.

**Playkit Report (Julia Pintar / Playkit; per-video views and hook transcriptions, secondary):**
- https://playkit.substack.com/p/bible-chat-app
- https://playkit.substack.com/p/answer-ai-app
- https://playkit.substack.com/p/aiapply-app
- https://playkit.substack.com/p/anti-lost-app
- https://playkit.substack.com/p/bodyguard-uber-app
- https://playkit.substack.com/p/custom-fonts-emojis-app
- https://playkit.substack.com/p/duet-dating-app
- https://playkit.substack.com/p/fitted-laundry
- https://playkit.substack.com/p/glowcam-selfie-lighting-app
- https://playkit.substack.com/p/habit-tracker-app-ac63
- https://playkit.substack.com/p/prayscreen-app
- https://playkit.substack.com/p/rise-app
- https://playkit.substack.com/p/social-media-stalking-app
- https://playkit.substack.com/p/social-outfit-sharing-app
- https://playkit.substack.com/p/study-focus-app
- https://playkit.substack.com/p/styledna
- https://playkit.substack.com/p/ai-homework-tutor-app
- https://playkit.substack.com/p/114-videos-116m-likes-250k-mrr
- https://playkit.substack.com/p/ai-baby-generator-making-100k-mrr-created-new-trend-tiktok
- https://playkit.substack.com/p/autopilot
- https://playkit.substack.com/p/breathquest
- https://playkit.substack.com/p/coconote
- https://playkit.substack.com/p/curiosity-quench
- https://playkit.substack.com/p/french-dating-app-just-passed-tinder-app-store
- https://playkit.substack.com/p/matchbox
- https://playkit.substack.com/p/queue
- https://playkit.substack.com/p/sound-map
- https://playkit.substack.com/p/styl-app
- https://playkit.substack.com/p/thenoplace
- https://playkit.substack.com/p/this-content-helped-a-lifestyle-app-reach-500k-mrr-in-12-months
- https://playkit.substack.com/p/tripbff
- https://playkit.substack.com/p/superlocal

**Playkit monthly recaps (format and strategy context):**
- https://playkit.substack.com/p/playkits-february-recap-148-cpi-376m
- https://playkit.substack.com/p/playkits-june-recap-the-4m-viewsweek
- https://playkit.substack.com/p/playkits-november-recap-50m-views
- https://playkit.substack.com/p/state-of-tech-ugc-2025-report

**Superwall blog (founder interviews recapped by Superwall):**
- https://superwall.com/blog/copy-this-strategy-itll-blow-up-your-app (Copia)
- https://superwall.com/blog/he-made-usd2-2m-from-building-simple-apps-heres-how-no-code (Kunch, Shepherd)
- https://superwall.com/blog/our-app-makes-usd30k-month-profit-using-this-simple-strategy-copy-us (Pushscroll). Its caption "My bro is doing push-ups at 2:00 a.m. to scroll reals" and a "close to 16 million" best video are reported, but the caption isn't tied to that video, so it isn't in the bank.
- https://superwall.com/blog/this-app-makes-usd2m-year-using-this-ridiculously-easy-strategy (Massive)
- https://superwall.com/blog/how-to-market-your-app-for-free-5-strategies-for-generating-growth
- https://superwall.com/blog/how-stronger-built-a-usd600k-app-using-viral-on-demand-tiktok-strategy

**Other secondary sources:**
- Tiny Empires, "9 Founders Who Hit 6-Figures with TikTok, Reels & Shorts" (2025-11-01): https://tinyempires.substack.com/p/9-founders-who-hit-6-figures-with
- Postiz on Natural Write (2026-04-21): https://postiz.com/blog/tiktok-marketing-strategy-100k-90-days
- Better Launch, Sub Club episode with Joseph Choi: https://www.betterlaunch.co/playbooks/episodes/joseph-choi-viral-app-founders
- Shortimize on FOMO hooks: https://shortimize.com/blog/tiktok-fomo-hooks-driving-millions-of-views
- Shortimize on Rizz b-roll: https://www.shortimize.com/blog/rizz-apps-b-roll-strategy-that-got-them-half-a-billion-views-on-tiktok
- Shortimize on the Stronger slideshow strategy: https://shortimize.com/blog/the-slideshow-strategy-that-generated-700000-users-in-275-days. It quotes "Grandpa was right", "Skipping legs…", "Suddenly I realized" and "Showing up in the gym" with no per-post views. Not in the bank.
- Virlo viral-hooks database for apps (vendor, view counts as listed): https://virlo.ai/data/viral-hooks/apps
- NBC News on Duolingo: https://www.nbcnews.com/pop-culture/pop-culture-news/duo-big-green-owl-became-tiktok-star-rcna4445
- AdRoll on Duolingo: https://www.adroll.com/blog/unrolling-duolingo-how-unhinged-tiktoks-made-the-brand-a-winner
- RevenueCat Sub Club, Cal AI (no verbatim hooks; context only): https://www.revenuecat.com/blog/growth/jake-castillo-cal-ai-sub-club-podcast-2026

**Searched with nothing usable found:**
- **Reddit:** r/TikTokMarketing, r/SaaS, r/iOSProgramming, r/AppBusiness, r/startups and r/indiehackers. The API returned a block page, and web search surfaced no matching threads.
- **Oren John:** a Motion talk page lists his referenced ads but not their hook text.
- **Alex Hormozi:** found no primary source for a named hook taxonomy. Only third-party "Hormozi-style" generators turned up, so none is cited.
- **Paywalled or blocked:** X articles (402) and an Indie Hackers post (403).
- **Finch, Opal, Quittr, Speak, Hallow, Locket, BeReal:** no article quoted verbatim hooks with views. Their hooks here come straight from their TikTok accounts.
