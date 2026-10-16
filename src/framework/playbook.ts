/**
 * The practitioner playbook distilled from research (Oct 2026): principles, cadence, benchmarks,
 * the iteration loop, what kills reach and how to route traffic. Shown in the Library and fed to
 * agents through FRAMEWORK.md.
 */
import raw from "./data/playbook.json";

export type Principle = { rule: string; why: string; source?: string };
export type Cadence = Record<string, { posts_per_day?: string; best_times_local?: string[]; notes?: string }>;

const data = raw as unknown as {
  principles: Principle[];
  cadence: Cadence;
  benchmarks: Record<string, string>;
  iteration_loop: string[];
  reach_killers: string[];
  traffic_routing: string[];
};

export const PLAYBOOK = {
  principles: data.principles ?? [],
  cadence: data.cadence ?? {},
  benchmarks: data.benchmarks ?? {},
  loop: data.iteration_loop ?? [],
  reachKillers: data.reach_killers ?? [],
  trafficRouting: data.traffic_routing ?? [],
};
