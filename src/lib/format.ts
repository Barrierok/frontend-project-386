export function formatDuration(minutes: number): string {
  return `${minutes} мин`;
}

export function formatPlaces(count: number): string {
  if (count === 0) {
    return "нет";
  }

  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} место`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} места`;
  }

  return `${count} мест`;
}

const shortDayFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow",
  weekday: "short",
  day: "numeric",
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

function toDate(value: string | Date): Date {
  if (value instanceof Date) {
    return value;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00+03:00`) : new Date(value);
}

export function formatShortDay(date: string | Date): string {
  return shortDayFormatter.format(toDate(date));
}

export function formatLongDay(date: string | Date): string {
  return longDayFormatter.format(toDate(date));
}

export function formatTime(date: string | Date): string {
  return timeFormatter.format(toDate(date));
}
