import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { handle, json } from "@/lib/server/http";
import { getSettings } from "@/lib/server/store";

export const dynamic = "force-dynamic";

const MARKERS = ["package.json", "Package.swift", "project.yml", "pubspec.yaml", "Cargo.toml", "pyproject.toml", "go.mod", "app.json", "Gemfile"];

function looksLikeProject(dir: string): { kind?: string; isGit: boolean } {
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return { isGit: false };
  }
  const isGit = names.includes(".git");
  const kind = names.some((n) => n.endsWith(".xcodeproj") || n.endsWith(".xcworkspace") || n === "project.yml" || n === "Package.swift")
    ? "iOS / Swift"
    : names.includes("pubspec.yaml")
      ? "Flutter"
      : names.includes("app.json") && names.includes("package.json")
        ? "Expo / React Native"
        : names.includes("package.json")
          ? "JavaScript"
          : names.includes("pyproject.toml")
            ? "Python"
            : MARKERS.some((m) => names.includes(m))
              ? "Code"
              : undefined;
  return { kind, isGit };
}

/** Folder browser for the "point Shipreel at your repo" picker. Local machine only. */
export const GET = handle(async (req: Request) => {
  const settings = await getSettings();
  const url = new URL(req.url);
  const root = settings.projectsRoot || os.homedir();
  const dir = path.resolve(url.searchParams.get("path") || root);
  const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
  const dirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules")
    .map((e) => {
      const full = path.join(dir, e.name);
      return { name: e.name, path: full, ...looksLikeProject(full) };
    })
    .sort((a, b) => Number(!!b.kind) - Number(!!a.kind) || a.name.localeCompare(b.name));
  const suggestions = root
    ? (await fsp.readdir(root, { withFileTypes: true }).catch(() => []))
        .filter((e) => e.isDirectory() && !e.name.startsWith("."))
        .map((e) => ({ name: e.name, path: path.join(root, e.name), ...looksLikeProject(path.join(root, e.name)) }))
        .filter((d) => d.kind)
        .map((d) => ({ ...d, mtime: fs.statSync(d.path).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, 24)
    : [];
  return json({ dir, parent: path.dirname(dir), home: os.homedir(), root, dirs, suggestions, here: looksLikeProject(dir) });
});
