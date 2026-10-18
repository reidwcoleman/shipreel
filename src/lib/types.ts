/**
 * Shared data model (client + server). Everything persists as JSON under the workspace folder,
 * so Claude/Codex can read and edit it directly — that's the framework.
 */
import type { FontId, Platform, VideoSpec } from "@/remotion/spec";

export type { Platform } from "@/remotion/spec";

export type Persona = { name: string; description: string };
export type Feature = { name: string; benefit: string; wow?: string };

export type Project = {
  id: string;
  name: string;
  tagline: string;
  oneLiner: string;
  category: string;
  platforms: string[];
  stage: "idea" | "beta" | "launched";
  audience: Persona[];
  pains: string[];
  outcomes: string[];
  features: Feature[];
  differentiators: string[];
  proof: string[];
  tone: string;
  brand: { accent: string; bg: string; fg: string; font?: FontId; logo?: string };
  links: { website?: string; appStore?: string; playStore?: string; repoPath?: string };
  cta: { action: "link-in-bio" | "app-store" | "google-play" | "search" | "url" | "comment"; text: string };
  keywords: string[];
  hashtags: string[];
  competitors: string[];
  price?: string;
  notes?: string;
  /** Screenshots / recordings imported for this project (asset file names). */
  screenshots: string[];
  analyzedBy?: "claude" | "codex" | "import" | "manual";
  createdAt: string;
  updatedAt: string;
};

export type IdeaStatus = "new" | "liked" | "passed" | "made";

export type Idea = {
  id: string;
  formatId: string;
  hook: string;
  angle: string;
  beats: string[];
  platforms: Platform[];
  soundId?: string;
  caption?: string;
  hashtags?: string[];
  score: number;
  scoreNotes: string[];
  status: IdeaStatus;
  source: "instant" | "claude" | "codex";
  videoId?: string;
  createdAt: string;
};

export type VideoStatus = "draft" | "queued" | "rendering" | "rendered" | "failed";

export type RenderInfo = {
  file: string; // relative to the project folder, e.g. renders/<id>.mp4
  thumb?: string;
  slides?: string[]; // stills for photo-mode carousels
  durationSec: number;
  sizeBytes: number;
  renderedAt: string;
  specHash: string;
};

export type VideoDoc = {
  id: string;
  projectId: string;
  spec: VideoSpec;
  status: VideoStatus;
  progress?: number;
  error?: string;
  render?: RenderInfo;
  source: "template" | "claude" | "codex" | "manual";
  createdAt: string;
  updatedAt: string;
  /** Review & auto-post: set once the first render of a new video succeeds (see apps/REVIEW-API.md). */
  review?: Review;
  /** New videos enter Review (pending) when their first render succeeds. */
  reviewOnRender?: boolean;
};

export type ReviewStatus = "pending" | "approved" | "rejected" | "revising";

export type Review = {
  status: ReviewStatus;
  /** The user's change request or reject reason. */
  note?: string;
  /** ISO time of the last status change. */
  at: string;
  /** Shipreel post created on approve. */
  postId?: string;
  /** Agent run applying a "revise" note. */
  runId?: string;
};

export type AssetRole = "screen" | "facecam" | "broll" | "photo" | "logo" | "music";

export type Asset = {
  file: string;
  kind: "video" | "image" | "audio";
  /** What the clip is, so templates pick the right footage (auto-guessed, editable). */
  role?: AssetRole;
  name: string;
  width?: number;
  height?: number;
  durationSec?: number;
  sizeBytes: number;
  thumb?: string;
  createdAt: string;
};

export type PostStatus = "scheduled" | "rendering" | "posting" | "posted" | "partial" | "failed" | "needs-you" | "canceled";

export type PostResult = {
  platform: Platform;
  ok: boolean;
  url?: string;
  error?: string;
  mode?: "published" | "draft" | "manual";
  at: string;
  /** Browser uploads: a screenshot of the page when something went wrong (relative to the project folder). */
  screenshot?: string;
  note?: string;
};

export type Post = {
  id: string;
  projectId: string;
  videoId: string;
  platforms: Platform[];
  captions: Partial<Record<Platform, string>>;
  scheduledAt: string; // ISO
  provider: ProviderId;
  /** Upload to drafts/inbox instead of publishing (so you can add a trending sound in-app). */
  asDraft: boolean;
  /** Browser uploads only: press the final Post button too (otherwise Shipreel stops so you confirm). */
  autoPost?: boolean;
  status: PostStatus;
  results: PostResult[];
  log: string[];
  /** Performance, entered by hand, from a screenshot (agent) or a provider. */
  metrics?: PostMetrics;
  /** Provider "postbox": the post Postbox holds for us, and what we sent it. */
  postbox?: { id?: string; status?: string; dryRun?: boolean; title?: string; captions?: Partial<Record<"tiktok" | "instagram" | "youtube", string>> };
  createdAt: string;
  updatedAt: string;
};

export type PostMetrics = {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  profileVisits?: number;
  linkTaps?: number;
  installs?: number;
  updatedAt: string;
};

export type Verdict = "double-down" | "keep" | "retry" | "drop" | "unknown";

export type ProviderId = "postbox" | "upload-post" | "ayrshare" | "bluesky" | "webhook" | "claude-chrome" | "browser" | "manual";

export type PostingSlot = { platform: Platform; time: string; days: number[] };

