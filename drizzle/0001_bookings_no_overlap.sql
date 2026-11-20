-- EXCLUDE не выражается в Drizzle-схеме, поэтому ограничение живёт только здесь.
-- Имя `bookings_no_overlap` — часть контракта: на него ссылается `on conflict`
-- и его проверяют тесты. Подробности — docs/adr/0001-booking-no-overlap.md.
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (tstzrange("starts_at", "ends_at") WITH &&);
