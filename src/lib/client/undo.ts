"use client";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { del, refresh } from "./api";

/**
 * Soft delete with Undo. The item disappears from the UI right away (lists filter it out via
 * `usePendingDeletes`), a toast offers Undo, and the real DELETE request only goes out after the
 * toast's lifetime. Nothing is ever re-created, so Undo works for any API that can delete.
 * If the page is closed mid-wait, pending deletes are flushed with `keepalive`.
 */
type Pending = { key: string; url: string; json?: unknown; refresh: string[]; timer: ReturnType<typeof setTimeout>; onCommitted?: () => void };

const DELAY = 6000;
const pending = new Map<string, Pending>();
const subs = new Set<() => void>();
let snapshot: ReadonlySet<string> = new Set();

function emit() {
  snapshot = new Set(pending.keys());
  for (const s of subs) s();
}

function subscribe(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

const EMPTY: ReadonlySet<string> = new Set();

/** Keys of items that are deleted in the UI but not on disk yet. */
export function usePendingDeletes(): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => EMPTY,
  );
}

async function commit(key: string) {
  const p = pending.get(key);
  if (!p) return;
  clearTimeout(p.timer);
  try {
    await del(p.url, p.json);
    await Promise.all(p.refresh.map((r) => refresh(r)));
    p.onCommitted?.();
  } catch (e) {
    toast.error("Couldn't delete", { description: (e as Error).message.slice(0, 160) });
    await Promise.all(p.refresh.map((r) => refresh(r)));
  } finally {
    pending.delete(key);
    emit();
  }
}

export function deleteWithUndo(opts: {
  /** Stable id the lists filter on, e.g. `video:<id>`. */
  key: string;
  /** Toast text, e.g. "Video deleted". */
  message: string;
  description?: string;
  url: string;
  json?: unknown;
  /** SWR key prefixes to revalidate after the delete lands (and after Undo). */
  refresh?: string[];
  onUndo?: () => void;
  onCommitted?: () => void;
}) {
  if (pending.has(opts.key)) return;
  const entry: Pending = {
    key: opts.key,
    url: opts.url,
    json: opts.json,
    refresh: opts.refresh ?? [],
    onCommitted: opts.onCommitted,
    timer: setTimeout(() => void commit(opts.key), DELAY),
  };
  pending.set(opts.key, entry);
  emit();
  const id = toast(opts.message, {
    description: opts.description,
    duration: DELAY,
    action: {
      label: "Undo",
      onClick: () => {
        const p = pending.get(opts.key);
        if (!p) return;
        clearTimeout(p.timer);
        pending.delete(opts.key);
        emit();
        opts.onUndo?.();
        toast.dismiss(id);
      },
    },
  });
}

if (typeof window !== "undefined") {
  // Closing or reloading the tab mid-wait: send the deletes anyway (the user never pressed Undo).
  window.addEventListener("pagehide", () => {
    for (const p of pending.values()) {
      clearTimeout(p.timer);
      try {
        void fetch(p.url, { method: "DELETE", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify(p.json ?? {}) });
      } catch {
        /* best effort */
      }
    }
    pending.clear();
  });
}
