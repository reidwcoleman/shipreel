import type { Metadata } from "next";

export const metadata: Metadata = { title: "Hook Lab" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
