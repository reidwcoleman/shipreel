import React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fillTextBox } from "@remotion/layout-utils";
import type { z } from "zod";
import { APPLE_UI, fontFamily } from "../fonts";
import type {
  AppStoreScene,
  ChatScene,
  CommentScene,
  NotesScene,
  NotificationsScene,
  RedditScene,
  TerminalScene,
  TweetScene,
} from "../spec";
import { BOUNCY, clamp, SMOOTH, SNAPPY } from "../ui/anim";
import { positionY, useColdOpen, useRender, useResolve, useSafeArea } from "../ui/context";
import { AppIcon, ContactAvatar, StatusBar, today, VerifiedBadge } from "../ui/ios";
import { Backdrop } from "../ui/media";
import { estimateTextHeight, TextBlock } from "../ui/text";
import { mixHex } from "./basic";

type P<T extends z.ZodTypeAny> = { scene: z.infer<T> };

/** Count wrapped lines for a paragraph at a given width (uses real font metrics when available). */
function countLines(text: string, fontFamilyCss: string, fontSize: number, fontWeight: number, maxWidth: number): number {
  try {
    let lines = 0;
    for (const para of text.split("\n")) {
      const box = fillTextBox({ maxBoxWidth: maxWidth, maxLines: 200 });
      let paraLines = 1;
      const words = para.split(" ");
      words.forEach((w, i) => {
        const { newLine } = box.add({
          text: i < words.length - 1 ? `${w} ` : w,
          fontFamily: fontFamilyCss,
          fontSize,
          fontWeight,
          validateFontIsLoaded: false,
        });
        if (newLine && i > 0) paraLines++;
      });
      lines += paraLines;
    }
    return lines;
  } catch {
    const charsPerLine = Math.max(8, Math.floor(maxWidth / (fontSize * 0.52)));
    return text.split("\n").reduce((n, p) => n + Math.max(1, Math.ceil(p.length / charsPerLine)), 0);
  }
}

/* ───────────────────────────── Chat (iMessage / WhatsApp / Instagram) ───────────────────────────── */

const CHAT_SKINS = {
  imessage: {
    light: { bg: "#FFFFFF", me: "#0A84FF", meText: "#FFFFFF", them: "#E9E9EB", themText: "#000000", header: "rgba(246,246,246,0.94)", meta: "#8E8E93", tint: "#0A84FF" },
    dark: { bg: "#000000", me: "#0A84FF", meText: "#FFFFFF", them: "#262628", themText: "#FFFFFF", header: "rgba(22,22,22,0.94)", meta: "#8E8E93", tint: "#0A84FF" },
  },
  whatsapp: {
    light: { bg: "#EFE7DE", me: "#D9FDD3", meText: "#111B21", them: "#FFFFFF", themText: "#111B21", header: "#F0F2F5", meta: "#667781", tint: "#008069" },
    dark: { bg: "#0B141A", me: "#005C4B", meText: "#E9EDEF", them: "#202C33", themText: "#E9EDEF", header: "#202C33", meta: "#8696A0", tint: "#00A884" },
  },
  instagram: {
    light: { bg: "#FFFFFF", me: "#7A3CF3", meText: "#FFFFFF", them: "#EFEFEF", themText: "#000000", header: "#FFFFFF", meta: "#737373", tint: "#0095F6" },
    dark: { bg: "#000000", me: "#7A3CF3", meText: "#FFFFFF", them: "#262626", themText: "#F5F5F5", header: "#000000", meta: "#A8A8A8", tint: "#0095F6" },
  },
  discord: {
    light: { bg: "#FFFFFF", me: "#5865F2", meText: "#FFFFFF", them: "#EBEDEF", themText: "#060607", header: "#F2F3F5", meta: "#5C5E66", tint: "#5865F2" },
    dark: { bg: "#313338", me: "#5865F2", meText: "#FFFFFF", them: "#2B2D31", themText: "#DBDEE1", header: "#2B2D31", meta: "#949BA4", tint: "#5865F2" },
  },
} as const;

