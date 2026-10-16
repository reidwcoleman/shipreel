import { body, handle, json } from "@/lib/server/http";
import { detectAgents, installCodex, loginCodex } from "@/lib/server/agents";

export const dynamic = "force-dynamic";
export const GET = handle(async (req: Request) => json(await detectAgents(new URL(req.url).searchParams.has("force"))));
export const POST = handle(async (req: Request) => {
  const b = await body<{ action: "install-codex" | "login-codex" }>(req);
  if (b.action === "install-codex") return json(await installCodex());
  if (b.action === "login-codex") return json(await loginCodex());
  return json({ ok: false, output: "unknown action" }, 400);
});
