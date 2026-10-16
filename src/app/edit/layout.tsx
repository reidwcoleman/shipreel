"use client";
import * as Tooltip from "@radix-ui/react-tooltip";
import React from "react";
import { AppToaster, Motion } from "@/components/ui/toaster";
import { ShellProvider } from "@/components/shell/activity";

/** The editor is full-screen (no sidebar) but keeps the activity dock and agent sheet. */
export default function EditLayout({ children }: { children: React.ReactNode }) {
  return (
    <Motion>
      <Tooltip.Provider delayDuration={300}>
        <ShellProvider openCommand={() => undefined}>{children}</ShellProvider>
        <AppToaster />
      </Tooltip.Provider>
    </Motion>
  );
}
