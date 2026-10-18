import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { MIME, resolveProjectFile } from "@/lib/server/media";

export const dynamic = "force-dynamic";

/** Streams project files (assets, renders, thumbnails) with HTTP Range support so video can seek. */
export async function GET(req: Request, ctx: { params: Promise<{ project: string; path: string[] }> }) {
  const { project, path: rel } = await ctx.params;
  let file: string | null;
  try {
    file = resolveProjectFile(project, rel.map(decodeURIComponent));
  } catch {
    return new Response("Bad path", { status: 400 });
  }
  if (!file) return new Response("Not found", { status: 404 });
  let stat: fs.Stats;
  try {
    stat = await fsp.stat(file);
    if (!stat.isFile()) throw new Error("not a file");
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const type = MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
  const headers: Record<string, string> = {
    "content-type": type,
    "accept-ranges": "bytes",
    "cache-control": "no-cache",
    "access-control-allow-origin": "*",
    "last-modified": stat.mtime.toUTCString(),
  };
  const url = new URL(req.url);
  if (url.searchParams.get("download")) {
    headers["content-disposition"] = `attachment; filename="${path.basename(file)}"`;
  }
  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m?.[1] ? Number(m[1]) : 0;
    let end = m?.[2] ? Number(m[2]) : stat.size - 1;
    if (!m?.[1] && m?.[2]) {
      start = Math.max(0, stat.size - Number(m[2]));
      end = stat.size - 1;
    }
    // A last byte past the end means "to the end" (RFC 9110); AVPlayer and Safari send such ranges.
    end = Math.min(end, stat.size - 1);
    if (start >= stat.size || start > end) {
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${stat.size}` } });
    }
    const stream = fs.createReadStream(file, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: { ...headers, "content-range": `bytes ${start}-${end}/${stat.size}`, "content-length": String(end - start + 1) },
    });
  }
  const stream = fs.createReadStream(file);
  return new Response(Readable.toWeb(stream) as ReadableStream, { status: 200, headers: { ...headers, "content-length": String(stat.size) } });
}

export async function HEAD(req: Request, ctx: { params: Promise<{ project: string; path: string[] }> }) {
  const res = await GET(req, ctx);
  await res.body?.cancel().catch(() => undefined);
  return new Response(null, { status: res.status, headers: res.headers });
}
