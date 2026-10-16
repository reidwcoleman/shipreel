"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as Menu from "@radix-ui/react-dropdown-menu";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { X } from "lucide-react";
import React from "react";
import { cn } from "@/lib/cn";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  footer,
  wide,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-[2px] data-[state=closed]:animate-[fade-out_120ms_ease-in_forwards] data-[state=open]:animate-[fade-in_0.15s_ease-out]" />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-[100] flex max-h-[86vh] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-line bg-panel shadow-2xl focus:outline-none data-[state=closed]:animate-[dialog-out_120ms_var(--ease-in)_forwards] data-[state=open]:animate-[dialog-in_0.2s_var(--ease-out)]",
            wide ? "max-w-3xl" : "max-w-lg",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 pt-4 pb-3.5">
            <div className="flex flex-col gap-1">
              <DialogPrimitive.Title className="text-[15px] font-semibold text-fg">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-sm leading-relaxed text-fg-3">{description}</DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close className="-mr-1 rounded-md p-1 text-fg-3 hover:bg-hover hover:text-fg" aria-label="Close">
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Popover({ trigger, children, align = "start", className, open, onOpenChange }: { trigger: React.ReactNode; children: React.ReactNode; align?: "start" | "center" | "end"; className?: string; open?: boolean; onOpenChange?: (v: boolean) => void }) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={6}
          className={cn(
            "z-[120] origin-[var(--radix-popover-content-transform-origin)] rounded-lg border border-line bg-raised p-1 shadow-2xl focus:outline-none data-[state=closed]:animate-[pop-out_100ms_var(--ease-in)_forwards] data-[state=open]:animate-[pop-in_0.15s_var(--ease-out)]",
            className,
          )}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export function Dropdown({
  trigger,
  children,
  align = "end",
  className,
  matchTrigger,
  sideOffset = 6,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end" | "center";
  className?: string;
  /** Make the menu exactly as wide as its trigger (e.g. the project switcher). */
  matchTrigger?: boolean;
  sideOffset?: number;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>{trigger}</Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align={align}
          sideOffset={sideOffset}
          className={cn(
            "z-[120] min-w-44 origin-[var(--radix-dropdown-menu-content-transform-origin)] rounded-lg border border-line bg-raised p-1 shadow-2xl data-[state=closed]:animate-[pop-out_100ms_var(--ease-in)_forwards] data-[state=open]:animate-[pop-in_0.15s_var(--ease-out)]",
            matchTrigger && "w-[var(--radix-dropdown-menu-trigger-width)]",
            className,
          )}
        >
          {children}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** One menu row. Rows grow with their content: pass `description` for a second line. */
export function MenuItem({ children, onSelect, icon, danger, kbd, description }: { children: React.ReactNode; onSelect?: () => void; icon?: React.ReactNode; danger?: boolean; kbd?: string; description?: React.ReactNode }) {
  return (
    <Menu.Item
      onSelect={onSelect}
      className={cn(
        "flex min-h-8 cursor-pointer gap-2 rounded-md px-2 py-1.5 text-[13px] leading-5 outline-none select-none data-[highlighted]:bg-hover",
        description ? "items-start" : "items-center",
        danger ? "text-bad" : "text-fg",
      )}
    >
      <span className={cn("flex size-4 shrink-0 items-center justify-center text-fg-3", description && "mt-0.5")}>{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="min-w-0">{children}</span>
        {description && <span className="text-[11px] leading-4 text-fg-3">{description}</span>}
      </span>
      {kbd && <span className="font-mono text-[11px] text-fg-3">{kbd}</span>}
    </Menu.Item>
  );
}

export const MenuSeparator = () => <Menu.Separator className="my-1 h-px bg-line" />;
