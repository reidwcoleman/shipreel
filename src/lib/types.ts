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
  status: PostStatus;
  results: PostResult[];
  log: string[];
  /** Performance, entered by hand, from a screenshot (agent) or a provider. */
  metrics?: PostMetrics;
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

export type ProviderId = "upload-post" | "ayrshare" | "bluesky" | "webhook" | "claude-chrome" | "manual";

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
  output?: { ideaIds?: string[]; videoId?: string; projectId?: string };
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
  | { type: "post"; post: Post }
  | { type: "project"; projectId: string }
  | { type: "ideas"; projectId: string }
  | { type: "videos"; projectId: string };
