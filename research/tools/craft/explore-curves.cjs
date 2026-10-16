// Which well-known cubic-beziers can a Remotion spring reproduce, and how well?
//   node research/tools/craft/explore-curves.cjs [frames=12]
"use strict";
const L = require("./springlib.cjs");
const D = +(process.argv[2] || 12);

const curves = {
  "easeOutExpo (easings.net)": [0.16, 1, 0.3, 1],
  "easeOutQuint": [0.22, 1, 0.36, 1],
  "easeOutQuart": [0.25, 1, 0.5, 1],
  "easeOutCubic": [0.33, 1, 0.68, 1],
  "easeOutBack": [0.34, 1.56, 0.64, 1],
  "M3 emphasized decel": [0.05, 0.7, 0.1, 1],
  "M3 standard": [0.2, 0, 0, 1],
  "M3 standard decel": [0, 0, 0, 1],
  "CSS ease": [0.25, 0.1, 0.25, 1],
  "CSS/UIKit ease-in-out": [0.42, 0, 0.58, 1],
  "AE Easy Ease 33%": [0.333, 0, 0.667, 1],
  "easeInOutCubic": [0.65, 0, 0.35, 1],
  "easeInOutQuint": [0.83, 0, 0.17, 1],
  "easeInCubic": [0.32, 0, 0.67, 0],
  "easeInQuart": [0.5, 0, 0.75, 0],
  "easeInExpo": [0.7, 0, 0.84, 0],
  "M3 emphasized accel": [0.3, 0, 0.8, 0.15],
};

const rows = [];
for (const [name, b] of Object.entries(curves)) {
  const ab = L.analyzeBezier(b, D);
  const fit = L.roundSpring(L.fitSpringToBezier(b, D, 30));
  const cmp = L.compare(fit, b, D, 30);
  const p = L.physics(fit);
  rows.push({ curve: name, bezier: b.join(","), "50% at f": ab.f50, "90% at f": ab.f90, "98% at f": ab.f98, "os%": ab.overshootPct,
    spring: `${fit.damping}/${fit.stiffness}`, zeta: p.zeta, "max err": cmp.maxErr, rmse: cmp.rmse });
}
console.log(`window = ${D} frames @30fps  (spring shown as damping/stiffness, mass 1)`);
console.table(rows);
