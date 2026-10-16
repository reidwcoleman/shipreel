import type { Metadata } from "next";

/** The page swaps in the video's own title once it loads. */
export const metadata: Metadata = { title: "Editor" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
