import { bad, body, handle, json } from "@/lib/server/http";
import { getVideo, saveVideoSpec } from "@/lib/server/projects";
import { makeVoiceover } from "@/lib/server/voice";
import { safeNormalizeSpec } from "@/remotion/spec";

export const dynamic = "force-dynamic";
/** Record a voiceover from a script, add word captions, optionally retime scenes. Saves and returns the spec. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string; vid: string }> }) => {
  const { id, vid } = await ctx.params;
  const b = await body<{ text?: string; engine?: "say" | "elevenlabs"; voice?: string; fit?: boolean; spec?: unknown }>(req);
  if (!b.text?.trim()) return bad("Write a script first.");
  const doc = await getVideo(id, vid);
  if (!doc) return bad("video not found", 404);
  // Use the editor's unsaved spec if it sent one, so nothing the user just typed is lost.
  const base = b.spec ? safeNormalizeSpec({ ...(b.spec as object), id: vid }) : { ok: true as const, spec: doc.spec };
  if (!base.ok) return bad(`Invalid spec: ${base.errors[0]}`, 422);
  const { spec } = await makeVoiceover(id, base.spec, { text: b.text, engine: b.engine === "elevenlabs" ? "elevenlabs" : "say", voice: b.voice, fit: b.fit !== false });
  const saved = await saveVideoSpec(id, vid, spec);
  return json(saved);
});
