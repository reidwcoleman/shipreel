import "server-only";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { promisify } from "node:util";
import type { AgentEngine, AgentStatus, Run, RunEvent, RunKind } from "@/lib/types";
import { emit, getSettings, newId, now, paths, readJson, writeJson, WORKSPACE } from "./store";

const run = promisify(execFile);

// ── Detection ────────────────────────────────────────────────────────────────────

const EXTRA_PATHS = ["/opt/homebrew/bin", "/usr/local/bin", `${process.env.HOME}/.local/bin`, `${process.env.HOME}/.npm-global/bin`, `${process.env.HOME}/.claude/local`];

export function agentEnv(): NodeJS.ProcessEnv {
  const PATH = [...new Set([...(process.env.PATH ?? "").split(":"), ...EXTRA_PATHS])].join(":");
  return { ...process.env, PATH, FORCE_COLOR: "0", NO_COLOR: "1" };
}

async function which(bin: string): Promise<string | null> {
  try {
    const { stdout } = await run("/usr/bin/which", [bin], { env: agentEnv() });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

const g = globalThis as unknown as { __shipreelAgentCache?: { at: number; data: AgentStatus[] } };

export async function detectAgents(force = false): Promise<AgentStatus[]> {
  if (!force && g.__shipreelAgentCache && Date.now() - g.__shipreelAgentCache.at < 60_000) return g.__shipreelAgentCache.data;
  const [claude, codex] = await Promise.all([detectClaude(), detectCodex()]);
  const data = [claude, codex];
  g.__shipreelAgentCache = { at: Date.now(), data };
  return data;
}

async function detectClaude(): Promise<AgentStatus> {
  const p = await which("claude");
  if (!p) return { engine: "claude", installed: false, note: "Install Claude Code: npm i -g @anthropic-ai/claude-code" };
  let version: string | undefined;
  try {
    version = (await run(p, ["--version"], { env: agentEnv(), timeout: 15_000 })).stdout.trim();
  } catch {
    /* ignore */
  }
  return { engine: "claude", installed: true, path: p, version, loggedIn: null };
}

async function detectCodex(): Promise<AgentStatus> {
  const p = await which("codex");
  const cmd = p ? [p] : null;
  if (!cmd) {
    return { engine: "codex", installed: false, note: "Not installed. Shipreel can install it (npm i -g @openai/codex) or run it through npx." };
  }
  let version: string | undefined;
  let loggedIn: boolean | null = null;
  try {
    version = (await run(cmd[0], ["--version"], { env: agentEnv(), timeout: 15_000 })).stdout.trim();
    const st = await run(cmd[0], ["login", "status"], { env: agentEnv(), timeout: 15_000 }).catch((e) => ({ stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? "") }));
    const out = `${st.stdout}${"stderr" in st ? st.stderr : ""}`.toLowerCase();
    loggedIn = out.includes("logged in") && !out.includes("not logged in");
  } catch {
    /* ignore */
  }
  return { engine: "codex", installed: true, path: p!, version, loggedIn };
}

export async function installCodex(): Promise<{ ok: boolean; output: string }> {
  try {
    const { stdout, stderr } = await run("npm", ["install", "-g", "@openai/codex"], { env: agentEnv(), timeout: 300_000 });
    g.__shipreelAgentCache = undefined;
    return { ok: true, output: `${stdout}\n${stderr}`.trim().slice(-2000) };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message: string };
    return { ok: false, output: `${err.stdout ?? ""}\n${err.stderr ?? err.message}`.trim().slice(-2000) };
  }
}

