import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { AdminExperience } from "@/components/admin/admin-experience";
import { Skeleton } from "@/components/ui/skeleton";
import { ownerProfile } from "@/lib/config";
import { createServerClient } from "@/server/client";

const title = "Админка";

export const metadata: Metadata = {
  title,
  description: "Предстоящие записи гостей и типы событий календаря.",
};

async function AdminContent() {
  await connection();

  const client = createServerClient();
  const [eventTypes, bookings] = await Promise.all([
    client.eventTypes.list(),
    client.bookings.listUpcoming(),
  ]);

  return <AdminExperience eventTypes={eventTypes} bookings={bookings} />;
}

function AdminSkeleton() {
  return (
    <div
      className="grid gap-10 lg:grid-cols-[18rem_1fr]"
      aria-busy="true"
      aria-label="Загрузка записей"
    >
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function AdminPage() {
  return (
    <main className="flex-1">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16 sm:py-20">
        <div className="flex flex-col gap-3">
          <h1 className="font-heading text-4xl font-extrabold tracking-tight uppercase sm:text-5xl">
            {title}
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            {ownerProfile.name} · {ownerProfile.email}
          </p>
        </div>

        <Suspense fallback={<AdminSkeleton />}>
          <AdminContent />
        </Suspense>
      </section>
    </main>
  );
}
