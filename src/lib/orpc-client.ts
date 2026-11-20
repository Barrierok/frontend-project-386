import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";

import type { contract } from "@/contract";

const link = new RPCLink({
  url: "/api/rpc",
});

export const orpcClient: ContractRouterClient<typeof contract> = createORPCClient(link);
