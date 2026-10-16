import { execFile, spawn, type ChildProcess } from "node:child_process";
import fsp from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { bad, body, handle, json } from "@/lib/server/http";
import { addAsset } from "@/lib/server/media";
import { paths } from "@/lib/server/store";

export const dynamic = "force-dynamic";
const run = promisify(execFile);

const g = globalThis as unknown as { __shipreelRec?: Map<string, { child: ChildProcess; file: string; startedAt: number; source: string }> };
const recs = (g.__shipreelRec ??= new Map());

async function bootedSims(): Promise<{ name: string; udid: string; runtime: string }[]> {
  try {
    const { stdout } = await run("xcrun", ["simctl", "list", "devices", "booted", "-j"]);
    const j = JSON.parse(stdout) as { devices: Record<string, { name: string; udid: string; state: string }[]> };
    return Object.entries(j.devices).flatMap(([rt, list]) => list.filter((d) => d.state === "Booted").map((d) => ({ name: d.name, udid: d.udid, runtime: rt.split(".").pop() ?? rt })));
  } catch {
    return [];
  }
}

async function androidDevices(): Promise<string[]> {
  try {
    const { stdout } = await run("adb", ["devices"]);
    return stdout.split("\n").slice(1).filter((l) => /\tdevice$/.test(l)).map((l) => l.split("\t")[0]);
  } catch {
    return [];
  }
}

/** Real-app footage: iOS Simulator / Android screen recordings and screenshots straight into Assets. */
export const POST = handle(async (req: Request) => {
  const b = await body<{ projectId?: string; action: "status" | "screenshot" | "start" | "stop" | "boot"; source?: "ios" | "android" }>(req);
  const source = b.source ?? "ios";
  if (b.action === "status") {
    return json({ ios: await bootedSims(), android: await androidDevices(), recording: b.projectId ? (recs.has(b.projectId) ? { startedAt: recs.get(b.projectId)!.startedAt } : null) : null });
  }
  if (b.action === "boot") {
    await run("open", ["-a", "Simulator"]).catch(() => undefined);
    return json({ ok: true });
  }
  if (!b.projectId) return bad("Which project?");
  const tmpDir = paths.tmp();
  await fsp.mkdir(tmpDir, { recursive: true });
  if (b.action === "screenshot") {
    const file = path.join(tmpDir, `${source}-shot-${Date.now()}.png`);
    if (source === "ios") {
      if (!(await bootedSims()).length) return bad("No booted iOS Simulator. Open Simulator and run your app first.", 409);
      await run("xcrun", ["simctl", "io", "booted", "screenshot", file]);
    } else {
      const { stdout } = await run("adb", ["exec-out", "screencap", "-p"], { encoding: "buffer", maxBuffer: 1 << 26 });
      await fsp.writeFile(file, stdout as unknown as Buffer);
    }
    const asset = await addAsset(b.projectId, `${source === "ios" ? "simulator" : "android"}-screenshot.png`, await fsp.readFile(file));
    await fsp.rm(file, { force: true });
    return json(asset, 201);
  }
  if (b.action === "start") {
    if (recs.has(b.projectId)) return bad("Already recording.", 409);
    const file = path.join(tmpDir, `${source}-rec-${Date.now()}.mp4`);
    let child: ChildProcess;
    if (source === "ios") {
      if (!(await bootedSims()).length) return bad("No booted iOS Simulator. Open Simulator and run your app first.", 409);
      child = spawn("xcrun", ["simctl", "io", "booted", "recordVideo", "--codec=h264", "--force", file], { stdio: "ignore" });
    } else {
      if (!(await androidDevices()).length) return bad("No Android device/emulator connected (adb devices).", 409);
      child = spawn("adb", ["shell", "screenrecord", "/sdcard/shipreel.mp4"], { stdio: "ignore" });
    }
    recs.set(b.projectId, { child, file, startedAt: Date.now(), source });
    return json({ recording: true, startedAt: Date.now() });
  }
  if (b.action === "stop") {
    const rec = recs.get(b.projectId);
    if (!rec) return bad("Not recording.", 409);
    recs.delete(b.projectId);
    await new Promise<void>((resolve) => {
      rec.child.once("exit", () => resolve());
      rec.child.kill("SIGINT");
      setTimeout(resolve, 8000);
    });
    if (rec.source === "android") {
      await new Promise((r) => setTimeout(r, 800));
      await run("adb", ["pull", "/sdcard/shipreel.mp4", rec.file]);
    }
    await new Promise((r) => setTimeout(r, 400));
    const data = await fsp.readFile(rec.file).catch(() => null);
    if (!data?.length) return bad("The recording came out empty. Try again.", 500);
    const asset = await addAsset(b.projectId, `${rec.source === "ios" ? "simulator" : "android"}-recording.mp4`, data);
    await fsp.rm(rec.file, { force: true });
    return json(asset, 201);
  }
  return bad("Unknown action");
});
