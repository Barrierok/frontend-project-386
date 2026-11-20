"use client";

import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AvailabilityCalendar } from "@/components/booking/availability-calendar";
import { BookingSheet } from "@/components/booking/booking-sheet";
import { BookingTicket } from "@/components/booking/booking-ticket";
import { TimePanel } from "@/components/booking/time-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Booking, DaySlots, EventType } from "@/contract/schemas";
import { formatDuration } from "@/lib/format";
import { orpcClient } from "@/lib/orpc-client";

type BookingExperienceProps = {
  eventTypes: EventType[];
};

type AvailabilityState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; days: DaySlots[] };

type AvailabilityPanelProps = {
  eventType: EventType;
  hasOtherEventTypes: boolean;
  guestName: string;
  guestEmail: string;
  onGuestNameChange: (value: string) => void;
  onGuestEmailChange: (value: string) => void;
  onBooked: (booking: Booking) => void;
};

function AvailabilityPanel({
  eventType,
  hasOtherEventTypes,
  guestName,
  guestEmail,
  onGuestNameChange,
  onGuestEmailChange,
  onBooked,
}: AvailabilityPanelProps) {
  const router = useRouter();
  const [availability, setAvailability] = useState<AvailabilityState>({ status: "loading" });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStartsAt, setSelectedStartsAt] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { days } = await orpcClient.availability.get({ eventTypeId: eventType.id });

        if (cancelled) {
          return;
        }

        setAvailability({ status: "ready", days });
        setSelectedDate(
          (current) => current ?? days.find((day) => day.slots.length > 0)?.date ?? null,
        );
      } catch (error) {
        console.error("Не удалось загрузить свободные слоты", error);

        if (!cancelled) {
          setAvailability({ status: "error" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // reloadToken — намеренный триггер повторного запроса после 409.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [eventType.id, reloadToken]);

  const days = availability.status === "ready" ? availability.days : [];
  const selectedDay = days.find(({ date }) => date === selectedDate);
  const hasAnySlots = days.some((day) => day.slots.length > 0);
  const canOpenSheet = Boolean(sheetOpen && selectedDay && selectedStartsAt);

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="calendar-heading" className="flex flex-col gap-3">
        <h2 id="calendar-heading" className="font-heading text-xl font-semibold tracking-wide">
          Выберите день
        </h2>

        {notice ? (
          <p
            role="alert"
            className="border border-destructive/40 px-4 py-3 text-sm text-destructive"
          >
            {notice}
          </p>
        ) : null}

        {availability.status === "loading" ? (
          <Skeleton className="h-48 w-full" aria-label="Загрузка свободных дней" />
        ) : null}

        {availability.status === "error" ? (
          <p
            role="alert"
            className="border border-destructive/40 px-4 py-3 text-sm text-destructive"
          >
            Не удалось загрузить свободные слоты. Обновите страницу.
          </p>
        ) : null}

        {availability.status === "ready" ? (
          <>
            {!hasAnySlots ? (
              <div className="border border-dashed px-4 py-3 text-sm leading-relaxed">
                <p className="font-semibold">Свободных слотов в ближайшие 14 дней нет</p>
                {hasOtherEventTypes ? (
                  <p className="text-muted-foreground">
                    Попробуйте выбрать другой тип события — возможно, там есть свободные слоты.
                  </p>
                ) : null}
              </div>
            ) : null}

            <AvailabilityCalendar
              days={days}
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setSelectedStartsAt(null);
                setNotice(null);
              }}
            />
          </>
        ) : null}
      </section>

      <section aria-labelledby="time-heading" className="flex flex-col gap-3">
        <h2 id="time-heading" className="font-heading text-xl font-semibold tracking-wide">
          Выберите время
        </h2>
        <TimePanel
          day={selectedDay}
          selectedStartsAt={selectedStartsAt}
          onSelectSlot={(startsAt) => {
            setSelectedStartsAt(startsAt);
            setNotice(null);
            setSheetOpen(true);
          }}
        />
      </section>

      {canOpenSheet && selectedDay && selectedStartsAt ? (
        <BookingSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          eventType={eventType}
          day={selectedDay}
          startsAt={selectedStartsAt}
          guestName={guestName}
          guestEmail={guestEmail}
          onGuestNameChange={onGuestNameChange}
          onGuestEmailChange={onGuestEmailChange}
          onBooked={onBooked}
          onSlotTaken={() => {
            setSheetOpen(false);
            setSelectedStartsAt(null);
            setNotice("Это время уже занято, выберите другой слот");
            setReloadToken((token) => token + 1);
          }}
          onEventTypeMissing={() => {
            setSheetOpen(false);
            setNotice("Тип события не найден");
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

export function BookingExperience({ eventTypes }: BookingExperienceProps) {
  const [selectedId, setSelectedId] = useState(eventTypes[0]?.id ?? "");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [ticket, setTicket] = useState<Booking | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const selected = eventTypes.find(({ id }) => id === selectedId) ?? eventTypes[0];

  if (!selected) {
    return null;
  }

  if (ticket) {
    return (
      <BookingTicket
        booking={ticket}
        onBookAgain={() => {
          setTicket(null);
          setGuestName("");
          setGuestEmail("");
          setResetToken((token) => token + 1);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="event-type"
          className="text-xs font-semibold tracking-widest text-muted-foreground uppercase"
        >
          Тип события
        </label>
        <Select
          value={selected.id}
          items={eventTypes.map(({ id, title }) => ({ value: id, label: title }))}
          onValueChange={(value) => {
            if (typeof value === "string") {
              setSelectedId(value);
            }
          }}
        >
          <SelectTrigger id="event-type" className="w-full max-w-md" aria-label="Тип события">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {eventTypes.map((eventType) => (
              <SelectItem key={eventType.id} value={eventType.id}>
                {eventType.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="font-heading text-2xl font-semibold tracking-wide">
              {selected.title}
            </CardTitle>
            <Badge variant="secondary">
              <Clock aria-hidden />
              {formatDuration(selected.durationMinutes)}
            </Badge>
          </div>
          {selected.description ? <CardDescription>{selected.description}</CardDescription> : null}
        </CardHeader>
      </Card>

      <AvailabilityPanel
        key={`${selected.id}-${resetToken}`}
        eventType={selected}
        hasOtherEventTypes={eventTypes.length > 1}
        guestName={guestName}
        guestEmail={guestEmail}
        onGuestNameChange={setGuestName}
        onGuestEmailChange={setGuestEmail}
        onBooked={(booking) => {
          setTicket(booking);
          setGuestName("");
          setGuestEmail("");
        }}
      />
    </div>
  );
}
