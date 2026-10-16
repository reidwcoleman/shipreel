"use client";
import { Bot, CalendarDays, Check, ChevronsUpDown, Clapperboard, House, Library, Lightbulb, Package, Plus, Search, Settings2 } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { Tip } from "@/components/ui/button";
import { Dot, Kbd } from "@/components/ui/misc";
import { Dropdown, MenuItem, MenuSeparator } from "@/components/ui/overlay";
import { mediaUrl, patch, refresh } from "@/lib/client/api";
import { RAIL_QUERY, useMediaQuery } from "@/lib/client/media";
import { useBootstrap } from "@/lib/client/store";
import { cn } from "@/lib/cn";
import type { Project } from "@/lib/types";

export const NAV = [
  { href: "/", label: "Home", icon: House, key: "H" },
  { href: "/ideas", label: "Hook Lab", icon: Lightbulb, key: "I" },
  { href: "/studio", label: "Studio", icon: Clapperboard, key: "S" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, key: "C" },
  { href: "/library", label: "Viral Library", icon: Library, key: "L" },
  { href: "/product", label: "Product", icon: Package, key: "P" },
  { href: "/agents", label: "Agents", icon: Bot, key: "A" },
] as const;

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--color-accent)" />
      <path d="M12 9.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L13.5 8.64A1 1 0 0 0 12 9.5Z" fill="var(--color-accent-ink)" transform="rotate(-14 16 16)" />
      <path d="M6.5 22.5l4-4" stroke="var(--color-accent-ink)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function ProjectIcon({ project, size = 22 }: { project: Pick<Project, "id" | "name" | "brand">; size?: number }) {
  const logo = project.brand.logo?.replace(/^asset:/, "");
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={mediaUrl(project.id, logo)} alt="" width={size} height={size} className="shrink-0 rounded-[28%] object-cover" style={{ width: size, height: size }} />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[28%] font-bold text-black"
      style={{ width: size, height: size, background: project.brand.accent || "var(--color-accent)", fontSize: size * 0.5 }}
    >
      {project.name.trim()[0]?.toUpperCase()}
    </span>
  );
}

