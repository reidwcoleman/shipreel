#!/usr/bin/env node
/**
 * Phone bridge: lets the Shipreel iPhone app reach the Shipreel server on this Mac.
 *
 * Shipreel itself only listens on 127.0.0.1:4747. This bridge listens on the network (port 4748, home
 * Wi-Fi) and, if enabled, behind an encrypted Cloudflare quick tunnel (anywhere). Every request needs
 * the pairing token (Authorization: Bearer <token>, or ?t=<token> for media the video player loads),
 * and only the endpoints the phone app uses are passed through: review, posts, create, accounts,
 * projects, events and rendered media. Nothing else on the server is reachable from the phone.
 *
 * State lives in ~/Library/Application Support/Shipreel/phone.json:
 *   { token, port, tunnel: boolean, tunnelUrl?, lanUrls[], updatedAt }
 * The Mac app reads it to show the pairing QR code.
 *
 *   node scripts/phone-bridge.mjs            run (launchd keeps it alive: scripts/phone-bridge.sh install)
 *   node scripts/phone-bridge.mjs --rotate   new token (every paired phone has to scan again)
 */
import { execFileSync, spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(os.homedir(), "Library", "Application Support", "Shipreel");
const STATE = path.join(DIR, "phone.json");
const UPSTREAM = { host: "127.0.0.1", port: Number(process.env.SHIPREEL_PORT || 4747) };

fs.mkdirSync(DIR, { recursive: true });
const read = () => {
  try {
    return JSON.parse(fs.readFileSync(STATE, "utf8"));
  } catch {
    return {};
  }
};
let state = { port: 4748, tunnel: true, ...read() };
if (!state.token || process.argv.includes("--rotate")) state.token = crypto.randomBytes(24).toString("base64url");
const save = () => {
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2), { mode: 0o600 });
};
if (process.argv.includes("--rotate")) {
  save();
  console.log("new pairing token written; restart the bridge");
  process.exit(0);
}

const BONJOUR = (() => {
  try {
    return execFileSync("/usr/sbin/scutil", ["--get", "LocalHostName"]).toString().trim();
  } catch {
    return "";
  }
})();

function lanUrls() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces()))
    for (const a of list ?? []) if (a.family === "IPv4" && !a.internal && !a.address.startsWith("169.254.")) out.push(`http://${a.address}:${state.port}`);
  // A stable name too, when the Mac has one (works across DHCP changes on the same network).
  if (BONJOUR) out.push(`http://${BONJOUR}.local:${state.port}`);
  return out;
}

// ── Access rules ──
const ALLOW = [
  ["GET", /^\/api\/review(\/[^/]+\/[^/]+)?$/],
  ["POST", /^\/api\/review\/[^/]+\/[^/]+$/],
  ["GET", /^\/api\/postbox$/],
  ["POST", /^\/api\/postbox\/connect$/],
  ["POST", /^\/api\/create$/],
  ["GET", /^\/api\/create\/[^/]+(\/stream)?$/],
  ["POST", /^\/api\/create\/[^/]+\/stop$/],
  ["GET", /^\/api\/events$/],
  ["GET", /^\/api\/media\/.+$/],
  ["HEAD", /^\/api\/media\/.+$/],
  ["GET", /^\/api\/projects$/],
  ["GET", /^\/api\/projects\/[^/]+\/posts$/],
  ["PATCH", /^\/api\/projects\/[^/]+\/posts$/],
];
const allowed = (method, p) => ALLOW.some(([m, re]) => m === method && re.test(p));

