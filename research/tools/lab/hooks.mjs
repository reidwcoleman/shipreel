#!/usr/bin/env node
/**
 * Hook lab: prints the ranked hooks per format (with lint scores) for a project and two made-up
 * briefs, plus the default caption, and checks that list hooks match the items the video shows.
 * Offline: loads src/framework with jiti, builds specs in memory, touches nothing in the workspace.
 *
 *   node research/tools/lab/hooks.mjs [--project famsync] [--top 3] [--only famsync|study|habit] [--format id] [--why]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  if (i < 0) return d;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const WHY = args.includes("--why");
const projectId = flag("project", "famsync");
const top = Number(flag("top", "3"));
const only = flag("only", "");
const onlyFormat = flag("format", "");
const jiti = createJiti(import.meta.url, { alias: { "@": path.join(ROOT, "src") } });
const { FORMATS, buildSpec } = await jiti.import(path.join(ROOT, "src/framework/formats.ts"));
const { rankHooks, listCount, bestHook } = await jiti.import(path.join(ROOT, "src/framework/hooks.ts"));

const base = { platforms: ["iOS"], stage: "launched", differentiators: [], proof: [], tone: "", brand: { accent: "#7C5CFF", bg: "#0B0B0F", fg: "#FFFFFF" }, links: {}, screenshots: [], createdAt: "", updatedAt: "" };
const STUDY = {
  ...base,
  id: "lab-study",
  name: "Recall",
  tagline: "Remember everything you study",
  oneLiner: "Recall turns your lecture slides and notes into flashcards and quizzes in seconds, then reminds you right before you'd forget.",
  category: "Education",
  audience: [{ name: "College students", description: "Students cramming for exams who reread notes and forget them" }, { name: "Pre-med students", description: "" }],
  pains: ["I reread my notes for hours and remember nothing", "I always leave studying until the night before", "Making flashcards takes longer than studying"],
  outcomes: ["walk into exams actually knowing the material", "study half as long", "stop cramming the night before"],
  features: [
    { name: "Slides to flashcards", benefit: "Snap a photo of your slides and get flashcards in seconds" },
    { name: "Smart quizzes", benefit: "Quiz yourself on exactly what you're about to forget" },
    { name: "Exam countdown", benefit: "Tell it your exam date and it plans every session" },
  ],
  cta: { action: "link-in-bio", text: "Recall is free on the App Store" },
  keywords: ["flashcards", "study app", "exam prep"],
  hashtags: ["studytok", "studytips", "college"],
  competitors: ["Quizlet", "Anki", "handwritten flashcards"],
};
const HABIT = {
  ...base,
  id: "lab-habit",
  name: "Tally",
  tagline: "Habits that actually stick",
  oneLiner: "Tally is a habit tracker that texts you at the exact moment you usually quit, with streaks your friends can see.",
  category: "Health & Fitness",
  audience: [{ name: "People who restart every Monday", description: "Self-improvement people who keep breaking streaks" }],
  pains: ["I start a new habit every Monday and quit by Thursday", "I forget my habits the second I get busy"],
  outcomes: ["keep a habit for more than a week", "stop restarting every Monday"],
  features: [
    { name: "Quit-moment nudges", benefit: "Get a text at the exact time you usually skip" },
    { name: "Friend streaks", benefit: "Share streaks with friends so someone notices when you miss" },
    { name: "One-tap check-ins", benefit: "Check off a habit from your lock screen" },
    { name: "Weekly recap", benefit: "See your week as one honest chart" },
  ],
  cta: { action: "link-in-bio", text: "Tally is free on the App Store" },
  keywords: ["habit tracker", "streaks", "self improvement"],
  hashtags: ["habits", "selfimprovement", "thatgirl"],
  competitors: ["Streaks", "Habitica", "the notes app checklist"],
};

const famsync = JSON.parse(fs.readFileSync(path.join(ROOT, "workspace/projects", projectId, "project.json"), "utf8"));
const projects = [famsync, STUDY, HABIT].filter((p) => !only || p.id.includes(only) || p.name.toLowerCase().includes(only));
// FamSync's real media index (read-only) so builds show what they'd show; lab briefs have none.
const famMedia = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, "workspace/projects", projectId, "assets.json"), "utf8")).map((a) => ({ file: a.file, kind: a.kind, role: a.role, width: a.width, height: a.height, durationSec: a.durationSec }));
  } catch {
    return [];
  }
})();
const countItems = (fid, spec) => {
  const s = spec.scenes;
  if (fid === "slideshow-listicle") return s.filter((x) => x.type === "slide").length - 2;
  if (fid === "three-reasons") return s.find((x) => x.type === "list")?.items.length;
  if (fid === "notes-list") return s.find((x) => x.type === "notes")?.items.length;
  if (fid === "that-girl") return s.filter((x) => /^\d+\./.test(x.caption?.text ?? x.text ?? "")).length;
};

for (const p of projects) {
  console.log(`\n══════ ${p.name} (${p.id}) ══════`);
  for (const f of FORMATS) {
    if (onlyFormat && f.id !== onlyFormat) continue;
    const ranked = rankHooks(f.id, p);
    const n = listCount(f.id, p);
    console.log(`\n▸ ${f.id}${n != null ? ` (list of ${n})` : ""}`);
    for (const h of ranked.slice(0, top)) {
      console.log(`  ${String(h.score).padStart(3)}  ${h.text}   [${h.pattern}]`);
      if (WHY) console.log(`       ${h.reasons.map((r) => `${r.delta > 0 ? "+" : ""}${r.delta} ${r.label}`).join(" · ")}`);
    }
    if (!ranked.length) console.log("  (no fill)");
    // Build the spec with the default hook: check list counts and show the caption.
    const hook = bestHook(f.id, p, 3);
    const spec = buildSpec(f.id, { project: p, hook, media: p.id === famsync.id ? famMedia : [], seed: 3 });
    const items = countItems(f.id, spec);
    const said = /^\D{0,12}?(\d+)\b/.exec(hook)?.[1];
    if (items && said && Number(said) !== items) console.log(`  ✗ COUNT MISMATCH: hook says ${said}, video shows ${items}`);
    if (f.id === "mental-load") console.log(`  paragraph: ${spec.scenes[0].caption?.text ?? spec.scenes[0].text}`);
    console.log(`  caption: ${spec.meta.caption}  ${spec.meta.hashtags.map((t) => `#${t}`).join(" ")}`);
  }
}
