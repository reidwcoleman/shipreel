import React from "react";
import { cn } from "@/lib/cn";

/** Page header: one title, an optional one-line subtitle, actions on the right. */
export function PageHeader({ title, subtitle, actions, className, eyebrow }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; className?: string; eyebrow?: React.ReactNode }) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4 px-8 pt-8 pb-6", className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow && <div className="text-[11px] font-semibold tracking-[0.08em] text-fg-3 uppercase">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">{title}</h1>
        {subtitle && <p className="max-w-2xl text-sm leading-relaxed text-fg-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1320px] pb-24", className)}>{children}</div>;
}
