import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Отдельный каталог сборки для e2e, чтобы не конфликтовать с запущенным `next dev`.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // `standalone` нужен только для Docker-сборки: с ним не работает `next start`,
  // который используют e2e и локальный запуск.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  agentRules: true,
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
