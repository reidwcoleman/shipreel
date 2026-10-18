# Review & auto-post API (contract between the Shipreel server and the Mac app)

Base URL: `http://127.0.0.1:4747` (the Shipreel Next.js server). JSON in and out. Errors: non-2xx with `{ "error": string }`.

The flow: a video gets made (by Claude in the terminal, by the Mac app's Create box, by autopilot or by hand), renders, and lands in **Review** as `pending`. The user watches it in the Mac app and either approves it (it is posted through **Postbox**, the local Chrome-based poster at `http://127.0.0.1:4710`), asks for changes (Claude revises it and it comes back as `pending`), or rejects it.

## Types

```ts
type ReviewStatus = "pending" | "approved" | "rejected" | "revising";

// Added to VideoDoc (src/lib/types.ts)
type Review = {
  status: ReviewStatus;
  note?: string;          // the user's change request or reject reason
  at: string;             // ISO time of the last status change
  postId?: string;        // Shipreel post created on approve
};

type ReviewItem = {
  projectId: string;
  projectName: string;
  appIcon?: string;        // absolute URL of the project's icon, if any
  videoId: string;
  title: string;
  hook: string;
  formatId: string;
  formatName: string;
  kind: "video" | "slideshow";
  aspect: "9:16" | "4:5" | "3:4" | "1:1";
  durationSec: number;
  hookScore?: number;      // 0-100 from the hook linter
  mp4Url?: string;         // absolute URL, playable by AVPlayer (supports Range)
  thumbUrl?: string;       // absolute URL (JPEG)
  slideUrls: string[];     // carousel stills in order (empty for videos)
  captions: { tiktok: string; instagram: string; youtube: string };  // ready to post, hashtags included
  youtubeTitle: string;
  soundTip?: string;
  review: Review;
  renderStatus: "draft" | "rendering" | "rendered" | "failed";
  renderProgress?: number;
  createdAt: string;
  source: "template" | "claude" | "codex" | "manual";
  post?: PostSummary;      // when approved
};

type PostSummary = {
  id: string;
  status: "scheduled" | "posting" | "posted" | "partial" | "failed" | "cancelled" | "needs-you";
  scheduledAt: string;
  platforms: ("tiktok" | "instagram" | "youtube")[];
  results: { platform: string; ok: boolean; url?: string; error?: string; note?: string }[];
  dryRun?: boolean;
};

type PostboxStatus = {
  daemon: boolean;                       // http://127.0.0.1:4710/api/health answers
  extension: boolean | null;             // null = unknown / Chrome extension not connected
  accounts: { id: "tiktok" | "youtube" | "instagram"; name: string; connected: boolean | null }[];
  dashboardUrl: "http://127.0.0.1:4710";
};
```

## Endpoints

| Method & path | Body / query | Returns |
| --- | --- | --- |
| `GET /api/review` | `?status=pending\|approved\|rejected\|revising\|all` (default `pending`), `?projectId=` | `{ items: ReviewItem[], counts: Record<ReviewStatus, number> }` newest first |
| `GET /api/review/:projectId/:videoId` | | `ReviewItem` |
| `POST /api/review/:projectId/:videoId` | `{ action: "approve", platforms?: Platform[], captions?: Partial<captions>, youtubeTitle?, when?: "now" \| "next-slot" \| ISO, dryRun?: boolean }` | `ReviewItem` (with `post`) |
| | `{ action: "revise", note: string }` | `ReviewItem` (`review.status = "revising"`; Claude edits the spec, it re-renders, then flips back to `pending`) |
| | `{ action: "reject", note?: string }` | `ReviewItem` |
| | `{ action: "reopen" }` | back to `pending` |
| `GET /api/postbox` | | `PostboxStatus` (starts the Postbox daemon if it isn't running) |
| `POST /api/postbox/connect` | `{ platform }` | `{ message }` (opens the login page in the user's Chrome) |
| `POST /api/create` | `{ prompt: string, projectId?: string, count?: number (1-10), formats?: string[] }` | `{ runId }`; runs Claude Code headless in the Shipreel folder with the Shipreel MCP server; every video it makes lands in Review as `pending` |
| `GET /api/create/:runId` | | `{ id, status: "running" \| "done" \| "failed", prompt, startedAt, endedAt?, output: string, videoIds: string[] }` |
| `GET /api/create/:runId/stream` | | `text/event-stream`: `event: line` `data: {"text": "..."}` for each output line (terminal style), then `event: done` `data: {"status": "...", "videoIds": [...]}` |
| `POST /api/create/:runId/stop` | | `{ ok: true }` |
| `GET /api/events` (exists) | | SSE. New event types: `{"type":"review","projectId","videoId","status"}` whenever an item enters or leaves a review status, and `{"type":"post","postId","status"}` on post status changes |
| `GET /api/projects` (exists) | | projects (id, name, icon) for the Create box's project picker |

`when: "next-slot"` uses the posting slots in Settings (the next free slot per platform). `dryRun: true` makes Postbox fill every form but stop before the final Post button.

Carousels (`kind: "slideshow"`) are posted to Postbox as the rendered slideshow MP4 (Postbox posts videos only); `slideUrls` are for review and manual photo-mode posting.

## Terminal side

`bin/shipreel-mcp.mjs` gets `submit_for_review` (puts a video into Review), `list_review`, and `review_decision` tools, so a Claude Code session in the terminal can make videos that show up in the Mac app, and approve or revise them by name if the user says so.
