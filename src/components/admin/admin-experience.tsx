"use client";

import { useState } from "react";

import { CreateEventTypeDialog } from "@/components/admin/create-event-type-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Booking, EventType } from "@/contract/schemas";
import { formatLongDay, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type AdminExperienceProps = {
  eventTypes: EventType[];
  bookings: Booking[];
};

const moscowDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Moscow",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function groupByDay(bookings: Booking[]): { date: string; bookings: Booking[] }[] {
  const groups = new Map<string, Booking[]>();

  for (const booking of bookings) {
    const date = moscowDayFormatter.format(new Date(booking.startsAt));

    const group = groups.get(date) ?? [];
    group.push(booking);
    groups.set(date, group);
  }

  return [...groups.entries()].map(([date, dayBookings]) => ({ date, bookings: dayBookings }));
}

function countBookings(bookings: Booking[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const booking of bookings) {
    counts.set(booking.eventType.id, (counts.get(booking.eventType.id) ?? 0) + 1);
  }

  return counts;
}

export function AdminExperience({ eventTypes: initialEventTypes, bookings }: AdminExperienceProps) {
  const [eventTypes, setEventTypes] = useState(initialEventTypes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const counts = countBookings(bookings);
  const filtered = selectedId
    ? bookings.filter(({ eventType }) => eventType.id === selectedId)
    : bookings;
  const groups = groupByDay(filtered);

  return (
    <div className="grid gap-10 lg:grid-cols-[18rem_1fr]">
      <aside aria-labelledby="event-types-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="event-types-heading" className="font-heading text-xl font-semibold tracking-wide">
            Типы событий
          </h2>
          <Button type="button" size="xs" variant="outline" onClick={() => setCreateOpen(true)}>
            Новый тип
          </Button>
        </div>

        {eventTypes.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Пока ни одного типа события.
          </p>
        ) : (
          <ul className="flex flex-col">
            <li>
              <button
                type="button"
                aria-pressed={selectedId === null}
                onClick={() => {
                  setSelectedId(null);
                  setCreatedId(null);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 border-b px-2 py-3 text-left text-sm transition-colors hover:bg-muted",
                  selectedId === null && "bg-foreground text-background hover:bg-foreground",
                )}
              >
                <span className="font-semibold">Все типы</span>
                <span className="text-xs font-semibold">{bookings.length}</span>
              </button>
            </li>
            {eventTypes.map((eventType) => (
              <li key={eventType.id}>
                <button
                  type="button"
                  aria-pressed={selectedId === eventType.id}
                  onClick={() => {
                    setSelectedId(eventType.id);
                    setCreatedId(null);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 border-b px-2 py-3 text-left text-sm transition-colors hover:bg-muted",
                    selectedId === eventType.id &&
                      "bg-foreground text-background hover:bg-foreground",
                    createdId === eventType.id && "ring-2 ring-primary ring-inset",
                  )}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    {eventType.title}
                    {createdId === eventType.id ? <Badge variant="secondary">Новый</Badge> : null}
                  </span>
                  <span className="text-xs font-semibold">{counts.get(eventType.id) ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section aria-labelledby="feed-heading" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <h2 id="feed-heading" className="font-heading text-xl font-semibold tracking-wide">
            Предстоящие записи
          </h2>
          <Badge variant="secondary">{filtered.length}</Badge>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {selectedId
              ? "По этому типу события записей пока нет."
              : "Записей пока нет — гости ещё не выбрали время."}
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {groups.map((group) => (
              <section key={group.date} aria-label={formatLongDay(group.date)}>
                <h3 className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  {formatLongDay(group.date)}
                </h3>
                <ul className="flex flex-col">
                  {group.bookings.map((booking) => (
                    <li
                      key={booking.id}
                      className="grid gap-1 border-b py-3 sm:grid-cols-[5rem_1fr_1fr] sm:items-baseline sm:gap-4"
                    >
                      <time
                        dateTime={booking.startsAt}
                        className="text-sm font-semibold tabular-nums"
                      >
                        {formatTime(booking.startsAt)}
                      </time>
                      <span className="text-sm font-semibold">{booking.guestName}</span>
                      <span className="text-sm text-muted-foreground">{booking.guestEmail}</span>
                      <span className="text-xs tracking-wide text-muted-foreground uppercase sm:col-span-3">
                        {booking.eventType.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>

      <CreateEventTypeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(created) => {
          setEventTypes((current) => [...current, created]);
          setSelectedId(created.id);
          setCreatedId(created.id);
          setCreateOpen(false);
        }}
      />
    </div>
  );
}
