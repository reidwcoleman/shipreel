import type { Project } from "@/lib/types";
import { Scene, type SceneInput, type SceneType } from "@/remotion/spec";
import { uid } from "./store";

/** A good-looking starting point for every scene type (so "Add scene" never produces an empty frame). */
export function defaultScene(type: SceneType, project: Project | null, firstAsset?: { file: string; kind: string }): Scene {
  const app = project?.name ?? "My App";
  const outcome = project?.outcomes[0] ?? "get it done in seconds";
  const pain = project?.pains[0] ?? "I waste hours on this every week";
  const base = { id: uid(), transition: "cut" as const };
  const map: Record<SceneType, SceneInput> = {
    hook: { ...base, type: "hook", duration: 2.8, text: `I built an app that *${outcome}*`, textStyle: { style: "tiktok-box" } },
    media: firstAsset
      ? { ...base, type: "media", duration: 4, src: `asset:${firstAsset.file}`, kind: firstAsset.kind === "video" ? "video" : "image", device: "iphone", caption: { text: "watch this", style: { style: "tiktok-box", position: "top" } } }
      : { ...base, type: "media", duration: 4, src: "builtin:placeholder.svg", kind: "image", device: "iphone" },
    chat: {
      ...base,
      type: "chat",
      duration: 7,
      contact: "Sam",
      messages: [
        { from: "them", text: `${pain} 😭` },
        { from: "me", text: `wait you don't use ${app}??` },
        { from: "them", text: "what's that" },
        { from: "me", text: `it helps you ${outcome}` },
      ],
    },
    notes: { ...base, type: "notes", duration: 5, title: "apps that changed my life", items: ["wake up 15 min earlier", "walk after lunch", `use ${app} (seriously)`], checklist: true },
    tweet: { ...base, type: "tweet", duration: 3.5, name: app, handle: app.toLowerCase().replace(/[^a-z0-9]/g, ""), text: `just shipped ${app}. it helps you ${outcome}. would you use this?`, verified: true },
    reddit: { ...base, type: "reddit", duration: 4, subreddit: "SideProject", user: `${app.toLowerCase().replace(/[^a-z0-9]/g, "")}_dev`, title: `I built ${app} because ${pain.toLowerCase()}. Roast it.` },
    comment: { ...base, type: "comment", duration: 3, username: "curious.kate", text: `does ${app} actually work?`, caption: { text: "here's how it works 👇" } },
    list: { ...base, type: "list", duration: 5, title: `3 things ${app} does better`, items: (project?.features.slice(0, 3) ?? []).map((f) => ({ text: f.name, sub: f.benefit })).concat(project?.features.length ? [] : [{ text: "Fast", sub: "seconds, not hours" }, { text: "Simple", sub: "no setup" }, { text: "Fun", sub: "you'll actually use it" }]) },
    stat: { ...base, type: "stat", duration: 3, to: 1000, label: "users so far", sub: "and counting", note: "Use your real number." },
    split: { ...base, type: "split", duration: 4.5, top: { label: "before", text: pain, tone: "bad" }, bottom: { label: `with ${app}`, text: outcome, tone: "good" } },
    cta: { ...base, type: "cta", duration: 2.6, transition: "fade", appName: app, headline: project?.tagline || `${app}: ${outcome}`, action: project?.cta.action ?? "link-in-bio", icon: project?.brand.logo },
    slide: { ...base, type: "slide", duration: 2.6, text: `${app} does *this*` },
    kinetic: { ...base, type: "kinetic", duration: 2.8, words: ["stop", "doing", "it", "the", "hard", "way"] },
    notifications: {
      ...base,
      type: "notifications",
      duration: 4,
      items: [
        { app: "Stripe", title: "Stripe", body: "You received a payment of $9.99", time: "now" },
        { app: "Stripe", title: "Stripe", body: "You received a payment of $9.99", time: "2m ago" },
        { app: "Stripe", title: "Stripe", body: "You received a payment of $29.00", time: "5m ago" },
      ],
      note: "Only show payments you actually received.",
    },
    terminal: {
      ...base,
      type: "terminal",
      duration: 4.5,
      title: `~/${app.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      agent: "claude",
      lines: [
        { kind: "input", text: `build me an app that helps people ${outcome}` },
        { kind: "dim", text: "Planning…" },
        { kind: "output", text: "Created 12 files" },
        { kind: "success", text: "Build succeeded" },
      ],
    },
    appstore: { ...base, type: "appstore", duration: 3.6, appName: app, subtitle: project?.tagline?.slice(0, 34) || "Your new favourite app", icon: project?.brand.logo, category: project?.category || "Productivity" },
  };
  return Scene.parse(map[type]);
}
