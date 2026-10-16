"use client";
import * as Slider from "@radix-ui/react-slider";
import { ArrowDown, ArrowUp, Film, ImageIcon, Plus, Trash2, Upload } from "lucide-react";
import React, { useRef } from "react";
import { toast } from "sonner";
import { IconButton } from "@/components/ui/button";
import { inputCls } from "@/components/ui/field";
import { Segmented, Switch } from "@/components/ui/misc";
import { Popover } from "@/components/ui/overlay";
import { mediaUrl, refresh } from "@/lib/client/api";
import { cn } from "@/lib/cn";
import type { Asset } from "@/lib/types";
import { FONTS } from "@/remotion/fonts";
import { CAPTION_STYLES, FONT_IDS, TEXT_ANIMATIONS, TEXT_POSITIONS, type Background, type TextStyle } from "@/remotion/spec";

export function Row({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-fg-2">{label}</span>
        {hint && <span className="text-[11px] text-fg-3">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, multiline, rows = 3, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; rows?: number; mono?: boolean }) {
  return multiline ? (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={cn(inputCls, "resize-y py-2 text-[13px] leading-relaxed", mono && "font-mono text-xs")} />
  ) : (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn(inputCls, "h-8 text-[13px]", mono && "font-mono text-xs")} />
  );
}

export function NumberSlider({ value, onChange, min, max, step = 0.1, unit = "", format }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string; format?: (v: number) => string }) {
  return (
    <div className="flex items-center gap-3">
      <Slider.Root className="relative flex h-5 flex-1 touch-none items-center select-none" value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)}>
        <Slider.Track className="relative h-1 flex-1 rounded-full bg-hover">
          <Slider.Range className="absolute h-full rounded-full bg-fg-3" />
        </Slider.Track>
        <Slider.Thumb className="block size-3.5 rounded-full border-2 border-bg bg-fg shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="value" />
      </Slider.Root>
      <input
        type="number"
        value={Number(value.toFixed(2))}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className={cn(inputCls, "h-7 w-16 px-2 text-right font-mono text-xs tabular-nums")}
        aria-label={unit || "number"}
      />
      {unit && <span className="-ml-1.5 w-3 text-[11px] text-fg-3">{format ? format(value) : unit}</span>}
    </div>
  );
}

export function EnumField<T extends string>({ value, options, onChange, layoutId, labels, select }: { value: T; options: readonly T[]; onChange: (v: T) => void; layoutId: string; labels?: Partial<Record<T, string>>; select?: boolean }) {
  if (options.length <= 4 && !select)
    return <Segmented layoutId={layoutId} size="sm" value={value} onChange={onChange} options={options.map((o) => ({ value: o, label: labels?.[o] ?? o }))} className="w-full [&>button]:flex-1 [&>button]:justify-center" />;
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className={cn(inputCls, "h-8 text-[13px]")}>
      {options.map((o) => (
        <option key={o} value={o}>
          {labels?.[o] ?? o}
        </option>
      ))}
    </select>
  );
}

export function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-line" style={{ background: value }}>
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Pick colour" />
      </label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "h-8 font-mono text-xs")} />
    </div>
  );
}

export function BoolField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1 text-[13px] text-fg-2">
      {label}
      <Switch checked={value} onCheckedChange={onChange} label={label} />
    </label>
  );
}

