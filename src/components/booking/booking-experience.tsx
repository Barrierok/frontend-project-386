"use client";

import { Clock } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EventType } from "@/contract/schemas";
import { formatDuration } from "@/lib/format";

type BookingExperienceProps = {
  eventTypes: EventType[];
};

export function BookingExperience({ eventTypes }: BookingExperienceProps) {
  const [selectedId, setSelectedId] = useState(eventTypes[0]?.id ?? "");
  const selected = eventTypes.find(({ id }) => id === selectedId) ?? eventTypes[0];

  if (!selected) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="event-type"
          className="text-xs font-semibold tracking-widest text-muted-foreground uppercase"
        >
          Тип события
        </label>
        <Select
          value={selected.id}
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
    </div>
  );
}
