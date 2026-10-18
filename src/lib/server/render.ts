import "server-only";
import { spawn, execFile, type ChildProcessWithoutNullStreams } from "node:child_process";
import crypto from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { promisify } from "node:util";
import type { VideoDoc } from "@/lib/types";
import type { CompositionProps } from "@/remotion/spec";
import { layoutScenes } from "@/remotion/timeline";
import { probe } from "./media";
import { getVideo, patchVideo, saveVideoSpec } from "./projects";
import { fitText } from "./layout";
import { voiceChats } from "./voice";
import { prepareCarousel } from "./imagegen";
import { composeSlideshow, photoModeMp4 } from "./slideshow";
import { APP_ROOT, emit, now, paths } from "./store";

const run = promisify(execFile);

type WorkerMsg =
  | { type: "ready" | "pong" }
  | { type: "progress"; jobId: string; progress: number; stage: string }
  | { type: "done"; jobId: string }
  | { type: "error"; jobId: string | null; message: string };

type Pending = { onProgress: (p: number, stage: string) => void; resolve: () => void; reject: (e: Error) => void };

const g = globalThis as unknown as {
  __shipreelWorker?: ChildProcessWithoutNullStreams;
  __shipreelJobs?: Map<string, Pending>;
  __shipreelRenderJobs?: Map<string, RenderJob>;
};
/** `started` resolves once the video is marked "rendering", or when the job ends without needing to. */
type RenderJob = { done: Promise<VideoDoc>; started: Promise<void> };
const jobs = (g.__shipreelJobs ??= new Map());
const inflight = (g.__shipreelRenderJobs ??= new Map());

