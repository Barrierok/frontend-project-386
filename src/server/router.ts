import { implement } from "@orpc/server";
import { and, asc, eq, gt, lt } from "drizzle-orm";

import { contract } from "@/contract";
import { bookings, eventTypes } from "@/db/schema";
import { scheduling } from "@/lib/config";
import type { Context } from "@/server/context";
import { generateSlots } from "@/server/domain/slots";

import { toEventType } from "./mappers";

const os = implement(contract).$context<Context>();

const DAY_MS = 86_400_000;

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
  availability: {
    get: os.availability.get.handler(async ({ input, context, errors }) => {
      const [eventType] = await context.db
        .select()
        .from(eventTypes)
        .where(eq(eventTypes.id, input.eventTypeId))
        .limit(1);

      if (!eventType) {
        throw errors.EVENT_TYPE_NOT_FOUND();
      }

      const now = context.now();
      const windowEnd = new Date(now.getTime() + scheduling.windowDays * DAY_MS);

      const busy = await context.db
        .select({ startsAt: bookings.startsAt, endsAt: bookings.endsAt })
        .from(bookings)
        .where(and(gt(bookings.endsAt, now), lt(bookings.startsAt, windowEnd)));

      return {
        days: generateSlots({
          durationMinutes: eventType.durationMinutes,
          now,
          busy,
        }),
      };
    }),
  },
});
