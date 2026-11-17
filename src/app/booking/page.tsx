import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

const title = "Запись на звонок";

export const metadata: Metadata = {
  title,
  description: "Выбор типа встречи и свободного слота скоро появится.",
};

export default function BookingPage() {
  return (
    <ComingSoon
      title={title}
      description="Скоро здесь появятся типы встреч и календарь со свободными слотами. Запись займёт минуту."
    />
  );
}
