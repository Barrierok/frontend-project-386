import Link from "next/link";

import { Separator } from "@/components/ui/separator";
import { siteLinks } from "@/lib/site-links";

export function SiteFooter() {
  return (
    <footer>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-xs flex-col gap-2">
          <span className="font-heading text-sm font-semibold tracking-wide">Calendar</span>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Запись на звонки без переписки: выберите тип события и свободный слот.
          </p>
        </div>

        <nav aria-label="Навигация в подвале">
          <ul className="flex flex-wrap items-center gap-6">
            {siteLinks.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-sm font-semibold tracking-widest text-muted-foreground uppercase underline-offset-4 hover:text-foreground hover:underline"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6">
        <Separator />
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <p className="text-xs tracking-widest text-muted-foreground uppercase">© 2026 Calendar</p>
      </div>
    </footer>
  );
}
