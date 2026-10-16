import "server-only";
import path from "node:path";
import type { Platform, Post, PostMetrics, ProviderId } from "@/lib/types";
import { verdictFor } from "@/lib/verdict";
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
  if (out) emit({ type: "post", post: out });
  return out;
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
  const post: Post = {
    id: newId("p_"),
    projectId: input.projectId,
    videoId: input.videoId,
    platforms,
    captions: input.captions ?? { ...(video.spec.meta.captions ?? {}) },
    scheduledAt: when.toISOString(),
    provider: input.provider ?? settings.defaultProvider,
    // TikTok drafts let you add a trending sound in-app before publishing (what the pros do).
    asDraft: input.asDraft ?? platforms.includes("tiktok"),
    status: "scheduled",
    results: [],
    log: [`Scheduled for ${when.toLocaleString()}`],
    createdAt: t,
    updatedAt: t,
  };
  await updateJson<Post[]>(paths.posts(input.projectId), [], (cur) => [...cur, post]);
  emit({ type: "post", post });
  if (input.scheduledAt === "now") void processPost(input.projectId, post.id);
  else void renderVideo(input.projectId, input.videoId).catch(() => undefined); // pre-render so it's ready
  return post;
}

export async function updatePost(projectId: string, postId: string, patch: Partial<Post>): Promise<Post | null> {
  return savePost(projectId, postId, (p) => ({ ...p, ...patch, id: p.id, projectId: p.projectId }));
}

export async function deletePost(projectId: string, postId: string): Promise<void> {
  await updateJson<Post[]>(paths.posts(projectId), [], (cur) => cur.filter((p) => p.id !== postId));
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
    const results = await publisher.publish(ctx);
    const okCount = results.filter((r) => r.ok).length;
    const manual = results.every((r) => r.mode === "manual");
    const status = manual ? "needs-you" : okCount === results.length ? "posted" : okCount > 0 ? "partial" : "failed";
    for (const r of results) push(r.ok ? `✓ ${r.platform}${r.mode === "draft" ? " (draft — open TikTok to add a sound and post)" : ""}${r.url ? ` ${r.url}` : ""}` : `✗ ${r.platform}: ${r.error}`);
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
  g.__shipreelScheduler = setInterval(() => {
    tick().catch((e) => console.error("[scheduler]", e));
  }, 30_000);
  setTimeout(() => tick().catch(() => undefined), 5_000);
  console.log("[shipreel] scheduler running (every 30s)");
}
