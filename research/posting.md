# Shipreel: auto-posting research

As of 2026-10-15. Covers TikTok, Instagram (Reels and carousels), YouTube Shorts, X, LinkedIn, Threads, Bluesky, Facebook Reels and Pinterest, from a local Next.js app on the user's Mac (`next dev -p 4747`).

Facts were checked today against the vendors' own docs, OpenAPI specs or `llms.txt` files. Where something could not be confirmed it is tagged **[unverified]**. Section 9 collects those items in one place.

---

## 1. Recommendation (short version)

**Default architecture: aggregator first, behind a pluggable `Publisher` interface, plus a few direct adapters that are free and easy.**

| Layer | What | Why |
|---|---|---|
| Default "one key" adapter | **Upload-Post** (`api.upload-post.com`). The Basic plan is $24/mo, or $16/mo billed annually. It includes TikTok, unlimited uploads and 5 profiles. | It is the only aggregator checked that takes the **local file in the same multipart request**, so there is no public hosting or presign step. One call can target many platforms (`platform[]`). It supports TikTok drafts and photo carousels through its own audited TikTok app. Scheduling happens on their side, so the Mac can sleep. It also offers status polling, idempotency keys and a hosted connect page. |
| Second adapter (free tier and fallback) | **Zernio** (the new name of Late / getlate.dev). The first 2 connected accounts are free with unlimited posts. Accounts 3–10 cost $6/account/mo. | It has a real free tier (for example TikTok and Instagram at $0) and a clean JSON API. It can attach Instagram catalog or trending audio to Reels, and it supports TikTok drafts and photo posts. It is a good hot standby if Upload-Post has an outage. |
| Cheapest flat alternative | **Post for Me**: $10/mo for 1,000 posts, unlimited accounts, AGPL open source, and you can bring your own platform credentials. | Best price at volume. It is younger and smaller, so offer it as an option rather than the default. |
| Direct, always | **Bluesky** via an app password (AT Protocol). | Free, with no app review. It is about 5 HTTP calls and has no real failure modes. |
| Direct, optional ("free mode") | **YouTube** using the user's own Google Cloud project with a Desktop OAuth client. | Uploads now have their own quota bucket (100 per day per project, 1 unit each). In the 2026-10-08 docs the "unverified projects are locked to private" banner has been **removed** (details in section 2). Confirm with a test upload. Setup takes about 10 minutes, so keep the aggregator as the default. |
| Direct, optional | **X**, only if the user already holds X API pay-per-use credits. | It costs $0.015 per post, or $0.20 if the post contains a URL. Otherwise route X through the aggregator. |
| TikTok behaviour | Default to **draft or inbox mode** (`post_mode=MEDIA_UPLOAD`) for videos that should get a trending sound. Use **Direct Post** for slideshows and finished edits. | The Content Posting API cannot attach trending sounds. Drafts let the user pick a sound in the TikTok editor and post natively. There is a cap of 5 pending drafts per 24 hours. |
| Never by default | Bring-your-own TikTok developer app, and browser automation. | A BYO TikTok app needs app review **and** an audit before posts can be public, plus domain verification for photos. Browser automation is fragile and breaks TikTok and YouTube ToS. Offer an "assisted manual" mode instead (section 6). |

---

## 2. What changed in 2025–2026 (where older guides are wrong)

1. **YouTube.**
   - On 2025-12-04 the upload cost fell from about 1,600 to about 100 units.
   - On 2026-06-01 `videos.insert` moved to its **own "Video Uploads" quota bucket**. The reference now says: *"Quota impact: 100 calls per day. A call to this method has a quota cost of 1 unit in the Video Uploads quota bucket."*
   - The private-lock wording changed between snapshots:
     - The banner *"All videos uploaded via the videos.insert endpoint from unverified API projects created after 28 July 2020 will be restricted to private viewing mode"* is still present in the Wayback snapshot of **2026-09-06** (page dated 2026-09-04).
     - It is **gone** from the **2026-10-08** snapshot and from the live page (dated 2026-10-15). The `status.privacyStatus` docs now say: *"Videos uploaded from unverified API projects are not restricted to private viewing mode."*
     - No revision-history entry announces this change. Third-party guides from August 2026 still describe the lock.
   - **Treat the lock as likely lifted but unconfirmed.** Shipreel should check `status.privacyStatus` after upload and warn the user if the video came back private.
2. **X.**
   - Pricing is pay-per-use with credits: Post create $0.015, Post create with URL $0.200 (docs.x.com pricing).
   - Third-party sources say the Free, Basic and Pro tiers closed to new developers in February 2026 **[unverified on docs.x.com]**.
   - Media upload now uses `POST /2/media/upload/initialize`, then `/{id}/append`, then `/{id}/finalize`. The old `command=INIT` style is gone.
3. **TikTok.**
   - Aggregators now connect new accounts through the **TikTok for Business app lane**. According to Zernio, videos on that lane can only be `PUBLIC_TO_EVERYONE`, a draft is the only route to a non-public video, and the lane is exempt from the shared direct-post capacity cap.
   - Upload-Post exposes Commercial Music Library trending tracks (`tiktok_music_id`) and location tags as per-connection capabilities.
   - TikTok's US Terms are now issued by "TikTok USDS Joint Venture".
4. **Instagram.** A new **Audio API** lets you attach catalog or trending music, or original sounds, to Reels (`audio_configuration`). It works **only on the Facebook Login variant** and not with Instagram Login.
5. **Bluesky.**
   - Videos can be up to **10 minutes** (since 2025-08-25) and **300 MB** (since June 2026, per the lexicon `maxSize: 300000000`).
   - Images are up to **2 MB** each, 4 per post.
   - A new `app.bsky.embed.gallery` lexicon (added June 2026) allows up to 20 images, with a recommended client soft limit of 10. Whether clients render it is **[unverified]**.
6. **Late is now Zernio.** `getlate.dev` returns a 301 to `zernio.com`, and `docs.getlate.dev` returns a 301 to `docs.zernio.com`.
7. **Buffer** has a new public **GraphQL API** (`https://api.buffer.com`). Personal API keys work even on the Free plan, but there is no upload endpoint: media must be at public URLs.
8. **LinkedIn.** The versioned `/rest` APIs require a `LinkedIn-Version: YYYYMM` header. Version 202511 is sunset on 2026-11-16.

---

## 3. Per-platform matrix (official APIs)

| Platform | Auth / review | What an unreviewed or dev-mode app can do | Video upload | Photo carousel | Media must be a public URL? | Native schedule param | Key limits |
|---|---|---|---|---|---|---|---|
| **TikTok** | OAuth 2 (Login Kit v2). Desktop apps use a `localhost`/`127.0.0.1` redirect with a port and PKCE S256. App review to go live, then a **Content Posting audit** for public Direct Post. | **Unaudited:** `SELF_ONLY` only, at most 5 users posting per 24h, and accounts must be private. **Sandbox:** up to 10 owned accounts and "no access to Content Posting API for public videos". | `FILE_UPLOAD` in chunks, or `PULL_FROM_URL` from a verified domain. Direct (`/video/init/`) or inbox draft (`/inbox/video/init/`). | `media_type=PHOTO` with `/content/init/`, up to 35 images, `DIRECT_POST` or `MEDIA_UPLOAD`. **PULL_FROM_URL only, from a verified domain.** | Videos: no. Photos: yes, and the domain must be verified. | none | 6 init calls/min per token. About 15 posts/day per creator across all API clients. 5 pending drafts per 24h. Video ≤4 GB and ≤10 min through the API, 23–60 fps. Photos JPEG/WebP ≤20 MB, ≤1080p. |
| **Instagram** | Meta app, using either Instagram Login (`graph.instagram.com`) or Facebook Login (`graph.facebook.com` with a Page). App Review / Advanced Access only for accounts you don't own or manage. | Dev mode / Standard Access: accounts with a role on your app can publish **publicly**. | Container (`media_type=REELS`, `video_url`), poll `status_code`, then `media_publish`. Resumable `rupload` is documented for **Facebook Login only**. | `CAROUSEL` with `children`, up to 10 items (images and/or videos). | **Yes** for `image_url` and `video_url` ("We cURL media"). Not needed for the FB-Login resumable path. | none | 100 API-published posts per 24h (the carousel section says 50, so the docs conflict). 400 containers per 24h, and containers expire after 24h. Reels 3 s–15 min, ≤300 MB. Images JPEG only, ≤8 MB. |
| **YouTube** | Google OAuth (`youtube.upload`). Desktop client with a loopback redirect. A consent screen in "Testing" status means refresh tokens die after **7 days**. | As of the 2026-10-08 docs, unverified projects are **not** locked to private (see section 2). Default limit is 100 uploads/day per project. | Resumable upload: `POST /upload/youtube/v3/videos?uploadType=resumable`, then `PUT`. | n/a | no | `status.publishAt` (requires `privacyStatus=private`) | Files up to 256 GB. Shorts are detected automatically (square or vertical, ≤3 min); there is no API flag. Unverified channels are limited to 15 min. |
| **X** | OAuth 2 PKCE (`tweet.write`, `media.write`, `users.read`, `offline.access`) or OAuth 1.0a. Pay-per-use credits. | n/a (paid per request) | `/2/media/upload/initialize`, then append (≤5 MB chunks), finalize, and STATUS. Then `POST /2/tweets`. | Up to 4 images per post | no | none in v2 **[unverified]** | Video 20 min / 8 GB by default (125 min / 16 GB with Premium). $0.015 per post, $0.20 with a URL. |
| **LinkedIn** | OAuth 2 three-legged. **Share on LinkedIn** is self-serve and grants `w_member_social` for a personal profile. Company pages need Community Management API approval. | Personal posting needs no review. | Videos API: `initializeUpload`, PUT 4 MB parts (save the ETags), `finalizeUpload`, then `POST /rest/posts`. | MultiImage posts (organic). True "carousel" is sponsored-only. PDF documents also work. | no | none | Video 3 s–30 min, 75 KB–500 MB, MP4. 60-day tokens. **Programmatic refresh tokens only for approved MDP partners.** 150 requests per member per day (Share on LinkedIn table). |
| **Threads** | Meta Threads app (`threads_basic`, `threads_content_publish`). | Users with the Threads Tester role can authorize without App Review. | Container (`media_type=VIDEO`, `video_url`), wait about 30 s, then `threads_publish`. | Carousel of 2–20 items | **Yes** | none | 250 posts per 24h. Video ≤1 GB, ≤5 min. Images ≤8 MB. |
| **Bluesky** | App password (`createSession`) or atproto OAuth. No review. | Full access. Video requires a verified email, and there are daily video limits (`getUploadLimits`). | `getServiceAuth`, then `video.bsky.app` `uploadVideo`, then `getJobStatus`, then `createRecord` with `app.bsky.embed.video`. | 4 images (`embed.images`). The new `embed.gallery` allows up to 10 **[unverified]**. | no | none | Video MP4 ≤300 MB, ≤10 min. Images ≤2 MB. Text 300 graphemes. |
| **Facebook Reels** | Meta app with a Page token (`pages_show_list`, `pages_read_engagement`, `pages_manage_posts`). **Pages only.** | Dev mode: your own Pages | `/{page-id}/video_reels` with `upload_phase=start`, then rupload, then `finish` with `video_state=PUBLISHED`. | Photos go through the Page feed (not covered here). | no (local upload via rupload, or a `file_url` header) | `scheduled_publish_time` + `video_state=SCHEDULED` | 3–90 s, 9:16, ≥540×960, 24–60 fps. 30 API-published Reels per 24h. |
| **Pinterest** | OAuth 2 (`pins:write`, `boards:read`). **Trial** access first, then Standard access, which needs a video demo of the OAuth flow. | **Trial:** pins and boards are "only visible to their creator as Sandbox entities". | `POST /v5/media`, then an S3 multipart POST, then poll `GET /v5/media/{id}` until it succeeds, then `POST /v5/pins` with `video_id`. | `multiple_image_urls` or `multiple_image_base64` with 2–5 images | Images: URL or base64. Video: upload. | none **[unverified]** | Title ≤100, description ≤800, alt text ≤500, link ≤2048 characters. |

