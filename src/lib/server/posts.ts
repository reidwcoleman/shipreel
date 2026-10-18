import "server-only";
import path from "node:path";
import type { Platform, Post, PostMetrics, PostStatus, PostSummary, ProviderId } from "@/lib/types";
import { verdictFor } from "@/lib/verdict";
import { maybeDefaultToPostbox, mapPostbox, postboxCancel, postboxGet } from "./postbox";
import { PUBLISHERS, type PublishCtx } from "./publishers";
import { getProject, getVideo, listProjects } from "./projects";
import { renderVideo } from "./render";
import { emit, getSettings, newId, now, paths, readJson, updateJson } from "./store";
import { appendMemory } from "./tasks";

export async function listPosts(projectId: string): Promise<Post[]> {
  const posts = await readJson<Post[]>(paths.posts(projectId), []);
  return posts.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export async function allPosts(): Promise<Post[]> {
  const projects = await listProjects();
  const lists = await Promise.all(projects.map((p) => listPosts(p.id)));
  return lists.flat().sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

async function savePost(projectId: string, postId: string, fn: (p: Post) => Post): Promise<Post | null> {
  let out: Post | null = null;
  await updateJson<Post[]>(paths.posts(projectId), [], (cur) =>
    cur.map((p) => {
      if (p.id !== postId) return p;
      out = { ...fn(p), updatedAt: now() };
      return out;
    }),
  );
  if (out) emitPost(out);
  return out;
}

/** The Mac app's spelling of a post status (apps/REVIEW-API.md). */
export function summaryStatus(s: PostStatus): PostSummary["status"] {
  return s === "rendering" ? "posting" : s === "canceled" ? "cancelled" : s;
}

function emitPost(post: Post) {
  emit({ type: "post", post, postId: post.id, status: summaryStatus(post.status) });
}

/** Next free posting slot (settings.slots) at or after `from`, not already taken by this project. */
export async function nextFreeSlot(projectId: string, from = new Date(), platform?: Platform): Promise<Date> {
  const settings = await getSettings();
  const taken = new Set((await listPosts(projectId)).filter((p) => p.status !== "canceled").map((p) => p.scheduledAt.slice(0, 16)));
  const slots = settings.slots.filter((s) => !platform || s.platform === platform);
  const usable = slots.length ? slots : [{ platform: "tiktok" as Platform, time: "19:00", days: [0, 1, 2, 3, 4, 5, 6] }];
  const start = new Date(from.getTime() + 5 * 60_000);
  for (let d = 0; d < 60; d++) {
    const day = new Date(start);
    day.setDate(start.getDate() + d);
    const candidates = usable
      .filter((s) => s.days.includes(day.getDay()))
      .map((s) => {
        const [h, m] = s.time.split(":").map(Number);
        const t = new Date(day);
        t.setHours(h, m || 0, 0, 0);
        return t;
      })
      .filter((t) => t > start)
      .sort((a, b) => a.getTime() - b.getTime());
    for (const t of candidates) if (!taken.has(t.toISOString().slice(0, 16))) return t;
  }
  return new Date(start.getTime() + 60 * 60_000);
}

export async function createPost(input: {
  projectId: string;
  videoId: string;
  platforms?: Platform[];
  scheduledAt?: string | "next" | "now";
  provider?: ProviderId;
  asDraft?: boolean;
  captions?: Partial<Record<Platform, string>>;
  /** Chrome uploads: press Post too (default: the per-platform setting, which is off). */
  autoPost?: boolean;
  /** Postbox: fill every form but stop before the final Post button. */
  dryRun?: boolean;
  /** Postbox: YouTube title and exact captions (verbatim). */
  title?: string;
  postboxCaptions?: NonNullable<Post["postbox"]>["captions"];
}): Promise<Post> {
  const settings = await getSettings();
  const video = await getVideo(input.projectId, input.videoId);
  if (!video) throw new Error("video not found");
  const platforms = input.platforms?.length ? input.platforms : settings.defaultPlatforms;
  const when =
    input.scheduledAt === "now"
      ? new Date()
      : !input.scheduledAt || input.scheduledAt === "next"
        ? await nextFreeSlot(input.projectId)
        : new Date(input.scheduledAt);
  const t = now();
  const provider = input.provider ?? settings.defaultProvider;
  const post: Post = {
    id: newId("p_"),
    projectId: input.projectId,
    videoId: input.videoId,
    platforms,
    captions: input.captions ?? { ...(video.spec.meta.captions ?? {}) },
    scheduledAt: when.toISOString(),
    provider,
    // TikTok drafts let you add a trending sound in-app before publishing (what the pros do).
    // Postbox posts for real (it has no drafts), so it never asks for one.
    asDraft: provider === "postbox" ? false : (input.asDraft ?? platforms.includes("tiktok")),
    ...(input.autoPost !== undefined ? { autoPost: input.autoPost } : {}),
    ...(provider === "postbox" ? { postbox: { dryRun: !!input.dryRun, ...(input.title ? { title: input.title } : {}), ...(input.postboxCaptions ? { captions: input.postboxCaptions } : {}) } } : {}),
    status: "scheduled",
    results: [],
    log: [`Scheduled for ${when.toLocaleString()}`],
    createdAt: t,
    updatedAt: t,
  };
  await updateJson<Post[]>(paths.posts(input.projectId), [], (cur) => [...cur, post]);
  emitPost(post);
  // Postbox holds scheduled posts itself: hand it over now (after the render), not at post time.
  if (input.scheduledAt === "now" || provider === "postbox") void processPost(input.projectId, post.id);
  else void renderVideo(input.projectId, input.videoId).catch(() => undefined); // pre-render so it's ready
  return post;
}

export async function updatePost(projectId: string, postId: string, patch: Partial<Post>): Promise<Post | null> {
  if (patch.status === "canceled") await cancelInPostbox(projectId, postId);
  // Retrying a Postbox post sends it to Postbox again (a new Postbox post).
  const retry = patch.status === "scheduled";
  const out = await savePost(projectId, postId, (p) => ({
    ...p,
    ...patch,
    ...(retry && p.provider === "postbox" && p.status !== "scheduled" ? { postbox: { ...(p.postbox ?? {}), id: undefined, status: undefined } } : {}),
    id: p.id,
    projectId: p.projectId,
  }));
  if (retry && out?.provider === "postbox" && !out.postbox?.id) void processPost(projectId, postId);
  return out;
}

export async function deletePost(projectId: string, postId: string): Promise<void> {
  await cancelInPostbox(projectId, postId);
  await updateJson<Post[]>(paths.posts(projectId), [], (cur) => cur.filter((p) => p.id !== postId));
}

/** A post Postbox is still holding for later gets cancelled there too. */
async function cancelInPostbox(projectId: string, postId: string): Promise<void> {
  const post = (await listPosts(projectId)).find((p) => p.id === postId);
  if (post?.provider !== "postbox" || !post.postbox?.id || post.status !== "scheduled") return;
  await postboxCancel(post.postbox.id).catch((e) => console.error("[postbox] cancel", (e as Error).message));
}

export async function recordMetrics(projectId: string, postId: string, metrics: Omit<PostMetrics, "updatedAt">): Promise<Post | null> {
  const post = await savePost(projectId, postId, (p) => ({ ...p, metrics: { ...(p.metrics ?? {}), ...metrics, updatedAt: now() } }));
  if (post?.metrics?.views != null) {
    const video = await getVideo(projectId, post.videoId);
    const hook = video?.spec.meta.hook || video?.spec.title || "";
    const v = verdictFor(post.metrics);
    if (v.verdict === "double-down") await appendMemory(projectId, "Winning hooks", `"${hook}" (${video?.spec.formatId}) — ${post.metrics.views.toLocaleString()} views`);
    if (v.verdict === "drop") await appendMemory(projectId, "Dead hooks", `"${hook}" (${video?.spec.formatId}) — ${post.metrics.views.toLocaleString()} views`);
  }
  return post;
}

const running = new Set<string>();

/** Render if needed, then publish through the post's provider. */
export async function processPost(projectId: string, postId: string): Promise<void> {
  const key = `${projectId}/${postId}`;
  if (running.has(key)) return;
  running.add(key);
  const log: string[] = [];
  const push = (l: string) => {
    log.push(`${new Date().toLocaleTimeString()} ${l}`);
    void savePost(projectId, postId, (p) => ({ ...p, log: [...p.log, ...log.splice(0)] }));
  };
  try {
    const post = (await listPosts(projectId)).find((p) => p.id === postId);
    if (!post || ["posted", "canceled", "posting"].includes(post.status)) return;
    // Already handed to Postbox: its status comes back through syncPostbox.
    if (post.postbox?.id) return;
    const project = await getProject(projectId);
    if (!project) throw new Error("project missing");
    const publisher = PUBLISHERS[post.provider] ?? PUBLISHERS.manual;
    const ready = await publisher.ready();
    if (!ready.ok) {
      await savePost(projectId, postId, (p) => ({ ...p, status: "needs-you", log: [...p.log, `Can't post via ${publisher.label}: ${ready.reason}`] }));
      return;
    }
    await savePost(projectId, postId, (p) => ({ ...p, status: "rendering" }));
    push("Rendering…");
    const doc = await renderVideo(projectId, post.videoId);
    if (!doc.render) throw new Error("render produced no file");
    await savePost(projectId, postId, (p) => ({ ...p, status: "posting" }));
    push(`Posting via ${publisher.label} to ${post.platforms.join(", ")}…`);
    const ctx: PublishCtx = {
      post,
      video: doc,
      project,
      file: path.join(paths.project(projectId), doc.render.file),
      slides: (doc.render.slides ?? []).map((s) => path.join(paths.project(projectId), s)),
      log: push,
    };
    if (publisher.handoff) {
      const h = await publisher.handoff(ctx);
      await savePost(projectId, postId, (p) => ({ ...p, status: h.status, results: h.results, postbox: { ...(p.postbox ?? {}), id: h.externalId, status: h.external.status } }));
      return;
    }
    const results = await publisher.publish(ctx);
    const okCount = results.filter((r) => r.ok).length;
    const manual = results.every((r) => r.mode === "manual");
    const status = manual ? "needs-you" : okCount === results.length ? "posted" : okCount > 0 ? "partial" : "failed";
    for (const r of results)
      push(
        r.ok
          ? `✓ ${r.platform}${r.mode === "draft" ? " (draft — open TikTok to add a sound and post)" : ""}${r.url ? ` ${r.url}` : ""}`
          : r.mode === "manual"
            ? `→ ${r.platform}: ${r.error}`
            : `✗ ${r.platform}: ${r.error}${r.screenshot ? ` (screenshot: ${r.screenshot})` : ""}`,
      );
    await savePost(projectId, postId, (p) => ({ ...p, status, results }));
  } catch (e) {
    push(`Failed: ${(e as Error).message}`);
    await savePost(projectId, postId, (p) => ({ ...p, status: "failed" }));
  } finally {
    running.delete(key);
  }
}

/** Scheduler tick: publish everything that's due. */
export async function tick(): Promise<void> {
  const due = (await allPosts()).filter((p) => p.status === "scheduled" && new Date(p.scheduledAt).getTime() <= Date.now());
  for (const p of due) await processPost(p.projectId, p.id);
}

const g = globalThis as unknown as { __shipreelScheduler?: NodeJS.Timeout };

export function startScheduler() {
  if (g.__shipreelScheduler) return;
  // SHIPREEL_SCHEDULER=off: a second instance on the same workspace (testing) leaves posting to the first.
  const posting = process.env.SHIPREEL_SCHEDULER !== "off";
  g.__shipreelScheduler = setInterval(() => {
    if (posting) tick().catch((e) => console.error("[scheduler]", e));
    syncPostbox().catch((e) => console.error("[postbox] sync", e));
  }, 30_000);
  if (posting) setTimeout(() => tick().catch(() => undefined), 5_000);
  setTimeout(() => maybeDefaultToPostbox().catch(() => undefined), 3_000);
  console.log(`[shipreel] scheduler running (every 30s${posting ? "" : ", posting off"})`);
}

// ── Postbox status sync ─────────────────────────────────────────────────────────

const gs = globalThis as unknown as { __shipreelPbSync?: { at: number; p?: Promise<void> } };

/** Pull the status of every post Postbox still holds or is running (throttled; cheap when there are none). */
export function syncPostbox(opts: { maxAgeMs?: number } = {}): Promise<void> {
  const st = (gs.__shipreelPbSync ??= { at: 0 });
  if (st.p) return st.p;
  if (Date.now() - st.at < (opts.maxAgeMs ?? 3000)) return Promise.resolve();
  st.p = (async () => {
    const live = (await allPosts()).filter((p) => p.provider === "postbox" && p.postbox?.id && ["scheduled", "posting", "rendering"].includes(p.status));
    for (const p of live) {
      try {
        const pbPost = await postboxGet(p.postbox!.id!);
        const m = mapPostbox(pbPost);
        if (m.status === p.status && pbPost.status === p.postbox?.status && JSON.stringify(m.results.map((r) => [r.platform, r.ok, r.url, r.error])) === JSON.stringify(p.results.map((r) => [r.platform, r.ok, r.url, r.error]))) continue;
        const lines = m.results.filter((r) => !p.results.some((o) => o.platform === r.platform && o.ok === r.ok && o.error === r.error)).map((r) => `${r.ok ? "✓" : "✗"} ${r.platform}${r.url ? ` ${r.url}` : ""}${r.error ? `: ${r.error}` : ""}${r.note ? ` (${r.note})` : ""}`);
        await savePost(p.projectId, p.id, (cur) => ({ ...cur, status: m.status, results: [...m.results, ...cur.results.filter((r) => r.mode === "manual" && !m.results.some((x) => x.platform === r.platform))], postbox: { ...(cur.postbox ?? {}), status: pbPost.status }, log: [...cur.log, ...lines.map((l) => `${new Date().toLocaleTimeString()} Postbox: ${l}`)] }));
      } catch (e) {
        if (/No post/i.test((e as Error).message)) await savePost(p.projectId, p.id, (cur) => ({ ...cur, status: "failed", log: [...cur.log, "Postbox no longer has this post."] }));
      }
    }
  })().finally(() => {
    st.at = Date.now();
    st.p = undefined;
  });
  return st.p;
}

// ── Batches: spread several videos across days at your posting times ─────────────

/**
 * Plan `count` posting times from settings.slots, at most `perDay` per day (counting what this
 * product already has scheduled that day), never reusing a taken slot.
 */
export async function planSlots(projectId: string, count: number, opts: { perDay?: number; from?: Date } = {}): Promise<Date[]> {
  const settings = await getSettings();
  const perDay = Math.max(1, Math.min(6, Math.round(opts.perDay ?? 1)));
  const live = (await listPosts(projectId)).filter((p) => p.status !== "canceled");
  const taken = new Set(live.map((p) => p.scheduledAt.slice(0, 16)));
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const perDayCount = new Map<string, number>();
  for (const p of live) {
    const k = dayKey(new Date(p.scheduledAt));
    perDayCount.set(k, (perDayCount.get(k) ?? 0) + 1);
  }
  const usable = settings.slots.length ? settings.slots : [{ platform: "tiktok" as Platform, time: "19:00", days: [0, 1, 2, 3, 4, 5, 6] }];
  const start = new Date((opts.from ?? new Date()).getTime() + 5 * 60_000);
  const out: Date[] = [];
  for (let d = 0; d < 120 && out.length < count; d++) {
    const day = new Date(start);
    day.setDate(start.getDate() + d);
    const times = [...new Set(usable.filter((s) => s.days.includes(day.getDay())).map((s) => s.time))]
      .map((time) => {
        const [h, m] = time.split(":").map(Number);
        const t = new Date(day);
        t.setHours(h, m || 0, 0, 0);
        return t;
      })
      .filter((t) => t > start)
      .sort((a, b) => a.getTime() - b.getTime());
    for (const t of times) {
      const k = dayKey(t);
      if (out.length >= count || (perDayCount.get(k) ?? 0) >= perDay) break;
      if (taken.has(t.toISOString().slice(0, 16))) continue;
      out.push(t);
      taken.add(t.toISOString().slice(0, 16));
      perDayCount.set(k, (perDayCount.get(k) ?? 0) + 1);
    }
  }
  return out;
}

export async function createBatch(input: {
  projectId: string;
  videoIds: string[];
  platforms?: Platform[];
  provider?: ProviderId;
  asDraft?: boolean;
  perDay?: number;
  from?: string;
}): Promise<Post[]> {
  const ids = [...new Set(input.videoIds)].filter(Boolean);
  if (!ids.length) throw new Error("Pick at least one video.");
  const times = await planSlots(input.projectId, ids.length, { perDay: input.perDay, from: input.from ? new Date(input.from) : undefined });
  if (times.length < ids.length) throw new Error("Not enough open posting times in the next few months. Add times in Settings → Posting times.");
  const out: Post[] = [];
  for (const [i, videoId] of ids.entries()) {
    out.push(await createPost({ projectId: input.projectId, videoId, platforms: input.platforms, provider: input.provider, asDraft: input.asDraft, scheduledAt: times[i].toISOString() }));
  }
  return out;
}
