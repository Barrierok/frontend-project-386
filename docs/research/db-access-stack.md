# Доступ к Postgres: Drizzle ORM, Prisma или raw SQL

Исследование по тикету [#11](https://github.com/Barrierok/frontend-project-386/issues/11) карты
[#7](https://github.com/Barrierok/frontend-project-386/issues/7): какой способ доступа к Postgres выбрать для
Next.js 16 на Vercel с Supabase Free.

Дата проверки: 18 ноября 2026. Версии, размеры бандлов и поведение БД проверялись в этот день на
macOS 26 (arm64), Node.js 26.13.0, npm 12.2.2, PostgreSQL 18.6.

## TL;DR

- **Рекомендация: Drizzle ORM 0.45.4 + драйвер `node-postgres` (`pg` 8.23.1) + миграции `drizzle-kit` 0.31.11.**
  Схема — TypeScript, типы выводятся из неё, EXCLUDE-ограничение добавляется одной ручной SQL-миграцией
  (`drizzle-kit generate --custom`), частичные индексы генерируются штатно.
- **`postgres.js` в transaction mode рискован:** он пайплайнит запросы (`max_pipeline: 100` по умолчанию), а
  Supabase прямо предупреждает, что в transaction mode это «может вешать запросы или возвращать чужие строки»;
  выключить пайплайнинг без поломки транзакций нельзя (`max_pipeline: 0` ломает `sql.begin()`, upstream-баг
  porsager/postgres#1189). `pg` отправляет безымянные запросы и не пайплайнит — с пулером работает предсказуемо.
- **Prisma 7.10.1 рабочая, но дорогая для этого проекта:** клиент тянет query compiler в WASM — собранный бандл
  **4,95 МБ (1,77 МБ gzip)** против **173 КБ (49 КБ gzip)** у Drizzle + `pg`; EXCLUDE не поддерживается (только
  ручная миграция, ошибка приходит как `P2039` с текстом `Code: 23P01`); частичные индексы — за preview-флагом
  `partialIndexes`; `prisma generate` **падает без `DATABASE_URL`**, то есть «сборка без секретов БД» требует
  обходного пути в `prisma.config.ts`.
- **`npm i prisma` сейчас ставит `8.0.0-rc.34`** (dist-tag `latest`, 16.11.2026), а не 7.x — версию надо пинить.
- **Raw SQL на `pg` — законный минимальный вариант** (87 КБ, 27 КБ gzip, полный контроль DDL), но типы строк и
  сборку запросов придётся вести руками; при 2–3 таблицах это дешевле, чем кажется, и хорошо сочетается с
  «одна миграция = один .sql-файл».
- **Ключевой факт про ограничение бронирований:** EXCLUDE-ограничение с `btree_gist` — самый прямой способ
  гарантировать отсутствие пересечений на уровне БД (альтернативы — уникальность по слоту или advisory locks —
  дороже в коде). Проверено: 10 параллельных вставок одного интервала дают ровно 1 успех и 9 ошибок `23P01`,
  соседний интервал вставляется, а отменённая запись (частичное EXCLUDE `WHERE status = 'confirmed'`)
  пересечение не блокирует.

## Как проверялось

Методика: каждый кандидат ставился в изолированный каталог с `typescript@7.0.2`, один и тот же DDL прогонялся
на настоящем PostgreSQL 18.6 (бинарники через `embedded-postgres@18.6.0-beta.19`), после чего измерялись
типизация (`tsc 7.0.2`), сгенерированный SQL, поведение гонки и размер бандла (`esbuild 0.28.2`, `--bundle
--minify --platform=node --format=esm`).

Docker в этой среде недоступен (`docker` не установлен), поэтому миграции и конкурентные тесты гонялись против
настоящего локального Postgres 18.6, а не контейнера. Для SQL это эквивалентно; ограничения Supavisor/PgBouncer
локально не воспроизводились — факты о transaction mode взяты из документации Supabase.

| Проверка                                                           | Результат                                                                                                                  |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `drizzle-kit generate` для частичных индексов                      | Генерирует `CREATE UNIQUE INDEX ... WHERE "deleted_at" is null` и `CREATE INDEX ... WHERE status = 'confirmed'`            |
| EXCLUDE в схеме Drizzle 0.45.4 и 1.0.0-rc.5                        | API нет: в `pg-core` нет ни `exclude`, ни `exclusion`; нужна ручная миграция                                               |
| `drizzle-kit generate --custom` + EXCLUDE                          | Пустой `.sql` создаётся, миграция применяется, `pg_get_constraintdef` показывает `EXCLUDE USING gist (...)`                |
| 10 параллельных вставок одного интервала (Drizzle + `pg`-клиент)   | `{ ok: 1, failed: 9 }`, код ошибки `23P01`                                                                                 |
| Соседний интервал `[10:30, 11:00)` после занятого `[10:00, 10:30)` | Вставляется                                                                                                                |
| Пересекающаяся запись со `status = 'cancelled'`                    | Вставляется (EXCLUDE частичный, `WHERE status = 'confirmed'`)                                                              |
| `drizzle-kit push --force` при наличии EXCLUDE                     | «No changes detected»; ограничение не удаляется                                                                            |
| `prisma migrate dev` при EXCLUDE в истории миграций                | «Already in sync»; drift не обнаружен, ограничение сохраняется                                                             |
| `prisma db pull`                                                   | Предупреждение: «These constraints are not supported by Prisma Client… does not fully support exclusion constraints»       |
| Ошибка EXCLUDE через Prisma                                        | `PrismaClientKnownRequestError`, `code: "P2039"`, в сообщении `Database error. Code: 23P01`                                |
| `tsc 7.0.2` на коде Drizzle / postgres.js / Prisma                 | Все три компилируются при `skipLibCheck: true` (настройка проекта)                                                         |
| `tsc 7.0.2` при `skipLibCheck: false` для drizzle-orm 0.45.4       | Падает на `.d.ts` самой библиотеки: нет модуля `gel`, `SQLWrapper.getSQL` и т. п.                                          |
| `prisma generate` без `DATABASE_URL`                               | `PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL`                                                  |
| `prisma generate` с fallback-URL в `prisma.config.ts`              | Работает без секретов                                                                                                      |
| Импорт модуля Drizzle без `DATABASE_URL`                           | Не бросает: `postgres()` ленив, клиент создаётся без подключения                                                           |
| `pg` и параметры `connection_limit` / `pgbouncer` в URL            | Игнорируются: `new Pool({ connectionString: "...?connection_limit=1" }).options.max === 10`; строки `pgbouncer` нет в `pg` |

Версии, фигурирующие в отчёте (npm registry, 18.11.2026):

| Пакет                      | Версия      | Дата публикации |
| -------------------------- | ----------- | --------------- |
| `next`                     | 16.4.6      | —               |
| `react`                    | 19.3.0      | —               |
| `typescript`               | 7.0.2       | —               |
| `drizzle-orm`              | 0.45.4      | 08.10.2026      |
| `drizzle-orm` (rc)         | 1.0.0-rc.5  | 21.10.2026      |
| `drizzle-kit`              | 0.31.11     | 21.09.2026      |
| `prisma`                   | 7.10.1      | 15.10.2026      |
| `prisma` (dist-tag latest) | 8.0.0-rc.34 | 16.11.2026      |
| `@prisma/client`           | 7.10.1      | 15.10.2026      |
| `@prisma/adapter-pg`       | 7.10.1      | 15.10.2026      |
| `pg`                       | 8.23.1      | 30.09.2026      |
| `postgres`                 | 4.1.1       | 11.11.2026      |
| PostgreSQL (локально)      | 18.6        | —               |

## 1. Контекст: Supabase Free и Vercel

### 1.1. Четыре способа подключиться к Supabase

Supabase предлагает прямые подключения, общий пулер Supavisor в session- и transaction-режиме и выделенный
PgBouncer (только Pro). Для serverless документация выбирает общий пулер в transaction mode [1]:

| Режим                         | Хост:порт                                   | Free | Что важно                                                            |
| ----------------------------- | ------------------------------------------- | ---- | -------------------------------------------------------------------- |
| Direct                        | `db.[REF].supabase.co:5432`                 | IPv6 | Только IPv6 без IPv4 add-on; для миграций и `pg_dump`                |
| Shared pooler, session        | `aws-[N]-[REGION].pooler.supabase.com:5432` | IPv4 | Поддерживает prepared statements, сессионное состояние               |
| Shared pooler, transaction    | `aws-[N]-[REGION].pooler.supabase.com:6543` | IPv4 | Нет prepared statements, нет пайплайнинга, нет сессионного состояния |
| Dedicated pooler, transaction | `db.[REF].supabase.co:6543`                 | —    | Pro+, PgBouncer 1.21+ поддерживает prepared statements               |

Практические следствия для проекта:

- рантайм на Vercel — только transaction mode (порт 6543) через общий пулер;
- миграции — отдельное подключение (session mode 5432 или direct), потому что DDL и `advisory locks` требуют
  одной сессии;
- username у общего пулера — `postgres.[PROJECT-REF]`, а не `postgres` [1].

### 1.2. Ограничения transaction mode

Supabase перечисляет четыре ограничения transaction mode [1]:

1. **Prepared statements не поддерживаются** — их надо выключить в драйвере (`prepare: false` у Postgres.js и
   Drizzle, `pgbouncer=true` у Prisma, `statement_cache_size=0` у asyncpg);
2. **Курсоры** живут только внутри транзакции (`WITH HOLD` не выживает);
3. **Сессионное состояние теряется**: `SET`, session-level advisory locks, `LISTEN/NOTIFY`, временные таблицы;
4. **Пайплайнинг запросов не поддерживается** — соединение возвращается в пул по первому завершённому ответу,
   даже если клиент уже поставил в очередь следующие запросы.

Пункт 4 — главная причина не брать `postgres.js` вслепую: у него пайплайнинг включён по умолчанию
(`max_pipeline: 100` в исходниках 4.1.1), а Supabase в гайде по Postgres.js пишет, что связка «пайплайнинг +
transaction mode» может вешать запросы или возвращать чужие строки, и что рабочего способа выключить
пайплайнинг нет: `max_pipeline: 0` ломает `sql.begin()` (upstream-баг) [7].

### 1.3. Лимиты Supabase Free (Nano)

| Параметр                      | Значение |
| ----------------------------- | -------- |
| Max DB connections            | 60       |
| Connection Pooler Max Clients | 200      |
| Default Pool Size             | 15       |
| Max DB size (рекомендация)    | 500 МБ   |

Источник: таблица compute-размеров Supabase [3]. То есть приложение может открыть до 200 клиентских
соединений к пулеру, но сам пулер держит к Postgres только 15 бэкенд-соединений (настраивается в Dashboard).
Дешёвая стратегия для serverless: **одно соединение на тёплый инстанс** (`max: 1`), как и советует Supabase [1].

### 1.4. Vercel

- Размер функции — **250 МБ в распакованном виде**; памяти на Hobby — 2 ГБ, длительность — до 300 с [20].
- По умолчанию функции выполняются в одном регионе **`iad1`** (Вирджиния), регион можно сменить [20].
- Node.js на Vercel: по умолчанию **26.x**, доступны 24.x и 22.x [21]. Требования Prisma 7 (`^22.18 || ^24.11
  || >=26`) и Prisma 8 RC (`^22.18 || ^24.11 || >=26`) выполняются.
- Биллинг функций — активное CPU-время и время провижининга памяти; ожидание БД в активное CPU не входит [20].

Для одной зоны Europe/Moscow разумно держать функцию в `fra1`, а проект Supabase — в ближайшем европейском
регионе: при регионе по умолчанию `iad1` каждый запрос к БД платит трансатлантический RTT.

## 2. Совместимость с TypeScript 7.0.2

| Инструмент        | Как типизируется                                             | Результат при `skipLibCheck: true` (как в `tsconfig.json` проекта) |
| ----------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| Drizzle 0.45.4    | выводит типы из TS-схемы (`$inferSelect`)                    | `tsc 7.0.2` — чисто                                                |
| postgres.js 4.1.1 | свои `.d.ts`, дженерик `sql<Row[]>`                          | `tsc 7.0.2` — чисто                                                |
| `pg` 8.23.1       | `@types/pg` 8.23.1, строки — `any`/дженерик `QueryResultRow` | `tsc 7.0.2` — чисто                                                |
| Prisma 7.10.1     | генерируемый клиент (`prisma-client` generator)              | `tsc 7.0.2` — чисто, включая сгенерированные файлы                 |

Важные оговорки:

- У `drizzle-orm` 0.45.4 `.d.ts` **не проходят** `skipLibCheck: false` под TS 7.0.2: компилятор ругается на
  отсутствующий опциональный peer `gel` и на несоответствия `SQLWrapper.getSQL` в `mysql-core`/`gel-core`.
  Проект живёт с `skipLibCheck: true` (значение по умолчанию у Next.js), поэтому это не блокер, но включать
  строгую проверку библиотек нельзя [измерено].
- Peer-зависимости не конфликтуют: у `drizzle-orm` все драйверы — опциональные peer'ы, у `@prisma/client`
  `typescript >= 5.4.0` тоже опционален, `pg` требует только `@types/pg`.
- `postgres.js` не требует `@types/*`: типы входят в пакет.
- Drizzle-схема — обычный TS-файл, поэтому `oxlint --type-aware --type-check` (штатный `npm run typecheck`
  проекта) видит её как обычный код, без отдельных плагинов.

Вывод: **TS 7 не является дискриминатором** между вариантами — при `skipLibCheck: true` все три работают.
Drizzle и Prisma дают типы автоматически, raw SQL требует ручных типов строк.

## 3. Работа через пулер Supabase в transaction mode

### 3.1. Кто что делает с prepared statements

| Стек                            | Настройка                           | Что происходит                                                                                                                |
| ------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `postgres.js`                   | `prepare: false`                    | Обязательно; иначе `prepared statement "..." already exists`                                                                  |
| Drizzle + `postgres.js`         | `postgres(url, { prepare: false })` | То же, плюс риск пайплайнинга (см. §1.2)                                                                                      |
| Drizzle + `pg`                  | ничего специально                   | `pg` отправляет безымянные запросы (`this.name = config.name`, по умолчанию пусто)                                            |
| Prisma 7 + `@prisma/adapter-pg` | `statementNameGenerator` не задан   | Имена prepared statements не кэшируются: в типах адаптера прямо сказано «If not provided, prepared statements are not cached» |
| Prisma 6 / engine               | `?pgbouncer=true`                   | Выключает prepared statements на уровне движка                                                                                |

Проверено на `pg` 8.23.1 и `@prisma/adapter-pg` 7.10.1:

- в исходниках `pg` и адаптера **нет строки `pgbouncer`**, параметр из URL просто игнорируется;
- `connection_limit=1` в URL тоже игнорируется: `new Pool({ connectionString }).options.max` остаётся 10.
  Размер пула у Prisma 7 задаётся объектом конфигурации (`new PrismaPg({ connectionString, max: 1 })`), а не
  параметром URL. Это ломает привычный рецепт из документации Supabase для Prisma 6 [5][6], если применять его
  к Prisma 7 буквально.

### 3.2. Практическая рекомендация по подключению

- Клиент создаётся **один раз на модуль** (module scope), а не на запрос: тёплый инстанс переиспользует пул [1].
- `max: 1` на инстанс; поднимать только по измерениям.
- `ssl`: Supabase советует `require` [1]. У `pg` 8.23.1 строка `sslmode=require` разбирается в объект `ssl` и
  выдаёт предупреждение, что в этой версии `require`/`prefer`/`verify-ca` трактуются как `verify-full`; если
  корневой сертификат Supabase не в системном хранилище, нужен `sslrootcert` или `uselibpqcompat=true`.
  У `postgres.js` честно работает `ssl: "require"`.
- Миграции — отдельным подключением (session mode 5432), а не через 6543.

Итог по критерию: **Drizzle + `pg` — самый предсказуемый вариант**, потому что одновременно решает две
проблемы transaction mode (нет именованных prepared statements, нет пайплайнинга). `postgres.js` требует
дисциплины и всё равно оставляет риск пайплайнинга; Prisma 7 через `adapter-pg` тоже безопасна, но цена —
размер и сложность конфигурации.

## 4. EXCLUDE-ограничения и частичные индексы в миграциях

### 4.1. Что именно нужно для бронирований

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap_excl"
  EXCLUDE USING gist (
    "meeting_type_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  )
  WHERE ("status" = 'confirmed');
```

`btree_gist` нужен, чтобы GiST умел сравнивать `uuid` через `=`; модуль считается trusted и ставится
пользователем с правом `CREATE` на базу [23]. На Supabase расширения включаются через Dashboard или
`CREATE EXTENSION` [8], а в заметках об апгрейде Supabase отдельно упоминает переиндексацию `btree_gist`
после обновления до PostgreSQL 15.19/17.11 — то есть расширение на платформе используется [9].

`EXCLUDE` с `WHERE` — обычное частичное ограничение: оно проверяет только строки, попадающие в предикат.
Это позволяет держать отменённые записи, не мешая новым бронированиям (проверено).

### 4.2. Drizzle ORM

- Частичные индексы поддерживаются в схеме: у `index` и `uniqueIndex` есть метод `where` с SQL-предикатом [11].
  `drizzle-kit generate` выдал корректный SQL, в том числе `WHERE "deleted_at" is null` для уникального индекса.
- **EXCLUDE-ограничения в API нет** — ни в стабильной 0.45.4, ни в 1.0.0-rc.5 (в `pg-core` отсутствуют
  `exclude`/`exclusion`). Штатный путь — custom-миграция: `drizzle-kit generate --custom --name=...` создаёт
  пустой `.sql`, куда кладётся DDL [12]. Проверено: миграция применяется, ограничение появляется в БД.
- `drizzle-kit push` не удаляет неизвестное ему ограничение (проверено: «No changes detected»), но `push` в
  проекте всё равно лучше не использовать: он сравнивает БД со схемой и в других случаях может дропать
  колонки/индексы. Источник истины — миграции.

Плюс: миграции — обычные `.sql` + снапшоты, их можно читать и ревьюить, `drizzle-kit migrate` не требует
генерации клиента и работает без секретов на этапе сборки.

### 4.3. Prisma

- Частичные индексы появились в Prisma 7, но **за preview-флагом `partialIndexes`**, и предикат задаётся
  `where: raw("...")` либо объектом [16]. Проверено: `prisma migrate diff --from-empty --to-schema` выдал
  `CREATE UNIQUE INDEX ... WHERE ("deleted_at" IS NULL)` и `CREATE INDEX ... WHERE (status = 'confirmed')`.
- **EXCLUDE не поддерживается** — Prisma Schema Language не умеет exclusion constraints; официальный путь —
  `prisma migrate dev --create-only` и дописать SQL руками [15]. Issue prisma/orm#17514 открыт с января 2023
  и не закрыт на 18.11.2026 [18].
- `prisma db pull` честно предупреждает: «These constraints are not supported by Prisma Client, because Prisma
  currently does not fully support exclusion constraints» [измерено].
- `prisma migrate dev` при наличии EXCLUDE в истории миграций отвечает «Already in sync» — то есть теневая БД
  и drift-детект ограничение не ломают [измерено]. Но Prisma его «не видит»: удаление ограничения из БД она
  тоже не заметит, а в сгенерированной миграции его никогда не будет.
- Ошибка нарушения EXCLUDE приходит как `P2039` с текстом `Database error. Code: 23P01`; отдельного
  типизированного кода «слот занят» нет, обрабатывать надо по тексту/`meta`.

### 4.4. Raw SQL

Полный контроль: миграции — `.sql`-файлы, накатываемые `psql` или маленьким раннером на `pg`; EXCLUDE,
частичные индексы и `btree_gist` пишутся ровно так, как в §4.1. Цена — ручные типы строк и ручная сборка
запросов (никакой защиты от опечаток в именах колонок).

### 4.5. Сводка по критерию

| Возможность                     | Drizzle                        | Prisma                                 | Raw SQL                  |
| ------------------------------- | ------------------------------ | -------------------------------------- | ------------------------ |
| Частичный индекс в схеме        | да, `.where()`                 | да, preview `partialIndexes` + `raw()` | да (SQL)                 |
| Частичный уникальный индекс     | да                             | да (preview)                           | да (SQL)                 |
| EXCLUDE в декларативной схеме   | нет                            | нет                                    | да (SQL)                 |
| EXCLUDE в миграции              | custom-миграция                | `--create-only` + правка SQL           | да                       |
| Дрейф из-за ручного ограничения | `push` не дропает (проверено)  | `migrate dev` не дропает (проверено)   | нет                      |
| Ошибка нарушения в коде         | `error.cause.code === "23P01"` | `P2039` + текст                        | `error.code === "23P01"` |

## 5. Размер бандла и стоимость на serverless

Замер `esbuild --bundle --minify --platform=node --format=esm` (один модуль: клиент + один запрос + схема из
двух таблиц):

| Вариант                                  | Бандл        | gzip        |
| ---------------------------------------- | ------------ | ----------- |
| `pg` (raw SQL)                           | 86,5 КБ      | 26,9 КБ     |
| `postgres.js` (raw SQL)                  | 97,1 КБ      | 36,8 КБ     |
| Drizzle + `postgres.js` + схема          | 182,5 КБ     | 58,7 КБ     |
| **Drizzle + `pg` + схема**               | **172,7 КБ** | **48,9 КБ** |
| Prisma 7 + `@prisma/adapter-pg` + клиент | 4 949,8 КБ   | 1 765,2 КБ  |

У Prisma 4,95 МБ — это на 90% встроенный base64 WASM query compiler
(`@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs`, 4 476 КБ в выводе бандла);
остальное — рантайм клиента и `pg`. Next.js выносит `@prisma/client` и `prisma` в `serverExternalPackages` по
умолчанию (`node_modules/next/dist/lib/server-external-packages.jsonc` в 16.4.6), поэтому в реальной сборке
файл не обязательно попадёт в бандл функции целиком, но 4,5 МБ WASM всё равно нужно доставить и
инициализировать на холодном старте.

Стоимость:

- **Vercel Hobby**: функции бесплатны в пределах лимитов; платят за активное CPU и провижининг памяти [20].
  Запрос к БД — это I/O, в активное CPU не входит. Значит, размер бандла влияет не на «часы», а на холодный
  старт и потребление памяти.
- **Supabase Free (Nano)**: 60 соединений к БД, 200 клиентов пулера, 15 бэкенд-соединений, 500 МБ данных [3].
  При `max: 1` на инстанс 200 тёплых инстансов упрутся в 15 реальных соединений — узкое место не в клиенте, а
  в пуле; запросы должны быть короткими, а лучше один-два на запрос.
- 250 МБ на функцию [20] не достигаются ни одним вариантом (Prisma добавляет ~5 МБ), так что лимит не
  блокирует, но cold start и память — реальная статья расхода на Hobby.

## 6. Тесты против локального Postgres и сборка без секретов

### 6.1. Docker для интеграционных тестов

```yaml
# docker-compose.test.yml
services:
  postgres:
    image: postgres:18
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: calendar
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d calendar"]
      interval: 2s
      timeout: 2s
      retries: 20
```

Любой из трёх стеков накатывает миграции в этот контейнер: `drizzle-kit migrate` / `migrate()` (Drizzle),
`prisma migrate deploy` (Prisma), `psql -f` (raw). Разница — в церемониях:

| Стек    | Что нужно в CI для миграций                                                                            | Что нужно на этапе `next build`                             |
| ------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Drizzle | `drizzle-kit` (dev), папка миграций                                                                    | ничего: схема — TS, клиент ленив                            |
| Prisma  | CLI `prisma` (dev, ~41 МБ в `node_modules`), `schema.prisma`, каталог миграций, **прямое подключение** | `prisma generate`; **без `DATABASE_URL` падает** (см. ниже) |
| Raw SQL | `psql` или `pg`                                                                                        | ничего                                                      |

### 6.2. Сборка без секретов БД

Требование проекта: сборка и CI проходят без секретов. Проверено:

- Drizzle: импорт модуля БД без `DATABASE_URL` не бросает (`postgres()` ленив), `next build` не требует БД.
- Prisma 7: `prisma generate` **падает** с `PrismaConfigEnvError`, если `prisma.config.ts` использует
  `env("DATABASE_URL")`. Обход — не падать в конфиге:

  ```ts
  // prisma.config.ts
  export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: { path: "prisma/migrations" },
    datasource: {
      // URL нужен только CLI; на сборке достаточно заглушки.
      url: process.env.DATABASE_URL ?? "postgres://placeholder@127.0.0.1:5432/placeholder",
    },
  });
  ```

  С такой заглушкой `prisma generate` проходит без секретов (проверено), а `prisma migrate deploy` использует
  настоящий URL.

- Raw SQL: ничего не требуется.

### 6.3. Тест на конкурентное бронирование

Проверенный сценарий (Drizzle + `pg`, Vitest):

```ts
// __tests__/db/booking-race.test.ts
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, expect, test } from "vitest";

import { bookings, meetingTypes } from "@/db/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const db = drizzle({ client: pool, casing: "snake_case" });

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  await db.execute(sql`truncate ${bookings}, ${meetingTypes} cascade`);
});

