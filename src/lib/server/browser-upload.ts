/**
 * Assisted browser uploads: Shipreel drives its own Google Chrome window (playwright-core, channel
 * "chrome") with a persistent profile in the workspace, so you log in to TikTok / YouTube / Instagram
 * / X once and stay logged in. It opens the upload page, attaches the MP4, fills the caption and
 * STOPS before the final Post button unless you opted in to auto-posting for that platform.
 *
 * It never solves captchas or 2FA: if a login is needed it leaves the window open, waits a few
 * minutes for you to log in, and reports "needs-login" if you don't.
 *
 * Kept free of Next-only imports so it can be exercised from plain Node.
 */
import fs from "node:fs";
import path from "node:path";
import type { BrowserContext, Locator, Page } from "playwright-core";

export type BrowserPlatform = "tiktok" | "youtube" | "instagram" | "x";
export const BROWSER_PLATFORMS: BrowserPlatform[] = ["tiktok", "youtube", "instagram", "x"];
export const isBrowserPlatform = (p: string): p is BrowserPlatform => (BROWSER_PLATFORMS as string[]).includes(p);

export type UploadInput = {
  platform: BrowserPlatform;
  file: string;
  caption: string;
  /** YouTube title (≤100 chars) and description. */
  title?: string;
  description?: string;
  /** Press the final Post/Publish button. Default false: stop so the person confirms. */
  autoPost?: boolean;
  profileDir: string;
  /** Where failure screenshots go. */
  screenshotDir: string;
  log?: (line: string) => void;
  /** How long to wait for the person to log in before giving up (ms). */
  loginWaitMs?: number;
};

export type UploadOutcome = {
  status: "ready" | "posted" | "needs-login" | "failed";
  detail: string;
  url?: string;
  /** Absolute path of a screenshot taken when something went wrong. */
  screenshot?: string;
};

const SITES: Record<BrowserPlatform, { label: string; upload: string; login: string; cookie: { domain: string; names: string[] } }> = {
  tiktok: { label: "TikTok", upload: "https://www.tiktok.com/tiktokstudio/upload?from=webapp", login: "https://www.tiktok.com/login", cookie: { domain: "tiktok.com", names: ["sessionid", "sessionid_ss"] } },
  youtube: {
    label: "YouTube",
    upload: "https://www.youtube.com/upload",
    login: "https://accounts.google.com/ServiceLogin?service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2Fupload",
    cookie: { domain: "youtube.com", names: ["SID", "__Secure-3PSID", "LOGIN_INFO"] },
  },
  instagram: { label: "Instagram", upload: "https://www.instagram.com/", login: "https://www.instagram.com/accounts/login/", cookie: { domain: "instagram.com", names: ["sessionid"] } },
  x: { label: "X", upload: "https://x.com/compose/post", login: "https://x.com/i/flow/login", cookie: { domain: "x.com", names: ["auth_token"] } },
};

export const browserSiteLabel = (p: BrowserPlatform) => SITES[p].label;

// ── The Chrome window (one persistent context, shared by every upload) ─────────────

type G = { __shipreelChrome?: { dir: string; ctx: Promise<BrowserContext> } };
const g = globalThis as unknown as G;

export class FriendlyError extends Error {}

function friendly(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/distribution 'chrome' is not found|Executable doesn't exist|chrome.*not found/i.test(m)) return "Google Chrome isn't installed. Install it from google.com/chrome, then try again.";
  if (/ProcessSingleton|profile.*in use|user data directory is already in use/i.test(m)) return "The Shipreel Chrome window is already open in another Shipreel process. Close that window and try again.";
  if (/Target page, context or browser has been closed|Browser has been closed|Target closed/i.test(m)) return "The Chrome window was closed before the upload finished.";
  return m.split("\n")[0].slice(0, 400);
}

export async function browserContext(profileDir: string): Promise<BrowserContext> {
  const cur = g.__shipreelChrome;
  if (cur && cur.dir === profileDir) {
    // The context's "close" event clears this when the window is closed, so a hit is a live window.
    try {
      return await cur.ctx;
    } catch {
      /* the last launch failed: try again */
    }
  }
  fs.mkdirSync(profileDir, { recursive: true });
  const launch = (async () => {
    const { chromium } = await import("playwright-core");
    const ctx = await chromium.launchPersistentContext(profileDir, {
      channel: "chrome",
      headless: false,
      viewport: null,
      acceptDownloads: false,
      // Keep it a normal-looking Chrome window you can log in to yourself (no "controlled by
      // automated software" bar). Shipreel never types passwords or solves captchas.
      ignoreDefaultArgs: ["--enable-automation"],
      args: ["--no-first-run", "--no-default-browser-check", "--window-size=1280,900"],
    });
    ctx.on("close", () => {
      if (g.__shipreelChrome?.dir === profileDir) g.__shipreelChrome = undefined;
    });
    return ctx;
  })();
  g.__shipreelChrome = { dir: profileDir, ctx: launch };
  try {
    return await launch;
  } catch (e) {
    g.__shipreelChrome = undefined;
    throw new FriendlyError(friendly(e));
  }
}

