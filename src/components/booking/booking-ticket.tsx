import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Booking } from "@/contract/schemas";
import { formatDuration, formatLongDay, formatTime } from "@/lib/format";

type BookingTicketProps = {
  booking: Booking;
  onBookAgain: () => void;
};

export function BookingTicket({ booking, onBookAgain }: BookingTicketProps) {
  return (
    <Card className="border-foreground">
      <CardHeader className="gap-4">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Запись подтверждена
        </p>
        <CardTitle className="font-heading text-3xl font-extrabold tracking-tight uppercase">
          {booking.eventType.title}
        </CardTitle>
        <div className="flex flex-col gap-1 text-lg">
          <p className="font-semibold">{formatLongDay(booking.startsAt)}</p>
          <p>
            {formatTime(booking.startsAt)} · {formatDuration(booking.eventType.durationMinutes)}
          </p>
        </div>
        <CardDescription className="text-base leading-relaxed">
          {booking.guestName}, запись сохранена: владелец календаря увидит её в своём списке. Письмо
          с подтверждением не отправляется.
        </CardDescription>
      </CardHeader>
      <div className="flex flex-col gap-3 px-6 pb-6 sm:flex-row">
        <Button type="button" onClick={onBookAgain}>
          <RotateCcw data-icon="inline-start" aria-hidden />
          Записаться ещё раз
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft data-icon="inline-start" aria-hidden />
          На главную
        </Link>
      </div>
    </Card>
  );
}
