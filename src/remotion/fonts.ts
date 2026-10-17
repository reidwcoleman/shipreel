import { loadFont as loadTikTokSans } from "@remotion/google-fonts/TikTokSans";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadArchivoBlack } from "@remotion/google-fonts/ArchivoBlack";
import { loadFont as loadBricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadGeistMono } from "@remotion/google-fonts/GeistMono";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadDMSerif } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadPermanentMarker } from "@remotion/google-fonts/PermanentMarker";
import { loadFont as loadLuckiest } from "@remotion/google-fonts/LuckiestGuy";
import { loadFont as loadCormorant } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadArimo } from "@remotion/google-fonts/Arimo";
import type { FontId } from "./spec";

type FontDef = { family: string; load: () => void; label: string; vibe: string };

const latin = { subsets: ["latin"] as ["latin"] };
const once = (fn: () => void) => {
  let done = false;
  return () => {
    if (done) return;
    done = true;
    try {
      fn();
    } catch (e) {
      console.warn("font load failed", e);
    }
  };
};

export const FONTS: Record<FontId, FontDef> = {
  cormorant: {
    family: "Cormorant Garamond",
    label: "Cormorant",
    vibe: "Aesthetic serif (wedding / lifestyle carousels)",
    load: once(() => {
      loadCormorant("normal", { weights: ["500", "600"], ...latin });
      loadCormorant("italic", { weights: ["500"], ...latin });
    }),
  },
  playfair: {
    family: "Playfair Display",
    label: "Playfair",
    vibe: "Editorial serif list",
    load: once(() => {
      loadPlayfair("normal", { weights: ["400", "600"], ...latin });
      loadPlayfair("italic", { weights: ["400"], ...latin });
    }),
  },
  arimo: {
    family: "Arimo",
    label: "Arial (Arimo)",
    vibe: "Script-made slideshow text",
    load: once(() => loadArimo("normal", { weights: ["700"], ...latin })),
  },
  "tiktok-sans": {
    family: "TikTok Sans",
    label: "TikTok Sans",
    vibe: "Native to the feed",
    load: once(() => loadTikTokSans("normal", { weights: ["400", "500", "600", "700", "800"], ...latin })),
  },
  inter: {
    family: "Inter",
    label: "Inter",
    vibe: "Clean product",
    load: once(() => loadInter("normal", { weights: ["400", "600", "800"], ...latin })),
  },
  montserrat: {
    family: "Montserrat",
    label: "Montserrat",
    vibe: "Bold creator captions",
    load: once(() => loadMontserrat("normal", { weights: ["600", "800", "900"], ...latin })),
  },
  poppins: {
    family: "Poppins",
    label: "Poppins",
    vibe: "Friendly, rounded",
    load: once(() => loadPoppins("normal", { weights: ["500", "700", "800"], ...latin })),
  },
  anton: {
    family: "Anton",
    label: "Anton",
    vibe: "Condensed impact",
    load: once(() => loadAnton("normal", { weights: ["400"], ...latin })),
  },
  bebas: {
    family: "Bebas Neue",
    label: "Bebas Neue",
    vibe: "Poster headline",
    load: once(() => loadBebas("normal", { weights: ["400"], ...latin })),
  },
  "archivo-black": {
    family: "Archivo Black",
    label: "Archivo Black",
    vibe: "Loud and wide",
    load: once(() => loadArchivoBlack("normal", { weights: ["400"], ...latin })),
  },
  bricolage: {
    family: "Bricolage Grotesque",
    label: "Bricolage",
    vibe: "Indie, characterful",
    load: once(() => loadBricolage("normal", { weights: ["500", "700", "800"], ...latin })),
  },
  geist: {
    family: "Geist",
    label: "Geist",
    vibe: "Dev-tool crisp",
    load: once(() => loadGeist("normal", { weights: ["400", "600", "800"], ...latin })),
  },
  "geist-mono": {
    family: "Geist Mono",
    label: "Geist Mono",
    vibe: "Terminal",
    load: once(() => loadGeistMono("normal", { weights: ["400", "600"], ...latin })),
  },
  "jetbrains-mono": {
    family: "JetBrains Mono",
    label: "JetBrains Mono",
    vibe: "Code",
    load: once(() => loadJetBrains("normal", { weights: ["400", "700"], ...latin })),
  },
  "instrument-serif": {
    family: "Instrument Serif",
    label: "Instrument Serif",
    vibe: "Editorial, aesthetic",
    load: once(() => {
      loadInstrumentSerif("normal", { weights: ["400"], ...latin });
      loadInstrumentSerif("italic", { weights: ["400"], ...latin });
    }),
  },
  "dm-serif": {
    family: "DM Serif Display",
    label: "DM Serif",
    vibe: "Classy",
    load: once(() => loadDMSerif("normal", { weights: ["400"], ...latin })),
  },
  caveat: {
    family: "Caveat",
    label: "Caveat",
    vibe: "Handwritten",
    load: once(() => loadCaveat("normal", { weights: ["600", "700"], ...latin })),
  },
  "permanent-marker": {
    family: "Permanent Marker",
    label: "Marker",
    vibe: "Scrappy",
    load: once(() => loadPermanentMarker("normal", { weights: ["400"], ...latin })),
  },
  "luckiest-guy": {
    family: "Luckiest Guy",
    label: "Luckiest Guy",
    vibe: "Cartoon loud",
    load: once(() => loadLuckiest("normal", { weights: ["400"], ...latin })),
  },
};

export const SYSTEM_UI = `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif`;

/** Apple UI recreations (iMessage, Notes, lock screen) read as real only in SF; Inter is the fallback. */
export const APPLE_UI = SYSTEM_UI;

export function fontFamily(id: FontId | undefined): string {
  const def = FONTS[id ?? "tiktok-sans"] ?? FONTS["tiktok-sans"];
  def.load();
  return `"${def.family}", ${SYSTEM_UI}`;
}

/** Fonts used by built-in UI recreations (chat bubbles, notes…), loaded once. */
export function loadUiFonts() {
  FONTS.inter.load();
  FONTS["tiktok-sans"].load();
}

/** Single-weight display faces: never fake-bold them. */
export const SINGLE_WEIGHT: Partial<Record<FontId, true>> = {
  anton: true,
  bebas: true,
  "archivo-black": true,
  "instrument-serif": true,
  "dm-serif": true,
  "permanent-marker": true,
  "luckiest-guy": true,
};
