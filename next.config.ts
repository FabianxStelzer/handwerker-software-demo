import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(process.cwd()),
  serverExternalPackages: ["@prisma/client", "prisma", "bcryptjs"],
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ["**/node_modules", "**/.git"],
      };
    }
    return config;
  },
};

export default nextConfig;
