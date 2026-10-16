import React from "react";
import { cn } from "@/lib/cn";

/** Virality score (triage aid, not a promise): ring + tabular number. */
export function ScoreRing({ score, size = 40, className }: { score: number; size?: number; className?: string }) {
  const r = (size - 5) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }} title={`Launch score ${v}/100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-hover)" strokeWidth={3} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={v >= 75 ? "var(--color-accent)" : v >= 55 ? "var(--color-warn)" : "var(--color-fg-3)"}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <span className="absolute font-mono text-[11px] font-medium text-fg tabular-nums" style={{ fontSize: size * 0.3 }}>
        {v}
      </span>
    </div>
  );
}
