#!/usr/bin/env node
/**
 * Run the render-time text fit (src/lib/server/layout.ts) on a spec JSON without the app.
 *
 *   node research/tools/lab/fit.mjs <video-or-spec.json> <out-spec.json> [--project famsync]
 *
 * Assets resolve through the running app (http://127.0.0.1:4747/api/media/<project>).
 */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { createJiti } from "jiti";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const args = process.argv.slice(2);
const pi = args.indexOf("--project");
const project = pi >= 0 ? args.splice(pi, 2)[1] : "famsync";
const [inPath, outPath] = args;
const jiti = createJiti(import.meta.url, { alias: { "@": path.join(ROOT, "src"), "server-only": path.join(ROOT, "node_modules/server-only/empty.js") } });
const { fitText } = await jiti.import(path.join(ROOT, "src/lib/server/layout.ts"));
const raw = JSON.parse(fs.readFileSync(inPath, "utf8"));
const spec = raw.spec ?? raw;
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/remotion/index.ts"), publicDir: path.join(ROOT, "public") });
const stills = async ({ spec: s }, list) => {
  const inputProps = { spec: s, assetBase: `http://127.0.0.1:4747/api/media/${project}`, publicBase: "" };
  const comp = await selectComposition({ serveUrl, id: "Shipreel", inputProps, timeoutInMilliseconds: 120000 });
  for (const st of list)
    await renderStill({ composition: comp, serveUrl, output: st.out, frame: Math.min(st.frame, comp.durationInFrames - 1), inputProps, imageFormat: st.format, scale: st.scale, timeoutInMilliseconds: 120000 });
};
const t0 = Date.now();
const fitted = await fitText(fs.mkdtempSync(path.join(os.tmpdir(), "fit-")), spec, stills);
if (!fitted) console.log("nothing to fit");
else {
  fs.writeFileSync(outPath, JSON.stringify(fitted, null, 2));
  const show = (st) => st ? `${st.style ?? "-"} y=${st.y}` : "-";
  fitted.scenes.forEach((sc, i) => sc.caption && console.log(`scene ${i}: ${show(sc.caption.style)}  ← ${show(spec.scenes[i].caption?.style)} ${spec.scenes[i].caption?.style?.position ?? ""}`));
  fitted.overlays.forEach((o, i) => o.type === "text" && console.log(`overlay ${i}: ${show(o.textStyle)}`));
  console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
process.exit(0);
