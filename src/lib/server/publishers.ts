import "server-only";
import { execFile } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { Platform, Post, PostResult, Project, ProviderId, VideoDoc } from "@/lib/types";
import { startRun, waitForRun } from "./agents";
import { browserSiteLabel, browserUpload, isBrowserPlatform } from "./browser-upload";
import { mapPostbox, POSTBOX_PLATFORMS, POSTBOX_URL, postboxCaptions, postboxGet, postboxReady, postboxSubmit, type PbPost } from "./postbox";
import { getSecret, getSecrets, getSettings, now, paths } from "./store";

const run = promisify(execFile);

export type PublishCtx = {
  post: Post;
  video: VideoDoc;
  project: Project;
  /** Absolute path of the rendered MP4. */
  file: string;
  /** Absolute paths of carousel stills (slideshows). */
  slides: string[];
  log: (line: string) => void;
};

export type Publisher = {
  id: ProviderId;
  label: string;
  blurb: string;
  platforms: Platform[];
  ready: () => Promise<{ ok: boolean; reason?: string }>;
  publish: (ctx: PublishCtx) => Promise<PostResult[]>;
  /**
   * Services that hold the post themselves (Postbox): hand it over and return right away; Shipreel
   * then syncs the status back (posts.ts syncPostbox) instead of waiting in publish().
   */
  handoff?: (ctx: PublishCtx) => Promise<{ externalId: string; external: PbPost; status: Post["status"]; results: PostResult[] }>;
};