export const Chat: React.FC<P<typeof ChatScene>> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const safe = useSafeArea();
  const resolve = useResolve();
  const skin = CHAT_SKINS[scene.app][scene.theme];
  // Viral text stories are screen recordings zoomed ~120%: bubbles fill the frame and stay legible after compression.
  const k = (width / 390) * 1.5;
  // The header stays close to real size; only the conversation is zoomed.
  const kh = (width / 390) * 1.1;
  const fs = 17 * k;
  const lineH = fs * 1.29;
  const padY = 7.5 * k;
  const padX = 12.5 * k;
  const sideL = 14 * k;
  const sideR = Math.max(14 * k, safe.right * 0.85);
  const maxBubble = (width - sideL - sideR) * 0.76;
  const headerH = 54 * kh + 74 * kh;
  const viewportTop = headerH + 10 * k;
  // A caption in the lower half reserves its band: bubbles scroll above it, never under it.
  const capPos = scene.caption ? (scene.caption.style?.position ?? "lower") : undefined;
  const capTop =
    scene.caption && (capPos === "lower" || capPos === "bottom")
      ? positionY(capPos, height, safe) * height - estimateTextHeight(scene.caption.text, scene.caption.style, "tiktok-box", width, 0.84) / 2 - 24 * (width / 1080)
      : height;
  const viewportBottom = Math.min(height - Math.max(safe.bottom, 90 * k), capTop);
  const viewportH = viewportBottom - viewportTop;

  // Timing: explicit `at` or auto-spaced, with a typing beat before replies.
  const n = scene.messages.length;
  const span = Math.max(0.6, durationInFrames / fps - 0.9);
  const times = scene.messages.map((m, i) => Math.round((m.at ?? 0.35 + (i * span) / n) * fps));

  // Group chat: sender names over each run of their bubbles and an avatar beside the last one.
  const group = scene.messages.some((m) => m.from === "them" && m.name);
  const sameRun = (a?: (typeof scene.messages)[number], b?: (typeof scene.messages)[number]) => !!a && !!b && a.from === b.from && (a.name ?? "") === (b.name ?? "");
  const avatarW = group ? 30 * k : 0;
  const nameH = 15 * k;
  const layout = scene.messages.map((m, i) => {
    const lines = countLines(m.text, APPLE_UI, fs, 400, maxBubble - avatarW - 2 * padX);
    const imgH = m.image ? maxBubble * 0.75 : 0;
    const showName = group && m.from === "them" && !!m.name && !sameRun(scene.messages[i - 1], m);
    const h = lines * lineH + 2 * padY + imgH + (showName ? nameH : 0);
    const gap = i === 0 ? 0 : sameRun(scene.messages[i - 1], m) ? 3 * k : 12 * k;
    return { h, gap, lines, showName };
  });

  const visibleCount = times.filter((t) => frame >= t).length;
  const typingFor = scene.messages.findIndex((m, i) => m.from === "them" && frame >= times[i] - 0.65 * fps && frame < times[i]);
  const heightUpTo = (count: number, withTyping: boolean) => {
    let h = 0;
    for (let i = 0; i < count; i++) h += layout[i].h + layout[i].gap;
    if (withTyping) h += 38 * k + 12 * k;
    return h;
  };
  // Smoothly scroll as content grows.
  const lastT = times[Math.max(0, visibleCount - 1)] ?? 0;
  const prevOffset = Math.max(0, heightUpTo(Math.max(0, visibleCount - 1), false) - viewportH);
  const targetOffset = Math.max(0, heightUpTo(visibleCount, typingFor >= 0) - viewportH);
  const scrollT = spring({ frame: frame - lastT, fps, config: SMOOTH });
  const offset = prevOffset + (targetOffset - prevOffset) * scrollT;

  const lastOfGroup = (i: number) => i === n - 1 || !sameRun(scene.messages[i], scene.messages[i + 1]);

  return (
    <AbsoluteFill style={{ background: skin.bg, fontFamily: APPLE_UI }}>
      {/* Messages */}
      <div style={{ position: "absolute", left: 0, right: 0, top: viewportTop, height: viewportH + (capTop < height ? 0 : safe.bottom), overflow: "hidden" }}>
        <div style={{ transform: `translateY(${-offset}px)`, display: "flex", flexDirection: "column", padding: `0 ${sideR}px 0 ${sideL}px` }}>
          <div style={{ textAlign: "center", color: skin.meta, fontSize: 11.5 * k, fontWeight: 500, marginBottom: 10 * k }}>
            {scene.app === "imessage" ? "iMessage" : ""}
            <br />
            <span style={{ fontWeight: 400 }}>Today 9:41 PM</span>
          </div>
          {scene.messages.map((m, i) => {
            if (frame < times[i]) return null;
            const s = spring({ frame: frame - times[i], fps, config: SNAPPY });
            const me = m.from === "me";
            const tail = lastOfGroup(i) && scene.app === "imessage";
            const img = resolve(m.image);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: me ? "flex-end" : "flex-start",
                  alignItems: "flex-end",
                  gap: group && !me ? 6 * k : 0,
                  marginTop: layout[i].gap,
                  transform: `scale(${interpolate(s, [0, 1], [0.6, 1])}) translateY(${interpolate(s, [0, 1], [20 * k, 0])}px)`,
                  transformOrigin: me ? "100% 100%" : "0% 100%",
                  opacity: interpolate(frame - times[i], [0, 3], [0, 1], clamp),
                }}
              >
                {group && !me && (
                  <div style={{ width: avatarW - 6 * k, flex: "none", marginBottom: 1 * k }}>
                    {lastOfGroup(i) && <ContactAvatar name={m.name ?? scene.contact} size={avatarW - 6 * k} />}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", alignItems: me ? "flex-end" : "flex-start", maxWidth: maxBubble - avatarW }}>
                {layout[i].showName && (
                  <div style={{ color: skin.meta, fontSize: 11.5 * k, lineHeight: `${nameH}px`, paddingLeft: padX * 0.9 }}>{m.name}</div>
                )}
                <div
                  style={{
                    position: "relative",
                    maxWidth: maxBubble - avatarW,
                    padding: `${padY}px ${padX}px`,
                    borderRadius: 18 * k,
                    background: me
                      ? scene.app === "instagram"
                        ? "linear-gradient(135deg, #A033FF 0%, #5B51F5 55%, #2F7BF6 100%)"
                        : skin.me
                      : skin.them,
                    color: me ? skin.meText : skin.themText,
                    fontSize: fs,
                    lineHeight: `${lineH}px`,
                    letterSpacing: "-0.012em",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {img && (
                    <Img src={img} style={{ width: maxBubble - 2 * padX, borderRadius: 12 * k, marginBottom: m.text ? 6 * k : 0, display: "block" }} />
                  )}
                  {m.text}
                  {tail && (
                    <>
                      {/* iMessage curl: a bubble-coloured corner, then a background-coloured mask that carves the hook. */}
                      <div
                        style={{
                          position: "absolute",
                          bottom: -1.6 * k,
                          height: 16 * k,
                          [me ? "right" : "left"]: -5.6 * k,
                          transform: `translateY(${-1.6 * k}px)`,
                          [me ? "borderRight" : "borderLeft"]: `${16 * k}px solid ${me ? skin.me : skin.them}`,
                          [me ? "borderBottomLeftRadius" : "borderBottomRightRadius"]: `${12.8 * k}px ${11.2 * k}px`,
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: -1.6 * k,
                          height: 16 * k,
                          width: 10 * k,
                          [me ? "right" : "left"]: (me ? -40 : 20) * k,
                          transform: `translate(${-30 * k}px, ${-2 * k}px)`,
                          background: skin.bg,
                          [me ? "borderBottomLeftRadius" : "borderBottomRightRadius"]: `${8 * k}px`,
                        }}
                      />
                    </>
                  )}
                </div>
                </div>
              </div>
            );
          })}
          {typingFor >= 0 && (
            <div style={{ display: "flex", marginTop: 12 * k, paddingLeft: avatarW }}>
              <div style={{ display: "flex", gap: 5 * k, padding: `${13 * k}px ${15 * k}px`, borderRadius: 18 * k, background: skin.them }}>
                {[0, 1, 2].map((d) => (
                  <div
                    key={d}
                    style={{
                      width: 8.5 * k,
                      height: 8.5 * k,
                      borderRadius: "50%",
                      background: skin.meta,
                      opacity: 0.35 + 0.65 * Math.max(0, Math.sin((frame / fps) * 9 - d * 0.9)),
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Header */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: headerH, background: skin.header, borderBottom: `${0.5 * kh}px solid rgba(127,127,127,0.25)` }}>
        <StatusBar k={kh} dark={scene.theme === "dark"} />
        <div style={{ position: "relative", height: 74 * kh, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width={12 * kh} height={20 * kh} viewBox="0 0 12 20" style={{ position: "absolute", left: 16 * kh, top: 18 * kh }}>
            <path d="M10 2 2 10l8 8" stroke={skin.tint} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * kh }}>
            {group ? (
              <div style={{ display: "flex", height: 48 * kh, alignItems: "center" }}>
                {[...new Set(scene.messages.filter((m) => m.from === "them" && m.name).map((m) => m.name!))].slice(0, 3).map((nm, j) => (
                  <div key={nm} style={{ marginLeft: j ? -12 * kh : 0, borderRadius: "50%", boxShadow: `0 0 0 ${2 * kh}px ${skin.header}` }}>
                    <ContactAvatar name={nm} size={(j === 1 ? 44 : 36) * kh} />
                  </div>
                ))}
              </div>
            ) : (
              <ContactAvatar name={scene.contact} size={48 * kh} />
            )}
            <div style={{ fontSize: 11.5 * kh, color: scene.theme === "dark" ? "#fff" : "#000", display: "flex", alignItems: "center", gap: 3 * kh }}>
              {scene.contact}
              <span style={{ color: skin.meta, fontSize: 10 * kh }}>›</span>
            </div>
          </div>
        </div>
      </div>
      {scene.caption && (
        <TextBlock
          text={scene.caption.text}
          style={{
            position: "lower",
            animation: "pop",
            ...scene.caption.style,
            // Thin-outline styles vanish against bubbles and the light header: chats always get the boxed caption.
            style: !scene.caption.style?.style || THIN_CAPTIONS.has(scene.caption.style.style) ? "tiktok-box" : scene.caption.style.style,
          }}
        />
      )}
    </AbsoluteFill>
  );
};

const THIN_CAPTIONS = new Set(["tiktok-classic", "minimal", "serif", "typewriter", "neon"]);

/* ───────────────────────────── Apple Notes ───────────────────────────── */

export const Notes: React.FC<P<typeof NotesScene>> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  const safe = useSafeArea();
  const cold = useColdOpen();
  const dark = scene.theme === "dark";
  // Zoomed like the Notes screenshots that go viral: the list fills the frame instead of a strip at the top.
  const k = (width / 390) * 1.32;
  const tint = dark ? "#FFD60A" : "#E3A600";
  const text = dark ? "#FFFFFF" : "#000000";
  const meta = "#8E8E93";
  const n = scene.items.length;
  const start = 0.5 * fps;
  const per = Math.max(5, (durationInFrames - start - 0.6 * fps) / n);
  return (
    <AbsoluteFill style={{ background: dark ? "#000000" : "#FFFFFF", fontFamily: APPLE_UI, color: text }}>
      <StatusBar k={k} dark={dark} />
      <div style={{ height: 44 * k, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${16 * k}px`, color: tint, fontSize: 17 * k }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 * k }}>
          <svg width={12 * k} height={20 * k} viewBox="0 0 12 20">
            <path d="M10 2 2 10l8 8" stroke={tint} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Notes
        </div>
        <div style={{ display: "flex", gap: 22 * k, marginRight: Math.max(0, safe.right - 30 * k) }}>
          <span style={{ fontWeight: 600 }}>Done</span>
        </div>
      </div>
      <div style={{ padding: `${10 * k}px ${Math.max(20 * k, safe.right * 0.9)}px 0 ${20 * k}px` }}>
        <div style={{ textAlign: "center", color: meta, fontSize: 13 * k, marginBottom: 14 * k }}>{today().long} at 9:41 PM</div>
        <div style={{ fontSize: 28 * k, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 14 * k, opacity: cold ? 1 : interpolate(frame, [0, 8], [0, 1], clamp) }}>
          {scene.title}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 * k }}>
          {scene.items.map((item, i) => {
            const t0 = start + i * per;
            if (frame < t0) return null;
            const s = spring({ frame: frame - t0, fps, config: SNAPPY });
            const checked = scene.checklist && frame > t0 + per * 0.6;
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 * k, fontSize: 17 * k, lineHeight: 1.32, opacity: s, transform: `translateY(${(1 - s) * 10 * k}px)` }}>
                {scene.checklist ? (
                  <div
                    style={{
                      width: 22 * k,
                      height: 22 * k,
                      flex: "none",
                      marginTop: 1 * k,
                      borderRadius: "50%",
                      border: checked ? "none" : `${1.5 * k}px solid #C7C7CC`,
                      background: checked ? tint : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {checked && (
                      <svg width={12 * k} height={12 * k} viewBox="0 0 12 12">
                        <path d="M2.5 6.2 5 8.6l4.6-5" stroke="#fff" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                ) : (
                  <span style={{ width: 14 * k, flex: "none", textAlign: "center" }}>•</span>
                )}
                <span style={{ color: checked ? meta : text }}>{item}</span>
              </div>
            );
          })}
        </div>
      </div>
      {scene.caption && <TextBlock text={scene.caption.text} style={{ position: "lower", style: "tiktok-box-dark", animation: "pop", ...scene.caption.style }} />}
    </AbsoluteFill>
  );
};

/* ───────────────────────────── Tweet / X post ───────────────────────────── */

const Metric: React.FC<{ d: string; v?: string; k: number; color: string }> = ({ d, v, k, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 * k, color, fontSize: 34 * k }}>
    <svg width={36 * k} height={36 * k} viewBox="0 0 24 24">
      <path d={d} fill={color} />
    </svg>
    {v}
  </div>
);

const ICONS = {
  reply: "M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z",
  repost: "M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z",
  like: "M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91z",
  views: "M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z",
};

export const Tweet: React.FC<P<typeof TweetScene>> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const resolve = useResolve();
  const { theme } = useRender();
  const dark = scene.theme === "dark";
  const k = width / 1080;
  const cardW = 960 * k;
  const cold = useColdOpen();
  const s = cold ? 1 : spring({ frame, fps, config: SNAPPY });
  const float = Math.sin(frame / 22) * 4 * k;
  const c = dark
    ? { bg: "#000000", text: "#E7E9EA", meta: "#71767B", border: "#2F3336" }
    : { bg: "#FFFFFF", text: "#0F1419", meta: "#536471", border: "#EFF3F4" };
  const img = resolve(scene.image);
  return (
    <AbsoluteFill>
      <Backdrop bg={scene.background ?? { kind: "mesh", colors: [theme.bg, mixHex(theme.accent, theme.bg, 0.18), "#101014"] }} />
      <div
        style={{
          position: "absolute",
          left: (width - cardW) / 2,
          top: height * 0.4,
          width: cardW,
          transform: `translateY(-50%) translateY(${interpolate(s, [0, 1], [80 * k, 0]) + float}px) scale(${interpolate(s, [0, 1], [0.9, 1])})`,
          opacity: cold ? 1 : interpolate(frame, [0, 5], [0, 1], clamp),
          background: c.bg,
          border: `${2 * k}px solid ${c.border}`,
          borderRadius: 34 * k,
          padding: `${40 * k}px ${44 * k}px ${30 * k}px`,
          fontFamily: APPLE_UI,
          color: c.text,
          boxShadow: `0 ${12 * k}px ${40 * k}px rgba(0,0,0,0.25)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 * k }}>
          <ContactAvatar name={scene.name} size={96 * k} src={scene.avatar} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 * k }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 * k, fontWeight: 700, fontSize: 40 * k }}>
              {scene.name}
              {scene.verified && <VerifiedBadge size={38 * k} />}
            </div>
            <div style={{ color: c.meta, fontSize: 40 * k }}>@{scene.handle.replace(/^@/, "")}</div>
          </div>
        </div>
        <div style={{ fontSize: 46 * k, lineHeight: 1.32, marginTop: 28 * k, whiteSpace: "pre-wrap", letterSpacing: "-0.01em" }}>{scene.text}</div>
        {img && <Img src={img} style={{ width: "100%", borderRadius: 28 * k, marginTop: 26 * k, border: `${2 * k}px solid ${c.border}` }} />}
        <div style={{ color: c.meta, fontSize: 32 * k, marginTop: 28 * k }}>
          9:41 PM · {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          {scene.views && (
            <>
              {" · "}
              <b style={{ color: c.text }}>{scene.views}</b> Views
            </>
          )}
        </div>
        <div style={{ height: 2 * k, background: c.border, margin: `${24 * k}px 0` }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Metric d={ICONS.reply} v={scene.replies} k={k} color={c.meta} />
          <Metric d={ICONS.repost} v={scene.reposts} k={k} color={c.meta} />
          <Metric d={ICONS.like} v={scene.likes} k={k} color={frame > 30 ? "#F91880" : c.meta} />
          <Metric d={ICONS.views} v={scene.views} k={k} color={c.meta} />
        </div>
      </div>
      {scene.caption && <TextBlock text={scene.caption.text} style={{ position: "top", animation: "pop", ...scene.caption.style }} delay={6} />}
    </AbsoluteFill>
  );
};

/* ───────────────────────────── Reddit post ───────────────────────────── */

const RedditPill: React.FC<{ k: number; bg: string; color: string; children: React.ReactNode }> = ({ k, bg, color, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12 * k, height: 64 * k, padding: `0 ${24 * k}px`, borderRadius: 999, background: bg, color, fontSize: 30 * k, fontWeight: 700 }}>{children}</div>
);

export const Reddit: React.FC<P<typeof RedditScene>> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { theme } = useRender();
  const dark = scene.theme === "dark";
  const k = width / 1080;
  const cardW = 960 * k;
  const cold = useColdOpen();
  const s = cold ? 1 : spring({ frame, fps, config: SNAPPY });
  const c = dark
    ? { bg: "#0E1113", text: "#F2F4F5", body: "#B7CAD4", meta: "#82959B", pill: "#2A3236", border: "#2A3236" }
    : { bg: "#FFFFFF", text: "#0F1A1C", body: "#2A3C42", meta: "#576F76", pill: "#E5EBEE", border: "#E5EBEE" };
  const arrow = (up: boolean) => (
    <svg width={30 * k} height={30 * k} viewBox="0 0 20 20" style={{ transform: up ? undefined : "rotate(180deg)" }}>
      <path d="M10 3 3 11h4.5v6h5v-6H17z" fill="none" stroke={c.meta} strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
  return (
    <AbsoluteFill>
      <Backdrop bg={scene.background ?? { kind: "mesh", colors: [theme.bg, "#1d1210", mixHex("#FF4500", theme.bg, 0.16)] }} />
      <div
        style={{
          position: "absolute",
          left: (width - cardW) / 2,
          top: height * 0.4,
          width: cardW,
          transform: `translateY(-50%) translateY(${interpolate(s, [0, 1], [80 * k, 0])}px) scale(${interpolate(s, [0, 1], [0.92, 1])})`,
          opacity: cold ? 1 : interpolate(frame, [0, 5], [0, 1], clamp),
          background: c.bg,
          borderRadius: 32 * k,
          border: dark ? `${2 * k}px solid ${c.border}` : undefined,
          padding: `${44 * k}px`,
          fontFamily: APPLE_UI,
          color: c.text,
          boxShadow: `0 ${16 * k}px ${48 * k}px rgba(0,0,0,0.3)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 * k }}>
          <div style={{ width: 84 * k, height: 84 * k, borderRadius: "50%", background: "#FF4500", color: "#fff", fontWeight: 800, fontSize: 36 * k, display: "flex", alignItems: "center", justifyContent: "center" }}>r/</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 * k }}>
            <div style={{ fontWeight: 700, fontSize: 34 * k }}>r/{scene.subreddit.replace(/^r\//, "")}</div>
            <div style={{ color: c.meta, fontSize: 30 * k }}>u/{scene.user.replace(/^u\//, "")} · 6h</div>
          </div>
        </div>
        <div style={{ fontWeight: 700, fontSize: 54 * k, lineHeight: 1.2, marginTop: 26 * k, letterSpacing: "-0.01em" }}>{scene.title}</div>
        {scene.body && (
          <div style={{ color: c.body, fontSize: 40 * k, lineHeight: 1.35, marginTop: 18 * k, display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {scene.body}
          </div>
        )}
        <div style={{ display: "flex", gap: 16 * k, marginTop: 30 * k }}>
          <RedditPill k={k} bg={c.pill} color={c.text}>
            {arrow(true)}
            {scene.upvotes ?? "Vote"}
            {arrow(false)}
          </RedditPill>
          <RedditPill k={k} bg={c.pill} color={c.text}>
            <svg width={30 * k} height={30 * k} viewBox="0 0 20 20">
              <path d="M10 3c4.4 0 7.5 2.7 7.5 6.2S14.4 15.4 10 15.4c-.9 0-1.8-.1-2.6-.4L4 16.6l.9-3C3.4 12.5 2.5 11 2.5 9.2 2.5 5.7 5.6 3 10 3z" fill="none" stroke={c.meta} strokeWidth={1.6} strokeLinejoin="round" />
            </svg>
            {scene.comments}
          </RedditPill>
          <RedditPill k={k} bg={c.pill} color={c.text}>
            <svg width={28 * k} height={28 * k} viewBox="0 0 20 20">
              <path d="M11 3l6 6-6 6v-3.5C6.5 11.5 4 13 3 16c.5-5 3.5-8 8-8.5z" fill="none" stroke={c.meta} strokeWidth={1.6} strokeLinejoin="round" />
            </svg>
            Share
          </RedditPill>
        </div>
      </div>
      {scene.caption && <TextBlock text={scene.caption.text} style={{ position: "top", animation: "pop", ...scene.caption.style }} delay={6} />}
    </AbsoluteFill>
  );
};

/* ───────────────────────────── TikTok comment reply ───────────────────────────── */

export const Comment: React.FC<P<typeof CommentScene>> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { theme } = useRender();
  const k = width / 1080;
  const cold = useColdOpen();
  const s = cold ? 1 : spring({ frame, fps, config: BOUNCY });
  return (
    <AbsoluteFill>
      <Backdrop bg={scene.background ?? { kind: "mesh", colors: [theme.bg, mixHex(theme.accent, theme.bg, 0.16), "#121216"] }} />
      <div
        style={{
          position: "absolute",
          left: 89 * k,
          top: Math.max(250 * k, height * 0.187),
          width: 541 * k,
          transform: `scale(${s})`,
          transformOrigin: "0% 100%",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            gap: 18 * k,
            alignItems: "flex-start",
            background: "#FFFFFF",
            borderRadius: `${20 * k}px ${20 * k}px ${20 * k}px 0`,
            padding: `${22 * k}px ${30 * k}px ${28 * k}px ${19 * k}px`,
            fontFamily: fontFamily("tiktok-sans"),
            boxShadow: `0 ${10 * k}px ${30 * k}px rgba(0,0,0,0.18)`,
          }}
        >
          <div style={{ marginTop: 4 * k }}>
            <ContactAvatar name={scene.username.replace(/^@/, "")} size={66 * k} src={scene.avatar} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 * k, minWidth: 0 }}>
            <div style={{ color: "#6F6F6F", fontSize: 28 * k, fontWeight: 400, lineHeight: 1.15 }}>
              Reply to {scene.username.replace(/^@/, "")}&apos;s comment
            </div>
            <div style={{ color: "#000000", fontSize: 41 * k, fontWeight: 700, lineHeight: 1.1, display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {scene.text}
            </div>
          </div>
          <svg width={26 * k} height={21 * k} viewBox="0 0 26 21" style={{ position: "absolute", left: 0, bottom: -21 * k + 0.5 }}>
            <path d="M0 0h26L3 21H0z" fill="#FFFFFF" />
          </svg>
        </div>
      </div>
      {scene.caption && <TextBlock text={scene.caption.text} style={{ position: "lower", animation: "pop", ...scene.caption.style }} delay={10} />}
    </AbsoluteFill>
  );
};

/* ───────────────────────────── Lock screen notifications ───────────────────────────── */

export const Notifications: React.FC<P<typeof NotificationsScene>> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const safe = useSafeArea();
  const { theme } = useRender();
  const k = width / 390;
  const n = scene.items.length;
  const first = 0.45 * fps;
  const per = Math.max(4, (durationInFrames - first - 0.5 * fps) / n);
  const cardH = 76 * k;
  const gap = 8 * k;
  const listTop = 300 * k;
  const maxVisible = Math.max(2, Math.floor((height - safe.bottom - listTop) / (cardH + gap)));
  const shown = scene.items.map((_, i) => first + i * per).filter((t) => frame >= t).length;
  const pushT = spring({ frame: frame - (first + (shown - 1) * per), fps, config: SNAPPY });
  return (
    <AbsoluteFill style={{ fontFamily: APPLE_UI }}>
      <Backdrop bg={scene.background ?? { kind: "mesh", colors: ["#0b1020", mixHex(theme.accent, "#0b1020", 0.25), "#1a1030", "#0d1a2a"] }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <StatusBar k={k} dark />
      </div>
      <div style={{ position: "absolute", top: 92 * k, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.92)" }}>
        <div style={{ fontSize: 21 * k, fontWeight: 600 }}>{today().weekdayMonthDay}</div>
        <div style={{ fontSize: 96 * k, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.03em", marginTop: 2 * k }}>9:41</div>
      </div>
      {scene.items.map((item, i) => {
        const t0 = first + i * per;
        if (frame < t0) return null;
        // Newest on top; older ones push down.
        const order = shown - 1 - i;
        if (order >= maxVisible + 1) return null;
        const isNewest = order === 0;
        const y = listTop + (order - (isNewest ? 0 : 1) + (isNewest ? 0 : pushT)) * (cardH + gap);
        const enter = isNewest ? spring({ frame: frame - t0, fps, config: SNAPPY }) : 1;
        const fade = order >= maxVisible ? 1 - pushT : 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 10 * k,
              right: 10 * k,
              top: y,
              height: cardH,
              transform: `translateY(${interpolate(enter, [0, 1], [-40 * k, 0])}px) scale(${interpolate(enter, [0, 1], [0.92, 1])})`,
              opacity: Math.min(enter * 1.4, fade),
              borderRadius: 22 * k,
              background: "rgba(245,245,247,0.78)",
              display: "flex",
              alignItems: "center",
              gap: 11 * k,
              padding: `0 ${14 * k}px`,
              color: "#000",
              boxShadow: `0 ${4 * k}px ${18 * k}px rgba(0,0,0,0.18)`,
            }}
          >
            <div
              style={{
                width: 38 * k,
                height: 38 * k,
                flex: "none",
                borderRadius: 9 * k,
                background: item.color ?? "#635BFF",
                color: "#fff",
                fontWeight: 800,
                fontSize: 20 * k,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {item.glyph ?? item.app[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15 * k, fontWeight: 600 }}>
                <span>{item.title}</span>
                <span style={{ fontWeight: 400, color: "rgba(60,60,67,0.6)", fontSize: 13 * k }}>{item.time}</span>
              </div>
              <div style={{ fontSize: 15 * k, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.body}</div>
            </div>
          </div>
        );
      })}
      {scene.caption && <TextBlock text={scene.caption.text} style={{ position: "top", animation: "pop", ...scene.caption.style }} />}
    </AbsoluteFill>
  );
};

/* ───────────────────────────── Coding-agent terminal ───────────────────────────── */

export const Terminal: React.FC<P<typeof TerminalScene>> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const { theme } = useRender();
  const k = width / 1080;
  const winW = 980 * k;
  const winH = Math.min(height * 0.52, 1000 * k);
  const mono = fontFamily("jetbrains-mono");
  const cold = useColdOpen();
  const s = cold ? 1 : spring({ frame, fps, config: SNAPPY });
  // Each line gets a slot; input lines type out, output lines appear.
  const startAt = 0.5 * fps;
  const per = Math.max(3, (durationInFrames - startAt - 0.6 * fps) / scene.lines.length);
  const brand =
    scene.agent === "claude"
      ? { mark: "✻", name: "Claude Code", color: "#D97757" }
      : scene.agent === "codex"
        ? { mark: ">_", name: "OpenAI Codex", color: "#E7E7EA" }
        : { mark: "$", name: "zsh", color: "#A1A1AA" };
  const visible = scene.lines.map((line, i) => ({ line, t0: startAt + i * per })).filter(({ t0 }) => frame >= t0);
  const maxLines = 11;
  const lines = visible.slice(-maxLines);
  return (
    <AbsoluteFill>
      <Backdrop bg={scene.background ?? { kind: "mesh", colors: ["#09090b", mixHex(brand.color, "#09090b", 0.18), "#111114"] }} />
      <div
        style={{
          position: "absolute",
          left: (width - winW) / 2,
          top: height * 0.42 - winH / 2,
          width: winW,
          height: winH,
          borderRadius: 28 * k,
          background: "#0C0C0E",
          border: `${2 * k}px solid rgba(255,255,255,0.08)`,
          boxShadow: `0 ${40 * k}px ${120 * k}px rgba(0,0,0,0.6)`,
          overflow: "hidden",
          transform: `scale(${interpolate(s, [0, 1], [0.92, 1])})`,
          opacity: cold ? 1 : interpolate(frame, [0, 6], [0, 1], clamp),
          fontFamily: mono,
        }}
      >
        <div style={{ height: 64 * k, display: "flex", alignItems: "center", gap: 14 * k, padding: `0 ${26 * k}px`, borderBottom: `${2 * k}px solid rgba(255,255,255,0.06)` }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <div key={c} style={{ width: 20 * k, height: 20 * k, borderRadius: "50%", background: c }} />
          ))}
          <div style={{ flex: 1, textAlign: "center", color: "#71717A", fontSize: 24 * k, marginRight: 80 * k }}>
            {scene.title} — {brand.name}
          </div>
        </div>
        <div style={{ padding: `${26 * k}px ${30 * k}px`, display: "flex", flexDirection: "column", gap: 14 * k }}>
          {scene.agent !== "shell" && (
            <div style={{ border: `${2 * k}px solid ${brand.color}`, borderRadius: 14 * k, padding: `${14 * k}px ${20 * k}px`, color: brand.color, fontSize: 32 * k, marginBottom: 6 * k }}>
              {brand.mark} Welcome to <b>{brand.name}</b>
            </div>
          )}
          {lines.map(({ line, t0 }, i) => {
            const local = frame - t0;
            const isInput = line.kind === "input";
            const chars = isInput ? Math.floor(interpolate(local, [0, Math.max(6, line.text.length * 0.9)], [0, line.text.length], clamp)) : line.text.length;
            const color = line.kind === "success" ? "#4ADE80" : line.kind === "dim" ? "#71717A" : isInput ? "#FAFAFA" : "#D4D4D8";
            return (
              <div
                key={`${t0}-${i}`}
                style={{
                  color,
                  fontSize: 36 * k,
                  lineHeight: 1.38,
                  whiteSpace: "pre-wrap",
                  opacity: isInput ? 1 : interpolate(local, [0, 4], [0, 1], clamp),
                  background: isInput ? "rgba(255,255,255,0.05)" : undefined,
                  borderRadius: isInput ? 10 * k : undefined,
                  padding: isInput ? `${8 * k}px ${14 * k}px` : undefined,
                }}
              >
                {isInput && <span style={{ color: brand.color }}>{scene.agent === "shell" ? "$ " : "> "}</span>}
                {line.kind === "success" && "✓ "}
                {line.text.slice(0, chars)}
                {isInput && chars < line.text.length && <span style={{ background: "#FAFAFA", color: "#000" }}> </span>}
              </div>
            );
          })}
        </div>
      </div>
      {scene.caption && <TextBlock text={scene.caption.text} style={{ position: "top", animation: "pop", ...scene.caption.style }} />}
    </AbsoluteFill>
  );
};

/* ───────────────────────────── App Store page ───────────────────────────── */

export const AppStore: React.FC<P<typeof AppStoreScene>> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const resolve = useResolve();
  const { theme } = useRender();
  const k = width / 390;
  const tapAt = Math.round(durationInFrames * 0.55);
  const tapped = frame >= tapAt;
  const dl = interpolate(frame, [tapAt + 4, tapAt + 4 + 1.1 * fps], [0, 1], clamp);
  const done = dl >= 1;
  const tapRing = interpolate(frame - tapAt, [0, 12], [0, 1], clamp);
  const s = useColdOpen() ? 1 : spring({ frame, fps, config: SNAPPY });
  const shots = scene.screenshots.map(resolve).filter(Boolean) as string[];
  const scroll = interpolate(frame, [0, durationInFrames], [0, 60 * k], clamp);
  const stars = Math.round(scene.rating ?? 0);
  const rated = scene.rating != null;
  // Only facts the spec actually has: ratings and chart rank are never filled in by default.
  const facts: { label: string; value: React.ReactNode; sub: string }[] = [
    ...(rated ? [{ label: `${scene.ratings ? `${scene.ratings} ` : ""}RATINGS`, value: scene.rating!.toFixed(1), sub: "★".repeat(stars) + "☆".repeat(5 - stars) }] : []),
    { label: "AGE", value: "4+", sub: "Years Old" },
    scene.chart
      ? { label: "CHART", value: scene.chart, sub: scene.category }
      : {
          label: "CATEGORY",
          value: (
            <svg width={20 * k} height={20 * k} viewBox="0 0 20 20" style={{ margin: `${3 * k}px auto` }}>
              {[2, 11].flatMap((x) => [2, 11].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width={7} height={7} rx={2} fill="#8E8E93" />))}
            </svg>
          ),
          sub: scene.category,
        },
    ...(rated ? [] : [{ label: "LANGUAGE", value: "EN", sub: "English" }]),
  ];
  return (
    <AbsoluteFill style={{ background: "#FFFFFF", fontFamily: APPLE_UI, color: "#000" }}>
      <StatusBar k={k} />
      <div style={{ padding: `${8 * k}px ${16 * k}px`, color: "#007AFF", fontSize: 17 * k, display: "flex", alignItems: "center", gap: 6 * k }}>
        <svg width={12 * k} height={20 * k} viewBox="0 0 12 20">
          <path d="M10 2 2 10l8 8" stroke="#007AFF" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Search
      </div>
      <div style={{ display: "flex", gap: 16 * k, padding: `${12 * k}px ${20 * k}px`, transform: `translateY(${interpolate(s, [0, 1], [20 * k, 0])}px)`, opacity: s }}>
        <AppIcon src={scene.icon} name={scene.appName} size={118 * k} color={theme.accent} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, minWidth: 0 }}>
          <div>
            <div style={{ fontSize: 22 * k, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{scene.appName}</div>
            <div style={{ fontSize: 15 * k, color: "#8E8E93", marginTop: 2 * k }}>{scene.subtitle}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 * k }}>
            <div
              style={{
                position: "relative",
                minWidth: 76 * k,
                height: 30 * k,
                borderRadius: 999,
                background: done ? "#F2F2F7" : tapped ? "transparent" : "#007AFF",
                color: done ? "#007AFF" : "#fff",
                fontSize: 15 * k,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${tapped && !done ? 1 : 1})`,
              }}
            >
              {!tapped && "Get"}
              {tapped && !done && (
                <svg width={30 * k} height={30 * k} viewBox="0 0 30 30">
                  <circle cx={15} cy={15} r={12} stroke="#E5E5EA" strokeWidth={3} fill="none" />
                  <circle cx={15} cy={15} r={12} stroke="#007AFF" strokeWidth={3} fill="none" strokeDasharray={75.4} strokeDashoffset={75.4 * (1 - dl)} transform="rotate(-90 15 15)" strokeLinecap="round" />
                  <rect x={11} y={11} width={8} height={8} rx={1.5} fill="#007AFF" />
                </svg>
              )}
              {done && "Open"}
              {tapped && tapRing < 1 && (
                <div style={{ position: "absolute", width: 60 * k, height: 60 * k, borderRadius: "50%", border: `${3 * k}px solid rgba(0,122,255,${1 - tapRing})`, transform: `scale(${0.4 + tapRing})` }} />
              )}
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-around", padding: `${14 * k}px ${10 * k}px`, borderTop: `${0.5 * k}px solid #E5E5EA`, borderBottom: `${0.5 * k}px solid #E5E5EA`, margin: `${8 * k}px ${20 * k}px` }}>
        {facts.map((f) => (
          <div key={f.label} style={{ flex: 1, minWidth: 0, textAlign: "center", display: "flex", flexDirection: "column", gap: 2 * k }}>
            <div style={{ fontSize: 10 * k, color: "#8E8E93", fontWeight: 600, letterSpacing: "0.02em" }}>{f.label}</div>
            <div style={{ fontSize: 20 * k, color: "#8E8E93", fontWeight: 700 }}>{f.value}</div>
            <div style={{ fontSize: 11 * k, color: "#8E8E93", padding: `0 ${4 * k}px` }}>{f.sub}</div>
          </div>
        ))}
      </div>
      {shots.length > 0 && (
        <div style={{ display: "flex", gap: 10 * k, padding: `${12 * k}px ${20 * k}px`, transform: `translateX(${-scroll}px)` }}>
          {shots.slice(0, 4).map((src, i) => (
            <Img key={i} src={src} style={{ width: 160 * k, height: 346 * k, objectFit: "cover", borderRadius: 20 * k, border: `${0.5 * k}px solid #E5E5EA`, flex: "none" }} />
          ))}
        </div>
      )}
      {scene.caption && <TextBlock text={scene.caption.text} style={{ position: shots.length ? "top" : "lower", animation: "pop", style: "tiktok-box-dark", ...scene.caption.style }} />}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `linear-gradient(transparent ${height * 0.82}px, rgba(255,255,255,0.0))` }} />
    </AbsoluteFill>
  );
};
