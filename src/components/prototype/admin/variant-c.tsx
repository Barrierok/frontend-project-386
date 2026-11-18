"use client";

import { CalendarDays, Plus, X } from "lucide-react";
import { useState } from "react";

import {
  emptyDraft,
  groupByDay,
  validateDraft,
  type AdminScenario,
  type EventTypeDraft,
  type EventTypeErrors,
} from "@/components/prototype/admin/admin-demo";
import {
  buildMockBookings,
  formatDuration,
  mockEventTypes,
  type EventType,
} from "@/components/prototype/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VariantCProps = {
  today: string;
  scenario: AdminScenario;
};

// Вариант C: список типов слева, лента записей справа, создание — в модальном окне.
export function AdminVariantC({ today, scenario }: VariantCProps) {
  const [eventTypes, setEventTypes] = useState<EventType[]>(
    scenario === "empty-types" ? [] : mockEventTypes,
  );
  const [activeTypeId, setActiveTypeId] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<EventTypeDraft>(emptyDraft);
  const [errors, setErrors] = useState<EventTypeErrors>({});

  const allBookings =
    scenario === "empty-bookings" || eventTypes.length === 0 ? [] : buildMockBookings(today);
  const bookings =
    activeTypeId === "all"
      ? allBookings
      : allBookings.filter(({ eventTypeId }) => eventTypeId === activeTypeId);
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

    const nextType = {
      id: draft.id,
      name: draft.name.trim(),
      description: draft.description.trim(),
      duration: Number(draft.duration),
    };
    setEventTypes((current) => [...current, nextType]);
    setActiveTypeId(nextType.id);
    setDraft(emptyDraft);
    setErrors({});
    setModalOpen(false);
  }

  return (
    <main className="flex-1 pb-28">
      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">
              Прототип · вариант C
            </p>
            <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight uppercase">
              Календарь владельца
            </h1>
            <p className="mt-2 text-muted-foreground">
              Типы событий слева, предстоящие записи — справа.
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus data-icon="inline-start" aria-hidden />
            Новый тип события
          </Button>
        </div>

        <div className="mt-8 grid overflow-hidden rounded-xl border lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-b bg-muted/20 p-4 lg:border-r lg:border-b-0">
            <h2 className="px-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Типы событий
            </h2>

            <ul className="mt-3 space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTypeId("all")}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm",
                    activeTypeId === "all" ? "bg-background shadow-sm" : "hover:bg-background/60",
                  )}
                >
                  <span className="font-semibold">Все типы</span>
                  <span className="text-xs text-muted-foreground">{allBookings.length}</span>
                </button>
              </li>

              {eventTypes.map((type) => {
                const count = allBookings.filter(
                  ({ eventTypeId }) => eventTypeId === type.id,
                ).length;
                return (
                  <li key={type.id}>
                    <button
                      type="button"
                      onClick={() => setActiveTypeId(type.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm",
                        activeTypeId === type.id
                          ? "bg-background shadow-sm"
                          : "hover:bg-background/60",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{type.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatDuration(type.duration)} · {type.id}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {eventTypes.length === 0 && (
              <p className="mt-4 rounded-lg border border-dashed px-3 py-4 text-xs text-muted-foreground">
                Пока ни одного типа события.
              </p>
            )}
          </aside>

          <div className="p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-heading text-lg font-semibold">
                Предстоящие записи
                {activeTypeId !== "all" && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {eventTypes.find(({ id }) => id === activeTypeId)?.name}
                  </span>
                )}
              </h2>
              <span className="text-xs text-muted-foreground">{bookings.length} шт.</span>
            </div>

            {groups.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed px-6 py-16 text-center">
                <CalendarDays className="mx-auto size-6 text-muted-foreground" aria-hidden />
                <p className="mt-3 font-semibold">Записей пока нет</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeTypeId === "all"
                    ? "Как только гость запишется, запись появится здесь."
                    : "По этому типу события ещё никто не записался."}
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-6">
                {groups.map(({ label, items }) => (
                  <div key={label}>
                    <p className="text-xs font-semibold tracking-widest text-muted-foreground capitalize uppercase">
                      {label}
                    </p>
                    <ul className="mt-2 space-y-2">
                      {items.map((booking) => (
                        <li
                          key={booking.id}
                          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm"
                        >
                          <span className="font-heading text-base font-semibold">
                            {booking.time}
                          </span>
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
        </div>
      </section>

      {modalOpen && (
        <dialog
          open
          aria-labelledby="c-admin-modal-title"
          className="fixed inset-0 z-40 m-0 flex h-full max-h-none w-full max-w-none items-end justify-center border-0 bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-background p-6 shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="c-admin-modal-title" className="font-heading text-xl font-semibold">
                  Новый тип события
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Появится в списке у гостя сразу после создания.
                </p>
              </div>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmit();
              }}
            >
              <div className="space-y-1.5">
                <label htmlFor="c-admin-id" className="text-sm font-medium">
                  Слаг
                </label>
                <input
                  id="c-admin-id"
                  value={draft.id}
                  onChange={(event) => setDraft({ ...draft, id: event.target.value })}
                  aria-invalid={Boolean(errors.id)}
                  placeholder="call-15"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                {errors.id && <p className="text-xs text-destructive">{errors.id}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="c-admin-name" className="text-sm font-medium">
                  Название
                </label>
                <input
                  id="c-admin-name"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  aria-invalid={Boolean(errors.name)}
                  placeholder="Короткий звонок"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="c-admin-description" className="text-sm font-medium">
                  Описание
                </label>
                <textarea
                  id="c-admin-description"
                  rows={3}
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  aria-invalid={Boolean(errors.description)}
                  placeholder="Что обсудим на встрече"
                  className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                {errors.description && (
                  <p className="text-xs text-destructive">{errors.description}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="c-admin-duration" className="text-sm font-medium">
                  Длительность
                </label>
                <select
                  id="c-admin-duration"
                  value={draft.duration}
                  onChange={(event) => setDraft({ ...draft, duration: event.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="15">15 минут</option>
                  <option value="30">30 минут</option>
                  <option value="45">45 минут</option>
                  <option value="60">60 минут</option>
                </select>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" className="flex-1">
                  Создать тип события
                </Button>
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                  Отмена
                </Button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </main>
  );
}