afterAll(async () => {
  await pool.end();
});

test("одновременные заявки на один слот: проходит ровно одна", async () => {
  const [type] = await db
    .insert(meetingTypes)
    .values({ slug: "intro", title: "Intro", durationMinutes: 30 })
    .returning();

  const startsAt = new Date("2026-11-20T10:00:00Z");
  const endsAt = new Date("2026-11-20T10:30:00Z");

  const results = await Promise.allSettled(
    Array.from({ length: 10 }, (_, index) =>
      db.insert(bookings).values({
        meetingTypeId: type.id,
        guestName: `guest-${index}`,
        guestEmail: `guest-${index}@example.com`,
        startsAt,
        endsAt,
      }),
    ),
  );

  const rejected = results.filter((r) => r.status === "rejected");
  expect(results.length - rejected.length).toBe(1);
  const codes = rejected.map((r) => (r as PromiseRejectedResult).reason?.cause?.code);
  expect(new Set(codes)).toEqual(new Set(["23P01"]));
});
```

Результат прогона на PostgreSQL 18.6: `{ total: 10, ok: 1, failed: 9 }`, единственный код ошибки `23P01`;
соседний интервал вставляется, отменённая запись пересечение не блокирует.

Обработка в приложении: `23P01` (pg/Drizzle) → HTTP 409 «слот уже занят». У Prisma — `P2039` с текстом
`Code: 23P01`, поэтому проверять надо сообщение/`meta`, а не только `code`.

## 7. Сводная таблица

| Критерий                    | Drizzle + `pg`        | Drizzle + `postgres.js` | Prisma 7 + `adapter-pg`               | Raw SQL (`pg`)        |
| --------------------------- | --------------------- | ----------------------- | ------------------------------------- | --------------------- |
| TypeScript 7.0.2            | да (skipLibCheck)     | да                      | да (генерируемый клиент)              | да                    |
| Типы из схемы               | да                    | нет                     | да                                    | нет                   |
| Transaction mode 6543       | безопасно             | риск пайплайнинга       | безопасно (нет кэша statements)       | безопасно             |
| Prepared statements         | не используются       | нужен `prepare: false`  | не кэшируются по умолчанию            | не используются       |
| EXCLUDE в миграции          | custom SQL            | custom SQL              | `--create-only` + SQL                 | SQL                   |
| Частичные индексы           | в схеме               | в схеме                 | preview `partialIndexes`              | SQL                   |
| Ошибка конфликта            | `23P01`               | `23P01`                 | `P2039` + текст `23P01`               | `23P01`               |
| Бандл (gzip)                | 48,9 КБ               | 58,7 КБ                 | 1 765,2 КБ                            | 26,9 КБ               |
| Сборка без секретов         | да                    | да                      | только с заглушкой URL                | да                    |
| Миграции в Docker CI        | `drizzle-kit migrate` | `drizzle-kit migrate`   | `prisma migrate deploy` (direct)      | `psql` / раннер       |
| Объём кода на 3 таблицы     | средний               | средний                 | средний + generate                    | высокий (ручные типы) |
| Риск несовместимости версий | 1.0 в RC              | низкий                  | `latest` = 8.0.0-rc.34, preview-флаги | низкий                |

## 8. Рекомендация и примеры

**Берём Drizzle ORM 0.45.4 + `pg` 8.23.1 + `drizzle-kit` 0.31.11.** Причины: предсказуемое поведение через
transaction pooler, минимальный бандл из «типизированных» вариантов, частичные индексы в схеме, EXCLUDE
закрывается одной ручной миграцией, сборка не требует БД, а типы и схема живут в одном TS-файле, который
проверяет штатный `npm run typecheck`.

```bash
npm i drizzle-orm pg
npm i -D drizzle-kit @types/pg
```

Версии стоит пинить: `drizzle-orm@~0.45.4`, `drizzle-kit@~0.31.11`, `pg@~8.23.1`. Drizzle 1.0 сейчас в RC
(`1.0.0-rc.5`, 21.10.2026), а документация уже предлагает `drizzle-orm@rc` [10] — для нового проекта это
означает осознанное согласие на смену API (relations v2 и т. п.). На стабильной 0.45.4 всё из этого отчёта
проверено.

### 8.1. Подключение

```ts
// src/db/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

