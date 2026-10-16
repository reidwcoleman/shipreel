"use client";
import type { PlayerRef } from "@remotion/player";
import { create } from "zustand";
import type { Overlay, Scene, VideoSpec } from "@/remotion/spec";

/** The editor's Player, so the timeline and shortcuts can seek/play without prop drilling. */
export const player: { current: PlayerRef | null } = { current: null };

export function seek(frame: number) {
  const f = Math.max(0, Math.round(frame));
  player.current?.seekTo(f);
  useEditor.setState({ frame: f });
}

export type Selection = { kind: "video" } | { kind: "scene"; id: string } | { kind: "overlay"; id: string };

type EditorState = {
  spec: VideoSpec | null;
  past: VideoSpec[];
  future: VideoSpec[];
  selected: Selection;
  frame: number;
  playing: boolean;
  /** Bumped on every local edit; the page autosaves when it changes. */
  revision: number;
  savedRevision: number;
  lastKey: string | null;
  lastAt: number;
  load: (spec: VideoSpec, keepHistory?: boolean) => void;
  /** Apply an edit. Edits with the same `key` within 800ms merge into one undo step (typing). */
  edit: (fn: (s: VideoSpec) => VideoSpec, key?: string) => void;
  undo: () => void;
  redo: () => void;
  select: (s: Selection) => void;
  setFrame: (f: number) => void;
  setPlaying: (p: boolean) => void;
  markSaved: (rev: number) => void;
};

export const useEditor = create<EditorState>((set, get) => ({
  spec: null,
  past: [],
  future: [],
  selected: { kind: "video" },
  frame: 0,
  playing: false,
  revision: 0,
  savedRevision: 0,
  lastKey: null,
  lastAt: 0,
  load: (spec, keepHistory) =>
    set((st) => ({
      spec,
      past: keepHistory && st.spec ? [...st.past, st.spec].slice(-100) : [],
      future: [],
      revision: keepHistory ? st.revision + 1 : 0,
      savedRevision: keepHistory ? st.savedRevision : 0,
      selected: keepHistory ? st.selected : { kind: "video" },
    })),
  edit: (fn, key) => {
    const st = get();
    if (!st.spec) return;
    const next = fn(structuredClone(st.spec));
    const now = Date.now();
    const merge = key && key === st.lastKey && now - st.lastAt < 800;
    set({
      spec: next,
      past: merge ? st.past : [...st.past, st.spec].slice(-100),
      future: [],
      revision: st.revision + 1,
      lastKey: key ?? null,
      lastAt: now,
    });
  },
  undo: () => {
    const st = get();
    const prev = st.past.at(-1);
    if (!prev || !st.spec) return;
    set({ spec: prev, past: st.past.slice(0, -1), future: [st.spec, ...st.future], revision: st.revision + 1, lastKey: null });
  },
  redo: () => {
    const st = get();
    const nxt = st.future[0];
    if (!nxt || !st.spec) return;
    set({ spec: nxt, past: [...st.past, st.spec], future: st.future.slice(1), revision: st.revision + 1, lastKey: null });
  },
  select: (selected) => set({ selected }),
  setFrame: (frame) => set({ frame }),
  setPlaying: (playing) => set({ playing }),
  markSaved: (rev) => set({ savedRevision: rev }),
}));

// ── Spec helpers ──────────────────────────────────────────────────────────────

export function updateScene(spec: VideoSpec, id: string, patch: Partial<Scene> | ((s: Scene) => Scene)): VideoSpec {
  return {
    ...spec,
    scenes: spec.scenes.map((s) => (s.id === id ? (typeof patch === "function" ? patch(s) : ({ ...s, ...patch } as Scene)) : s)),
  };
}

export function updateOverlay(spec: VideoSpec, id: string, patch: Partial<Overlay>): VideoSpec {
  return { ...spec, overlays: spec.overlays.map((o) => (o.id === id ? ({ ...o, ...patch } as Overlay) : o)) };
}

export function uid(prefix = "s") {
  return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
}
