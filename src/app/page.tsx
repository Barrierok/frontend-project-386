import { ArrowRight, CalendarDays, CircleCheck, Clock } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Clock,
    title: "Тип встречи",
    description: "Выберите формат на 15 или 30 минут — столько, сколько нужно для разговора.",
  },
  {
    icon: CalendarDays,
    title: "Свободные слоты",
    description: "Календарь на две недели показывает только время, доступное для записи.",
  },
  {
    icon: CircleCheck,
    title: "Подтверждение",
    description: "Оставьте имя и email — запись сразу появится у владельца календаря.",
  },
];

const steps = [
  {
    title: "Выберите тип встречи",
    description: "Короткий звонок на 15 минут или разговор на 30 — решаете вы.",
  },
  {
    title: "Найдите свободный слот",
    description: "Календарь на две недели покажет только время, доступное для записи.",
  },
  {
    title: "Подтвердите запись",
    description: "Оставьте имя и email — владелец календаря сразу увидит новую запись.",
  },
];

export default function Page() {
  return (
    <main className="flex-1">
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 -left-32 size-[36rem] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -top-24 right-0 size-[30rem] rounded-full bg-muted blur-3xl" />
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-8 px-6 py-24 sm:py-32">
          <Badge variant="secondary">Быстрая запись на звонок</Badge>

          <h1 className="max-w-3xl font-heading text-6xl font-extrabold tracking-tight uppercase sm:text-8xl">
            CALENDAR
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            Забронируйте встречу за минуту: выберите тип встречи и удобное время.
          </p>

          <Link href="/booking" className={buttonVariants({ size: "lg" })}>
            Записаться
            <ArrowRight data-icon="inline-end" aria-hidden />
          </Link>
        </div>
      </section>

      <section aria-labelledby="features-heading" className="border-t">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <h2
            id="features-heading"
            className="font-heading text-3xl font-semibold tracking-wider uppercase"
          >
            Возможности
          </h2>

          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <li key={title}>
                <Card className="h-full">
                  <CardHeader>
                    <Icon className="size-6 text-primary" aria-hidden />
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="steps-heading" className="border-t">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <h2
            id="steps-heading"
            className="font-heading text-3xl font-semibold tracking-wider uppercase"
          >
            Как это работает
          </h2>

          <ol className="mt-10 grid gap-10 lg:grid-cols-3">
            {steps.map(({ title, description }, index) => (
              <li key={title} className="flex flex-col gap-3 border-t pt-6">
                <span aria-hidden className="font-heading text-sm font-semibold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="font-heading text-xl font-semibold">{title}</h3>
                <p className="leading-relaxed text-muted-foreground">{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="cta-heading" className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-8 px-6 py-20">
          <h2
            id="cta-heading"
            className="max-w-2xl font-heading text-4xl font-extrabold tracking-tight uppercase sm:text-5xl"
          >
            Готовы записаться?
          </h2>

          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            Выберите тип встречи и удобный слот — остальное займёт минуту.
          </p>

          <Link href="/booking" className={buttonVariants({ size: "lg" })}>
            Записаться
            <ArrowRight data-icon="inline-end" aria-hidden />
          </Link>
        </div>
      </section>
    </main>
  );
}
