// Spring <-> cubic-bezier toolkit for Shipreel motion presets.
// Uses Remotion's OWN spring()/measureSpring()/Easing.bezier (node_modules/remotion 4.0.535),
// so every number printed here is what a render would actually produce.
//
//   node research/tools/craft/springlib.cjs selftest
//
// Conventions
//  - progress p(t) goes 0 -> 1. overshootPct = (max p - 1) * 100 (in PROGRESS units).
//    Visible overshoot of a property = overshootPct/100 * |to - from|.
//  - Remotion time is seconds (frame / fps), so a spring config gives the same curve
//    at 30 and 60 fps; only the frame counts double.
//  - Remotion uses the critically-damped formula for ANY zeta >= 1, so damping above
//    2*sqrt(stiffness*mass) has no effect (damping 200 == critical damping).
"use strict";
const path = require("path");
const ROOT = path.resolve(__dirname, "../../..");
const R = path.join(ROOT, "node_modules/remotion/dist/cjs");
const { spring, measureSpring } = require(path.join(R, "spring/index.js"));
const { Easing } = require(path.join(R, "easing.js"));

const TAU = Math.PI * 2;

/** Physical summary of a Remotion spring config. */
function physics(cfg) {
  const c = cfg.damping ?? 10, k = cfg.stiffness ?? 100, m = cfg.mass ?? 1;
  const zeta = c / (2 * Math.sqrt(k * m));
  const omega0 = Math.sqrt(k / m); // rad/s
  const omegaD = zeta < 1 ? omega0 * Math.sqrt(1 - zeta * zeta) : 0;
  return {
    zeta: +zeta.toFixed(4),
    effectiveZeta: +Math.min(zeta, 1).toFixed(4), // Remotion clamps behaviour at critical
    omega0: +omega0.toFixed(3),
    // Apple / SwiftUI parameterisation (WWDC23 "Animate with springs"):
    // response = 2*pi/omega0 (period of the undamped spring), dampingFraction = zeta, bounce = 1 - zeta.
    appleResponse: +(TAU / omega0).toFixed(4),
    appleDampingFraction: +Math.min(zeta, 1).toFixed(4),
    appleBounce: +(1 - Math.min(zeta, 1)).toFixed(4),
    ringHz: zeta < 1 ? +(omegaD / TAU).toFixed(3) : 0,
  };
}

/** Apple (response, dampingFraction) -> Remotion config with mass 1. */
function fromApple(response, dampingFraction, mass = 1) {
  const omega0 = TAU / response;
  return {
    damping: +(2 * dampingFraction * omega0 * mass).toFixed(3),
    stiffness: +(omega0 * omega0 * mass).toFixed(3),
    mass,
  };
}

/** Normalise any config to mass 1 (same curve). */
function toMass1(cfg) {
  const m = cfg.mass ?? 1;
  return { damping: (cfg.damping ?? 10) / m, stiffness: (cfg.stiffness ?? 100) / m, mass: 1 };
}

/**
 * Sample Remotion spring progress at frame f (fractional allowed).
 * opts.preroll (frames): start the spring already in motion, renormalised so p(0)=0:
 *     p = (spring(f+pre) - spring(pre)) / (1 - spring(pre))   -> gives the curve an initial velocity.
 * opts.reverse + opts.durationInFrames: Remotion's reverse mode, mapped to a 0->1 progress:
 *     p = 1 - spring({frame:f, reverse:true, durationInFrames:D})   -> accelerating (ease-in) exit.
 */
function springAt(cfg, fps, f, opts = {}) {
  if (opts.reverse) {
    const D = opts.durationInFrames;
    if (f <= 0) return 0;
    if (f >= D) return 1;
    return 1 - spring({ frame: f, fps, config: cfg, reverse: true, durationInFrames: D });
  }
  const pre = opts.preroll || 0;
  if (f <= 0) return 0;
  if (!pre) return spring({ frame: f, fps, config: cfg });
  const s0 = spring({ frame: pre, fps, config: cfg });
  return (spring({ frame: f + pre, fps, config: cfg }) - s0) / (1 - s0);
}

