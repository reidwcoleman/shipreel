import "server-only";
import type { Platform, Post, PostboxPlatform, Project, Review, ReviewItem, ReviewStatus, VideoDoc } from "@/lib/types";
import { FORMAT_MAP } from "@/framework/formats";
import { scoreHookFor } from "@/framework/hooks";
import { totalDurationSeconds } from "@/remotion/timeline";
import { liveRun, waitForRun } from "./agents";
import { POSTBOX_PLATFORMS, postboxCaptions } from "./postbox";
import { createPost, listPosts, nextFreeSlot, summaryStatus, syncPostbox, updatePost } from "./posts";
import { getProject, getVideo, listProjects, listVideos, patchVideo } from "./projects";
import { captionFor } from "./publishers";
import { renderVideo, serverOrigin, startRender } from "./render";
import { emit, getSettings, now } from "./store";
import { improveVideo } from "./tasks";

/**
 * Review & auto-post: new videos land here as "pending" after their first render; the user approves
 * (Shipreel posts through Postbox), asks for changes (the agent edits, it re-renders, back to pending)
 * or rejects. The contract with the Mac app is apps/REVIEW-API.md.
 */

export const REVIEW_STATUSES: ReviewStatus[] = ["pending", "approved", "rejected", "revising"];

const media = (origin: string, projectId: string, rel: string, v?: string) =>
  `${origin}/api/media/${encodeURIComponent(projectId)}/${rel.split("/").map(encodeURIComponent).join("/")}${v ? `?v=${v}` : ""}`;

export function toReviewItem(project: Project, doc: VideoDoc, post: Post | undefined, origin = serverOrigin()): ReviewItem {
  const spec = doc.spec;
  const r = doc.render;
  const v = r?.specHash;
  const c = postboxCaptions(post ?? { captions: {} }, doc, captionFor);
  const logo = project.brand.logo?.replace(/^asset:/, "");
  let hookScore: number | undefined;
  try {
    hookScore = spec.meta.hook ? scoreHookFor(spec.meta.hook, project, spec.formatId).score : undefined;
  } catch {
    hookScore = undefined;
  }
  return {
    projectId: project.id,
    projectName: project.name,
    ...(logo && !/^https?:/.test(logo) ? { appIcon: media(origin, project.id, `assets/${logo}`) } : logo ? { appIcon: logo } : {}),
    videoId: doc.id,
    title: spec.title,
    hook: spec.meta.hook || spec.title,
    formatId: spec.formatId,
    formatName: FORMAT_MAP[spec.formatId]?.name ?? spec.formatId,
    kind: spec.kind,
    aspect: spec.aspect,
    durationSec: Number((r?.durationSec || totalDurationSeconds(spec)).toFixed(2)),
    ...(hookScore !== undefined ? { hookScore } : {}),
    ...(r?.file ? { mp4Url: media(origin, project.id, r.file, v) } : {}),
    ...(r?.thumb ? { thumbUrl: media(origin, project.id, r.thumb, v) } : {}),
    slideUrls: spec.kind === "slideshow" ? (r?.slides ?? []).map((s) => media(origin, project.id, s, v)) : [],
    captions: { tiktok: c.tiktok, instagram: c.instagram, youtube: c.youtube },
    youtubeTitle: c.title,
    ...(spec.meta.soundTip ? { soundTip: spec.meta.soundTip } : {}),
    review: doc.review ?? { status: "pending", at: doc.updatedAt },
    renderStatus: doc.status === "queued" ? "rendering" : doc.status,
    ...(doc.status === "rendering" && doc.progress !== undefined ? { renderProgress: doc.progress } : {}),
    createdAt: doc.createdAt,
    source: doc.source,
    ...(post
      ? {
          post: {
            id: post.id,
            status: summaryStatus(post.status),
            scheduledAt: post.scheduledAt,
            platforms: post.platforms.filter((p): p is PostboxPlatform => POSTBOX_PLATFORMS.includes(p as PostboxPlatform)),
            results: post.results.map((x) => ({ platform: x.platform, ok: x.ok, ...(x.url ? { url: x.url } : {}), ...(x.error ? { error: x.error } : {}), ...(x.note ? { note: x.note } : {}) })),
            ...(post.postbox?.dryRun ? { dryRun: true } : {}),
          },
        }
      : {}),
  };
}

