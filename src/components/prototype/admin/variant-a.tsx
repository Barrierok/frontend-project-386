"use client";

import { CalendarDays, CircleCheck } from "lucide-react";
import { useState } from "react";

import {
  emptyDraft,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type VariantAProps = {
  today: string;
  scenario: AdminScenario;
};

// Вариант A: форма создания слева, таблица предстоящих записей справа.
export function AdminVariantA({ today, scenario }: VariantAProps) {
  const [eventTypes, setEventTypes] = useState<EventType[]>(
    scenario === "empty-types" ? [] : mockEventTypes,
  );
  const [draft, setDraft] = useState<EventTypeDraft>(emptyDraft);
  const [errors, setErrors] = useState<EventTypeErrors>({});
  const [created, setCreated] = useState<string | null>(null);

  const bookings =
    scenario === "empty-bookings" || eventTypes.length === 0 ? [] : buildMockBookings(today);

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
              Прототип · вариант A
            </p>
            <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight uppercase">
              Календарь владельца
            </h1>
            <p className="mt-2 text-muted-foreground">
              Типы событий и предстоящие записи в одном месте.
            </p>
          </div>
          <Badge variant="secondary">Владелец · без входа</Badge>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            <Card size="sm" className="h-fit lg:sticky lg:top-20">
              <CardHeader>
                <CardTitle>Новый тип события</CardTitle>
                <CardDescription>Появится в списке у гостя сразу.</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleSubmit();
                  }}
                >
                  <Field
                    id="a-id"
                    label="Слаг"
                    hint="call-15"
                    value={draft.id}
                    error={errors.id}
                    onChange={(value) => setDraft({ ...draft, id: value })}
                  />
                  <Field
                    id="a-name"
                    label="Название"
                    hint="Короткий звонок"
                    value={draft.name}
                    error={errors.name}
                    onChange={(value) => setDraft({ ...draft, name: value })}
                  />
                  <div className="space-y-1.5">
                    <label htmlFor="a-description" className="text-sm font-medium">
                      Описание
                    </label>
                    <textarea
                      id="a-description"
                      rows={3}
                      value={draft.description}
                      onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                      aria-invalid={Boolean(errors.description)}
                      className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      placeholder="Что обсудим на встрече"
                    />
                    {errors.description && (
                      <p className="text-xs text-destructive">{errors.description}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="a-duration" className="text-sm font-medium">
                      Длительность
                    </label>
                    <select
                      id="a-duration"
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

                  <Button type="submit" className="w-full">
                    Создать тип события
                  </Button>

                  {created && (
                    <p className="flex items-center gap-2 text-xs text-primary">
                      <CircleCheck className="size-3.5" aria-hidden />«{created}» создан.
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>

            <div className="rounded-xl border p-4">
              <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Ваши типы · {eventTypes.length}
              </h2>
              {eventTypes.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Пока ни одного типа события.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {eventTypes.map((type) => (
                    <li key={type.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{type.name}</span>
                      <Badge variant="secondary">{formatDuration(type.duration)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-heading text-xl font-semibold tracking-wide uppercase">
                Предстоящие записи
              </h2>
              <span className="text-sm text-muted-foreground">{bookings.length} шт.</span>
            </div>

            {bookings.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed px-6 py-16 text-center">
                <CalendarDays className="mx-auto size-6 text-muted-foreground" aria-hidden />
                <p className="mt-3 font-semibold">Записей пока нет</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Как только гость запишется, запись появится здесь.
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-xl border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs tracking-wide text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Когда</th>
                      <th className="px-4 py-3 font-semibold">Тип события</th>
                      <th className="px-4 py-3 font-semibold">Гость</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-medium capitalize">{booking.weekday}</span>,{" "}
                          {booking.dayNumber} {booking.month}
                          <span className="block text-xs text-muted-foreground">
                            {booking.time} · {formatDuration(booking.duration)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {mockEventTypes.find(({ id }) => id === booking.eventTypeId)?.name}
                        </td>
                        <td className="px-4 py-3">{booking.guestName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{booking.guestEmail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({
  id,
  label,
  hint,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        placeholder={hint}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