// ---------- fast closed-form clone of Remotion's spring (used inside optimisers only) ----------
// Remotion steps an exact analytic solution frame by frame, so the closed form at t = frame/fps is identical
// (selftest checks this). zeta >= 1 uses the critically damped branch, exactly like Remotion.
function closedForm(cfg, t) {
  const c = cfg.damping ?? 10, k = cfg.stiffness ?? 100, m = cfg.mass ?? 1;
  if (t <= 0) return 0;
  const z = c / (2 * Math.sqrt(k * m)), w0 = Math.sqrt(k / m);
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}
const _natCache = new Map();
/** Clone of Remotion measureSpring (threshold 0.005, must stay inside for 20 frames). */
function fastMeasure(cfg, fps, threshold = 0.005) {
  const key = [cfg.damping, cfg.stiffness, cfg.mass, fps, threshold].join("|");
  if (_natCache.has(key)) return _natCache.get(key);
  let frame = 0;
  const diff = () => Math.abs(closedForm(cfg, frame / fps) - 1);
  while (diff() >= threshold) { frame++; if (frame > 100000) break; }
  let finished = frame;
  for (let i = 0; i < 20; i++) { frame++; if (diff() >= threshold) { i = 0; finished = frame + 1; } }
  _natCache.set(key, finished);
  return finished;
}
function fastSpringAt(cfg, fps, f, opts = {}) {
  if (opts.reverse) {
    const D = opts.durationInFrames;
    if (f <= 0) return 0;
    if (f >= D) return 1;
    const nat = fastMeasure(cfg, fps);
    const proc = (D - f) / (D / nat);
    return 1 - closedForm(cfg, Math.max(0, proc) / fps);
  }
  if (f <= 0) return 0;
  const pre = opts.preroll || 0;
  if (!pre) return closedForm(cfg, f / fps);
  const s0 = closedForm(cfg, pre / fps);
  return (closedForm(cfg, (f + pre) / fps) - s0) / (1 - s0);
}

function bezierFn(b) {
  return Easing.bezier(b[0], b[1], b[2], b[3]);
}

/** Overshoot, peak, crossing and settle frames for a spring at fps. */
function analyzeSpring(cfg, fps = 30, maxFrames = 240) {
  let max = -Infinity, peakFrame = 0;
  const xs = [];
  for (let f = 0; f <= maxFrames; f += 0.25) {
    const v = springAt(cfg, fps, f);
    xs.push([f, v]);
    if (v > max) { max = v; peakFrame = f; }
  }
  const firstCross = (lvl) => { for (const [f, v] of xs) if (v >= lvl) return f; return null; };
  // settle: last time |1-v| > band, + 0.25
  const settle = (band) => { let last = 0; for (const [f, v] of xs) if (Math.abs(1 - v) > band) last = f; return +(last + 0.25).toFixed(2); };
  // count visible half-oscillations (overshoots/undershoots beyond 1% of travel)
  let lobes = 0, sign = 0;
  for (const [, v] of xs) {
    const d = v - 1;
    if (Math.abs(d) > 0.01) { const s = Math.sign(d); if (s !== sign) { if (sign !== 0 || s > 0) lobes += s > 0 || sign !== 0 ? 1 : 0; sign = s; } }
  }
  return {
    overshootPct: +((Math.max(max, 1) - 1) * 100).toFixed(2),
    peakFrame: max > 1.0005 ? peakFrame : null,
    f50: firstCross(0.5),
    f90: firstCross(0.9),
    f98: firstCross(0.98),
    settle2pct: settle(0.02),
    settle1pct: settle(0.01),
    measureSpring005: measureSpring({ fps, config: cfg }), // Remotion's own natural duration (0.5%, stays 20 frames)
    visibleLobesOver1pct: lobes,
  };
}

/** Bezier stats: overshoot (if y>1), when it hits 50/90%. */
function analyzeBezier(b, frames) {
  const fn = bezierFn(b);
  let max = -Infinity;
  for (let i = 0; i <= 400; i++) max = Math.max(max, fn(i / 400));
  const cross = (lvl) => { for (let i = 0; i <= 4000; i++) if (fn(i / 4000) >= lvl) return +((i / 4000) * frames).toFixed(2); return null; };
  return { overshootPct: +((Math.max(max, 1) - 1) * 100).toFixed(2), f50: cross(0.5), f90: cross(0.9), f98: cross(0.98) };
}

