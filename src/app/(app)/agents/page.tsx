"use client";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowUp, Bot, Check, Copy, Download, FileText, FolderOpen, KeyRound, Loader2, RefreshCw, SquareTerminal, X } from "lucide-react";
import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/page";
import { useShell } from "@/components/shell/activity";
import { Button } from "@/components/ui/button";
import { inputCls, Select } from "@/components/ui/field";
import { Badge, Dot, Empty, SectionLabel, Segmented } from "@/components/ui/misc";
import { api, post, put, refresh, useApi } from "@/lib/client/api";
import { useActiveProject, useBootstrap } from "@/lib/client/store";
import { cn } from "@/lib/cn";
import type { AgentStatus, Run, Settings } from "@/lib/types";

const QUICK = [
  "Plan my next 7 posts: format, hook and posting time for each",
  "Write 10 hooks for my newest feature",
  "Why do you think my last video flopped? What should I change?",
  "Find 5 accounts in my niche that went viral this month and what they did",
  "Turn my latest git commits into 3 build-in-public post ideas",
];

const KIND: Record<Run["kind"], string> = { analyze: "Read product", ideas: "Ideas", video: "Wrote video", edit: "Edited video", captions: "Captions", trends: "Trends", chat: "Asked", post: "Posted" };

export default function AgentsPage() {
  const { data: boot, mutate: mutateBoot } = useBootstrap();
  const { projectId } = useActiveProject();
  const { data: runs } = useApi<Run[]>("/api/agents/runs", { refreshInterval: 10_000 });
  const { openRun } = useShell();
  const [q, setQ] = useState("");
  const [asking, setAsking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const settings = boot?.settings;
  const engine = settings?.engine ?? "claude";

  const saveSettings = async (patch: Partial<Settings>) => {
    await put("/api/settings", patch);
    await mutateBoot();
  };

  const ask = async (question: string) => {
    if (!question.trim()) return;
    setAsking(true);
    try {
      const run = await post<Run>("/api/agents/runs", { kind: "chat", question, projectId, engine });
      setQ("");
      openRun(run.id);
      refresh("/api/agents/runs");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAsking(false);
    }
  };

  return (
    <Page>
      <PageHeader title="Agents" subtitle="Claude Code and Codex do the work: reading your code, writing hooks and scripts, editing videos and captions. They run on your machine, with your own subscriptions, using the Shipreel framework." />
      <div className="flex flex-col gap-8 px-8">
        {/* Ask */}
        <section className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-5">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-accent" />
            <span className="text-[15px] font-semibold">Ask your marketing agent</span>
            <span className="text-xs text-fg-3">It knows your brief, your memory file and the playbook, and can search the web.</span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(q);
            }}
            className="flex items-center gap-2 rounded-xl border border-line bg-bg py-1.5 pr-1.5 pl-4 focus-within:border-accent/50"
          >
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="What should I post this week?" className="h-9 min-w-0 flex-1 bg-transparent text-sm focus:outline-none" aria-label="Ask your agent" />
            <Segmented
              layoutId="ask-engine"
              size="sm"
              value={engine}
              onChange={(v) => saveSettings({ engine: v })}
              options={[
                { value: "claude", label: "Claude" },
                { value: "codex", label: "Codex" },
              ]}
            />
            <button type="submit" disabled={!q.trim() || asking} className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-ink transition-colors disabled:bg-hover disabled:text-fg-3" aria-label="Ask">
              {asking ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" strokeWidth={2.5} />}
            </button>
          </form>
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => {
                  // Fill, don't run: a run costs money, so it starts only on a deliberate ↵.
                  setQ(x);
                  requestAnimationFrame(() => {
                    inputRef.current?.focus();
                    inputRef.current?.select();
                  });
                }}
                className="rounded-full border border-line px-3 py-1 text-xs text-fg-3 transition-colors hover:border-line-strong hover:text-fg">
                {x}
              </button>
            ))}
          </div>
        </section>

        {/* Workers */}
        <section className="grid gap-4 lg:grid-cols-2">
          {(boot?.agents ?? []).map((a) => (
            <AgentCard key={a.engine} agent={a} isDefault={engine === a.engine} settings={settings} onDefault={() => saveSettings({ engine: a.engine })} onSaved={saveSettings} />
          ))}
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Runs */}
          <section className="flex flex-col gap-3">
            <SectionLabel aside={<span className="text-[11px] text-fg-3">{runs?.length ?? 0} recent</span>}>What they did</SectionLabel>
            {!runs?.length ? (
              <Empty icon={<Bot className="size-5" />} title="No runs yet" body="Ask a question above, re-read your product, or tell an agent to edit a video." className="rounded-xl border border-line" />
            ) : (
              <div className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line">
                {runs.slice(0, 40).map((r) => (
                  <button key={r.id} onClick={() => openRun(r.id)} className="flex items-center gap-3 bg-panel px-4 py-3 text-left transition-colors hover:bg-raised">
                    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", r.status === "running" ? "bg-accent-soft text-accent" : r.status === "done" ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad")}>
                      {r.status === "running" ? <Loader2 className="size-3.5 animate-spin" /> : r.status === "done" ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13px] font-medium">{r.title}</span>
                      <span className="truncate text-[11px] text-fg-3">
                        {r.engine === "codex" ? "Codex" : "Claude Code"} · {KIND[r.kind] ?? r.kind} · {formatDistanceToNowStrict(new Date(r.startedAt))} ago
                        {r.endedAt ? ` · ${Math.max(1, Math.round((new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime()) / 1000))}s` : ""}
                        {r.error ? ` · ${r.error.slice(0, 80)}` : ""}
                      </span>
                    </span>
                    {r.costUsd ? <span className="font-mono text-[11px] text-fg-3 tabular-nums">${r.costUsd.toFixed(3)}</span> : null}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Framework */}
          <Framework />
        </div>
      </div>
    </Page>
  );
}

