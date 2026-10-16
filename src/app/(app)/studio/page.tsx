"use client";
import { formatDistanceToNowStrict } from "date-fns";
import { Clapperboard, Copy, Download, FolderOpen, Link2, Loader2, MoreHorizontal, Plus, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { CloneDialog } from "@/components/clone-dialog";
import { Page, PageHeader } from "@/components/page";
import { Reel } from "@/components/reel";
import { Button, buttonClass, IconButton } from "@/components/ui/button";
import { Badge, Empty, Segmented, Skeleton } from "@/components/ui/misc";
import { Dropdown, MenuItem, MenuSeparator } from "@/components/ui/overlay";
import { FORMAT_MAP } from "@/framework/formats";
import { mediaUrl, post, useApi } from "@/lib/client/api";
import { useServerEvents } from "@/lib/client/events";
import { useActiveProject, useFramework } from "@/lib/client/store";
import { deleteWithUndo, usePendingDeletes } from "@/lib/client/undo";
import type { Post, VideoDoc } from "@/lib/types";
import { totalDurationSeconds } from "@/remotion/timeline";

export default function Studio() {
  const router = useRouter();
  const { projectId, project } = useActiveProject();
  const { data: fw } = useFramework();
  const { data: allVideos, mutate } = useApi<VideoDoc[]>(projectId ? `/api/projects/${projectId}/videos` : null);
  const hidden = usePendingDeletes();
  const videos = useMemo(() => allVideos?.filter((v) => !hidden.has(`video:${v.id}`)), [allVideos, hidden]);
  const { data: posts } = useApi<Post[]>(projectId ? `/api/projects/${projectId}/posts` : null);
  const [filter, setFilter] = useState<"all" | "draft" | "rendered" | "scheduled">("all");
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [cloning, setCloning] = useState(false);

  useServerEvents((e) => {
    if (e.type === "render" && e.projectId === projectId) setProgress((p) => ({ ...p, [e.videoId]: e.status === "rendering" ? e.progress ?? 0 : -1 }));
  }, [projectId]);

  const scheduled = useMemo(() => new Map((posts ?? []).filter((p) => p.status !== "canceled").map((p) => [p.videoId, p])), [posts]);
  const list = (videos ?? []).filter((v) =>
    filter === "all" ? true : filter === "scheduled" ? scheduled.has(v.id) : filter === "rendered" ? v.status === "rendered" : v.status !== "rendered",
  );

  const create = async (formatId: string) => {
    if (!projectId) return;
    const t = toast.loading("Building from the template…");
    try {
      const doc = await post<VideoDoc>(`/api/projects/${projectId}/videos`, { formatId });
      toast.success("Ready", { id: t });
      router.push(`/edit/${projectId}/${doc.id}`);
    } catch (e) {
      toast.error((e as Error).message, { id: t });
    }
  };

  return (
    <Page>
      <PageHeader
        title="Studio"
        subtitle="Hover to preview, click to edit. Your agent can edit these too."
        actions={
          <>
            <Segmented
              layoutId="studio-filter"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All" },
                { value: "draft", label: "Drafts" },
                { value: "rendered", label: "Rendered" },
                { value: "scheduled", label: "Scheduled" },
              ]}
            />
            <Dropdown
              trigger={
                <Button variant="primary" icon={<Plus className="size-4" />}>
                  New video
                </Button>
              }
            >
              <MenuItem icon={<Link2 className="size-3.5" />} onSelect={() => setCloning(true)} description="Paste a link; Claude rebuilds the format">
                Clone a viral video…
              </MenuItem>
              <MenuSeparator />
              <div className="max-h-[60vh] overflow-y-auto">
                {fw?.formats.map((f) => (
                  <MenuItem
                    key={f.id}
                    onSelect={() => create(f.id)}
                    icon={f.status === "hot" ? <span className="size-1.5 rounded-full bg-accent" aria-label="Hot" /> : null}
                    description={f.kind === "slideshow" ? "Photo carousel" : `${f.lengthSec[0]}–${f.lengthSec[1]}s video`}
                  >
                    {f.name}
                  </MenuItem>
                ))}
              </div>
            </Dropdown>
          </>
        }
      />
      <div className="px-8">
        {!videos ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[9/16] rounded-xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <Empty
            icon={<Clapperboard className="size-5" />}
            title={videos.length ? "Nothing in this filter" : "No videos yet"}
            body={videos.length ? "Try another filter." : "Swipe right on an idea in the Hook Lab, or start from a format."}
            action={
              videos.length ? (
                <Button size="sm" onClick={() => setFilter("all")}>
                  Show all
                </Button>
              ) : (
                <Link href="/ideas" className={buttonClass({ variant: "primary" })}>
                  Open the Hook Lab
                </Link>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {list.map((v) => {
              const p = progress[v.id] ?? (v.status === "rendering" ? v.progress ?? 0 : -1);
              const sched = scheduled.get(v.id);
              return (
                <div key={v.id} className="group flex flex-col gap-2.5">
                  <div className="relative">
                    <Link href={`/edit/${projectId}/${v.id}`}>
                      <Reel letterbox spec={v.spec} projectId={projectId} mode="hover" className="ring-1 ring-line transition-all duration-200 group-hover:-translate-y-0.5 group-hover:ring-line-strong" />
                    </Link>
                    {p >= 0 && (
                      <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-md bg-black/70 px-2.5 py-1.5 text-[11px] backdrop-blur">
                        <Loader2 className="size-3 animate-spin" />
                        <span className="flex-1">Rendering</span>
                        <span className="font-mono tabular-nums">{Math.round(p * 100)}%</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 has-[[data-state=open]]:opacity-100">
                      <Dropdown
                        trigger={
                          <IconButton label="More" size="sm" variant="secondary" className="bg-black/60 backdrop-blur">
                            <MoreHorizontal className="size-4" />
                          </IconButton>
                        }
                      >
                        <MenuItem icon={<Send className="size-3.5" />} onSelect={() => router.push(`/edit/${projectId}/${v.id}?schedule=1`)}>
                          Schedule…
                        </MenuItem>
                        <MenuItem
                          icon={<Clapperboard className="size-3.5" />}
                          onSelect={async () => {
                            await post(`/api/projects/${projectId}/videos/${v.id}/render`, { force: true });
                            toast("Rendering…");
                          }}
                        >
                          Render
                        </MenuItem>
                        {v.render?.file && (
                          <MenuItem icon={<Download className="size-3.5" />} onSelect={() => window.open(`${mediaUrl(projectId!, v.render!.file)}?download=1`)}>
                            Download MP4
                          </MenuItem>
                        )}
                        {v.render?.file && (
                          <MenuItem icon={<FolderOpen className="size-3.5" />} onSelect={() => post("/api/open", { projectId, rel: v.render!.file, reveal: true }).catch(() => toast.error("Couldn't open Finder"))}>
                            Show in Finder
                          </MenuItem>
                        )}
                        <MenuItem
                          icon={<Copy className="size-3.5" />}
                          onSelect={async () => {
                            await post(`/api/projects/${projectId}/videos/${v.id}/duplicate`);
                            mutate();
                          }}
                        >
                          Duplicate
                        </MenuItem>
                        <MenuSeparator />
                        <MenuItem
                          danger
                          icon={<Trash2 className="size-3.5" />}
                          onSelect={() =>
                            deleteWithUndo({
                              key: `video:${v.id}`,
                              message: "Video deleted",
                              description: v.spec.title,
                              url: `/api/projects/${projectId}/videos/${v.id}`,
                              refresh: [`/api/projects/${projectId}/videos`, `/api/projects/${projectId}/posts`, "/api/posts"],
                            })
                          }
                        >
                          Delete
                        </MenuItem>
                      </Dropdown>
                    </div>
                  </div>
                  <Link href={`/edit/${projectId}/${v.id}`} className="flex flex-col gap-1">
                    <span className="line-clamp-2 text-[13px] leading-snug font-medium text-fg">{v.spec.title}</span>
                    {/* Status · format · length on one line (no dangling separators); the time gets its own line. */}
                    <span className="flex min-w-0 items-center gap-x-1.5 text-[11px] whitespace-nowrap text-fg-3 [&>span+span]:before:mr-1.5 [&>span+span]:before:content-['·']">
                      {sched ? (
                        <Badge tone={sched.status === "posted" ? "ok" : sched.status === "failed" ? "bad" : "accent"}>{sched.status === "posted" ? "Posted" : sched.status === "failed" ? "Failed" : "Scheduled"}</Badge>
                      ) : v.status === "rendered" ? (
                        <Badge tone="ok">Rendered</Badge>
                      ) : v.status === "failed" ? (
                        <Badge tone="bad">Render failed</Badge>
                      ) : (
                        <Badge>Draft</Badge>
                      )}
                      <span className="min-w-0 truncate">{FORMAT_MAP[v.spec.formatId]?.name ?? "Custom"}</span>
                      <span className="shrink-0 tabular-nums">{totalDurationSeconds(v.spec).toFixed(0)}s</span>
                    </span>
                    <span className="text-[11px] text-fg-3">Edited {formatDistanceToNowStrict(new Date(v.updatedAt))} ago</span>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <CloneDialog open={cloning} onOpenChange={setCloning} projectId={projectId} productName={project?.name} />
    </Page>
  );
}
