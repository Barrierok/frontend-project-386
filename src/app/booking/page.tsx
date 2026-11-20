import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { BookingExperience } from "@/components/booking/booking-experience";
import { BookingSkeleton } from "@/components/booking/booking-skeleton";
import { EmptyEventTypes } from "@/components/booking/empty-event-types";
import { createServerClient } from "@/server/client";

const title = "Запись на звонок";

export const metadata: Metadata = {
  title,
  description:
    "Выберите тип события, день в ближайшие две недели и свободный слот, чтобы записаться на звонок.",
};

async function BookingContent() {
  await connection();

  const client = createServerClient();
  const eventTypes = await client.eventTypes.list();

  if (eventTypes.length === 0) {
    return <EmptyEventTypes />;
  }

  return <BookingExperience eventTypes={eventTypes} />;
}

export default function BookingPage() {
  return (
    <main className="flex-1">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16 sm:py-20">
        <div className="flex flex-col gap-3">
          <h1 className="font-heading text-4xl font-extrabold tracking-tight uppercase sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            Выберите тип события, удобный день и слот — запись займёт минуту.
          </p>
        </div>

        <Suspense fallback={<BookingSkeleton />}>
          <BookingContent />
        </Suspense>
      </section>
    </main>
  );
}
