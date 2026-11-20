import { oc } from "@orpc/contract";
import { z } from "zod";

import { eventTypeSchema } from "./schemas";

export const eventTypesListContract = oc
  .output(z.array(eventTypeSchema))
  .route({ method: "GET", path: "/event-types" });

export const contract = oc.router({
  eventTypes: {
    list: eventTypesListContract,
  },
});
