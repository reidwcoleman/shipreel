// Shared HTTP client for the Shipreel CLI and MCP server. Talks to the local app's API.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const BASE = (process.env.SHIPREEL_URL || "http://localhost:4747").replace(/\/$/, "");

export class ShipreelError extends Error {}

export async function call(method, route, body) {
  let res;
  try {
    res = await fetch(`${BASE}${route}`, {
      method,
      headers: body !== undefined ? { "content-type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ShipreelError(`Shipreel isn't running at ${BASE}. Start it with: shipreel start (or npm run dev in ${APP_ROOT})`);
  }
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  if (!res.ok) throw new ShipreelError(data?.error ? `${data.error}${data.errors ? `\n- ${data.errors.slice(0, 8).join("\n- ")}` : ""}` : `HTTP ${res.status} on ${route}`);
  return data;
}

export const get = (r) => call("GET", r);
export const post = (r, b = {}) => call("POST", r, b);
export const put = (r, b) => call("PUT", r, b);
export const patch = (r, b) => call("PATCH", r, b);

export async function boot() {
  return get("/api/bootstrap");
}

/** The active product id (or the one passed explicitly). */
export async function projectId(explicit) {
  if (explicit) return explicit;
  const b = await boot();
  if (!b.activeProjectId) throw new ShipreelError("No product yet. Open Shipreel and add one (or run: shipreel open).");
  return b.activeProjectId;
}

/** Wait for an agent run to finish; reports progress lines through onEvent. */
export async function waitRun(runId, { onEvent, timeoutMs = 20 * 60_000 } = {}) {
  const start = Date.now();
  let seen = 0;
  for (;;) {
    const { run, events } = await get(`/api/agents/runs/${runId}`);
    if (onEvent) for (const e of events.slice(seen)) onEvent(e);
    seen = events.length;
    if (run && run.status !== "running") return run;
    if (Date.now() - start > timeoutMs) throw new ShipreelError(`Timed out waiting for run ${runId}`);
    await new Promise((r) => setTimeout(r, 1500));
  }
}

/** Wait until a video's render finishes. */
export async function waitRender(pid, vid, { timeoutMs = 15 * 60_000 } = {}) {
  const start = Date.now();
  for (;;) {
    const v = await get(`/api/projects/${pid}/videos/${vid}`);
    if (v.status === "rendered" && v.render) return v;
    if (v.status === "failed") throw new ShipreelError(`Render failed: ${v.error ?? "unknown error"}`);
    if (Date.now() - start > timeoutMs) throw new ShipreelError("Timed out waiting for the render");
    await new Promise((r) => setTimeout(r, 1500));
  }
}

export async function readJsonFile(file) {
  return JSON.parse(await readFile(file, "utf8"));
}
