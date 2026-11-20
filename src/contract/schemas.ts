import { z } from "zod";

export const slugSchema = z
  .string()
  .min(1, "Укажите идентификатор")
  .max(64, "Идентификатор не длиннее 64 символов")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Только строчные латинские буквы, цифры и дефис");

export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const eventTypeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  durationMinutes: z.number().int(),
  createdAt: isoDateTimeSchema,
});

export const eventTypeInputSchema = z.object({
  id: slugSchema,
  title: z.string().trim().min(1, "Укажите название").max(100, "Название не длиннее 100 символов"),
  description: z.string().trim().max(500, "Описание не длиннее 500 символов").default(""),
  durationMinutes: z
    .number()
    .int("Длительность — целое число минут")
    .min(5, "Длительность от 5 до 540 минут")
    .max(540, "Длительность от 5 до 540 минут")
    .multipleOf(5, "Длительность кратна 5 минутам"),
});

export const guestNameSchema = z
  .string()
  .trim()
  .min(1, "Укажите имя")
  .max(100, "Имя не длиннее 100 символов");

export const guestEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Введите корректный email").min(3).max(254));

export const bookingSchema = z.object({
  id: z.string(),
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema,
  guestName: z.string(),
  guestEmail: z.string(),
  createdAt: isoDateTimeSchema,
  eventType: z.object({
    id: z.string(),
    title: z.string(),
    durationMinutes: z.number().int(),
  }),
});

export const availabilityInputSchema = z.object({
  eventTypeId: slugSchema,
});

export const daySlotsSchema = z.object({
  date: z.iso.date(),
  slots: z.array(z.object({ startsAt: isoDateTimeSchema })),
});

export const availabilitySchema = z.object({
  days: z.array(daySlotsSchema),
});

export type EventType = z.infer<typeof eventTypeSchema>;
export type EventTypeInput = z.infer<typeof eventTypeInputSchema>;
export type Booking = z.infer<typeof bookingSchema>;
export type DaySlots = z.infer<typeof daySlotsSchema>;
export type Availability = z.infer<typeof availabilitySchema>;