export function captionFor(post: Post, video: VideoDoc, platform: Platform): string {
  const own = post.captions[platform] ?? video.spec.meta.captions?.[platform];
  // A hashtag glued to the word or emoji before it ("up 😭#textstory") gets its space back.
  const base = (own || post.captions.tiktok || video.spec.meta.caption || video.spec.meta.hook || video.spec.title).replace(/([^\s/#])#(?=\p{L})/gu, "$1 #");
  const tags = (video.spec.meta.hashtags ?? []).slice(0, 5).map((h) => `#${h.replace(/^#/, "")}`);
  if (platform === "youtube") return base.replace(/#\w+/g, "").trim().slice(0, 95) + " #Shorts";
  if (platform === "linkedin") return base;
  const withTags = tags.length && !/#\w/.test(base) ? `${base} ${tags.join(" ")}` : base;
  const limit = platform === "x" ? 270 : platform === "bluesky" || platform === "threads" ? 290 : 2000;
  return withTags.slice(0, limit);
}

const ok = (platform: Platform, extra: Partial<PostResult> = {}): PostResult => ({ platform, ok: true, at: now(), ...extra });
const fail = (platform: Platform, error: string): PostResult => ({ platform, ok: false, error: error.slice(0, 500), at: now() });

async function toJpegs(pngs: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const p of pngs) {
    const jpg = p.replace(/\.png$/i, ".jpg");
    if (!fs.existsSync(jpg)) await run("ffmpeg", ["-v", "error", "-y", "-i", p, "-q:v", "2", jpg]);
    out.push(jpg);
  }
  return out;
}

// ── Upload-Post (one key → TikTok, Instagram, YouTube, X, LinkedIn, Threads, Facebook, Pinterest, Bluesky) ──

const UP = "https://api.upload-post.com/api";

async function upFetch(pathname: string, init: RequestInit & { key: string }) {
  const res = await fetch(`${UP}${pathname}`, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Apikey ${init.key}` } });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) throw new Error(`Upload-Post ${res.status}: ${String(json.message ?? json.error ?? text).slice(0, 300)}`);
  return json;
}

export async function uploadPostProfiles(): Promise<{ username: string; social_accounts?: Record<string, unknown> }[]> {
  const key = await getSecret("uploadPostKey");
  if (!key) return [];
  const j = await upFetch("/uploadposts/users", { method: "GET", key });
  return (j.profiles as { username: string; social_accounts?: Record<string, unknown> }[]) ?? [];
}

export async function uploadPostConnectUrl(redirectUrl: string): Promise<string> {
  const key = await getSecret("uploadPostKey");
  if (!key) throw new Error("Add your Upload-Post API key first.");
  const user = (await getSecret("uploadPostUser")) || "shipreel";
  try {
    await upFetch("/uploadposts/users", { method: "POST", key, headers: { "content-type": "application/json" }, body: JSON.stringify({ username: user }) });
  } catch (e) {
    if (!/exist/i.test((e as Error).message)) throw e;
  }
  const j = await upFetch("/uploadposts/users/generate-jwt", {
    method: "POST",
    key,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: user,
      redirect_url: redirectUrl,
      platforms: ["tiktok", "instagram", "youtube", "x", "linkedin", "threads", "facebook", "pinterest", "bluesky"],
      connect_title: "Connect your accounts to Shipreel",
      connect_description: "Shipreel posts your videos here. You can disconnect anytime.",
      show_calendar: false,
    }),
  });
  const url = String(j.access_url ?? j.url ?? "");
  if (!url) throw new Error("Upload-Post didn't return a connect link.");
  return url;
}

const uploadPost: Publisher = {
  id: "upload-post",
  label: "Upload-Post",
  blurb: "One API key posts to TikTok (incl. drafts), Instagram, YouTube, X, LinkedIn, Threads, Facebook, Pinterest and Bluesky.",
  platforms: ["tiktok", "instagram", "youtube", "x", "linkedin", "threads", "facebook", "pinterest", "bluesky"],
  ready: async () => ((await getSecret("uploadPostKey")) ? { ok: true } : { ok: false, reason: "Add an Upload-Post API key in Settings → Connect accounts." }),
  async publish({ post, video, file, slides, log }) {
    const key = await getSecret("uploadPostKey");
    if (!key) throw new Error("No Upload-Post API key.");
    const user = (await getSecret("uploadPostUser")) || "shipreel";
    const form = new FormData();
    form.append("user", user);
    for (const p of post.platforms) form.append("platform[]", p);
    const carousel = video.spec.kind === "slideshow" && slides.length > 1;
    const first = post.platforms[0];
    form.append("title", captionFor(post, video, first).slice(0, 2000));
    for (const p of post.platforms) form.append(`${p}_title`, captionFor(post, video, p));
    if (post.platforms.includes("youtube")) {
      form.append("youtube_description", `${captionFor(post, video, "instagram")}\n\n${post.captions.youtube ?? ""}`.trim());
      form.append("privacyStatus", "public");
      form.append("selfDeclaredMadeForKids", "false");
    }
    if (post.platforms.includes("tiktok")) {
      form.append("post_mode", post.asDraft ? "MEDIA_UPLOAD" : "DIRECT_POST");
      form.append("privacy_level", "PUBLIC_TO_EVERYONE");
      // TikTok's guidelines (Sep 2026) require disclosing promotion of your own product; undisclosed
      // self-promotion can lose reach or the account. Shipreel only ever posts the user's own app.
      form.append("brand_organic_toggle", "true");
    }
    if (post.platforms.includes("instagram")) {
      if (!carousel) form.append("media_type", "REELS");
      form.append("share_to_feed", "true");
    }
    form.append("async_upload", "true");
    form.append("request_id", post.id);
    let endpoint = "/upload";
    if (carousel) {
      endpoint = "/upload_photos";
      const jpgs = await toJpegs(slides);
      for (const j of jpgs) form.append("photos[]", await fs.openAsBlob(j, { type: "image/jpeg" }), path.basename(j));
      form.append("description", captionFor(post, video, "tiktok"));
      form.append("photo_cover_index", "0");
      // Photo posts without a sound die in the feed: let TikTok add a recommended one when posting directly
      // (drafts get their trending sound picked by hand in the app).
      form.append("auto_add_music", post.asDraft ? "false" : "true");
      log(`Uploading ${jpgs.length} slides to Upload-Post…`);
    } else {
      form.append("video", await fs.openAsBlob(file, { type: "video/mp4" }), path.basename(file));
      log(`Uploading ${(fs.statSync(file).size / 1e6).toFixed(1)} MB to Upload-Post…`);
    }
    const j = await upFetch(endpoint, { method: "POST", key, body: form, headers: { "Idempotency-Key": `shipreel-${post.id}` } });
    const requestId = String(j.request_id ?? post.id);
    log(`Accepted (request ${requestId}). Waiting for platforms…`);
    // Poll status up to ~10 minutes.
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, i < 6 ? 3000 : 5000));
      let st: Record<string, unknown>;
      try {
        st = await upFetch(`/uploadposts/status?request_id=${encodeURIComponent(requestId)}`, { method: "GET", key });
      } catch (e) {
        log(`status check failed: ${(e as Error).message}`);
        continue;
      }
      const status = String(st.status ?? "");
      if (status === "completed" || st.completed === st.total) {
        const results = (st.results as { platform: string; success: boolean; message?: string; url?: string; post_url?: string }[]) ?? [];
        return post.platforms.map((p) => {
          const r = results.find((x) => x.platform === p);
          if (!r) return fail(p, "No result reported (is this account connected in Upload-Post?)");
          return r.success
            ? ok(p, { url: r.post_url ?? r.url, mode: p === "tiktok" && post.asDraft ? "draft" : "published" })
            : fail(p, r.message ?? "failed");
        });
      }
    }
    return post.platforms.map((p) => fail(p, "Timed out waiting for Upload-Post (it may still finish; check its dashboard)."));
  },
};

// ── Bluesky (direct, app password) ───────────────────────────────────────────────

type BskySession = { accessJwt: string; did: string; handle: string; pds: string };

async function bskySession(): Promise<BskySession> {
  const handle = await getSecret("blueskyHandle");
  const password = await getSecret("blueskyAppPassword");
  if (!handle || !password) throw new Error("Add your Bluesky handle and app password in Settings → Connect accounts.");
  const res = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: handle.replace(/^@/, ""), password }),
  });
  const j = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Bluesky login failed: ${String(j.message ?? res.status)}`);
  const doc = j.didDoc as { service?: { id: string; serviceEndpoint: string }[] } | undefined;
  const pds = doc?.service?.find((s) => s.id === "#atproto_pds")?.serviceEndpoint ?? "https://bsky.social";
  return { accessJwt: String(j.accessJwt), did: String(j.did), handle: String(j.handle), pds };
}

const bluesky: Publisher = {
  id: "bluesky",
  label: "Bluesky",
  blurb: "Direct and free with an app password. Videos up to 3 min; carousels post as up to 4 images.",
  platforms: ["bluesky"],
  ready: async () => {
    const s = await getSecrets();
    return s.blueskyHandle && s.blueskyAppPassword ? { ok: true } : { ok: false, reason: "Add a Bluesky handle and app password in Settings → Connect accounts." };
  },
  async publish({ post, video, file, slides, log }) {
    const s = await bskySession();
    const auth = { Authorization: `Bearer ${s.accessJwt}` };
    const text = captionFor(post, video, "bluesky").slice(0, 299);
    let embed: Record<string, unknown>;
    if (video.spec.kind === "slideshow" && slides.length) {
      const images = [];
      for (const sl of (await toJpegs(slides)).slice(0, 4)) {
        const up = await fetch(`${s.pds}/xrpc/com.atproto.repo.uploadBlob`, { method: "POST", headers: { ...auth, "content-type": "image/jpeg" }, body: await fsp.readFile(sl) });
        const j = (await up.json()) as { blob?: unknown; message?: string };
        if (!up.ok) throw new Error(`Bluesky image upload failed: ${j.message ?? up.status}`);
        images.push({ alt: video.spec.title, image: j.blob });
      }
      embed = { $type: "app.bsky.embed.images", images };
    } else {
      const pdsHost = new URL(s.pds).host;
      const sa = await fetch(
        `${s.pds}/xrpc/com.atproto.server.getServiceAuth?aud=${encodeURIComponent(`did:web:${pdsHost}`)}&lxm=com.atproto.repo.uploadBlob&exp=${Math.floor(Date.now() / 1000) + 1800}`,
        { headers: auth },
      );
      const saj = (await sa.json()) as { token?: string; message?: string };
      if (!sa.ok || !saj.token) throw new Error(`Bluesky video auth failed: ${saj.message ?? sa.status}`);
      log("Uploading video to Bluesky…");
      const upl = await fetch(`https://video.bsky.app/xrpc/app.bsky.video.uploadVideo?did=${encodeURIComponent(s.did)}&name=${encodeURIComponent(`${post.id}.mp4`)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${saj.token}`, "content-type": "video/mp4" },
        body: await fsp.readFile(file),
      });
      const uj = (await upl.json()) as { jobId?: string; jobStatus?: { jobId?: string }; error?: string; message?: string };
      const jobId = uj.jobId ?? uj.jobStatus?.jobId;
      if (!jobId) throw new Error(`Bluesky upload failed: ${uj.message ?? uj.error ?? upl.status}`);
      let blob: unknown;
      for (let i = 0; i < 90 && !blob; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const st = await fetch(`https://video.bsky.app/xrpc/app.bsky.video.getJobStatus?jobId=${encodeURIComponent(jobId)}`, { headers: auth });
        const sj = (await st.json()) as { jobStatus?: { state?: string; blob?: unknown; error?: string } };
        if (sj.jobStatus?.state === "JOB_STATE_FAILED") throw new Error(`Bluesky processing failed: ${sj.jobStatus.error ?? "unknown"}`);
        blob = sj.jobStatus?.blob;
      }
      if (!blob) throw new Error("Bluesky video processing timed out.");
      const dims = ({ "9:16": [1080, 1920], "3:4": [1080, 1440], "4:5": [1080, 1350], "1:1": [1080, 1080], "16:9": [1920, 1080] } as Record<string, number[]>)[video.spec.aspect] ?? [1080, 1920];
      embed = { $type: "app.bsky.embed.video", video: blob, aspectRatio: { width: dims[0], height: dims[1] }, alt: video.spec.title };
    }
    const cr = await fetch(`${s.pds}/xrpc/com.atproto.repo.createRecord`, {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ repo: s.did, collection: "app.bsky.feed.post", record: { $type: "app.bsky.feed.post", text, createdAt: new Date().toISOString(), embed, langs: ["en"] } }),
    });
    const cj = (await cr.json()) as { uri?: string; message?: string };
    if (!cr.ok || !cj.uri) return [fail("bluesky", `Bluesky post failed: ${cj.message ?? cr.status}`)];
    const rkey = cj.uri.split("/").pop();
    return [ok("bluesky", { url: `https://bsky.app/profile/${s.handle}/post/${rkey}`, mode: "published" })];
  },
};