// ---------- Nelder–Mead (small, dependency free) ----------
function nelderMead(f, x0, { step = 0.1, iters = 600, tol = 1e-10 } = {}) {
  const n = x0.length;
  let simplex = [x0.slice()];
  for (let i = 0; i < n; i++) { const x = x0.slice(); x[i] += Array.isArray(step) ? step[i] : step; simplex.push(x); }
  let vals = simplex.map(f);
  for (let it = 0; it < iters; it++) {
    const order = vals.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
    simplex = order.map((i) => simplex[i]); vals = order.map((i) => vals[i]);
    if (Math.abs(vals[n] - vals[0]) < tol) break;
    const centroid = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centroid[j] += simplex[i][j] / n;
    const worst = simplex[n];
    const refl = centroid.map((c, j) => c + (c - worst[j]));
    const fr = f(refl);
    if (fr < vals[0]) {
      const exp = centroid.map((c, j) => c + 2 * (c - worst[j]));
      const fe = f(exp);
      if (fe < fr) { simplex[n] = exp; vals[n] = fe; } else { simplex[n] = refl; vals[n] = fr; }
    } else if (fr < vals[n - 1]) { simplex[n] = refl; vals[n] = fr; }
    else {
      const con = centroid.map((c, j) => c + 0.5 * (worst[j] - c));
      const fc = f(con);
      if (fc < vals[n]) { simplex[n] = con; vals[n] = fc; }
      else {
        for (let i = 1; i <= n; i++) { simplex[i] = simplex[i].map((x, j) => simplex[0][j] + 0.5 * (x - simplex[0][j])); vals[i] = f(simplex[i]); }
      }
    }
  }
  const best = vals.indexOf(Math.min(...vals));
  return { x: simplex[best], fx: vals[best] };
}

/**
 * Error between a spring and a bezier over a design window of D frames (at fps).
 * Bezier is defined on [0, D] and holds 1 afterwards; we also score the spring's tail
 * for another D frames (a spring that is still moving after the bezier ended is a mismatch).
 */
function compare(cfg, b, D, fps = 30, { tail = true, step = 0.25, springOpts = {} } = {}) {
  const fn = bezierFn(b);
  let se = 0, n = 0, maxErr = 0, maxErrAt = 0;
  const end = tail ? 2 * D : D;
  for (let f = 0; f <= end + 1e-9; f += step) {
    const s = springAt(cfg, fps, f, springOpts);
    const z = f >= D ? 1 : fn(f / D);
    const e = Math.abs(s - z);
    se += e * e; n++;
    if (e > maxErr) { maxErr = e; maxErrAt = f; }
  }
  // rendered-frame error (integer frames only) — what you'd actually see
  let maxFrameErr = 0;
  for (let f = 0; f <= end; f++) {
    const e = Math.abs(springAt(cfg, fps, f, springOpts) - (f >= D ? 1 : fn(f / D)));
    maxFrameErr = Math.max(maxFrameErr, e);
  }
  return { rmse: +Math.sqrt(se / n).toFixed(4), maxErr: +maxErr.toFixed(4), maxErrAtFrame: +maxErrAt.toFixed(2), maxErrRenderedFrames: +maxFrameErr.toFixed(4) };
}

/**
 * Fit a mass-1 spring to a bezier lasting D frames at fps.
 * mode: "forward" (plain spring), "preroll" (also fits a 0–3 frame pre-roll), "reverse" (reverse:true, durationInFrames:D).
 */
