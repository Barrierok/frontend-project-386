import { handleSchedule } from "@vercel/schedules";

import { getPool } from "@/db";

/**
 * Приватная функция ежедневного пинга Supabase: не даёт Free-проекту
 * уснуть после недели низкой активности. Расписание — в vercel.json.
 */
export const POST = handleSchedule(async () => {
  await getPool().query("select 1");
});