const sameToken = (given) => {
  if (typeof given !== "string" || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(state.token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Slow down guessing: after 10 bad tokens from one address, refuse it for 10 minutes.
const strikes = new Map();
const blocked = (ip) => (strikes.get(ip)?.until ?? 0) > Date.now();
const strike = (ip) => {
  const s = strikes.get(ip) ?? { n: 0, until: 0 };
  s.n += 1;
  if (s.n >= 10) {
    s.until = Date.now() + 10 * 60_000;
    s.n = 0;
  }
  strikes.set(ip, s);
};

const json = (res, code, body) => {
  res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
};

// ── Keep Shipreel running ──
let starting = 0;
function startShipreel() {
  if (Date.now() - starting < 60_000) return;
  starting = Date.now();
  const log = fs.openSync(path.join(DIR, "shipreel-server.log"), "a");
  const child = spawn("/bin/zsh", ["-lc", "npm run start"], { cwd: ROOT, detached: true, stdio: ["ignore", log, log] });
  child.unref();
  console.log(`[bridge] Shipreel wasn't running; starting it (log: ${path.join(DIR, "shipreel-server.log")})`);
}

const server = http.createServer((req, res) => {
  const ip = req.socket.remoteAddress ?? "?";
  const url = new URL(req.url ?? "/", "http://bridge");
  // Unauthenticated: just enough for the app to know it found a Shipreel bridge.
  if (url.pathname === "/bridge/ping") return json(res, 200, { ok: true, app: "shipreel" });
  if (blocked(ip)) return json(res, 429, { error: "Too many wrong codes. Try again in a few minutes." });
  const auth = req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("t");
  if (!sameToken(auth)) {
    strike(ip);
    return json(res, 401, { error: "This phone isn't paired. Scan the code in Shipreel on your Mac (Settings → iPhone)." });
  }
  if (url.pathname === "/bridge/info") return json(res, 200, { lanUrls: lanUrls(), tunnelUrl: state.tunnelUrl ?? null, mac: os.hostname() });
  const method = req.method ?? "GET";
  if (!allowed(method, url.pathname)) return json(res, 404, { error: "Not available from the phone." });

  url.searchParams.delete("t");
  const headers = { ...req.headers };
  delete headers.authorization;
  // Shipreel only answers local hostnames, so the bridge talks to it as this Mac. Absolute URLs in its
  // replies therefore say http://127.0.0.1:4747; the phone app swaps that origin for the bridge's.
  headers.host = `${UPSTREAM.host}:${UPSTREAM.port}`;
  delete headers.origin;
  delete headers.referer;
  for (const h of Object.keys(headers)) if (h.startsWith("sec-fetch-") || h.startsWith("x-forwarded-") || h === "cf-connecting-ip" || h.startsWith("cf-")) delete headers[h];
  const up = http.request({ ...UPSTREAM, method, path: url.pathname + url.search, headers }, (r) => {
    res.writeHead(r.statusCode ?? 502, r.headers);
    r.pipe(res);
  });
  up.on("error", (e) => {
    if (e.code === "ECONNREFUSED") startShipreel();
    if (!res.headersSent) json(res, 503, { error: e.code === "ECONNREFUSED" ? "Shipreel is starting on your Mac. Try again in a moment." : `Couldn't reach Shipreel: ${e.message}` });
    else res.destroy();
  });
  // Streams (SSE, video) end when the phone goes away.
  res.on("close", () => {
    if (!res.writableFinished) up.destroy();
  });
  req.pipe(up);
});
server.requestTimeout = 0;
server.headersTimeout = 30_000;

// ── Cloudflare quick tunnel (optional) ──
let tunnel = null;
function startTunnel() {
  if (!state.tunnel) return;
  const bin = ["/opt/homebrew/bin/cloudflared", "/usr/local/bin/cloudflared"].find((p) => fs.existsSync(p));
  if (!bin) return console.log("[bridge] cloudflared not installed; Wi-Fi only (brew install cloudflared)");
  tunnel = spawn(bin, ["tunnel", "--no-autoupdate", "--url", `http://127.0.0.1:${state.port}`], { stdio: ["ignore", "pipe", "pipe"] });
  const scan = (d) => {
    const m = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(String(d));
    if (m && m[0] !== state.tunnelUrl) {
      state.tunnelUrl = m[0];
      state.lanUrls = lanUrls();
      save();
      console.log(`[bridge] tunnel ${m[0]}`);
    }
  };
  tunnel.stdout.on("data", scan);
  tunnel.stderr.on("data", scan);
  tunnel.on("exit", (code) => {
    console.log(`[bridge] tunnel exited (${code}); restarting in 10 s`);
    tunnel = null;
    state.tunnelUrl = undefined;
    save();
    setTimeout(startTunnel, 10_000);
  });
}

// A tunnel dies quietly after sleep or a network change: check it every 3 minutes.
setInterval(async () => {
  if (!state.tunnel || !state.tunnelUrl || !tunnel) return;
  const ok = await fetch(`${state.tunnelUrl}/bridge/ping`, { signal: AbortSignal.timeout(8000) }).then((r) => r.ok, () => false);
  if (!ok) tunnel.kill();
}, 180_000).unref();

setInterval(() => {
  const now = lanUrls();
  if (JSON.stringify(now) !== JSON.stringify(state.lanUrls)) {
    state.lanUrls = now;
    save();
  }
}, 60_000).unref();

server.listen(state.port, "0.0.0.0", () => {
  state.lanUrls = lanUrls();
  save();
  console.log(`[bridge] listening on ${state.lanUrls.join(", ")}`);
  startTunnel();
});

const stop = () => {
  tunnel?.kill();
  process.exit(0);
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
