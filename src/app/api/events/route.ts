import { bus } from "@/lib/server/store";
import type { ServerEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Server-sent events: render progress, agent output, post status. One stream per tab. */
export async function GET(req: Request) {
  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (e: ServerEvent | { type: "hello" }) => {
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          cleanup();
        }
      };
      const onEvent = (e: ServerEvent) => send(e);
      bus.on("event", onEvent);
      const ping = setInterval(() => {
        try {
          controller.enqueue(enc.encode(`: ping\n\n`));
        } catch {
          cleanup();
        }
      }, 15000);
      cleanup = () => {
        bus.off("event", onEvent);
        clearInterval(ping);
        try {
          controller.close();
        } catch {
          /* closed */
        }
      };
      req.signal.addEventListener("abort", cleanup);
      send({ type: "hello" });
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" },
  });
}
