import { sql } from "drizzle-orm";

import type { Database } from "@/db";

export type InsertedBookingRow = {
  id: string;
  starts_at: Date | string;
  ends_at: Date | string;
  guest_name: string;
  guest_email: string;
  created_at: Date | string;
};

type InsertBookingValues = {
  eventTypeId: string;
  startsAt: Date;
  endsAt: Date;
  guestName: string;
  guestEmail: string;
};

function findPgCode(error: unknown, code: string, seen: Set<unknown>): boolean {
  if (typeof error !== "object" || error === null || seen.has(error)) {
    return false;
  }

  seen.add(error);

  if ("code" in error && typeof error.code === "string" && error.code === code) {
    return true;
  }

  return findPgCode((error as { cause?: unknown }).cause, code, seen);
}

/**
 * Ищет SQLSTATE в цепочке `cause`: Drizzle оборачивает ошибки драйвера
 * в `DrizzleQueryError`, поэтому код Postgres лежит не на верхнем уровне.
 */
export function hasPgCode(error: unknown, code: string): boolean {
  return findPgCode(error, code, new Set());
}

/**
 * Вставка одной командой. Ноль строк означает, что слот уже занят.
 * `40P01` (deadlock) допускает один повтор, остальные ошибки — наверх.
 */
export async function insertBooking(
  db: Database,
  values: InsertBookingValues,
): Promise<InsertedBookingRow | null> {
  const attempt = () =>
    db.transaction(async (tx) => {
      await tx.execute(sql`set local statement_timeout = '5s'`);

      const result = await tx.execute<InsertedBookingRow>(sql`
        insert into bookings (event_type_id, starts_at, ends_at, guest_name, guest_email)
        values (
          ${values.eventTypeId},
          ${values.startsAt},
          ${values.endsAt},
          ${values.guestName},
          ${values.guestEmail}
        )
        on conflict on constraint bookings_no_overlap do nothing
        returning id, starts_at, ends_at, guest_name, guest_email, created_at
      `);

      return result.rows[0] ?? null;
    });

  try {
    return await attempt();
  } catch (error) {
    if (hasPgCode(error, "40P01")) {
      return attempt();
    }

    throw error;
  }
}
