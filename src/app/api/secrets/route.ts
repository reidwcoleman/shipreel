import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { bad, body, handle, json } from "@/lib/server/http";
import { secretsStatus, setSecrets } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/** Keys other local tools already have (values never leave the server). */
const IMPORTS = [{ id: "explainer-video", file: path.join(os.homedir(), ".config", "explainer-video", ".env"), vars: { ELEVENLABS_API_KEY: "elevenlabsKey" } }] as const;

async function readEnv(file: string): Promise<Record<string, string>> {
  try {
    const text = await fsp.readFile(file, "utf8");
    return Object.fromEntries(
      text
        .split("\n")
        .map((l) => /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l))
        .filter((m): m is RegExpExecArray => !!m)
        .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")])
        .filter(([, v]) => v),
    );
  } catch {
    return {};
  }
}

/** Never returns secret values, only which ones are set (and which can be imported). */
export const GET = handle(async (req: Request) => {
  if (new URL(req.url).searchParams.has("importable")) {
    const out: { id: string; file: string; keys: string[] }[] = [];
    for (const imp of IMPORTS) {
      const env = await readEnv(imp.file);
      const keys = Object.entries(imp.vars).filter(([v]) => env[v]).map(([, k]) => k);
      if (keys.length) out.push({ id: imp.id, file: imp.file.replace(os.homedir(), "~"), keys });
    }
    return json(out);
  }
  return json(await secretsStatus());
});

export const PUT = handle(async (req: Request) => {
  const b = await body<Record<string, string> & { importFrom?: string }>(req);
  if (b.importFrom) {
    const imp = IMPORTS.find((i) => i.id === b.importFrom);
    if (!imp) return bad("Unknown source.");
    const env = await readEnv(imp.file);
    const patch = Object.fromEntries(Object.entries(imp.vars).filter(([v]) => env[v]).map(([v, k]) => [k, env[v]]));
    if (!Object.keys(patch).length) return bad("Nothing to import there.");
    return json(await setSecrets(patch));
  }
  const { importFrom: _ignore, ...values } = b;
  return json(await setSecrets(values as Parameters<typeof setSecrets>[0]));
});
