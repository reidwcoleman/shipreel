"use client";
import { CircleAlert, CircleCheck, Info, Loader2, TriangleAlert } from "lucide-react";
import { MotionConfig } from "motion/react";
import React from "react";
import { Toaster } from "sonner";

/** The one branded Toaster every layout mounts (bottom-center, away from the dock on the right). */
export function AppToaster() {
  return (
    <Toaster
      theme="dark"
      position="bottom-center"
      offset={24}
      icons={{
        success: <CircleCheck className="size-4 text-ok" />,
        error: <CircleAlert className="size-4 text-bad" />,
        warning: <TriangleAlert className="size-4 text-warn" />,
        info: <Info className="size-4 text-info" />,
        loading: <Loader2 className="size-4 animate-spin text-fg-3" />,
      }}
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border-line !bg-raised/95 !text-fg !shadow-2xl !backdrop-blur !text-[13px]",
          description: "!text-fg-3",
          actionButton: "!rounded-md !bg-accent !font-semibold !text-accent-ink",
          cancelButton: "!rounded-md !bg-hover !text-fg-2",
        },
      }}
    />
  );
}

/** motion/react animations follow the OS "reduce motion" setting (CSS animations already do). */
export function Motion({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
