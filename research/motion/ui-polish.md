# Shipreel: App UI Polish Audit

- **Date:** 2026-10-15
- **Build:** production at http://localhost:4747
- **Viewports:** 1440×900 (primary), 1280×800, 1920×1080, 390×844
- **Scope:** every route (Home, Hook Lab, Studio, Calendar, Viral Library, Product, Agents, Settings, Welcome, both editor videos), menus, popovers, dialogs, sheets, ⌘K, toasts, the activity dock, and hover, focus, loading and empty states
- **Method:** Playwright walkthrough plus DOM and computed-style measurement (contrast, radii, title positions, overflow, API timing), plus source review of `src/app` and `src/components`.
- **Read-only:** I created, rendered, posted, scheduled and deleted nothing. Client-only actions I took: switched tabs and filters, selected scenes (no edits; the editor stayed "Saved"), played and paused, opened and closed menus and dialogs with Esc, and typed into ⌘K then cleared it.

**Screenshots.** Playwright saved them under `.playwright-mcp/` in its own workspace root, which is `/Users/reidcoleman/Glide/TradeBot/.playwright-mcp/` and not the Shipreel repo. They are cited below as `[shot: ui-…png]`, and the index is at the end.

**Priority key:**
- **P0:** broken or ugly. Fix before anyone sees it.
- **P1:** noticeable. It costs trust or polish on every visit.
- **P2:** refinement. This is what separates "good" from "award-level".

---

## 0. Verdict

The foundations are good:
- An OKLCH token set: tinted neutrals and one signal-lime accent.
- Radix primitives.
- Live Remotion reels as the hero object.
- An editor with real undo and autosave.
- A strong onboarding hero.

Three things keep it from Linear, Raycast or Screen Studio level:

1. **A few surfaces are broken.**
   - Hook Lab card text bleeds through the action buttons at every size.
   - In the "New video" menu, the rows overlap each other.
   - In ⌘K, pressing Enter sends the query to a paid agent instead of navigating.
   - Arrow, Space and Backspace shortcuts fire through open popovers and dialogs.
   - Five delete actions have neither a confirmation nor an undo.
2. **The design system has drifted.**
   - The radius scale is inverted: `rounded-2xl` is smaller than `rounded-xl`.
   - Page titles start at three different x positions and use three different title styles.
   - The UI uses about 20 font sizes.
   - Lime is used for statuses as well as the primary action.
   - The secondary text color `fg-3` fails WCAG AA on raised surfaces.
3. **The motion and feedback lack finish.**
   - Nothing has an exit animation.
   - First paint is slow (about 1.2–2 s), and the skeletons don't match the layout they stand in for.
   - The activity dock covers controls and doesn't say what it is rendering.
   - Below about 1000 px wide, the app has no responsive behaviour.

---

## 1. Top 15 fixes, ranked by impact

