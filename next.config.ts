import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: true,
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
