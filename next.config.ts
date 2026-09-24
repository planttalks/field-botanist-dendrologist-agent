import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server listens on every interface. Browsers that open 127.0.0.1
  // still need to be allowed to load the dev assets.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
