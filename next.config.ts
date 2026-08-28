import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "blog.yuer6327.top" }],
  },
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;

