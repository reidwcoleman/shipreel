"use client";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Loader2 } from "lucide-react";
import React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "xs" | "sm" | "md" | "lg" | "xl";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-hover active:bg-accent-press font-semibold",
  secondary: "bg-raised text-fg border border-line hover:bg-hover hover:border-line-strong",
  ghost: "text-fg-2 hover:text-fg hover:bg-hover",
  danger: "bg-bad-soft text-bad hover:bg-bad/20",
  outline: "border border-line text-fg hover:bg-hover hover:border-line-strong",
};

const sizes: Record<Size, string> = {
  xs: "h-6 px-2 text-xs gap-1 rounded-sm",
  sm: "h-7 px-2.5 text-[13px] gap-1.5 rounded-md",
  md: "h-8 px-3 text-sm gap-2 rounded-md",
  lg: "h-10 px-4 text-[15px] gap-2 rounded-md",
  xl: "h-12 px-5 text-base gap-2.5 rounded-lg",
};

/** The button look for things that aren't <button>s (e.g. a next/link), so we never nest <a><button>. */
export function buttonClass({ variant = "secondary", size = "md", className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    "inline-flex select-none items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,transform,opacity] duration-150 active:scale-[0.97]",
    variants[variant],
    sizes[size],
    className,
  );
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  kbd?: string;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, kbd, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,transform,opacity] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        sizes[size],
        // A disabled lime button reads as muddy olive: go neutral instead (loading keeps the lime).
        variant === "primary" && disabled && !loading && "bg-hover text-fg-3 opacity-100 disabled:opacity-100",
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
      {kbd && <kbd className={cn("ml-1 rounded px-1 font-mono text-[11px]", variant === "primary" ? "bg-black/10" : "bg-hover text-fg-3")}>{kbd}</kbd>}
    </button>
  );
});

export function Tip({ label, children, side = "top", shortcut }: { label: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right"; shortcut?: string }) {
  return (
    <Tooltip.Root delayDuration={350}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={6}
          className="z-[200] flex origin-[var(--radix-tooltip-content-transform-origin)] items-center gap-2 rounded-md border border-line bg-raised px-2 py-1 text-xs text-fg shadow-xl data-[state=closed]:animate-[fade-out_90ms_ease-in_forwards] data-[state=delayed-open]:animate-[pop-in_0.15s_var(--ease-out)]"
        >
          {label}
          {shortcut && <kbd className="rounded bg-hover px-1 font-mono text-[10px] text-fg-3">{shortcut}</kbd>}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export const IconButton = React.forwardRef<HTMLButtonElement, ButtonProps & { label: string; tipSide?: "top" | "bottom" | "left" | "right" }>(
  function IconButton({ label, tipSide, size = "md", className, variant = "ghost", ...props }, ref) {
    const dims = { xs: "size-6", sm: "size-7", md: "size-8", lg: "size-10", xl: "size-12" }[size];
    return (
      <Tip label={label} side={tipSide} shortcut={props.kbd}>
        <Button ref={ref} aria-label={label} variant={variant} size={size} className={cn(dims, "px-0", className)} {...props} kbd={undefined} />
      </Tip>
    );
  },
);