// На Vercel модуль живёт в пределах тёплого инстанса: один пул на процесс.
const globalForDb = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForDb.pool ??
  new Pool({
    // В DATABASE_URL — transaction pooler Supabase, порт 6543, sslmode=require.
    connectionString: process.env.DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

if (!globalForDb.pool) globalForDb.pool = pool;

export const db = drizzle({ client: pool, schema, casing: "snake_case" });
```

```ts
// src/db/schema.ts
import { sql } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const meetingTypes = pgTable(
  "meeting_types",
  {
    id: uuid().defaultRandom().primaryKey(),
    slug: text().notNull(),
    title: text().notNull(),
    durationMinutes: integer().notNull(),
    deletedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Активные типы встреч уникальны по slug.
    uniqueIndex("meeting_types_slug_active_uq")
      .on(t.slug)
      .where(sql`${t.deletedAt} is null`),
  ],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid().defaultRandom().primaryKey(),
    meetingTypeId: uuid()
      .notNull()
      .references(() => meetingTypes.id, { onDelete: "cascade" }),
    guestName: text("guest_name").notNull(),
    guestEmail: text("guest_email").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text().notNull().default("confirmed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("bookings_type_window_idx")
      .on(t.meetingTypeId, t.startsAt)
      .where(sql`${t.status} = 'confirmed'`),
  ],
);

export type Booking = typeof bookings.$inferSelect;
```

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  casing: "snake_case",
  // Миграции идут через session pooler (5432) или direct, а не через 6543.
  dbCredentials: { url: process.env.DATABASE_URL_MIGRATIONS! },
});
```

### 8.2. Миграция

`npx drizzle-kit generate --name=init` выдаст (сокращённо):

```sql
CREATE TABLE "meeting_types" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "duration_minutes" integer NOT NULL,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_types_slug_active_uq" ON "meeting_types" USING btree ("slug")
  WHERE "meeting_types"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "bookings_type_window_idx" ON "bookings" USING btree ("meeting_type_id","starts_at")
  WHERE "bookings"."status" = 'confirmed';
```

EXCLUDE добавляется отдельной ручной миграцией:

```bash
npx drizzle-kit generate --custom --name=booking_exclusion
```

```sql
-- src/db/migrations/0001_booking_exclusion.sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap_excl"
  EXCLUDE USING gist (
    "meeting_type_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  )
  WHERE ("status" = 'confirmed');
```

Применение: `npx drizzle-kit migrate` (или `migrate(db, { migrationsFolder })` в тестах). После применения
`pg_get_constraintdef` показывает
`EXCLUDE USING gist (meeting_type_id WITH =, tstzrange(starts_at, ends_at, '[)'::text) WITH &&) WHERE ((status = 'confirmed'::text))`.

### 8.3. Типичный запрос и обработка конфликта

```ts
// src/lib/bookings.ts
import { and, eq, gte, lt } from "drizzle-orm";

import { db } from "@/db/client";
import { bookings } from "@/db/schema";

export async function createBooking(input: {
  meetingTypeId: string;
  guestName: string;
  guestEmail: string;
  startsAt: Date;
  endsAt: Date;
}) {
  try {
    const [row] = await db.insert(bookings).values(input).returning();
    return row;
  } catch (error) {
    const code = (error as { cause?: { code?: string } }).cause?.code;
    if (code === "23P01") throw new SlotTakenError();
    throw error;
  }
}

export function activeBookingsBetween(typeId: string, from: Date, to: Date) {
  return db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.meetingTypeId, typeId),
        eq(bookings.status, "confirmed"),
        gte(bookings.startsAt, from),
        lt(bookings.startsAt, to),
      ),
    );
}
```

### 8.4. Чего не делать

- **Не создавать клиент на каждый запрос** — это лишние TCP+TLS хендшейки в пулер.
- **Не брать `postgres.js` «по умолчанию»** для рантайма на Vercel: пайплайнинг + transaction mode [7].
- **Не запускать `drizzle-kit push`** в общем окружении: источник истины — файлы миграций.
- **Не полагаться на `casing` только в `drizzle-kit`**: `casing: "snake_case"` в конфиге влияет на генерацию,
  а в рантайме нужно передать его же в `drizzle()` — иначе запросы уйдут с camelCase-именами и Postgres
  ответит `42703 column "durationMinutes" does not exist` (проверено).
- **Не запускать миграции через порт 6543**: DDL и advisory locks требуют одной сессии [1].

## 9. Риски и ограничения

1. **Supabase Free — это Nano**: 15 бэкенд-соединений и 500 МБ [3]. Всплеск трафика упрётся в пул раньше,
   чем в лимит клиентов. Помогает `max: 1`, короткие запросы и индексы под выборку слотов.
2. **Transaction mode теряет сессионное состояние** [1]: нельзя `SET`, advisory locks, `LISTEN/NOTIFY`,
   временные таблицы, `WITH HOLD`-курсоры. Для «Календаря звонков» это приемлемо, но любые будущие фичи
   (например, блокировки на уровне сессии) придётся проектировать иначе.
3. **`postgres.js` оставляет риск зависаний** из-за пайплайнинга [7]; если всё же брать его — `prepare: false`,
   `max: 1` и понимание, что `max_pipeline: 0` сломает транзакции.
4. **EXCLUDE невидим для ORM**: ни Drizzle, ни Prisma не выводят его из схемы. Это значит, что ограничение
   живёт только в ручной миграции; при пересоздании схемы «с нуля» его легко потерять, а тест на гонку —
   единственная страховка.
5. **Prisma 7 требует обхода для CI без секретов** (`prisma generate` падает без `DATABASE_URL`) и тянет
   4,5 МБ WASM в клиент; `npm i prisma` сейчас ставит 8.0.0-rc.34 (`latest`), поэтому версию надо пинить.
   Preview-флаг `partialIndexes` может поменять синтаксис до GA.
6. **Drizzle 1.0 в RC**: документация уже зовёт `@rc`, стабильная ветка 0.45.4 ещё поддерживается, но при
   обновлении будет миграция API (relations v2). Пиннинг версии обязателен.
7. **TS 7 + drizzle `.d.ts`**: при `skipLibCheck: false` появится шум из чужих деклараций; в проекте это
   значение уже `true`, менять его не нужно.
8. **SSL-нюанс `pg` 8.23**: `sslmode=require` трактуется как `verify-full` с предупреждением; при проблемах с
   CA используйте `sslrootcert`/`uselibpqcompat=true`, а не отключение проверки сертификата.
9. **Задержка региона**: по умолчанию функции Vercel — `iad1` [20]. Без явного `fra1` каждый запрос к
   европейскому Supabase получит лишний RTT.

## Источники

| №   | URL                                                                                      | Что подтверждает                                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | https://supabase.com/docs/guides/database/connecting-to-postgres                         | режимы подключения, порты 5432/6543, IPv6 у direct, ограничения transaction mode, `prepare:false`, `max:1`, `ssl:require`, настройки Prisma (`pgbouncer=true`)            |
| 2   | https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits      | пулеры Supavisor/PgBouncer, pool size, клиентские и бэкенд-соединения                                                                                                     |
| 3   | https://supabase.com/docs/guides/platform/compute-and-disk                               | Nano (Free): 60 соединений, 200 клиентов пулера, pool size 15, 500 МБ                                                                                                     |
| 4   | https://supabase.com/docs/guides/database/drizzle                                        | подключение Drizzle через shared pooler, `prepare: false`                                                                                                                 |
| 5   | https://supabase.com/docs/guides/database/prisma                                         | transaction pooler + `pgbouncer=true`, `DIRECT_URL`, `prisma.config.ts`, adapter-pg                                                                                       |
| 6   | https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting                  | `pgbouncer=true` для prepared statements, `connection_limit=1`, baselining и drift                                                                                        |
| 7   | https://supabase.com/docs/guides/database/postgres-js                                    | пайплайнинг postgres.js, `max_pipeline: 0` ломает `sql.begin()`, upstream-баг                                                                                             |
| 8   | https://supabase.com/docs/guides/database/extensions                                     | включение расширений через Dashboard или `CREATE EXTENSION`                                                                                                               |
| 9   | https://supabase.com/docs/guides/platform/upgrading                                      | `btree_gist` на Supabase, апгрейды до PostgreSQL 15.19/17.11                                                                                                              |
| 10  | https://orm.drizzle.team/docs/connect-supabase                                           | установка `drizzle-orm@rc`, `prepare: false` для transaction mode, пулер vs direct                                                                                        |
| 11  | https://orm.drizzle.team/docs/indexes-constraints                                        | частичные индексы через `.where()` с SQL-предикатом, `.using()`, `.concurrently()`                                                                                        |
| 12  | https://orm.drizzle.team/docs/kit-custom-migrations                                      | `drizzle-kit generate --custom` для SQL, не выразимого схемой                                                                                                             |
| 13  | https://orm.drizzle.team/docs/drizzle-config-file                                        | `casing`, `dialect`, `schema`, `out`, `dbCredentials`                                                                                                                     |
| 14  | https://www.prisma.io/docs/orm/v7/prisma-schema/data-model/unsupported-database-features | частичные индексы поддержаны через `where`, остальное — в миграции                                                                                                        |
| 15  | https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/unsupported-database-features | `migrate dev --create-only` для неподдерживаемых объектов                                                                                                                 |
| 16  | https://www.prisma.io/docs/orm/v7/prisma-schema/data-model/indexes                       | `partialIndexes` preview, `raw()` и объектный синтаксис предиката                                                                                                         |
| 17  | https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production    | shadow database, drift, `migrate dev` vs `migrate deploy`, advisory lock                                                                                                  |
| 18  | https://github.com/prisma/orm/issues/17514                                               | exclusion constraints в Prisma не поддерживаются, issue открыт с 24.01.2023                                                                                               |
| 19  | https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-EXCLUSION   | синтаксис и семантика EXCLUDE, частичные ограничения                                                                                                                      |
| 20  | https://vercel.com/docs/functions/limitations                                            | 250 МБ на функцию, Hobby 2 ГБ/300 с, регион по умолчанию `iad1`, биллинг CPU/памяти                                                                                       |
| 21  | https://vercel.com/docs/functions/runtimes/node-js/node-js-versions                      | Node 26.x по умолчанию, 24.x и 22.x                                                                                                                                       |
| 22  | https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages   | вынос серверных пакетов из бандла; `@prisma/client` и `prisma` уже в списке по умолчанию (проверено в `node_modules/next/dist/lib/server-external-packages.jsonc` 16.4.6) |
| 23  | https://www.postgresql.org/docs/18/btree-gist.html                                       | `btree_gist`, trusted-модуль, пример EXCLUDE с `=` и `<>`                                                                                                                 |
| 24  | https://node-postgres.com/                                                               | пул, `connectionString`, поведение `Pool`/`Client`                                                                                                                        |
| 25  | https://github.com/porsager/postgres                                                     | документация postgres.js, `prepare`, `max_pipeline`                                                                                                                       |
| 26  | https://registry.npmjs.org/                                                              | версии, даты публикации, peerDependencies (`drizzle-orm`, `drizzle-kit`, `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`, `postgres`, `embedded-postgres`)         |
| 27  | https://api.npmjs.org/downloads/point/last-week/                                         | недельные загрузки: `drizzle-orm` 50,5 млн, `@prisma/client` 25,0 млн, `postgres` 39,3 млн, `pg` 103,7 млн                                                                |
