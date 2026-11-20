import { createRouterClient } from "@orpc/server";

import { createContext } from "@/server/context";
import { router } from "@/server/router";

/**
 * Клиент для Server Components: вызывает роутер в процессе, без HTTP.
 */
export function createServerClient() {
  return createRouterClient(router, { context: createContext() });
}
