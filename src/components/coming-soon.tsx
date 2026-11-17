import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

type ComingSoonProps = {
  title: string;
  description: string;
};

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <main className="flex-1">
      <section className="mx-auto flex w-full max-w-3xl flex-col items-start gap-6 px-6 py-24 sm:py-32">
        <h1 className="font-heading text-4xl font-extrabold tracking-tight uppercase sm:text-6xl">
          {title}
        </h1>

        <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">{description}</p>

        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          <ArrowLeft data-icon="inline-start" aria-hidden />
          На главную
        </Link>
      </section>
    </main>
  );
}
