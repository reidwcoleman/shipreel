import "server-only";
import type { Platform, ProviderId } from "@/lib/types";
import { PLATFORMS } from "@/remotion/spec";
import { airdrop, captionsFor, copyToClipboard, loadVideo, openUploadPage, renderedFile, saveToPhotos } from "./handoff";
import { listVideos } from "./projects";
import { createBatch, createPost, listPosts, updatePost } from "./posts";
import { PUBLISHER_LIST } from "./publishers";
import { getSettings } from "./store";

/**
 * Posting actions for the in-app marketing agent ("post this to TikTok tomorrow at 6pm").
 * The agent run stays read-only: it ends its answer with a fenced `shipreel-actions` JSON block,
 * and Shipreel carries the actions out here, through the same code the website uses.
 */

const PROVIDERS: ProviderId[] = ["upload-post", "bluesky", "webhook", "browser", "manual", "claude-chrome"];

function localIso(d: Date): string {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${pad(off / 60)}:${pad(off % 60)}`;
}

/** What the agent needs to act: the time, the videos, what's connected, what's queued. */
export async function postingContext(projectId: string, videoId?: string): Promise<string> {
  const [settings, videos, posts, pubs] = await Promise.all([
    getSettings(),
    listVideos(projectId),
    listPosts(projectId),
    Promise.all(PUBLISHER_LIST.map(async (p) => ({ id: p.id, label: p.label, platforms: p.platforms, ...(await p.ready()) }))),
  ]);
  const now = new Date();
  const current = videoId ? videos.find((v) => v.id === videoId) : undefined;
  const upcoming = posts.filter((p) => ["scheduled", "rendering", "posting", "needs-you"].includes(p.status)).slice(0, 15);
  return `## Posting (you can act on this)
Now: ${localIso(now)} (${settings.timezone}, ${now.toLocaleString("en-US", { weekday: "long" })}).
Posting times: ${settings.slots.map((s) => s.time).join(", ") || "none set"}. Default platforms: ${settings.defaultPlatforms.join(", ")}. Default service: ${settings.defaultProvider}.
Services: ${pubs.map((p) => `${p.id} (${p.ok ? `ready: ${p.platforms.join("/")}` : "not set up"})`).join("; ")}.
${current ? `The user is looking at video ${current.id}: "${current.spec.title}" (${current.status}). "This video" means that one.\n` : ""}Videos (newest first):
${videos
  .slice(0, 30)
  .map((v) => `- ${v.id} · ${v.status}${posts.some((p) => p.videoId === v.id && p.status !== "canceled") ? " · has a post" : ""} · "${v.spec.title}"`)
  .join("\n") || "- none yet"}
Queued posts:
${upcoming.map((p) => `- ${p.id} · ${p.videoId} · ${p.status} · ${localIso(new Date(p.scheduledAt))} · ${p.platforms.join(",")} via ${p.provider}`).join("\n") || "- none"}

If the user asks you to post, schedule, queue, cancel, send to their phone or open an upload page, do it by ending your reply with ONE fenced block like this (JSON array; omit fields to use their defaults):
\`\`\`shipreel-actions
[{"action":"schedule","video":"v_…","platforms":["tiktok"],"at":"2026-10-17T18:00:00-04:00"},
 {"action":"post_now","video":"v_…","platforms":["instagram","youtube"]},
 {"action":"batch","videos":["v_…","v_…"],"perDay":1},
 {"action":"cancel","post":"p_…"},
 {"action":"send_to_phone","video":"v_…","via":"airdrop"},
 {"action":"open_upload","video":"v_…","platform":"tiktok"},
 {"action":"browser_upload","video":"v_…","platform":"tiktok"}]
\`\`\`
Rules: "at" is an ISO time with the offset above, or "next" for the next open slot. Optional fields: "provider" (${PROVIDERS.join(" | ")}; leave it out to use the default), "draft" (TikTok to drafts, default true), "captions" ({"tiktok": "…"}). With the "manual" service the user gets a Mac reminder at that time and posts by hand from the post kit; "draft" only matters for upload-post. "browser_upload" fills the upload page in Shipreel's Chrome window and stops before Post. "via" is airdrop or photos. Only act when they asked for it; never invent video or post ids. Say in one line what you did (Shipreel adds the result).`;
}

type Action = {
  action?: string;
  video?: string;
  videos?: string[];
  post?: string;
  platforms?: string[];
  platform?: string;
  at?: string;
  provider?: string;
  draft?: boolean;
  captions?: Partial<Record<Platform, string>>;
  perDay?: number;
  via?: string;
};

