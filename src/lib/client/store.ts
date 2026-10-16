"use client";
import type { Sound } from "@/framework/sounds";
import type { FormatDef } from "@/framework/formats";
import type { HookFamily, HookTemplate } from "@/framework/hooks";
import type { AgentStatus, Platform, Project, ProviderId, SecretsStatus, Settings } from "@/lib/types";
import { useApi } from "./api";

export type Bootstrap = {
  settings: Settings;
  projects: Project[];
  activeProjectId: string | null;
  agents: AgentStatus[];
  secrets: SecretsStatus;
  publishers: { id: ProviderId; label: string; blurb: string; platforms: Platform[]; ok: boolean; reason?: string }[];
  userName: string | null;
};

export type FormatMeta = Omit<FormatDef, "build">;

export type Framework = {
  formats: FormatMeta[];
  hooks: HookTemplate[];
  families: { id: HookFamily; label: string; blurb: string }[];
  sounds: Sound[];
  trendsRefreshedAt: string | null;
  trendNotes: string | null;
};

export function useBootstrap() {
  return useApi<Bootstrap>("/api/bootstrap", { revalidateOnFocus: true });
}

export function useActiveProject(): { project: Project | null; projectId: string | null; loading: boolean } {
  const { data, error } = useBootstrap();
  const id = data?.activeProjectId ?? null;
  return { project: data?.projects.find((p) => p.id === id) ?? null, projectId: id, loading: !data && !error };
}

export function useFramework() {
  return useApi<Framework>("/api/framework", { revalidateOnFocus: false });
}

export type ProjectDetail = { project: import("@/lib/types").Project; assets: import("@/lib/types").Asset[] };

export function useProjectDetail(projectId: string | null) {
  return useApi<ProjectDetail>(projectId ? `/api/projects/${projectId}` : null);
}
