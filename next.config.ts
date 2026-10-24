import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page here reads the session via cookies(), so the whole app is dynamic --
  // Cache Components' prerendering requirements don't fit and would mean wrapping
  // every page in Suspense for no benefit.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
