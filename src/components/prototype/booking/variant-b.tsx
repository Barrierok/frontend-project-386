"use client";

import { ArrowLeft, CalendarDays, Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  useBookingDemo,
  type BookingScenario,
  type GuestErrors,
} from "@/components/prototype/booking/booking-demo";
import { formatDuration } from "@/components/prototype/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VariantBProps = {
  today: string;
  scenario: BookingScenario;
};

// Вариант B: пошаговый сценарий со списком дней и временем внутри дня.
export function VariantB({ today, scenario }: VariantBProps) {
  const demo = useBookingDemo(today, scenario);
  const [errors, setErrors] = useState<GuestErrors>({});

  const step = demo.selectedSlot ? 3 : demo.selectedType ? 2 : 1;
  const hasAnySlot = demo.days.some((day) => day.slots.some((slot) => slot.available));

  function handleConfirm() {
    demo.confirm(setErrors);
  }

  if (demo.phase === "success") {
    return <SuccessReceipt name={demo.guest.name} slot={demo.selectedSlot} onReset={demo.reset} />;
  }

  return (
    <main className="flex-1 pb-28">
      <section className="mx-auto w-full max-w-3xl px-6 py-12">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">
          Прототип · вариант B
        </p>
        <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight uppercase">
          Запись на звонок
        </h1>

        <ol className="mt-8 flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide uppercase">
          {["Тип события", "Слот", "Контакты"].map((label, index) => {
            const number = index + 1;
            const done = step > number;
            return (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border",
                    done && "border-primary bg-primary text-primary-foreground",
                    step === number && "border-foreground bg-foreground text-background",
                    step < number && "text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-3" aria-hidden /> : number}
                </span>
                <span className={cn(step < number && "text-muted-foreground")}>{label}</span>
                {number < 3 && (
                  <ChevronRight className="size-3 text-muted-foreground" aria-hidden />
                )}
              </li>
            );
          })}
        </ol>

        {demo.phase === "conflict" && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            <p className="font-semibold">Это время уже занято, выберите другой слот.</p>
            <p className="mt-1">Имя и email сохранены — останется только выбрать новое время.</p>
          </div>
        )}

        {demo.eventTypes.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed px-6 py-14 text-center">
            <CalendarDays className="mx-auto size-6 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-heading text-lg font-semibold">Пока нет типов событий</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Владелец календаря ещё не добавил ни одного типа события.
            </p>
          </div>
        ) : step < 3 ? (
          <>
            <fieldset className="mt-8">
              <legend className="font-heading text-lg font-semibold">1. Тип события</legend>
              <div className="mt-3 space-y-2">
                {demo.eventTypes.map((type) => (
                  <label
                    key={type.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3",
                      demo.selectedType?.id === type.id && "border-primary bg-primary/5",
                    )}
                  >
                    <input
                      type="radio"
                      name="b-event-type"
                      value={type.id}
                      checked={demo.selectedType?.id === type.id}
                      onChange={() => demo.selectType(type.id)}
                      aria-label={`Тип события: ${type.name}`}
                      className="mt-1 accent-primary"
                    />
                    <span className="flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-semibold">{type.name}</span>
                        <Badge variant="secondary">{formatDuration(type.duration)}</Badge>
                      </span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">
                        {type.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-10">
              <h2 className="font-heading text-lg font-semibold">2. Свободный слот</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ближайшие 14 дней. Время московское.
              </p>

              {!hasAnySlot ? (
                <div className="mt-4 rounded-xl border border-dashed px-6 py-12 text-center">
                  <p className="font-semibold">Свободных слотов нет</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    На ближайшие 14 дней всё занято.
                  </p>
                </div>
              ) : (
                <ul className="mt-4 divide-y rounded-xl border">
                  {demo.days.map((day) => {
                    const free = day.slots.filter((slot) => slot.available);
                    return (
                      <li
                        key={day.iso}
                        className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center"
                      >
                        <div className="w-36 shrink-0">
                          <p className="text-sm font-semibold capitalize">{day.weekday}</p>
                          <p className="text-xs text-muted-foreground">
                            {day.dayNumber} {day.month}
                          </p>
                        </div>
                        {free.length === 0 ? (
                          <p className="text-xs text-muted-foreground">свободных слотов нет</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {free.map((slot) => (
                              <button
                                key={slot.time}
                                type="button"
                                onClick={() => demo.selectSlot(day, slot.time)}
                                className={cn(
                                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                                  demo.selectedSlot?.dayIso === day.iso &&
                                    demo.selectedSlot.time === slot.time
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "hover:border-primary hover:text-primary",
                                )}
                              >
                                {slot.time}
                              </button>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        ) : (
          <div className="mt-8">
            <button
              type="button"
              onClick={demo.clearSlot}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Выбрать другое время
            </button>

            <div className="mt-4 rounded-xl border">
              <div className="border-b bg-muted/40 px-5 py-4">
                <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Вы выбрали
                </p>
                <p className="mt-1 font-heading text-xl font-semibold">
                  {demo.selectedType?.name}, {formatDuration(demo.selectedType?.duration ?? 0)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {demo.selectedSlot?.weekday}, {demo.selectedSlot?.dayNumber}{" "}
                  {demo.selectedSlot?.month}, {demo.selectedSlot?.time} (МСК)
                </p>
              </div>

              <form
                className="space-y-4 px-5 py-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleConfirm();
                }}
              >
                <h2 className="font-heading text-lg font-semibold">3. Контакты</h2>

                <div className="space-y-1.5">
                  <label htmlFor="b-name" className="text-sm font-medium">
                    Имя
                  </label>
                  <input
                    id="b-name"
                    value={demo.guest.name}
                    onChange={(event) => demo.setGuest({ ...demo.guest, name: event.target.value })}
                    aria-invalid={Boolean(errors.name)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    placeholder="Как к вам обращаться"
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="b-email" className="text-sm font-medium">
                    Email
                  </label>
                  <input
                    id="b-email"
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

                <Button type="submit" size="lg" className="w-full">
                  Подтвердить запись
                </Button>
              </form>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function SuccessReceipt({
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
      <section className="mx-auto w-full max-w-xl px-6 py-16">
        <div className="border border-dashed p-8">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">
            Готово · запись создана
          </p>
          <h1 className="mt-3 font-heading text-3xl font-extrabold tracking-tight uppercase">
            Встреча в календаре
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {name.trim() ? `${name.trim()}, спасибо!` : "Спасибо!"} Владелец календаря увидит запись
            в админке.
          </p>

          <dl className="mt-8 space-y-3 border-t pt-6 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Когда</dt>
              <dd className="text-right font-medium">
                {slot ? `${slot.weekday}, ${slot.dayNumber} ${slot.month}, ${slot.time}` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Часовой пояс</dt>
              <dd className="font-medium">Europe/Moscow</dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <Button onClick={onReset} variant="outline" className="flex-1">
              Записаться ещё раз
            </Button>
            <Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "flex-1")}>
              На главную
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