/** Is there a session cookie for this site in the Shipreel profile? */
export async function loggedIn(ctx: BrowserContext, platform: BrowserPlatform): Promise<boolean> {
  const { domain, names } = SITES[platform].cookie;
  const cookies = await ctx.cookies();
  const now = Date.now() / 1000;
  return cookies.some((c) => c.domain.replace(/^\./, "").endsWith(domain) && names.includes(c.name) && !!c.value && (c.expires === -1 || c.expires > now));
}

/** Open the Shipreel Chrome window with a login tab for each site you're not logged in to yet. */
export async function openLoginWindow(profileDir: string, platforms: BrowserPlatform[] = BROWSER_PLATFORMS): Promise<Record<BrowserPlatform, boolean>> {
  const ctx = await browserContext(profileDir);
  const status = {} as Record<BrowserPlatform, boolean>;
  for (const p of platforms) status[p] = await loggedIn(ctx, p);
  const missing = platforms.filter((p) => !status[p]);
  const blank = ctx.pages().find((pg) => pg.url() === "about:blank");
  for (const [i, p] of missing.entries()) {
    const page = i === 0 && blank ? blank : await ctx.newPage();
    await page.goto(SITES[p].login, { waitUntil: "domcontentloaded" }).catch(() => undefined);
  }
  if (!missing.length) {
    const page = blank ?? (await ctx.newPage());
    await page.setContent(`<title>Shipreel</title><body style="font:16px -apple-system;padding:40px;background:#111;color:#eee">You're logged in to ${platforms.map((p) => SITES[p].label).join(", ")} in this window. You can close it.</body>`);
  }
  await ctx.pages()[0]?.bringToFront().catch(() => undefined);
  return status;
}

export async function closeBrowser(): Promise<void> {
  const cur = g.__shipreelChrome;
  g.__shipreelChrome = undefined;
  if (cur) await (await cur.ctx.catch(() => null))?.close().catch(() => undefined);
}

// ── Page helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function visible(loc: Locator, timeout: number): Promise<boolean> {
  try {
    await loc.first().waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

async function attached(loc: Locator, timeout: number): Promise<boolean> {
  try {
    await loc.first().waitFor({ state: "attached", timeout });
    return true;
  } catch {
    return false;
  }
}

/** Replace the text of a contenteditable (Draft.js / Lexical / YouTube textbox) like a person would. */
async function setRichText(page: Page, loc: Locator, text: string) {
  const el = loc.first();
  await el.scrollIntoViewIfNeeded().catch(() => undefined);
  await el.click();
  await page.keyboard.press("Meta+A");
  await page.keyboard.press("Backspace");
  await sleep(150);
  await page.keyboard.insertText(text);
  await sleep(300);
}

async function waitEnabled(loc: Locator, timeout: number): Promise<boolean> {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try {
      const el = loc.first();
      if ((await el.isVisible()) && (await el.isEnabled()) && (await el.getAttribute("aria-disabled")) !== "true" && (await el.getAttribute("data-disabled")) !== "true") return true;
    } catch {
      /* not there yet */
    }
    await sleep(1000);
  }
  return false;
}

/** Outline the button the person should press, and bring the window forward. */
async function point(page: Page, loc: Locator) {
  await page.bringToFront().catch(() => undefined);
  const el = loc.first();
  await el.scrollIntoViewIfNeeded().catch(() => undefined);
  await el
    .evaluate((n: HTMLElement) => {
      n.style.outline = "3px solid #c6f432";
      n.style.outlineOffset = "3px";
      n.style.borderRadius = n.style.borderRadius || "8px";
    })
    .catch(() => undefined);
}

async function clickIfVisible(loc: Locator, timeout = 1500): Promise<boolean> {
  if (!(await visible(loc, timeout))) return false;
  await loc.first().click().catch(() => undefined);
  return true;
}

class Step extends Error {}

// ── Platform flows ───────────────────────────────────────────────────────────────

type Flow = (page: Page, input: UploadInput, log: (l: string) => void) => Promise<UploadOutcome>;

