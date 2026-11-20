export function formatDuration(minutes: number): string {
  return `${minutes} мин`;
}

const dayFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow",
  weekday: "short",
  day: "numeric",
  month: "long",
});

const longDayFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow",
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDay(date: string | Date): string {
  return dayFormatter.format(new Date(date));
}

export function formatLongDay(date: string | Date): string {
  return longDayFormatter.format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return timeFormatter.format(new Date(date));
}
