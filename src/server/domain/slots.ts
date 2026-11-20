import { scheduling } from "@/lib/config";

export type BusyInterval = {
  startsAt: Date;
  endsAt: Date;
};

export type GeneratedSlot = {
  startsAt: string;
};

export type GeneratedDay = {
  date: string;
  slots: GeneratedSlot[];
};

const MINUTE_MS = 60_000;

const moscowDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: scheduling.timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Календарная дата по Москве в формате `YYYY-MM-DD`. */
export function moscowDate(date: Date): string {
  return moscowDateFormatter.format(date);
}

/** Полночь указанного московского дня как момент UTC. */
export function moscowMidnight(date: string): Date {
  return new Date(`${date}T00:00:00+03:00`);
}

/** Прибавляет календарные дни к дате `YYYY-MM-DD`. */
function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));

  return shifted.toISOString().slice(0, 10);
}

type GenerateSlotsInput = {
  durationMinutes: number;
  now: Date;
  busy: BusyInterval[];
};

/**
 * Строит окно записи на 14 календарных дней по Москве: 09:00–18:00,
 * шаг равен длительности типа, только старты в будущем и без пересечений
 * с занятыми интервалами.
 */
export function generateSlots({ durationMinutes, now, busy }: GenerateSlotsInput): GeneratedDay[] {
  const today = moscowDate(now);
  const workdayStart = scheduling.workdayStartHour * 60;
  const workdayEnd = scheduling.workdayEndHour * 60;
  const days: GeneratedDay[] = [];

  for (let offset = 0; offset < scheduling.windowDays; offset += 1) {
    const date = addDays(today, offset);
    const midnight = moscowMidnight(date).getTime();
    const slots: GeneratedSlot[] = [];

    for (
      let minute = workdayStart;
      minute + durationMinutes <= workdayEnd;
      minute += durationMinutes
    ) {
      const startsAt = new Date(midnight + minute * MINUTE_MS);
      const endsAt = new Date(startsAt.getTime() + durationMinutes * MINUTE_MS);

      if (startsAt.getTime() <= now.getTime()) {
        continue;
      }

      const overlaps = busy.some(
        (interval) => startsAt < interval.endsAt && endsAt > interval.startsAt,
      );

      if (!overlaps) {
        slots.push({ startsAt: startsAt.toISOString() });
      }
    }

    days.push({ date, slots });
  }

  return days;
}
