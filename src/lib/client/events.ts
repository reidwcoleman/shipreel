"use client";
import { useEffect } from "react";
import type { ServerEvent } from "@/lib/types";

type Listener = (e: ServerEvent) => void;
const listeners = new Set<Listener>();
let source: EventSource | null = null;
let retry = 1000;

function connect() {
  if (typeof window === "undefined" || source) return;
  source = new EventSource("/api/events");
  source.onmessage = (m) => {
    retry = 1000;
    try {
      const e = JSON.parse(m.data) as ServerEvent | { type: "hello" };
      if (e.type === "hello") return;
      for (const l of listeners) l(e as ServerEvent);
    } catch {
      /* ignore */
    }
  };
  source.onerror = () => {
    source?.close();
    source = null;
    setTimeout(connect, (retry = Math.min(retry * 2, 15000)));
  };
}

/** Subscribe to server events (render progress, agent output, post status). */
export function useServerEvents(fn: Listener, deps: unknown[] = []) {
  useEffect(() => {
    connect();
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