function worker(): ChildProcessWithoutNullStreams {
  if (g.__shipreelWorker && g.__shipreelWorker.exitCode === null && !g.__shipreelWorker.killed) return g.__shipreelWorker;
  const child = spawn(process.execPath, [path.join(APP_ROOT, "scripts/render-worker.mjs")], {
    cwd: APP_ROOT,
    env: { ...process.env, NODE_ENV: "production" },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const rl = readline.createInterface({ input: child.stdout });
  rl.on("line", (line) => {
    let msg: WorkerMsg;
    try {
      msg = JSON.parse(line);
    } catch {
      return; // stray log output
    }
    if (msg.type === "progress") jobs.get(msg.jobId)?.onProgress(msg.progress, msg.stage);
    else if (msg.type === "done") {
      jobs.get(msg.jobId)?.resolve();
      jobs.delete(msg.jobId);
    } else if (msg.type === "error" && msg.jobId) {
      jobs.get(msg.jobId)?.reject(new Error(msg.message));
      jobs.delete(msg.jobId);
    }
  });
  child.stderr.on("data", (d) => {
    const s = String(d).trim();
    if (s) console.log("[render-worker]", s.slice(0, 2000));
  });
  child.on("exit", (code) => {
    for (const [id, p] of jobs) {
      p.reject(new Error(`render worker exited (${code})`));
      jobs.delete(id);
    }
    g.__shipreelWorker = undefined;
  });
  g.__shipreelWorker = child;
  return child;
}

/** Run one job on the render worker (a stills-only job when `out` is omitted). */
function workerJob(job: { props: CompositionProps; out?: string; stills?: unknown[] }, onProgress: (p: number) => void = () => {}): Promise<void> {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return new Promise<void>((resolve, reject) => {
    jobs.set(jobId, { resolve, reject, onProgress });
    worker().stdin.write(JSON.stringify({ type: "render", jobId, ...job }) + "\n");
  });
}

export function serverOrigin(): string {
  return `http://127.0.0.1:${process.env.PORT ?? 4747}`;
}

export function compositionProps(projectId: string, spec: VideoDoc["spec"]): CompositionProps {
  return { spec, assetBase: `${serverOrigin()}/api/media/${projectId}`, publicBase: "" };
}

export const specHash = (spec: unknown) => crypto.createHash("sha1").update(JSON.stringify(spec)).digest("hex").slice(0, 12);

/** Render a video (deduplicated: concurrent calls share one job; unchanged specs are skipped). */
export function renderVideo(projectId: string, videoId: string, opts: { force?: boolean } = {}): Promise<VideoDoc> {
  return startRender(projectId, videoId, opts).done;
}

/** renderVideo, plus a promise for when the job has begun (callers that answer before it finishes wait on that). */
export function startRender(projectId: string, videoId: string, opts: { force?: boolean } = {}): RenderJob {
  const key = `${projectId}/${videoId}`;
  const existing = inflight.get(key);
  if (existing) return existing;
  let markStarted = () => {};
  const started = new Promise<void>((resolve) => (markStarted = resolve));
  const done = doRender(projectId, videoId, opts, markStarted).finally(() => {
    markStarted();
    inflight.delete(key);
  });
  const job = { done, started };
  inflight.set(key, job);
  return job;
}

async function doRender(projectId: string, videoId: string, { force }: { force?: boolean }, onStarted: () => void): Promise<VideoDoc> {
  let doc = await getVideo(projectId, videoId);
  if (!doc) throw new Error(`video ${videoId} not found`);
  // Spoken text stories: (re)generate the voices first so bubbles land on their lines.
  const voiced = await voiceChats(projectId, doc.spec).catch(() => null);
  if (voiced) doc = await saveVideoSpec(projectId, videoId, voiced);
  // Move captions off busy UI and box them on light screens (only captions not fitted yet).
  const fitted = await fitText(paths.renders(projectId), doc.spec, (p, stills) => workerJob({ props: compositionProps(projectId, p.spec), stills })).catch((e) => {
    console.log("[fit] skipped:", (e as Error).message);
    return null;
  });
  if (fitted) doc = await saveVideoSpec(projectId, videoId, fitted);
  // Carousels: cache b-roll stills and fill opt-in AI photos (cached, budget-capped) before the stills.
  if (doc.spec.kind === "slideshow") {
    const prepared = await prepareCarousel(projectId, doc.spec).catch((e) => {
      console.log("[carousel] prep skipped:", (e as Error).message);
      return null;
    });
    if (prepared) doc = await saveVideoSpec(projectId, videoId, prepared);
  }
  const hash = specHash(doc.spec);
  const dir = paths.renders(projectId);
  if (!force && doc.render?.specHash === hash && doc.status === "rendered") {
    try {
      await fsp.access(path.join(paths.project(projectId), doc.render.file));
      return doc;
    } catch {
      /* file vanished: re-render */
    }
  }
  await fsp.mkdir(dir, { recursive: true });
  const outRel = `renders/${videoId}.mp4`;
  const out = path.join(paths.project(projectId), outRel);
  const tmpOut = path.join(dir, `${videoId}.${hash}.tmp.mp4`);

  const isSlideshow = doc.spec.kind === "slideshow";
  const { timed } = layoutScenes(doc.spec.scenes);
  const stills = isSlideshow
    ? timed.map((t, i) => {
        const out = path.join(dir, `${videoId}-slides`, `${String(i + 1).padStart(2, "0")}.png`);
        const sc = t.scene;
        // Screenshot slides (a raw screen, a Notes list, a chat) go into the carousel at the phone's own
        // 9:16 size, like a saved screenshot. Notes and chats are shown complete (their last frame).
        const built = sc.type === "notes" || (sc.type === "chat" && sc.layout !== "card");
        if (((sc.type === "slide" && sc.layout === "screenshot") || built) && doc.spec.aspect !== "9:16") {
          const solo = { ...doc.spec, aspect: "9:16" as const, scenes: [{ ...sc, transition: "cut" as const }], overlays: [], captions: undefined };
          return { frame: built ? t.frames - 2 : Math.round(t.frames * 0.55), out, props: compositionProps(projectId, solo) };
        }
        if (built) return { frame: t.from + t.frames - 2, out };
        // The settled frame of each slide: after its entrance, before its exit.
        return { frame: t.from + Math.min(t.frames - 1, t.enterFrames + Math.round(t.frames * 0.55)), out };
      })
    : [];

  await patchVideo(projectId, videoId, { status: "rendering", progress: 0, error: undefined });
  emit({ type: "render", projectId, videoId, status: "rendering", progress: 0 });
  onStarted();

  try {
    let lastEmit = 0;
    const onProgress = (progress: number) => {
      const t = Date.now();
      if (t - lastEmit > 250 || progress >= 1) {
        lastEmit = t;
        emit({ type: "render", projectId, videoId, status: "rendering", progress });
      }
    };
    if (isSlideshow && photoModeMp4(doc.spec)) {
      // Photo-mode MP4: the stills themselves, 9:16, a swipe on each beat of the bed (slideshow.ts).
      await workerJob({ props: compositionProps(projectId, doc.spec), stills }, (p) => onProgress(p * 0.8));
      await composeSlideshow(projectId, doc.spec, stills.map((s) => s.out), tmpOut);
      onProgress(1);
    } else await workerJob({ props: compositionProps(projectId, doc.spec), out: tmpOut, stills }, onProgress);
    await fsp.rename(tmpOut, out);
    const info = await probe(out);
    const thumbRel = `renders/${videoId}.jpg`;
    const hookEnd = Math.min(1.2, (timed[0]?.frames ?? 30) / 30 - 0.1);
    // A carousel's cover is its first slide, not a letterboxed video frame.
    if (isSlideshow && stills[0]) await run("ffmpeg", ["-v", "error", "-y", "-i", stills[0].out, "-vf", "scale=540:-2", "-q:v", "3", path.join(paths.project(projectId), thumbRel)]).catch(() => undefined);
    else await run("ffmpeg", ["-v", "error", "-y", "-ss", String(Math.max(0.3, hookEnd)), "-i", out, "-frames:v", "1", "-vf", "scale=540:-2", "-q:v", "3", path.join(paths.project(projectId), thumbRel)]).catch(() => undefined);
    const stat = await fsp.stat(out);
    const next = await patchVideo(projectId, videoId, {
      status: "rendered",
      progress: 1,
      render: {
        file: outRel,
        thumb: thumbRel,
        slides: stills.map((s) => path.relative(paths.project(projectId), s.out)),
        durationSec: info.durationSec ?? 0,
        sizeBytes: stat.size,
        renderedAt: now(),
        specHash: hash,
      },
    });
    emit({ type: "render", projectId, videoId, status: "rendered", progress: 1 });
    emit({ type: "videos", projectId });
    // A new video's first good render puts it in Review (apps/REVIEW-API.md).
    if (next?.reviewOnRender && !next.review) {
      const reviewed = await patchVideo(projectId, videoId, { review: { status: "pending", at: now() }, reviewOnRender: undefined });
      emit({ type: "review", projectId, videoId, status: "pending" });
      return reviewed!;
    }
    return next!;
  } catch (e) {
    const message = (e as Error).message ?? String(e);
    await fsp.rm(tmpOut, { force: true }).catch(() => undefined);
    await patchVideo(projectId, videoId, { status: "failed", error: message.slice(0, 2000) });
    emit({ type: "render", projectId, videoId, status: "failed", error: message });
    throw e;
  }
}
