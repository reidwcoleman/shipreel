import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge class names; later Tailwind utilities win over earlier conflicting ones (px-0 beats px-5). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