/** Opens the Codex browser sign-in (ChatGPT account). */
export async function loginCodex(): Promise<{ ok: boolean; output: string }> {
  const p = await which("codex");
  if (!p) return { ok: false, output: "Install Codex first." };
  return new Promise((resolve) => {
    const child = spawn(p, ["login"], { env: agentEnv(), stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    // Resolve quickly with the URL; the process keeps waiting for the browser callback.
    setTimeout(() => resolve({ ok: true, output: out.trim().slice(-1500) || "Opened the Codex sign-in page in your browser." }), 4000);
    child.on("exit", () => {
      g.__shipreelAgentCache = undefined;
    });
  });
}

// ── Runs ─────────────────────────────────────────────────────────────────────────

export type RunSpec = {
  engine?: AgentEngine;
  kind: RunKind;
  title: string;
  projectId?: string;
  prompt: string;
  cwd?: string;
  /** Extra readable directories (e.g. the product's repo). */
  addDirs?: string[];
  /** JSON Schema (strict-compatible) for the final answer. */
  schema?: object;
  /** Allow file edits inside cwd/addDirs (repo tasks only). */
  allowWrite?: boolean;
  allowWeb?: boolean;
  /** Called with the parsed final answer; return value is stored on the run. */
  onResult?: (out: { structured: unknown; text: string }) => Promise<Run["output"] | void>;
  /** Claude Code in Chrome integration for browser tasks (posting via TikTok Studio). */
  chrome?: boolean;
  /** Claude only: MCP servers for this run ({ mcpServers: … }); only these load (--strict-mcp-config). */
  mcpConfig?: { mcpServers: Record<string, unknown> };
  /** Claude only: extra allowed / disallowed tools (e.g. "mcp__shipreel", "mcp__shipreel__post_now"). */
  allowedTools?: string[];
  disallowedTools?: string[];
  /** Log tool results as "tool-result" events (terminal-style output). */
  toolResults?: boolean;
  /** Every parsed Claude stream-json message, for callers that track what the agent did. */
  onMessage?: (msg: Record<string, unknown>) => void;
};

type Live = { child: ChildProcess; run: Run; events: RunEvent[] };
const gl = globalThis as unknown as { __shipreelRuns?: Map<string, Live> };
const live = (gl.__shipreelRuns ??= new Map());

export function liveRun(id: string): Live | undefined {
  return live.get(id);
}

export async function listRuns(limit = 50): Promise<Run[]> {
  const dir = paths.runs();
  await fsp.mkdir(dir, { recursive: true });
  const files = (await fsp.readdir(dir)).filter((f) => f.endsWith(".json"));
  const runs = await Promise.all(files.map((f) => readJson<Run | null>(path.join(dir, f), null)));
  return (runs.filter(Boolean) as Run[]).sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit);
}

export async function getRun(id: string): Promise<{ run: Run | null; events: RunEvent[] }> {
  const l = live.get(id);
  if (l) return { run: l.run, events: l.events };
  const r = await readJson<Run | null>(paths.run(id), null);
  let events: RunEvent[] = [];
  try {
    events = (await fsp.readFile(paths.runLog(id), "utf8"))
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as RunEvent);
  } catch {
    /* none */
  }
  return { run: r, events };
}

export async function cancelRun(id: string): Promise<boolean> {
  const l = live.get(id);
  if (!l) return false;
  l.run.status = "canceled";
  l.child.kill("SIGTERM");
  return true;
}

function summarizeToolInput(name: string, input: Record<string, unknown>): string {
  const s = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));
  const short = (v: string, n = 120) => (v.length > n ? `${v.slice(0, n)}…` : v);
  const rel = (p: unknown) => (typeof p === "string" ? p.replace(`${process.env.HOME}`, "~") : s(p));
  switch (name) {
    case "Read":
    case "Edit":
    case "Write":
    case "NotebookEdit":
      return rel(input.file_path ?? input.path ?? "");
    case "Glob":
      return s(input.pattern ?? "");
    case "Grep":
      return `${s(input.pattern ?? "")}${input.path ? ` in ${rel(input.path)}` : ""}`;
    case "Bash":
      return short(s(input.command ?? ""));
    case "WebSearch":
      return s(input.query ?? "");
    case "WebFetch":
      return s(input.url ?? "");
    case "Task":
    case "Agent":
      return short(s(input.description ?? input.prompt ?? ""));
    default: {
      // MCP tools ("mcp__shipreel__create_video"): the arguments that say what it's doing.
      if (name.startsWith("mcp__")) {
        const keys = ["format", "video", "hook", "decision", "action", "status", "url", "at", "note"];
        const picked = keys.filter((k) => input[k] !== undefined && input[k] !== "").map((k) => (k === "hook" || k === "note" ? `"${short(s(input[k]), 60)}"` : s(input[k])));
        if (picked.length) return picked.join(" ");
        if (input.spec && typeof input.spec === "object") return `spec ${short(s((input.spec as { formatId?: unknown }).formatId ?? ""), 40)}`.trim();
        const { project: _p, ...rest } = input;
        return Object.keys(rest).length ? short(s(rest)) : "";
      }
      if (name === "ToolSearch") return short(s(input.query ?? ""));
      return short(s(input));
    }
  }
}

