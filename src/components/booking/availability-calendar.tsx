"use client";

import type { DaySlots } from "@/contract/schemas";
import { formatPlaces, formatShortDay } from "@/lib/format";
import { cn } from "@/lib/utils";

type AvailabilityCalendarProps = {
  days: DaySlots[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
};

export function AvailabilityCalendar({
  days,
  selectedDate,
  onSelectDate,
}: AvailabilityCalendarProps) {
  return (
    <fieldset className="grid grid-cols-7 gap-1.5 border-0 p-0">
      <legend className="sr-only">Дни окна записи</legend>
      {days.map((day) => {
        const isSelected = day.date === selectedDate;
        const isEmpty = day.slots.length === 0;

        return (
          <button
            key={day.date}
            type="button"
            disabled={isEmpty}
            aria-pressed={isSelected}
            onClick={() => onSelectDate(day.date)}
            className={cn(
              "flex min-h-20 flex-col items-center justify-center gap-1 border px-1 py-2 text-center transition-colors",
              "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
              isSelected && "border-foreground bg-foreground text-background hover:bg-foreground",
            )}
          >
            <span className="text-xs font-semibold tracking-wide uppercase">
              {formatShortDay(day.date)}
            </span>
            <span className="text-[0.65rem] leading-tight tracking-wide uppercase">
              {formatPlaces(day.slots.length)}
            </span>
          </button>
        );
      })}
    </fieldset>
  );
}
