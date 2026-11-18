"use client";

import { AdminVariantA } from "@/components/prototype/admin/variant-a";
import { AdminVariantB } from "@/components/prototype/admin/variant-b";
import { AdminVariantC } from "@/components/prototype/admin/variant-c";
import { PrototypeBar } from "@/components/prototype/prototype-bar";
import { adminScenarios, type AdminScenario } from "@/components/prototype/scenarios";

const variants = [
  { key: "a", label: "Форма и таблица" },
  { key: "b", label: "Панель и таймлайн" },
  { key: "c", label: "Мастер-деталь" },
];

type AdminPrototypeProps = {
  variant: string;
  scenario: AdminScenario;
  today: string;
};

export function AdminPrototype({ variant, scenario, today }: AdminPrototypeProps) {
  return (
    <>
      {variant === "b" && <AdminVariantB today={today} scenario={scenario} />}
      {variant === "c" && <AdminVariantC today={today} scenario={scenario} />}
      {variant !== "b" && variant !== "c" && <AdminVariantA today={today} scenario={scenario} />}

      <PrototypeBar
        variants={variants}
        currentVariant={variant}
        scenarios={adminScenarios}
        currentScenario={scenario}
      />
    </>
  );
}