/** A nav row: full label normally, an icon with a tooltip when the sidebar is a rail. */
function NavLink({ href, label, icon: Icon, active, rail }: { href: string; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; active: boolean; rail: boolean }) {
  const link = (
    <Link
      href={href}
      aria-label={rail ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
        rail && "justify-center px-0",
        active ? "text-fg" : "text-fg-2 hover:bg-hover/60 hover:text-fg",
      )}
    >
      {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-md bg-hover" transition={{ type: "spring", bounce: 0, duration: 0.3 }} />}
      {active && <motion.span layoutId="nav-bar" className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-accent" transition={{ type: "spring", bounce: 0, duration: 0.3 }} />}
      <Icon className={cn("relative size-4", active ? "text-fg" : "text-fg-3")} strokeWidth={1.8} />
      {!rail && <span className="relative">{label}</span>}
    </Link>
  );
  return rail ? (
    <Tip label={label} side="right">
      {link}
    </Tip>
  ) : (
    link
  );
}

export function Sidebar({ onSearch }: { onSearch: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useBootstrap();
  const rail = useMediaQuery(RAIL_QUERY);
  const projects = data?.projects ?? [];
  const active = projects.find((p) => p.id === data?.activeProjectId) ?? null;
  const claude = data?.agents.find((a) => a.engine === "claude");
  const codex = data?.agents.find((a) => a.engine === "codex");
  const claudeTone = !data ? "neutral" : claude?.installed ? "ok" : "bad";
  const codexTone = codex?.installed ? (codex.loggedIn === false ? "warn" : "ok") : "neutral";

  const switchTo = async (id: string) => {
    await patch(`/api/projects/${id}`, { activate: true });
    await refresh("/api/");
  };

  const switcher = (
    <button
      aria-label={rail ? `Product: ${active?.name ?? "none"}` : undefined}
      className={cn(
        "flex h-10 w-full items-center gap-2.5 rounded-lg border border-line bg-panel px-2.5 text-left transition-colors hover:border-line-strong hover:bg-raised",
        rail && "justify-center border-transparent bg-transparent px-0",
      )}
    >
      {!data ? <span className="skeleton size-[22px] rounded-md" /> : active ? <ProjectIcon project={active} /> : <span className="size-[22px] rounded-md border border-dashed border-line-strong" />}
      {!rail &&
        (!data ? (
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="skeleton h-3 w-20 rounded" />
            <span className="skeleton h-2.5 w-14 rounded" />
          </span>
        ) : (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{active?.name ?? "No product yet"}</span>
            <span className="block truncate text-[11px] text-fg-3">{active?.category || (active ? "Product" : "Add one to start")}</span>
          </span>
        ))}
      {!rail && <ChevronsUpDown className="size-3.5 text-fg-3" />}
    </button>
  );

  return (
    <aside className={cn("flex h-full shrink-0 flex-col border-r border-line bg-bg transition-[width] duration-200", rail ? "w-14" : "w-[232px]")}>
      <div className={cn("flex h-12 items-center gap-2", rail ? "justify-center" : "px-4")}>
        <Logo />
        {!rail && <span className="text-[15px] font-semibold tracking-tight">Shipreel</span>}
      </div>

      <div className={cn("pb-2", rail ? "px-2" : "px-2.5")}>
        <Dropdown align="start" sideOffset={4} matchTrigger={!rail} className={rail ? "w-56" : undefined} trigger={switcher}>
          {projects.map((p) => (
            <MenuItem key={p.id} onSelect={() => switchTo(p.id)} icon={p.id === active?.id ? <Check className="size-3.5" /> : null} description={p.category || undefined}>
              <span className="flex items-center gap-2">
                <ProjectIcon project={p} size={16} />
                <span className="truncate">{p.name}</span>
              </span>
            </MenuItem>
          ))}
          {projects.length > 0 && <MenuSeparator />}
          <MenuItem icon={<Plus className="size-3.5" />} onSelect={() => router.push("/welcome")}>
            Add a product
          </MenuItem>
        </Dropdown>
      </div>

      {rail ? (
        <Tip label="Search or ask" side="right" shortcut="⌘K">
          <button onClick={onSearch} aria-label="Search or ask" className="mx-2 mb-2 flex h-8 items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-hover hover:text-fg-2">
            <Search className="size-4" />
          </button>
        </Tip>
      ) : (
        <button
          onClick={onSearch}
          className="mx-2.5 mb-2 flex h-8 items-center gap-2 rounded-md px-2.5 text-[13px] text-fg-3 transition-colors hover:bg-hover hover:text-fg-2"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Search or ask…</span>
          <Kbd>⌘K</Kbd>
        </button>
      )}

      <nav className={cn("flex flex-col gap-px", rail ? "px-2" : "px-2.5")}>
        {NAV.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} rail={rail} active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)} />
        ))}
      </nav>

      <div className={cn("mt-auto flex flex-col gap-1 pb-3", rail ? "px-2" : "px-2.5")}>
        {rail ? (
          <Tip
            side="right"
            label={`Claude Code ${!data ? "checking" : claude?.installed ? "ready" : "not found"} · Codex ${!data ? "checking" : codex?.installed ? (codex.loggedIn === false ? "sign in" : "ready") : "via npx"}`}
          >
            <Link href="/agents" aria-label="Workers" className="flex h-8 items-center justify-center gap-1.5 rounded-md hover:bg-hover">
              <Dot tone={claudeTone} />
              <Dot tone={codexTone} />
            </Link>
          </Tip>
        ) : (
          <Link href="/agents" className="flex flex-col gap-1.5 rounded-lg border border-line bg-panel px-3 py-2.5 transition-colors hover:border-line-strong">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-fg-3 uppercase">Workers</span>
            <span className="flex items-center gap-2 text-[13px]">
              <Dot tone={claudeTone} />
              <span className="flex-1">Claude Code</span>
              <span className="text-[11px] text-fg-3">{!data ? "checking" : claude?.installed ? "ready" : "not found"}</span>
            </span>
            <span className="flex items-center gap-2 text-[13px]">
              <Dot tone={codexTone} />
              <span className="flex-1">Codex</span>
              <span className="text-[11px] text-fg-3">{!data ? "checking" : codex?.installed ? (codex.loggedIn === false ? "sign in" : "ready") : "via npx"}</span>
            </span>
          </Link>
        )}
        <NavLink href="/settings" label="Settings" icon={Settings2} rail={rail} active={pathname.startsWith("/settings")} />
      </div>
    </aside>
  );
}