function toolResultText(content: unknown): string {
  const raw = typeof content === "string" ? content : Array.isArray(content) ? content.map((c) => (c && typeof c === "object" && "text" in c ? String((c as { text: unknown }).text) : "")).join(" ") : "";
  const flat = raw.replace(/\s+/g, " ").trim();
  return flat.length > 160 ? `${flat.slice(0, 160)}…` : flat;
}

async function codexCommand(): Promise<string[]> {
  const p = await which("codex");
  if (p) return [p];
  const npx = (await which("npx")) ?? "npx";
  return [npx, "-y", "@openai/codex@latest"];
}

export async function startRun(spec: RunSpec): Promise<Run> {
  const settings = await getSettings();
  const engine: AgentEngine = spec.engine ?? settings.engine;
  const id = newId("r_");
  const cwd = spec.cwd ?? (spec.projectId ? paths.project(spec.projectId) : WORKSPACE);
  await fsp.mkdir(cwd, { recursive: true });
  const r: Run = { id, projectId: spec.projectId, engine, kind: spec.kind, title: spec.title, status: "running", startedAt: now() };
  await writeJson(paths.run(id), r);
  const logStream = fs.createWriteStream(paths.runLog(id), { flags: "a" });
  const events: RunEvent[] = [];
  const t0 = Date.now();
  const push = (e: Omit<RunEvent, "t">) => {
    const ev: RunEvent = { t: Date.now() - t0, ...e };
    events.push(ev);
    logStream.write(JSON.stringify(ev) + "\n");
    emit({ type: "run-event", runId: id, event: ev });
  };

  let argv: string[];
  let schemaFile: string | undefined;
  let mcpFile: string | undefined;
  let lastMsgFile: string | undefined;
  const addDirs = (spec.addDirs ?? []).filter((d) => d && fs.existsSync(d));

  if (engine === "claude") {
    const claude = (await which("claude")) ?? "claude";
    // Read/Glob/Grep cover cat, head and find; a find rule would also allow `find -exec`.
    const readTools = ["Read", "Glob", "Grep", "LS", "Bash(git log:*)", "Bash(git show:*)", "Bash(ls:*)", "Bash(wc:*)"];
    const webTools = spec.allowWeb ? ["WebSearch", "WebFetch"] : [];
    const writeTools = spec.allowWrite ? ["Edit", "Write", "MultiEdit", "Bash(git checkout:*)", "Bash(git add:*)", "Bash(git commit:*)", "Bash(git switch:*)", "Bash(git branch:*)", "Bash(npm run:*)", "Bash(npx tsc:*)"] : [];
    const chromeTools = spec.chrome ? ["mcp__claude-in-chrome__*", "ToolSearch"] : [];
    argv = [
      claude,
      "-p",
      "--output-format",
      "stream-json",
      "--verbose",
      "--permission-mode",
      spec.allowWrite ? "acceptEdits" : "dontAsk",
      "--allowedTools",
      [...readTools, ...webTools, ...writeTools, ...chromeTools, ...(spec.allowedTools ?? [])].join(","),
      "-n",
      `Shipreel: ${spec.title}`.slice(0, 60),
    ];
    const disallowed = [...(spec.allowWeb ? [] : ["WebSearch", "WebFetch"]), ...(spec.disallowedTools ?? [])];
    if (disallowed.length) argv.push("--disallowedTools", disallowed.join(","));
    if (spec.mcpConfig) {
      mcpFile = path.join(paths.tmp(), `${id}.mcp.json`);
      await fsp.mkdir(paths.tmp(), { recursive: true });
      await fsp.writeFile(mcpFile, JSON.stringify(spec.mcpConfig), { mode: 0o600 });
      argv.push("--mcp-config", mcpFile, "--strict-mcp-config");
    }
    for (const d of addDirs) argv.push("--add-dir", d);
    if (spec.schema) argv.push("--json-schema", JSON.stringify(spec.schema));
    if (settings.claudeModel) argv.push("--model", settings.claudeModel);
    if (settings.effort) argv.push("--effort", settings.effort);
    if (spec.chrome) argv.push("--chrome");
  } else {
    const base = await codexCommand();
    argv = [...base, "exec", "--json", "--skip-git-repo-check", "-C", cwd, "-s", spec.allowWrite ? "workspace-write" : "read-only"];
    for (const d of addDirs) if (spec.allowWrite) argv.push("--add-dir", d);
    if (spec.schema) {
      schemaFile = path.join(paths.tmp(), `${id}.schema.json`);
      await fsp.mkdir(paths.tmp(), { recursive: true });
      await fsp.writeFile(schemaFile, JSON.stringify(spec.schema));
      argv.push("--output-schema", schemaFile);
    }
    lastMsgFile = path.join(paths.tmp(), `${id}.last.txt`);
    argv.push("-o", lastMsgFile);
    if (settings.codexModel) argv.push("-m", settings.codexModel);
    argv.push("-"); // prompt on stdin
  }

  const child = spawn(argv[0], argv.slice(1), { cwd, env: agentEnv(), stdio: ["pipe", "pipe", "pipe"] });
  const entry: Live = { child, run: r, events };
  live.set(id, entry);
  emit({ type: "run", run: r });
  push({ kind: "status", text: `${engine === "claude" ? "Claude Code" : "Codex"} started` });
  child.stdin?.write(spec.prompt);
  child.stdin?.end();

  let finalText = "";
  let structured: unknown = undefined;
  let costUsd: number | undefined;
  let errorText = "";

  const rl = readline.createInterface({ input: child.stdout! });
  rl.on("line", (line) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    if (engine === "claude") {
      const type = msg.type as string;
      try {
        spec.onMessage?.(msg);
      } catch {
        /* a tracker's bug never breaks the run */
      }
      if (type === "user" && spec.toolResults) {
        const content = ((msg.message as { content?: unknown[] })?.content ?? []) as Record<string, unknown>[];
        for (const c of content) if (c.type === "tool_result") push({ kind: "tool-result", text: `${c.is_error ? "error: " : ""}${toolResultText(c.content)}` });
      }
      if (type === "system" && msg.subtype === "init") {
        push({ kind: "status", text: `Model: ${String(msg.model ?? "default")}` });
      } else if (type === "assistant") {
        const content = ((msg.message as { content?: unknown[] })?.content ?? []) as Record<string, unknown>[];
        for (const c of content) {
          if (c.type === "text" && typeof c.text === "string" && c.text.trim()) push({ kind: "text", text: c.text });
          else if (c.type === "tool_use") {
            const name = String(c.name);
            if (name === "StructuredOutput") push({ kind: "status", text: "Writing the result…" });
            else push({ kind: "tool", tool: name, detail: summarizeToolInput(name, (c.input ?? {}) as Record<string, unknown>) });
          }
        }
      } else if (type === "result") {
        finalText = String(msg.result ?? "");
        structured = msg.structured_output;
        costUsd = typeof msg.total_cost_usd === "number" ? msg.total_cost_usd : undefined;
        if (msg.is_error) errorText = finalText || String(msg.subtype ?? "error");
      }
    } else {
      const type = String(msg.type ?? "");
      const item = (msg.item ?? {}) as Record<string, unknown>;
      if (type === "item.started" && item.type === "command_execution") push({ kind: "tool", tool: "Shell", detail: String(item.command ?? "").slice(0, 160) });
      else if (type === "item.completed") {
        if (item.type === "agent_message" && item.text) {
          finalText = String(item.text);
          push({ kind: "text", text: finalText.length > 1200 ? `${finalText.slice(0, 1200)}…` : finalText });
        } else if (item.type === "reasoning" && item.text) push({ kind: "status", text: String(item.text).slice(0, 300) });
        else if (item.type === "file_change") push({ kind: "tool", tool: "Edit", detail: ((item.changes as { path: string }[]) ?? []).map((c) => c.path).join(", ") });
        else if (item.type === "web_search") push({ kind: "tool", tool: "WebSearch", detail: String(item.query ?? "") });
        else if (item.type === "mcp_tool_call") push({ kind: "tool", tool: String(item.tool ?? "MCP"), detail: String(item.server ?? "") });
      } else if (type === "turn.failed" || type === "error") {
        errorText = String((msg.error as { message?: string })?.message ?? msg.message ?? "Codex error");
      }
    }
  });
  let stderr = "";
  child.stderr?.on("data", (d) => {
    stderr += String(d);
    if (stderr.length > 20000) stderr = stderr.slice(-20000);
  });

  child.on("close", async (code) => {
    try {
      if (engine === "codex" && lastMsgFile) {
        try {
          finalText = (await fsp.readFile(lastMsgFile, "utf8")).trim() || finalText;
        } catch {
          /* no last message */
        }
        if (spec.schema) structured = tryParseJson(finalText);
      }
      if (r.status === "canceled") {
        push({ kind: "status", text: "Canceled" });
      } else if (code !== 0 && !finalText) {
        r.status = "failed";
        r.error = friendlyError(engine, (errorText || stderr.trim().split("\n").slice(-6).join("\n") || `exited with code ${code}`).slice(0, 2000));
        push({ kind: "error", text: r.error });
      } else if (errorText && !structured && !finalText) {
        r.status = "failed";
        r.error = friendlyError(engine, errorText);
        push({ kind: "error", text: r.error });
      } else {
        if (structured === undefined) structured = tryParseJson(finalText);
        try {
          const output = spec.onResult ? await spec.onResult({ structured, text: finalText }) : undefined;
          if (output) r.output = output;
          // Actions Shipreel carried out for the agent (e.g. posts it scheduled) are part of the answer.
          for (const n of output?.notes ?? []) push({ kind: "text", text: n });
          r.status = "done";
          r.summary = (output?.notes?.length ? `${finalText.replace(/```shipreel-actions[\s\S]*?```/gi, "").trim()}\n\n${output.notes.join("\n")}` : finalText).slice(0, 600);
          push({ kind: "result", text: "Done" });
        } catch (e) {
          r.status = "failed";
          r.error = (e as Error).message.slice(0, 2000);
          push({ kind: "error", text: r.error });
        }
      }
    } finally {
      r.endedAt = now();
      r.costUsd = costUsd;
      live.delete(id);
      logStream.end();
      await writeJson(paths.run(id), r);
      emit({ type: "run", run: r });
      for (const f of [schemaFile, lastMsgFile, mcpFile]) if (f) fsp.rm(f, { force: true }).catch(() => undefined);
    }
  });
  child.on("error", async (e) => {
    r.status = "failed";
    r.error = `Could not start ${engine}: ${e.message}`;
    push({ kind: "error", text: r.error });
  });
  return r;
}

