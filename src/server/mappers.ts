import type { EventType } from "@/contract/schemas";
import type { EventTypeRow } from "@/db/schema";

export function toEventType(row: EventTypeRow): EventType {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    durationMinutes: row.durationMinutes,
    createdAt: row.createdAt.toISOString(),
  };
}
