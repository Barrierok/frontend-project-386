"use client";

import { CalendarDays, CircleCheck, Plus } from "lucide-react";
import { useState } from "react";

import {
  emptyDraft,
  groupByDay,
  validateDraft,
  type AdminScenario,
  type EventTypeDraft,
} from "@/components/prototype/admin/admin-demo";
import {
  buildMockBookings,
  formatDuration,
  mockEventTypes,
  type EventType,
} from "@/components/prototype/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type VariantBProps = {
  today: string;
  scenario: AdminScenario;
};

// Вариант B: компактная панель создания сверху, типы карточками, записи таймлайном.
export function AdminVariantB({ today, scenario }: VariantBProps) {
  const [eventTypes, setEventTypes] = useState<EventType[]>(
    scenario === "empty-types" ? [] : mockEventTypes,
  );
  const [draft, setDraft] = useState<EventTypeDraft>(emptyDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<string | null>(null);

  const bookings =
    scenario === "empty-bookings" || eventTypes.length === 0 ? [] : buildMockBookings(today);
  const groups = groupByDay(bookings);

  function handleSubmit() {
    const nextErrors = validateDraft(
      draft,
      eventTypes.map(({ id }) => id),
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setEventTypes((current) => [
      ...current,
      {
        id: draft.id,
        name: draft.name.trim(),
        description: draft.description.trim(),
        duration: Number(draft.duration),
      },
    ]);
    setCreated(draft.name.trim());
    setDraft(emptyDraft);
  }

  return (
    <main className="flex-1 pb-28">
      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">
              Прототип · вариант B
            </p>
            <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight uppercase">
              Календарь владельца
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {eventTypes.length} типов · {bookings.length} предстоящих записей
          </p>
        </div>

        <form
          className="mt-8 rounded-xl border bg-muted/20 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            <Plus className="size-3.5" aria-hidden />
            Новый тип события
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1.4fr_2fr_140px_auto]">
            <input
              aria-label="Слаг"
              value={draft.id}
              onChange={(event) => setDraft({ ...draft, id: event.target.value })}
              placeholder="call-15"
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
            <input
              aria-label="Название"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Короткий звонок"
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
            <input
              aria-label="Описание"
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              placeholder="Короткое описание для гостя"
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
            <select
              aria-label="Длительность"
              value={draft.duration}
              onChange={(event) => setDraft({ ...draft, duration: event.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="15">15 минут</option>
              <option value="30">30 минут</option>
              <option value="45">45 минут</option>
              <option value="60">60 минут</option>
            </select>
            <Button type="submit">Создать</Button>
          </div>

          {Object.keys(errors).length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-destructive">
              {Object.entries(errors).map(([field, message]) => (
                <li key={field}>{message}</li>
              ))}
            </ul>
          )}

          {created && (
            <p className="mt-3 flex items-center gap-2 text-xs text-primary">
              <CircleCheck className="size-3.5" aria-hidden />«{created}» создан.
            </p>
          )}
        </form>

        <div className="mt-10">
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Типы событий
          </h2>

          {eventTypes.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
              Пока ни одного типа события. Создайте первый — гости увидят его сразу.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {eventTypes.map((type) => {
                const count = bookings.filter(({ eventTypeId }) => eventTypeId === type.id).length;
                return (
                  <div key={type.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-heading font-semibold">{type.name}</p>
                      <Badge>{formatDuration(type.duration)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{type.description}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {type.id} · {count} записей
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-10">
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Предстоящие записи
          </h2>

          {groups.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed px-6 py-14 text-center">
              <CalendarDays className="mx-auto size-6 text-muted-foreground" aria-hidden />
              <p className="mt-3 font-semibold">Записей пока нет</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Новые записи появятся здесь по мере бронирования.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-6">
              {groups.map(({ label, items }) => (
                <div key={label} className="grid gap-2 sm:grid-cols-[140px_1fr]">
                  <p className="pt-2 text-sm font-semibold capitalize">{label}</p>
                  <ul className="divide-y rounded-xl border">
                    {items.map((booking) => (
                      <li
                        key={booking.id}
                        className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm"
                      >
                        <span className="w-12 font-medium">{booking.time}</span>
                        <span className="font-medium">{booking.guestName}</span>
                        <span className="text-muted-foreground">{booking.guestEmail}</span>
                        <Badge variant="secondary" className="ml-auto">
                          {eventTypes.find(({ id }) => id === booking.eventTypeId)?.name}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
