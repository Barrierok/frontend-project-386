import { oc } from "@orpc/contract";
import { z } from "zod";

import {
  availabilityInputSchema,
  availabilitySchema,
  bookingInputSchema,
  bookingSchema,
  eventTypeInputSchema,
  eventTypeSchema,
} from "./schemas";

export const eventTypesListContract = oc
  .output(z.array(eventTypeSchema))
  .route({ method: "GET", path: "/event-types" });

export const contract = oc.router({
  eventTypes: {
    list: eventTypesListContract,
    create: oc
      .input(eventTypeInputSchema)
      .output(eventTypeSchema)
      .errors({
        EVENT_TYPE_EXISTS: {
          status: 409,
          message: "Тип события с таким идентификатором уже существует",
        },
      })
      .route({ method: "POST", path: "/event-types" }),
  },
  availability: {
    get: oc
      .input(availabilityInputSchema)
      .output(availabilitySchema)
      .errors({
        EVENT_TYPE_NOT_FOUND: { status: 404, message: "Тип события не найден" },
      })
      .route({ method: "GET", path: "/event-types/{eventTypeId}/availability" }),
  },
  bookings: {
    create: oc
      .input(bookingInputSchema)
      .output(bookingSchema)
      .errors({
        SLOT_TAKEN: {
          status: 409,
          message: "Это время уже занято, выберите другой слот",
        },
        SLOT_UNAVAILABLE: {
          status: 409,
          message: "Слот недоступен, обновите страницу",
        },
        SLOT_TIMEOUT: {
          status: 503,
          message: "Сервис перегружен, попробуйте ещё раз",
        },
        EVENT_TYPE_NOT_FOUND: { status: 404, message: "Тип события не найден" },
      })
      .route({ method: "POST", path: "/bookings" }),
    listUpcoming: oc
      .output(z.array(bookingSchema))
      .route({ method: "GET", path: "/bookings/upcoming" }),
  },
});