/** Pick a project asset (or upload one). */
export function MediaField({
  value,
  onChange,
  assets,
  projectId,
  accept = "any",
  allowNone,
}: {
  value?: string;
  onChange: (src: string | undefined, asset?: Asset) => void;
  assets: Asset[];
  projectId: string;
  accept?: "any" | "image" | "video";
  allowNone?: boolean;
}) {
  const file = value?.replace(/^asset:/, "");
  const current = assets.find((a) => a.file === file);
  const list = assets.filter((a) => (accept === "any" ? a.kind !== "audio" : a.kind === accept));
  const input = useRef<HTMLInputElement>(null);
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append("files", f);
    const t = toast.loading("Uploading…");
    const res = await fetch(`/api/projects/${projectId}/assets`, { method: "POST", body: fd });
    if (!res.ok) return toast.error("Upload failed", { id: t });
    const added = (await res.json()) as Asset[];
    toast.success("Added", { id: t });
    refresh(`/api/projects/${projectId}`);
    if (added[0]) onChange(`asset:${added[0].file}`, added[0]);
  };
  return (
    <Popover
      className="w-[340px] p-2"
      trigger={
        <button className={cn(inputCls, "flex h-12 items-center gap-2.5 px-2 text-left")}>
          {current?.thumb || current?.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(projectId, current.thumb ? `assets/${current.thumb}` : `assets/${current.file}`)} alt="" className="size-8 rounded object-cover" />
          ) : (
            <span className="flex size-8 items-center justify-center rounded bg-hover text-fg-3">
              <ImageIcon className="size-4" />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-[13px]">{current?.name ?? (value?.startsWith("builtin:") ? "Placeholder" : value ? file : "Choose media…")}</span>
        </button>
      }
    >
      <div className="grid max-h-[300px] grid-cols-4 gap-1.5 overflow-y-auto p-1">
        <button onClick={() => input.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line-strong text-[11px] text-fg-3 hover:border-accent/60 hover:text-fg">
          <Upload className="size-4" />
          Upload
        </button>
        {allowNone && (
          <button onClick={() => onChange(undefined)} className="flex aspect-square items-center justify-center rounded-md border border-line text-[11px] text-fg-3 hover:bg-hover">
            None
          </button>
        )}
        {list.map((a) => (
          <button key={a.file} onClick={() => onChange(`asset:${a.file}`, a)} className={cn("relative aspect-square overflow-hidden rounded-md border", a.file === file ? "border-accent" : "border-transparent hover:border-line-strong")} title={a.name}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(projectId, a.thumb ? `assets/${a.thumb}` : `assets/${a.file}`)} alt={a.name} className="size-full object-cover" />
            {a.kind === "video" && (
              <span className="absolute right-1 bottom-1 flex items-center gap-0.5 rounded bg-black/70 px-1 font-mono text-[10px]">
                <Film className="size-2.5" />
                {a.durationSec?.toFixed(0)}s
              </span>
            )}
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="px-2 pb-2 text-xs text-fg-3">No media yet. Upload a screen recording or screenshots, or capture from the iOS Simulator in Product → Media.</p>}
      <input ref={input} type="file" multiple accept={accept === "image" ? "image/*" : accept === "video" ? "video/*" : "image/*,video/*"} className="hidden" onChange={(e) => upload(e.target.files)} />
    </Popover>
  );
}

const STYLE_LABEL: Record<string, string> = {
  "tiktok-classic": "TikTok",
  "tiktok-box": "Box",
  "tiktok-box-dark": "Box dark",
  hormozi: "Hormozi",
  outline: "MrBeast",
  minimal: "Apple",
  neon: "Neon",
  typewriter: "Type",
  serif: "Serif",
  headline: "Headline",
  snapchat: "Snapchat",
};

function StyleSwatch({ id }: { id: string }) {
  const base = "flex h-9 items-center justify-center rounded-md text-[12px] leading-none";
  switch (id) {
    case "tiktok-box":
      return <span className={cn(base, "bg-[#2a2a2e]")}><span className="rounded bg-white px-1.5 py-0.5 font-semibold text-black">Aa</span></span>;
    case "tiktok-box-dark":
      return <span className={cn(base, "bg-[#3a3a40]")}><span className="rounded bg-black px-1.5 py-0.5 font-semibold text-white">Aa</span></span>;
    case "hormozi":
      return <span className={cn(base, "bg-[#2a2a2e] font-black text-white uppercase")} style={{ textShadow: "0 0 2px #000, 0 0 2px #000, 0 2px 0 #000" }}>A<span className="text-accent">A</span></span>;
    case "outline":
      return <span className={cn(base, "bg-[#2a2a2e] font-black text-white uppercase")} style={{ textShadow: "0 0 3px #000, 0 0 3px #000, 0 3px 0 #000", fontStyle: "italic" }}>Aa</span>;
    case "minimal":
      return <span className={cn(base, "bg-[#2a2a2e] font-semibold tracking-tight text-[#f5f5f7]")}>Aa</span>;
    case "neon":
      return <span className={cn(base, "bg-[#18181b] text-white uppercase")} style={{ textShadow: "0 0 6px var(--color-accent), 0 0 12px var(--color-accent)" }}>Aa</span>;
    case "typewriter":
      return <span className={cn(base, "bg-[#2a2a2e] font-mono font-bold text-white")}>Aa_</span>;
    case "serif":
      return <span className={cn(base, "bg-[#2a2a2e] font-display text-[17px] text-white italic")}>Aa</span>;
    case "headline":
      return <span className={cn(base, "bg-[#2a2a2e]")}><span className="rounded bg-[#E70003] px-1.5 py-0.5 font-black text-white uppercase">Aa</span></span>;
    case "snapchat":
      return (
        <span className={cn(base, "bg-[#2a2a2e]")}>
          <span className="flex w-full items-center justify-center bg-[rgba(0,0,0,0.6)] py-[3px] text-[10px] font-medium text-white">Aa</span>
        </span>
      );
    default:
      return <span className={cn(base, "bg-[#2a2a2e] font-semibold text-white")} style={{ textShadow: "0 0 1.5px #000, 0 0 1.5px #000" }}>Aa</span>;
  }
}

export function TextStyleField({ value, onChange, layoutId }: { value?: TextStyle; onChange: (v: TextStyle) => void; layoutId: string }) {
  const v = value ?? {};
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-5 gap-1.5">
        {CAPTION_STYLES.map((id) => (
          <button key={id} onClick={() => onChange({ ...v, style: id })} className={cn("flex flex-col gap-1 rounded-md p-0.5 text-[10px] text-fg-3 ring-1", v.style === id ? "ring-accent" : "ring-transparent hover:ring-line-strong")} title={id}>
            <StyleSwatch id={id} />
            <span className="truncate">{STYLE_LABEL[id]}</span>
          </button>
        ))}
      </div>
      <Row label="Position">
        <EnumField layoutId={`${layoutId}-pos`} value={v.position ?? "center"} options={TEXT_POSITIONS} onChange={(position) => onChange({ ...v, position })} />
      </Row>
      <div className="grid grid-cols-2 gap-2">
        <Row label="Animation">
          <EnumField layoutId={`${layoutId}-anim`} value={v.animation ?? "pop"} options={TEXT_ANIMATIONS} onChange={(animation) => onChange({ ...v, animation })} />
        </Row>
        <Row label="Font">
          <select value={v.font ?? ""} onChange={(e) => onChange({ ...v, font: (e.target.value || undefined) as TextStyle["font"] })} className={cn(inputCls, "h-8 text-[13px]")}>
            <option value="">Style default</option>
            {FONT_IDS.map((f) => (
              <option key={f} value={f}>
                {FONTS[f].label}
              </option>
            ))}
          </select>
        </Row>
      </div>
      <Row label="Size" hint={v.size ? `${Math.round(v.size * 1080)}px` : "auto"}>
        <NumberSlider value={v.size ?? 0.065} min={0.03} max={0.16} step={0.002} onChange={(size) => onChange({ ...v, size })} />
      </Row>
    </div>
  );
}

