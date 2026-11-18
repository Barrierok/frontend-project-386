// ПРОТОТИП. Одноразовый код для обсуждения экранов /booking и /admin.
// Ветка prototype/booking-admin-ui, в main не мержится.
// Данные вымышленные и живут только в памяти.

export type EventType = {
  id: string;
  name: string;
  description: string;
  duration: number;
};

export type Slot = {
  time: string;
  available: boolean;
};

export type DaySlots = {
  iso: string;
  weekday: string;
  dayNumber: string;
  month: string;
  slots: Slot[];
};

export type MockBooking = {
  id: string;
  eventTypeId: string;
  guestName: string;
  guestEmail: string;
  dayIso: string;
  weekday: string;
  dayNumber: string;
  month: string;
  time: string;
  duration: number;
};

export const mockEventTypes: EventType[] = [
  {
    id: "call-15",
    name: "Короткий звонок",
    description: "Знакомство и быстрый вопрос — 15 минут.",
    duration: 15,
  },
  {
    id: "call-30",
    name: "Развёрнутый разговор",
    description: "Обсуждение задачи и деталей — 30 минут.",
    duration: 30,
  },
];

const MOSCOW_TZ = "Europe/Moscow";

const weekdayFormat = new Intl.DateTimeFormat("ru-RU", {
  weekday: "short",
  timeZone: "UTC",
});

const dayFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  timeZone: "UTC",
});

const monthFormat = new Intl.DateTimeFormat("ru-RU", {
  month: "long",
  timeZone: "UTC",
});

export function moscowToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MOSCOW_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(iso: string, offset: number): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + offset));
}

export function dayLabel(iso: string): Omit<DaySlots, "slots"> {
  const date = addDays(iso, 0);
  return {
    iso,
    weekday: weekdayFormat.format(date).replace(".", ""),
    dayNumber: dayFormat.format(date),
    month: monthFormat.format(date).replace(" ", " "),
  };
}

export function offsetIso(today: string, offset: number): string {
  const date = addDays(today, offset);
  return date.toISOString().slice(0, 10);
}

function slotTimes(duration: number): string[] {
  const times: string[] = [];
  const dayEnd = 18 * 60;
  for (let minutes = 9 * 60; minutes + duration <= dayEnd; minutes += duration) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
    const rest = String(minutes % 60).padStart(2, "0");
    times.push(`${hours}:${rest}`);
  }
  return times;
}

function seededFree(iso: string, time: string): boolean {
  const seed = `${iso}T${time}`;
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 1000;
  }
  // Свободен примерно каждый четвёртый старт — как в жизни, а не 36 подряд.
  return hash % 4 === 0;
}

// Сегодняшние прошедшие старты скрыты: считаем, что сейчас 14:00.
const MOCK_NOW = "14:00";

export function buildDays(today: string, duration: number, emptyAll = false): DaySlots[] {
  return Array.from({ length: 14 }, (_, index) => {
    const iso = offsetIso(today, index);
    const { weekday, dayNumber, month } = dayLabel(iso);

    const slots = slotTimes(duration).map((time) => {
      const isPast = index === 0 && time < MOCK_NOW;
      return {
        time,
        available: !emptyAll && !isPast && seededFree(iso, time),
      };
    });

    return { iso, weekday, dayNumber, month, slots };
  });
}

export function formatDuration(duration: number): string {
  return `${duration} мин`;
}

const guests = [
  { name: "Анна Смирнова", email: "anna@example.com" },
  { name: "Павел Орлов", email: "pavel@example.com" },
  { name: "Мария Ким", email: "maria@example.com" },
  { name: "Илья Волков", email: "ilya@example.com" },
  { name: "Ольга Петрова", email: "olga@example.com" },
  { name: "Сергей Белов", email: "sergey@example.com" },
];

export function buildMockBookings(today: string): MockBooking[] {
  const rows = [
    { offset: 0, time: "15:00", type: 0, guest: 0 },
    { offset: 1, time: "09:30", type: 1, guest: 1 },
    { offset: 1, time: "12:00", type: 0, guest: 2 },
    { offset: 2, time: "16:45", type: 0, guest: 3 },
    { offset: 4, time: "11:00", type: 1, guest: 4 },
    { offset: 6, time: "10:15", type: 0, guest: 5 },
  ];

  return rows.map(({ offset, time, type, guest }, index) => {
    const iso = offsetIso(today, offset);
    const eventType = mockEventTypes[type];
    return {
      id: `booking-${index + 1}`,
      eventTypeId: eventType.id,
      guestName: guests[guest].name,
      guestEmail: guests[guest].email,
      dayIso: iso,
      weekday: dayLabel(iso).weekday,
      dayNumber: dayLabel(iso).dayNumber,
      month: dayLabel(iso).month,
      time,
      duration: eventType.duration,
    };
  });
}
