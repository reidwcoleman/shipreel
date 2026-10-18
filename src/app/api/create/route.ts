import { body, handle, json, requestOrigin } from "@/lib/server/http";
import { startCreate } from "@/lib/server/create";

export const dynamic = "force-dynamic";

/** Claude Code makes videos from a prompt with the Shipreel MCP server; each lands in Review as pending. */
export const POST = handle(async (req: Request) => {
  const b = await body<{ prompt?: string; projectId?: string; count?: number; formats?: string[] }>(req);
  try {
    return json(await startCreate({ prompt: b.prompt ?? "", projectId: b.projectId, count: b.count, formats: Array.isArray(b.formats) ? b.formats : undefined, origin: requestOrigin(req) }), 201);
  } catch (e) {
    const m = (e as Error).message;
    return json({ error: m }, { status: /not found/i.test(m) ? 404 : /say what|unknown format|no product/i.test(m) ? 400 : 500 });
  }
});
