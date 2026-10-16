import type { VideoSpecInput } from "./spec";

/** Showcase spec used by Remotion Studio and as a smoke test for every scene type. */
export const DEMO_SPEC: VideoSpecInput = {
  id: "demo",
  title: "Shipreel demo",
  formatId: "showcase",
  theme: { font: "tiktok-sans", captionStyle: "tiktok-classic", accent: "#D7FF3A", bg: "#0B0B0F" },
  scenes: [
    { id: "s1", type: "hook", duration: 2.2, text: "I built an app that *texts you back*\nwhen you skip the gym", textStyle: { style: "tiktok-box" } },
    {
      id: "s2", type: "chat", duration: 5, transition: "slide-left", contact: "Gym Buddy",
      messages: [
        { from: "them", text: "where were you today??" },
        { from: "me", text: "i was busy 😭" },
        { from: "them", text: "busy doing what" },
        { from: "me", text: "ok fine i downloaded an app that guilt-trips me now" },
      ],
    },
    { id: "s3", type: "notifications", duration: 3.5, transition: "zoom", items: [
      { app: "Stripe", title: "Stripe", body: "You received a payment of $9.99", time: "now" },
      { app: "Stripe", title: "Stripe", body: "You received a payment of $29.00", time: "1m ago" },
      { app: "Stripe", title: "Stripe", body: "You received a payment of $9.99", time: "2m ago" },
      { app: "Stripe", title: "Stripe", body: "You received a payment of $79.00", time: "4m ago" },
    ] },
    { id: "s4", type: "stat", duration: 3, transition: "fade", from: 0, to: 4812, prefix: "$", label: "MRR after 30 days", sub: "no ads. just TikTok." },
    { id: "s5", type: "list", duration: 4, transition: "slide-up", title: "Apps that feel *illegal* to know", highlight: 2, items: [
      { text: "Notion", sub: "second brain" }, { text: "Raycast", sub: "launcher on steroids" }, { text: "GymGhost", sub: "it texts you when you skip" },
    ] },
    { id: "s6", type: "terminal", duration: 4, transition: "whip", title: "~/gymghost", agent: "claude", lines: [
      { kind: "input", text: "build me an app that texts me when I skip the gym" },
      { kind: "dim", text: "Reading project structure…" },
      { kind: "output", text: "Created src/notifications/guilt.ts" },
      { kind: "success", text: "Shipped to TestFlight" },
    ] },
    { id: "s7", type: "cta", duration: 2.6, transition: "fade", appName: "GymGhost", headline: "Your gym buddy who never sleeps", action: "link-in-bio" },
  ],
  overlays: [{ id: "o1", type: "progress", start: 0, end: 0 }],
  meta: { hook: "I built an app that texts you back when you skip the gym", caption: "the accountability you didn't ask for", hashtags: ["buildinpublic", "indiedev"] },
};
