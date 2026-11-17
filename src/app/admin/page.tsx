import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Админка",
  description: "Управление типами встреч и список записей скоро появится.",
};

export default function AdminPage() {
  return (
    <ComingSoon
      title="Админка"
      description="Скоро здесь появятся типы встреч и список записей гостей."
    />
  );
}
