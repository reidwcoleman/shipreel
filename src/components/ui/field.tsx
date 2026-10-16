"use client";
import React from "react";
import { cn } from "@/lib/cn";

export const inputCls =
  "w-full rounded-md border border-line bg-panel px-3 text-sm text-fg placeholder:text-fg-3 transition-colors hover:border-line-strong focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/15";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputCls, "h-9", className)} {...props} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(inputCls, "min-h-20 max-h-80 resize-y py-2 leading-relaxed [field-sizing:content]", className)} {...props} />;
});

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputCls, "h-9 cursor-pointer appearance-none bg-[length:16px] bg-[right_8px_center] bg-no-repeat pr-8", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props}>
      {children}
    </select>
  );
}

export function Field({ label, hint, error, children, className, aside }: { label: string; hint?: React.ReactNode; error?: string; children: React.ReactNode; className?: string; aside?: React.ReactNode }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="flex items-center justify-between text-[13px] font-medium text-fg-2">
        {label}
        {aside}
      </span>
      {children}
      {error ? <span className="text-xs text-bad">{error}</span> : hint ? <span className="text-xs text-fg-3">{hint}</span> : null}
    </label>
  );
}