export type Settings = {
  activeProjectId?: string;
  timezone: string;
  engine: "claude" | "codex";
  claudeModel?: string;
  codexModel?: string;
  effort?: "low" | "medium" | "high";
  autopilot: boolean;
  defaultProvider: ProviderId;
  defaultPlatforms: Platform[];
  slots: PostingSlot[];
  projectsRoot?: string;
  onboarded: boolean;
  /** Opt-in: let Claude Code drive TikTok Studio in Chrome (against TikTok's automation rules; your risk). */
  allowBrowserPosting?: boolean;
  /** Chrome uploads (provider "browser"): platforms where Shipreel may press Post itself. Off = stop for you. */
  browserAutoPost?: Partial<Record<Platform, boolean>>;
  /** Postbox was made the default service once (so a later choice of yours sticks). */
  postboxDefaulted?: boolean;
  /** Opt-in: AI photos for carousels and AI reaction hook clips through the Higgsfield CLI (costs credits). */
  aiImages?: boolean;
  /** Higgsfield image model for carousel photos (default text2image_soul_v2). */
  aiImageModel?: string;
  /** Most Higgsfield credits Shipreel may spend in total (default 25). */
  aiCreditBudget?: number;
};

export type SecretKey =
  | "uploadPostKey"
  | "uploadPostUser"
  | "ayrshareKey"
  | "blueskyHandle"
  | "blueskyAppPassword"
  | "webhookUrl"
  | "elevenlabsKey"
  | "pexelsKey";

export type SecretsStatus = Record<SecretKey, boolean>;

export type AgentEngine = "claude" | "codex";

export type RunKind = "analyze" | "ideas" | "video" | "edit" | "captions" | "trends" | "chat" | "post";

export type RunEvent = {
  t: number;
  kind: "status" | "text" | "tool" | "tool-result" | "error" | "result";
  text?: string;
  tool?: string;
  detail?: string;
};

export type Run = {
  id: string;
  projectId?: string;
  engine: AgentEngine;
  kind: RunKind;
  title: string;
  status: "running" | "done" | "failed" | "canceled";
  startedAt: string;
  endedAt?: string;
  costUsd?: number;
  summary?: string;
  error?: string;
  /** What the run produced (ids), for linking in the UI. */
  output?: { ideaIds?: string[]; videoId?: string; projectId?: string; postIds?: string[]; notes?: string[] };
};

export type AgentStatus = {
  engine: AgentEngine;
  installed: boolean;
  version?: string;
  path?: string;
  loggedIn?: boolean | null;
  note?: string;
};

/** Events pushed to the UI over /api/events. */
export type ServerEvent =
  | { type: "render"; projectId: string; videoId: string; status: VideoStatus; progress?: number; error?: string }
  | { type: "run"; run: Run }
  | { type: "run-event"; runId: string; event: RunEvent }
  | { type: "post"; post: Post; postId?: string; status?: PostSummary["status"] }
  | { type: "review"; projectId: string; videoId: string; status: ReviewStatus | null }
  | { type: "project"; projectId: string }
  | { type: "ideas"; projectId: string }
  | { type: "videos"; projectId: string };

// ── Posting handoff (post kit, phone, upload pages, Chrome uploads) ───────────────────

/** Everything needed to post a rendered video by hand or through a helper. */
export type PostKit = {
  projectId: string;
  videoId: string;
  title: string;
  /** False when the video has no render yet, or the spec changed since the last render. */
  ready: boolean;
  stale: boolean;
  file?: string;
  url?: string;
  cover?: string;
  coverUrl?: string;
  durationSec?: number;
  sizeBytes?: number;
  captions: Partial<Record<Platform, string>>;
  uploadPages: Partial<Record<Platform, string>>;
  /** Platforms Shipreel can fill in through its own Chrome window. */
  browserPlatforms: Platform[];
  soundTip?: string;
};

export type HandoffAction = "airdrop" | "photos" | "open" | "copy";

// ── Review & auto-post (contract with the Mac app: apps/REVIEW-API.md) ───────────────

export type PostSummary = {
  id: string;
  status: "scheduled" | "posting" | "posted" | "partial" | "failed" | "cancelled" | "needs-you";
  scheduledAt: string;
  platforms: ("tiktok" | "instagram" | "youtube")[];
  results: { platform: string; ok: boolean; url?: string; error?: string; note?: string }[];
  dryRun?: boolean;
};

export type ReviewItem = {
  projectId: string;
  projectName: string;
  appIcon?: string;
  videoId: string;
  title: string;
  hook: string;
  formatId: string;
  formatName: string;
  kind: "video" | "slideshow";
  aspect: VideoSpec["aspect"];
  durationSec: number;
  hookScore?: number;
  mp4Url?: string;
  thumbUrl?: string;
  slideUrls: string[];
  captions: { tiktok: string; instagram: string; youtube: string };
  youtubeTitle: string;
  soundTip?: string;
  review: Review;
  renderStatus: "draft" | "rendering" | "rendered" | "failed";
  renderProgress?: number;
  createdAt: string;
  source: VideoDoc["source"];
  post?: PostSummary;
};

export type PostboxPlatform = "tiktok" | "youtube" | "instagram";

export type PostboxStatus = {
  daemon: boolean;
  extension: boolean | null;
  accounts: { id: PostboxPlatform; name: string; connected: boolean | null }[];
  dashboardUrl: "http://127.0.0.1:4710";
};
