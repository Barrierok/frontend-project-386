export const seedEventTypes = [
  {
    id: "call-15",
    title: "Звонок на 15 минут",
    description: "Короткий звонок, чтобы обсудить один вопрос.",
    durationMinutes: 15,
  },
  {
    id: "call-30",
    title: "Звонок на 30 минут",
    description: "Развёрнутый разговор по задаче или консультация.",
    durationMinutes: 30,
  },
] as const;
