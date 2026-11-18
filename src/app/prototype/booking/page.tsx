import type { Metadata } from "next";
import { connection } from "next/server";

import { BookingPrototype } from "@/components/prototype/booking/booking-prototype";
import { moscowToday } from "@/components/prototype/mock-data";
import { bookingScenarios, type BookingScenario } from "@/components/prototype/scenarios";

export const metadata: Metadata = {
  title: "Прототип: запись",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickScenario(value: string | string[] | undefined): BookingScenario {
  const match = bookingScenarios.find(({ key }) => key === value);
  return match?.key ?? "default";
}

export const instant = false;

// ПРОТОТИП. Одноразовая страница для обсуждения /booking.
export default async function PrototypeBookingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  await connection();
  const variant = typeof params.variant === "string" ? params.variant : "a";
  const scenario = pickScenario(params.scenario);

  return <BookingPrototype variant={variant} scenario={scenario} today={moscowToday()} />;
}