function fitSpringToBezier(b, D, fps = 30, { mode = "forward" } = {}) {
  const fn = bezierFn(b);
  const toCfg = (x) => ({ stiffness: Math.exp(x[0]), damping: Math.exp(x[1]), mass: 1 });
  const toOpts = (x) => mode === "preroll" ? { preroll: Math.min(3, Math.max(0, x[2])) } : mode === "reverse" ? { reverse: true, durationInFrames: D } : {};
  const obj = (x) => {
    if (mode === "preroll" && (x[2] < 0 || x[2] > 3)) return 1e3;
    const cfg = toCfg(x), o = toOpts(x);
    if (cfg.damping > 400 || cfg.stiffness > 20000 || cfg.damping < 0.5 || cfg.stiffness < 5) return 1e3;
    let se = 0, n = 0;
    for (let f = 0; f <= 2 * D; f += 0.5) {
      const s = fastSpringAt(cfg, fps, f, o);
      const z = f >= D ? 1 : fn(f / D);
      const w = f <= D ? 1 : 0.6; // the in-window part matters most
      se += w * (s - z) ** 2; n += w;
    }
    return se / n;
  };
  let best = null;
  const pres = mode === "preroll" ? [0.5, 1.5] : [null];
  for (const w0 of [8, 14, 20, 30, 45, 65]) for (const z of [0.35, 0.55, 0.75, 0.95]) for (const pre of pres) {
    const k = w0 * w0, c = 2 * z * w0;
    const x0 = pre === null ? [Math.log(k), Math.log(c)] : [Math.log(k), Math.log(c), pre];
    const r = nelderMead(obj, x0, { step: pre === null ? [0.4, 0.3] : [0.4, 0.3, 0.5], iters: 400 });
    if (!best || r.fx < best.fx) best = r;
  }
  const cfg = toCfg(best.x);
  const out = { stiffness: cfg.stiffness, damping: cfg.damping, mass: 1 };
  if (mode === "preroll") out.preroll = Math.round(Math.min(3, Math.max(0, best.x[2])) * 4) / 4;
  return out;
}

/** Fit a cubic-bezier (y may exceed 1 to express one overshoot) to a spring over D frames. */
function fitBezierToSpring(cfg, D, fps = 30, { allowOvershoot = true, springOpts = {} } = {}) {
  const target = [];
  for (let f = 0; f <= D + 1e-9; f += 0.25) target.push([f, fastSpringAt(cfg, fps, f, springOpts)]);
  const obj = ([x1, y1, x2, y2]) => {
    if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return 1e3;
    if (!allowOvershoot && (y1 > 1 || y2 > 1)) return 1e3;
    if (y1 < -1 || y2 < -1 || y1 > 3 || y2 > 3) return 1e3;
    const fn = bezierFn([x1, y1, x2, y2]);
    let se = 0, n = 0;
    for (const [f, v] of target) { se += (v - fn(f / D)) ** 2; n++; }
    return se / n;
  };
  let best = null;
  for (const s of [[0.2, 0.8, 0.3, 1], [0.1, 0.9, 0.2, 1], [0.3, 1.4, 0.6, 1], [0.2, 1.2, 0.4, 1.05], [0.4, 0, 0.2, 1], [0.15, 1, 0.3, 1], [0.05, 0.7, 0.1, 1]]) {
    const r = nelderMead(obj, s, { step: 0.08, iters: 1500 });
    if (!best || r.fx < best.fx) best = r;
  }
  return best.x;
}

/**
 * Design a mass-1 spring from a damping ratio and ONE timing target (frames at fps):
 *   { zeta, peakFrame }  -> first overshoot peak lands on that frame (zeta < 1)
 *   { zeta, f90 }        -> progress first reaches 90% on that frame
 *   { zeta, settle }     -> stays within +-2% after that frame
 */
function designSpring({ zeta, peakFrame, f90, settle }, fps = 30) {
  const mk = (w0) => ({ damping: 2 * zeta * w0, stiffness: w0 * w0, mass: 1 });
  if (peakFrame) {
    const wd = Math.PI / (peakFrame / fps);
    return mk(wd / Math.sqrt(1 - zeta * zeta));
  }
  // bisection on omega0 using the fast clone
  const metric = (w0) => {
    const cfg = mk(w0);
    if (f90) { for (let f = 0; f < 600; f += 0.01) if (fastSpringAt(cfg, fps, f) >= 0.9) return f; return 600; }
    let last = 0; for (let f = 0; f < 600; f += 0.05) if (Math.abs(1 - fastSpringAt(cfg, fps, f)) > 0.02) last = f; return last;
  };
  const target = f90 || settle;
  let lo = 0.5, hi = 400;
  for (let i = 0; i < 60; i++) { const mid = Math.sqrt(lo * hi); if (metric(mid) > target) lo = mid; else hi = mid; }
  return mk(Math.sqrt(lo * hi));
}

