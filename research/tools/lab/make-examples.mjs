#!/usr/bin/env node
/**
 * Create + render one example per format through a running Shipreel server, and print id, format, hook.
 *   node research/tools/lab/make-examples.mjs <formatId…> [--base http://127.0.0.1:4763] [--project famsync]
 */
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(`--${n}`); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const BASE = flag("base", "http://127.0.0.1:4763");
const P = flag("project", "famsync");
const api = async (m, r, b) => {
  const res = await fetch(`${BASE}${r}`, { method: m, headers: b ? { "content-type": "application/json" } : undefined, body: b ? JSON.stringify(b) : undefined });
  const t = await res.text();
  if (!res.ok) throw new Error(`${m} ${r} → ${res.status} ${t.slice(0, 300)}`);
  return JSON.parse(t);
};
for (const formatId of args) {
  const t0 = Date.now();
  try {
    const doc = await api("POST", `/api/projects/${P}/videos`, { formatId });
    await api("POST", `/api/projects/${P}/videos/${doc.id}/render`, { force: true });
    let v;
    for (;;) {
      await new Promise((r) => setTimeout(r, 3000));
      v = await api("GET", `/api/projects/${P}/videos/${doc.id}`);
      if (v.status === "failed" || (v.status === "rendered" && v.render)) break;
      if (Date.now() - t0 > 20 * 60_000) throw new Error("timeout");
    }
    console.log(JSON.stringify({ id: doc.id, formatId, status: v.status, hook: v.spec.meta.hook, file: v.render?.file, dur: v.render?.durationSec, slides: v.render?.slides?.length, error: v.error, sec: Math.round((Date.now() - t0) / 1000) }));
  } catch (e) {
    console.log(JSON.stringify({ formatId, error: e.message }));
  }
}
