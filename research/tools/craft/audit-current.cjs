// What do Shipreel's current springs actually do? (read-only audit of src/remotion values)
//   node research/tools/craft/audit-current.cjs
"use strict";
const L = require("./springlib.cjs");

const current = {
  "SNAPPY (anim.ts)": { damping: 14, stiffness: 180, mass: 0.6 },
  "SMOOTH (anim.ts)": { damping: 200, stiffness: 120, mass: 1 },
  "BOUNCY (anim.ts)": { damping: 9, stiffness: 160, mass: 0.7 },
  "slam (text.tsx)": { damping: 11, stiffness: 260, mass: 0.6 },
  "outline pop (text.tsx)": { damping: 9, stiffness: 220, mass: 0.6 },
  "slide-up text (text.tsx)": { damping: 200, stiffness: 140 },
  "pip (ShipreelVideo.tsx)": { damping: 16, stiffness: 160 },
  "Remotion default": {},
};

const rows = [];
for (const [name, cfg] of Object.entries(current)) {
  const p = L.physics(cfg);
  const a = L.analyzeSpring(cfg, 30);
  rows.push({ name, ...cfg, zeta: p.zeta, omega0: p.omega0, appleResponse: p.appleResponse, bounce: p.appleBounce, ...a });
}
console.table(rows.map((r) => ({
  preset: r.name, zeta: r.zeta, "w0 rad/s": r.omega0, "apple resp s": r.appleResponse,
  "overshoot %": r.overshootPct, "peak f": r.peakFrame, "f50": r.f50, "f90": r.f90,
  "settle2% f": r.settle2pct, "measureSpring f": r.measureSpring005, lobes: r.visibleLobesOver1pct,
})));

// Visible consequences in Shipreel units
const vis = (name, cfg, from, to, unit) => {
  const a = L.analyzeSpring(cfg, 30);
  const peak = to + (to - from) * (a.overshootPct / 100);
  console.log(`${name}: ${from}→${to}${unit} peaks at ${peak.toFixed(3)}${unit} (frame ${a.peakFrame}), within 2% by frame ${a.settle2pct}`);
};
vis("text pop (SNAPPY, scale)", current["SNAPPY (anim.ts)"], 0.78, 1, "");
vis("slam (scale)", current["slam (text.tsx)"], 2.1, 1, "");
vis("outline pop (scale)", current["outline pop (text.tsx)"], 0, 1, "");
vis("emoji/app icon pop (BOUNCY, scale)", current["BOUNCY (anim.ts)"], 0, 1, "");
vis("card rise (SNAPPY, px)", current["SNAPPY (anim.ts)"], 120, 0, "px");

// Frame-by-frame dump for the doc
const dump = (name, cfg, n = 24) => {
  const v = [];
  for (let f = 0; f <= n; f++) v.push(L.springAt(cfg, 30, f).toFixed(3));
  console.log(name.padEnd(26), v.join(" "));
};
console.log("\nprogress per frame @30fps (f0..f24)");
for (const [name, cfg] of Object.entries(current)) dump(name, cfg);
