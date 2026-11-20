import { implement } from "@orpc/server";
import { and, asc, eq, gt, lt } from "drizzle-orm";

import { contract } from "@/contract";
import { bookings, eventTypes } from "@/db/schema";
import { scheduling } from "@/lib/config";
import type { Context } from "@/server/context";
import { isSlotBookable } from "@/server/domain/slot-validation";
import { generateSlots } from "@/server/domain/slots";

import { hasPgCode, insertBooking } from "./booking-insert";
import { toBooking, toBookingFromRow, toEventType } from "./mappers";

const os = implement(contract).$context<Context>();

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

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
  bookings: {
    create: os.bookings.create.handler(async ({ input, context, errors }) => {
      const [eventType] = await context.db
        .select()
        .from(eventTypes)
        .where(eq(eventTypes.id, input.eventTypeId))
        .limit(1);

      if (!eventType) {
        throw errors.EVENT_TYPE_NOT_FOUND();
      }

      const startsAt = new Date(input.startsAt);
      const endsAt = new Date(startsAt.getTime() + eventType.durationMinutes * MINUTE_MS);

      if (
        !isSlotBookable({
          startsAt,
          durationMinutes: eventType.durationMinutes,
          now: context.now(),
        })
      ) {
        throw errors.SLOT_UNAVAILABLE();
      }

      let inserted: Awaited<ReturnType<typeof insertBooking>>;

      try {
        inserted = await insertBooking(context.db, {
          eventTypeId: eventType.id,
          startsAt,
          endsAt,
          guestName: input.guestName,
          guestEmail: input.guestEmail,
        });
      } catch (error) {
        if (hasPgCode(error, "57014")) {
          throw errors.SLOT_TIMEOUT();
        }

        if (hasPgCode(error, "23P01") || hasPgCode(error, "40P01")) {
          throw errors.SLOT_TAKEN();
        }

        throw error;
      }

      if (!inserted) {
        throw errors.SLOT_TAKEN();
      }

      return toBooking(inserted, eventType);
    }),
    listUpcoming: os.bookings.listUpcoming.handler(async ({ context }) => {
      const rows = await context.db
        .select({ booking: bookings, eventType: eventTypes })
        .from(bookings)
        .innerJoin(eventTypes, eq(bookings.eventTypeId, eventTypes.id))
        .where(gt(bookings.startsAt, context.now()))
        .orderBy(asc(bookings.startsAt));

      return rows.map(({ booking, eventType }) => toBookingFromRow(booking, eventType));
    }),
  },
});
