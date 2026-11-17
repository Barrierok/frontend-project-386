"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { siteLinks } from "@/lib/site-links";
import { cn } from "@/lib/utils";

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Основная навигация">
      <ul className="flex items-center gap-4 sm:gap-6">
        {siteLinks.map(({ href, label }) => {
          const isCurrent = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "text-xs font-semibold tracking-wide uppercase underline-offset-4 hover:underline sm:text-sm sm:tracking-widest",
                  isCurrent ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