export async function listReview(opts: { status?: ReviewStatus | "all"; projectId?: string; origin?: string } = {}): Promise<{ items: ReviewItem[]; counts: Record<ReviewStatus, number> }> {
  await syncPostbox().catch(() => undefined);
  const status = opts.status ?? "pending";
  const projects = opts.projectId ? [await getProject(opts.projectId)].filter((p): p is Project => !!p) : await listProjects();
  const counts = Object.fromEntries(REVIEW_STATUSES.map((s) => [s, 0])) as Record<ReviewStatus, number>;
  const items: ReviewItem[] = [];
  for (const project of projects) {
    const docs = (await listVideos(project.id)).filter((d) => d.review);
    if (!docs.length) continue;
    const posts = new Map((await listPosts(project.id)).map((p) => [p.id, p]));
    for (const d of docs) {
      counts[d.review!.status] = (counts[d.review!.status] ?? 0) + 1;
      if (status !== "all" && d.review!.status !== status) continue;
      items.push(toReviewItem(project, d, d.review!.postId ? posts.get(d.review!.postId) : undefined, opts.origin));
    }
  }
  items.sort((a, b) => b.review.at.localeCompare(a.review.at) || b.createdAt.localeCompare(a.createdAt));
  return { items, counts };
}

export async function getReviewItem(projectId: string, videoId: string, origin?: string): Promise<ReviewItem> {
  await syncPostbox().catch(() => undefined);
  const [project, doc] = await Promise.all([getProject(projectId), getVideo(projectId, videoId)]);
  if (!project) throw new Error("project not found");
  if (!doc) throw new Error("video not found");
  const post = doc.review?.postId ? (await listPosts(projectId)).find((p) => p.id === doc.review!.postId) : undefined;
  return toReviewItem(project, doc, post, origin);
}

async function setReview(projectId: string, videoId: string, review: Review | undefined, extra: Partial<VideoDoc> = {}): Promise<void> {
  await patchVideo(projectId, videoId, { review, ...extra });
  emit({ type: "review", projectId, videoId, status: review?.status ?? null });
}

/** The post an approval created, if it's still going (or went) out. */
async function activePost(projectId: string, doc: VideoDoc): Promise<Post | undefined> {
  if (!doc.review?.postId) return undefined;
  const p = (await listPosts(projectId)).find((x) => x.id === doc.review!.postId);
  return p && !["failed", "canceled", "needs-you"].includes(p.status) ? p : undefined;
}

/** Cancel an approval's post that hasn't gone out yet (reject / reopen / revise). */
async function withdraw(projectId: string, doc: VideoDoc): Promise<void> {
  const p = await activePost(projectId, doc);
  if (!p) return;
  if (p.status !== "scheduled") throw new Error(`This video is already ${p.status === "posted" || p.status === "partial" ? "posted" : "posting"}; it can't be pulled back from here.`);
  await updatePost(projectId, p.id, { status: "canceled" });
}

export type ReviewAction =
  | { action: "approve"; platforms?: Platform[]; captions?: Partial<ReviewItem["captions"]>; youtubeTitle?: string; when?: string; dryRun?: boolean }
  | { action: "revise"; note: string }
  | { action: "reject"; note?: string }
  | { action: "reopen" }
  | { action: "submit" };

