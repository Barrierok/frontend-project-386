"use client";

import { CalendarDays, Check, Clock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  useBookingDemo,
  type BookingScenario,
  type GuestErrors,
} from "@/components/prototype/booking/booking-demo";
import { formatDuration, type DaySlots } from "@/components/prototype/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type VariantAProps = {
  today: string;
  scenario: BookingScenario;
};

// Вариант A: недельная сетка слотов + липкая панель подтверждения.
export function VariantA({ today, scenario }: VariantAProps) {
  const demo = useBookingDemo(today, scenario);
  const [week, setWeek] = useState(0);
  const [errors, setErrors] = useState<GuestErrors>({});

  const visibleDays = demo.days.slice(week * 7, week * 7 + 7);
  const hasAnySlot = demo.days.some((day) => day.slots.some((slot) => slot.available));

  function handleConfirm() {
    demo.confirm(setErrors);
  }

  if (demo.phase === "success") {
    return <SuccessPanel name={demo.guest.name} slot={demo.selectedSlot} onReset={demo.reset} />;
  }

  return (
    <main className="flex-1 pb-28">
      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">
            Прототип · вариант A
          </p>
          <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight uppercase sm:text-5xl">
            Выберите время звонка
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Ближайшие 14 дней, время московское. Сначала выберите тип события.
          </p>
        </header>

        {demo.eventTypes.length === 0 ? (
          <EmptyTypes />
        ) : (
          <>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
              {demo.eventTypes.map((type) => {
                const active = demo.selectedType?.id === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => demo.selectType(type.id)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:border-foreground/30",
                    )}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-heading font-semibold">{type.name}</span>
                      <Badge variant={active ? "default" : "secondary"}>
                        {formatDuration(type.duration)}
                      </Badge>
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {type.description}
                    </span>
                  </button>
                );
              })}
            </div>

            {demo.phase === "conflict" && (
              <div
                role="alert"
                className="mt-6 max-w-2xl rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
              >
                Это время уже занято, выберите другой слот. Ваши имя и email сохранены.
              </div>
            )}

            <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
                    Свободное время
                  </h2>
                  <div className="flex gap-1 rounded-full border p-1">
                    <button
                      type="button"
                      onClick={() => setWeek(0)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        week === 0 ? "bg-foreground text-background" : "text-muted-foreground",
                      )}
                    >
                      Эта неделя
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeek(1)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        week === 1 ? "bg-foreground text-background" : "text-muted-foreground",
                      )}
                    >
                      Следующая
                    </button>
                  </div>
                </div>

                {!hasAnySlot ? (
                  <div className="mt-4 rounded-xl border border-dashed px-6 py-12 text-center">
                    <CalendarDays className="mx-auto size-6 text-muted-foreground" aria-hidden />
                    <p className="mt-3 font-semibold">Свободных слотов нет</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      На ближайшие 14 дней всё занято. Загляните позже.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                    {visibleDays.map((day) => (
                      <DayColumn
                        key={day.iso}
                        day={day}
                        selectedTime={
                          demo.selectedSlot?.dayIso === day.iso ? demo.selectedSlot.time : null
                        }
                        onSelect={(time) => demo.selectSlot(day, time)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <aside className="h-fit rounded-xl border p-5 lg:sticky lg:top-20">
                <h2 className="font-heading text-lg font-semibold">Ваша запись</h2>

                {demo.selectedType && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {demo.selectedType.name} · {formatDuration(demo.selectedType.duration)}
                  </p>
                )}

                <div className="mt-4 rounded-lg bg-muted/60 px-3 py-3 text-sm">
                  {demo.selectedSlot ? (
                    <span className="flex items-center gap-2 font-medium">
                      <Clock className="size-4 text-primary" aria-hidden />
                      {demo.selectedSlot.weekday}, {demo.selectedSlot.dayNumber}{" "}
                      {demo.selectedSlot.month}, {demo.selectedSlot.time}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Выберите слот в календаре слева.</span>
                  )}
                </div>

                <form
                  className="mt-5 space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleConfirm();
                  }}
                >
                  <div className="space-y-1.5">
                    <label htmlFor="a-name" className="text-sm font-medium">
                      Имя
                    </label>
                    <input
                      id="a-name"
                      value={demo.guest.name}
                      onChange={(event) =>
                        demo.setGuest({ ...demo.guest, name: event.target.value })
                      }
                      aria-invalid={Boolean(errors.name)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      placeholder="Как к вам обращаться"
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="a-email" className="text-sm font-medium">
                      Email
                    </label>
                    <input
                      id="a-email"
                      type="email"
                      value={demo.guest.email}
                      onChange={(event) =>
                        demo.setGuest({ ...demo.guest, email: event.target.value })
                      }
                      aria-invalid={Boolean(errors.email)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      placeholder="name@example.com"
                    />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>

                  <Button type="submit" className="w-full" disabled={!demo.selectedSlot}>
                    Подтвердить запись
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Время московское. Отменить запись нельзя.
                  </p>
                </form>
              </aside>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function DayColumn({
  day,
  selectedTime,
  onSelect,
}: {
  day: DaySlots;
  selectedTime: string | null;
  onSelect: (time: string) => void;
}) {
  const free = day.slots.filter((slot) => slot.available);

  return (
    <div className="rounded-lg border">
      <div className="border-b bg-muted/40 px-2 py-2 text-center">
        <p className="text-[0.7rem] tracking-wide text-muted-foreground uppercase">{day.weekday}</p>
        <p className="font-heading text-sm font-semibold">
          {day.dayNumber} {day.month}
        </p>
      </div>
      <div className="flex flex-col gap-1 p-1.5">
        {free.length === 0 ? (
          <p className="py-4 text-center text-[0.7rem] text-muted-foreground">занято</p>
        ) : (
          free.map((slot) => (
            <button
              key={slot.time}
              type="button"
              onClick={() => onSelect(slot.time)}
              className={cn(
                "rounded-md border px-1 py-1.5 text-xs font-medium transition-colors",
                slot.time === selectedTime
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:border-primary hover:text-primary",
              )}
            >
              {slot.time}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function EmptyTypes() {
  return (
    <Card className="mt-8 max-w-2xl">
      <CardHeader>
        <CardTitle>Пока нет типов событий</CardTitle>
        <CardDescription>
          Владелец календаря ещё не добавил ни одного типа события. Зайдите позже.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function SuccessPanel({
  name,
  slot,
  onReset,
}: {
  name: string;
  slot: { weekday: string; dayNumber: string; month: string; time: string } | null;
  onReset: () => void;
}) {
  return (
    <main className="flex-1 pb-28">
      <section className="mx-auto w-full max-w-2xl px-6 py-16">
        <div className="rounded-2xl border p-8 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="size-6" aria-hidden />
          </span>
          <h1 className="mt-5 font-heading text-3xl font-extrabold tracking-tight uppercase">
            Запись создана
          </h1>
          <p className="mt-2 text-muted-foreground">
            {name.trim() ? `${name.trim()}, вы записаны.` : "Вы записаны."} Владелец календаря
            увидит запись в админке.
          </p>

          {slot && (
            <div className="mx-auto mt-6 max-w-sm rounded-lg bg-muted/60 px-4 py-3 text-sm">
              <p className="font-semibold">
                {slot.weekday}, {slot.dayNumber} {slot.month}, {slot.time} (МСК)
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={onReset} variant="outline">
              Записаться ещё раз
            </Button>
            <Link href="/" className={buttonVariants({ variant: "ghost" })}>
              На главную
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