---

## 4. Official API details and request shapes

All examples use bash on macOS (`stat -f%z` gives the file size). Values in `$CAPS` are placeholders.

### 4.1 TikTok: Content Posting API

**Auth**
- Authorize at `https://www.tiktok.com/v2/auth/authorize/`.
- Scopes: `user.info.basic`, plus `video.publish` (Direct Post) and/or `video.upload` (inbox drafts).
- Desktop redirect rules: *"Only `localhost` or loopback IP `127.0.0.1` are allowed host names in URI"*, a port is required, and a wildcard port is allowed. PKCE is required with `code_challenge_method=S256`. **Gotcha:** TikTok's doc describes the challenge as a hex-encoded SHA-256, not RFC 7636 base64url.
- Web apps need an HTTPS redirect. Postiz notes *"TikTok will also not allow http:// for your app redirect URI."*

**Review and audit**
- Sandbox allows up to 10 target accounts that you own. The sandbox page says it *"does not offer access to Content Posting API for public videos"*.
- Going live needs app review: website, privacy policy and a demo.
- Public Direct Post additionally needs an audit:
  - *"All content posted by unaudited clients will be restricted to private viewing mode."*
  - *"Unaudited API Clients can allow up to 5 users to post in a 24 hour window."*
  - Accounts must be private at posting time.
  - The error code is `unaudited_client_can_only_post_to_private_accounts`.
- Whether inbox drafts (`video.upload`) need the audit: the upload-to-inbox page lists no audit restriction, only the pending-share cap **[unverified that drafts work for unaudited, non-sandbox apps]**.

