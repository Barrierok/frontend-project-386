import { scheduling } from "@/lib/config";

import { moscowDate, moscowMidnight } from "./slots";

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000;

export function moscowMinuteOfDay(date: Date): number {
  const shifted = new Date(date.getTime() + MOSCOW_OFFSET_MS);

  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

type SlotInput = {
  startsAt: Date;
  durationMinutes: number;
  now: Date;
};

/**
 * Слот допустим, если он в будущем, внутри 14-дневного окна по Москве,
 * начинается ровно на минуте, целиком лежит в 09:00–18:00 и выровнен
 * по шагу длительности.
 */
export function isSlotBookable({ startsAt, durationMinutes, now }: SlotInput): boolean {
  if (startsAt.getTime() <= now.getTime()) {
    return false;
  }

  if (startsAt.getTime() % MINUTE_MS !== 0) {
    return false;
  }

  const windowStart = moscowMidnight(moscowDate(now));
  const windowEnd = new Date(windowStart.getTime() + scheduling.windowDays * DAY_MS);

  if (startsAt < windowStart || startsAt >= windowEnd) {
    return false;
  }

  const startMinute = moscowMinuteOfDay(startsAt);
  const endMinute = startMinute + durationMinutes;
  const workdayStart = scheduling.workdayStartHour * 60;
  const workdayEnd = scheduling.workdayEndHour * 60;

  if (startMinute < workdayStart || endMinute > workdayEnd) {
    return false;
  }

  return (startMinute - workdayStart) % durationMinutes === 0;
}
