import { CalendarX } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function EmptyEventTypes() {
  return (
    <Card>
      <CardHeader>
        <CalendarX className="size-8 text-primary" aria-hidden />
        <CardTitle className="font-heading text-xl font-semibold tracking-wide">
          Пока нет типов событий
        </CardTitle>
        <CardDescription>
          Владелец календаря ещё не добавил ни одного типа события. Загляните позже.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