function AgentCard({ agent: a, isDefault, settings, onDefault, onSaved }: { agent: AgentStatus; isDefault: boolean; settings?: Settings; onDefault: () => void; onSaved: (p: Partial<Settings>) => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [out, setOut] = useState<string | null>(null);
  const isClaude = a.engine === "claude";
  const name = isClaude ? "Claude Code" : "Codex";
  const recheck = async () => {
    setBusy("check");
    await api("/api/agents?force=1");
    await refresh("/api/bootstrap");
    setBusy(null);
  };
  const action = async (act: "install-codex" | "login-codex") => {
    setBusy(act);
    try {
      const r = await post<{ ok: boolean; output: string }>("/api/agents", { action: act });
      setOut(r.output);
      if (r.ok) toast.success(act === "install-codex" ? "Codex installed" : "Finish signing in in your browser");
      else toast.error("That didn't work", { description: r.output.slice(-200) });
      await recheck();
    } finally {
      setBusy(null);
    }
  };
  const ready = a.installed && a.loggedIn !== false;
  return (
    <div className={cn("flex flex-col gap-4 rounded-xl border bg-panel p-5", isDefault ? "border-line-strong" : "border-line")}>
      <div className="flex items-start gap-3">
        <span className={cn("flex size-10 items-center justify-center rounded-xl", isClaude ? "bg-[#D97757]/15 text-[#E8956F]" : "bg-fg/10 text-fg")}>
          {isClaude ? <Bot className="size-5" /> : <SquareTerminal className="size-5" />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2 text-[15px] font-semibold">
            {name}
            {isDefault && <Badge tone="accent">Default</Badge>}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-fg-3">
            <Dot tone={ready ? "ok" : a.installed ? "warn" : "neutral"} />
            {a.installed ? `${a.version ?? "installed"}${a.loggedIn === false ? " · not signed in" : ""}` : isClaude ? "Not found on this Mac" : "Not installed (runs through npx)"}
          </span>
        </div>
        <Button size="sm" variant="ghost" loading={busy === "check"} icon={<RefreshCw className="size-3.5" />} onClick={recheck}>
          Check
        </Button>
      </div>
      <p className="text-[13px] leading-relaxed text-fg-2">
        {isClaude
          ? "Uses your Claude subscription or API key through the Claude Code CLI. Best at reading big codebases and writing on-brand copy; can also drive Chrome for posting (opt-in)."
          : "Uses your ChatGPT plan or OpenAI key through the Codex CLI. Great at structured edits; reads your repo in a read-only sandbox."}
      </p>
      {a.path && <code className="truncate rounded-md bg-bg px-2.5 py-1.5 font-mono text-[11px] text-fg-3">{a.path}</code>}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-fg-3">Model</span>
          <input
            defaultValue={(isClaude ? settings?.claudeModel : settings?.codexModel) ?? ""}
            placeholder={isClaude ? "default (e.g. opus, sonnet)" : "default (e.g. gpt-5-codex)"}
            onBlur={(e) => onSaved(isClaude ? { claudeModel: e.target.value.trim() || undefined } : { codexModel: e.target.value.trim() || undefined })}
            className={cn(inputCls, "h-8 font-mono text-xs")}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-fg-3">Effort</span>
          <Select value={settings?.effort ?? "medium"} onChange={(e) => onSaved({ effort: e.target.value as Settings["effort"] })} className="h-8 text-[13px]">
            <option value="low">Low (fast)</option>
            <option value="medium">Medium</option>
            <option value="high">High (thorough)</option>
          </Select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {!isDefault && (
          <Button size="sm" onClick={onDefault} disabled={!a.installed && isClaude}>
            Make default
          </Button>
        )}
        {!isClaude && !a.installed && (
          <Button size="sm" variant="primary" loading={busy === "install-codex"} icon={<Download className="size-3.5" />} onClick={() => action("install-codex")}>
            Install Codex
          </Button>
        )}
        {!isClaude && a.installed && a.loggedIn !== true && (
          <Button size="sm" variant="primary" loading={busy === "login-codex"} icon={<KeyRound className="size-3.5" />} onClick={() => action("login-codex")}>
            Sign in to Codex
          </Button>
        )}
        {isClaude && !a.installed && (
          <Button size="sm" variant="primary" icon={<Copy className="size-3.5" />} onClick={() => navigator.clipboard.writeText("npm install -g @anthropic-ai/claude-code").then(() => toast("Copied. Run it in Terminal, then sign in with `claude`."))}>
            Copy install command
          </Button>
        )}
      </div>
      {out && <pre className="max-h-40 overflow-auto rounded-md bg-bg p-3 font-mono text-[11px] whitespace-pre-wrap text-fg-3">{out}</pre>}
    </div>
  );
}

function Framework() {
  const [copied, setCopied] = useState<string | null>(null);
  const { data } = useApi<{ workspace: string; appRoot: string; cli: string; mcp: string }>("/api/framework?paths=1");
  const copy = (k: string, v: string) => {
    navigator.clipboard.writeText(v);
    setCopied(k);
    setTimeout(() => setCopied(null), 1500);
  };
  const mcpClaude = data ? `claude mcp add shipreel -- node ${data.mcp}` : "";
  const mcpCodex = data ? `codex mcp add shipreel -- node ${data.mcp}` : "";
  const block = (k: string, label: string, v: string) => (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-fg-3">{label}</span>
      <div className="flex items-start gap-2 rounded-md border border-line bg-bg px-3 py-2">
        <code className="min-w-0 flex-1 font-mono text-[11.5px] leading-relaxed break-all text-fg-2">{v}</code>
        <button onClick={() => copy(k, v)} className="mt-0.5 text-fg-3 hover:text-fg" aria-label={`Copy ${label}`}>
          {copied === k ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </div>
  );
  return (
    <section className="flex flex-col gap-4">
      <SectionLabel>The framework</SectionLabel>
      <div className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-5 text-[13px] leading-relaxed text-fg-2">
        <p>
          Everything Shipreel makes is plain files your agents can read and write: each video is a JSON <b className="font-medium text-fg">VideoSpec</b>, each product has a <b className="font-medium text-fg">project.json</b> brief and a <b className="font-medium text-fg">memory.md</b>, and <b className="font-medium text-fg">FRAMEWORK.md</b> teaches the rules (formats, hooks, safe zones, honesty).
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" icon={<FileText className="size-3.5" />} onClick={() => post("/api/open", { path: `${data?.workspace}/FRAMEWORK.md` }).catch(() => toast.error("Couldn't open it"))}>
            Open FRAMEWORK.md
          </Button>
          <Button size="sm" variant="ghost" icon={<FolderOpen className="size-3.5" />} onClick={() => post("/api/open", { path: `${data?.workspace}/projects`, reveal: true }).catch(() => toast.error("Couldn't open Finder"))}>
            Show workspace
          </Button>
        </div>
        <SectionLabel className="pt-2">Drive Shipreel from your own session</SectionLabel>
        <p className="text-fg-3">Working in Claude Code or Codex already? Add Shipreel as an MCP server and say “make a TikTok about the feature I just shipped”.</p>
        {data && (
          <>
            {block("mcp-claude", "Claude Code", mcpClaude)}
            {block("mcp-codex", "Codex", mcpCodex)}
            {block("cli", "Or use the CLI", `node ${data.cli} ideas --count 5`)}
          </>
        )}
      </div>
    </section>
  );
}
