import { contactFor } from "@/framework/formats";
import { variationsOf } from "@/framework/ideas";
import { bad, body, handle, json } from "@/lib/server/http";
import { createVideo, getProject, getVideo } from "@/lib/server/projects";
import { improveVideo } from "@/lib/server/tasks";
import type { AgentEngine, VideoDoc } from "@/lib/types";
import type { VideoSpec } from "@/remotion/spec";

export const dynamic = "force-dynamic";

/** Swap the hook everywhere it shows (first scene, opening text layer, meta) and keep the body. */
function withHook(spec: VideoSpec, hook: string): VideoSpec {
  const next: VideoSpec = structuredClone(spec);
  next.title = hook.replace(/\*/g, "");
  next.meta.hook = hook;
  const first = next.scenes[0];
  const opening = next.overlays.find((o) => o.type === "text" && o.start <= 0.3);
  if (first && (first.type === "hook" || first.type === "slide")) first.text = hook;
  else if (opening && opening.type === "text") opening.text = hook.replace(/\*/g, "");
  else if (first && "caption" in first && first.caption) first.caption = { ...first.caption, text: hook.replace(/\*/g, "") };
  else next.scenes.unshift({ id: `h${Date.now().toString(36)}`, type: "hook", duration: 2.2, transition: "cut", text: hook, textStyle: { style: next.theme.captionStyle } });
  // Text stories: the chat is with whoever the new hook mentions.
  const contact = contactFor(hook);
  for (const s of next.scenes) if (s.type === "chat" && contact) s.contact = contact;
  return next;
}

/** "Make 3 variations of the winner": same body, new hooks from different hook families. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string; vid: string }> }) => {
  const { id, vid } = await ctx.params;
  const b = await body<{ n?: number; engine?: AgentEngine | "instant" }>(req);
  const project = await getProject(id);
  const doc = await getVideo(id, vid);
  if (!project || !doc) return bad("not found", 404);
  const n = Math.max(1, Math.min(5, b.n ?? 3));
  const hooks = variationsOf(project, { formatId: doc.spec.formatId, hook: doc.spec.meta.hook || doc.spec.title }, n).map((i) => i.hook);
  const out: VideoDoc[] = [];
  for (const [i, hook] of hooks.entries()) {
    const spec = withHook(doc.spec, hook);
    const { id: _old, ...rest } = spec;
    const created = await createVideo(id, { ...rest, title: `${spec.title}`, meta: { ...spec.meta, notes: `Variation ${i + 1} of "${doc.spec.title}"` } }, doc.source);
    out.push(created);
    if (b.engine && b.engine !== "instant")
      void improveVideo(id, created.id, { engine: b.engine, instruction: `This is a hook variation of a video that performed well. Rewrite only the hook (first frame text and meta.hook) using a different hook family than "${doc.spec.meta.hook || doc.spec.title}". Keep everything else.` }).catch(() => undefined);
  }
  return json(out, 201);
});
