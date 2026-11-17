import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export function BookingCta() {
  return (
    <Link href="/booking" className={buttonVariants({ size: "lg" })}>
      Записаться
      <ArrowRight data-icon="inline-end" aria-hidden />
    </Link>
  );
}