export async function reviewAction(projectId: string, videoId: string, a: ReviewAction, origin?: string): Promise<ReviewItem> {
  const doc = await getVideo(projectId, videoId);
  if (!doc) throw new Error("video not found");
  const at = now();
  switch (a.action) {
    case "approve": {
      if (doc.review?.status === "revising") throw new Error("Claude is still revising this video. Approve it when it's back in Review.");
      if (await activePost(projectId, doc)) throw new Error("Already approved: its post is scheduled or out. Reopen it first to change anything.");
      const settings = await getSettings();
      const wanted = (a.platforms?.length ? a.platforms : settings.defaultPlatforms).filter((p): p is PostboxPlatform => POSTBOX_PLATFORMS.includes(p as PostboxPlatform));
      const platforms = wanted.length ? wanted : POSTBOX_PLATFORMS;
      const when = a.when ?? "now";
      let scheduledAt: string;
      if (when === "now") scheduledAt = "now";
      else if (when === "next-slot" || when === "next") scheduledAt = (await nextFreeSlot(projectId)).toISOString();
      else {
        const t = new Date(when);
        if (Number.isNaN(t.getTime())) throw new Error(`"when" must be "now", "next-slot" or an ISO time, not ${JSON.stringify(when)}.`);
        scheduledAt = t.getTime() <= Date.now() + 60_000 ? "now" : t.toISOString();
      }
      const base = postboxCaptions({ captions: {} }, doc, captionFor);
      const captions = { tiktok: a.captions?.tiktok ?? base.tiktok, instagram: a.captions?.instagram ?? base.instagram, youtube: a.captions?.youtube ?? base.youtube };
      const title = (a.youtubeTitle?.trim() || base.title).slice(0, 100);
      const post = await createPost({
        projectId,
        videoId,
        platforms,
        scheduledAt,
        provider: "postbox",
        dryRun: !!a.dryRun,
        title,
        postboxCaptions: captions,
        // Shipreel's own fields (Calendar, post kit): YouTube's caption there is its Shorts title.
        captions: { tiktok: captions.tiktok, instagram: captions.instagram, youtube: title },
      });
      await setReview(projectId, videoId, { status: "approved", at, postId: post.id, ...(doc.review?.note ? { note: doc.review.note } : {}) });
      break;
    }
    case "revise": {
      const note = a.note?.trim();
      if (!note) throw new Error("Say what to change (note).");
      if (doc.review?.status === "revising" && doc.review.runId && liveRun(doc.review.runId)) throw new Error("Already revising this video.");
      await withdraw(projectId, doc);
      const run = await improveVideo(projectId, videoId, { instruction: note });
      await setReview(projectId, videoId, { status: "revising", note, at, runId: run.id });
      void finishRevision(projectId, videoId, run.id, note);
      break;
    }
    case "reject": {
      await withdraw(projectId, doc);
      await setReview(projectId, videoId, { status: "rejected", at, ...(a.note?.trim() ? { note: a.note.trim() } : {}) });
      break;
    }
    case "reopen":
    case "submit": {
      // "submit" also takes a video that was never in Review; one that isn't rendered yet joins when its render is done.
      if (a.action === "submit" && (await activePost(projectId, doc))) throw new Error("Already approved: its post is scheduled or out. Reopen it in Review to pull it back.");
      await withdraw(projectId, doc);
      if (doc.status === "rendered" && doc.render?.file) await setReview(projectId, videoId, { status: "pending", at }, { reviewOnRender: undefined });
      else if (doc.review) await setReview(projectId, videoId, { status: "pending", at });
      else {
        await patchVideo(projectId, videoId, { reviewOnRender: true });
        startRender(projectId, videoId).done.catch(() => undefined);
      }
      break;
    }
    default:
      throw new Error('action must be "approve", "revise", "reject" or "reopen".');
  }
  return getReviewItem(projectId, videoId, origin);
}

/** After the agent edits the spec: re-render, then the video is back in Review as pending. */
async function finishRevision(projectId: string, videoId: string, runId: string, note: string): Promise<void> {
  let failure: string | undefined;
  try {
    const done = await waitForRun(runId, 20 * 60_000);
    if (done.status !== "done") throw new Error(done.error ?? `the edit was ${done.status}`);
    await renderVideo(projectId, videoId);
  } catch (e) {
    failure = (e as Error).message.split("\n")[0].slice(0, 300);
  }
  const cur = await getVideo(projectId, videoId);
  // The user moved on (rejected, reopened, approved) while it ran: leave their choice alone.
  if (!cur || cur.review?.status !== "revising" || cur.review.runId !== runId) return;
  await setReview(projectId, videoId, { status: "pending", at: now(), note: failure ? `${note}\n\n(Couldn't apply this: ${failure})` : note });
}
