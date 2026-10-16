import { detectAgents } from "@/lib/server/agents";
import { handle, json } from "@/lib/server/http";
import { activeProject, listProjects } from "@/lib/server/projects";
import { PUBLISHER_LIST } from "@/lib/server/publishers";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getSettings, secretsStatus } from "@/lib/server/store";

const run = promisify(execFile);
let cachedName: string | null | undefined;
async function userName(): Promise<string | null> {
  if (cachedName !== undefined) return cachedName;
  try {
    const { stdout } = await run("git", ["config", "--global", "user.name"]);
    cachedName = stdout.trim().split(/\s+/)[0] || null;
  } catch {
    cachedName = null;
  }
  return cachedName;
}

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const [settings, projects, project, agents, secrets, name] = await Promise.all([getSettings(), listProjects(), activeProject(), detectAgents(), secretsStatus(), userName()]);
  const publishers = await Promise.all(
    PUBLISHER_LIST.map(async (p) => ({ id: p.id, label: p.label, blurb: p.blurb, platforms: p.platforms, ...(await p.ready()) })),
  );
  return json({ settings, projects, activeProjectId: project?.id ?? null, agents, secrets, publishers, userName: name });
});