// ── Webhook (n8n / Zapier / Make / your own server) ─────────────────────────────

const webhook: Publisher = {
  id: "webhook",
  label: "Webhook",
  blurb: "POSTs the post (captions, platforms, file path and local URL) to your automation (n8n, Make, your server).",
  platforms: ["tiktok", "instagram", "youtube", "x", "linkedin", "threads", "facebook", "pinterest", "bluesky"],
  ready: async () => ((await getSecret("webhookUrl")) ? { ok: true } : { ok: false, reason: "Add a webhook URL in Settings → Connect accounts." }),
  async publish({ post, video, project, file, slides }) {
    const url = await getSecret("webhookUrl");
    if (!url) throw new Error("No webhook URL.");
    const base = `http://127.0.0.1:${process.env.PORT ?? 4747}/api/media/${project.id}`;
    const body = {
      event: "shipreel.post",
      post,
      project: { id: project.id, name: project.name },
      video: { id: video.id, title: video.spec.title, kind: video.spec.kind, file, url: `${base}/${video.render?.file}`, slides },
      captions: Object.fromEntries(post.platforms.map((p) => [p, captionFor(post, video, p)])),
    };
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) return post.platforms.map((p) => fail(p, `Webhook returned ${res.status}`));
    // Automations can answer with {"urls": {"tiktok": "https://…"}} so the Calendar links to the live posts.
    const reply = (await res.json().catch(() => ({}))) as { urls?: Partial<Record<Platform, string>> };
    return post.platforms.map((p) => ok(p, { mode: "published", url: reply.urls?.[p] }));
  },
};

