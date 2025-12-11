import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  output: "export",       // <-- REQUIRED for static hosting
  images: {
    unoptimized: true,    // <-- Required for next export when using next/image
  },
  turbopack: {},
};

export default withPWA(nextConfig);