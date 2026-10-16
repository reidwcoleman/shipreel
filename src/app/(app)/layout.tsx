"use client";
import * as Tooltip from "@radix-ui/react-tooltip";
import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { AppToaster, Motion } from "@/components/ui/toaster";
import { ShellProvider, useShell } from "@/components/shell/activity";
import { CommandPalette } from "@/components/shell/command";
import { Sidebar } from "@/components/shell/sidebar";
import { useBootstrap } from "@/lib/client/store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [cmd, setCmd] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useBootstrap();

  // First run: no products yet → onboarding.
  useEffect(() => {
    if (data && data.projects.length === 0 && !data.settings.onboarded) router.replace("/welcome");
  }, [data, router]);

  return (
    <Motion>
    <Tooltip.Provider delayDuration={300}>
      <ShellProvider openCommand={() => setCmd(true)}>
        <div className="flex h-screen w-screen overflow-hidden [--sidebar-w:232px] max-[1179px]:[--sidebar-w:56px]">
          <Sidebar onSearch={() => setCmd(true)} />
          <main className="relative min-w-0 flex-1 overflow-y-auto">
            {/* Enter-only: an exit + mode="wait" added a blank frame to every navigation. */}
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </main>
        </div>
        <CommandPaletteBridge open={cmd} setOpen={setCmd} />
      </ShellProvider>
      <AppToaster />
    </Tooltip.Provider>
    </Motion>
  );
}

/** Lives inside ShellProvider so the palette can open the agent console. */
function CommandPaletteBridge({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const { openRun } = useShell();
  return <CommandPalette open={open} setOpen={setOpen} onRun={openRun} />;
}
