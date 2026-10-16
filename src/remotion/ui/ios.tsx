import React from "react";
import { Img } from "remotion";
import { APPLE_UI } from "../fonts";
import { useResolve } from "./context";

/** Today's date in the forms iOS shows it ("Thursday, October 15", "October 15, 2026"). Rendered fresh each time. */
export function today() {
  const d = new Date();
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return { weekdayMonthDay: `${weekday}, ${monthDay}`, long: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) };
}

/** iOS status bar: 9:41, signal, wifi, battery. `k` = px per iOS point. */
export const StatusBar: React.FC<{ k: number; dark?: boolean; time?: string }> = ({ k, dark, time = "9:41" }) => {
  const c = dark ? "#FFFFFF" : "#000000";
  return (
    <div
      style={{
        height: 54 * k,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `${6 * k}px ${30 * k}px 0 ${44 * k}px`,
        fontFamily: APPLE_UI,
        fontWeight: 600,
        fontSize: 17 * k,
        color: c,
        letterSpacing: "-0.01em",
      }}
    >
      <span>{time}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 * k }}>
        <svg width={18 * k} height={12 * k} viewBox="0 0 18 12">
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={i * 4.7} y={9 - i * 3} width={3.2} height={3 + i * 3} rx={0.9} fill={c} />
          ))}
        </svg>
        <svg width={17 * k} height={12 * k} viewBox="0 0 17 12">
          <path d="M8.5 2.3c2.4 0 4.6.9 6.2 2.5l1.2-1.2C13.9 1.6 11.3.5 8.5.5S3.1 1.6 1.1 3.6l1.2 1.2C3.9 3.2 6.1 2.3 8.5 2.3z" fill={c} />
          <path d="M8.5 5.6c1.5 0 2.9.6 3.9 1.6l1.2-1.2C12.2 4.6 10.4 3.8 8.5 3.8S4.8 4.6 3.4 6l1.2 1.2c1-1 2.4-1.6 3.9-1.6z" fill={c} />
          <path d="M8.5 8.9c.6 0 1.2.2 1.6.7l-1.6 1.6-1.6-1.6c.4-.5 1-.7 1.6-.7z" fill={c} />
        </svg>
        <div style={{ display: "flex", alignItems: "center", gap: 1.5 * k }}>
          <div
            style={{
              width: 25 * k,
              height: 12 * k,
              borderRadius: 3.6 * k,
              border: `${1 * k}px solid ${dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)"}`,
              padding: 1.6 * k,
            }}
          >
            <div style={{ width: "100%", height: "100%", borderRadius: 2 * k, background: c }} />
          </div>
          <div style={{ width: 1.6 * k, height: 4.5 * k, borderRadius: 1 * k, background: dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)" }} />
        </div>
      </div>
    </div>
  );
};

/** Grey gradient initials avatar, exactly like iOS contacts. */
export const ContactAvatar: React.FC<{ name: string; size: number; src?: string }> = ({ name, size, src }) => {
  const resolve = useResolve();
  const url = resolve(src);
  // "Shipreel (founder)" → "S", "Maya Chen" → "MC": first letter of each word, asides dropped.
  const initials =
    name
      .replace(/\(.*?\)/g, "")
      .split(/\s+/)
      .map((p) => /[\p{L}\p{N}]/u.exec(p)?.[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  if (url)
    return <Img src={url} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(180deg, #A5ABB9 0%, #858994 100%)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: APPLE_UI,
        fontWeight: 600,
        fontSize: size * 0.42,
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </div>
  );
};

/** Rounded app icon from an image, or a generated tile with the app's initial. */
/** Dark ink on light colours (a lime or yellow accent), white on everything else. */
function inkOn(color: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const lin = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return lum > 0.4 ? "#0A0A0A" : "#fff";
}

export const AppIcon: React.FC<{ src?: string; name: string; size: number; color?: string }> = ({ src, name, size, color = "#111" }) => {
  const resolve = useResolve();
  const url = resolve(src);
  const radius = size * 0.225;
  if (url)
    return (
      <Img
        src={url}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          objectFit: "cover",
          boxShadow: `0 ${size * 0.08}px ${size * 0.22}px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.08)`,
        }}
      />
    );
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(160deg in oklch, ${color}, color-mix(in oklch, ${color} 70%, black))`,
        color: inkOn(color),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: APPLE_UI,
        fontWeight: 800,
        fontSize: size * 0.5,
        boxShadow: `0 ${size * 0.08}px ${size * 0.22}px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.12)`,
      }}
    >
      {name.trim()[0]?.toUpperCase() ?? "A"}
    </div>
  );
};

export const VerifiedBadge: React.FC<{ size: number; color?: string }> = ({ size, color = "#1D9BF0" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      fill={color}
      d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
    />
    <path fill="#fff" d="M10.5 16.2l-3.7-3.7 1.4-1.4 2.3 2.3 5.3-5.3 1.4 1.4z" />
  </svg>
);
