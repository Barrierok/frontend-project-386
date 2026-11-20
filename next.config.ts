import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Отдельный каталог сборки для e2e, чтобы не конфликтовать с запущенным `next dev`.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  agentRules: true,
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
