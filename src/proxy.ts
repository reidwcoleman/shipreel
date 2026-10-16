import { NextResponse, type NextRequest } from "next/server";

/**
 * Shipreel's API starts agents on this Mac, opens files and posts to your accounts, so it only
 * answers this machine: its own pages, the CLI and the MCP server. Requests addressed to another
 * hostname (DNS rebinding) and writes sent by other websites in your browser get a 403.
 * SHIPREEL_ALLOWED_HOSTS=host1,host2 adds hostnames (for a tunnel or a container you trust).
 */
const EXTRA_HOSTS = (process.env.SHIPREEL_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

function isLocal(host: string) {
  const h = host.toLowerCase();
  const name = h.startsWith("[") ? h.slice(0, h.indexOf("]") + 1) : h.split(":")[0];
  return name === "localhost" || name === "127.0.0.1" || name === "[::1]" || EXTRA_HOSTS.includes(name) || EXTRA_HOSTS.includes(h);
}

const deny = (error: string) => NextResponse.json({ error }, { status: 403 });

export function proxy(req: NextRequest) {
  if (!isLocal(req.headers.get("host") ?? "")) return deny("Shipreel only answers requests from this Mac.");
  if (req.nextUrl.pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    // Browsers always send Origin on cross-site writes; the CLI and MCP server send none.
    const origin = req.headers.get("origin");
    let fromHere = origin === null && req.headers.get("sec-fetch-site") !== "cross-site";
    if (origin !== null) {
      try {
        fromHere = isLocal(new URL(origin).host);
      } catch {
        fromHere = false;
      }
    }
    if (!fromHere) return deny("Shipreel ignores requests sent by other websites.");
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
