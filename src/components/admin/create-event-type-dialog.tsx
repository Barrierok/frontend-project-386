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
import { Textarea } from "@/components/ui/textarea";
import type { EventType } from "@/contract/schemas";
import { eventTypeInputSchema } from "@/contract/schemas";
import { orpcClient } from "@/lib/orpc-client";

const GENERIC_ERROR = "Не удалось сохранить, попробуйте ещё раз";

type FieldName = "id" | "title" | "description" | "durationMinutes";

type FormValues = {
  id: string;
  title: string;
  description: string;
  durationMinutes: string;
};

type FieldErrors = Partial<Record<FieldName, string>>;

const FIELD_NAMES = new Set<string>(["id", "title", "description", "durationMinutes"]);

function isFieldName(value: unknown): value is FieldName {
  return typeof value === "string" && FIELD_NAMES.has(value);
}

type CreateEventTypeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (eventType: EventType) => void;
};

const initialValues: FormValues = {
  id: "",
  title: "",
  description: "",
  durationMinutes: "30",
};

function toErrors(values: FormValues): FieldErrors {
  const result = eventTypeInputSchema.safeParse({
    id: values.id,
    title: values.title,
    description: values.description,
    durationMinutes: Number(values.durationMinutes),
  });

  if (result.success) {
    return {};
  }

  const errors: FieldErrors = {};

  for (const issue of result.error.issues) {
    const field = issue.path[0];

    if (isFieldName(field) && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return errors;
}

export function CreateEventTypeDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateEventTypeDialogProps) {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const idRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);

  const refs: Record<FieldName, React.RefObject<HTMLElement | null>> = {
    id: idRef,
    title: titleRef,
    description: descriptionRef,
    durationMinutes: durationRef,
  };

  const update = (field: FieldName, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);

    if (attempted) {
      setErrors(toErrors(next));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setAttempted(true);
    setSubmitError(null);

    const nextErrors = toErrors(values);
    setErrors(nextErrors);

    const firstInvalid = Object.keys(nextErrors).filter(isFieldName)[0];

    if (firstInvalid) {
      refs[firstInvalid].current?.focus();
      return;
    }

    const parsed = eventTypeInputSchema.safeParse({
      id: values.id,
      title: values.title,
      description: values.description,
      durationMinutes: Number(values.durationMinutes),
    });

    if (!parsed.success) {
      return;
    }

    setSubmitting(true);

    try {
      const created = await orpcClient.eventTypes.create(parsed.data);
      setValues(initialValues);
      setErrors({});
      setAttempted(false);
      onCreated(created);
    } catch (error) {
      if (error instanceof ORPCError && error.code === "EVENT_TYPE_EXISTS") {
        setErrors({ id: "Такой слаг уже занят" });
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
      <DialogContent showCloseButton={!submitting}>
        <DialogHeader>
          <DialogTitle>Новый тип события</DialogTitle>
          <DialogDescription>
            Гость увидит тип в списке при следующей загрузке страницы записи.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-type-id">Слаг</Label>
            <Input
              ref={idRef}
              id="event-type-id"
              name="id"
              placeholder="call-45"
              value={values.id}
              aria-invalid={Boolean(errors.id)}
              aria-describedby={errors.id ? "event-type-id-error" : undefined}
              onChange={(event) => update("id", event.target.value)}
            />
            {errors.id ? (
              <p id="event-type-id-error" role="alert" className="text-sm text-destructive">
                {errors.id}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-type-title">Название</Label>
            <Input
              ref={titleRef}
              id="event-type-title"
              name="title"
              value={values.title}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "event-type-title-error" : undefined}
              onChange={(event) => update("title", event.target.value)}
            />
            {errors.title ? (
              <p id="event-type-title-error" role="alert" className="text-sm text-destructive">
                {errors.title}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-type-description">Описание</Label>
            <Textarea
              ref={descriptionRef}
              id="event-type-description"
              name="description"
              rows={3}
              value={values.description}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "event-type-description-error" : undefined}
              onChange={(event) => update("description", event.target.value)}
            />
            {errors.description ? (
              <p
                id="event-type-description-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {errors.description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-type-duration">Длительность, минуты</Label>
            <Input
              ref={durationRef}
              id="event-type-duration"
              name="durationMinutes"
              type="number"
              min={5}
              max={540}
              step={5}
              value={values.durationMinutes}
              aria-invalid={Boolean(errors.durationMinutes)}
              aria-describedby={errors.durationMinutes ? "event-type-duration-error" : undefined}
              onChange={(event) => update("durationMinutes", event.target.value)}
            />
            {errors.durationMinutes ? (
              <p id="event-type-duration-error" role="alert" className="text-sm text-destructive">
                {errors.durationMinutes}
              </p>
            ) : null}
          </div>

          {submitError ? (
            <p role="alert" className="text-sm text-destructive">
              {submitError}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Сохраняем…" : "Создать тип события"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
