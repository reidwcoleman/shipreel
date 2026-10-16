import { body, handle, json } from "@/lib/server/http";
import { refreshTrends } from "@/lib/server/tasks";
import type { AgentEngine } from "@/lib/types";

export const dynamic = "force-dynamic";
export const POST = handle(async (req: Request) => json(await refreshTrends(await body<{ engine?: AgentEngine }>(req))));
