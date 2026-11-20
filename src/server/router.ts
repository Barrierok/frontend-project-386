import { implement } from "@orpc/server";
import { asc } from "drizzle-orm";

import { contract } from "@/contract";
import { eventTypes } from "@/db/schema";
import type { Context } from "@/server/context";

import { toEventType } from "./mappers";

const os = implement(contract).$context<Context>();

export const router = os.router({
  eventTypes: {
    list: os.eventTypes.list.handler(async ({ context }) => {
      const rows = await context.db
        .select()
        .from(eventTypes)
        .orderBy(asc(eventTypes.createdAt), asc(eventTypes.id));

      return rows.map(toEventType);
    }),
  },
});
