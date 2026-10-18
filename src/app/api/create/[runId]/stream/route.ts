import { getRun } from "@/lib/server/agents";
import { eventLines, getCreate } from "@/lib/server/create";
import { bad } from "@/lib/server/http";
import { bus } from "@/lib/server/store";
import type { RunEvent, ServerEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Terminal-style output of a create run: `event: line` per line (from the start), then `event: done`. */
export async function GET(req: Request, ctx: { params: Promise<{ runId: string }> }) {
  const { runId } = await ctx.params;
  if (!(await getCreate(runId))) return bad("run not found", 404);
  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const write = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };
      const lines = (e: RunEvent) => eventLines(e).forEach((text) => write("line", { text }));
      const finish = async () => {
        const r = await getCreate(runId);
        write("done", { status: r?.status ?? "failed", videoIds: r?.videoIds ?? [] });
        cleanup();
      };
      // Subscribe before reading what's there, so nothing falls between the two.
      let snapshot: RunEvent[] | null = null;
      const buffered: ServerEvent[] = [];
      const onEvent = (e: ServerEvent) => {
        if (!snapshot) return void buffered.push(e);
        handleEvent(e);
      };
      const handleEvent = (e: ServerEvent) => {
        if (e.type === "run-event" && e.runId === runId && !snapshot!.includes(e.event)) lines(e.event);
        else if (e.type === "run" && e.run.id === runId && e.run.status !== "running") void finish();
      };
      const ping = setInterval(() => {
        try {
          controller.enqueue(enc.encode(`: ping\n\n`));
        } catch {
          cleanup();
        }
      }, 15000);
      cleanup = () => {
        if (closed) return;
        closed = true;
        bus.off("event", onEvent);
        clearInterval(ping);
        try {
          controller.close();
        } catch {
          /* closed */
        }
      };
      bus.on("event", onEvent);
      req.signal.addEventListener("abort", cleanup);
      const { run, events } = await getRun(runId);
      snapshot = [...events];
      snapshot.forEach(lines);
      for (const e of buffered) handleEvent(e);
      if (!run || run.status !== "running") await finish();
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" },
  });
}