export function BackgroundField({ value, onChange, assets, projectId, layoutId }: { value?: Background; onChange: (v: Background | undefined) => void; assets: Asset[]; projectId: string; layoutId: string }) {
  const kind = value?.kind ?? "auto";
  return (
    <div className="flex flex-col gap-3">
      <Segmented
        layoutId={layoutId}
        size="sm"
        value={kind}
        onChange={(k) => {
          if (k === "auto") onChange(undefined);
          else if (k === "solid") onChange({ kind: "solid", color: "#0B0B0F" });
          else if (k === "gradient") onChange({ kind: "gradient", from: "#101014", to: "#2a2f1a", angle: 160 });
          else if (k === "mesh") onChange({ kind: "mesh", colors: ["#0B0B0F", "#2b3a12", "#121216"] });
          else onChange({ kind: "media", src: assets[0] ? `asset:${assets[0].file}` : "builtin:placeholder.svg", dim: 0.3, blur: 0, kenBurns: true });
        }}
        options={[
          { value: "auto", label: "Auto" },
          { value: "solid", label: "Solid" },
          { value: "gradient", label: "Gradient" },
          { value: "mesh", label: "Mesh" },
          { value: "media", label: "Media" },
        ]}
        className="w-full [&>button]:flex-1 [&>button]:justify-center"
      />
      {value?.kind === "solid" && <ColorField value={value.color} onChange={(color) => onChange({ ...value, color })} />}
      {value?.kind === "gradient" && (
        <div className="grid grid-cols-2 gap-2">
          <ColorField value={value.from} onChange={(from) => onChange({ ...value, from })} />
          <ColorField value={value.to} onChange={(to) => onChange({ ...value, to })} />
        </div>
      )}
      {value?.kind === "mesh" && (
        <div className="flex flex-col gap-2">
          {value.colors.map((c, i) => (
            <ColorField key={i} value={c} onChange={(nc) => onChange({ ...value, colors: value.colors.map((x, j) => (j === i ? nc : x)) })} />
          ))}
        </div>
      )}
      {value?.kind === "media" && (
        <>
          <MediaField value={value.src} onChange={(src) => src && onChange({ ...value, src })} assets={assets} projectId={projectId} />
          <Row label="Darken" hint={`${Math.round((value.dim ?? 0.25) * 100)}%`}>
            <NumberSlider value={value.dim ?? 0.25} min={0} max={0.9} step={0.01} onChange={(dim) => onChange({ ...value, dim })} />
          </Row>
          <Row label="Blur">
            <NumberSlider value={value.blur ?? 0} min={0} max={40} step={1} onChange={(blur) => onChange({ ...value, blur })} />
          </Row>
        </>
      )}
    </div>
  );
}

