import "server-only";

/** Small helpers for route handlers: JSON responses and consistent errors. */
export function json(data: unknown, init?: number | ResponseInit) {
  return Response.json(data, typeof init === "number" ? { status: init } : init);
}

export function bad(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

/** Wrap a handler so thrown errors become JSON 500s with a readable message. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[api]", message);
      return Response.json({ error: message }, { status: /not found/i.test(message) ? 404 : 500 });
    }
  };
}
