import type { PostMetrics, Verdict } from "@/lib/types";

/**
 * Per-post thresholds practitioners use (Larry loop): 50K+ → make 3 variations, 10–50K → keep the
 * format, 1–10K → one more variation, under 1K → drop the hook. Plus the views × conversion 2×2.
 */
export function verdictFor(m?: PostMetrics): { verdict: Verdict; label: string; advice: string; quadrant?: string } {
  const views = m?.views;
  if (views == null) return { verdict: "unknown", label: "No data yet", advice: "Add views after 24h and again at 72h." };
  const installs = m?.installs;
  const conv = installs != null && views > 0 ? installs / views : undefined;
  let quadrant: string | undefined;
  if (conv != null) {
    const highViews = views >= 10_000;
    const highConv = conv >= 0.005;
    quadrant = highViews
      ? highConv
        ? "Scale it: make 3 variations and cross-post."
        : "Views but no installs: fix the CTA (name the app + the outcome) and the bio link."
      : highConv
        ? "Converts but no reach: keep the body, test new hooks."
        : "Neither: switch format.";
  }
  if (views >= 50_000) return { verdict: "double-down", label: "Winner", advice: "Make 3 variations of this now (same body, new hooks).", quadrant };
  if (views >= 10_000) return { verdict: "keep", label: "Solid", advice: "Keep this format in rotation.", quadrant };
  if (views >= 1_000) return { verdict: "retry", label: "Meh", advice: "Give it one more variation with a different hook family.", quadrant };
  return { verdict: "drop", label: "Flop", advice: "Under 1K twice → retire this hook. Try a new format.", quadrant };
}
