import type { Metadata } from "next";
import { connection } from "next/server";

import { AdminPrototype } from "@/components/prototype/admin/admin-prototype";
import { moscowToday } from "@/components/prototype/mock-data";
import { adminScenarios, type AdminScenario } from "@/components/prototype/scenarios";

export const metadata: Metadata = {
  title: "Прототип: админка",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickScenario(value: string | string[] | undefined): AdminScenario {
  const match = adminScenarios.find(({ key }) => key === value);
  return match?.key ?? "default";
}

export const instant = false;

// ПРОТОТИП. Одноразовая страница для обсуждения /admin.
export default async function PrototypeAdminPage({ searchParams }: PageProps) {
  const params = await searchParams;
  await connection();
  const variant = typeof params.variant === "string" ? params.variant : "a";
  const scenario = pickScenario(params.scenario);

  return <AdminPrototype variant={variant} scenario={scenario} today={moscowToday()} />;
}
