"use client";

import type { DaySlots } from "@/contract/schemas";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type TimePanelProps = {
  day: DaySlots | undefined;
  selectedStartsAt: string | null;
  onSelectSlot: (startsAt: string) => void;
};

export function TimePanel({ day, selectedStartsAt, onSelectSlot }: TimePanelProps) {
  if (!day || day.slots.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        В этот день свободных слотов нет.
      </p>
    );
  }

  return (
    <fieldset className="flex flex-wrap gap-2 border-0 p-0">
      <legend className="sr-only">Свободные слоты</legend>
      {day.slots.map((slot) => {
        const isSelected = slot.startsAt === selectedStartsAt;

        return (
          <button
            key={slot.startsAt}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelectSlot(slot.startsAt)}
            className={cn(
              "border px-4 py-2 text-sm font-semibold transition-colors",
              "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
              isSelected && "border-foreground bg-foreground text-background hover:bg-foreground",
            )}
          >
            {formatTime(slot.startsAt)}
          </button>
        );
      })}
    </fieldset>
  );
}
