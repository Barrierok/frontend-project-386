import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

const title = "Админка";

export const metadata: Metadata = {
  title,
  description: "Управление типами встреч и список записей скоро появятся.",
};

export default function AdminPage() {
  return (
    <ComingSoon
      title={title}
      description="Скоро здесь появятся типы встреч и список записей гостей."
    />
  );
}