| # | Pri | Fix | Where |
|---|---|---|---|
| 1 | P0 | **Hook Lab card overflow and back-card bleed.** Add `overflow-hidden`. Render the text body only on the top card. Clamp the angle to 3 lines, cap beats at 4 with 2 lines each, and truncate the caption. Make the deck height fluid: `h-[clamp(460px,calc(100dvh-300px),640px)]`, with the reel column at `h-full aspect-[9/16]`. | `src/app/(app)/ideas/page.tsx` (`Deck`, `IdeaCard`) |
| 2 | P0 | **⌘K: Enter runs "Ask Claude: <query>" instead of the match.** Typing "studio" then Enter starts an agent run. Move the Agent group last so the first real match is selected, and bind Ask to ⌘↵ with a visible hint. | `src/components/shell/command.tsx` |
| 3 | P0 | **Keyboard shortcuts fire through overlays.** Hook Lab ←/→/↑ make, pass or start an agent while focus is in the Formats popover, the count `<select>`, the engine radio group or the Run sheet. In the editor, Space and Backspace hit the selected scene behind menus and dialogs. Add one shared guard (§2.7). | `ideas/page.tsx` (Deck `useEffect`), `src/app/edit/[projectId]/[videoId]/page.tsx` |
| 4 | P0 | **The "New video" menu rows overlap.** Two-line items sit inside a fixed `h-8` row, so each subtitle collides with the next title. Change to `min-h-8 py-1.5` and add a `description` slot, or better, use a visual format picker. | `src/components/ui/overlay.tsx` (`MenuItem`), `studio/page.tsx` |
| 5 | P0 | **Destructive actions have no confirm or undo.** Affected: Studio card Delete, editor Delete video, Calendar post Delete, Product media Delete, Hook Lab Clear passed. Soft-delete them with a 6 s "Undo" toast. Fix the delete-product copy. | Studio, editor, Calendar, Product, Hook Lab |
| 6 | P0 | **Narrow windows break everything.** Make the sidebar an icon rail below 1180 px, and a top bar plus sheet below 768 px. Below 1100 px the editor gets an inspector drawer, and below 900 px a min-width notice. Use fluid display type (§2.8). | `shell/sidebar.tsx`, `(app)/layout.tsx`, the editor page |
| 7 | P1 | **The activity dock covers controls.** It hides Agents "Open FRAMEWORK.md", the Settings Autopilot hint and the editor timeline, and it never names the video being rendered. Collapse it to a pill that expands on hover, add the title and thumbnail, make it clickable, and drop the duplicate toasts. | `src/components/shell/activity.tsx` |
| 8 | P1 | **Fix the radius scale.** `rounded-xl` = 24 px but `rounded-2xl` = 16 px and `rounded-3xl` = 24 px (measured). Define the full scale; make cards 16 px and controls 8 px, and keep nested radii concentric. | `src/app/globals.css` `@theme` |
| 9 | P1 | **Use one page frame and one title voice.** At 1920 wide, titles start at x = 368, 448 or 558 depending on the page. Titles come in 64 px serif, 24 px Geist and 20 px Geist. Use one `Page` width, one `PageHeader` (serif 40 px), and underline section tabs. | `src/components/page.tsx`, all pages |
| 10 | P1 | **Give the editor preview more room.** The preview is 275 px wide at 1440×900 and 200 px at 1280×800, and the timecode wraps at 1280. Make the AI chips a popover, make the timeline resizable (default 176 px), and narrow the side panels below 1440. Show the timecode as `0:07.7`; `0:07.23` is seconds plus frames and reads as 7.23 s, against a 7.8 s badge. | editor page, `editor/preview.tsx`, `remotion/timeline.ts` |
| 11 | P1 | **Make first paint fast.** `/api/bootstrap` takes 1.15 s and gates a request waterfall. Settings renders `null` for about 2 s, and the editor is a lone spinner for about 2 s. Cache agent detection, seed SWR from localStorage, fetch in parallel, and use layout-true skeletons. | `api/bootstrap`, `lib/client/store`, pages |
| 12 | P1 | **Fix contrast.** `fg-3` (#777873) is 4.45:1 on bg and 3.93:1 on raised, and it is the 11 px metadata color everywhere. Change it to `oklch(0.64 0.008 120)`. Disabled lime buttons render olive; give the primary variant a neutral disabled state. | `globals.css`, `ui/button.tsx` |
| 13 | P1 | **Add exit animations and correct origins.** No `data-[state=closed]` animation exists anywhere. Menus scale from their center, right-hand sheets rise from the bottom, ⌘K unmounts instantly, and motion/react ignores reduced motion. | `ui/overlay.tsx`, `ui/button.tsx` (`Tip`), `shell/activity.tsx`, `calendar/page.tsx`, `command.tsx` |
| 14 | P1 | **Fix broken deep links.** Home "Log views" goes to `/calendar?tab=results`, and the Hook Lab "memory.md" link goes to `/product?tab=memory`. Both open the default tab (verified). Initialize tab state from `useSearchParams` and keep the URL in sync. | `calendar/page.tsx`, `product/page.tsx`, `library/page.tsx` |
| 15 | P1 | **Stop competing primaries and surprise agent runs.** Keep one lime action per view. Suggestion chips should fill the input, not run: affected are the Agents quick prompts, the editor AI suggestions, the Inspector "Ask your agent" chips, and the format-dialog hooks that create a video on click. | Agents, editor `ai-bar.tsx`, `inspector.tsx`, `library/page.tsx`, `product/page.tsx` |

---

## 2. System-level findings

### 2.1 Radius tokens: the scale is inverted (P1)

`globals.css` overrides only `--radius-sm|md|lg|xl`. Tailwind's defaults survive for 2xl and 3xl. Measured in the page:

| class | `rounded` | `-sm` | `-md` | `-lg` | `-xl` | `-2xl` | `-3xl` |
|---|---|---|---|---|---|---|---|
| px | 4 | 6 | 10 | 16 | **24** | **16** | 24 |

Effects:
- Most cards (46 uses of `rounded-xl`) are 24 px, which reads bubbly on dense UI.
- The Agents cards, the Hook Lab card and the Welcome form card are `rounded-2xl`, which is 16 px.
- The Welcome brief card is `rounded-3xl`, which is 24 px.
- The 48 px empty-state icon tile at 24 px radius becomes a circle.
- The Segmented inner pill is 5 px inside a 10 px container with 2 px padding. It should be 8 px.
- The dialog is 24 px, and the reel inside it is also 24 px.

Fix:

```css
@theme {
  --radius-xs: 4px;   /* kbd, tiny chips */
  --radius-sm: 6px;   /* badges */
  --radius-md: 8px;   /* buttons, inputs, menu items, segmented outer */
  --radius-lg: 12px;  /* menus, popovers, tooltips, list containers */
  --radius-xl: 16px;  /* cards, panels, calendar grid, dock */
  --radius-2xl: 20px; /* dialogs, sheets, ⌘K */
  --radius-3xl: 28px; /* hero surfaces only */
}
```

- Add `--radius-reel: 14px`. The editor preview already uses 14 px, so use it for every `Reel`.
- Keep radii concentric: inner radius = outer radius − padding. The Segmented inner pill becomes `rounded-[6px]`.

### 2.2 Type: one title voice, fewer sizes (P1)

- **Too many sizes.** Font sizes in use: 10, 11, 11.5, 12, 12.5, 13, 14, 15, 17, 20, 24, 26, 30, 42, 44, 48 and 64 px (`text-[13px]` alone ×123).
  - Collapse to 11 / 12 / 13 / 15 / 20 / 28, with display sizes 40 / 64.
  - Delete 11.5, 12.5 and 17.
  - Define them as `--text-*` tokens.
- **Page titles disagree.**
  - Home and Welcome use 64 px Instrument Serif.
  - Every `PageHeader` uses 24 px Geist semibold.
  - Hook Lab uses 20 px Geist.
- **Proposed title style.** Make every page title Instrument Serif: `font-display text-[40px] leading-none tracking-[-0.01em]`.
  - Keep Geist for UI and section labels.
  - Subtitles: `text-[15px] text-fg-2 max-w-[60ch]`. Today they are `text-sm text-fg-3`, which is the hardest color to read.
- **Fluid display headings.**
  - Home h1 at 1280 leaves "today." orphaned on line 3 [shot: ui-home-1280-loaded.png].
  - At 390 px the heading is clipped: "Evenin…" [shot: ui-home-390.png].
  - Use `text-[clamp(40px,4.6vw,64px)] [text-wrap:balance]`. No `text-balance` or `text-pretty` exists anywhere today.

### 2.3 Color: contrast, elevation and accent discipline (P1)

Contrast ratios, measured:

| token | on bg #0a0a09 | on panel #11110f | on raised #191a17 | on hover #21221e |
|---|---|---|---|---|
| fg-3 #777873 (now) | 4.45 | 4.25 | **3.93** | **3.60** |
| `oklch(0.64 0.008 120)` #8b8d88 (proposed) | 5.91 | 5.64 | 5.21 | 4.77 |

- **Contrast fix.** Set `--color-fg-3: oklch(0.64 0.008 120)`. That passes AA for the 11–12 px metadata on every surface.
- **Elevation.**
  - Panel (#11110f) on bg (#0a0a09) is nearly invisible. Cards read only through their 1.32:1 border.
  - Lift the surfaces: `--color-panel: oklch(0.185 …)`, `--color-raised: oklch(0.225 …)`.
  - Add `shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]` to cards for a top highlight.
  - Re-check fg-3 on raised after the lift.
- **Accent overuse.** Lime is meant for the primary action, selection and progress. It is also on:
  - every score ring of 75 or more (nearly all of them);
  - all 5 hook-strength bars on all 204 hooks;
  - the 7 launch-check ticks;
  - 14 day-toggle letters;
  - the "Rising" badges;
  - the default agent card border.

  Fixes:
  - Score rings: lime only at 90 or more, `fg-2` for 75–89.
  - Strength bars: `bg-fg-2`.
  - Launch checks: `bg-ok/90`.
  - Day toggles when on: `bg-fg/10 text-fg ring-1 ring-line-strong`.
- **Disabled primary looks olive.**
  - Lime at 30–45% opacity reads as a muddy olive. It uses `opacity-45` on the `Button` primary (Welcome "Read my product", Settings "Connect accounts", Memory "Save memory") and `opacity-30` on the Agents and AI-bar send buttons.
  - In `button.tsx`, give the primary variant `disabled:bg-hover disabled:text-fg-3 disabled:opacity-100`. Apply the same to the two custom send buttons.
- **Grain over video.**
  - `.grain::after` is `position: fixed; z-index: 100`, so the 3.5% noise sits on top of the editor preview and every reel. That tints the actual video.
  - Scope the grain to the chrome: put the class on `aside` and the page background, with `main` at `relative z-[1]`, or hide it in the editor.

### 2.4 Layout frame and page headers (P1)

Measured h1 left edge at 1920 px:

| Page | x | Cause |
|---|---|---|
| Home, Studio, Product, Agents | **448** | `max-w-[1320px]`, centered |
| Calendar, Library | **368** | `max-w-[1480px]` |
| Settings | **558** | `max-w-[1100px]` |
| Hook Lab | 264 | full-bleed |

So the title jumps sideways on every navigation.

- **One frame.** Use a single `Page` (for example `mx-auto max-w-[1360px] px-8`) for every page. Let a narrow form (Settings) sit left-aligned inside it.
- **One header.** The `PageHeader` holds:
  - an eyebrow (optional);
  - a serif title;
  - a subtitle;
  - **one** primary action on the right;
  - an optional underline `PageTabs` row under the header for sections (Product: Brief, Media, Memory, Growth; Library: Formats, Hooks, Sounds, Playbook; Calendar: Week, Queue, Results).
- **What the header looks like today.**
  - Product wraps its tabs below the subtitle [shot: ui-product-1440.png].
  - Library stacks two identical Segmented rows, one for tabs and one for filters, so the hierarchy is unreadable [shot: ui-library-1440.png].
  - Hook Lab has a bordered `py-4` header, unlike every other page.
- **Section rhythm.** Home uses `mt-16` and then `mt-14`. Standardize section gaps at 48 or 64 and card padding at `p-5`. Library sounds mix `p-4` and `p-5`.
- **Control heights.**
  - Paired controls don't match:
    - Settings `SecretField`: input `h-9` beside button `h-8` [shot: ui-settings-1440.png].
    - Product Media import: input `h-8` beside button `h-7` [shot: ui-product-media.png].
    - Hooks search: `h-8` beside the 30 px Segmented `sm`.
  - Rule: 32 px for compact/editor rows, 36 px for forms, and paired controls always share a height.

### 2.5 Motion (P1)

**Missing.**
- **No exit animations.** Dialogs, menus, popovers, tooltips and ⌘K all vanish on close, but they rise on open. Add:
  ```css
  @keyframes fade-out { to { opacity: 0 } }
  @keyframes sink { to { opacity: 0; transform: translateY(4px) scale(.98) } }
  @keyframes slide-in-right { from { opacity: 0; transform: translateX(24px) } }
  @keyframes slide-out-right { to { opacity: 0; transform: translateX(24px) } }
  ```
  - Overlay: `data-[state=closed]:animate-[fade-out_120ms_ease-in_forwards]`
  - Dialog content: `data-[state=closed]:animate-[sink_120ms_var(--ease-in)_forwards]`
- **Transform origin.** Menus and popovers scale from their center. Add `origin-[var(--radix-dropdown-menu-content-transform-origin)]`, and the popover and tooltip equivalents.
- **Sheets.** The Run sheet and Post sheet use `rise`, so they come up from the bottom while docked right. Use `slide-in-right` (240 ms, `--ease-out`) and `slide-out-right` (160 ms).
- **Reduced motion.** motion/react animations ignore `prefers-reduced-motion`; the CSS block only covers CSS animations. Wrap the three layouts in `<MotionConfig reducedMotion="user">`.
- **⌘K.** It's a custom `div`, so it has no exit animation, no focus trap and no focus return (focus lands on `BODY`). Use `Command.Dialog`.

**Jank.**
- **Hook Lab "Generate"** renders lime while loading, then flips to secondary once ideas arrive [shot: ui-ideas-1440.png → ui-ideas-1440-loaded.png]. Derive the variant only after `ideas !== undefined`.
- **Studio card "…" trigger** disappears while its own menu is open [shot: ui-studio-menu.png]. Add `has-[[data-state=open]]:opacity-100 group-focus-within:opacity-100`.
- **Page transitions.** `AnimatePresence mode="wait"` adds an 80 ms blank frame to every navigation. Use a 150 ms crossfade (`mode="popLayout"`) or enter-only.
- **Editor scene select** seeks to `from + enterFrames + 1`, so the Hook text shows mid-pop at about 30% opacity [shot: ui-editor-scene-selected.png]. Seek to `from + enterFrames + min(0.6 s, half the scene)`.
- **Nav indicator.** It springs between nav items but disappears abruptly on Settings, which has no `layoutId` bar. Give Settings the same bar.

### 2.6 Loading and perceived speed (P1)

Measured on a cold load of Home:
- `/api/bootstrap` takes **1148 ms**.
- `/api/projects/shipreel`, `/posts`, `/videos` and `/ideas` start only at **1346 ms**: a request waterfall.
- The sidebar shows "checking" for both workers in the meantime.

Measured on the editor: the doc arrives at about 850 ms, and the editor becomes interactive at about **2.0 s**.

- **Home** shows a two-bar skeleton, then the hero, card stack, checklist and 6-up grid jump in [shot: ui-home-1280.png].
- **Settings** renders `null` for about 2 s (`if (!s || !secrets) return null`) [shot: ui-toast.png].
- **Hook Lab** shows a lone spinner while the queue rail says "Nothing here yet." with counts of 0 [shot: ui-ideas-1440.png].
- **The editor** is a centered spinner.

Fixes:
1. Make bootstrap return the cached `agents` status immediately (re-probe in the background, then push over SSE).
2. Persist the last bootstrap in localStorage and pass it as SWR `fallbackData`, so the shell paints at 0 ms.
3. Fetch project, posts, videos and ideas in parallel, keyed by the stored `activeProjectId`.
4. Make skeletons mirror the layout: the hero lines, three tilted 9:16 ghost cards, and checklist rows. On the editor, show the three panel outlines with a 9:16 poster image taken from the render.
5. Call `router.prefetch('/edit/…')` on hover of a Studio card. Use `content-visibility:auto` on the scene thumbnails.

### 2.7 Interaction hygiene (P0 and P2)

- **P0: one keyboard guard for the whole app.** The Hook Lab handler only skips `INPUT` and `TEXTAREA` and contenteditable elements. It still fires on a focused `<select>`, popover buttons, radio groups, and inside the Run sheet. It also ignores `e.repeat`, so holding → makes many videos, and it ignores modifiers. The editor skips `SELECT` but still fires behind menus and dialogs. Use one shared guard:
  ```ts
  export function shouldIgnoreHotkey(e: KeyboardEvent) {
    if (e.defaultPrevented || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return true;
    const el = e.target as HTMLElement;
    return !!el.closest("input,textarea,select,[contenteditable=true],[role=dialog],[role=menu],[role=listbox],[role=radiogroup],[data-radix-popper-content-wrapper]")
      || !!document.querySelector("[role=dialog][data-state=open],[role=menu][data-state=open]");
  }
  ```
- **P2: cursor.** Tailwind v4 preflight gives buttons `cursor: default` (measured), while links get `pointer`. So Studio cards (links) show a pointer and Library format cards (buttons) show an arrow. Pick one. For a web app, add `@layer base { button:not(:disabled), [role=button], summary { cursor: pointer } }`.
- **P2: nested interactive elements.** About 10 places use `<Link><Button/></Link>`: Home "Open Studio", "Browse formats", empty-state CTAs, the Run sheet CTAs. That is invalid HTML and creates two tab stops. Export a `buttonClass({ variant, size })` helper and style the `Link` itself.
- **P2: focus.**
  - The lime `outline-offset: 2px` ring collides with neighbouring rows in dense lists [shot: ui-focus-ring.png]. Use `outline-offset:-2px` inside nav and lists.
  - The Schedule dialog auto-focuses the Close button, so it opens with a lime ring on ✕ [shot: ui-schedule-dialog.png]. Set `onOpenAutoFocus` to focus the first field.
  - The Segmented control has `role=radiogroup` but no arrow-key roving, and every option is a separate tab stop.
  - Editor scene rows and timeline blocks are `div`s with click handlers, so they can't be reached by keyboard.
- **P2: names and titles.**
  - Library format-card buttons announce the entire video text as their accessible name. The Wall-of-text card reads a full paragraph. Add `aria-label="Preview <format>"` and set `aria-hidden` on the reel.
  - Every tab is titled "Shipreel". Add route `layout.tsx` files with metadata, and set `title: { template: "%s · Shipreel" }` in the root layout.
- **P1: favicon.** `/favicon.ico` returns 404 on every page, so the tab shows a globe. Add `src/app/icon.svg` (the existing `Logo` mark) and `apple-icon.png`.

### 2.8 Responsive (P0 below 1000 px, P1 at 1280)

- **390×844.** The 232 px sidebar leaves 158 px for content. Headings and CTAs are clipped and the dock covers the sidebar [shot: ui-home-390.png]. The editor collapses into overlapping panels with no preview [shot: ui-editor-390.png].
- **1280×800.**
  - Hook Lab is badly broken: the card text runs through the buttons and the hints [shot: ui-ideas-1280.png].
  - The editor preview is 200 px wide, the AI chips wrap to two rows, and the timecode wraps [shot: ui-editor-1280.png].
- **1920×1080.**
  - The Hook Lab deck stays at a fixed 760×560 in a huge canvas, and its text still bleeds [shot: ui-ideas-1920.png].
  - The editor left panel is half empty [shot: ui-editor-1920.png].

Plan:

| Width | Behaviour |
|---|---|
| < 1180 | Sidebar becomes `w-14` icons with `Tip side="right"`. The project switcher shows only its icon. Workers becomes two dots. |
| < 1024 | Hook Lab queue rail becomes a "Queue · 12" sheet button. Home hero is one column. |
| < 1100 | Editor inspector becomes a right drawer, toggled with ⌘I. |
| < 900 | Editor shows "Shipreel's editor needs a wider window", with the preview and Post only. |
| < 768 | Top bar (logo, project, ⌘K) plus a bottom tab bar (Home, Hook Lab, Studio, Calendar, More). |

Welcome is already fine at 390 [shot: ui-welcome-390.png]. The one problem is that "Skip to the app" wraps; add `whitespace-nowrap`.

---

## 3. Page by page

### 3.1 Shell: sidebar, ⌘K, dock, toasts

**Sidebar** (`src/components/shell/sidebar.tsx`)
- **P2. Settings active state.** It uses `bg-hover` without the lime `nav-bar` indicator that the other nav items have. Use the same indicator.
- **P2. Project switcher menu.** It is 176 px wide while its trigger is 210 px, and it covers the search row [shot: ui-project-switcher.png].
  - Use `w-[var(--radix-dropdown-menu-trigger-width)]` and `align="start"` with `sideOffset={4}`.
  - Show each project's category as a second line, and ⌘1 / ⌘2.
- **P2. Unused shortcuts.** `NAV[].key` (H, I, S, C, L, P, A) is defined but never wired up or shown. Implement `G` then a key as chords, show them in ⌘K rows, and show them in nav tooltips.
- **P2. Workers card.** It uses 90 px of permanent space for status. Collapse it to one row ("● Claude · ● Codex") and expand it only when something is not ready.

**⌘K** (`src/components/shell/command.tsx`) [shot: ui-cmdk.png, ui-cmdk-query.png, ui-cmdk-studio.png]
- **P0. Enter asks the agent.** The `forceMount` "Ask Claude" item is always first and pre-selected, so Enter asks Claude instead of navigating. Fix:
  - Render the Agent group last.
  - Bind ask to ⌘↵ on the input with `onKeyDown={(e)=>{ if(e.key==="Enter"&&e.metaKey){e.preventDefault(); ask();} }}`.
  - Show `<kbd>⌘↵</kbd> Ask Claude` on the right of the input whenever the query is non-empty.
  - Change the empty copy to "No matches. ⌘↵ asks Claude."
- **P2. Raycast-level finish.**
  - Add a footer: `↑↓ navigate · ↵ open · ⌘↵ ask · esc`.
  - Highlight matched characters (`[cmdk-item] mark { color: var(--color-fg) }`).
  - Add a "Videos" group with 28 px 9:16 thumbnails and titles, and "Recent".
  - Add a bottom fade mask on the 56vh list (`[mask-image:linear-gradient(to_bottom,black_90%,transparent)]`).
  - Use 36 px rows (h-9) instead of 40.

**Activity dock** (`src/components/shell/activity.tsx`)
- **P1. Covers content.** `fixed right-5 bottom-5 w-[340px] z-[80]` sits over real controls:
  - Agents "Open FRAMEWORK.md" [shot: ui-agents-1440.png]
  - the Settings Autopilot hint [shot: ui-settings-1440.png]
  - the Home stats [shot: ui-home-1280-loaded.png]
  - the editor timeline [shot: ui-editor-1440.png]
- **P1. Says nothing.** It shows "Rendering 62%" with no title, it is not clickable, and it reads "Rendering 100%" before it switches to "Render finished".
- **P1. Duplicates.** In the editor, a render shows both the dock card and a toast.
- **Fixes:**
  - Default to a 32 px pill ("◐ Rendering · 62%") that expands to the card on hover or focus.
  - Each card shows a 24×43 reel thumbnail, the video title and an ETA, and clicking it opens the video.
  - In the editor, mount the dock inside the timeline header instead of floating.
  - Suppress the toast when the dock or the button already shows completion.

**Toasts** (`(app)/layout.tsx`, `edit/layout.tsx`, `welcome/page.tsx`) [shot: ui-toast.png]
- **P2. Default Sonner styling.** The check icon is white, the style is unbranded, and toasts appear top-center while the dock is bottom-right.
  - Use `position="bottom-center" offset={24}`.
  - Add `classNames: { toast: "!rounded-xl !bg-raised/95 !backdrop-blur !border-line !shadow-2xl !text-[13px]", description: "!text-fg-3", actionButton: "!bg-accent !text-accent-ink !rounded-md" }`.
  - Pass tinted `icons` (`success` in `text-ok`, `error` in `text-bad`).
- **P2. Unverified "connected" toast.** `/settings?connected=1` fires "Accounts connected" without verifying anything, and it fires again on refresh. Verify through the profiles fetch, then `router.replace('/settings')`.

### 3.2 Home (`src/app/(app)/page.tsx`)

[shot: ui-home-1440.png, ui-home-1440-scrolled.png, ui-home-1280-loaded.png, ui-home-1920.png, ui-home-upnext-hover.png]

- **P1. The Up Next stack is misaligned.**
  - The cards hug the top of the page: the active card is about 14 px from the edge.
  - The "Up next · Ready to schedule" label floats about 85 px below them, because the container is `h-[430px]` while the cards end at about 370 px.
  - With `items-center`, the left column centers against a taller right column.
  - Fix: container `h-[380px]`, label `mt-1`, grid `items-start lg:pt-4`.
  - Copy: show "Latest · ready to post" when nothing is scheduled. "Up next" is only true when posts are queued.
- **P1. CTA copy.** "Make today's video" just navigates to the Hook Lab. Rename it "Pick today's video →", or make it actually build the top idea.
- **P2. The "Today" checklist.** "Results are up to date" is struck through like a finished task. Render passive statuses as a muted line with no checkbox. Done rows: `text-fg-3`, no strikethrough, with a check-draw animation when completed.
- **P2. The week strip.**
  - Dots are `bg-hover` and essentially invisible.
  - "0-day streak" with a grey flame is negative framing. At 0, show "Start a streak today"; at n, show "n-day streak".
  - Past days are not dimmed. Use `opacity-50` for days before today that have no posts.
- **P2. Recent videos.**
  - Six skeletons collapse to two cards (layout shift).
  - Thumbnails use frame 1.3 s, which is often an almost empty dark frame. Add a cover frame (§3.12).
  - Titles truncate to one line. Use `line-clamp-2`.

### 3.3 Hook Lab (`src/app/(app)/ideas/page.tsx`)

[shot: ui-ideas-1440.png, ui-ideas-1440-loaded.png, ui-ideas-1280.png, ui-ideas-1920.png, ui-ideas-formats-popover.png]

- **P0. The card overflows and back cards bleed.** Measured at 1440×900:
  - The top card's content ends 1 px above its bottom edge, so the caption row is clipped.
  - The back card overflows by **23 px**, and its text renders under the top card and over the Pass button (content bottom 747 vs button top 738).
  - At 1280×800 the text runs through all three buttons and the key hints.
  - Fix:
    - Card `overflow-hidden`.
    - For `depth > 0`, render only the shell (reel thumbnail plus an empty column, `aria-hidden`).
    - Clamps: angle `line-clamp-3`, beats `slice(0,4)` each `line-clamp-2`, caption `truncate`.
    - Deck `h-[clamp(460px,calc(100dvh-300px),640px)] max-w-[min(860px,100%)]`, reel column `h-full aspect-[9/16] w-auto shrink-0`.
- **P0. Keyboard shortcuts fire too eagerly** (§2.7). Also show the MAKE IT / PASS stamps on key presses: animate x to ±120 for 120 ms before the exit, so keyboard users get the same feedback as people who drag.
- **P1. Loading state.** The page is a lone spinner while the rail says "Nothing here yet." with zero counts, and the Generate button flips from primary to secondary once data loads. Use a ghost deck plus skeleton rows, and fix the button variant.
- **P2. Queue rail.**
  - The current row and the hover state are both `bg-panel`, so they are indistinguishable. Make the current row `bg-raised` with a 2 px lime left bar.
  - The ScoreRing at 30 px shows "100" at about 9 px. Hide the number below 34 px and keep it in the tooltip.
  - Add tab counts with a skeleton while loading.
- **P2. Formats popover.**
  - Arrow keys on its chips currently trigger make or pass. The P0 guard fixes that.
  - Add a "Hot only" quick toggle.

### 3.4 Studio (`src/app/(app)/studio/page.tsx`)

[shot: ui-studio-1440.png, ui-studio-hover.png, ui-studio-menu.png, ui-studio-new-menu.png, ui-studio-empty-filter.png]

- **P0. "New video" menu rows overlap.** The `MenuItem` is `h-8` but each row has two lines, so subtitles overprint the next row.
  - Quick fix: `min-h-8 py-1.5 items-start` with the icon at `mt-0.5`.
  - Proper fix: a 2-column format picker popover (36×64 live thumbnails plus name, length, "Hot" dot). Put "Clone a viral video…" and a search field on top.
- **P0. Delete removes the video instantly** with a toast that has no Undo.
- **P1. The "…" button is mouse-only.** It is `opacity-0` and revealed only on hover, so it is invisible to keyboard and touch users, and it vanishes while its own menu is open (§2.5).
- **P1. Meta row wraps badly.** A trailing "·" is left hanging ("Rendered Hook + demo · 8s ·" then "16 minutes ago" on its own line). Use `flex flex-wrap gap-x-1.5` with separators drawn as `before:content-['·']` on every item except the first, or put the time on its own line.
- **P2. Copy.** The subtitle "Every video is a JSON spec you (or Claude/Codex) can edit…" is internal jargon. Use "Hover to preview, click to edit. Your agent can edit these too."
- **P2. Filters.** Add counts (Drafts 0, Rendered 2, Scheduled 0) so users can't filter into a dead end. The empty filter state needs an action: "Show all", or for Scheduled, "Schedule one →".
- **P2. Cards.** `rounded-xl` makes them 24 px; use `--radius-reel`. Add `active:scale-[.99]` for a pressed state. Overlay the duration in a corner, like TikTok's grid.

### 3.5 Calendar (`src/app/(app)/calendar/page.tsx`)

[shot: ui-calendar-1440.png, ui-calendar-slot-hover.png, ui-calendar-queue.png, ui-calendar-results.png]

- **P1. Tabs ignore `?tab=`.** `/calendar?tab=results` opens Week (verified). Initialize from `useSearchParams` and `router.replace` on change, inside Suspense.
- **P1. Two identical CTAs.** The Queue empty state repeats the lime header CTA "Schedule a video". Make the empty-state CTA secondary, or show the next three open slots as ghost rows with a "Fill" button (signature moment 4).
- **P0. Post sheet Delete** has no confirmation or undo.
- **P1. Post sheet animation.** It is a right-hand sheet that rises from the bottom; use slide-in-right.
- **P2. Week grid.**
  - Past days look the same as future days. Use `bg-[repeating-linear-gradient(...)]` hatching at 40% opacity.
  - Today is a faint olive `bg-accent-soft/40`. Use a 2 px lime top border on the column instead.
  - The empty week has no CTA. Add "6 open slots this week · Fill with your latest videos".
- **P2. Links.** "Open slots come from Settings → Posting times" is plain text; link it to `/settings#schedule`.
- **P2. Results table.** `grid-cols-[1fr_repeat(5,64px)_150px]` overflows below about 900 px. Hide Likes and Shares below `lg`.

### 3.6 Viral Library (`src/app/(app)/library/page.tsx`)

[shot: ui-library-1440.png, ui-library-hover.png, ui-library-format-dialog.png, ui-library-hooks.png, ui-library-hooks-hover.png, ui-library-sounds.png, ui-library-playbook.png]

- **P1. Unclear hierarchy.** The top-level tabs and the per-tab filters are both Segmented controls, stacked. Make the tabs an underline `PageTabs` row and keep Segmented for filters.
- **P1. Hooks in the format dialog create a video on click.** "Hooks that fit" items create a video immediately, with only an arrow shown on hover. Make each row show a "Use this hook" button, or fill a "Make one" CTA preview.
- **P2. Hooks tab.**
  - The `capitalize` class produces "Build In Public" and "Time Shock" while the chips say "Build in public". Remove `capitalize`.
  - The strength bars are lime on every row: use `bg-fg-2`.
  - The search box (32 px) and the Segmented (30 px) have different heights.
- **P2. Sounds tab.**
  - Meta rows wrap with a leading "·", which is the same separator bug as Studio.
  - The "Open sound ↗" link floats at different heights from card to card.
  - There is no audio preview. Turn the music tile into a play/pause button for the preview, which is a big delight win.
- **P2. Playbook.**
  - Step 09 breaks the `->` ligature across lines ("both low -" / "> new format"). Replace `->` with "→" in the data.
  - It reads like raw research notes. Bold the lead word of each step ("Research:", "Brief:"), add a vertical stepper line, and collapse the source details behind "Sources".
- **P2. Cards.** `rounded-xl` makes them 24 px, and the accessible name is the full video text (§2.7).

### 3.7 Product (`src/app/(app)/product/page.tsx`)

[shot: ui-product-1440.png, ui-product-brief-scrolled.png, ui-product-brief-bottom.png, ui-product-media.png, ui-product-memory.png, ui-product-growth.png]

- **P1. Competing primaries.** The header "Re-read product" is lime on every tab, so Growth shows two limes and Memory shows a lime next to an olive disabled lime. Make Re-read a secondary button or a menu item. The primary should belong to the tab: "Save brief", "Open an attribution branch".
- **P1. Fields truncate and clip.** Category, persona description, all three feature columns and the code path are single-line inputs that truncate. Pains, Outcomes, Competitors, Keywords and Notes are textareas that clip mid-line. Fix:
  - `@layer base { textarea { field-sizing: content; } }` with `min-h-20 max-h-80`.
  - Features become `Textarea rows={1}` that grow.
- **P1. Unsaved edits are lost silently.** Brief edits are discarded when you navigate away. Add a `beforeunload` handler and an in-app route guard ("Save changes to the brief?"), or autosave like the editor does.
- **P1. Deep link and copy.** `?tab=memory` is ignored, so the Hook Lab "memory.md" link is broken. Separately, the delete dialog copy "Type nothing, click once. There's no undo." should read "This can't be undone."
- **P2.**
  - The Proof placeholder ("1,240 users in 3 weeks") looks like real data; prefix it with "e.g.".
  - The empty App icon state is text-only. Show a dashed 48 px tile with "+".
  - The floating save bar uses `style={{ marginLeft: 120 }}` to clear the sidebar. Center it in `main` instead (`sticky bottom-6` inside the page).
  - Memory is a raw monospace textarea. Render sections as cards (Winning hooks, Dead hooks, What converted, Notes) with inline edit and empty-section hints.

### 3.8 Agents (`src/app/(app)/agents/page.tsx`) [shot: ui-agents-1440.png]

- **P1. Quick prompts start runs immediately.** Clicking one of the 5 chips starts a run. Fill the composer, focus it, and select the text.
- **P2. Composer.** The send button is olive when disabled; use a neutral disabled state.
- **P2. Agent cards.** `rounded-2xl` makes them 16 px while every other card is 24 px. The default card's `border-accent/40` adds yet another lime element; the "Default" badge already says it.
- **P2. Run list.** Rows truncate titles; give them `title` tooltips. Group the list by day.

**Run sheet** (`shell/activity.tsx`, `agents/console.tsx`) [shot: ui-run-sheet.png, ui-run-sheet-top.png]
- **P1. Raw JSON overflows sideways.** Raw JSON "text" events overflow horizontally (scrollWidth 591 vs clientWidth 558), so lines are clipped at the right edge.
  - Add `min-w-0 [overflow-wrap:anywhere]` to text events.
  - Detect JSON payloads and collapse them into `<details><summary>JSON · 4 KB</summary><pre class="max-h-64 overflow-auto">…</pre></details>`.
- **P2. Tool rows are noisy.**
  - File paths break mid-token (`break-all`). Middle-truncate them (`~/…/clones/cmvaajveq/f00.jpg`).
  - Fold consecutive identical tools into one row ("Read × 13 frames").
- **P2. Status badge.** "done" is lowercase; use "Done", "Running" and "Failed".

### 3.9 Settings (`src/app/(app)/settings/page.tsx`) [shot: ui-settings-1440.png, ui-settings-scrolled.png]

- **P1. Blank while loading.** The page renders `null` for about 2 s. Render the section skeleton.
- **P1. Collapsibles have no affordance.** Bluesky and Webhook are `<details>` elements, but `display:flex` on the summary kills the disclosure marker.
  - Add `ChevronRight` with `group-open:rotate-90 transition-transform`.
  - Add `list-none [&::-webkit-details-marker]:hidden` to the summary.
- **P2. Mismatched heights.** Each input + Save pair is 36 px next to 32 px; make both 36.
- **P2. Enter doesn't save.** Secret fields are not inside a `<form>`, so Enter doesn't submit (Chrome also warns "Password field is not contained in a form").
- **P2. No save feedback.** Autosaved controls (slots, toggles, platforms) give no feedback. Show a 1.2 s "Saved ✓" next to the section title.
- **P2. Lime everywhere.** All 7 day toggles in 2 rows are lime-tinted, and the platform chips are too. Use the neutral "on" style from §2.3.

### 3.10 Welcome (`src/app/welcome/page.tsx`) [shot: ui-welcome-1440.png, ui-welcome-390.png]

This is the most polished page. Fixes:
- **P2.** The disabled "Read my product" is olive. Use a neutral disabled state with a hint: "Pick a folder to continue".
- **P2.** The 4-step progress dashes have no labels. Add a tooltip, or "Step 1 of 4" for screen readers.
- **P2.** "Skip to the app" wraps at 390 px.
- **P2.** The 16 recent-project chips wrap into 4 rows. Sort them by most recent, show 8, and add a "More" item.

### 3.11 Editor (`src/app/edit/[projectId]/[videoId]/page.tsx` and `src/components/editor/*`)

[shot: ui-editor-1440.png, ui-editor-scene-selected.png, ui-editor-playing.png, ui-editor-audio-tab.png, ui-editor-layers-tab.png, ui-editor-media-tab.png, ui-editor-more-menu2.png, ui-editor-timeline-hover.png, ui-editor-tooltip.png, ui-editor-1280.png, ui-editor-1920.png]

**Layout**
- **P1. The preview is starved for space.** The fixed grid is `288 | 1fr | 340` with a 204 px timeline, plus the AI chips (about 34 px) and the transport (48 px). That leaves the 9:16 preview 275 px wide at 1440×900.
  - Columns: `grid-cols-[256px_minmax(0,1fr)_300px] 2xl:grid-cols-[288px_minmax(0,1fr)_340px]`.
  - Timeline: `grid-rows-[52px_minmax(0,1fr)_var(--tl-h,176px)]` with a 6 px drag handle; persist the height in localStorage.
  - Suggestion chips appear only while the AI input is focused and empty, floating above it (absolute, no layout height).
  - Together these buy roughly 70–90 px of preview height.
- **P2. Empty left panel at 1920.** The left panel is half empty. Use the space for a "Media shelf" or "Next steps".

**Transport and preview** (`editor/preview.tsx`)
- **P1. Timecode format.** `formatTimecode` prints seconds.frames (0:07.23) while the top bar says 7.8 s, so it reads as 7.23 s. Show decimal seconds (`0:07.7`), or show frames explicitly (`7s 23f`).
- **P1. Timecode wraps** at 1280 ("0:05.24 /" then "0:07.23"). Add `whitespace-nowrap shrink-0`.
- **P2. Buffering.** In my headless run, playback advanced at about 0.7× real time, probably while SFX audio buffered. Show a buffering spinner overlay through Remotion's `bufferStateDelayInMilliseconds` and `waiting` events, so a stall doesn't look like lag.
- **P2. Overlays collide.** With the TikTok skin and the safe zone both on, "caption + username cover this" overlaps the skin's caption. Hide the label while a skin is on.

**Top bar**
- **P0. Delete is instant.** More → "Delete video" deletes immediately and navigates away [shot: ui-editor-more-menu2.png].
- **P2. Lingering query param.** `?schedule=1` stays in the URL, so a refresh reopens the dialog. Call `router.replace(pathname)` after opening.
- **P2. Badge placement.** The badges (format, aspect, duration) float in the middle of the bar. Group them with the title as a breadcrumb: "Studio / My repo makes… · Hook + demo · 9:16 · 7.8 s".

**Left panel** (`editor/left-panel.tsx`)
- **P2. Keyboard access.** Scene rows are clickable `div`s. Make them `button`s, or add `role=option` with arrow-key navigation, and show "⌫ delete · ⌘D duplicate" hints on hover.
- **P2. Copy.** "Add a screen recording in **Assets**…" should say **Media**, the tab's name.
- **P2. Tight button.** "Record Simulator" barely fits its 2-column grid cell. Stack the two buttons, or use the label "Record".

**Inspector** (`editor/inspector.tsx`, `editor/fields.tsx`)
- **P1. One-click runs.** The "Ask your agent" chips start a run on one click, like the AI-bar suggestions. Fill the AI input instead.
- **P2. Raw caption-style IDs.** The video-level "Default caption style" select shows raw IDs (tiktok-classic, hormozi, outline), but the scene picker shows labelled swatches (Box, Hormozi, MrBeast). Reuse the swatch grid. Also capitalize "video / slideshow" and "center / pop".
- **P2. Launch check.**
  - It shows 7 lime ticks; use `ok` green.
  - It reports 100/100 while the CTA text sits under TikTok's right rail in the TikTok skin [shot: ui-editor-audio-tab.png]. Add a "Text clear of the right rail" check using the `SafeZone` geometry.
- **P2. Number inputs.** `type=number` shows native spinners. Add `[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`.

**Timeline** (`editor/timeline.tsx`)
- **P2. Playhead covers labels.** The playhead head covers the "0s" and "1s" ruler labels. Offset the labels to `left-1.5 top-[3px]`, or draw the head below the label band.
- **P2. Hidden resize handle.** It is an invisible 8 px strip. Show a 2×16 px rounded pill on hover, plus a `cursor-ew-resize` hint tooltip with the live duration ("2.8 s → 3.4 s") while dragging.
- **P2. Music row.** It prints the whole sound tip across the track. Use `max-w-[48ch] truncate` with a tooltip. The waveform is decorative and fake, so label it "planned sound", or render a real waveform when `audio.src` exists.
- **P2. Unexplained dots.** Amber note dots appear on every scene with no explanation. Add a legend in the timeline header ("● agent note") and click-to-show.

### 3.12 Dialogs and shared reel component

- **Format detail** [shot: ui-library-format-dialog.png]
  - **P2.** The reel is nested in a 24 px dialog with a 24 px radius. Use 14 px.
  - **P2.** The preview shows the hook text running under TikTok's rail. That is a template safe-zone issue; flag it to the format owner.
- **Schedule ("Post this video")** [shot: ui-schedule-dialog.png]
  - **P2.** Good structure.
  - **P2.** The footer "Next open slot: Fri Oct 16, 4:30 PM" duplicates the segmented label. Use the footer for a consequence instead ("Renders now, posts Fri 4:30 PM").
  - **P2.** Fix the focus ring that appears on ✕ at open.
- **Clone dialog.** Fine. **P2:** validate the URL inline, showing a platform icon once the URL parses.
- **Reel thumbnails** (`components/reel.tsx`)
  - **P2.** The still frame is a fixed `min(1.3s, dur/2)`, often a dark, almost empty frame [shot: ui-studio-1440.png].
  - **P2.** Support `spec.meta.coverFrame`, settable from a "Set as cover" button in the transport. Default to the first scene's settled frame: `from + enterFrames + 0.8s`.
  - **P2.** Overlay the duration in the bottom-right corner.

---

## 4. Five signature moments

### 1. "Swipe → it's in your Studio" (Hook Lab to sidebar flight)

**Today:** a right swipe produces a toast.

**Make it:**
- Clone the top card's reel into a portal at its `getBoundingClientRect()`.
- Animate it with motion `animate(el, { x, y, scale: 0.08, rotate: 8, opacity: [1, 1, 0.6] }, { duration: 0.55, ease: [0.22, 1, 0.36, 1] })` to the rect of `a[href="/studio"] svg`.
- On arrival, the Studio nav item gets a lime count badge: spring `scale: [0, 1.15, 1]`, `bounce: 0.4`.
- The dock shows "Building · Hook + demo" with a 24×43 ghost reel that crossfades into the real thumbnail when the `videos` server event lands.
- Keyboard → triggers the same flight and briefly reveals the existing "MAKE IT" stamp: animate `x` to 120 over 120 ms, then exit.
- Respect `MotionConfig reducedMotion="user"`; without motion, use a simple scale-out.

**Where:** `ideas/page.tsx` `decide()`. Add a `data-nav-target` attribute in `sidebar.tsx` and a `build` task kind in `activity.tsx`.

### 2. Render as a material (editor top bar)

**Today:** "Rendering 37%" as text in a gray button, plus a dock card, plus a toast.

**Make it:**
- **Progress fill.** The button fills left to right: `style={{ backgroundImage: 'linear-gradient(90deg, var(--color-accent-soft) calc(var(--p)*100%), transparent 0)' }}` with `--p` driven by the progress events. Use a tabular percentage, and a 1 px lime progress line on the bottom edge.
- **Finish.**
  - The button morphs (`layout` animation) into a split "Download MP4 ▾" with a check that draws itself (`pathLength 0→1`, 300 ms).
  - The preview frame gets a one-time diagonal light sweep: a pseudo-element `linear-gradient(115deg, transparent 40%, rgb(255 255 255 / .16) 50%, transparent 60%)` animated with `translateX(-120% → 120%)` over 700 ms, `--ease-out`.
  - Suppress the dock card and the toast for this render; the button is the feedback.
- **Bonus.** Dragging the MP4 chip out to Finder exports the file (`draggable` with `DownloadURL` in `dataTransfer` for Chromium).

### 3. First post plus streak flip (Home and Calendar)

**Today:** "0-day streak" in gray.

**Make it:** when the first post is scheduled (or each day's first post goes out):
- The reel thumbnail flies into the Home week-strip cell or the Calendar slot and lands with a 1.06 → 1 settle.
- A lime dot ripples out of the cell: `box-shadow` from `0 0 0 0` to `0 0 0 10px transparent`, 600 ms.
- The streak becomes an odometer. Each digit is an `AnimatePresence` with `y: '100%' → 0` over 280 ms, staggered by 40 ms. The copy changes from "Start a streak today" to "1-day streak · keep it lit".
- **First ever post only:** a 90-particle burst of tiny 9:16 frames (canvas-confetti with `shapes: ['square']`, `scalar: 0.6`, colors `[#D7FF3A, #fff]`, gravity 1.1, from the CTA's origin).
  - Gate it with `localStorage['shipreel.firstPost']`.
  - Skip it under reduced motion.

### 4. Living empty states (ghost previews instead of icon plus text)

**Today:** every empty state is a 48 px icon circle, a title and a body [shot: ui-calendar-queue.png, ui-calendar-results.png, ui-studio-empty-filter.png].

**Make it:** show what the page will become, in ghost form.
- **Studio:** three auto-playing reels built from the brief (reuse Home's `buildSpec` template stack) with "Make this one" on hover.
- **Queue:** ghost rows for the next three open slots ("Fri 4:30 PM · open"), each with "Fill with latest video".
- **Results:** the "What to fix" quadrant at 30% opacity, with six dots drifting into quadrants on a 6 s loop, captioned "Log views 24 h after posting".
- **Hook Lab "Deck cleared":** three face-down cards that flip on hover, with "Deal 10 more".

**Build:** one `<GhostPreview>` component (`pointer-events-none aria-hidden`, `[mask-image:linear-gradient(black_60%,transparent)]`) so all of these share one look.

### 5. Agent presence: "you can see it think" (editor, Product, Run sheet)

**Today:** panels drop to 60% opacity, with a spinner in the AI bar.

**Make it:**
- **Scanning border.** While an agent edits a surface, draw a scanning conic border on that surface (the preview frame, the brief card):
  ```css
  @property --a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
  .agent-working::before {
    content: ""; position: absolute; inset: -1px; border-radius: inherit; padding: 1px;
    background: conic-gradient(from var(--a), transparent 0 70%, var(--color-accent) 85%, transparent);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude;
    animation: spin-angle 2.4s linear infinite;
  }
  @keyframes spin-angle { to { --a: 360deg } }
  ```
- **Live ticker.** The AI bar shows the tool stream as a single crossfading line (`AnimatePresence`, y 6 → 0, 160 ms).
- **Change flash.**
  - On completion, diff the before and after spec. Changed inspector rows and timeline blocks flash `bg-accent-soft` for 1.2 s via a `data-changed` attribute.
  - The "Undo Claude's edit" chip stays for 10 s.
  - Brief fields rewritten by "Re-read product" reveal word by word (12 ms stagger).

**Bonus: ⌘K.** Bring it to Raycast level: a key-hint footer, match highlighting, a Videos group with live 9:16 thumbnails, ⌘↵ to ask, and `G` + key chords shown on each row. `NAV[].key` already exists.

---

## 5. Appendix

### 5.1 Measurements

- **API timing** (cold load of Home):

  | Request | Duration | Starts at |
  |---|---|---|
  | `/api/bootstrap` | 1148 ms | 168 ms |
  | `/api/agents/runs` | 603 ms | — |
  | project, posts, videos, ideas | 250–305 ms each | 1346 ms (waterfall) |

- **Editor load:** the doc arrives at about 855 ms and the editor is interactive at about 2011 ms.
- **Hook Lab card overflow** at 1440×900:

  | Card | Top | Bottom | Content bottom | Overflow |
  |---|---|---|---|---|
  | Top | 154 | 714 | 713 | −1 px |
  | Back (depth 2) | 208 | 724 | 747 | **+23 px** |

  The Pass button's top is at 738.
- **Run sheet console:** scrollWidth 591 vs clientWidth 558, so it overflows horizontally.
- **Utility class usage** (from grep):
  - Radius: `rounded-md` ×67, `rounded-full` ×47, `rounded-xl` ×46, `rounded` ×39, `rounded-lg` ×31, `rounded-2xl` ×5, `rounded-3xl` ×1.
  - Text size: `text-[13px]` ×123, `text-xs` ×98, `text-[11px]` ×84.
  - No `data-[state=closed]`, no `text-balance` or `text-pretty`, no `MotionConfig`, no `field-sizing`, no `app/icon.*`.
- **Deep links tested:** `/calendar?tab=results` opens Week; `/product?tab=memory` opens Brief.

### 5.2 Screenshot index

All files are in `/Users/reidcoleman/Glide/TradeBot/.playwright-mcp/`.

| File | Shows |
|---|---|
| ui-home-1440.png | Home hero and Up Next stack gap |
| ui-home-1440-scrolled.png | Today, week strip, recent videos |
| ui-home-1280.png | Mismatched loading skeleton |
| ui-home-1280-loaded.png | Orphaned "today.", dock over stats |
| ui-home-1920.png | Wide frame, x = 448 |
| ui-home-390.png | Mobile clipping |
| ui-home-upnext-hover.png | Stack hover |
| ui-ideas-1440.png | Loading spinner, "Nothing here yet", lime Generate |
| ui-ideas-1440-loaded.png | Card overflow and back-card bleed |
| ui-ideas-1280.png | Severe bleed through buttons |
| ui-ideas-1920.png | Bleed persists, fixed deck size |
| ui-ideas-formats-popover.png | Formats popover |
| ui-studio-1440.png | Studio grid, dangling "·", thumbnails |
| ui-studio-hover.png | Studio card hover |
| ui-studio-menu.png | Card menu; trigger vanishes |
| ui-studio-new-menu.png | **Overlapping two-line menu items** |
| ui-studio-empty-filter.png | Studio filter empty state |
| ui-calendar-1440.png | Week grid |
| ui-calendar-slot-hover.png | Slot hover |
| ui-calendar-queue.png | Queue empty state, duplicate CTA |
| ui-calendar-results.png | Results empty state |
| ui-library-1440.png | Formats grid, stacked segmented rows |
| ui-library-hover.png, ui-library-hover-instant.png | Format card hover |
| ui-library-format-dialog.png | Format detail dialog |
| ui-library-hooks.png, ui-library-hooks-hover.png | Hooks tab, "Build In Public" casing |
| ui-library-sounds.png | Leading "·" separators |
| ui-library-playbook.png | "- >" ligature break |
| ui-product-1440.png | Wrapped header and tabs, truncated inputs |
| ui-product-brief-scrolled.png, ui-product-brief-bottom.png | Clipped textareas |
| ui-product-media.png | Mismatched input and button heights |
| ui-product-memory.png | Olive disabled primary |
| ui-product-growth.png | Two lime primaries |
| ui-agents-1440.png | Dock covering the Framework card |
| ui-run-sheet.png, ui-run-sheet-top.png | JSON overflow, mid-token path breaks |
| ui-settings-1440.png, ui-settings-scrolled.png | details without chevron, mismatched heights, lime day toggles, dock overlap |
| ui-toast.png, ui-toast-2.png | Blank Settings with an unverified toast |
| ui-welcome-1440.png, ui-welcome-390.png | Onboarding |
| ui-cmdk.png | ⌘K default |
| ui-cmdk-query.png, ui-cmdk-studio.png | "Ask Claude" pre-selected over the "Studio" match |
| ui-project-switcher.png | Switcher menu narrower than its trigger |
| ui-focus-ring.png | Focus ring collision in the nav |
| ui-editor-1440.png | Editor default; dock over timeline |
| ui-editor-scene-selected.png | Seek to frame 1, half-faded hook |
| ui-editor-playing.png | Playback |
| ui-editor-tooltip.png | Score ring tooltip |
| ui-editor-audio-tab.png | CTA text under TikTok rail at 100/100 |
| ui-editor-layers-tab.png | Layers tab |
| ui-editor-media-tab.png | Tight "Record Simulator" button |
| ui-editor-more-menu2.png | Delete with no confirm |
| ui-editor-timeline-hover.png | Hidden resize handle, playhead over ruler |
| ui-editor-1280.png | 200 px preview, wrapped timecode |
| ui-editor-1920.png | Half-empty left panel |
| ui-editor-390.png | Mobile collapse |
| ui-schedule-dialog.png | Post dialog, focus ring on ✕ |