const tiktok: Flow = async (page, { file, caption, autoPost }, log) => {
  const input = page.locator('input[type="file"]');
  if (!(await attached(input, 45_000))) throw new Step("TikTok Studio's upload box didn't appear.");
  log("Attaching the video…");
  await input.first().setInputFiles(file);
  const editor = page.locator('.public-DraftEditor-content, div[contenteditable="true"][role="combobox"], div[contenteditable="true"]');
  if (!(await visible(editor, 90_000))) throw new Step("TikTok's caption box didn't appear after attaching the video.");
  log("Writing the caption…");
  await setRichText(page, editor, caption);
  // Close the #hashtag / @mention suggestion list if it opened.
  await page.locator("body").click({ position: { x: 5, y: 5 } }).catch(() => undefined);
  const postBtn = page.locator('button[data-e2e="post_video_button"]').or(page.getByRole("button", { name: /^Post$/ }));
  log("Waiting for TikTok to finish uploading…");
  if (!(await waitEnabled(postBtn, 6 * 60_000))) throw new Step("TikTok's Post button never became ready (the upload may still be processing).");
  if (!autoPost) {
    await point(page, postBtn);
    return { status: "ready", detail: "Ready in TikTok Studio: check the caption, add anything you like, then press Post." };
  }
  log("Pressing Post…");
  await postBtn.first().click();
  // "Continue to post?" check prompts.
  await clickIfVisible(page.getByRole("button", { name: /^Post now$/ }), 4000);
  const done = await Promise.race([
    page.waitForURL(/tiktokstudio\/content/, { timeout: 120_000 }).then(() => true),
    visible(page.getByText(/(video|post) (has been|is being) (uploaded|published|posted)|Manage your posts/i), 120_000),
  ]).catch(() => false);
  if (!done) throw new Step("Pressed Post, but TikTok didn't confirm. Check the window.");
  return { status: "posted", detail: "Posted on TikTok." };
};

const youtube: Flow = async (page, { file, title, description, caption, autoPost }, log) => {
  const input = page.locator('input[type="file"]');
  if (!(await attached(input, 45_000))) throw new Step("YouTube Studio's upload dialog didn't appear.");
  log("Attaching the video…");
  await input.first().setInputFiles(file);
  const titleBox = page.locator('#title-textarea #textbox, ytcp-social-suggestions-textbox#title-textarea [contenteditable="true"]');
  if (!(await visible(titleBox, 90_000))) throw new Step("YouTube's title box didn't appear after attaching the video.");
  log("Writing the title and description…");
  await setRichText(page, titleBox, (title || caption).slice(0, 100));
  const descBox = page.locator('#description-textarea #textbox, ytcp-social-suggestions-textbox#description-textarea [contenteditable="true"]');
  if (await visible(descBox, 5000)) await setRichText(page, descBox, (description || caption).slice(0, 4900));
  // Audience: "No, it's not made for kids" (required before Next works).
  await clickIfVisible(page.locator('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"], [name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]'), 8000);
  for (let i = 0; i < 3; i++) {
    const next = page.locator("#next-button");
    if (!(await waitEnabled(next, 20_000))) throw new Step(`YouTube's Next button wasn't available (step ${i + 1}).`);
    await next.first().click();
    await sleep(1200);
  }
  log("Setting visibility to Public…");
  if (!(await clickIfVisible(page.locator('tp-yt-paper-radio-button[name="PUBLIC"], [name="PUBLIC"]'), 15_000))) throw new Step("Couldn't find YouTube's Public option.");
  const publish = page.locator("#done-button");
  if (!(await waitEnabled(publish, 6 * 60_000))) throw new Step("YouTube's Publish button never became ready.");
  if (!autoPost) {
    await point(page, publish);
    return { status: "ready", detail: "Ready in YouTube Studio (Public): check it and press Publish." };
  }
  log("Pressing Publish…");
  await publish.first().click();
  const link = page.locator('ytcp-video-share-dialog a[href*="youtu"], a.ytcp-video-info[href*="youtu"]');
  if (!(await visible(link, 120_000))) throw new Step("Pressed Publish, but YouTube didn't confirm. Check the window.");
  return { status: "posted", detail: "Published on YouTube.", url: (await link.first().getAttribute("href")) ?? undefined };
};