**Direct Post UX rules** (apply even when posting through an aggregator, because TikTok audits the integrator's UI). Show:
- the creator nickname, from `creator_info`
- a privacy dropdown with **no default**
- comment, duet and stitch toggles, off by default and greyed out when the creator has disabled them
- a commercial-content disclosure (off by default; "branded content" cannot be private)
- the Music Usage Confirmation declaration
- a preview

Never add watermarks.

**Limits**
- Rate limits per access token: 6 init calls per minute, 30 status calls per minute, 20 creator-info calls per minute.
- Creators can post about 15 times per day, shared across all Direct Post clients. Zernio says 15 videos plus 15 photo posts, counted separately.
- At most **5 pending inbox shares in any 24 hours**. Zernio adds that *"waiting does not free the slot"*: you have to finish or discard drafts. Postiz says drafts left unfinished for 24h are discarded. **[conflicting vendor claims]**
- Video: MP4, MOV or WebM; H.264, H.265, VP8 or VP9; 23–60 fps; 360–4096 px; ≤4 GB; ≤10 min through the API.
- Chunks: 5–64 MB each, with the final chunk allowed up to 128 MB. 1–1000 chunks, sent in order. Files under 5 MB go in a single chunk. `upload_url` is valid for 1 hour.
- Photos: JPEG or WebP, ≤20 MB, ≤1080p, up to 35. Photo title ≤90 characters, description ≤4000 characters. Video title ≤2200 characters.

**Webhooks:** `post.publish.complete`, `post.publish.failed`, `post.publish.inbox_delivered`, `post.publish.publicly_available` and `post.publish.no_longer_publicaly_available` (TikTok's spelling). A local app has no public URL to receive them, so poll the status endpoint instead.

```bash
# 0) Creator info, required for the Direct Post UI
curl -X POST https://open.tiktokapis.com/v2/post/publish/creator_info/query/ \
  -H "Authorization: Bearer $TT_TOKEN" \
  -H "Content-Type: application/json; charset=UTF-8"

# 1a) Direct Post init (single chunk; fine for files <= 64 MB)
SIZE=$(stat -f%z clip.mp4)
curl -X POST https://open.tiktokapis.com/v2/post/publish/video/init/ \
  -H "Authorization: Bearer $TT_TOKEN" \
  -H "Content-Type: application/json; charset=UTF-8" \
  -d '{"post_info":{"title":"I built an app that roasts your screen time #buildinpublic",
        "privacy_level":"PUBLIC_TO_EVERYONE","disable_duet":false,"disable_comment":false,
        "disable_stitch":false,"video_cover_timestamp_ms":1000,
        "brand_content_toggle":false,"brand_organic_toggle":true,"is_aigc":false},
       "source_info":{"source":"FILE_UPLOAD","video_size":'"$SIZE"',"chunk_size":'"$SIZE"',"total_chunk_count":1}}'
# -> {"data":{"publish_id":"v_pub_file~v2-1.xxx","upload_url":"https://open-upload.tiktokapis.com/..."},"error":{"code":"ok",...}}

# 1b) Inbox draft init instead (video.upload scope, no post_info)
curl -X POST https://open.tiktokapis.com/v2/post/publish/inbox/video/init/ \
  -H "Authorization: Bearer $TT_TOKEN" \
  -H "Content-Type: application/json; charset=UTF-8" \
  -d '{"source_info":{"source":"FILE_UPLOAD","video_size":'"$SIZE"',"chunk_size":'"$SIZE"',"total_chunk_count":1}}'

# 2) Upload the bytes
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: video/mp4" \
  -H "Content-Range: bytes 0-$((SIZE-1))/$SIZE" \
  --data-binary @clip.mp4

# 3) Poll: PROCESSING_UPLOAD -> SEND_TO_USER_INBOX (draft) | PUBLISH_COMPLETE | FAILED
curl -X POST https://open.tiktokapis.com/v2/post/publish/status/fetch/ \
  -H "Authorization: Bearer $TT_TOKEN" \
  -H "Content-Type: application/json; charset=UTF-8" \
  -d '{"publish_id":"v_pub_file~v2-1.xxx"}'

# Photo carousel: PULL_FROM_URL only, and the URLs must be on a domain/prefix verified in the TikTok dev portal
curl -X POST https://open.tiktokapis.com/v2/post/publish/content/init/ \
  -H "Authorization: Bearer $TT_TOKEN" \
  -H "Content-Type: application/json; charset=UTF-8" \
  -d '{"post_info":{"title":"3 apps I wish I had in college","description":"Full list in bio #studytok",
        "privacy_level":"PUBLIC_TO_EVERYONE","disable_comment":false,"auto_add_music":true,
        "brand_content_toggle":false,"brand_organic_toggle":true},
       "source_info":{"source":"PULL_FROM_URL","photo_cover_index":0,
        "photo_images":["https://media.example.com/s/1.jpg","https://media.example.com/s/2.jpg"]},
       "post_mode":"DIRECT_POST","media_type":"PHOTO"}'
# For a photo draft, set "post_mode":"MEDIA_UPLOAD" and send only title/description in post_info.
```

**Why not BYO for TikTok in Shipreel:** every user would need app review plus an audit. Photo posts also need a verified HTTPS domain. Quick tunnels such as `trycloudflare.com` cannot be verified, and the media URL must not redirect. Use an aggregator's audited app instead.

### 4.2 Instagram: Reels and carousels

**Login choices**
- **Instagram API with Instagram Login.** Host `graph.instagram.com`, scopes `instagram_business_basic` + `instagram_business_content_publish`, and no Facebook Page is needed.
- **Instagram API with Facebook Login.** Host `graph.facebook.com`, scopes `instagram_basic` + `instagram_content_publish` + `pages_read_engagement`. It needs a Page linked to the Instagram account.

**Tokens and access**
- For your own account, use "Generate token" under *Instagram › API setup with Instagram business login* in the app dashboard. These tokens are long-lived, valid for 60 days, and refreshed with `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token`.
- Standard Access covers accounts you own or manage that you added to the app. You need *"Advanced Access if your app serves Instagram professional accounts you don't own or manage"*.

**Media hosting**
- *"We cURL media used in publishing attempts, so the media must be hosted on a publicly accessible server at the time of the attempt."*
- **Resumable upload** (`rupload.facebook.com/ig-api-upload/...`) *"is available only for apps that have implemented Facebook Login for Business."* Third-party guides show it working with `graph.instagram.com` **[unverified]**.
- So a local BYO Instagram-Login integration needs a temporary public URL. Two options:
  - a presigned GET URL on the user's S3 or R2 bucket, or
  - a `cloudflared` quick tunnel serving one file for the duration of the publish.
- Keep the URL alive until the container reaches `FINISHED`.

**Specs**
- Reels: MOV or MP4 with the moov atom at the front; H.264 or HEVC; AAC at 48 kHz max; 23–60 fps; ≤1920 px wide; 3 s–15 min; ≤300 MB; VBR ≤25 Mbps.
- Images: JPEG only, ≤8 MB, aspect ratio 4:5 to 1.91:1, 320–1440 px wide.
- Carousels: up to 10 items, and Reels can't be carousel items.

**Status values:** `EXPIRED`, `ERROR`, `FINISHED`, `IN_PROGRESS`, `PUBLISHED`. Meta suggests polling once per minute for up to 5 minutes.

**Limits:** 100 published posts per 24h; check `GET /<IG_ID>/content_publishing_limit`. 400 containers per 24h.

**Trending audio:** the Audio API needs Facebook Login.
- `GET /ig_audio?audio_type=music|original_sound&user_id=...` returns trending audio when no `search_query` is given.
- Attach it with `audio_configuration={audio_id, audio_volume, video_volume}` on a `REELS` container.

```bash
V=v25.0   # latest version shown in the IG reference page
# Reel from a public URL (Instagram Login)
curl -X POST "https://graph.instagram.com/$V/$IG_USER_ID/media" \
  -d "media_type=REELS" \
  --data-urlencode "video_url=https://files.example.com/tmp/launch-hook.mp4" \
  --data-urlencode "caption=I built an app that roasts your screen time #buildinpublic" \
  -d "share_to_feed=true" -d "access_token=$IG_TOKEN"            # -> {"id":"<CONTAINER_ID>"}
curl "https://graph.instagram.com/$V/$CONTAINER_ID?fields=status_code&access_token=$IG_TOKEN"
curl -X POST "https://graph.instagram.com/$V/$IG_USER_ID/media_publish" \
  -d "creation_id=$CONTAINER_ID" -d "access_token=$IG_TOKEN"     # -> {"id":"<MEDIA_ID>"}

# Carousel: one child container per JPEG, then the parent, then publish
curl -X POST "https://graph.instagram.com/$V/$IG_USER_ID/media" \
  --data-urlencode "image_url=https://files.example.com/tmp/slide1.jpg" \
  -d "is_carousel_item=true" -d "access_token=$IG_TOKEN"         # repeat for each slide
curl -X POST "https://graph.instagram.com/$V/$IG_USER_ID/media" \
  -d "media_type=CAROUSEL" -d "children=$C1,$C2,$C3" \
  --data-urlencode "caption=3 apps I wish I had in college" -d "access_token=$IG_TOKEN"
curl -X POST "https://graph.instagram.com/$V/$IG_USER_ID/media_publish" \
  -d "creation_id=$PARENT_ID" -d "access_token=$IG_TOKEN"

# Resumable local-file upload (Facebook Login variant only)
curl -X POST "https://graph.facebook.com/$V/$IG_USER_ID/media" \
  -d "media_type=REELS" -d "upload_type=resumable" \
  --data-urlencode "caption=..." -d "access_token=$FB_TOKEN"     # -> {"id":"<CONTAINER_ID>","uri":"..."}
curl -X POST "https://rupload.facebook.com/ig-api-upload/$V/$CONTAINER_ID" \
  -H "Authorization: OAuth $FB_TOKEN" -H "offset: 0" -H "file_size: $SIZE" \
  --data-binary @launch-hook.mp4
# To resume: read video_status.uploading_phase.bytes_transferred and resend with that offset.
```

### 4.3 YouTube Shorts: Data API v3

**Auth**
- Use a Desktop OAuth client. The loopback redirect can be `http://127.0.0.1:PORT`; `localhost` also works but *"may cause issues with client firewalls"*. PKCE is supported.
- Scope `https://www.googleapis.com/auth/youtube.upload`. Add `youtube.readonly` if you want to read back the video status.
- **Gotcha:** a project whose consent screen is in "Testing" gets refresh tokens that expire after **7 days**. Set it to "In production". As an unverified app this shows a warning screen, and Google caps unverified apps at 100 users for sensitive scopes **[unverified that `youtube.upload` is classed as sensitive]**.
- Limit: 100 refresh tokens per Google account per client ID.

**Quota (granular, since 2026-06-01):** `videos.insert` costs 1 unit in the "Video Uploads" bucket, with a default of 100 calls per day per project. If Shipreel ever ships one shared client ID for all its users, those **100 uploads/day are shared** across everyone, and getting more requires the quota form and compliance review. That is a strong reason for bring-your-own projects, or for using an aggregator.

**Private lock:** see section 2. The docs now say unverified projects are not restricted. After uploading, call `videos.list?part=status&id=...` and warn the user if `privacyStatus` comes back `private` when they asked for `public`.

**Shorts:** there is no API flag. YouTube classifies square or vertical videos of 3 minutes or less as Shorts. `#Shorts` in the title is optional. Custom thumbnails aren't supported for Shorts.

**Scheduling:** set `status.privacyStatus="private"` and `status.publishAt` (ISO 8601).

```bash
SIZE=$(stat -f%z short.mp4)
curl -i -X POST "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status" \
  -H "Authorization: Bearer $YT_TOKEN" \
  -H "Content-Type: application/json; charset=UTF-8" \
  -H "X-Upload-Content-Length: $SIZE" \
  -H "X-Upload-Content-Type: video/mp4" \
  -d '{"snippet":{"title":"I built an app that roasts your screen time #Shorts",
        "description":"Get it: https://apps.apple.com/app/id0000000000","categoryId":"28",
        "tags":["buildinpublic","indiedev"]},
       "status":{"privacyStatus":"public","selfDeclaredMadeForKids":false,"containsSyntheticMedia":false}}'
# -> 200 OK with a Location: header (the session URI)
curl -X PUT "$SESSION_URI" -H "Content-Type: video/mp4" --data-binary @short.mp4   # -> video resource (id)
# Resume check: 308 + Range header means it is incomplete
curl -i -X PUT "$SESSION_URI" -H "Content-Length: 0" -H "Content-Range: bytes */$SIZE"
# Detect the private lock / processing state
curl "https://www.googleapis.com/youtube/v3/videos?part=status,processingDetails&id=$VIDEO_ID" \
  -H "Authorization: Bearer $YT_TOKEN"
```
Chunked uploads must use chunk sizes that are multiples of 256 KB, except the last chunk.

### 4.4 X: API v2

**Pricing:** pay-per-use from prepaid credits. Post create costs $0.015, or $0.200 if the post contains a URL. There is a $20 credit when you save a card, and the first auto-recharge is matched up to $50. Post reads are capped at 3M per month.

**Auth:** OAuth 2.0 authorization code with PKCE. Scopes `tweet.read tweet.write users.read media.write offline.access`. Access tokens last 2 hours unless you request `offline.access`. Callback URLs must exactly match a registered one. The docs use `http://localhost/...` in an example, but don't say whether `127.0.0.1` is allowed **[unverified]**.

**Media limits:** `tweet_video` up to 20 min / 8 GB by default, or 125 min / 16 GB with Premium. Images ≤5 MB, GIFs ≤15 MB. A post takes up to 4 photos, or 1 video, or 1 GIF.

```bash
SIZE=$(stat -f%z clip.mp4)
curl -X POST https://api.x.com/2/media/upload/initialize \
  -H "Authorization: Bearer $X_USER_TOKEN" -H "Content-Type: application/json" \
  -d '{"media_type":"video/mp4","total_bytes":'"$SIZE"',"media_category":"tweet_video"}'
# -> {"data":{"id":"<MEDIA_ID>","media_key":"...","expires_after_secs":...}}
split -b 4m clip.mp4 seg_                       # keep each APPEND chunk <= 5 MB
curl -X POST "https://api.x.com/2/media/upload/$MEDIA_ID/append" \
  -H "Authorization: Bearer $X_USER_TOKEN" -F "segment_index=0" -F "media=@seg_aa"   # increment segment_index for each chunk
curl -X POST "https://api.x.com/2/media/upload/$MEDIA_ID/finalize" -H "Authorization: Bearer $X_USER_TOKEN"
curl "https://api.x.com/2/media/upload?command=STATUS&media_id=$MEDIA_ID" -H "Authorization: Bearer $X_USER_TOKEN"
# Wait for processing_info.state = succeeded (honour check_after_secs), then post:
curl -X POST https://api.x.com/2/tweets -H "Authorization: Bearer $X_USER_TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"I built an app that roasts your screen time","media":{"media_ids":["'"$MEDIA_ID"'"]}}'
```
Cost tip: keep the store link out of the post (it would cost $0.20) and put it in a reply instead. Upload-Post strips URLs from X posts by default for the same reason.

### 4.5 LinkedIn: Posts API and Videos API

**Access:** add the **Share on LinkedIn** product, which is self-serve and grants `w_member_social`. Add **Sign In with LinkedIn using OpenID Connect** for `openid profile`; `GET https://api.linkedin.com/v2/userinfo` then returns `sub`, and the author URN is `urn:li:person:{sub}`. Company pages need `w_organization_social` through the Community Management API, which is reviewed.

**Which endpoints work with `w_member_social`:** the consumer doc for Share on LinkedIn still describes the legacy `/v2/ugcPosts` + `/v2/assets?action=registerUpload` flow. The versioned `/rest/posts` and `/rest/videos` pages list `w_member_social` as a valid permission. Vendors report that self-serve apps post through `/rest/posts` successfully with version 202608 **[vendor report]**.

**Tokens:** 60-day access tokens. *"Programmatic refresh tokens are available for a limited set of partners."* So BYO users re-authenticate every 60 days. The Developer Portal also has a manual token generator. Redirect URLs are registered with HTTPS; whether `http://localhost` is accepted is **[unverified]**.

**Limits:** video 3 s–30 min, 75 KB–500 MB (the schema says 5 GB max), MP4. Organic multi-image posts are supported; "Carousel" is sponsored-only. A daily limit of 150 requests per member applies (from the Share on LinkedIn table).

```bash
H=(-H "Authorization: Bearer $LI_TOKEN" -H "LinkedIn-Version: 202609" -H "X-Restli-Protocol-Version: 2.0.0" -H "Content-Type: application/json")
curl -X POST 'https://api.linkedin.com/rest/videos?action=initializeUpload' "${H[@]}" \
  -d '{"initializeUploadRequest":{"owner":"urn:li:person:'"$LI_SUB"'","fileSizeBytes":'"$SIZE"',"uploadCaptions":false,"uploadThumbnail":false}}'
# -> value.video (urn:li:video:...), value.uploadInstructions[{uploadUrl,firstByte,lastByte}], value.uploadToken
# PUT each byte range [firstByte..lastByte] (4 MB parts) and keep each response's ETag header:
curl -i -X PUT "$UPLOAD_URL_0" -H "Content-Type: application/octet-stream" --data-binary @part_0
curl -X POST 'https://api.linkedin.com/rest/videos?action=finalizeUpload' "${H[@]}" \
  -d '{"finalizeUploadRequest":{"video":"urn:li:video:XXXX","uploadToken":"","uploadedPartIds":["<etag0>","<etag1>"]}}'
# Poll GET /rest/videos/{urlencoded urn} until "status":"AVAILABLE", then:
curl -X POST https://api.linkedin.com/rest/posts "${H[@]}" -d '{
  "author":"urn:li:person:'"$LI_SUB"'","commentary":"I built an app that roasts your screen time",
  "visibility":"PUBLIC",
  "distribution":{"feedDistribution":"MAIN_FEED","targetEntities":[],"thirdPartyDistributionChannels":[]},
  "content":{"media":{"title":"Launch clip","id":"urn:li:video:XXXX"}},
  "lifecycleState":"PUBLISHED","isReshareDisabledByAuthor":false}'
# -> 201 with an x-restli-id header: urn:li:share:... or urn:li:ugcPost:...
```

### 4.6 Threads

**Host:** the posting examples use `graph.threads.net/v1.0`; the token docs now use `threads.com` and `graph.threads.com`. Users with the Threads Tester role (App roles) can grant permissions without App Review. Long-lived tokens last 60 days.

**Media:** must be on a public server. Images: JPEG or PNG, ≤8 MB. Video: MOV or MP4, ≤1 GB, ≤300 s, 23–60 fps.

**Carousels:** 2–20 items, and a carousel counts as one post.

**Limit:** 250 posts per 24h, readable at `GET /{id}/threads_publishing_limit?fields=quota_usage,config`.

```bash
curl -X POST "https://graph.threads.net/v1.0/$TH_USER_ID/threads" \
  -d "media_type=VIDEO" --data-urlencode "video_url=https://files.example.com/tmp/clip.mp4" \
  --data-urlencode "text=I built an app that roasts your screen time" -d "access_token=$TH_TOKEN"   # -> {"id":"<CREATION_ID>"}
sleep 30   # Meta recommends waiting about 30 s for processing before publishing
curl -X POST "https://graph.threads.net/v1.0/$TH_USER_ID/threads_publish" \
  -d "creation_id=$CREATION_ID" -d "access_token=$TH_TOKEN"
# Carousel: create children with is_carousel_item=true, then media_type=CAROUSEL&children=ID1,ID2,..., then publish.
```

### 4.7 Bluesky (recommended direct adapter)

**Auth:** create an app password at bsky.app › Settings › App passwords, then call `com.atproto.server.createSession`. There is no review. atproto OAuth also exists.

**Video requirements:** Bluesky-hosted accounts *"need to have verified their account email before uploading video, and there are limits on the number of video posts which can be posted per day."* Check those with `app.bsky.video.getUploadLimits`, which returns `canUpload`, `remainingDailyVideos` and `remainingDailyBytes`.

**Two ways to upload a video:**
- **Recommended:** upload to `video.bsky.app` so the video is processed **before** the post is made.
- **Simple:** `com.atproto.repo.uploadBlob` to the PDS, then reference the blob. The downside is that the post shows a missing video for a few seconds while processing.

```bash
# 1) Session
curl -X POST https://bsky.social/xrpc/com.atproto.server.createSession -H 'Content-Type: application/json' \
  -d '{"identifier":"yourname.bsky.social","password":"xxxx-xxxx-xxxx-xxxx"}'
# -> accessJwt, did, didDoc.service[0].serviceEndpoint (= $PDS, e.g. https://xxx.us-east.host.bsky.network)
# 2) Service token for the video service (aud = did:web:<PDS host>, lxm = uploadBlob, exp about 30 min)
curl -G "$PDS/xrpc/com.atproto.server.getServiceAuth" -H "Authorization: Bearer $ACCESS_JWT" \
  --data-urlencode "aud=did:web:${PDS#https://}" --data-urlencode "lxm=com.atproto.repo.uploadBlob" \
  --data-urlencode "exp=$(( $(date +%s) + 1800 ))"                       # -> {"token":"..."}
# 3) Upload
curl -X POST "https://video.bsky.app/xrpc/app.bsky.video.uploadVideo?did=$DID&name=clip.mp4" \
  -H "Authorization: Bearer $SERVICE_TOKEN" -H "Content-Type: video/mp4" --data-binary @clip.mp4
# -> job status (jobId, state, blob when done). The official TS sample reads it at the top level; the lexicon wraps it in "jobStatus". Handle both.
#    If the same file was processed before, an "already_exists" error still returns the blob.
# 4) Poll (no auth in the official sample)
curl "https://video.bsky.app/xrpc/app.bsky.video.getJobStatus?jobId=$JOB_ID"   # until jobStatus.blob exists
# 5) Post
curl -X POST "$PDS/xrpc/com.atproto.repo.createRecord" -H "Authorization: Bearer $ACCESS_JWT" -H 'Content-Type: application/json' \
  -d '{"repo":"'"$DID"'","collection":"app.bsky.feed.post","record":{"$type":"app.bsky.feed.post",
       "text":"I built an app that roasts your screen time","createdAt":"2026-10-15T20:00:00Z","langs":["en"],
       "embed":{"$type":"app.bsky.embed.video","video":'"$BLOB_JSON"',"aspectRatio":{"width":1080,"height":1920}}}}'
```

**Images:** call `uploadBlob` for each image (≤2 MB), then post with `{"$type":"app.bsky.embed.images","images":[{"image":BLOB,"alt":"...","aspectRatio":{...}}]}`. That allows at most 4 images. For slideshows with more slides, either render a video or try `app.bsky.embed.gallery` (up to 10 items, alt text and aspect ratio required) once clients support it **[unverified]**.

**Limits:** text ≤300 graphemes. Video MP4 ≤300 MB and ≤10 min. Up to 20 VTT caption files, each ≤20 KB.

### 4.8 Facebook Reels (Pages only)

**Specs:** 9:16, 1080×1920 recommended and 540×960 minimum, 3–90 s, 24–60 fps.

**Limit:** 30 API-published Reels per 24h.

**Scheduling:** `video_state=SCHEDULED` plus `scheduled_publish_time`.

*"You can only publish Reels to Facebook Pages."*

```bash
curl -X POST "https://graph.facebook.com/v25.0/$PAGE_ID/video_reels" -d "upload_phase=start" -d "access_token=$PAGE_TOKEN"
# -> {"video_id":"...","upload_url":"https://rupload.facebook.com/video-upload/..."}
curl -X POST "https://rupload.facebook.com/video-upload/v25.0/$VIDEO_ID" \
  -H "Authorization: OAuth $PAGE_TOKEN" -H "offset: 0" -H "file_size: $SIZE" --data-binary @reel.mp4
#   (for an already-hosted file, send a "file_url: https://..." header instead of a body)
curl -X POST "https://graph.facebook.com/v25.0/$PAGE_ID/video_reels" -d "upload_phase=finish" \
  -d "video_id=$VIDEO_ID" -d "video_state=PUBLISHED" --data-urlencode "description=..." -d "access_token=$PAGE_TOKEN"
curl "https://graph.facebook.com/v25.0/$VIDEO_ID?fields=status&access_token=$PAGE_TOKEN"
```

### 4.9 Pinterest (API v5)

**Access tiers:** with Trial access, pins and boards are *"only visible to their creator as Sandbox entities."* Standard access needs *"a video recording of your app completing an action using the Pinterest API"*, showing the OAuth flow, *"even for apps with one intended user."* The sandbox host `api-sandbox.pinterest.com` cannot create video pins.

**Field limits:** title ≤100, description ≤800, alt text ≤500, link ≤2048 characters. Carousels take 2–5 images.

```bash
curl -X POST https://api.pinterest.com/v5/media -H "Authorization: Bearer $PIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"media_type":"video"}'
# -> {"media_id":"12345","upload_url":"https://pinterest-media-upload.s3-accelerate.amazonaws.com/",
#     "upload_parameters":{"x-amz-date":"...","x-amz-signature":"...","x-amz-security-token":"...","x-amz-algorithm":"AWS4-HMAC-SHA256",
#                          "key":"...","policy":"...","x-amz-credential":"...","Content-Type":"multipart/form-data"}}
curl -X POST "$UPLOAD_URL" -F "x-amz-date=..." -F "x-amz-signature=..." -F "x-amz-security-token=..." \
  -F "x-amz-algorithm=AWS4-HMAC-SHA256" -F "key=..." -F "policy=..." -F "x-amz-credential=..." \
  -F "Content-Type=multipart/form-data" -F "file=@pin.mp4"           # the file field goes last
curl https://api.pinterest.com/v5/media/12345 -H "Authorization: Bearer $PIN_TOKEN"   # status: registered|processing|succeeded|failed
curl -X POST https://api.pinterest.com/v5/pins -H "Authorization: Bearer $PIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"board_id":"BOARD_ID","title":"I built an app that roasts your screen time","description":"...",
       "link":"https://yourapp.com","alt_text":"...",
       "media_source":{"source_type":"video_id","media_id":"12345","cover_image_key_frame_time":1}}'
# Carousel pin
curl -X POST https://api.pinterest.com/v5/pins -H "Authorization: Bearer $PIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"board_id":"BOARD_ID","title":"3 apps I wish I had in college",
       "media_source":{"source_type":"multiple_image_urls","index":0,
         "items":[{"url":"https://files.example.com/1.jpg","title":"1"},{"url":"https://files.example.com/2.jpg","title":"2"}]}}'
```

---

## 5. Aggregators

### 5.1 Comparison (solo-dev view)

| | Price | Free tier | Covers all 9? | Local file upload | Many platforms in one call | TikTok drafts | TikTok photo carousel | IG trending audio | Scheduling | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| **Upload-Post** | Basic $24/mo ($16/mo annual): 5 profiles, unlimited uploads. Professional $50 / $33. | Yes: 10 uploads/mo, 2 profiles, **no TikTok** | Yes (+13 more) | **Multipart file in the same request** (or a URL) | Yes (`platform[]`) | Yes: `post_mode=MEDIA_UPLOAD` (video and photo) | Yes: `photos[]`, up to 35 | No (only `audio_name`) | `scheduled_date` + `timezone`, queue | `GET /api/uploadposts/status`, webhooks |
| **Zernio** (was Late) | $6/account/mo for accounts 3–10, $3 for 11–100. X billed at cost. | **First 2 accounts free**, unlimited posts | Yes (+7) | Presign (≤5 GB) then PUT, then URL | Yes (`platforms[]`) | Yes: `tiktokSettings.draft` | Yes, up to 35 | **Yes** (FB Login connection) | `scheduledFor` + `timezone` | `GET /v1/posts/{id}`, webhooks |
| **Post for Me** | $10/mo for 1,000 posts, unlimited accounts | Not stated | Yes | Presign (`create-upload-url`) then PUT | Yes (`social_accounts[]`) | Yes: `is_draft` | Yes (`auto_add_music`) | No | `scheduled_at` | `GET /v1/social-post-results`, webhooks |
| **Ayrshare** | Premium $149/mo (1 profile), Launch $299 | **None** (28-day trial on Launch only) | Yes | Presigned `uploadUrl` then PUT, or public URLs | Yes | Yes: `tikTokOptions.draft` | Yes, up to 35 | No | `scheduleDate` | `GET /api/post/:id`, webhooks |
| **Blotato** | Starter $29/mo (20 accounts) | Trial **excludes API** | Yes | Presign (`/v2/media/uploads`) then PUT | **No** (one account per request) | Yes: `isDraft` | Yes | No | `scheduledTime`, next free slot | `GET /v2/posts/{id}` |
| **Postiz** | Cloud from $29/mo (7-day trial). Self-host is free (AGPL) but you need your own dev apps and a TikTok audit. | Trial only | Yes (+20) | Multipart `/public/v1/upload` | Yes (`posts[]` per integration) | Yes: `content_posting_method: UPLOAD` | Yes | **Yes** (FB-linked accounts) | `type: schedule` + `date` | List posts by date range |
| **Buffer** | Free: 3 channels, 10 queued posts per channel. Essentials $5/channel/mo. | Yes (API on Free: 3,000 requests/30 days) | Yes | **No upload endpoint** (public URLs only) | Per channel | Buffer "draft" ≠ TikTok inbox **[unverified]** | Yes | No | queue / `customScheduled` + `dueAt` | GraphQL query |
| Newcomers (2026) | **Outstand** $19/mo (3,000 posts, unlimited accounts). **PostProxy** $17/mo (5 profiles). **bundle.social** Free 20 posts/mo, Pro $100. **PostZen** Free 2 accounts / 20 posts, $19+. | varies | per their `llms.txt` | not checked | not checked | not checked | not checked | not checked | yes | **[request shapes not verified]** |

**Value for one indie app on ~7 platforms, 2 videos/day (≈420 posts/mo):**
- Upload-Post: $16–24/mo.
- Zernio: about $30/mo (2 free + 5 × $6) plus X costs.
- Post for Me: $10/mo.
- Outstand: $19/mo.
- Blotato: $29/mo.
- Ayrshare: $149/mo.

**How users connect accounts.** Every aggregator owns the OAuth callback on its own HTTPS domain and then redirects the browser to your `redirect_url`. That redirect can be `http://localhost:4747/...` because it is only a browser redirect **[expected; test once per vendor]**. The local app never needs HTTPS or app review.

### 5.2 Upload-Post (recommended default)

**Basics:** base URL `https://api.upload-post.com/api`, auth header `Authorization: Apikey YOUR_API_KEY`. Docs: `docs.upload-post.com`. OpenAPI: `https://docs.upload-post.com/openapi.json` (spec version 1.0.0).

**Connecting accounts:** either use the dashboard (`app.upload-post.com` › Manage Users › profile › connect), or let Shipreel create a profile and open the hosted connect page (`generate-jwt` → `access_url`, valid 48 hours). Branding of the connect page is a white-label feature "included from Professional upward". Whether the plain hosted page is available on Basic is **[unverified]**.

**Behaviour to code for:**
- Uploads that take longer than 59 s switch to async automatically. Send `async_upload=true`, your own `request_id`, and an `Idempotency-Key` header, and **never resend after a client timeout**.
- Platforms not connected on the profile return `skipped: true` rather than failing.
- Error codes: `429` = monthly limit; `403` = plan restriction (for example TikTok on the Free plan).

**TikTok on Upload-Post:**
- 6 posts/min and 15/day per account. Media 3–600 s.
- Optional capabilities per connection: `music`, `location`, `cover_image`, `draft`, `photo_privacy`, `video_privacy`, `inbox_fallback`. Read them with `GET /api/uploadposts/users`.
- `GET /api/uploadposts/tiktok/settings?profile=...` returns `privacy_level_options` and `max_video_post_duration_sec`.
- Trending CML tracks: `GET /api/uploadposts/tiktok/music/trending?profile=...&country_code=US&date_range=7DAY`, then send `tiktok_music_id` on the upload. This field is documented on the docs page but is absent from the OpenAPI schema **[verify]**.

**X on Upload-Post:** URLs are stripped from captions by default to keep the $0.015 rate. A link add-on costs $19/mo for 50 link posts.

**Upload a video to TikTok (draft) + Instagram Reel + YouTube Short:**
```bash
curl -X POST https://api.upload-post.com/api/upload \
  -H "Authorization: Apikey $UPLOAD_POST_API_KEY" \
  -H "Idempotency-Key: shipreel-job-7f3c2a" \
  -F "user=shipreel-default" \
  -F "platform[]=tiktok" -F "platform[]=instagram" -F "platform[]=youtube" \
  -F "video=@/Users/me/Shipreel/renders/launch-hook.mp4;type=video/mp4" \
  -F "title=I built an app that roasts your screen time #buildinpublic" \
  -F "post_mode=MEDIA_UPLOAD" \
  -F "media_type=REELS" -F "share_to_feed=true" \
  -F "youtube_title=I built an app that roasts your screen time #Shorts" \
  -F "youtube_description=Get it: https://apps.apple.com/app/id0000000000" \
  -F "privacyStatus=public" -F "selfDeclaredMadeForKids=false" -F "categoryId=28" \
  -F "async_upload=true" -F "request_id=shipreel-job-7f3c2a"
# async  -> {"success":true,"message":"Upload initiated successfully in background.","request_id":"shipreel-job-7f3c2a","total_platforms":3}
# sync   -> {"success":true,"results":{"tiktok":{"success":true,"publish_id":"..."},"instagram":{"success":true,"url":"...","container_id":"..."},"youtube":{"success":true,"url":"..."}},"usage":{"count":12,"limit":null}}
```
- For a public TikTok post instead of a draft, drop `post_mode` (the default is `DIRECT_POST`) and add `-F "privacy_level=PUBLIC_TO_EVERYONE" -F "disable_duet=false" -F "disable_comment=false" -F "disable_stitch=false" -F "brand_organic_toggle=true"`.
- To schedule, add `-F "scheduled_date=2026-10-20T16:00:00" -F "timezone=America/New_York"`. That returns `202 {"success":true,"job_id":"...","scheduled_date":"..."}`.
- `video` may be a public URL string instead of a file.

**Photo carousel to TikTok + Instagram:**
```bash
curl -X POST https://api.upload-post.com/api/upload_photos \
  -H "Authorization: Apikey $UPLOAD_POST_API_KEY" \
  -F "user=shipreel-default" -F "platform[]=tiktok" -F "platform[]=instagram" \
  -F "photos[]=@slide1.jpg" -F "photos[]=@slide2.jpg" -F "photos[]=@slide3.jpg" \
  -F "title=3 apps I wish I had in college" \
  -F "tiktok_title=3 apps I wish I had in college" \
  -F "description=Full list + links in bio #studytok" \
  -F "privacy_level=PUBLIC_TO_EVERYONE" -F "auto_add_music=true" -F "photo_cover_index=0"
# Photo drafts: -F "post_mode=MEDIA_UPLOAD". TikTok photo titles are cut to 90 chars; the description carries up to 4000.
```

**Status, profiles and connect link:**
```bash
curl "https://api.upload-post.com/api/uploadposts/status?request_id=shipreel-job-7f3c2a" -H "Authorization: Apikey $UPLOAD_POST_API_KEY"
curl "https://api.upload-post.com/api/uploadposts/status?job_id=$JOB_ID"                  -H "Authorization: Apikey $UPLOAD_POST_API_KEY"
# -> {"request_id":"...","status":"pending|in_progress|completed","completed":2,"total":3,
#     "results":[{"platform":"tiktok","success":true,"message":"...","upload_timestamp":"..."}],"last_update":"..."}

curl -X POST https://api.upload-post.com/api/uploadposts/users -H "Authorization: Apikey $UPLOAD_POST_API_KEY" \
  -H "Content-Type: application/json" -d '{"username":"shipreel-default"}'
curl -X POST https://api.upload-post.com/api/uploadposts/users/generate-jwt -H "Authorization: Apikey $UPLOAD_POST_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"username":"shipreel-default","redirect_url":"http://localhost:4747/settings/posting?connected=1",
       "platforms":["tiktok","instagram","youtube","x","linkedin","threads","facebook","pinterest"],
       "connect_title":"Connect your accounts to Shipreel","show_calendar":false}'
# -> {"success":true,"access_url":"https://app.upload-post.com/...","duration":"48h"}
```
Other useful endpoints:
- `GET /api/uploadposts/schedule`, plus `DELETE` or `PATCH /api/uploadposts/schedule/{job_id}` to cancel or edit a scheduled post.
- `GET /api/uploadposts/facebook/pages` and `GET /api/uploadposts/pinterest/boards` to find IDs.
- `POST /api/uploadposts/posts/retry`.
- `POST /api/uploadposts/users/notifications` to set up webhooks (needs a public URL).

### 5.3 Zernio (formerly Late): free tier and Instagram trending audio

**Basics:** base URL `https://zernio.com/api/v1`, auth header `Authorization: Bearer YOUR_API_KEY`. Rate limits are 60 requests/min on the free tier and 600 when paid. Zernio also enforces 25 posts per hour per account.

**Connecting accounts:**
- `GET /v1/connect/{platform}?profileId=...&redirect_url=...` returns `{authUrl, state}`.
- Bluesky uses `POST /v1/connect/bluesky/credentials` with `{identifier, appPassword}`.
- Facebook Pages, LinkedIn organizations and Pinterest boards need a second selection step.

**TikTok on Zernio:**
- Every post needs `content_preview_confirmed: true` and `express_consent_given: true`.
- On the Business-app lane (all new connections), videos are public only, so use `draft: true` for anything else.
- Drafts need TikTok app 31.8 or later. Zernio reports a draft as `published` the moment TikTok accepts it, with `platformSpecificData.isDraft: true`.

```bash
# 1) Presign and upload the local file
curl -X POST https://zernio.com/api/v1/media/presign -H "Authorization: Bearer $ZERNIO_API_KEY" -H "Content-Type: application/json" \
  -d '{"filename":"launch-hook.mp4","contentType":"video/mp4"}'
# -> {"uploadUrl":"<presigned>","publicUrl":"https://media.zernio.com/temp/...","key":"temp/...","type":"video"}
curl -X PUT "$UPLOAD_URL" -H "Content-Type: video/mp4" --data-binary @launch-hook.mp4

# 2) One post to TikTok (draft) + Instagram Reel + YouTube Short
curl -X POST https://zernio.com/api/v1/posts -H "Authorization: Bearer $ZERNIO_API_KEY" -H "Content-Type: application/json" -d '{
  "content": "I built an app that roasts your screen time #buildinpublic",
  "mediaItems": [{"type":"video","url":"https://media.zernio.com/temp/.../launch-hook.mp4"}],
  "platforms": [
    {"platform":"tiktok","accountId":"TT_ACCOUNT_ID"},
    {"platform":"instagram","accountId":"IG_ACCOUNT_ID","platformSpecificData":{"shareToFeed":true}},
    {"platform":"youtube","accountId":"YT_ACCOUNT_ID","platformSpecificData":{
        "title":"I built an app that roasts your screen time #Shorts","visibility":"public","madeForKids":false,"categoryId":"28"}}
  ],
  "tiktokSettings": {"draft":true,"privacy_level":"PUBLIC_TO_EVERYONE","allow_comment":true,"allow_duet":false,
                     "allow_stitch":false,"content_preview_confirmed":true,"express_consent_given":true},
  "publishNow": true
}'
# Schedule instead: replace "publishNow": true with "scheduledFor":"2026-10-20T16:00:00","timezone":"America/New_York"
# -> 201 {"post":{"_id":"...","status":"published|scheduled","platforms":[{"platform":"tiktok","status":"published","platformPostUrl":null}, ...]}}

# 3) Status
curl https://zernio.com/api/v1/posts/$POST_ID -H "Authorization: Bearer $ZERNIO_API_KEY"   # post.status: draft|scheduled|published|failed

# TikTok photo carousel: mediaItems = [{"type":"image","url":...}, ...] (up to 35), and
#   "tiktokSettings":{"media_type":"photo","photo_cover_index":0,"description":"up to 4000 chars", ...}

# Instagram trending/catalog audio (needs a Facebook-Login connection)
curl -G "https://zernio.com/api/v1/accounts/$IG_ACCOUNT_ID/instagram/audio" -H "Authorization: Bearer $ZERNIO_API_KEY" -d "audioType=music"
# then on the IG platform entry: "platformSpecificData":{"audioConfiguration":{"audioId":"482851939985510","audioVolume":80,"videoVolume":20}}

# Creator info before building the TikTok UI
curl "https://zernio.com/api/v1/accounts/$TT_ACCOUNT_ID/tiktok/creator-info?mediaType=video" -H "Authorization: Bearer $ZERNIO_API_KEY"
```

### 5.4 Post for Me: cheapest flat price

**Basics:** base URL `https://api.postforme.dev`, auth header `Authorization: Bearer YOUR_API_KEY`. SDKs: TypeScript (`post-for-me`), Python, Ruby and Go. The source is AGPL-3.0 at `github.com/DayMoonDevelopment/post-for-me`.

**Credentials:** projects can use Post for Me's own platform credentials ("Quickstart") or your own. Whether their TikTok app is audited for public Direct Post is **[unverified]**. Connect accounts with `POST /v1/social-accounts/auth-url {"platform":"tiktok"}`, which returns `{url}`.

```bash
curl -X POST https://api.postforme.dev/v1/media/create-upload-url -H "Authorization: Bearer $PFM_API_KEY" -H "Content-Type: application/json" -d '{}'
# -> {"upload_url":"<signed PUT url>","media_url":"<public url>"}
curl -X PUT "$UPLOAD_URL" -H "Content-Type: video/mp4" --data-binary @launch-hook.mp4
curl -X POST https://api.postforme.dev/v1/social-posts -H "Authorization: Bearer $PFM_API_KEY" -H "Content-Type: application/json" -d '{
  "caption": "I built an app that roasts your screen time #buildinpublic",
  "social_accounts": ["spc_tiktok_xxx","spc_instagram_xxx","spc_youtube_xxx"],
  "media": [{"url":"MEDIA_URL","thumbnail_timestamp_ms":1000}],
  "platform_configurations": {
    "tiktok":   {"is_draft": true},
    "instagram":{"placement":"reels","share_to_feed": true},
    "youtube":  {"title":"I built an app that roasts your screen time #Shorts","privacy_status":"public","made_for_kids":false,"localizations":{}}
  },
  "scheduled_at": null,
  "external_id": "shipreel-job-7f3c2a"
}'
curl "https://api.postforme.dev/v1/social-post-results?post_id=$POST_ID" -H "Authorization: Bearer $PFM_API_KEY"
```
The spec marks `localizations` as required on the YouTube configuration DTO. This looks like a spec artifact, so pass `{}`.

### 5.5 Others (shapes checked against docs)

**Ayrshare**
- Endpoint: `POST https://api.ayrshare.com/api/post`, header `Authorization: Bearer KEY` (plus `Profile-Key` for multi-user).
- To upload local media: `GET /api/media/uploadUrl?fileName=clip.mp4&contentType=mp4`, then PUT the file to `uploadUrl`, then put `accessUrl` in `mediaUrls`. Each presigned URL accepts one upload only.
- X posts need your own X OAuth1 keys, sent as `X-Twitter-OAuth1-Api-Key` / `-Secret` headers.
```json
{"post":"I built an app that roasts your screen time","platforms":["tiktok","instagram","youtube"],
 "mediaUrls":["https://.../launch-hook.mp4"],
 "tikTokOptions":{"draft":true},
 "instagramOptions":{"shareReelsFeed":true},
 "youTubeOptions":{"title":"I built an app that roasts your screen time","shorts":true,"visibility":"public"}}
```
Status: `GET https://api.ayrshare.com/api/post/:id` returns `success`, `error`, `pending` or `awaiting approval`, plus `postIds[]`.

**Blotato**
- Endpoint: `POST https://backend.blotato.com/v2/posts`, header `blotato-api-key: KEY`.
- **One account per request.** The TikTok target requires `privacyLevel`, `disabledComments`, `disabledDuet`, `disabledStitch`, `isBrandedContent`, `isYourBrand` and `isAiGenerated`.
- Local files: `POST /v2/media/uploads {"filename":"clip.mp4"}` returns `{presignedUrl, publicUrl}`; PUT the file to `presignedUrl`.
```json
{"post":{"accountId":"98435","content":{"text":"...","mediaUrls":["PUBLIC_URL"],"platform":"tiktok"},
 "target":{"targetType":"tiktok","privacyLevel":"PUBLIC_TO_EVERYONE","disabledComments":false,"disabledDuet":false,
           "disabledStitch":false,"isBrandedContent":false,"isYourBrand":true,"isAiGenerated":false,"isDraft":true}},
 "scheduledTime":"2026-10-20T16:00:00-04:00"}
```
Status: `GET /v2/posts/{postSubmissionId}` returns `in-progress`, `scheduled`, `published` or `failed`. Poll no more than every 10 s.

**Postiz**
- Upload: `POST https://api.postiz.com/public/v1/upload` with `-F file=@clip.mp4` and header `Authorization: KEY` (no "Bearer"). It returns `{id, path}`.
- Post: `POST /public/v1/posts`. The rate limit is about 90 requests per hour (100 on cloud) on this endpoint.
```json
{"type":"now","date":"2026-10-15T20:00:00.000Z","shortLink":false,"tags":[],
 "posts":[{"integration":{"id":"TIKTOK_ID"},"value":[{"content":"...","image":[{"id":"VID_ID","path":"https://uploads.postiz.com/x.mp4"}]}],
   "settings":{"__type":"tiktok","title":"","privacy_level":"PUBLIC_TO_EVERYONE","duet":false,"stitch":false,"comment":true,
               "autoAddMusic":"no","brand_content_toggle":false,"brand_organic_toggle":false,"content_posting_method":"UPLOAD"}},
  {"integration":{"id":"YT_ID"},"value":[{"content":"...","image":[{"id":"VID_ID","path":"https://uploads.postiz.com/x.mp4"}]}],
   "settings":{"__type":"youtube","title":"I built an app...","type":"public","selfDeclaredMadeForKids":"no","tags":[]}}]}
```
- Instagram audio: `settings.audio = {id, audio_volume, video_volume}` on `instagram` (FB-linked) channels. Find IDs with `POST /public/v1/integration-trigger/{id}` and `{"methodName":"audioSearch","data":{"q":"","type":"music"}}`.
- Self-hosting does **not** avoid platform reviews: you supply `TIKTOK_CLIENT_ID` and similar keys, and an unaudited TikTok app is forced to `SELF_ONLY`.

**Buffer**
- One GraphQL endpoint: `POST https://api.buffer.com` with `Authorization: Bearer KEY`.
- The mutation is `createPost(input:{text, channelId, schedulingType: automatic, mode: addToQueue, assets:[{video:{url:"https://...", metadata:{thumbnailOffset:2000}}}]})`.
- No file upload: media must stay publicly reachable until the post publishes, so avoid expiring presigned URLs.
- Rate limits: 100 requests per 15 min; 250/day on Free and Essentials, 500 on Team.

---

## 6. Browser-automation posting (fallback)

**Verdict: don't make it a default.** Offer at most an opt-in, user-supervised "assisted" mode.

**Reliability in 2026 is low to moderate and needs constant maintenance.** Evidence from GitHub issues:
- `wkaisertexas/tiktok-uploader` (778 stars, last push 2026-02): open issues include *"Upload fails due to modal overlay intercepting clicks"* (2026-05-04), *"'Something went wrong' error when clicking Post – TikTok Studio upload fails silently"* (2026-04-28), *"Cannot upload a video (auth error)"* (2026-01) and cookie and calendar bugs.
- `dreammis/social-auto-upload` (15.5k stars) sees constant selector fixes. There are platform risk-control flags: a 2026-09 issue reports Xiaohongshu flagging posts as "suspected AI/automation". Another reports YouTube prompts on Linux servers. An open PR (2026-08-28) proposes routing overseas platforms through Upload-Post's API, "no browser and cookie needed".
- `makiisthenes/TiktokAutoUploader` (now `autotok`) is active but leans on proxies.
- `linouk23/youtube_uploader_selenium` has had no push since 2023.
- `instagrapi` (private Instagram API) issues from October 2026 are about `challenge_required` and fingerprint mismatches.

**ToS and account risk**
- TikTok US Terms 3.4 prohibit *"using any automated system or software, including automated 'bots,' except as approved in writing by TikTok USDS Joint Venture."*
- YouTube's Terms prohibit accessing *"the Service using any automated means (such as robots, botnets or scrapers)"* except for search engines or with prior written permission.
- Instagram's Terms ban automated account access or creation without permission. This is quoted from prior knowledge; the page is JavaScript-rendered and couldn't be fetched **[unverified this session]**.
- Practical risks: posts silently not published, shadow-limited reach, checkpoints and captchas, and logged-out sessions.

**Known gotchas**
- Headless runs get flagged, so use a headed, persistent Chrome profile on the user's own Mac and residential IP.
- 2FA and captchas break unattended scheduling.
- Modal overlays and A/B-tested UIs change every few weeks.
- Upload "success" doesn't mean published.
- Scheduling needs the Mac awake at post time.
- Cookie export goes stale.
- Music and sound pickers are not reliably scriptable.

**Safer alternative ("Assisted manual"):** Shipreel reveals the file in Finder, copies the caption to the clipboard and opens `https://www.tiktok.com/tiktokstudio/upload` (or Instagram on the phone via an AirDrop or QR handoff). The user drags and posts. This has zero automation risk and keeps native-post reach.

---

## 7. Recommended architecture for Shipreel

```
Shipreel (Next.js on :4747, Node worker)
 ├─ PostJob store (SQLite in ~/Library/Application Support/Shipreel)
 │    id, asset paths, per-platform caption overrides, targets, mode (direct|draft), scheduleAt,
 │    provider, providerRefs (request_id / job_id / postId / publish_id), status, errors, idempotencyKey
 ├─ Media prep (ffmpeg): per-target transcodes
 │    9:16 1080x1920 H.264/AAC MP4 (moov at front, 30 fps); IG carousel = JPEG <= 8 MB;
 │    TikTok photos = JPEG/WebP <= 1080p; Bluesky images <= 2 MB; FB Reels <= 90 s; Shorts <= 3 min
 ├─ Publisher interface: capabilities(), connect(), listAccounts(), publish(job), status(ref), cancel(ref)
 │    ├─ UploadPostPublisher   (default; multipart, platform[], scheduled_date, Idempotency-Key)
 │    ├─ ZernioPublisher        (free tier / fallback; presign + JSON; IG catalog audio)
 │    ├─ PostForMePublisher     (optional; $10 flat)
 │    ├─ BlueskyDirect          (always; app password)
 │    ├─ YouTubeDirect          (optional; BYO Desktop OAuth client, resumable upload)
 │    ├─ XDirect                (optional; BYO pay-per-use credits)
 │    └─ ManualHandoff          (reveal file + copy caption + open upload page / phone handoff)
 ├─ Secrets: macOS Keychain (API keys, refresh tokens); never in the project folder
 └─ Status poller: exponential backoff, respects vendor limits (TikTok status 30/min; Blotato >= 10 s)
```

**Rules of thumb**
1. **Schedule on the provider whenever possible** (`scheduled_date` or `scheduledFor`). Then a sleeping or closed Mac still posts. For direct adapters without native scheduling (Bluesky, X, TikTok, Instagram, Threads, LinkedIn), run a `launchd` LaunchAgent worker and use `pmset schedule wake` shortly before each slot. YouTube (`publishAt`) and Facebook Reels (`scheduled_publish_time`) can schedule natively.
2. **Poll rather than use webhooks.** A localhost app can't receive them without a tunnel.
3. **Make posting idempotent.** Store the request ID before sending, send `Idempotency-Key` where supported, and on a timeout check status or history before retrying.
4. **Build the TikTok sheet to TikTok's Direct Post UX rules** even when using an aggregator:
   - Show the nickname from `creator_info` / `tiktok/settings`.
   - The privacy dropdown has no default.
   - Toggles start off and are greyed out when the creator disabled them.
   - Include the commercial-content disclosure and the Music Usage Confirmation line.
   - Show a preview.
5. **TikTok draft mode:**
   - Default to draft for "add a trending sound" videos. Count pending drafts locally, warn at 4 of 5, and tell the user to finish or delete drafts in the app.
   - Use Direct Post for slideshows (`auto_add_music` can add a recommended track) and finished edits.
   - Upload-Post's `tiktok_music_id` (Commercial Music Library) is a power option when the connection has the `music` capability.
6. **Instagram trending audio:** only possible over the API via the Facebook-Login variant: Zernio's `audioConfiguration`, Postiz's `audio`, or a direct `audio_configuration`. Otherwise use the Reel's original audio.
7. **Caption builder:** keep one master caption, with per-platform overrides and limits:
   - TikTok: video 2,200; photo title 90 / description 4,000.
   - YouTube title: 100.
   - Bluesky: 300 graphemes.
   - Pinterest: title 100 / description 800.
   - X: 280 for non-Premium accounts **[unverified this session]**.
   - Threads: 500 **[unverified]**.
   - LinkedIn: 3,000 **[unverified]**.
   - Instagram: 2,200 **[unverified]**.
   - Keep links out of X posts (they cost $0.20).

---

## 8. Setup steps for the user (default path)

1. **Settings › Posting › Connect with Upload-Post.** Sign up at `app.upload-post.com` (the free tier needs no card). Copy the API key into Shipreel, which stores it in the macOS Keychain.
2. Shipreel calls `POST /api/uploadposts/users` (`shipreel-default`), then `generate-jwt`, and opens the hosted connect page. Connect TikTok, an Instagram professional account, YouTube, X, LinkedIn, Threads, a Facebook Page and Pinterest.
3. Upgrade to **Basic** ($16/mo annual or $24 monthly) to enable TikTok. The free tier allows 10 uploads/month and no TikTok.
4. **Bluesky:** create an App Password at bsky.app › Settings › App passwords. Verify your account email, which video requires. Paste your handle and app password.
5. **TikTok defaults:** keep the TikTok app at version 31.8 or later. Pick "Draft (add sound in app)" or "Direct post" per post. Finish or clear drafts, because more than 5 pending drafts per 24h are blocked.
6. *(Optional, free mode)* **YouTube direct:**
   - Create a Google Cloud project and enable YouTube Data API v3.
   - Set up the OAuth consent screen (External) and set publishing status to **In production**, to avoid 7-day token expiry.
   - Create a **Desktop app** OAuth client and paste the client ID and secret into Shipreel. Sign in.
   - Shipreel runs one private test upload to confirm public uploads aren't locked.
7. *(Optional)* **Free alternative:** use a Zernio key (first 2 accounts free) instead of Upload-Post. For example, TikTok + Instagram via Zernio, with Bluesky and YouTube direct, costs $0/month.
8. Schedule posts. They are queued on the provider, so the Mac can sleep. Shipreel polls status and shows links once posts are live.

---

## 9. Unverified or open items

- **YouTube private lock lifted?** The live docs and the 2026-10-08 snapshot say unverified projects are not restricted. The 2026-09-06 snapshot still had the lock, and no revision-history entry exists. Confirm with a test upload.
- Whether `youtube.upload` is classed as a "sensitive" scope (which drives the unverified-app 100-user cap).
- Whether TikTok inbox drafts (`video.upload`) are allowed for unaudited, non-sandbox apps.
- What happens to TikTok drafts after 24 hours: Zernio says the slot is not freed by waiting, while Postiz says drafts are discarded after 24h.
- Whether Instagram resumable `rupload` works with Instagram Login (Meta's doc says Facebook Login only).
- The Instagram publishing limit: the docs say both 100 and 50 per 24h.
- X: whether the Free tier is closed to new developers (third-party sources); whether `127.0.0.1` callbacks are accepted; whether v2 has native scheduling.
- LinkedIn: whether `http://localhost` redirect URLs are accepted, and whether `/rest/videos` works with self-serve `w_member_social` (vendor reports say yes).
- Bluesky: whether clients render `app.bsky.embed.gallery`; the exact `aud` value for `getUploadLimits`.
- Pinterest: whether there is any native scheduling parameter in v5.
- Upload-Post: whether `tiktok_music_id` will be added to the OpenAPI schema (it is on the docs page only); whether the hosted connect page is available on the Basic plan; whether a `localhost` `redirect_url` works.
- Post for Me: whether its TikTok credentials are audited for public Direct Post; its exact photo-carousel limits.
- Buffer: whether its TikTok "draft" maps to TikTok inbox drafts.
- The Instagram Terms quote (the page couldn't be fetched).
- Newcomers (Outstand, PostProxy, bundle.social, PostZen): request shapes and reliability were not tested.
- Vendor claims about reach (for example "native posting from drafts gets more reach") are not independently verified.

---

## 10. Sources (fetched 2026-10-15)

**TikTok**
- developers.tiktok.com/doc/content-posting-api-get-started
- …/content-posting-api-reference-direct-post
- …/content-posting-api-reference-upload-video
- …/content-posting-api-media-transfer-guide
- …/content-posting-api-reference-photo-post
- …/content-sharing-guidelines
- …/content-posting-api-reference-query-creator-info
- …/content-posting-api-reference-get-video-status
- …/login-kit-desktop
- …/add-a-sandbox
- tiktok.com/legal/page/us/terms-of-service/en

**Meta (Instagram, Facebook, Threads)**
- developers.facebook.com/docs/instagram-platform/content-publishing
- developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/media.md
- …/content-publishing/resumable-uploads
- …/content-publishing/audio-api
- …/instagram-api-with-instagram-login/business-login
- …/instagram-api-with-instagram-login/get-started
- developers.facebook.com/docs/development/build-and-test/app-modes
- developers.facebook.com/docs/video-api/guides/reels-publishing
- developers.facebook.com/docs/threads/posts
- developers.facebook.com/docs/threads/overview
- developers.facebook.com/docs/threads/get-started
- …/get-access-tokens-and-permissions

**YouTube and Google**
- developers.google.com/youtube/v3/docs/videos/insert (live, plus Wayback snapshots 20260114, 20260402, 20260710, 20260906 and 20261008)
- …/youtube/v3/docs/videos
- …/youtube/v3/revision_history
- …/youtube/v3/guides/using_resumable_upload_protocol
- …/youtube/v3/determine_quota_cost
- support.google.com/youtube/answer/12779649
- youtube.com/static?template=terms
- developers.google.com/identity/protocols/oauth2
- …/oauth2/native-app

**X**
- docs.x.com/x-api/getting-started/pricing
- docs.x.com/x-api/media/quickstart/media-upload-chunked
- docs.x.com/x-api/media/initialize-media-upload
- docs.x.com/x-api/posts/create-post
- docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code
- Third-party pricing write-ups: outstand.so, postproxy.dev, invisibleapi.ai, xpoz.ai

**LinkedIn**
- learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api
- …/shares/posts-api
- learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
- learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
- …/programmatic-refresh-tokens

**Bluesky**
- github.com/bluesky-social/bsky-docs docs/tutorials/video.mdx
- github.com/bluesky-social/atproto lexicons: embed/images, embed/video, embed/gallery, video/uploadVideo, video/getUploadLimits, feed/post
- engadget.com (Bluesky 10-minute video post, 2026-08-26)

**Pinterest**
- developers.pinterest.com/docs/key-concepts/access-tiers
- github.com/pinterest/api-description v5/openapi.json

**Aggregators**
- docs.upload-post.com (openapi.json, llm.txt, /api/upload-video)
- upload-post.com/llms-full.txt
- zernio.com/llms.txt and zernio.com/pricing.md
- docs.zernio.com/platforms/{tiktok,youtube,instagram}.mdx
- api.postforme.dev/docs (embedded OpenAPI) and postforme.dev/pricing
- ayrshare.com/pricing and ayrshare.com/docs/apis/post/{post,get-post,social-networks/tiktok,social-networks/youtube,social-networks/instagram}
- ayrshare.com/docs/apis/media/upload-large-media
- blotato.com/llms.txt
- help.blotato.com/rest-api-reference/{publish-post,publish-post/get-post,publish-post/upload-media-v2-media}.md
- docs.postiz.com/llms-full.txt and postiz.com/llms.txt
- developers.buffer.com/llms.txt and its guides
- buffer.com/pricing
- outstand.so/llms.txt, postproxy.dev/llms.txt, bundle.social/llms.txt, postzen.dev/llms.txt

**Browser automation:** GitHub API data for wkaisertexas/tiktok-uploader, dreammis/social-auto-upload, makiisthenes/TiktokAutoUploader, linouk23/youtube_uploader_selenium and subzeroid/instagrapi (issues listed through 2026-10-15).

**Note:** the session's WebSearch budget ran out partway through. The remaining facts were gathered by fetching vendor docs, OpenAPI specs and `llms.txt` files directly, and from the GitHub API.
