import { oc } from "@orpc/contract";
import { z } from "zod";

import { availabilityInputSchema, availabilitySchema, eventTypeSchema } from "./schemas";

export const eventTypesListContract = oc
  .output(z.array(eventTypeSchema))
  .route({ method: "GET", path: "/event-types" });

export const contract = oc.router({
  eventTypes: {
    list: eventTypesListContract,
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
});
