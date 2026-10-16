"use client";
import { Link2, Wand2 } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { useShell } from "@/components/shell/activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { post } from "@/lib/client/api";
import type { Run } from "@/lib/types";

/** "Steal this format": paste a viral video link and Claude rebuilds its structure for your product. */
export function CloneDialog({ open, onOpenChange, projectId, productName }: { open: boolean; onOpenChange: (v: boolean) => void; projectId: string | null; productName?: string }) {
  const { openRun } = useShell();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!projectId || !url.trim()) return;
    setBusy(true);
    try {
      const run = await post<Run>(`/api/projects/${projectId}/clone`, { url: url.trim() });
      onOpenChange(false);
      setUrl("");
      openRun(run.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Clone a viral video"
      description={`Paste a TikTok, Reel, Short or X video that's blowing up. Shipreel downloads it, Claude studies the hook, pacing, text style and sound, then rebuilds the format for ${productName ?? "your app"}. Structure only: never their footage or claims.`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} disabled={!/^https?:\/\//.test(url.trim())} icon={<Wand2 className="size-4" />} onClick={go}>
            Clone the format
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-3" />
          <Input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="https://www.tiktok.com/@someone/video/…" className="h-10 pl-9" autoFocus />
        </div>
        <p className="text-xs leading-relaxed text-fg-3">Tip: outliers beat averages. Pick a video with far more views than that account usually gets, ideally from a similar-sized app.</p>
      </div>
    </Dialog>
  );
}
