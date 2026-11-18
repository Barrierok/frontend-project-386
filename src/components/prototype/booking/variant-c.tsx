"use client";

import { CalendarDays, Check, Clock, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  useBookingDemo,
  type BookingScenario,
  type GuestErrors,
} from "@/components/prototype/booking/booking-demo";
import { formatDuration } from "@/components/prototype/mock-data";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VariantCProps = {
  today: string;
  scenario: BookingScenario;
};

// Вариант C: календарная сетка 14 дней, время — панелью, форма — в шторке.
export function VariantC({ today, scenario }: VariantCProps) {
  const demo = useBookingDemo(today, scenario);
  const [errors, setErrors] = useState<GuestErrors>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dayIso, setDayIso] = useState<string | null>(null);

  const activeDay =
    demo.days.find((day) => day.iso === dayIso) ??
    demo.days.find((day) => day.slots.some((slot) => slot.available)) ??
    demo.days[0];

  function handleConfirm() {
    if (demo.confirm(setErrors) === "conflict") {
      setSheetOpen(false);
    }
  }

  if (demo.phase === "success") {
    return <SuccessTicket name={demo.guest.name} slot={demo.selectedSlot} onReset={demo.reset} />;
  }

  return (
    <main className="flex-1 pb-28">
      <section className="mx-auto w-full max-w-5xl px-6 py-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">
              Прототип · вариант C
            </p>
            <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight uppercase">
              Запись на звонок
            </h1>
            <p className="mt-2 text-muted-foreground">Выберите день, затем время. Время МСК.</p>
          </div>

          {demo.eventTypes.length > 0 && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Тип события
              </span>
              <select
                value={demo.selectedType?.id}
                onChange={(event) => {
                  demo.selectType(event.target.value);
                  setDayIso(null);
                  setSheetOpen(false);
                }}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                {demo.eventTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} · {formatDuration(type.duration)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {demo.phase === "conflict" && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            <span className="font-semibold">Это время уже занято.</span>
            <span>Выберите другой слот — контакты сохранены.</span>
          </div>
        )}

        {demo.eventTypes.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed px-6 py-16 text-center">
            <CalendarDays className="mx-auto size-6 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-heading text-lg font-semibold">Пока нет типов событий</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Владелец календаря ещё не добавил ни одного типа события.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 rounded-xl border p-4">
              <div className="grid grid-cols-7 gap-2">
                {demo.days.map((day) => {
                  const free = day.slots.filter((slot) => slot.available).length;
                  const active = activeDay?.iso === day.iso;
                  return (
                    <button
                      key={day.iso}
                      type="button"
                      disabled={free === 0}
                      onClick={() => {
                        setDayIso(day.iso);
                        setSheetOpen(false);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border px-1 py-3 transition-colors",
                        active && "border-primary bg-primary/5",
                        free === 0 && "opacity-40",
                        free > 0 && !active && "hover:border-foreground/30",
                      )}
                    >
                      <span className="text-[0.65rem] tracking-wide text-muted-foreground uppercase">
                        {day.weekday.slice(0, 2)}
                      </span>
                      <span className="font-heading text-lg leading-none font-semibold">
                        {day.dayNumber}
                      </span>
                      <span className="text-[0.65rem] text-muted-foreground">{day.month}</span>
                      <span
                        className={cn(
                          "mt-1 text-[0.65rem] font-semibold",
                          free > 0 ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {free > 0 ? `${free} мест` : "нет"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 rounded-xl border bg-muted/20 p-5">
              {activeDay ? (
                <>
                  <h2 className="font-heading text-lg font-semibold capitalize">
                    {activeDay.weekday}, {activeDay.dayNumber} {activeDay.month}
                  </h2>

                  {activeDay.slots.some((slot) => slot.available) ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeDay.slots
                        .filter((slot) => slot.available)
                        .map((slot) => (
                          <button
                            key={slot.time}
                            type="button"
                            onClick={() => {
                              demo.selectSlot(activeDay, slot.time);
                              setErrors({});
                              setSheetOpen(true);
                            }}
                            className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
                          >
                            {slot.time}
                          </button>
                        ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      В этот день свободных слотов нет.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Свободных слотов нет.</p>
              )}
            </div>
          </>
        )}
      </section>

      {sheetOpen && demo.selectedSlot && demo.selectedType && (
        <dialog
          open
          aria-labelledby="c-sheet-title"
          className="fixed inset-0 z-40 m-0 flex h-full max-h-none w-full max-w-none items-end justify-center border-0 bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
        >
          <div className="w-full max-w-md rounded-t-2xl bg-background p-6 shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="c-sheet-title" className="font-heading text-xl font-semibold">
                  Подтверждение записи
                </h2>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4" aria-hidden />
                  {demo.selectedSlot.weekday}, {demo.selectedSlot.dayNumber}{" "}
                  {demo.selectedSlot.month}, {demo.selectedSlot.time} ·{" "}
                  {formatDuration(demo.selectedType.duration)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => setSheetOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                handleConfirm();
              }}
            >
              <div className="space-y-1.5">
                <label htmlFor="c-name" className="text-sm font-medium">
                  Имя
                </label>
                <input
                  id="c-name"
                  value={demo.guest.name}
                  onChange={(event) => demo.setGuest({ ...demo.guest, name: event.target.value })}
                  aria-invalid={Boolean(errors.name)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Как к вам обращаться"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="c-email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="c-email"
                  type="email"
                  value={demo.guest.email}
                  onChange={(event) => demo.setGuest({ ...demo.guest, email: event.target.value })}
                  aria-invalid={Boolean(errors.email)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="name@example.com"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <Button type="submit" size="lg" className="w-full">
                Подтвердить запись
              </Button>
            </form>
          </div>
        </dialog>
      )}
    </main>
  );
}

function SuccessTicket({
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
      <section className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="grid overflow-hidden rounded-2xl border sm:grid-cols-[200px_1fr]">
          <div className="flex flex-col items-center justify-center gap-1 bg-primary px-6 py-8 text-primary-foreground">
            <Check className="size-8" aria-hidden />
            <p className="mt-2 text-xs font-semibold tracking-widest uppercase">Записано</p>
          </div>

          <div className="px-6 py-8">
            <h1 className="font-heading text-3xl font-extrabold tracking-tight uppercase">
              {slot ? slot.time : "Готово"}
            </h1>
            <p className="mt-1 text-lg font-medium capitalize">
              {slot ? `${slot.weekday}, ${slot.dayNumber} ${slot.month}` : "Запись создана"}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {name.trim() ? `${name.trim()}, спасибо!` : "Спасибо!"} Владелец календаря увидит
              запись в админке.
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button onClick={onReset} variant="outline">
                Записаться ещё раз
              </Button>
              <Link href="/" className={buttonVariants({ variant: "ghost" })}>
                На главную
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
