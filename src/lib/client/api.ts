"use client";
import useSWR, { mutate, type SWRConfiguration } from "swr";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "content-type": "application/json", ...(rest.headers ?? {}) } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const text = await res.text();
  let data: unknown = undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = (data as { error?: string })?.error ?? `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }
  return data as T;
}

export const post = <T = unknown>(url: string, json?: unknown) => api<T>(url, { method: "POST", json: json ?? {} });
export const put = <T = unknown>(url: string, json: unknown) => api<T>(url, { method: "PUT", json });
export const patch = <T = unknown>(url: string, json: unknown) => api<T>(url, { method: "PATCH", json });
export const del = <T = unknown>(url: string, json?: unknown) => api<T>(url, { method: "DELETE", json: json ?? {} });

const fetcher = (url: string) => api(url);

export function useApi<T>(url: string | null, config?: SWRConfiguration<T>) {
  return useSWR<T>(url, fetcher as (u: string) => Promise<T>, { revalidateOnFocus: true, keepPreviousData: true, ...config });
}

/**
 * Revalidate every cached key that starts with a prefix (e.g. after an SSE event).
 * Key-only on purpose: passing a data argument (even undefined) would blank the cache first and
 * make every screen flash its empty state.
 */
export function refresh(prefix: string) {
  return mutate((key) => typeof key === "string" && key.startsWith(prefix));
}

export const mediaUrl = (projectId: string, rel: string) => `/api/media/${projectId}/${rel.split("/").map(encodeURIComponent).join("/")}`;
