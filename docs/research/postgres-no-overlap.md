# Непересечение записей в Postgres на Supabase

Исследование к тикету #8 карты #7: как гарантировать, что интервалы двух записей не пересекаются,
включая одновременные запросы, при работе из serverless-функций на Vercel с Postgres на Supabase Free.

Дата проверки: 18 ноября 2026. Все версии и поведение проверялись в этот день; ссылки ведут на
первичные источники (документация PostgreSQL 18, документация и исходники Supabase/PostgREST, исходники
PostgreSQL). Замеры и сценарии воспроизводились на локальном PostgreSQL 18.7.

## Оглавление

1. [TL;DR](#tldr)
2. [Что именно гарантируем](#что-именно-гарантируем)
3. [Как проверялось](#как-проверялось)
4. [Три механизма](#три-механизма): EXCLUDE · SERIALIZABLE · advisory lock
5. [Сравнительная таблица](#сравнительная-таблица)
6. [Рекомендуемый механизм и DDL](#рекомендуемый-механизм-и-ddl)
7. [Правило «ошибка → 409»](#правило-ошибка--409)
8. [Supabase и Vercel: что влияет на решение](#supabase-и-vercel-что-влияет-на-решение)
9. [Цена: индексы, блокировки, замеры](#цена-индексы-блокировки-замеры)
10. [Риски и ограничения](#риски-и-ограничения)
11. [Что это значит для реализации](#что-это-значит-для-реализации)
12. [Открытые вопросы](#открытые-вопросы)
13. [Приложение: как воспроизвести гонку](#приложение-как-воспроизвести-гонку)
14. [Источники](#источники)

## TL;DR

- Рекомендация — **декларативное ограничение `EXCLUDE USING gist (tstzrange(starts_at, ends_at) WITH &&)`**.
  Оно проверяется при каждой вставке на сервере, работает на уровне изоляции по умолчанию (READ COMMITTED),
  не требует ретраев и не может быть обойдено кодом приложения.
- Вставка записи — `insert … on conflict on constraint bookings_no_overlap do nothing returning id`.
  Пустой результат и есть конфликт: **0 строк → 409**, без разбора текста ошибки.
- SQLSTATE нарушения EXCLUDE — **`23P01`** (`exclusion_violation`). Если ошибка всё же прилетела, 409 ставим
  по коду `23P01`, а также по **`40P01`** (`deadlock_detected`): при по-настоящему одновременных вставках
  одного слота Postgres вместо `23P01` может отдать deadlock — в эксперименте так произошло в 19 из 100 пар.
- `btree_gist` для MVP **не нужен**: правило «записи не пересекаются никогда» — это ограничение на один
  диапазон, без колонки-скоупа. Расширение понадобится только если появятся несколько календарей или
  разделение по владельцу/типу события.
- **SERIALIZABLE** не подходит как основной механизм: он защищает только если приложение сначала читает
  диапазон, требует ретраев по `40001`, а без чтения не защищает вообще (проверено: две одновременные
  SERIALIZABLE-вставки без предварительного SELECT обе успешно создали пересекающиеся записи).
- **Advisory lock** — рабочий, но дисциплинарный механизм: его легко обойти любым другим путём записи,
  он огрубляет параллелизм (блокирует и непересекающиеся вставки), а в transaction mode пулера допустим
  только transaction-level вариант. Его плюс — конфликт виден как «0 строк» без исключения.
- Отдельный **B-tree индекс по `starts_at`** всё равно нужен: exclusion-индекс обслуживает только операторы
  диапазонов (`&&`, `<@`, `@>` и т. п.), `order by starts_at` по нему не идёт (проверено: seq scan).
- Не держите транзакцию дольше одной вставки: второй INSERT того же слота ждёт завершения первого,
  и время ожидания равно длительности чужой транзакции (в эксперименте — 3,5 с при транзакции в 4 с).

## Что именно гарантируем

Инвариант домена: **любые две записи в календаре не пересекаются по времени**. Формально для любых двух
строк `a` и `b`:

```
not (tstzrange(a.starts_at, a.ends_at) && tstzrange(b.starts_at, b.ends_at))
```

Важные следствия, которые надо зафиксировать в схеме и тестах:

- Границы полуоткрытые: `tstzrange(starts_at, ends_at)` по умолчанию — `[starts_at, ends_at)`
  ([PostgreSQL 18, 8.17.6](https://www.postgresql.org/docs/18/rangetypes.html#RANGETYPES-BUILTIN-CONSTRUCTORS)).
  Поэтому запись 10:00–10:30 и запись 10:30–11:00 **не пересекаются** — это и нужно для сетки слотов.
- Пустой диапазон (`starts_at = ends_at`) не пересекается ни с чем: `isempty()` возвращает true, а `&&` — false
  (проверено локально). Поэтому нужен отдельный `check (ends_at > starts_at)`, иначе можно записать
  «нулевую» запись.
- `NULL` в любой из колонок сделал бы диапазон `NULL`, а сравнение — не `TRUE`; ограничение EXCLUDE такое
  пропускает. Поэтому `starts_at` и `ends_at` обязаны быть `NOT NULL`.
- `timestamptz` сравнивает моменты времени, поэтому ограничение не зависит от часового пояса и от того,
  что все слоты считаются в Europe/Moscow.

Правило «записи не пересекаются никогда» — глобальное: оно не привязано к типу события или владельцу.
Значит, в ограничении достаточно одного диапазона. `btree_gist` нужен только когда к диапазону добавляется
колонка, сравниваемая по равенству (`owner_id WITH =`), — это прямо описано в примере с переговорками
([PostgreSQL 18, 8.17.10](https://www.postgresql.org/docs/18/rangetypes.html#RANGETYPES-CONSTRAINT)).

## Как проверялось

Документация: страницы PostgreSQL 18 (актуальная версия на 18 ноября 2026 — 18.7, выпущена 12 ноября 2026),
документация Supabase с датами обновления страниц, исходники PostgreSQL `REL_18_STABLE`, PostgREST `v16.6`,
`pg-protocol` и Postgres.js.

Эксперименты: локальный **PostgreSQL 18.7 (Homebrew) on aarch64-apple-darwin27.2.0**, отдельный кластер,
две независимые сессии `psql`. Схема для тестов:

```sql
create extension if not exists btree_gist;
create table bookings (
  id bigint generated always as identity primary key,
  event_type_id text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  guest_name text not null,
  guest_email text not null,
  created_at timestamptz not null default now(),
  constraint bookings_time_valid check (ends_at > starts_at),
  constraint bookings_no_overlap exclude using gist (tstzrange(starts_at, ends_at) with &&)
);
create index bookings_starts_at_idx on bookings (starts_at);
```

Каждый сценарий одновременности запускался как две сессии `psql`, стартующие одновременно (или со сдвигом
0,2–0,5 с), с подсчётом фактических SQLSTATE. Все результаты ниже — из этих прогонов, а не из пересказов.

## Три механизма

### 1. `EXCLUDE USING gist (tstzrange(starts_at, ends_at) WITH &&)`

**Как работает.** Ограничение EXCLUDE гарантирует, что для любых двух строк не все перечисленные сравнения
вернут TRUE; операторы обязаны быть коммутативными, а ограничение реализуется индексом, который создаётся
автоматически вместе с ограничением
([PostgreSQL 18, CREATE TABLE](https://www.postgresql.org/docs/18/sql-createtable.html#SQL-CREATETABLE-EXCLUDE)).
Для диапазонов это стандартный способ запретить пересечения
([PostgreSQL 18, 8.17.10](https://www.postgresql.org/docs/18/rangetypes.html#RANGETYPES-CONSTRAINT)).
GIN для EXCLUDE не годится — нужен GiST или SP-GiST; B-tree/hash бессмысленны.

**Когда проверяется.** По умолчанию `NOT DEFERRABLE`, то есть проверка выполняется сразу после каждой команды
([PostgreSQL 18, CREATE TABLE, DEFERRABLE](https://www.postgresql.org/docs/18/sql-createtable.html#SQL-CREATETABLE-DEFERRABLE)).
`DEFERRABLE` для этой задачи вреден: ошибка переедет на `COMMIT`, и `ON CONFLICT` перестанет работать
как арбитр — «only NOT DEFERRABLE constraints and unique indexes are supported as arbiters»
([PostgreSQL 18, INSERT](https://www.postgresql.org/docs/18/sql-insert.html#SQL-ON-CONFLICT)).

**Одновременные запросы.** Проверка EXCLUDE — отдельный проход по индексу после вставки индексной записи;
если конфликтующую строку вставила или удалила незавершённая транзакция, вставщик ждёт её завершения и
повторяет проверку. Это описано в комментарии к `execIndexing.c`:

> "After the insertion, we perform a separate scan on the index to check for conflicting tuples, and if one
> is found, we throw an error and the transaction is aborted. If the conflicting tuple's inserter or deleter
> is in-progress, we wait for it to finish first."
> — [postgres, REL_18_STABLE, src/backend/executor/execIndexing.c](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/executor/execIndexing.c)

Там же описано следствие, которое важно для обработки ошибок:

> "There is a chance of deadlock, if two backends insert a tuple at the same time, and then perform the scan
> to check for conflicts. They will find each other's tuple, and both try to wait for each other. The deadlock
> detector will detect that, and abort one of the transactions."

**Замеры.**

| Сценарий                                                      | Результат                                                                                                                          |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Одна и та же строка дважды, последовательно                   | `ERROR: 23P01 … violates exclusion constraint "bookings_no_overlap"`, в ошибке есть `CONSTRAINT NAME`, `TABLE NAME`, `SCHEMA NAME` |
| Пересечение на 1 микросекунду                                 | `23P01`                                                                                                                            |
| Встык: 10:00–10:30 и 10:30–11:00                              | обе вставки успешны                                                                                                                |
| Вторая вставка при открытой транзакции первой (4 с)           | ждала 3,49 с, затем `23P01`                                                                                                        |
| Вторая вставка, первая транзакция откатилась                  | ждала 1,69 с, затем вставка **успешна** (ложного конфликта нет)                                                                    |
| Две непересекающиеся вставки одновременно                     | без блокировки, 0,6 мс                                                                                                             |
| 100 пар по-настоящему одновременных вставок одного слота      | 81 × `23P01`, 19 × `40P01` (`deadlock_detected`)                                                                                   |
| То же, но с `on conflict on constraint … do nothing` (60 пар) | 0 ошибок: всегда ровно одна вставка, вторая получает 0 строк                                                                       |

**Цена.** Один GiST-индекс, ~50–70 байт на строку (см. [замеры](#цена-индексы-блокировки-замеры)).
Ограничение не блокирует таблицу: конфликтующие вставки ждут друг друга точечно, непересекающиеся
проходят параллельно.

**Плюсы.** Декларативная гарантия на сервере; работает при READ COMMITTED; не нужен ретрай; нельзя обойти
из другого процесса, SQL-консоли или сида; ошибка содержит имя ограничения.

**Минусы.** Ошибка приходит исключением (лечится `ON CONFLICT`); при истинной одновременности возможен
`40P01`; второй вставщик ждёт первую транзакцию, поэтому долгая транзакция = долгое ожидание.

### 2. `SERIALIZABLE` с повтором транзакции

**Как работает.** SERIALIZABLE эмулирует последовательное выполнение и отслеживает read/write-зависимости
предикатными блокировками; при обнаружении аномалии транзакция отменяется с `40001`, и приложение обязано
её повторить:

> "It is important that an environment which uses this technique have a generalized way of handling
> serialization failures (which always return with an SQLSTATE value of '40001')"
> — [PostgreSQL 18, 13.2.3](https://www.postgresql.org/docs/18/transaction-iso.html#XACT-SERIALIZABLE)

**Ключевое ограничение: уровень изоляции сам по себе не знает бизнес-правило.** Чтобы SSI нашёл конфликт,
приложение должно сначала прочитать проверяемый диапазон, а потом вставить. Проверено:

| Сценарий                                                                             | Результат                                                                                                           |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Две SERIALIZABLE-транзакции: `select count(*) … where range && …` → пауза → `insert` | одна получает `40001` («could not serialize access due to read/write dependencies among transactions», HINT: retry) |
| Две SERIALIZABLE-транзакции без предварительного SELECT                              | **обе успешно вставили** пересекающиеся записи                                                                      |
| То же на READ COMMITTED с предварительным SELECT                                     | **обе увидели 0 и обе вставили** — классическая гонка check-then-insert                                             |

То есть SERIALIZABLE здесь — не гарантия, а способ поймать гонку при условии, что весь код написан
по протоколу «прочитал → вставил». Любой путь записи без чтения (сид, ручная правка, второй эндпоинт)
ломает инвариант молча.

**Дополнительные издержки.**

- Даже SERIALIZABLE не отменяет нарушений уникальности: в документации прямо сказано, что unique
  constraint violation возможен «even after explicitly checking that the key isn't present»
  ([PostgreSQL 18, 13.2.3](https://www.postgresql.org/docs/18/transaction-iso.html#XACT-SERIALIZABLE)).
- Предикатные блокировки не блокируют, но занимают память; seq scan даёт предикатную блокировку на всю
  таблицу — то есть индекс по диапазону всё равно нужен, иначе вырастет частота ложных `40001`.
- Каждый конфликт — это отменённая транзакция и повтор, то есть лишняя работа и задержка ответа гостю.
- `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE` внутри транзакции совместим с transaction mode пулера
  (настройка живёт до конца транзакции), но требует явной транзакции на каждый запрос.

**Когда уместен.** Когда правило нельзя выразить ограничением (например, «не более N записей в день»,
«сумма длительностей в день ≤ X», проверка против другой таблицы). Для «интервалы не пересекаются»
он избыточен и слабее EXCLUDE.

### 3. Advisory lock на владельца или на день

**Как работает.** Advisory lock — блокировка с прикладным смыслом, которую сервер не проверяет за приложением:

> "PostgreSQL provides a means for creating locks that have application-defined meanings. These are called
> advisory locks, because the system does not enforce their use — it is up to the application to use them
> correctly." — [PostgreSQL 18, 13.3.5](https://www.postgresql.org/docs/18/explicit-locking.html#ADVISORY-LOCKS)

Схема для бронирования: в одной транзакции взять `pg_advisory_xact_lock(key)`, затем проверить пересечение
SELECT-ом, затем вставить. Второй запрос ждёт на локе, после освобождения видит закоммиченную строку и
возвращает «слот занят» **без исключения**. Проверено: вторая сессия ждала 1,7 с и получила
`overlapping_after_lock = 1`.

**Варианты уровня.**

- `pg_advisory_xact_lock` — освобождается автоматически в конце транзакции, «there is no explicit unlock
  operation» ([PostgreSQL 18, 9.28.3](https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS)).
- `pg_advisory_lock` — сессионный, переживает `ROLLBACK` и освобождается только явно или при закрытии сессии.

**Главное ограничение в нашем окружении.** Supabase в transaction mode возвращает соединение в пул после
каждой транзакции, и «Session-level state is lost between transactions. This covers set and reset,
session-level advisory locks, listen and notify, and temporary tables»
([Supabase, Connecting to your database, обновлено 17 ноября 2026](https://supabase.com/docs/guides/database/connecting-to-postgres)).
Значит, допустим только `pg_advisory_xact_lock`; сессионный лок в transaction mode может «повиснуть» на
соединении, которое достанется другому клиенту.

**Гранулярность.** Ключ должен покрывать всё, что может конфликтовать:

- «на день» — `pg_advisory_xact_lock(hashtextextended('booking:' || (starts_at at time zone 'Europe/Moscow')::date, 0))`;
  дата обязательно локальная, иначе ночные слоты попадут в разные ключи.
- «на владельца» — константный ключ; для одного владельца это фактически глобальный мьютекс на все записи.

**Плюсы.** Конфликт — это обычное «0 строк», а не исключение; нет зависимости от текста ошибок; можно
вернуть 409 без ретраев.

**Минусы.** Гарантия держится только на дисциплине: любой путь записи без лока (SQL-консоль, миграция,
сид, будущий админский эндпоинт) создаёт пересечение. Лок огрубляет параллелизм: при ключе «день»
последовательные, но непересекающиеся бронирования того же дня выполняются по очереди. 32-битный
`hashtext()` даёт теоретические коллизии между днями; `hashtextextended` (64 бита) практически исключает их.
И наконец, лок не защищает от ошибок в самом SELECT: если предикат пересечения написан неправильно,
лок лишь аккуратно сериализует неправильные вставки.

## Сравнительная таблица

| Критерий                              | EXCLUDE + GiST                        | SERIALIZABLE                                     | Advisory lock                                |
| ------------------------------------- | ------------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| Кто обеспечивает инвариант            | Сервер, декларативно                  | Приложение + SSI (нужен предварительный SELECT)  | Приложение (нужен лок + SELECT)              |
| Обходится ли кодом приложения         | Нет                                   | Да, если путь записи не читает диапазон          | Да, если путь записи не берёт лок            |
| Уровень изоляции                      | READ COMMITTED достаточно             | Только SERIALIZABLE во всех транзакциях записи   | READ COMMITTED достаточно                    |
| Что видит приложение при конфликте    | `23P01` (или `40P01`)                 | `40001`                                          | 0 строк                                      |
| Нужен ли ретрай                       | Нет (кроме редкого `40P01`)           | Да, всегда                                       | Нет                                          |
| Блокировки                            | Точечно: только конфликтующие вставки | Предикатные, без блокировок, но с ценой памяти   | Грубо: все вставки с тем же ключом           |
| Влияние долгой транзакции             | Второй вставщик ждёт её завершения    | Конфликт обнаруживается на commit                | Все ждут освобождения лока                   |
| Работа через transaction mode пулера  | Да                                    | Да (`SET TRANSACTION` в транзакции)              | Да, только `_xact_`-вариант                  |
| Цена схемы                            | Один GiST-индекс, ~50–70 Б/строку     | Индекс по диапазону всё равно нужен              | 0 Б в таблице, но нужен индекс для SELECT    |
| Отказоустойчивость к забытому `where` | Полная                                | Нет                                              | Нет                                          |
| Основной риск                         | `40P01` при истинной одновременности  | Ложные `40001`, лишние повторы, дыры в протоколе | Человеческий фактор, огрубление параллелизма |

## Рекомендуемый механизм и DDL

**Рекомендация: EXCLUDE-ограничение + `ON CONFLICT DO NOTHING` как способ узнать о конфликте.**
Ограничение — гарантия, `ON CONFLICT` — удобный и устойчивый способ превратить её в 409 без разбора
исключений и без `40P01`.

### Миграция (вариант для MVP, один календарь)

```sql
-- Записи гостей. Один календарь, поэтому ограничение глобальное: диапазон без колонки-скоупа.
create table bookings (
  id            bigint generated always as identity primary key,
  event_type_id text        not null references event_types (id),
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  guest_name    text        not null,
  guest_email   text        not null,
  created_at    timestamptz not null default now(),

  -- Нулевые и перевёрнутые интервалы не должны попадать в таблицу:
  -- пустой диапазон не пересекается ни с чем и прошёл бы мимо EXCLUDE.
  constraint bookings_time_valid check (ends_at > starts_at),

  -- Полуоткрытые интервалы [starts_at, ends_at) => записи «встык» разрешены.
  constraint bookings_no_overlap
    exclude using gist (tstzrange(starts_at, ends_at) with &&)
);

-- Для списка предстоящих записей владельца и выборки по дню:
-- exclusion-индекс обслуживает только операторы диапазонов, не order by starts_at.
create index bookings_starts_at_idx on bookings (starts_at);
```

Что здесь важно:

- Имя ограничения `bookings_no_overlap` — часть контракта: на него ссылается `ON CONFLICT` и тесты.
  Переименование ограничения = изменение кода.
- `btree_gist` не требуется. Это не «урезанная» версия: правило глобальное, скоуп-колонки нет.
- EXCLUDE автоматически создаёт GiST-индекс с именем ограничения
  ([PostgreSQL 18, 5.5.6](https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-EXCLUSION)),
  отдельный `create index … using gist` не нужен.
- `NOT NULL` на `starts_at`/`ends_at` — часть гарантии, а не украшение.

### Вариант на будущее: несколько календарей или разделение по владельцу

Если когда-нибудь появятся несколько владельцев и правило станет «не пересекаются записи одного владельца»,
к диапазону добавляется колонка равенства и расширение `btree_gist`:

```sql
create extension if not exists btree_gist with schema extensions;

create table bookings (
  id          bigint generated always as identity primary key,
  owner_id    text        not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  constraint bookings_time_valid check (ends_at > starts_at),
  constraint bookings_no_overlap
    exclude using gist (owner_id with =, tstzrange(starts_at, ends_at) with &&)
);
```

`btree_gist` даёт GiST-классы операторов для скалярных типов (`text`, `uuid`, `int` и др.) и применяется
именно в таких составных ограничениях
([PostgreSQL 18, F.8](https://www.postgresql.org/docs/18/btree-gist.html),
[8.17.10](https://www.postgresql.org/docs/18/rangetypes.html#RANGETYPES-CONSTRAINT)).
Расширение доступно на Supabase ([Supabase, Extensions, обновлено 13 августа 2026](https://supabase.com/docs/guides/database/extensions))
и ставится в схему `extensions`. Проверено локально: если расширение лежит в `extensions`, а `search_path`
содержит только `public`, ограничение всё равно создаётся — default opclass для типа и метода доступа
находится по `pg_opclass`, а не по `search_path`. Явно указывать opclass нужно только если вы задаёте его
по имени.

### Вставка записи

Одна команда — одна атомарная единица, явная транзакция не нужна:

```sql
insert into bookings (event_type_id, starts_at, ends_at, guest_name, guest_email)
values ($1, $2, $3, $4, $5)
on conflict on constraint bookings_no_overlap do nothing
returning id;
```

- Вернулась строка — запись создана (201).
- Вернулось 0 строк — слот занят (409). Других причин «0 строк» у этого запроса нет: `id` генерируется,
  триггеров, возвращающих NULL, в схеме нет.

Почему `ON CONFLICT`, а не перехват исключения:

1. `DO NOTHING` использует speculative insertion, а для неё код Postgres **специально избегает deadlock**,
   откатывая спекулятивную вставку и ожидая конкурента. В эксперименте: 60 одновременных пар — 0 ошибок,
   тогда как без `ON CONFLICT` в 19 из 100 пар приходил `40P01`.
2. Не нужно сопоставлять SQLSTATE и разбирать текст ошибки.
3. `ON CONFLICT DO UPDATE` с exclusion-ограничением **нельзя**: «exclusion constraints are not supported
   as arbiters with ON CONFLICT DO UPDATE. In all cases, only NOT DEFERRABLE constraints and unique indexes
   are supported as arbiters» ([PostgreSQL 18, INSERT](https://www.postgresql.org/docs/18/sql-insert.html#SQL-ON-CONFLICT)).

Цена `ON CONFLICT`: конфликтующая вставка всё равно ждёт завершения транзакции конкурента (замерено 1,67 с
при чужой транзакции 2 с), то есть ожидание не исчезает — исчезает только ошибка.

### Чтение занятости

Для проверки занятости и для сетки слотов используйте то же выражение, что в ограничении, — тогда работает
GiST-индекс:

```sql
select 1
from bookings
where tstzrange(starts_at, ends_at) && tstzrange($1, $2)
limit 1;
```

План на 65 тыс. строк: `Index Scan using bookings_no_overlap`, 0,02 мс. А `order by starts_at` идёт по
`bookings_starts_at_idx`; без него — seq scan (проверено).

## Правило «ошибка → 409»

### Основной путь: без исключений

```ts
// src/lib/bookings/create-booking.ts (эскиз; драйвер — предмет тикета #9)
const rows = await sql<{ id: string }[]>`
  insert into bookings (event_type_id, starts_at, ends_at, guest_name, guest_email)
  values (${eventTypeId}, ${startsAt}, ${endsAt}, ${guestName}, ${guestEmail})
  on conflict on constraint bookings_no_overlap do nothing
  returning id
`;

if (rows.length === 0) {
  return { ok: false as const, reason: "slot-taken" as const };
}
return { ok: true as const, id: rows[0].id };
```

В Route Handler:

```ts
const result = await createBooking(input);
if (!result.ok && result.reason === "slot-taken") {
  return Response.json(
    { error: "slot_taken", message: "Это время уже занято, выберите другой слот" },
    { status: 409 },
  );
}
```

### Запасной путь: сопоставление SQLSTATE

Если исключение всё же прилетело (другой путь записи, гонка с `40P01`, будущий код), решение принимается
**только по коду**, а не по тексту сообщения: текст локализуется и меняется между версиями, а код — часть
протокола ([PostgreSQL 18, Appendix A](https://www.postgresql.org/docs/18/errcodes-appendix.html)).

| SQLSTATE | Имя                     | Что означает здесь                                                    | HTTP                         |
| -------- | ----------------------- | --------------------------------------------------------------------- | ---------------------------- |
| `23P01`  | `exclusion_violation`   | слот занят                                                            | **409**                      |
| `40P01`  | `deadlock_detected`     | одновременная вставка того же слота, одну транзакцию отменил детектор | **409** после одного повтора |
| `23505`  | `unique_violation`      | дубль по другому уникальному ключу                                    | 409, но с другим сообщением  |
| `23514`  | `check_violation`       | `ends_at <= starts_at` — баг валидации на входе                       | 422 (не 409)                 |
| `40001`  | `serialization_failure` | только если включён SERIALIZABLE                                      | повтор, затем 503            |
| `57014`  | `query_canceled`        | `statement_timeout`: вставка слишком долго ждала                      | 503/504 (не 409)             |
| `53300`  | `too_many_connections`  | исчерпан пул соединений                                               | 503                          |
| `08xxx`  | `connection_exception`  | обрыв соединения                                                      | 503                          |

```ts
type PgErrorLike = { code?: string; constraint?: string; table?: string };

const SLOT_CONFLICT_CODES = new Set(["23P01", "40P01"]);

export function isSlotConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { code } = error as PgErrorLike;
  return code !== undefined && SLOT_CONFLICT_CODES.has(code);
}
```

Поля `code` и `constraint` есть и у `pg` (`DatabaseError`: `code`, `schema`, `table`, `column`, `constraint` —
[pg-protocol, messages.ts](https://github.com/brianc/node-postgres/blob/master/packages/pg-protocol/src/messages.ts)),
и у Postgres.js (`PostgresError` копирует поля серверной ошибки —
[postgres.js, src/errors.js](https://github.com/porsager/postgres/blob/master/src/errors.js)). Это позволяет
дополнительно сузить проверку до `constraint === "bookings_no_overlap"`, но для 409 достаточно кода:
в схеме MVP других exclusion-ограничений нет.

`40P01` стоит обрабатывать так: один повтор той же вставки (после отката транзакции конкурента она либо
пройдёт, либо честно вернёт `23P01`/0 строк), затем 409. Бесконечный повтор не нужен: конфликт не исчезнет.

### Если бронирование когда-нибудь пойдёт через Data API (supabase-js/PostgREST)

Тогда HTTP-статус ставит PostgREST, а он `23P01` не знает: в таблице соответствий есть только `23503` и
`23505` → 409, всё остальное — `400` ([PostgREST 16, Errors](https://postgrest.org/en/stable/references/errors.html)),
и это подтверждается исходником: `_ -> HTTP.status400` для любого не перечисленного кода
([PostgREST v16.6, Error.hs](https://github.com/PostgREST/postgrest/blob/v16.6/src/library/PostgREST/Error.hs)).
`40P01` там попадает в класс `'4':'0'` → 500. То есть при работе через Data API 409 придётся ставить
самостоятельно по `body.code === "23P01"` (или использовать RPC-функцию с `RAISE sqlstate 'PT409'`).
Для этого проекта проще не ходить в Data API за записью, а писать из Route Handler напрямую в Postgres.

## Supabase и Vercel: что влияет на решение

**Пулер.** Для serverless Supabase рекомендует shared pooler в transaction mode; он возвращает соединение
в пул после каждой транзакции, не поддерживает prepared statements и query pipelining, а состояние сессии
между транзакциями теряется ([Supabase, Connecting to your database, 17 ноября 2026](https://supabase.com/docs/guides/database/connecting-to-postgres)).
Для нашего решения это значит:

- EXCLUDE, `ON CONFLICT`, `SET TRANSACTION ISOLATION LEVEL`, `pg_advisory_xact_lock` — всё это живёт
  внутри транзакции и работает через пулер. `SET LOCAL` действует только до конца транзакции и поэтому
  не утекает в пул, в отличие от обычного `SET`.
- Сессионные вещи (`SET statement_timeout` без `LOCAL`, `pg_advisory_lock`, `LISTEN`, temp-таблицы) —
  не работают или опасны. Документация Supabase отдельно перечисляет session-level advisory locks
  среди теряемого состояния.
- Клиентский пул держите равным 1 на инстанс функции; `prepare: false`; `ssl: "require"`
  ([Supabase, Connecting to your database](https://supabase.com/docs/guides/database/connecting-to-postgres)).
- Осторожно с Postgres.js: он по умолчанию пайплайнит запросы, а с transaction mode это «can hang queries
  or return mismatched rows»; рабочего способа отключить пайплайнинг нет (`max_pipeline: 0` ломает
  `sql.begin()`) — [Supabase, Postgres.js, 25 сентября 2026](https://supabase.com/docs/guides/database/postgres-js).
  Это аргумент в пользу `pg` для этого проекта; выбор драйвера — тикет #9.

**Таймауты.** Для Dashboard и Data API максимум 60 с; у роли `postgres` таймаут не задан и ограничен
глобальным значением по умолчанию 2 минуты; `set statement_timeout` на уровне сессии нельзя использовать
с Supavisor в transaction mode ([Supabase, Timeouts, 16 ноября 2026](https://supabase.com/docs/guides/database/timeouts)).
Практический вывод: в транзакции вставки ставьте `set local statement_timeout = '2s'` (или значение,
заметно меньшее лимита функции Vercel), чтобы зависшая вставка падала с `57014`, а не съедала бюджет функции.

**Лимиты соединений.** На Free-плане (Nano): 60 прямых соединений, 200 клиентов пулера, размер пула
по умолчанию 15 ([Supabase, Compute and Disk, 16 ноября 2026](https://supabase.com/docs/guides/platform/compute-and-disk)).
При пуле 1 на инстанс функции и нескольких десятках тёплых инстансов это не проблема, но именно поэтому
нельзя открывать соединение на запрос.

**Длительность функции.** Vercel Functions на Hobby: по умолчанию и максимум 300 с при fluid compute
([Vercel, Duration, 24 августа 2026](https://vercel.com/docs/functions/configuring-functions/duration)).
Транзакция бронирования должна занимать единицы миллисекунд; всё, что дольше, — повод для `statement_timeout`.

**Free-план.** Проект ставится на паузу после недели неактивности
([Supabase, Pricing, доступ 18 ноября 2026](https://supabase.com/pricing)). Для календаря это операционный
риск (первый запрос после паузы/восстановления), но на корректность ограничения он не влияет.

**Версия Postgres.** На дату проверки актуальна PostgreSQL 18.7; документация поддерживает 14–18. Всё, что
используется в рекомендации (range-типы, EXCLUDE, `ON CONFLICT … ON CONSTRAINT`), присутствует во всех этих
версиях. Возможности, специфичные для 18 (`UNIQUE (… WITHOUT OVERLAPS)`), в отчёте не используются: они
потребовали бы генерируемую колонку с диапазоном и привязывают схему к версии.

## Цена: индексы, блокировки, замеры

Замеры на локальном PostgreSQL 18.7, таблица с ограничением и CHECK, слоты по 30 минут.

| Метрика                                              | Значение                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| 10 387 строк                                         | heap 952 kB, GiST-индекс ограничения 736 kB (~72 Б/строку)      |
| 65 755 строк                                         | heap 5 984 kB, GiST-индекс 4 696 kB (~48 Б/строку), всего 12 MB |
| 200 вставок в одной транзакции на 65 тыс. строк      | 7,7 мс всего, ~0,04 мс на вставку                               |
| Проверка пересечения (GiST) на 65 тыс. строк         | `Index Scan`, 0,02 мс                                           |
| Список предстоящих (`order by starts_at`) без B-tree | seq scan 1,2 мс на 10 тыс. строк                                |
| Ожидание конфликтующей вставки                       | равно длительности транзакции конкурента (3,49 с при 4 с)       |
| Непересекающиеся вставки одновременно                | не блокируются (0,6 мс)                                         |

Для масштаба проекта (окно записи 14 дней, рабочие часы 09:00–18:00, слоты по 15–60 минут) это сотни строк,
то есть индекс ограничения — десятки килобайт, а вставка — доли миллисекунды. Цена схемы пренебрежима;
единственная реальная цена — ожидание при конфликте и редкий `40P01`.

## Риски и ограничения

1. **`40P01` при истинной одновременности.** Документирован в исходниках и воспроизведён: 19 из 100 пар.
   Лечится `ON CONFLICT DO NOTHING` (0 из 60 пар с ошибкой) и запасным маппингом `40P01` → 409.
2. **Долгая транзакция блокирует конфликтующие вставки.** Ограничение не отменяет ожидание. Держите
   транзакцию в одну вставку; не делайте внешних вызовов (email, вебхуки) внутри неё.
3. **`statement_timeout` даёт `57014`, а не конфликт.** Если не отличить, гость получит 409 за то, что
   кто-то просто медленно работает. `57014` — это 503/504.
4. **Ограничение не проверяет бизнес-правила за пределами интервала.** Длительность записи, соответствие
   длительности типа события, рабочие часы, шаг сетки, окно 14 дней — это валидация входа и/или CHECK,
   а не EXCLUDE. Ограничение лишь гарантирует непересечение.
5. **Пустые интервалы.** `tstzrange(x, x)` пуст и не конфликтует; без `check (ends_at > starts_at)`
   в таблицу можно записать невидимую для EXCLUDE запись (проверено).
6. **`NULL`.** `NULL` в границах отключает проверку для строки; колонки обязаны быть `NOT NULL`.
7. **`DEFERRABLE`.** Переносит ошибку на `COMMIT` и лишает `ON CONFLICT` арбитра — не использовать.
8. **Глобальность правила.** Сейчас ограничение запрещает пересечения между всеми типами событий. Если
   продукт захочет «параллельные календари по типам», потребуется миграция ограничения (вариант с
   `btree_gist` выше), а не «ослабление» существующего.
9. **Data API возвращает 400 на `23P01`.** Если запись когда-нибудь пойдёт через supabase-js/PostgREST,
   статус 409 придётся ставить самостоятельно по коду в теле.
10. **Имя ограничения — контракт.** `ON CONFLICT ON CONSTRAINT bookings_no_overlap` сломается при
    переименовании; нужен тест, который вставляет пересечение и проверяет `23P01` + имя ограничения.
11. **Free-план Supabase** ставит проект на паузу после недели неактивности и ограничивает соединения;
    на корректность инварианта не влияет, но влияет на доступность бронирования.
12. **Драйвер.** Postgres.js с transaction mode имеет документированную проблему пайплайнинга; выбор
    драйвера должен это учитывать (тикет #9).

## Что это значит для реализации

1. **Миграция.** Одна таблица `bookings` с `check (ends_at > starts_at)` и
   `exclude using gist (tstzrange(starts_at, ends_at) with &&)`, плюс `create index … (starts_at)`.
   `btree_gist` не подключать, пока правило глобальное. Миграция проверяется на чистой базе и в CI
   (без секретов БД — поднятый в CI Postgres, см. рамки карты).
2. **Единственный путь записи.** Route Handler → функция `createBooking` → один `insert … on conflict …
   do nothing returning id`. Никаких предварительных SELECT как гарантии: они допустимы только для UX
   (показать занятость), но не заменяют ограничение.
3. **Маппинг ошибок.** Отдельный модуль: `23P01` и `40P01` → 409 с текстом «Это время уже занято,
   выберите другой слот»; `23514` → 422; `57014`, `53300`, `08xxx` → 503; всё остальное — 500 с логированием.
4. **Транзакция короткая.** Одна вставка; при необходимости `set local statement_timeout` (2 с);
   внешние вызовы — после коммита.
5. **Интеграционные тесты против настоящего Postgres** (требование карты). Минимальный набор:
   - встык (10:00–10:30, 10:30–11:00) — обе записи создаются;
   - пересечение на 1 микросекунду — 409, в БД одна строка;
   - одновременные одинаковые вставки из двух независимых соединений (`Promise.allSettled`) — ровно одна
     201 и один 409; повторить 20–50 раз, чтобы покрыть путь `40P01`;
   - первая транзакция откатилась — вторая успешна (нет ложного 409);
   - `ends_at <= starts_at` — 422, не 409;
   - проверка `23P01` + `constraint = 'bookings_no_overlap'` (защита от переименования).
6. **Тест на конкурентность должен использовать два разных соединения**, а не два запроса в одном пуле
   с `max: 1`: иначе второй запрос просто ждёт первый и гонки не будет.

## Открытые вопросы

- Драйвер доступа к БД (тикет #9): `pg` выглядит безопаснее с transaction mode из-за пайплайнинга Postgres.js;
  на выбор также влияет миграционный инструмент.
- Нужна ли идемпотентность повторной отправки формы гостем (двойной клик) — сейчас её закрывает только
  уникальность слота: второй запрос получит 409, что приемлемо, но сообщение будет «время занято».
- Появятся ли несколько владельцев или разделение календарей по типам событий (тогда — вариант с `btree_gist`).
- Нужен ли `partial` вариант ограничения (например, не учитывать отменённые записи), если появится отмена.

## Приложение: как воспроизвести гонку

Скрипт ниже воспроизводит разницу между `ON CONFLICT` и обычной вставкой. Нужен локальный PostgreSQL
с таблицей из раздела [«Как проверялось»](#как-проверялось); `psql` запускается дважды одновременно.

```bash
#!/bin/bash
# 30 одновременных пар вставок одного и того же слота; $1 = with-oc | plain
mode="$1"
c23=0; c40=0; cother=0
for i in $(seq 1 30); do
  psql -h /tmp -p 55432 -U postgres -q \
    -c "delete from bookings where starts_at = '2026-07-02 11:00+03';" >/dev/null 2>&1
  base="insert into bookings (event_type_id, starts_at, ends_at, guest_name, guest_email)
        values ('a','2026-07-02 11:00+03','2026-07-02 11:30+03','A','a@x')"
  if [ "$mode" = "with-oc" ]; then
    sql="$base on conflict on constraint bookings_no_overlap do nothing;"
  else
    sql="$base;"
  fi
  psql -h /tmp -p 55432 -U postgres -q -c "$sql" >/tmp/a.out 2>&1 &
  psql -h /tmp -p 55432 -U postgres -q -c "$sql" >/tmp/b.out 2>&1 &
  wait
  grep -q "conflicting key value violates exclusion constraint" /tmp/a.out /tmp/b.out && c23=$((c23+1))
  grep -qi "deadlock detected" /tmp/a.out /tmp/b.out && c40=$((c40+1))
  grep -qi "ERROR" /tmp/a.out /tmp/b.out \
    && ! grep -q "conflicting key value" /tmp/a.out /tmp/b.out \
    && ! grep -qi "deadlock" /tmp/a.out /tmp/b.out && cother=$((cother+1))
done
echo "mode=$mode 23P01=$c23 40P01=$c40 other=$cother"
```

Ожидаемый результат на этой машине: `plain` даёт смесь `23P01` и `40P01` (у меня 19 deadlock-ов на 100 пар
в трёх сериях), `with-oc` — ни одной ошибки: ровно одна вставка на пару, вторая получает 0 строк.

## Источники

Документация PostgreSQL 18 (проверено 18 ноября 2026):

- 5.5.6 Exclusion Constraints — <https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-EXCLUSION>
- CREATE TABLE (EXCLUDE, DEFERRABLE, NOT DEFERRABLE) — <https://www.postgresql.org/docs/18/sql-createtable.html>
- INSERT, ON CONFLICT — <https://www.postgresql.org/docs/18/sql-insert.html>
- 8.17 Range Types (bounds, конструкторы, 8.17.9 Indexing, 8.17.10 Constraints on Ranges) — <https://www.postgresql.org/docs/18/rangetypes.html>
- 13.2 Transaction Isolation (Read Committed, Serializable, `40001`) — <https://www.postgresql.org/docs/18/transaction-iso.html>
- 13.3.5 Advisory Locks — <https://www.postgresql.org/docs/18/explicit-locking.html#ADVISORY-LOCKS>
- 9.28.3 Advisory Lock Functions — <https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS>
- 63.5 Index Uniqueness Checks (ожидание незавершённых транзакций) — <https://www.postgresql.org/docs/18/index-unique-checks.html>
- Appendix A. PostgreSQL Error Codes (`23P01`, `40P01`, `40001`, `57014`, `23514`, `53300`) — <https://www.postgresql.org/docs/18/errcodes-appendix.html>
- F.8 btree_gist — <https://www.postgresql.org/docs/18/btree-gist.html>
- Исходники: `src/backend/executor/execIndexing.c`, ветка REL_18_STABLE — <https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/executor/execIndexing.c>

Supabase (даты обновления страниц указаны):

- Connecting to your database (transaction mode, ограничения, настройки клиента) — 17 ноября 2026 — <https://supabase.com/docs/guides/database/connecting-to-postgres>
- Connection pooling and limits — 27 октября 2026 — <https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits>
- Compute and Disk (лимиты соединений Nano/Free) — 16 ноября 2026 — <https://supabase.com/docs/guides/platform/compute-and-disk>
- Timeouts (60 с, роли, `SET` в transaction mode) — 16 ноября 2026 — <https://supabase.com/docs/guides/database/timeouts>
- Postgres Extensions (btree_gist, схема `extensions`) — 13 августа 2026 — <https://supabase.com/docs/guides/database/extensions>
- Postgres.js (пайплайнинг с transaction mode) — 25 сентября 2026 — <https://supabase.com/docs/guides/database/postgres-js>
- Serverless drivers — 17 ноября 2026 — <https://supabase.com/docs/guides/database/connecting-to-postgres/serverless-drivers>
- Pricing (пауза Free-проектов) — доступ 18 ноября 2026 — <https://supabase.com/pricing>

Прочее:

- PostgREST 16, Errors (таблица SQLSTATE → HTTP) — <https://postgrest.org/en/stable/references/errors.html>
- PostgREST v16.6, `src/library/PostgREST/Error.hs` (fallback `400`, `40*` → 500) — <https://github.com/PostgREST/postgrest/blob/v16.6/src/library/PostgREST/Error.hs>
- Vercel Functions: Duration (Hobby 300 с) — 24 августа 2026 — <https://vercel.com/docs/functions/configuring-functions/duration>
- pg-protocol, `DatabaseError` (`code`, `constraint`, `table`) — <https://github.com/brianc/node-postgres/blob/master/packages/pg-protocol/src/messages.ts>
- postgres.js, `PostgresError` — <https://github.com/porsager/postgres/blob/master/src/errors.js>
