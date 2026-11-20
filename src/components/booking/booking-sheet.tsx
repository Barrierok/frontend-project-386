"use client";

import { ORPCError } from "@orpc/client";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Booking, DaySlots, EventType } from "@/contract/schemas";
import { guestEmailSchema, guestNameSchema } from "@/contract/schemas";
import { formatDuration, formatLongDay, formatTime } from "@/lib/format";
import { orpcClient } from "@/lib/orpc-client";

const GENERIC_ERROR = "Не удалось создать запись, попробуйте ещё раз";

type FieldErrors = {
  guestName?: string;
  guestEmail?: string;
};

type BookingSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventType: EventType;
  day: DaySlots;
  startsAt: string;
  guestName: string;
  guestEmail: string;
  onGuestNameChange: (value: string) => void;
  onGuestEmailChange: (value: string) => void;
  onBooked: (booking: Booking) => void;
  onSlotTaken: () => void;
  onEventTypeMissing: () => void;
};

function firstIssue(
  result: { success: true } | { success: false; error: { issues: { message: string }[] } },
) {
  return result.success ? undefined : result.error.issues[0]?.message;
}

export function BookingSheet({
  open,
  onOpenChange,
  eventType,
  day,
  startsAt,
  guestName,
  guestEmail,
  onGuestNameChange,
  onGuestEmailChange,
  onBooked,
  onSlotTaken,
  onEventTypeMissing,
}: BookingSheetProps) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const validate = (): boolean => {
    const next: FieldErrors = {
      guestName: firstIssue(guestNameSchema.safeParse(guestName)),
      guestEmail: firstIssue(guestEmailSchema.safeParse(guestEmail)),
    };

    setErrors(next);
    setAttempted(true);

    if (next.guestName) {
      nameRef.current?.focus();
    } else if (next.guestEmail) {
      emailRef.current?.focus();
    }

    return !next.guestName && !next.guestEmail;
  };

  const revalidate = (field: keyof FieldErrors, value: string) => {
    if (!attempted) {
      return;
    }

    const result =
      field === "guestName" ? guestNameSchema.safeParse(value) : guestEmailSchema.safeParse(value);

    setErrors((current) => ({ ...current, [field]: firstIssue(result) }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting || !validate()) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const booking = await orpcClient.bookings.create({
        eventTypeId: eventType.id,
        startsAt,
        guestName: guestName.trim(),
        guestEmail,
      });

      onBooked(booking);
    } catch (error) {
      if (error instanceof ORPCError) {
        if (error.code === "SLOT_TAKEN") {
          onSlotTaken();
          return;
        }

        if (error.code === "EVENT_TYPE_NOT_FOUND") {
          onEventTypeMissing();
          return;
        }

        setSubmitError(error.code === "SLOT_TIMEOUT" ? error.message : GENERIC_ERROR);
      } else {
        setSubmitError(GENERIC_ERROR);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && submitting) {
          return;
        }

        onOpenChange(next);
      }}
      disablePointerDismissal={submitting}
    >
      <DialogContent showCloseButton={!submitting} aria-describedby="booking-sheet-description">
        <DialogHeader>
          <DialogTitle>{eventType.title}</DialogTitle>
          <DialogDescription id="booking-sheet-description">
            {formatLongDay(day.date)}, {formatTime(startsAt)} ·{" "}
            {formatDuration(eventType.durationMinutes)}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="guest-name">Имя</Label>
            <Input
              ref={nameRef}
              id="guest-name"
              name="guestName"
              autoComplete="name"
              value={guestName}
              aria-invalid={Boolean(errors.guestName)}
              aria-describedby={errors.guestName ? "guest-name-error" : undefined}
              onChange={(event) => {
                onGuestNameChange(event.target.value);
                revalidate("guestName", event.target.value);
              }}
            />
            {errors.guestName ? (
              <p id="guest-name-error" role="alert" className="text-sm text-destructive">
                {errors.guestName}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="guest-email">Email</Label>
            <Input
              ref={emailRef}
              id="guest-email"
              name="guestEmail"
              type="email"
              autoComplete="email"
              value={guestEmail}
              aria-invalid={Boolean(errors.guestEmail)}
              aria-describedby={errors.guestEmail ? "guest-email-error" : undefined}
              onChange={(event) => {
                onGuestEmailChange(event.target.value);
                revalidate("guestEmail", event.target.value);
              }}
            />
            {errors.guestEmail ? (
              <p id="guest-email-error" role="alert" className="text-sm text-destructive">
                {errors.guestEmail}
              </p>
            ) : null}
          </div>

          {submitError ? (
            <p role="alert" className="text-sm text-destructive">
              {submitError}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? "Отправляем…" : "Подтвердить запись"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
