import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    // Type errors now fail the build. `tsc --noEmit` is clean, so this keeps
    // regressions from slipping through (the previous `true` is what let five
    // type errors accumulate silently).
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
};

export default nextConfig;