const r2 = (x) => Math.round(x * 100) / 100;
const roundBezier = (b) => b.map(r2);
/** Round a spring to "human" numbers: stiffness to 5, damping to 0.5 (mass 1). Over-critical damping is
 *  canonicalised to critical (Remotion ignores anything above it). */
function roundSpring(cfg) {
  const k = cfg.stiffness >= 100 ? Math.round(cfg.stiffness / 5) * 5 : Math.round(cfg.stiffness);
  let c = Math.round(cfg.damping * 2) / 2;
  const crit = 2 * Math.sqrt(k);
  if (c >= crit) c = Math.ceil(crit * 2) / 2;
  const out = { damping: c, stiffness: k, mass: 1 };
  if (cfg.preroll) out.preroll = cfg.preroll;
  return out;
}

module.exports = {
  spring, measureSpring, Easing, physics, fromApple, toMass1, springAt, fastSpringAt, fastMeasure, closedForm, bezierFn,
  analyzeSpring, analyzeBezier, compare, fitSpringToBezier, fitBezierToSpring,
  roundBezier, roundSpring, nelderMead, designSpring, TAU,
};

if (require.main === module && process.argv[2] === "selftest") {
  // 1) closed-form check of Remotion's spring against the textbook underdamped solution
  const cfg = { damping: 12, stiffness: 200, mass: 1 };
  const z = 12 / (2 * Math.sqrt(200)), w0 = Math.sqrt(200), wd = w0 * Math.sqrt(1 - z * z);
  let maxd = 0;
  for (let f = 0; f <= 60; f++) {
    const t = f / 30;
    const x = 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
    maxd = Math.max(maxd, Math.abs(x - springAt(cfg, 30, f)));
  }
  console.log("closed-form vs remotion max diff:", maxd.toExponential(2));
  // 2) fps independence: same seconds -> same value
  let maxfps = 0;
  for (let f = 0; f <= 30; f++) maxfps = Math.max(maxfps, Math.abs(springAt(cfg, 30, f) - springAt(cfg, 60, 2 * f)));
  console.log("30fps vs 60fps (same time) max diff:", maxfps.toExponential(2));
  // 3) damping above critical is ignored
  const a = springAt({ damping: 200, stiffness: 120, mass: 1 }, 30, 6), b = springAt({ damping: 2 * Math.sqrt(120), stiffness: 120, mass: 1 }, 30, 6);
  console.log("damping 200 vs critical (stiffness 120) at f6:", a.toFixed(6), b.toFixed(6));
  // 4) fast clone == Remotion, incl. measureSpring and reverse/durationInFrames
  let worst = 0, worstMeasure = 0;
  for (const c of [3, 8, 14, 20, 30, 60, 200]) for (const k of [50, 120, 300, 800, 2000]) for (const m of [0.5, 1]) {
    const cfg2 = { damping: c, stiffness: k, mass: m };
    worstMeasure = Math.max(worstMeasure, Math.abs(fastMeasure(cfg2, 30) - measureSpring({ fps: 30, config: cfg2 })));
    for (let f = 0; f <= 40; f += 0.5) {
      worst = Math.max(worst, Math.abs(fastSpringAt(cfg2, 30, f) - springAt(cfg2, 30, f)));
      worst = Math.max(worst, Math.abs(fastSpringAt(cfg2, 30, f, { reverse: true, durationInFrames: 9 }) - springAt(cfg2, 30, f, { reverse: true, durationInFrames: 9 })));
      worst = Math.max(worst, Math.abs(fastSpringAt(cfg2, 30, f, { preroll: 1.25 }) - springAt(cfg2, 30, f, { preroll: 1.25 })));
    }
  }
  console.log("fast clone vs remotion: max value diff", worst.toExponential(2), "| measureSpring frame diff", worstMeasure);
  // 5) Apple conversion round-trip
  console.log("Apple response .5 / dampingFraction .85 ->", fromApple(0.5, 0.85), physics(fromApple(0.5, 0.85)));
}
