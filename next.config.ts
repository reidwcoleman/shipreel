import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A second instance (e.g. a dev server next to the production one) can build into its own folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Remotion's renderer/bundler and other native-ish packages run in Node only.
  serverExternalPackages: ["@remotion/renderer", "@remotion/bundler", "@remotion/cli", "esbuild"],
  devIndicators: false,
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
