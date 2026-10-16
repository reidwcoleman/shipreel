"use client";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { motion } from "motion/react";
import React from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "ok" | "warn" | "bad" | "info";
const toneCls: Record<Tone, string> = {
  neutral: "bg-hover text-fg-2",
  accent: "bg-accent-soft text-accent",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
};

export function Badge({ tone = "neutral", children, className, icon }: { tone?: Tone; children: React.ReactNode; className?: string; icon?: React.ReactNode }) {
  return (
    <span className={cn("inline-flex h-5 items-center gap-1 rounded-sm px-1.5 text-[11px] font-medium whitespace-nowrap", toneCls[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

export function Dot({ tone = "neutral", pulse }: { tone?: Tone; pulse?: boolean }) {
  const c = { neutral: "bg-fg-3", accent: "bg-accent", ok: "bg-ok", warn: "bg-warn", bad: "bg-bad", info: "bg-info" }[tone];
  return (
    <span className="relative inline-flex size-2">
      {pulse && <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", c)} />}
      <span className={cn("relative inline-flex size-2 rounded-full", c)} />
    </span>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-line bg-panel px-1.5 py-px font-mono text-[11px] text-fg-3">{children}</kbd>;
}

export function Switch({ checked, onCheckedChange, label, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className="relative h-5 w-9 shrink-0 cursor-pointer rounded-full border border-line bg-hover transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent disabled:opacity-50"
    >
      <SwitchPrimitive.Thumb className="block size-4 translate-x-0.5 rounded-full bg-fg shadow transition-transform duration-150 data-[state=checked]:translate-x-[17px] data-[state=checked]:bg-accent-ink" />
    </SwitchPrimitive.Root>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
  layoutId,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; icon?: React.ReactNode; title?: string }[];
  size?: "sm" | "md";
  className?: string;
  layoutId: string;
}) {
  return (
    <div className={cn("inline-flex rounded-md border border-line bg-panel p-0.5", className)} role="radiogroup">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-[6px] font-medium transition-colors",
              size === "sm" ? "h-6 px-2 text-xs" : "h-7 px-2.5 text-[13px]",
              active ? "text-fg" : "text-fg-3 hover:text-fg-2",
            )}
          >
            {active && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-[6px] bg-hover" transition={{ type: "spring", bounce: 0, duration: 0.3 }} />}
            <span className="relative inline-flex items-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Progress({ value, className, tone = "accent" }: { value: number; className?: string; tone?: "accent" | "ok" }) {
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-hover", className)}>
      <motion.div className={cn("h-full rounded-full", tone === "accent" ? "bg-accent" : "bg-ok")} initial={false} animate={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }} transition={{ ease: "linear", duration: 0.25 }} />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} />;
}

export function Empty({ icon, title, body, action, className }: { icon?: React.ReactNode; title: string; body?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-16 text-center", className)}>
      {icon && <div className="flex size-12 items-center justify-center rounded-xl border border-line bg-panel text-fg-2">{icon}</div>}
      <div className="flex max-w-sm flex-col gap-1">
        <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
        {body && <p className="text-sm leading-relaxed text-fg-3">{body}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionLabel({ children, className, aside }: { children: React.ReactNode; className?: string; aside?: React.ReactNode }) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <h2 className="text-[11px] font-semibold tracking-[0.08em] text-fg-3 uppercase">{children}</h2>
      {aside}
    </div>
  );
}