// ── Manual handoff (always works) ───────────────────────────────────────────────

const manual: Publisher = {
  id: "manual",
  label: "Manual handoff",
  blurb: "Shipreel renders, writes the captions and reminds you; you upload in 30 seconds. No accounts needed.",
  platforms: ["tiktok", "instagram", "youtube", "x", "linkedin", "threads", "facebook", "pinterest", "bluesky"],
  ready: async () => ({ ok: true }),
  async publish({ post, video }) {
    // A Mac notification so the handoff isn't missed (the Calendar has the file and captions ready).
    if (process.platform === "darwin") {
      const title = video.spec.title.replace(/["\\]/g, "").slice(0, 80);
      run("osascript", ["-e", `display notification "${title}" with title "Shipreel: time to post" subtitle "${post.platforms.join(", ")} · file and captions are ready" sound name "Glass"`]).catch(() => undefined);
    }
    return post.platforms.map((p) => ({ platform: p, ok: false, mode: "manual" as const, error: "Waiting for you to upload", at: now() }));
  },
};

// ── Claude in Chrome (opt-in): Claude Code uploads through TikTok Studio in your Chrome ─

const claudeChrome: Publisher = {
  id: "claude-chrome",
  label: "Claude in Chrome (experimental)",
  blurb: "Claude Code opens TikTok Studio in your logged-in Chrome and uploads for you. TikTok's terms restrict automated posting, so this is opt-in and at your own risk.",
  platforms: ["tiktok"],
  ready: async () => ((await getSettings()).allowBrowserPosting ? { ok: true } : { ok: false, reason: "Experimental. Turn it on in Settings → Connect accounts first." }),
  async publish({ post, video, project, file, log }) {
    // Chrome extension uploads cap at ~10 MB: make an HEVC upload copy if needed.
    let upload = file;
    const size = fs.statSync(file).size;
    if (size > 9.5e6) {
      upload = path.join(paths.renders(project.id), `${video.id}_tiktok.mp4`);
      const dur = video.render?.durationSec || 15;
      const kbps = Math.floor(((9.0 * 8 * 1024 * 1024 - 160000 * dur) / dur / 1000) * 0.97);
      log(`Compressing to ${kbps} kbps HEVC for the browser upload…`);
      await run("ffmpeg", ["-v", "error", "-y", "-i", file, "-c:v", "libx265", "-preset", "fast", "-b:v", `${kbps}k`, "-tag:v", "hvc1", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", upload]);
    }
    const caption = captionFor(post, video, "tiktok");
    const r = await startRun({
      kind: "post",
      engine: "claude",
      projectId: project.id,
      title: `Post to TikTok: ${video.spec.title.slice(0, 40)}`,
      chrome: true,
      prompt: `Upload a video to TikTok using TikTok Studio in the user's Chrome (Claude in Chrome tools). Read-only everywhere except this one upload.
1. Load the Chrome tools, call tabs_context_mcp, open a NEW tab at https://www.tiktok.com/tiktokstudio/upload .
2. If the page shows a login screen, stop and report "not logged in".
3. Find the input[type=file] (accept video/*) and upload this file: ${upload}
4. When the editor appears, replace the caption with exactly:\n${caption}\n
5. ${post.asDraft ? 'Click "Save draft" (do NOT post).' : 'Wait for the checks to say "No issues found", then click Post.'}
6. Confirm success, then close your tab. Never like, follow, comment or change settings.
Reply with JSON only: {"ok": true|false, "detail": "what happened"}`,
      schema: { type: "object", properties: { ok: { type: "boolean" }, detail: { type: "string" } }, required: ["ok", "detail"], additionalProperties: false },
    });
    log(`Claude run ${r.id} started (watch it in Agents).`);
    const done = await waitForRun(r.id, 20 * 60_000);
    const summary = done.summary ?? "";
    let parsed: { ok?: boolean; detail?: string } = {};
    try {
      parsed = JSON.parse(summary);
    } catch {
      /* text */
    }
    if (done.status === "done" && parsed.ok !== false) return [ok("tiktok", { mode: post.asDraft ? "draft" : "published" })];
    return [fail("tiktok", parsed.detail ?? done.error ?? "Claude couldn't finish the upload")];
  },
};

// ── Upload in Chrome (Shipreel's own Chrome window; no API key) ──────────────────

const CHROME_APPS = ["/Applications/Google Chrome.app", path.join(process.env.HOME ?? "", "Applications", "Google Chrome.app")];

const browser: Publisher = {
  id: "browser",
  label: "Upload in Chrome",
  blurb: "Shipreel opens the upload page in its own Chrome window (you log in once), attaches the video and fills the caption, then stops so you press Post. No API key.",
  platforms: ["tiktok", "youtube", "instagram", "x"],
  ready: async () => (process.platform !== "darwin" || CHROME_APPS.some((a) => fs.existsSync(a)) ? { ok: true } : { ok: false, reason: "Install Google Chrome (google.com/chrome) to upload through it." }),
  async publish({ post, video, project, file, log }) {
    const settings = await getSettings();
    const results: PostResult[] = [];
    // One platform at a time: each one gets its own tab in the same window.
    for (const p of post.platforms) {
      if (!isBrowserPlatform(p)) {
        results.push({ platform: p, ok: false, mode: "manual", error: "Chrome uploads cover TikTok, YouTube, Instagram and X. Post this one from the post kit.", at: now() });
        continue;
      }
      const autoPost = post.autoPost ?? !!settings.browserAutoPost?.[p];
      log(`${browserSiteLabel(p)}: ${autoPost ? "uploading and posting" : "filling in the upload (you press Post)"}…`);
      const out = await browserUpload({
        platform: p,
        file,
        caption: captionFor(post, video, p),
        title: captionFor(post, video, "youtube"),
        description: captionFor(post, video, "instagram"),
        autoPost,
        profileDir: paths.browserProfile(),
        screenshotDir: paths.uploads(project.id),
        log: (l) => log(`${browserSiteLabel(p)}: ${l}`),
      });
      const screenshot = out.screenshot ? path.relative(paths.project(project.id), out.screenshot) : undefined;
      if (out.status === "posted") results.push(ok(p, { mode: "published", url: out.url }));
      else if (out.status === "failed") results.push({ ...fail(p, out.detail), screenshot });
      else results.push({ platform: p, ok: false, mode: "manual", error: out.detail, at: now() });
    }
    if (process.platform === "darwin" && results.some((r) => r.mode === "manual")) {
      const title = video.spec.title.replace(/["\\]/g, "").slice(0, 80);
      run("osascript", ["-e", `display notification "${title}" with title "Shipreel: ready in Chrome" subtitle "Check it and press Post" sound name "Glass"`]).catch(() => undefined);
    }
    return results;
  },
};

// ── Postbox (local daemon; posts through the user's own Chrome) ───────────────────

const postboxHandoff: NonNullable<Publisher["handoff"]> = async ({ post, video, file, log }) => {
  const platforms = POSTBOX_PLATFORMS.filter((p) => post.platforms.includes(p));
  if (!platforms.length) throw new Error(`Postbox posts to ${POSTBOX_PLATFORMS.join(", ")}.`);
  const c = postboxCaptions(post, video, captionFor);
  // Postbox holds scheduled posts itself (and fires them within 30 s), so Shipreel needn't be running then.
  const later = new Date(post.scheduledAt).getTime() > Date.now() + 60_000;
  const pbPost = await postboxSubmit({
    file,
    platforms,
    captions: { tiktok: c.tiktok, instagram: c.instagram, youtube: c.youtube },
    title: c.title,
    scheduleAt: later ? post.scheduledAt : undefined,
    dryRun: post.postbox?.dryRun,
  });
  log(`Handed to Postbox (post ${pbPost.id}${pbPost.dryRun ? ", dry run" : ""})${later ? `; it posts at ${new Date(post.scheduledAt).toLocaleString()}` : ""}. ${POSTBOX_URL}`);
  const skipped = post.platforms.filter((p) => !POSTBOX_PLATFORMS.includes(p as never));
  const m = mapPostbox(pbPost);
  const results = [...m.results, ...skipped.map((p) => ({ platform: p, ok: false, mode: "manual" as const, error: "Postbox posts to TikTok, YouTube and Instagram. Post this one from the post kit.", at: now() }))];
  return { externalId: pbPost.id, external: pbPost, status: m.status, results };
};

const postbox: Publisher = {
  id: "postbox",
  label: "Postbox (auto-post)",
  blurb: "Recommended. Your local Postbox posts to TikTok, YouTube and Instagram through your own logged-in Chrome, and holds scheduled posts even when Shipreel is closed.",
  platforms: POSTBOX_PLATFORMS,
  ready: postboxReady,
  handoff: postboxHandoff,
  async publish(ctx) {
    const h = await postboxHandoff(ctx);
    let cur = h.external;
    for (let i = 0; i < 120 && (cur.status === "queued" || cur.status === "running"); i++) {
      await new Promise((r) => setTimeout(r, 5000));
      cur = await postboxGet(h.externalId);
    }
    return mapPostbox(cur).results;
  },
};

// ── Connection tests (Settings → Connect accounts) ──────────────────────────────

/** Calls Upload-Post with the saved key and reports which platforms each profile has linked. */
export async function testUploadPost(): Promise<{ ok: boolean; message: string; profiles: { username: string; platforms: string[] }[]; platforms: string[] }> {
  const key = await getSecret("uploadPostKey");
  if (!key) return { ok: false, message: "Paste your Upload-Post API key first.", profiles: [], platforms: [] };
  try {
    const j = await upFetch("/uploadposts/users", { method: "GET", key });
    const raw = (j.profiles as { username: string; social_accounts?: Record<string, unknown> }[]) ?? [];
    const linked = (v: unknown) => !!v && (typeof v !== "object" || Object.keys(v as object).length > 0);
    const profiles = raw.map((p) => ({ username: p.username, platforms: Object.entries(p.social_accounts ?? {}).filter(([, v]) => linked(v)).map(([k]) => k) }));
    const want = (await getSecret("uploadPostUser")) || "shipreel";
    const mine = profiles.find((p) => p.username === want);
    const platforms = mine?.platforms ?? [];
    const message = !profiles.length
      ? "The key works. Press Connect accounts to link your socials."
      : !mine
        ? `The key works, but there's no "${want}" profile yet. Press Connect accounts to create it and link your socials.`
        : platforms.length
          ? `Connected: ${platforms.join(", ")}.`
          : `The key works and the "${want}" profile exists, but no accounts are linked yet. Press Connect accounts.`;
    return { ok: true, message, profiles, platforms };
  } catch (e) {
    const m = (e as Error).message;
    return { ok: false, message: /40[13]/.test(m) ? "Upload-Post didn't accept that key. Copy it again from upload-post.com → API Keys." : m, profiles: [], platforms: [] };
  }
}

/** Logs in to Bluesky with the saved handle and app password (no post). */
export async function testBluesky(): Promise<{ ok: boolean; message: string; handle?: string }> {
  try {
    const s = await bskySession();
    return { ok: true, message: `Logged in as @${s.handle}.`, handle: s.handle };
  } catch (e) {
    const m = (e as Error).message;
    return { ok: false, message: /AuthenticationRequired|Invalid identifier or password|401/i.test(m) ? "Bluesky didn't accept that handle and app password. Make a new app password in Bluesky → Settings → Privacy and security → App passwords." : m };
  }
}

export const PUBLISHERS: Record<ProviderId, Publisher> = {
  postbox,
  "upload-post": uploadPost,
  ayrshare: { ...webhook, id: "ayrshare", label: "Ayrshare (via webhook)" },
  bluesky,
  webhook,
  manual,
  "claude-chrome": claudeChrome,
  browser,
};

export const PUBLISHER_LIST = [postbox, uploadPost, bluesky, browser, manual, webhook, claudeChrome];
