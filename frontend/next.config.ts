import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Production: the browser talks to this same origin (/api/v1/...) and Vercel forwards it to the Render backend.
  // That keeps the login cookie first-party. Set BACKEND_URL (e.g. https://graapes-api.onrender.com) in Vercel.
  async rewrites() {
    const backend = process.env.BACKEND_URL?.replace(/\/$/, "");
    return backend ? [{ source: "/api/v1/:path*", destination: `${backend}/api/v1/:path*` }] : [];
  },
  cacheComponents: true,
  partialPrefetching: true,
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