export function extractActions(text: string): Action[] {
  const m = /```shipreel-actions\s*([\s\S]*?)```/i.exec(text);
  if (!m) return [];
  try {
    const parsed = JSON.parse(m[1].trim());
    return (Array.isArray(parsed) ? parsed : [parsed]).filter((a) => a && typeof a === "object").slice(0, 20);
  } catch {
    return [{ action: "invalid" }];
  }
}

const platformsOf = (a: Action): Platform[] | undefined => {
  const ps = (a.platforms ?? (a.platform ? [a.platform] : [])).map((p) => String(p).toLowerCase().replace(/^youtube.*/, "youtube").replace(/^(twitter)$/, "x")) as Platform[];
  const ok = ps.filter((p) => PLATFORMS.includes(p));
  return ok.length ? ok : undefined;
};
const providerOf = (a: Action) => (a.provider && PROVIDERS.includes(a.provider as ProviderId) ? (a.provider as ProviderId) : undefined);
const when = (d: string) => new Date(d).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** Carry out the agent's actions. Returns one human line per action, plus the posts it made. */
export async function applyActions(projectId: string, text: string): Promise<{ notes: string[]; postIds: string[] } | undefined> {
  const actions = extractActions(text);
  if (!actions.length) return undefined;
  const notes: string[] = [];
  const postIds: string[] = [];
  for (const a of actions) {
    try {
      switch (a.action) {
        case "schedule":
        case "post_now": {
          if (!a.video) throw new Error("no video id");
          let at: string = a.action === "post_now" ? "now" : a.at || "next";
          if (at !== "now" && at !== "next") {
            const t = new Date(at);
            if (Number.isNaN(t.getTime())) throw new Error(`couldn't read the time "${a.at}"`);
            if (t.getTime() < Date.now() - 60_000) throw new Error(`${when(t.toISOString())} is in the past`);
            at = t.toISOString();
          }
          const p = await createPost({ projectId, videoId: a.video, platforms: platformsOf(a), scheduledAt: at, provider: providerOf(a), asDraft: a.draft, captions: a.captions });
          postIds.push(p.id);
          notes.push(`✓ ${at === "now" ? "Posting now" : `Scheduled for ${when(p.scheduledAt)}`}: ${p.platforms.join(", ")} via ${p.provider} (${p.id}).`);
          break;
        }
        case "batch": {
          const ps = await createBatch({ projectId, videoIds: a.videos ?? [], platforms: platformsOf(a), provider: providerOf(a), asDraft: a.draft, perDay: a.perDay });
          postIds.push(...ps.map((p) => p.id));
          notes.push(`✓ Queued ${ps.length} video${ps.length === 1 ? "" : "s"}: ${ps.map((p) => when(p.scheduledAt)).join("; ")}.`);
          break;
        }
        case "cancel": {
          if (!a.post) throw new Error("no post id");
          const p = await updatePost(projectId, a.post, { status: "canceled" });
          if (!p) throw new Error(`post ${a.post} not found`);
          notes.push(`✓ Canceled ${a.post}.`);
          break;
        }
        case "send_to_phone":
        case "open_upload": {
          if (!a.video) throw new Error("no video id");
          const video = await loadVideo(projectId, a.video);
          const file = renderedFile(projectId, video);
          if (!file) throw new Error(`"${video.spec.title}" isn't rendered yet`);
          const platform = platformsOf(a)?.[0] ?? "tiktok";
          const caption = captionsFor(video, a.captions)[platform] ?? video.spec.title;
          if (a.action === "open_upload") {
            await openUploadPage(file, platform, caption);
            notes.push(`✓ Opened the ${platform} upload page, caption copied, MP4 shown in Finder.`);
          } else {
            await copyToClipboard(caption).catch(() => undefined);
            const r = a.via === "photos" ? await saveToPhotos(file) : await airdrop(file);
            notes.push(`✓ ${r.detail} Caption copied.`);
          }
          break;
        }
        case "browser_upload": {
          if (!a.video) throw new Error("no video id");
          const p = await createPost({ projectId, videoId: a.video, platforms: platformsOf(a) ?? ["tiktok"], scheduledAt: "now", provider: "browser", captions: a.captions });
          postIds.push(p.id);
          notes.push(`✓ Filling in ${p.platforms.join(", ")} in Shipreel's Chrome window (you press Post) (${p.id}).`);
          break;
        }
        default:
          throw new Error(a.action === "invalid" ? "the action block wasn't valid JSON" : `unknown action "${a.action}"`);
      }
    } catch (e) {
      notes.push(`✗ ${a.action ?? "action"}: ${(e as Error).message}`);
    }
  }
  return { notes, postIds };
}
