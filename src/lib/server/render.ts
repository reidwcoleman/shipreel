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
import { getVideo, patchVideo } from "./projects";
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
  const doc = await getVideo(projectId, videoId);
  if (!doc) throw new Error(`video ${videoId} not found`);
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
    ? timed.map((t, i) => ({
        // The settled frame of each slide: after its entrance, before its exit.
        frame: t.from + Math.min(t.frames - 1, t.enterFrames + Math.round(t.frames * 0.55)),
        out: path.join(dir, `${videoId}-slides`, `${String(i + 1).padStart(2, "0")}.png`),
      }))
    : [];

  await patchVideo(projectId, videoId, { status: "rendering", progress: 0, error: undefined });
  emit({ type: "render", projectId, videoId, status: "rendering", progress: 0 });
  onStarted();

  const jobId = `${videoId}-${Date.now()}`;
  try {
    await new Promise<void>((resolve, reject) => {
      let lastEmit = 0;
      jobs.set(jobId, {
        resolve,
        reject,
        onProgress: (progress: number) => {
          const t = Date.now();
          if (t - lastEmit > 250 || progress >= 1) {
            lastEmit = t;
            emit({ type: "render", projectId, videoId, status: "rendering", progress });
          }
        },
      });
      worker().stdin.write(
        JSON.stringify({ type: "render", jobId, props: compositionProps(projectId, doc.spec), out: tmpOut, stills }) + "\n",
      );
    });
    await fsp.rename(tmpOut, out);
    const info = await probe(out);
    const thumbRel = `renders/${videoId}.jpg`;
    const hookEnd = Math.min(1.2, (timed[0]?.frames ?? 30) / 30 - 0.1);
    await run("ffmpeg", ["-v", "error", "-y", "-ss", String(Math.max(0.3, hookEnd)), "-i", out, "-frames:v", "1", "-vf", "scale=540:-2", "-q:v", "3", path.join(paths.project(projectId), thumbRel)]).catch(() => undefined);
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
    return next!;
  } catch (e) {
    const message = (e as Error).message ?? String(e);
    await fsp.rm(tmpOut, { force: true }).catch(() => undefined);
    await patchVideo(projectId, videoId, { status: "failed", error: message.slice(0, 2000) });
    emit({ type: "render", projectId, videoId, status: "failed", error: message });
    throw e;
  }
}
