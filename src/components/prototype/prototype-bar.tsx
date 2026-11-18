"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { cn } from "@/lib/utils";

export type PrototypeVariant = {
  key: string;
  label: string;
};

export type PrototypeScenario = {
  key: string;
  label: string;
};

type PrototypeBarProps = {
  variants: PrototypeVariant[];
  currentVariant: string;
  scenarios: PrototypeScenario[];
  currentScenario: string;
};

// ПРОТОТИП: плавающая панель переключения вариантов и состояний.
// В production-сборке её нет.
export function PrototypeBar({
  variants,
  currentVariant,
  scenarios,
  currentScenario,
}: PrototypeBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const index = Math.max(
    0,
    variants.findIndex(({ key }) => key === currentVariant),
  );

  function go(toIndex: number) {
    const next = variants[(toIndex + variants.length) % variants.length];
    const params = new URLSearchParams(window.location.search);
    params.set("variant", next.key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function selectScenario(key: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("scenario", key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(index - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(index + 1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border bg-foreground px-2 py-2 text-background shadow-xl">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Предыдущий вариант"
            onClick={() => go(index - 1)}
            className="rounded-full p-1.5 hover:bg-background/15"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <span className="px-1 text-xs font-semibold tracking-wide whitespace-nowrap">
            {variants[index].key.toUpperCase()}: {variants[index].label}
          </span>
          <button
            type="button"
            aria-label="Следующий вариант"
            onClick={() => go(index + 1)}
            className="rounded-full p-1.5 hover:bg-background/15"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>

        <span aria-hidden className="hidden h-5 w-px bg-background/25 sm:block" />

        <div className="flex flex-wrap items-center justify-center gap-1">
          <span className="px-1 text-[0.65rem] tracking-widest uppercase opacity-60">
            Состояние
          </span>
          {scenarios.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => selectScenario(key)}
              className={cn(
                "rounded-full px-2 py-1 text-xs whitespace-nowrap",
                key === currentScenario
                  ? "bg-background text-foreground"
                  : "hover:bg-background/15",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
