import { handle, json } from "@/lib/server/http";
import { listVoices } from "@/lib/server/voice";

export const dynamic = "force-dynamic";
/** Voices for voiceovers: ElevenLabs (if a key is set) and the free macOS system voices. */
export const GET = handle(async () => json(await listVoices()));
