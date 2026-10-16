// Do pre-roll (initial velocity) and reverse:true close the spring<->bezier gap?
//   node research/tools/craft/explore-modes.cjs
"use strict";
const L = require("./springlib.cjs");
const cases = [
  ["easeOutExpo", [0.16, 1, 0.3, 1], 12, "forward"],
  ["easeOutExpo", [0.16, 1, 0.3, 1], 12, "preroll"],
  ["easeOutQuint", [0.22, 1, 0.36, 1], 12, "preroll"],
  ["M3 emphasized decel", [0.05, 0.7, 0.1, 1], 12, "preroll"],
  ["easeOutBack", [0.34, 1.56, 0.64, 1], 12, "preroll"],
  ["easeInCubic", [0.32, 0, 0.67, 0], 8, "reverse"],
  ["easeInQuart", [0.5, 0, 0.75, 0], 8, "reverse"],
  ["M3 emphasized accel", [0.3, 0, 0.8, 0.15], 8, "reverse"],
  ["easeInOutCubic", [0.65, 0, 0.35, 1], 10, "reverse"],
];
const rows = [];
for (const [name, b, D, mode] of cases) {
  const fit = L.roundSpring(L.fitSpringToBezier(b, D, 30, { mode }));
  const opts = mode === "preroll" ? { preroll: fit.preroll } : mode === "reverse" ? { reverse: true, durationInFrames: D } : {};
  const cmp = L.compare(fit, b, D, 30, { springOpts: opts });
  rows.push({ curve: name, D, mode, spring: `${fit.damping}/${fit.stiffness}`, preroll: fit.preroll ?? "", zeta: L.physics(fit).zeta, "max err": cmp.maxErr, "max err (rendered frames)": cmp.maxErrRenderedFrames, rmse: cmp.rmse });
}
console.table(rows);