const instagram: Flow = async (page, { file, caption, autoPost }, log) => {
  // Sidebar "Create" (+) → sometimes a small menu → "Post".
  const create = page.locator('svg[aria-label="New post"], svg[aria-label="Create"]');
  if (!(await visible(create, 30_000))) throw new Step("Couldn't find Instagram's Create (+) button.");
  await create.first().click();
  await clickIfVisible(page.locator('svg[aria-label="Post"]').locator("xpath=ancestor::*[@role='link' or @role='button' or self::a][1]"), 2500);
  const input = page.locator('input[type="file"]');
  if (!(await attached(input, 20_000))) throw new Step("Instagram's file picker didn't appear.");
  log("Attaching the video…");
  await input.first().setInputFiles(file);
  // "Video posts are now shared as reels" notice.
  await clickIfVisible(page.getByRole("button", { name: /^OK$/ }), 8000);
  for (let i = 0; i < 2; i++) {
    const next = page.getByRole("button", { name: /^Next$/ });
    if (!(await visible(next, 60_000))) throw new Step(`Instagram's Next button didn't appear (step ${i + 1}).`);
    await next.first().click();
    await sleep(1200);
  }
  const box = page.locator('div[aria-label="Write a caption..."][contenteditable="true"], div[contenteditable="true"][role="textbox"]');
  if (!(await visible(box, 30_000))) throw new Step("Instagram's caption box didn't appear.");
  log("Writing the caption…");
  await setRichText(page, box, caption);
  const share = page.getByRole("button", { name: /^Share$/ });
  if (!(await visible(share, 15_000))) throw new Step("Couldn't find Instagram's Share button.");
  if (!autoPost) {
    await point(page, share);
    return { status: "ready", detail: "Ready on Instagram: check the reel and caption, then press Share." };
  }
  log("Pressing Share…");
  await share.first().click();
  if (!(await visible(page.getByText(/reel has been shared|post has been shared|Reel shared/i), 4 * 60_000))) throw new Step("Pressed Share, but Instagram didn't confirm. Check the window.");
  return { status: "posted", detail: "Shared on Instagram." };
};

const x: Flow = async (page, { file, caption, autoPost }, log) => {
  const input = page.locator('input[data-testid="fileInput"], input[type="file"]');
  if (!(await attached(input, 30_000))) throw new Step("X's composer didn't appear.");
  log("Attaching the video…");
  await input.first().setInputFiles(file);
  const box = page.locator('[data-testid="tweetTextarea_0"]');
  if (!(await visible(box, 30_000))) throw new Step("X's text box didn't appear.");
  log("Writing the post…");
  await setRichText(page, box, caption);
  const btn = page.locator('[data-testid="tweetButton"]');
  log("Waiting for X to process the video…");
  if (!(await waitEnabled(btn, 6 * 60_000))) throw new Step("X's Post button never became ready (the video may still be processing).");
  if (!autoPost) {
    await point(page, btn);
    return { status: "ready", detail: "Ready on X: check it and press Post." };
  }
  log("Pressing Post…");
  await btn.first().click();
  if (!(await visible(page.getByText(/Your post was sent/i), 120_000))) throw new Step("Pressed Post, but X didn't confirm. Check the window.");
  return { status: "posted", detail: "Posted on X." };
};

const FLOWS: Record<BrowserPlatform, Flow> = { tiktok, youtube, instagram, x };

// ── Entry point ──────────────────────────────────────────────────────────────────

export async function browserUpload(input: UploadInput): Promise<UploadOutcome> {
  const log = input.log ?? (() => undefined);
  const site = SITES[input.platform];
  if (!fs.existsSync(input.file)) return { status: "failed", detail: `The video file is missing: ${input.file}` };
  let page: Page | undefined;
  try {
    const ctx = await browserContext(input.profileDir);
    page = await ctx.newPage();
    await page.bringToFront().catch(() => undefined);
    if (!(await loggedIn(ctx, input.platform))) {
      log(`Not logged in to ${site.label} yet: log in in the Shipreel Chrome window (only needed once).`);
      await page.goto(site.login, { waitUntil: "domcontentloaded" }).catch(() => undefined);
      const end = Date.now() + (input.loginWaitMs ?? 5 * 60_000);
      while (!(await loggedIn(ctx, input.platform))) {
        if (Date.now() > end) return { status: "needs-login", detail: `Log in to ${site.label} in the Shipreel Chrome window, then try again. The window stays open.` };
        await sleep(2000);
      }
      log(`Logged in to ${site.label}.`);
      await sleep(1500);
    }
    log(`Opening ${site.label}…`);
    await page.goto(site.upload, { waitUntil: "domcontentloaded", timeout: 60_000 });
    return await FLOWS[input.platform](page, input, log);
  } catch (e) {
    let screenshot: string | undefined;
    if (page && !page.isClosed()) {
      try {
        fs.mkdirSync(input.screenshotDir, { recursive: true });
        screenshot = path.join(input.screenshotDir, `${input.platform}-${Date.now()}.png`);
        await page.screenshot({ path: screenshot, timeout: 10_000 });
      } catch {
        screenshot = undefined;
      }
    }
    // An expired session lands on a login page: that's a login, not a broken upload.
    if (page && !page.isClosed() && /\/login|\/signin|accounts\.google\.|\/i\/flow\/login|\/accounts\/login|redirect_after_login|[?&]mode=login/i.test(page.url()))
      return { status: "needs-login", detail: `Log in to ${site.label} in the Shipreel Chrome window, then try again. The window stays open.`, screenshot };
    const detail = e instanceof Step || e instanceof FriendlyError ? e.message : friendly(e);
    return { status: "failed", detail: `${detail}${page && !page.isClosed() ? " The window is left open so you can finish by hand." : ""}`, screenshot };
  }
}
