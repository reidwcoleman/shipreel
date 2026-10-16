import { bad, body, handle, json } from "@/lib/server/http";
import { composeMusic } from "@/lib/server/voice";

export const dynamic = "force-dynamic";
/** Compose an original instrumental bed with ElevenLabs Music and add it to the project's assets. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const b = await body<{ prompt?: string; seconds?: number }>(req);
  if (!b.prompt?.trim()) return bad("Describe the music.");
  return json(await composeMusic(id, b.prompt.trim(), Number(b.seconds) || 15), 201);
});
