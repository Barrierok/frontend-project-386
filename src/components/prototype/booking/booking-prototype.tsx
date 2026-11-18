"use client";

import { VariantA } from "@/components/prototype/booking/variant-a";
import { VariantB } from "@/components/prototype/booking/variant-b";
import { VariantC } from "@/components/prototype/booking/variant-c";
import { PrototypeBar } from "@/components/prototype/prototype-bar";
import { bookingScenarios, type BookingScenario } from "@/components/prototype/scenarios";

const variants = [
  { key: "a", label: "Недельная сетка" },
  { key: "b", label: "Пошаговый список" },
  { key: "c", label: "Календарь и шторка" },
];

type BookingPrototypeProps = {
  variant: string;
  scenario: BookingScenario;
  today: string;
};

export function BookingPrototype({ variant, scenario, today }: BookingPrototypeProps) {
  return (
    <>
      {variant === "b" && <VariantB today={today} scenario={scenario} />}
      {variant === "c" && <VariantC today={today} scenario={scenario} />}
      {variant !== "b" && variant !== "c" && <VariantA today={today} scenario={scenario} />}

      <PrototypeBar
        variants={variants}
        currentVariant={variant}
        scenarios={bookingScenarios}
        currentScenario={scenario}
      />
    </>
  );
}
