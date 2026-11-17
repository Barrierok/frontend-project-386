import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Запись на встречу",
  description: "Выбор типа встречи и свободного слота скоро появится.",
};

export default function BookingPage() {
  return (
    <ComingSoon
      title="Запись на встречу"
      description="Скоро здесь появятся типы встреч и календарь со свободными слотами. Запись займёт минуту."
    />
  );
}
