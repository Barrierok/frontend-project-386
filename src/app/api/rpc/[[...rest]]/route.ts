import { RPCHandler } from "@orpc/server/fetch";

import { createContext } from "@/server/context";
import { router } from "@/server/router";

const handler = new RPCHandler(router);

async function handle(request: Request): Promise<Response> {
  const { matched, response } = await handler.handle(request, {
    context: createContext(),
    prefix: "/api/rpc",
  });

  if (!matched) {
    return new Response("Not found", { status: 404 });
  }

  response.headers.set("Cache-Control", "no-store");

  return response;
}

export { handle as DELETE, handle as GET, handle as PATCH, handle as POST, handle as PUT };
