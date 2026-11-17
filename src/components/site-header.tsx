import { Calendar } from "lucide-react";
import Link from "next/link";

import { SiteNav } from "@/components/site-nav";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-6">
        <Link
          href="/"
          aria-label="Calendar"
          className="flex items-center gap-2 font-heading text-base font-semibold tracking-wide"
        >
          <Calendar className="size-5 text-primary" aria-hidden />
          <span className="hidden sm:inline">Calendar</span>
        </Link>

        <SiteNav />
      </div>
    </header>
  );
}