/** Turn raw CLI failures into something a person can act on. */
function friendlyError(engine: AgentEngine, raw: string): string {
  const t = raw.toLowerCase();
  if (engine === "codex" && (t.includes("401") || t.includes("unauthorized") || t.includes("not logged in") || t.includes("login")))
    return `Codex isn't signed in. Open Agents → Sign in to Codex (uses your ChatGPT plan), or run \`codex login\` in Terminal.\n\n${raw}`;
  if (engine === "claude" && (t.includes("invalid api key") || t.includes("please run /login") || t.includes("not logged in") || t.includes("authentication")))
    return `Claude Code isn't signed in. Run \`claude\` in Terminal once and log in, then try again.\n\n${raw}`;
  if (t.includes("rate limit") || t.includes("usage limit") || t.includes("429")) return `${engine === "codex" ? "Codex" : "Claude"} hit a usage limit. Try again later or switch engines on the Agents page.\n\n${raw}`;
  return raw;
}

/** Find the JSON object in an agent's free-text answer (fenced or bare). */
export function tryParseJson(text: string): unknown {
  if (!text) return undefined;
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidates = [fenced?.[1], text];
  for (const c of candidates) {
    if (!c) continue;
    const s = c.trim();
    try {
      return JSON.parse(s);
    } catch {
      const start = s.search(/[[{]/);
      const end = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(s.slice(start, end + 1));
        } catch {
          /* keep trying */
        }
      }
    }
  }
  return undefined;
}

/** Wait for a run to finish (for chained server-side flows). */
export function waitForRun(id: string, timeoutMs = 15 * 60_000): Promise<Run> {
  return new Promise((resolve, reject) => {
    const l = live.get(id);
    if (!l) {
      readJson<Run | null>(paths.run(id), null).then((r) => (r ? resolve(r) : reject(new Error("run not found"))));
      return;
    }
    const timer = setTimeout(() => reject(new Error("run timed out")), timeoutMs);
    l.child.once("close", () => {
      // onResult runs after close; poll briefly for the final record.
      const check = async () => {
        if (live.has(id)) return setTimeout(check, 200);
        clearTimeout(timer);
        const r = await readJson<Run | null>(paths.run(id), null);
        r ? resolve(r) : reject(new Error("run vanished"));
      };
      check();
    });
  });
}
