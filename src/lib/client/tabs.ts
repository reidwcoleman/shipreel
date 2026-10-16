"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Tab state that lives in the URL (`?tab=memory`), so deep links work and refresh keeps the tab.
 * The page using it must sit inside a <Suspense> boundary (useSearchParams).
 */
export function useTabParam<T extends string>(tabs: readonly T[], fallback: T): [T, (t: T) => void] {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = search.get("tab");
  const tab = raw && (tabs as readonly string[]).includes(raw) ? (raw as T) : fallback;
  const setTab = useCallback(
    (t: T) => {
      const q = new URLSearchParams(search.toString());
      if (t === fallback) q.delete("tab");
      else q.set("tab", t);
      const qs = q.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [search, router, pathname, fallback],
  );
  return [tab, setTab];
}
