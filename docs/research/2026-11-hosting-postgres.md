# Хостинг, Postgres и деплой для TanStack Start

- Тикет: [#4](https://github.com/Barrierok/frontend-project-386/issues/4), карта: [#1](https://github.com/Barrierok/frontend-project-386/issues/1)
- Дата: 14 ноября 2026. Все факты ниже проверены по первоисточникам в этот день; версии платформ и лимиты меняются быстро.
- Проверенные версии пакетов (`npm view`, 14.11.2026): `@tanstack/react-start` 1.169.5 (это же latest), `@netlify/vite-plugin-tanstack-start` 1.3.19, `drizzle-orm` 0.45.4, `drizzle-kit` 0.31.11, `pg` 8.23.1, `@neondatabase/serverless` 1.2.1, `nitro` 3.0.261103-rc.

## Рекомендация (TL;DR)

**Netlify (Free) + Neon (Free), регион Neon `aws-us-east-2` (Ohio), драйвер `pg` + `drizzle-orm/node-postgres`, транзакции через `db.transaction`, миграции — из GitHub Actions по прямому (не pooler) URL.**

Почему именно так:

1. Netlify — единственный из бесплатных вариантов, где TanStack Start поддерживается **официальным адаптером** (`@netlify/vite-plugin-tanstack-start`), а не через общий Nitro-слой. Версия проекта (1.169.5) выше порога 1.132.0, с которого нужен именно этот плагин.
2. Код исполняется в обычных Node.js-функциях: синхронный лимит 60 с, 1 ГБ памяти, никакого лимита CPU в 10 мс, как у Cloudflare Workers Free. Значит `pg` работает по TCP и интерактивные транзакции доступны «из коробки».
3. Бюджеты бесплатных тарифов не пересекаются: Netlify даёт 300 кредитов в месяц на деплои/трафик/функции, Neon — отдельные 100 CU-часов, 1 ГБ и 5 ГБ egress. Для демо-сервиса бронирования этого хватает.
4. Выход из ситуации дешёвый: код переносится на Vercel через Nitro или на Railway без изменения схемы и драйвера — Postgres живёт отдельно от хостинга.

Главное ограничение рекомендации: **на Free-плане Netlify каждый production-деплой стоит 15 кредитов из 300**, то есть около 20 деплоев в месяц. Если в процессе разработки деплоев будет больше, выгоднее сразу рассмотреть Vercel Hobby (там 100 деплоев в день) или Railway Hobby ($5/мес). Подробности — в разделе «Риски».

## 1. Что требуется от платформы

Из контекста проекта:

- SSR/full-stack TanStack Start 1.169.5 + React 19, pnpm, Node 24 LTS.
- Postgres + Drizzle, **транзакции обязательны** (бронь слота: проверка пересечения + вставка в одной транзакции).
- Публичный URL бесплатно или почти бесплатно, минимум инфраструктуры.
- Часовой пояс один (Europe/Moscow), в БД UTC — к хостингу это требование не предъявляет, но означает, что все расчёты слотов идут на сервере.
- `pnpm check` и `pnpm build` в GitHub Actions — CI не должен зависеть от хостинга.

## 2. Официальная поддержка TanStack Start

Официальная документация TanStack Start перечисляет трёх «Official Hosting Partners»: **Cloudflare, Netlify, Railway**. Vercel, Node/Docker, Bun, Appwrite описаны как «deploy using Nitro / node server» [T1].

| Платформа | Как деплоится | Статус по документации TanStack | Замечания |
| --- | --- | --- | --- |
| Netlify | `@netlify/vite-plugin-tanstack-start` (Start ≥ 1.132.0), publish `dist/client` | Официальный партнёр [T1] | Плагин эмулирует платформу локально, отдельный адаптер под Start [N1] |
| Cloudflare Workers | `@cloudflare/vite-plugin` + `wrangler.jsonc`, `nodejs_compat`, `main: @tanstack/react-start/server-entry` | Официальный партнёр [T1] | Свои лимиты CPU/памяти, см. ниже |
| Railway | инструкция Nitro + автодетект сборки | Официальный партнёр [T1] | Встроенный Postgres, HTTPS, домены [T1] |
| Vercel | `nitro()` в `vite.config.ts` | Партнёром не назван; раздел «Follow the Nitro deployment instructions» [T1] | У Vercel есть отдельная страница и гайды по Start [V1] |
| Node/Docker (VPS) | `vite build` + `node .output/server/index.mjs` | Поддерживается, требует Nitro [T1] | Полный контроль, но не бесплатно |

Отдельно: **Nitro-плагин для Vite в документации TanStack помечен как «still under active development»** [T1]. Это касается и Vercel, и VPS-варианта, но не Netlify/Cloudflare, у которых свои плагины.

Ещё один факт, который часто упускают: **Netlify Server (long-lived Node.js сервер, Early Access) пока не поддерживает TanStack Start**. Документация прямо говорит: «Full-stack frameworks, such as Next.js, Astro, Nuxt, SvelteKit, React Router, and TanStack Start, don't run on Netlify Server yet» — код Start на Netlify исполняется как функции [N7]. То есть рассчитывать на «один тёплый процесс с пулом соединений» на Netlify нельзя.

## 3. Сравнение вариантов

### 3.1 Бесплатные лимиты, которые важны для этого проекта

| Параметр | Netlify Free | Vercel Hobby | Cloudflare Workers Free | Railway Free | Neon Free |
| --- | --- | --- | --- | --- | --- |
| Цена | $0, 300 кредитов/мес [N5] | $0 [V2] | $0 [C1] | $0, **$1 кредитов/мес** [R1] | $0 [NE1] |
| Деплои | 15 кредитов за production-деплой, т.е. ~20/мес [N5] | 100 деплоев/день [V3] | деплой через `wrangler`, лимит не заявлен | ограничение по кредитам | — |
| Лимит времени запроса | 60 с (sync), 15 мин (background) [N4] | 300 с [V3] | **CPU 10 мс**, wall time не ограничен [C1] | нет (контейнер) | — |
| Память | 1024 МБ [N4] | 2 ГБ [V3] | 128 МБ [C1] | 0,5 ГБ на сервис [R1] | — |
| Запросы | 2 кредита / 10k [N5] | 1 млн инвокаций [V2] | 100k/день [C1] | по кредитам | — |
| Compute | 10 кредитов / ГБ-час [N5] | 4 CPU-ч + 360 ГБ-ч [V2] | 10 мс CPU/запрос [C1] | $10/ГБ RAM-мес, $20/vCPU-мес [R1] | 100 CU-ч/проект [NE1] |
| Регион функций | `cmh` (Ohio) по умолчанию, **смена региона — только Pro+** [N4] | выбирается | глобальная сеть | выбирается | фиксируется при создании [NE4] |
| Особенности | cold start функций; кредиты общие на всё | cold start, Fluid compute | изоляты, 6 одновременных исходящих соединений [C1] | сервис не засыпает, но $1 кредита мало | scale-to-zero 5 мин, PgBouncer |

### 3.2 Netlify + Neon

**Плюсы.** Официальный адаптер Start; Node-функции без лимита CPU; `pg` и интерактивные транзакции; бесплатно; деплой из GitHub «из коробки»; Neon даёт pooled-строку подключения и независимый бюджет.

**Минусы.** ~20 production-деплоев в месяц на Free; холодный старт функции после простоя; регион функций на Free зафиксирован на `cmh` (Ohio) — значит, проект Neon надо создавать в `aws-us-east-2`, иначе каждый запрос платит лишние ~100 мс RTT, а сменить регион Neon нельзя [NE4].

### 3.3 Railway (встроенный Postgres)

**Плюсы.** Официальный партнёр; zero-config деплой; сервис не засыпает, соединения живут, холодных стартов нет; Postgres как отдельный сервис с `DATABASE_URL` [R2]; транзакции — обычный TCP `pg`.

**Минусы.** Бесплатный тариф — это **$1 кредитов в месяц** при цене $10/ГБ RAM-мес [R1]. Контейнер с приложением на 0.5 ГБ, работающий круглосуточно, стоит около $5/мес — бесплатного тарифа не хватит. Реально это «почти бесплатно» = Hobby $5/мес. Есть ещё Free Trial с $5 на 30 дней [R1].

**Когда выбирать.** Если нужен настоящий долгоживущий сервер, стабильные соединения и отсутствие cold start, а $5/мес приемлемы.

### 3.4 Cloudflare Workers + Neon/Hyperdrive

**Плюсы.** Официальный партнёр; щедрый запросный лимит (100k/день); Hyperdrive на Free — 100k запросов к БД в день с пулингом и кешем [C2].

**Минусы, которые для этого проекта критичны.**

- **CPU 10 мс на запрос на Free-плане** [C1]. Документация Cloudflare сама пишет, что SSR-нагрузки «typically use 10–20 ms» — то есть SSR на Free балансирует на грани, а превышение даёт Error 1102. Для учебного проекта это лотерея; Workers Paid ($5/мес) снимает вопрос.
- 128 МБ памяти на изолят и 6 одновременных исходящих соединений [C1].
- Нужен `nodejs_compat` и аккуратная работа с WebSocket-драйвером: в edge-рантайме WebSocket-соединение не живёт дольше запроса, поэтому `Pool`/`Client` нельзя держать в модуле — только создать, использовать и закрыть внутри обработчика [NE2].
- Больше движущихся частей: wrangler, конфиг, bindings. Для «минимума инфраструктуры» это худший вариант из реальных.

### 3.5 Vercel + Neon

**Плюсы.** Официальная страница и гайды по TanStack Start через Nitro [V1]; Hobby заметно щедрее Netlify по деплоям и инвокациям (100 деплоев/день, 1 млн инвокаций, 300 с на функцию) [V2][V3]; Neon подключается тем же `pg`.

**Минусы.** TanStack не называет Vercel официальным партнёром, а Nitro-плагин в документации Start помечен как активно разрабатываемый [T1] — риск, что после обновления Start сборка потребует правок. Плюс Hobby — личный бесплатный тариф; для учебного некоммерческого проекта это нормально.

**Когда выбирать.** Если упрёмся в кредиты Netlify или захотим больше деплоев без смены стека: меняется только `vite.config.ts` (добавляется `nitro()`), драйвер и БД остаются.

### 3.6 Node/Docker на VPS

Полный контроль, транзакции и пул соединений без оговорок, никаких холодных стартов. Но нужен VPS (от ~$4–5/мес), настройка reverse proxy, TLS, обновлений, systemd/Docker, резервных копий. Для учебного портфолио это лишняя инфраструктура и лишние знания не по теме проекта. Оставляем как вариант «если появится свой сервер».

### 3.7 Итоговая таблица выбора

| Критерий | Netlify + Neon | Railway | CF Workers + Neon | Vercel + Neon | VPS |
| --- | --- | --- | --- | --- | --- |
| Официальная поддержка Start | ★★★ | ★★★ | ★★★ | ★★ | ★★ |
| Бесплатно надолго | ★★ (кредиты) | ✕ ($5/мес) | ★★ (CPU 10 мс) | ★★★ | ✕ |
| Транзакции/`pg` | ★★★ | ★★★ | ★★ (WebSocket) | ★★★ | ★★★ |
| Холодные старты | есть, ~0.5–2 с | нет | нет (изоляты) | есть | нет |
| Минимум инфраструктуры | ★★★ | ★★★ | ★★ | ★★★ | ★ |
| Переносимость | ★★★ | ★★ | ★★ | ★★★ | ★★★ |

## 4. Postgres: какой managed-вариант

| Вариант | Free-лимиты | Засыпание | Пул | Комментарий |
| --- | --- | --- | --- | --- |
| **Neon** | 100 CU-ч/проект-мес, 1 ГБ storage, 5 ГБ egress, 100 проектов, 10 веток; 0,25 CU × 400 ч ≈ бесплатно [NE1] | scale-to-zero через 5 мин, **отключить на Free нельзя** [NE1] | PgBouncer в transaction mode, хост с `-pooler`, до 10 000 клиентских соединений [NE3] | Лучший баланс: щедрый compute-бюджет, ветки для миграций/превью, обычный Postgres |
| Netlify Database | Free: 3 БД, **1 compute unit максимум, 48 unit-часов за период**, 5 ГБ записи/трафика/storage; биллинг 10 кредитов за unit [N6] | sleep-on-inactivity 5 мин, на Free настраивается только 5 мин [N6] | платформенный | Максимально «одна платформа»: авто-миграции в деплое, Drizzle-адаптер `drizzle-orm/netlify-db` [N2] |
| Railway Postgres | входит в общий кредит $1/мес [R1] | нет | PgBouncer как отдельный сервис | Хорош, если уже платим Railway |
| Supabase | 500 МБ, 2 активных проекта | **проект ставится на паузу после недели неактивности**, на Free [S1] | Supavisor | Пауза = ручное «разбудить» перед показом. Для портфолио плохо |

Почему не Netlify Database, хотя это самый простой путь: на Free у БД всего 48 compute units за период, и они оплачиваются из **тех же 300 кредитов**, что деплои и функции (10 кредитов за unit) [N5][N6]. Если считать по документации, 48 units = 480 кредитов — то есть весь месячный лимит плана съедается одной БД, и это ещё без деплоев (это арифметический вывод из двух страниц документации, отдельно они этот сценарий не описывают). Плюс адаптер требует `drizzle-orm@beta`/`drizzle-kit@beta` [N2]. Отдельный Neon даёт независимые 100 CU-ч и стабильный Drizzle 0.45.x.

Supabase отпадает из-за паузы проекта после недели простоя: проверяющий может открыть ссылку и увидеть ошибку, а разбудить БД сможет только владелец.

## 5. Драйвер Postgres и Drizzle

### 5.1 `pg` vs `@neondatabase/serverless`

Drizzle поддерживает оба: `drizzle-orm/node-postgres` (пакет `pg`), `drizzle-orm/neon-http` и `drizzle-orm/neon-serverless` [D1].

- **HTTP-драйвер Neon (`neon()`) — только неинтерактивные транзакции**: `sql.transaction([...])`, где заранее известен список запросов [NE2]. Для брони это неприменимо: нужно прочитать пересечения, решить и вставить в одной транзакции.
- **WebSocket-драйвер (`Pool` из `@neondatabase/serverless`) — интерактивные транзакции есть** [NE2], но в edge-рантайме пул нельзя переиспользовать между запросами [NE2], а в Node 22+ WebSocket уже встроен.
- **`pg` (`node-postgres`)** — обычный TCP, полноценные `BEGIN/COMMIT`, `db.transaction` с `isolationLevel` [D2]. Для Node-функций Netlify это самый прямой путь.

**Вывод: `pg` + `drizzle-orm/node-postgres`.** На Node-рантайме serverless-драйвер не даёт выигрыша, а ограничения даёт.

Соединение: `new Pool({ connectionString: process.env.DATABASE_URL, max: 3 })` в модуле, не внутри обработчика; `DATABASE_URL` — **pooled** строка (хост с `-pooler`) [NE3]. `max` маленький, потому что каждая тёплая инстанция функции держит свой пул; Neon сам пулит через PgBouncer и принимает до 10 000 клиентов [NE3].

`sslmode=require` в строке обязателен — Neon требует TLS.

### 5.2 Транзакции и защита от двойной брони

Одной транзакции `READ COMMITTED` недостаточно: две параллельные брони могут обе прочитать «слот свободен». Варианты:

1. `db.transaction(..., { isolationLevel: 'serializable' })` [D2] плюс ретрай на `40001` (serialization_failure).
2. Exclusion-констрейнт в Postgres: `EXCLUDE USING gist (tstzrange(starts_at, ends_at) WITH &&)` — тогда БД физически не даст вставить пересекающийся интервал, а код ловит `23P01` и отдаёт 409. Это надёжнее и дешевле, чем ретраи.

Рекомендация: **сделать exclusion-констрейнт основным механизмом**, а транзакцию использовать для «прочитать + вставить» и для атомарности сопутствующих записей. Требуется расширение `btree_gist`; поддерживает ли его Neon на Free — **не проверено по первоисточнику** (нужно выполнить `CREATE EXTENSION IF NOT EXISTS btree_gist` на реальном проекте; если недоступно — остаётся `serializable` + ретраи).

### 5.3 Миграции

`drizzle-kit generate` пишет SQL в `drizzle/`, `drizzle-kit migrate` применяет их и ведёт журнал в `drizzle.__drizzle_migrations` [D3]. Для `migrate` нужны `dialect: "postgresql"` и `dbCredentials.url` [D3].

Ключевой нюанс: **миграции применять по прямому (не `-pooler`) URL**. Neon прямо рекомендует direct-соединение для schema migrations, `pg_dump` и всего, что зависит от сессионного состояния; в transaction mode PgBouncer не поддерживает `SET`, `LISTEN/NOTIFY` и SQL-level `PREPARE` [NE3].

Где запускать:

- **Рекомендуется:** отдельный job/step в GitHub Actions перед деплоем, с секретом `DATABASE_URL_DIRECT`. Это же место, где прогоняются `pnpm check` и `pnpm build`, — то есть схема и код проверяются в одном прогоне.
- Не запускать `drizzle-kit migrate` из build-команды Netlify: сборка может выполняться параллельно и на превью-деплоях, а build-среда не должна менять продовую схему.
- На уже существующей БД ничего делать не нужно: `migrate` идемпотентен по журналу [D3].

### 5.4 Secrets и env

| Имя | Где | Значение |
| --- | --- | --- |
| `DATABASE_URL` | Netlify → Environment variables (Functions scope) и локальный `.env` | pooled-строка Neon (`...-pooler...`) |
| `DATABASE_URL_DIRECT` | GitHub Actions secret (и локально) | прямая строка Neon, только для миграций |
| `NODE_VERSION` | Netlify UI/env | `24` — иначе сборка возьмёт версию по умолчанию [N3] |

`.env` в `.gitignore`; в репозиторий — только `.env.example` с именами переменных.

На Netlify переменные окружения доступны функциям, но **не попадают в клиентский бандл** автоматически (в отличие от `VITE_*`). Строку подключения нельзя импортировать в код, который может уехать в браузер: доступ к БД — только из server functions.

## 6. План настройки

### 6.1 Пакеты

```bash
pnpm add drizzle-orm pg
pnpm add -D drizzle-kit @types/pg @netlify/vite-plugin-tanstack-start
```

`nitro` не нужен: на Netlify сборку ведёт плагин Netlify.

### 6.2 Конфигурация

`vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [tanstackStart(), netlify(), viteReact()],
})
```

`netlify.toml`:

```toml
[build]
  command = "vite build"
  publish = "dist/client"
```

`drizzle.config.ts` — URL берётся из `DATABASE_URL_DIRECT`:

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL_DIRECT! },
})
```

### 6.3 Neon

1. Создать проект в **`aws-us-east-2` (Ohio)** — регион совпадает с дефолтным регионом функций Netlify `cmh` [NE4][N4]. Регион потом не меняется [NE4].
2. Скопировать две строки: pooled (для `DATABASE_URL`) и direct (для миграций) [NE3].
3. Free-план оставить как есть; scale-to-zero отключить нельзя, это нормально для демо [NE1].

### 6.4 Netlify

1. Add new project → Import from GitHub → репозиторий.
2. Build command `vite build`, publish `dist/client` (или положиться на `netlify.toml`).
3. `NODE_VERSION=24`, `DATABASE_URL=<pooled>` в переменных окружения.
4. Первый деплой; дальше — автодеплой на push в основную ветку.

### 6.5 Команды миграций

```bash
pnpm drizzle-kit generate        # локально после правки схемы; SQL коммитится
pnpm drizzle-kit migrate         # применяет к БД по DATABASE_URL_DIRECT
```

Локально переменные подхватываются из `.env` (например, через `dotenv-cli` или `node --env-file=.env`, если скрипт запускается Node напрямую); в CI — из секретов репозитория.

В Actions: шаг `pnpm drizzle-kit migrate` после `pnpm check`/`pnpm build`, с `DATABASE_URL_DIRECT` из secrets. `hexlet-check.yml` не трогать.

## 7. Что проверить после деплоя (смоук-тест)

1. Публичный URL открывается, SSR-страница показывает типы встреч (значит, функции и БД живы).
2. Полный гостевой сценарий: выбор типа → календарь на 14 дней → форма → подтверждение; запись видна в списке владельца.
3. **Конкурентность:** два одновременных запроса на один слот (две вкладки или `curl` параллельно) — один успех, второй 409/понятная ошибка, в БД одна запись.
4. Часовой пояс: в БД UTC, гость видит Europe/Moscow; слот на границе дня (17:30 MSK) не уезжает на предыдущий день.
5. Миграция на чистой БД: создать ветку Neon, применить `migrate` с нуля, убедиться, что приложение поднимается.
6. Холодный старт: подождать 10+ минут, замерить время первого ответа (ожидаемо ~0.5–2 с: старт функции + пробуждение compute Neon после 5 минут простоя [NE1]).
7. Соединения: в Neon Monitoring посмотреть число подключений после серии запросов — не растёт бесконечно.
8. `pnpm check` и `pnpm build` зелёные локально и в Actions.

## 8. Риски и что может сломаться

| Риск | Вероятность | Что делать |
| --- | --- | --- |
| **Кредиты Netlify Free кончились** (300/мес, 15 за деплой) [N5] — сайт может перестать отвечать до конца периода | Средняя при активной разработке | Деплоить в прод только из main, ветки — в deploy previews; при исчерпании — Vercel Hobby (100 деплоев/день) [V3] |
| **Исчерпан compute Neon** (100 CU-ч) — соединения падают с `SQLSTATE 53000` до конца периода [NE1] | Низкая для демо | Мониторить Usage в консоли Neon; не гонять тяжёлые запросы; апгрейд на Launch без минимального платежа |
| Холодный старт: функция + пробуждение БД | Высокая (каждый первый визит) | Приемлемо для портфолио; при желании — Railway ($5/мес) без cold start |
| Регион функций Netlify на Free зафиксирован `cmh`; регион Neon не меняется [N4][NE4] | Средняя (ошибка при создании) | Создавать Neon сразу в `aws-us-east-2`; иначе пересоздать проект и перенести данные |
| Пул соединений в serverless: `new Pool()` внутри обработчика → утечка соединений | Средняя | Пул на уровне модуля, `max: 3`, `idleTimeoutMillis`; проверять Monitoring |
| PgBouncer transaction mode: `SET`, `LISTEN`, SQL-level `PREPARE`, advisory locks на сессию не работают [NE3] | Низкая | Не использовать сессионное состояние; `SET LOCAL` внутри транзакции |
| Миграция по pooled-строке | Средняя | Всегда `DATABASE_URL_DIRECT` |
| Двойная бронь при гонке | Средняя, если полагаться только на код | Exclusion-констрейнт или `serializable` + ретрай; тест из п.7.3 |
| Nitro-путь (если переедем на Vercel) ломается при обновлении Start — плагин «under active development» [T1] | Средняя после переезда | Фиксировать версии, проверять `pnpm build` в CI |
| `@netlify/vite-plugin-tanstack-start` и pnpm/Node 24 | Не проверено | Прогнать локально `netlify deploy --build` до первого прода; при проблеме — `netlify.toml` с ручными настройками [N1] |
| Бесплатный тариф Netlify не для коммерческой нагрузки | Низкая | Учебный проект — ок; при развитии — платный план |

## 9. Что осталось непроверенным

- Поддерживает ли Neon на Free расширение `btree_gist` (нужно для exclusion-констрейнта). Проверяется одной командой на реальной БД.
- Точное поведение сайта Netlify при исчерпании 300 кредитов (блокировка до конца периода или деградация) — в документации описаны лимиты, но не сценарий отказа.
- Бесплатны ли deploy previews Netlify по кредитам (в прайсе указаны только «production deploys»).
- Совместимость `@netlify/vite-plugin-tanstack-start` 1.3.19 с pnpm и Node 24 на практике — заявлено платформой (Node 24 поддерживается [N3]), но не проверено на этом проекте.
- Точные цифры холодного старта для связки «Netlify-функция (1 ГБ) + пробуждение Neon»: оценка 0.5–2 с — порядок величины, не измерение.

## 10. Источники

**TanStack**
- [T1] TanStack Start — Hosting (партнёры, Netlify/Cloudflare/Railway, Nitro, Node/Docker, Vercel): https://tanstack.com/start/latest/docs/framework/react/guide/hosting

**Netlify**
- [N1] TanStack Start on Netlify (плагин, версии ≥1.132.0, `netlify.toml`): https://docs.netlify.com/build/frameworks/framework-setup-guides/tanstack-start/
- [N2] Netlify Database — Tooling (Drizzle, `drizzle-orm/netlify-db`, beta-теги, миграции): https://docs.netlify.com/build/data-and-storage/netlify-database/tooling/
- [N3] Netlify — Manage build dependencies (Node.js 24, `NODE_VERSION`, pnpm): https://docs.netlify.com/configure-builds/manage-dependencies/
- [N4] Netlify — Configuration for functions (60 с, 1024 МБ, регион `cmh`, смена региона Pro+): https://docs.netlify.com/build/functions/configuration/
- [N5] Netlify Pricing (Free 300 кредитов, 15 за деплой, 10/ГБ-час, 2/10k запросов): https://www.netlify.com/pricing/
- [N6] Netlify Database — Billing, limits, compliance (48 units, 1 CU, sleep 5 мин, 10 кредитов/unit): https://docs.netlify.com/build/data-and-storage/netlify-database/billing-and-usage/
- [N7] Netlify Server (Early Access) — TanStack Start не поддерживается: https://docs.netlify.com/build/server/

**Neon**
- [NE1] Neon plans (Free: 100 CU-ч, 1 ГБ, 5 ГБ egress, scale-to-zero 5 мин, поведение при исчерпании): https://neon.com/docs/introduction/plans
- [NE2] Neon serverless driver (HTTP vs WebSocket, `sql.transaction`, ограничения edge): https://neon.com/docs/serverless/serverless-driver
- [NE3] Neon connection pooling (PgBouncer transaction mode, `-pooler`, миграции по direct): https://neon.com/docs/connect/connection-pooling
- [NE4] Neon regions (`aws-us-east-2`, регион не меняется): https://neon.com/docs/introduction/regions

**Cloudflare**
- [C1] Workers limits (Free: 100k req/день, CPU 10 мс, 128 МБ, 6 соединений): https://developers.cloudflare.com/workers/platform/limits/
- [C2] Hyperdrive pricing (Free: 100k запросов к БД в день): https://developers.cloudflare.com/hyperdrive/platform/pricing/

**Railway**
- [R1] Railway pricing (Free $1/мес, Hobby $5, $10/ГБ RAM-мес): https://railway.com/pricing
- [R2] Railway PostgreSQL (`DATABASE_URL`, TCP proxy, пулинг): https://docs.railway.com/guides/postgresql

**Vercel**
- [V1] TanStack Start on Vercel (Nitro, Fluid compute): https://vercel.com/docs/frameworks/full-stack/tanstack-start
- [V2] Vercel Hobby план (лимиты: 1 млн инвокаций, 4 CPU-ч, 360 ГБ-ч): https://vercel.com/docs/plans/hobby
- [V3] Vercel limits (300 с, 2 ГБ, 100 деплоев/день): https://vercel.com/docs/limits

**Supabase**
- [S1] Supabase pricing (Free: 500 МБ, пауза после недели простоя, 2 проекта): https://supabase.com/pricing

**Drizzle**
- [D1] Drizzle ↔ Neon (node-postgres / neon-http / neon-serverless): https://orm.drizzle.team/docs/connect-neon
- [D2] Drizzle Transactions (`db.transaction`, `isolationLevel`, savepoints): https://orm.drizzle.team/docs/transactions
- [D3] `drizzle-kit migrate` (dialect + url, журнал `drizzle.__drizzle_migrations`): https://orm.drizzle.team/docs/drizzle-kit-migrate
