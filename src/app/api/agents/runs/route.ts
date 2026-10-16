import { bad, body, handle, json } from "@/lib/server/http";
import { listRuns } from "@/lib/server/agents";
import { askAgent, refreshTrends } from "@/lib/server/tasks";
import type { AgentEngine } from "@/lib/types";

export const dynamic = "force-dynamic";
export const GET = handle(async () => json(await listRuns(80)));
export const POST = handle(async (req: Request) => {
  const b = await body<{ kind: "chat" | "trends"; question?: string; projectId?: string; engine?: AgentEngine }>(req);
  if (b.kind === "trends") return json(await refreshTrends({ engine: b.engine }));
  if (!b.question?.trim()) return bad("Ask something.");
  return json(await askAgent(b.projectId, b.question.trim(), { engine: b.engine }));
});
