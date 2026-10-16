"use client";
import { useSyncExternalStore } from "react";

/** Live `matchMedia` result. Server render (and first paint) assume `fallback`. */
export function useMediaQuery(query: string, fallback = false): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

/** Below this width the sidebar collapses to an icon rail. Keep in sync with `max-[1179px]:` classes. */
export const RAIL_QUERY = "(max-width: 1179px)";