/** Generic list editor: reorder, add, remove; each row renders its own fields. */
export function ListEditor<T>({ items, onChange, render, make, addLabel, max = 30 }: { items: T[]; onChange: (items: T[]) => void; render: (item: T, update: (patch: Partial<T>) => void, i: number) => React.ReactNode; make: () => T; addLabel: string; max?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="group/row flex items-start gap-1 rounded-md border border-line bg-bg/40 p-1.5">
          <div className="min-w-0 flex-1">{render(item, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))), i)}</div>
          <div className="flex h-8 items-center opacity-30 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100">
            <IconButton label="Move up" size="xs" disabled={i === 0} onClick={() => onChange(items.map((x, j) => (j === i - 1 ? items[i] : j === i ? items[i - 1] : x)))}>
              <ArrowUp className="size-3" />
            </IconButton>
            <IconButton label="Move down" size="xs" disabled={i === items.length - 1} onClick={() => onChange(items.map((x, j) => (j === i + 1 ? items[i] : j === i ? items[i + 1] : x)))}>
              <ArrowDown className="size-3" />
            </IconButton>
            <IconButton label="Remove" size="xs" disabled={items.length <= 1} onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Trash2 className="size-3" />
            </IconButton>
          </div>
        </div>
      ))}
      {items.length < max && (
        <button onClick={() => onChange([...items, make()])} className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-dashed border-line text-xs text-fg-3 transition-colors hover:border-line-strong hover:text-fg">
          <Plus className="size-3.5" /> {addLabel}
        </button>
      )}
    </div>
  );
}
