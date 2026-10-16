import "server-only";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { customAlphabet } from "nanoid";
import type { SecretKey, SecretsStatus, ServerEvent, Settings } from "@/lib/types";

/** Root folder for all user data. Override with SHIPREEL_HOME. */
export const WORKSPACE = path.resolve(process.env.SHIPREEL_HOME ?? path.join(process.cwd(), "workspace"));
export const APP_ROOT = process.cwd();

export const paths = {
  settings: () => path.join(WORKSPACE, "settings.json"),
  secrets: () => path.join(WORKSPACE, ".secrets.json"),
  projects: () => path.join(WORKSPACE, "projects"),
  project: (id: string) => path.join(WORKSPACE, "projects", safeId(id)),
  projectFile: (id: string) => path.join(WORKSPACE, "projects", safeId(id), "project.json"),
  ideas: (id: string) => path.join(WORKSPACE, "projects", safeId(id), "ideas.json"),
  videos: (id: string) => path.join(WORKSPACE, "projects", safeId(id), "videos"),
  video: (id: string, vid: string) => path.join(WORKSPACE, "projects", safeId(id), "videos", `${safeId(vid)}.json`),
  assets: (id: string) => path.join(WORKSPACE, "projects", safeId(id), "assets"),
  assetsIndex: (id: string) => path.join(WORKSPACE, "projects", safeId(id), "assets.json"),
  renders: (id: string) => path.join(WORKSPACE, "projects", safeId(id), "renders"),
  posts: (id: string) => path.join(WORKSPACE, "projects", safeId(id), "posts.json"),
  runs: () => path.join(WORKSPACE, "runs"),
  run: (runId: string) => path.join(WORKSPACE, "runs", `${safeId(runId)}.json`),
  runLog: (runId: string) => path.join(WORKSPACE, "runs", `${safeId(runId)}.jsonl`),
  tmp: () => path.join(WORKSPACE, ".tmp"),
};

export function safeId(id: string): string {
  const clean = String(id).replace(/[^a-zA-Z0-9_-]/g, "");
  if (!clean) throw new Error(`invalid id: ${id}`);
  return clean;
}

const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 10);
export const newId = (prefix = "") => `${prefix}${nano()}`;

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40) || `project-${nano().slice(0, 4)}`
  );
}

export const now = () => new Date().toISOString();

// ── JSON IO with per-file serialisation and atomic writes ─────────────────────────────

const locks = new Map<string, Promise<unknown>>();

async function withLock<T>(file: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(file) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((r) => (release = r));
  locks.set(file, prev.then(() => next));
  await prev.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(file) === next) locks.delete(file);
  }
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fsp.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    if (e instanceof SyntaxError) {
      console.error(`[store] corrupt JSON in ${file}:`, e.message);
      return fallback;
    }
    throw e;
  }
}

export async function writeJson(file: string, data: unknown, mode?: number): Promise<void> {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2) + "\n", mode ? { mode } : undefined);
  await fsp.rename(tmp, file);
}

/** Read-modify-write a JSON file under a lock. */
export async function updateJson<T>(file: string, fallback: T, fn: (v: T) => T | Promise<T>, mode?: number): Promise<T> {
  return withLock(file, async () => {
    const cur = await readJson<T>(file, fallback);
    const next = await fn(cur);
    await writeJson(file, next, mode);
    return next;
  });
}

export async function exists(p: string): Promise<boolean> {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function ensureWorkspace(): Promise<void> {
  await fsp.mkdir(paths.projects(), { recursive: true });
  await fsp.mkdir(paths.runs(), { recursive: true });
  await fsp.mkdir(paths.tmp(), { recursive: true });
}

// ── Settings & secrets ───────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: Settings = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  engine: "claude",
  effort: "medium",
  autopilot: false,
  defaultProvider: "manual",
  defaultPlatforms: ["tiktok", "instagram", "youtube"],
  // New accounts ramp at 1–2 posts/day; installs peak 7–9 PM local (see the Library playbook).
  slots: [
    { platform: "tiktok", time: "16:30", days: [0, 1, 2, 3, 4, 5, 6] },
    { platform: "tiktok", time: "19:30", days: [0, 1, 2, 3, 4, 5, 6] },
  ],
  projectsRoot: path.dirname(APP_ROOT),
  onboarded: false,
};

export async function getSettings(): Promise<Settings> {
  const s = await readJson<Partial<Settings>>(paths.settings(), {});
  return { ...DEFAULT_SETTINGS, ...s };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  return updateJson<Settings>(paths.settings(), DEFAULT_SETTINGS, (cur) => ({ ...DEFAULT_SETTINGS, ...cur, ...patch }));
}

const SECRET_KEYS: SecretKey[] = [
  "uploadPostKey",
  "uploadPostUser",
  "ayrshareKey",
  "blueskyHandle",
  "blueskyAppPassword",
  "webhookUrl",
  "elevenlabsKey",
  "pexelsKey",
];

type Secrets = Partial<Record<SecretKey, string>>;

export async function getSecrets(): Promise<Secrets> {
  const s = await readJson<Secrets>(paths.secrets(), {});
  // Environment variables win (SHIPREEL_UPLOAD_POST_KEY etc.).
  const env: Secrets = {};
  for (const k of SECRET_KEYS) {
    const name = `SHIPREEL_${k.replace(/[A-Z]/g, (m) => `_${m}`).toUpperCase()}`;
    if (process.env[name]) env[k] = process.env[name];
  }
  return { ...s, ...env };
}

export async function getSecret(k: SecretKey): Promise<string | undefined> {
  return (await getSecrets())[k] || undefined;
}

export async function setSecrets(patch: Secrets): Promise<SecretsStatus> {
  const next = await updateJson<Secrets>(
    paths.secrets(),
    {},
    (cur) => {
      const out = { ...cur };
      for (const [k, v] of Object.entries(patch)) {
        if (!SECRET_KEYS.includes(k as SecretKey)) continue;
        if (v === "" || v == null) delete out[k as SecretKey];
        else out[k as SecretKey] = String(v).trim();
      }
      return out;
    },
    0o600,
  );
  return statusOf(next);
}

export async function secretsStatus(): Promise<SecretsStatus> {
  return statusOf(await getSecrets());
}

function statusOf(s: Secrets): SecretsStatus {
  return Object.fromEntries(SECRET_KEYS.map((k) => [k, Boolean(s[k])])) as SecretsStatus;
}

// ── Event bus for the UI (SSE) ─────────────────────────────────────────────────────────

type Bus = EventEmitter & { __shipreel?: true };
const g = globalThis as unknown as { __shipreelBus?: Bus };
export const bus: Bus = g.__shipreelBus ?? (g.__shipreelBus = Object.assign(new EventEmitter(), { __shipreel: true as const }));
bus.setMaxListeners(200);

export function emit(event: ServerEvent) {
  bus.emit("event", event);
}

export function fileSize(p: string): number {
  try {
    return fs.statSync(p).size;
  } catch {
    return 0;
  }
}
