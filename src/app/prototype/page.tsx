import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Прототипы экранов",
  robots: { index: false, follow: false },
};

// ПРОТОТИП. Точка входа: два экрана по три варианта, ветка prototype/booking-admin-ui.
export default function PrototypeIndexPage() {
  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-3xl px-6 py-16">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">Прототип</p>
        <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight uppercase">
          Экраны бронирования и админки
        </h1>
        <p className="mt-3 text-muted-foreground">
          Три структурно разных варианта на каждый экран. Переключение — стрелками в нижней панели
          или параметром <code>?variant=</code>. Состояния — «Нет типов», «Нет слотов», «Конфликт» и
          другие — там же.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/prototype/booking"
            className="rounded-xl border p-5 transition-colors hover:border-primary"
          >
            <h2 className="font-heading text-lg font-semibold">/booking</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Тип события → слот на 14 дней → имя и email → успех.
            </p>
          </Link>

          <Link
            href="/prototype/admin"
            className="rounded-xl border p-5 transition-colors hover:border-primary"
          >
            <h2 className="font-heading text-lg font-semibold">/admin</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Создание типа события и предстоящие записи всех типов.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
