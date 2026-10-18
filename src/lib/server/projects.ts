import "server-only";
import fsp from "node:fs/promises";
import path from "node:path";
import type { Idea, Project, VideoDoc } from "@/lib/types";
import { normalizeSpec, type VideoSpec } from "@/remotion/spec";
import { emit, ensureWorkspace, exists, getSettings, newId, now, paths, readJson, saveSettings, slugify, updateJson, writeJson } from "./store";

export function blankProject(name: string, patch: Partial<Project> = {}): Project {
  const t = now();
  return {
    id: slugify(name),
    name,
    tagline: "",
    oneLiner: "",
    category: "",
    platforms: [],
    stage: "launched",
    audience: [],
    pains: [],
    outcomes: [],
    features: [],
    differentiators: [],
    proof: [],
    tone: "confident, casual, a little funny",
    brand: { accent: "#D7FF3A", bg: "#0B0B0F", fg: "#FFFFFF" },
    links: {},
    cta: { action: "link-in-bio", text: "Link in bio" },
    keywords: [],
    hashtags: [],
    competitors: [],
    screenshots: [],
    createdAt: t,
    updatedAt: t,
    ...patch,
  };
}

export async function listProjects(): Promise<Project[]> {
  await ensureWorkspace();
  const dirs = await fsp.readdir(paths.projects(), { withFileTypes: true });
  const out: Project[] = [];
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const p = await readJson<Project | null>(paths.projectFile(d.name), null);
    if (p) out.push(p);
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProject(id: string): Promise<Project | null> {
  const p = await readJson<Project | null>(paths.projectFile(id), null);
  return p ? { ...blankProject(p.name), ...p } : null;
}

export async function createProject(input: Partial<Project> & { name: string }): Promise<Project> {
  await ensureWorkspace();
  let id = slugify(input.id ?? input.name);
  let n = 2;
  while (await exists(paths.project(id))) id = `${slugify(input.name)}-${n++}`;
  const project = blankProject(input.name, { ...input, id });
  await fsp.mkdir(paths.assets(id), { recursive: true });
  await fsp.mkdir(paths.videos(id), { recursive: true });
  await fsp.mkdir(paths.renders(id), { recursive: true });
  await writeJson(paths.projectFile(id), project);
  await saveSettings({ activeProjectId: id });
  emit({ type: "project", projectId: id });
  return project;
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project> {
  const next = await updateJson<Project | null>(paths.projectFile(id), null, (cur) => {
    if (!cur) throw new Error(`project ${id} not found`);
    return { ...cur, ...patch, id: cur.id, createdAt: cur.createdAt, updatedAt: now() };
  });
  emit({ type: "project", projectId: id });
  return next!;
}

export async function deleteProject(id: string): Promise<void> {
  await fsp.rm(paths.project(id), { recursive: true, force: true });
  const s = await getSettings();
  if (s.activeProjectId === id) {
    const rest = await listProjects();
    await saveSettings({ activeProjectId: rest[0]?.id });
  }
}

export async function activeProject(): Promise<Project | null> {
  const s = await getSettings();
  if (s.activeProjectId) {
    const p = await getProject(s.activeProjectId);
    if (p) return p;
  }
  const all = await listProjects();
  return all[0] ?? null;
}

// ── Ideas ──────────────────────────────────────────────────────────────────────────

export async function listIdeas(projectId: string): Promise<Idea[]> {
  const ideas = await readJson<Idea[]>(paths.ideas(projectId), []);
  return ideas.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addIdeas(projectId: string, ideas: Omit<Idea, "id" | "createdAt" | "status">[]): Promise<Idea[]> {
  const created: Idea[] = ideas.map((i) => ({ ...i, id: newId("i_"), status: "new", createdAt: now() }));
  await updateJson<Idea[]>(paths.ideas(projectId), [], (cur) => [...created, ...cur]);
  emit({ type: "ideas", projectId });
  return created;
}

export async function updateIdea(projectId: string, ideaId: string, patch: Partial<Idea>): Promise<Idea | null> {
  let out: Idea | null = null;
  await updateJson<Idea[]>(paths.ideas(projectId), [], (cur) =>
    cur.map((i) => (i.id === ideaId ? (out = { ...i, ...patch, id: i.id }) : i)),
  );
  emit({ type: "ideas", projectId });
  return out;
}

export async function deleteIdeas(projectId: string, filter: (i: Idea) => boolean): Promise<void> {
  await updateJson<Idea[]>(paths.ideas(projectId), [], (cur) => cur.filter((i) => !filter(i)));
  emit({ type: "ideas", projectId });
}

// ── Videos ─────────────────────────────────────────────────────────────────────────

export async function listVideos(projectId: string): Promise<VideoDoc[]> {
  const dir = paths.videos(projectId);
  if (!(await exists(dir))) return [];
  const files = (await fsp.readdir(dir)).filter((f) => f.endsWith(".json"));
  const docs = await Promise.all(files.map((f) => readJson<VideoDoc | null>(path.join(dir, f), null)));
  return (docs.filter(Boolean) as VideoDoc[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getVideo(projectId: string, videoId: string): Promise<VideoDoc | null> {
  return readJson<VideoDoc | null>(paths.video(projectId, videoId), null);
}

export async function createVideo(projectId: string, spec: unknown, source: VideoDoc["source"]): Promise<VideoDoc> {
  const id = newId("v_");
  const normalized = normalizeSpec({ ...(spec as object), id });
  const t = now();
  // New videos land in Review once their first render succeeds (render.ts).
  const doc: VideoDoc = { id, projectId, spec: normalized, status: "draft", source, createdAt: t, updatedAt: t, reviewOnRender: true };
  await writeJson(paths.video(projectId, id), doc);
  emit({ type: "videos", projectId });
  return doc;
}

export async function saveVideoSpec(projectId: string, videoId: string, spec: VideoSpec | unknown): Promise<VideoDoc> {
  const normalized = normalizeSpec({ ...(spec as object), id: videoId });
  const doc = await updateJson<VideoDoc | null>(paths.video(projectId, videoId), null, (cur) => {
    if (!cur) throw new Error(`video ${videoId} not found`);
    return { ...cur, spec: normalized, updatedAt: now(), status: cur.status === "rendering" ? cur.status : "draft" };
  });
  emit({ type: "videos", projectId });
  return doc!;
}

export async function patchVideo(projectId: string, videoId: string, patch: Partial<VideoDoc>): Promise<VideoDoc | null> {
  const doc = await updateJson<VideoDoc | null>(paths.video(projectId, videoId), null, (cur) =>
    cur ? { ...cur, ...patch, id: cur.id, updatedAt: patch.spec ? now() : cur.updatedAt } : cur,
  );
  return doc;
}

export async function deleteVideo(projectId: string, videoId: string): Promise<void> {
  const doc = await getVideo(projectId, videoId);
  await fsp.rm(paths.video(projectId, videoId), { force: true });
  if (doc?.render?.file) await fsp.rm(path.join(paths.project(projectId), doc.render.file), { force: true });
  if (doc?.render?.thumb) await fsp.rm(path.join(paths.project(projectId), doc.render.thumb), { force: true });
  emit({ type: "videos", projectId });
}
