# Календарь звонков

[![hexlet-check](https://github.com/Barrierok/frontend-project-386/actions/workflows/hexlet-check/badge.svg)](https://github.com/Barrierok/frontend-project-386/actions)

Сервис, в котором **владелец календаря** публикует типы событий, а **гости** занимают свободные слоты. В интерфейсе продукт называется **Calendar**.

Учебный проект Хекслета: https://ru.hexlet.io/programs/frontend

## Как это работает

1. Владелец открывает `/admin` и создаёт типы событий: слаг, название, описание и длительность. Записи гостей он видит в ленте предстоящих записей, сгруппированной по дням.
2. Гость открывает `/booking`, выбирает тип события, день в окне ближайших 14 календарных дней и свободный слот.
3. По клику на время открывается шторка с полями «Имя» и «Email». Гость подтверждает запись и получает «билет» с датой, временем и длительностью.
4. Запись сразу появляется в `/admin`; повторно занять тот же слот нельзя.

Время везде московское (Europe/Moscow), без пересчёта для гостя. Записи не пересекаются даже при одновременных запросах: это гарантирует ограничение Postgres `bookings_no_overlap` (см. [ADR 0001](./docs/adr/0001-booking-no-overlap.md)).

## Стек

- Next.js 16 (App Router, React 19, Cache Components), TypeScript.
- Tailwind CSS 4 и shadcn/ui на примитивах Base UI.
- oRPC 1.16.3 contract-first: Zod-схемы в `src/contract`, `RPCHandler` на `/api/rpc`, браузерный клиент на `RPCLink`.
- Drizzle ORM и `pg`; PostgreSQL 17 в Supabase.
- Vercel: функции в регионе `dub1`, ежедневный пинг базы через Vercel Schedules.
- Vitest и Testing Library; интеграционные тесты идут против настоящего Postgres в Docker.
- oxlint (`--type-aware --type-check`) и oxfmt.

Архитектурные решения: [SPEC.md](./docs/SPEC.md), [PLAN.md](./docs/PLAN.md), [ADR 0001](./docs/adr/0001-booking-no-overlap.md), [ADR 0002](./docs/adr/0002-orpc-contract-first.md), [GLOSSARY.md](./GLOSSARY.md).

## Установка

Требования: Node.js 22+ (в CI — 24), npm и Docker для интеграционных тестов.

```bash
git clone https://github.com/Barrierok/frontend-project-386.git
cd frontend-project-386
npm ci
cp .env.example .env.local
```

Заполните `.env.local` (см. следующий раздел), затем примените миграции и сиды:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Приложение откроется на http://localhost:3000.

### Переменные окружения

| Переменная          | Назначение                                                                       |
| ------------------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`      | Рантайм-подключение через shared pooler Supabase в transaction mode (порт 6543). |
| `DIRECT_URL`        | Подключение для миграций и `pg_dump` — session mode (порт 5432) или прямой хост. |
| `TEST_DATABASE_URL` | База интеграционных тестов: Docker `postgres:17` на порту 5433.                  |

`DATABASE_URL` и `DIRECT_URL` берутся в Supabase Dashboard → **Connect**. Пароль БД подставляется вместо `[YOUR-DATABASE-PASSWORD]`. На Vercel задаётся только `DATABASE_URL` (Production, Preview, Development); `DIRECT_URL` хранится как секрет GitHub-репозитория для workflow миграций. `TEST_DATABASE_URL` в облаке не нужна.

`DIRECT_URL` читают только `drizzle.config.ts` и скрипты `db:*`, поэтому в клиентский бандл он не попадает. Сборка и `npm run check` без базы проходят: страницы с данными рендерятся динамически.

## Команды

| Команда                        | Что делает                                                       |
| ------------------------------ | ---------------------------------------------------------------- |
| `npm run dev`                  | Dev-сервер Next.js.                                              |
| `npm run build`                | Production-сборка без обращений к базе.                          |
| `npm run start`                | Запуск собранного приложения.                                    |
| `npm run format`               | Форматирование oxfmt (импорты, Tailwind-классы, `package.json`). |
| `npm run format:check`         | Проверка форматирования.                                         |
| `npm run lint`                 | oxlint без проверки типов.                                       |
| `npm run typecheck`            | oxlint с type-aware-правилами и проверкой типов TypeScript.      |
| `npm test`                     | Unit и компонентные тесты в watch-режиме.                        |
| `npm run test:run`             | Unit и компонентные тесты один раз.                              |
| `npm run test:integration`     | Интеграционные тесты в watch-режиме.                             |
| `npm run test:integration:run` | Интеграционные тесты один раз.                                   |
| `npm run test:coverage:run`    | Оба проекта с общим отчётом покрытия.                            |
| `npm run test:e2e`             | E2E-сценарий бронирования в браузере (Playwright).               |
| `npm run test:e2e:install`     | Установка браузера Chromium для Playwright.                      |
| `npm run check`                | Формат, линт, типы, API-тесты и браузерный e2e-тест.             |
| `npm run db:generate`          | Новая миграция по изменениям схемы.                              |
| `npm run db:migrate`           | Применение миграций через `DIRECT_URL`.                          |
| `npm run db:seed`              | Идемпотентные сиды `call-15` и `call-30`.                        |
| `npm run db:test:up`           | Поднять тестовый Postgres на 5433.                               |
| `npm run db:test:down`         | Остановить тестовый Postgres и удалить данные.                   |

## Тесты

- Unit и компонентные тесты лежат рядом с модулем: `*.test.ts(x)`.
- Интеграционные — рядом с серверным кодом: `*.integration.test.ts`; глобальный setup программно применяет миграции, перед каждым тестом таблицы очищаются через `TRUNCATE`.
- Тестовый Postgres:

  ```bash
  npm run db:test:up
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/calendar_test npm run test:integration:run
  ```

- Без `TEST_DATABASE_URL` интеграционный прогон пропускается с предупреждением. Отчёт покрытия печатается, но порог 80% (statements, lines, functions, branches) не гейтит. В CI с Postgres порог включён.
- HTTP-маппинг ошибок проверяется через `RPCHandler`, поэтому интеграционные тесты покрывают и API-слой.
- `npm run check` — общая проверка: формат, линт, типы, API-тесты и e2e. Она сама поднимает тестовый Postgres (или берёт `TEST_DATABASE_URL`) и выполняет всё одной командой; именно её запускают pre-push и CI.

### E2E

Сценарий бронирования закреплён браузерным тестом Playwright: гость выбирает тип встречи, занимает свободный слот и видит подтверждение, а владелец видит запись на `/admin`.

```bash
npm run test:e2e:install   # один раз — скачать Chromium
npm run test:e2e
```

`test:e2e` сам поднимает тестовый Postgres (`db:test:up`), применяет миграции, очищает записи, создаёт сиды, собирает приложение и запускает его на порту 3100 в отдельном каталоге `.next-e2e`. Сервер работает в production-режиме (`next start`) и смотрит в `TEST_DATABASE_URL` (по умолчанию — `postgres://postgres:postgres@localhost:5433/calendar_test`), поэтому локальная база из `.env.local` не затрагивается.

Тест ходит в реально запущенное приложение и настоящий `/api/rpc`: ответы API бронирования не подменяются. Успешная запись затем проверяется на `/admin` через серверный рендеринг и ту же базу.

Если `TEST_DATABASE_URL` уже задан (например, в CI), Docker не запускается, а используется существующий Postgres. E2E входит в `npm run check`, поэтому отдельный шаг в CI не нужен.

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/calendar_test npx playwright test
```

Этот вызов нужен только для точечного прогона e2e без остальных проверок.

## База данных

Две таблицы: `event_types` и `bookings`. Структурные инварианты (формат слага, длины, диапазон длительности, `ends_at > starts_at`, внешний ключ) заданы в схеме Drizzle и миграциях. Правило непересечения записей — `EXCLUDE USING gist` с именем `bookings_no_overlap` — живёт только в ручной SQL-миграции `drizzle/0001_bookings_no_overlap.sql`: Drizzle его не выражает, а `drizzle-kit push` в проекте запрещён.

- Изменение схемы: правка `src/db/schema.ts` → `npm run db:generate` → при необходимости `drizzle-kit generate --custom` для SQL, который не выражается схемой → проверка на Docker (`npm run test:integration:run`) → PR.
- Применение к Supabase — только вручную: workflow **db-migrate** (`workflow_dispatch`) в GitHub Actions, секрет `DIRECT_URL`. Он выполняет `npm run db:migrate`, затем `npm run db:seed`. Из сборки Vercel миграции не запускаются.
- Миграции только аддитивные (expand/contract), применённые файлы не редактируются; down-миграций нет. Упавшая миграция откатывается транзакцией, исправление — новой миграцией вперёд.
- Сиды идемпотентны: `insert ... on conflict (id) do nothing`.

## Бэкапы и восстановление

Supabase Free не делает автоматических бэкапов и не поддерживает PITR. Перед разрушительной миграцией и после каждого релиза снимите дамп вручную и храните его вне Supabase и GitHub (репозиторий публичный, в дампе есть имена и email гостей):

```bash
pg_dump "$DIRECT_URL" --no-owner --no-privileges --format=custom --file=calendar-$(date +%F).dump
```

Восстановление в пустую базу:

```bash
pg_restore --no-owner --no-privileges --clean --if-exists --dbname="$DIRECT_URL" calendar-2026-11-20.dump
```

После восстановления проверьте, что миграции и сиды на месте: `npm run db:migrate` и `npm run db:seed` идемпотентны.

### Пауза Supabase

Проект на Free-плане засыпает после ~7 дней низкой активности. Чтобы этого не случилось, приватная функция на Vercel Schedules ежедневно выполняет `select 1` через рантайм-`DATABASE_URL` (расписание в `vercel.json`, 09:00 МСК). Если база всё же на паузе, откройте Supabase Dashboard → **Project Settings → General** и нажмите **Restore project**; после пробуждения проверьте `/booking`.

## Деплой

1. Подключите репозиторий к Vercel; регион функций — `dub1` (`vercel.json`).
2. Задайте `DATABASE_URL` для Production, Preview и Development.
3. Выключите Vercel Authentication (Settings → Deployment Protection): гости заходят без входа.
4. Перед мержем/деплоем примените миграции и сиды workflow **db-migrate**; Vercel задеплоит `main`.
5. Проверьте `/`, `/booking` и `/admin` без авторизации.

Секреты в репозитории не хранятся: `.env.local` в `.gitignore`, шаблон — `.env.example`.

## Релизы

Релизы готовит [release-please](https://github.com/googleapis/release-please) в workflow `.github/workflows/release-please.yml`:

1. Каждый push в `main` запускает workflow.
2. По Conventional Commits release-please определяет следующую версию: `feat` → minor, `fix` → patch, breaking change → major.
3. Workflow создаёт или обновляет release-PR с версией в `package.json` и записью в `CHANGELOG.md`.
4. Мерж release-PR создаёт git-тег и GitHub Release.

Версию и changelog вручную не правим — источник истины это коммиты. В настройках репозитория включено **Allow GitHub Actions to create and approve pull requests**, иначе `GITHUB_TOKEN` не сможет открыть release-PR. PR, созданный `GITHUB_TOKEN`, не запускает другие workflow; если проверки на release-PR нужны, добавьте отдельный PAT-секрет.

## Качество кода

Для линтинга используется [oxlint](https://oxc.rs/docs/guide/usage/linter.html), для форматирования — [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html). В oxlint подключены плагины `eslint-plugin-sonarjs` и `eslint-plugin-testing-library`; их правила берутся из `recommended`-конфигов в `oxlint.config.mts` и не дублируются вручную.

Перед коммитом lefthook запускает `oxlint --fix` и `oxfmt` для изменённых файлов, перед пушем — `npm run check`. Те же проверки выполняет workflow `.github/workflows/quality.yml`; отдельный job собирает проект без базы.

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>
