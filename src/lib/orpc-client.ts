import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";

import type { contract } from "@/contract";

export function rpcUrl(): string {
  if (typeof window === "undefined") {
    return "http://localhost/api/rpc";
  }

  return new URL("/api/rpc", window.location.origin).toString();
}

const link = new RPCLink({
  url: rpcUrl(),
});

export const orpcClient: ContractRouterClient<typeof contract> = createORPCClient(link);
