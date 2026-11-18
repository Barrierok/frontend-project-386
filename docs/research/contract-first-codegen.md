# Contract-first и кодогенерация для «Календаря звонков»

Исследование: какие contract-first/design-first инструменты дают TypeScript-типы и клиент из контракта,
и какие из них реально просты для проекта на Next.js 16.4.6, React 19.3 и TypeScript 7.0.2.

Дата проверки: 18 ноября 2026. Все версии, загрузки и поведение проверялись в этот день.

## Оглавление

1. [TL;DR](#tldr)
2. [Как проверялось](#как-проверялось)
3. [Таксономия подходов](#таксономия-подходов)
4. [Главное ограничение проекта: TypeScript 7](#главное-ограничение-проекта-typescript-7)
5. [Инструменты](#инструменты): openapi-typescript · orval · @hey-api/openapi-ts · zod-openapi · ts-rest · oRPC · прочие
6. [Сводная таблица](#сводная-таблица)
7. [Runtime-валидация на сервере](#runtime-валидация-на-сервере)
8. [WebSocket и SSE](#websocket-и-sse)
9. [Совместимость с Next.js 16 App Router](#совместимость-с-nextjs-16-app-router)
10. [Варианты для проекта](#варианты-для-проекта)
11. [Итог для проекта](#итог-для-проекта)
12. [Источники](#источники)

## TL;DR

- «Design-first» требует артефакта контракта, не зависящего от реализации (OpenAPI YAML/JSON); «contract-first»
  допускает контракт как TypeScript-код (Zod, `@ts-rest/core`, `oc` из oRPC). Это разные вещи с разной ценой.
- tRPC и Hono RPC — **не** contract-first: источник правды у них — реализация, отдельного артефакта контракта нет.
- Самый простой стек — `openapi-typescript` (только типы, один `.d.ts`) + `openapi-fetch` (6 kB, один рантайм-импорт),
  но с оговоркой про TypeScript 7 в этом репозитории; обход проверен.
- Генерация из OpenAPI **не даёт** runtime-валидации: её закрывают Zod-схемы (порождающие спеку) либо генерация Zod
  из спеки (`orval` `client: 'zod'`, плагин `zod` у hey-api).
- `ts-rest` не поддерживается с 2025 года и конфликтует с Zod 4 и Next 16 по peer-зависимостям.
- Рекомендация по умолчанию: OpenAPI YAML + `openapi-typescript` + `openapi-fetch`, генератор — в `tools/codegen`
  (TypeScript 5), Zod — только для валидации тела запроса в Route Handlers.

## Как проверялось

Методика: данные — из npm registry API; каждый кандидат ставился в изолированный каталог (Node.js 26.13.0, npm 12.2.2)
и запускался на одном контракте «Календаря звонков» (`GET /calls`, `POST /calls`, `GET /calls/{id}`);
сгенерированный код проверялся `tsc --noEmit --strict` версии 7.0.2.

| Проверка                                                          | Результат                                                                                                                                                    |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `openapi-typescript@7.13.0` при `typescript@7.0.2` в проекте      | `npm i` падает с `ERESOLVE` (peer `typescript@^5.x`); запуск CLI падает с `TypeError: Cannot read properties of undefined (reading 'createKeywordTypeNode')` |
| То же, но генератор в отдельной папке со своим `typescript@5.9.3` | Работает: `🚀 openapi.yaml → schema.d.ts [22ms]`, файл проходит `tsc` 7.0.2 в strict-режиме                                                                  |
| `@hey-api/openapi-ts@0.99.0` при `typescript@7.0.2`               | Падает: `TypeError: Cannot read properties of undefined (reading 'AnyKeyword')`; с `typescript@5.9.3` генерирует 16 файлов                                   |
| `orval@8.48.0` при `typescript@7.0.2`                             | Работает, генерирует 7 файлов, результат проходит `tsc` 7.0.2                                                                                                |
| `@ts-rest/*@3.52.1` + `zod@4.6.7` + `next@16.4.6`                 | `ERESOLVE`: peer `zod@^3.22.3` (и `next@^12‖^13‖^14` у `@ts-rest/next`)                                                                                      |
| `@orpc/*@1.16.3` + `zod@4.6.7` + `typescript@7.0.2`               | Устанавливается и генерирует OpenAPI 3.1.1 без кодогенерации типов                                                                                           |
| `zod-openapi@6.0.2` → JSON → `openapi-typescript`                 | Работает: `createDocument` → `openapi.json` → `schema.d.ts` за 19 ms                                                                                         |

## Таксономия подходов

### 1. Spec-first (design-first) OpenAPI

Источник правды — `openapi.yaml`/`openapi.json`, написанный руками (или сгенерированный один раз дизайнером API).
Из него генерируются типы, клиенты, моки, документация. Реализация сервера пишется отдельно и **может разойтись**
со спецификацией — компилятор этого не поймает, если сервер не валидирует запросы по схеме.

Плюсы: язык-нейтральный контракт, который ревьюят до кода, и генераторы под любую платформу.
Минусы: YAML многословен, есть дублирование между спекой и серверной валидацией.

Инструменты: `openapi-typescript`, `orval`, `@hey-api/openapi-ts`, `swagger-typescript-api`, `openapi-generator`, TypeSpec.

### 2. Contract-as-code (TypeScript-first)

Источник правды — TypeScript-файл с описанием маршрутов и схем. OpenAPI генерируется из него как побочный артефакт.
Типы клиента выводятся из того же контракта, поэтому расхождение «контракт ↔ клиент» невозможно по построению.
Это не design-first в строгом смысле: контракт нельзя отревьюить, не читая TS, и он требует TS-тулинга у всех потребителей.

Инструменты: `ts-rest`, `oRPC` (режим `@orpc/contract`), `zod-openapi` (схемы как код + `createDocument`).

### 3. Schema-first через Zod / Standard Schema + OpenAPI

Подвид предыдущего, где контракт — набор Zod-схем, а маршруты описываются либо явно (`zod-openapi`, `zod-to-openapi`),
либо выводятся из файловой структуры. Ключевое преимущество: те же схемы валидируют вход на сервере, то есть
контракт и валидация — один объект. Standard Schema — общий интерфейс (`~standard`), позволяющий библиотекам принимать
Zod, Valibot, ArkType без адаптеров [26].

### 4. RPC / code-first — **не** contract-first

`tRPC` и `Hono RPC` строят типы из реализации: клиент импортирует тип роутера (tRPC) или тип приложения (Hono), типы
нельзя получить, не имея серверного кода. Отдельного артефакта контракта нет, OpenAPI нет, внешний потребитель
получить типы не может. Это удобно в монорепо «фронт + бэк на TS», но это противоположность design-first:
сначала реализация, потом типы. В таблицах ниже они не участвуют.

## Главное ограничение проекта: TypeScript 7

В `package.json` проекта стоит `typescript: ^7.0.2` (нативный порт компилятора). Это ломает два самых популярных
TS-генератора, потому что они используют **JavaScript API компилятора TypeScript** во время генерации:

- `openapi-typescript@7.13.0` объявляет `peerDependencies: { typescript: "^5.x" }` [5]; при установке рядом с TS 7 npm
  выдаёт `ERESOLVE`, а при запуске падает на `ts.factory.createKeywordTypeNode` (`ts.factory` в TS 7 отсутствует).
- `@hey-api/openapi-ts@0.99.0` формально допускает TS 7 (`peer: ">=5.5.3 || >=6.0.0 || 6.0.1-rc"`), но на практике
  падает на `ts.SyntaxKind.AnyKeyword`.

Проверенные обходы (оба воспроизведены):

1. **Изолированный генератор.** Папка `tools/codegen` со своим `package.json` и `typescript@5.9.3`; запуск через
   `npm --prefix tools/codegen run gen`. Node резолвит `typescript` из `tools/codegen/node_modules`, генерация идёт,
   а сгенерированный `.d.ts` затем спокойно проверяется TS 7 проекта.
2. **Генератор, который не использует API TS.** `orval@8.48.0` и `swagger-typescript-api@13.14.0` с TS 7 в корне
   работают (второй несёт свой `typescript` как обычную зависимость).

Чего делать не стоит: `npm i --legacy-peer-deps` для всего проекта — флаг влияет на весь install и маскирует
конфликты, а падение всё равно произойдёт в рантайме генератора.

> Отдельно: `swagger-typescript-api@13.14.0` тянет `typescript@^6.0.3` как обычную зависимость, поэтому в проекте
> окажутся два TypeScript. Для CLI это нормально, но увеличивает `node_modules` (~95 пакетов в проверке).

## Инструменты

### openapi-typescript + openapi-fetch

Самая «тонкая» пара: генератор отдаёт **только типы**, клиент — тонкая обёртка над `fetch`.

**Источник правды:** OpenAPI 3.0/3.1 (YAML или JSON, локально или по URL) [1].

**Что генерируется:** один `.d.ts` с интерфейсами `paths`, `components`, `operations`, `webhooks`. Никакого рантайма,
никаких функций — только типы [1]. Проверено: на тестовом контракте получился один файл, enum стал строковым
объединением `"planned" | "done" | "cancelled"`, тела запросов и ответы типизированы по `operationId`.

**Клиент:** `openapi-fetch` — `createClient<paths>({ baseUrl })`, методы `GET/POST/PUT/...` с литеральным путём
(`"/calls/{id}"`), параметры сгруппированы в `params.path` / `params.query` / `params.header` / `params.cookie`;
ответ — `{ data, error, response }`, где `data` только для 2xx, `error` только для 4xx/5xx [3].

**Runtime-зависимость:** `openapi-fetch@0.17.0` — 6 kB, единственная зависимость `openapi-typescript-helpers` (тоже
типы, без рантайма) [3], [12]. Middleware (`client.use({ onRequest })`, `client.eject`) встроены — проверено по типам пакета.

**Нужен ли кодоген-шаг:** да, обязателен. Рекомендуется коммитить сгенерированный файл и проверять актуальность
флагом `--check` [2].

**Next.js 16:** ограничений нет, это обычный `fetch`. Работает и в клиентских компонентах, и в Route Handlers,
и в Server Components (для серверных вызовов нужен абсолютный `baseUrl`).

**Зрелость:** 7.13.0 (11.02.2026), 17,5 млн загрузок в неделю, MIT [4], [5], [6]; v7 — стабильная мажорная ветка.

**Качество типов:** высокое. `discriminator` превращается в объединения, `readOnly`/`writeOnly` — через
`--read-write-markers`, есть `--path-params-as-types`, `--immutable`, `--enum`, `--additional-properties`,
`--properties-required-by-default` [2]. С `noUncheckedIndexedAccess` (рекомендация документации [1], [3]) типы остаются строгими.

**Минусы для этого проекта:** обязательный шаг генерации; несовместимость с TS 7 «из коробки» (см. выше);
никакой валидации и никаких моков — только типы. Пример целиком — в варианте A ниже.

### orval

Генератор клиентов (не только типов) из OpenAPI: fetch/axios-функции, React Query/SWR/Svelte Query/Vue Query хуки,
Zod/Valibot/Effect-схемы, MSW-моки [8], [9], [10], [11].

**Источник правды:** OpenAPI v3 или Swagger v2, YAML/JSON [11].

**Что генерируется (проверено):** на 3 эндпоинтах — `src/api/calls.ts` + папка `src/api/model/` с 6 файлами
(`call.ts`, `callInput.ts`, `callStatus.ts`, `error.ts`, `listCallsParams.ts`, `index.ts`). Функции вида
`listCalls(params?, options?: RequestInit)`, `createCall(callInput, options?)`, плюс типы ответов по статусам
(`listCallsResponse200`, `listCallsResponseSuccess` с `headers: Headers`). То есть клиент «плоский», без классов,
но файлов заметно больше, чем у `openapi-typescript`.

С `client: 'zod'` из той же спеки генерируются Zod-схемы (проверено: `zod.object({...})`, `zod.iso.datetime()`,
`zod.enum([...])`) — удобно для серверной валидации без второго источника правды [10].

**Runtime-зависимость:** fetch-клиент не требует библиотек; хуки React Query требуют `@tanstack/react-query`
(в проекте его нет — плюс зависимость и слой кеширования), Zod-режим требует `zod` [9], [10].

**Кодоген и Next.js 16:** обязательный шаг (`orval` ищет `orval.config.ts|js|mjs` [8]); ограничений по Next нет,
есть официальный пример next-app-with-fetch [11], хуки — только в клиентских компонентах.

**Зрелость:** 8.48.0 (14.11.2026), 4,0 млн загрузок в неделю, MIT, активный репозиторий; Orval 8 требует Node ≥ 22.18 [7], [11], [12].

**TypeScript 7:** проверено — установка и генерация проходят, результат компилируется TS 7.0.2 в strict.

**Качество типов:** аккуратные модели, ответы размечены по HTTP-статусам, есть `override` для тонкой настройки —
самый «батарейко-включённый» вариант для фронтенда.

**Минусы для этого проекта:** 94 пакета в `devDependencies` (проверено), конфиг и режимы (`mode: 'tags-split'`) —
уже церемония; хуки тянут React Query; по умолчанию много файлов.

### @hey-api/openapi-ts

Генератор SDK с плагинами: TypeScript-типы, SDK-функции, Zod/Valibot-схемы, TanStack Query, клиенты
Fetch/Axios/Next.js/Nuxt [13], [14], [15]. **Источник правды:** OpenAPI (файл, URL или Hey API Registry) [13].

**Что генерируется (проверено):** 16 файлов на 3 эндпоинта — `sdk.gen.ts`, `types.gen.ts`, `client.gen.ts` плюс
скаффолдинг `client/` и `core/` (сериализация параметров, SSE-хелпер, auth). Это не «один файл типов», а мини-SDK.
Скаффолдинг встраивается в output (отдельный `@hey-api/client-fetch` не нужен) [14]; Zod-плагин добавляет `zod.gen.ts` [15].

**Next.js 16:** есть отдельный клиент Next.js [14]; генератор — только dev-инструмент.

**Зрелость:** 0.99.0 (22.06.2026), 7,9 млн загрузок в неделю, MIT. Пакет официально в «initial development»:
документация просит пинить точную версию и публикует migration notes к каждому breaking-релизу [13].

**TypeScript 7:** **не работает** (см. таблицу экспериментов); нужен TS 5 или изолированный генератор.

**Качество типов:** лучшее среди генераторов клиентов (типизированные `data`/`error`, discriminated unions по статусам),
но цена — объём и 0.x-нестабильность: 53 пакета, много файлов, самая многословная конфигурация плагинов.

### zod-openapi / @asteasolutions/zod-to-openapi

Два способа получить OpenAPI-документ из Zod-схем. Контракт остаётся кодом, спека — производный артефакт.

**`zod-openapi@6.0.2`** (MIT, 2,1 млн/нед, 31.08.2026) — работает через нативный `z.meta()`, без monkey-patching;
`createDocument({ openapi: '3.1.0', info, paths })`, схемы переиспользуются как компоненты через `meta({ id })` [24],
нужен `zod@^4` [7]. Проверено: `createDocument` + `z.iso.datetime()` [23] → валидный OpenAPI 3.1, из которого
`openapi-typescript` делает `.d.ts` за 19 ms. `@asteasolutions/zod-to-openapi@9.1.0` (8,4 млн/нед, MIT) делает то же
через `extendZodWithOpenApi` + `OpenAPIRegistry`; для Zod 4 нужна v8+, для Zod 3 — `7.3.4` без дальнейшей поддержки [25].

**Что генерируется:** только документ OpenAPI; типы клиента — вторым шагом через `openapi-typescript`/`orval`.

**Runtime-зависимость:** `zod` (обязателен и на сервере — в этом смысл). Сам генератор — dev-only.

**Next.js 16:** ложится идеально: `createDocument` вызывается в скрипте (`tsx scripts/openapi.ts`) или в
Route Handler `GET /api/openapi`, а те же схемы используются в обработчиках для `parse`.

**Простота:** схемы пишутся один раз, маршруты — объектом `paths`: те же усилия, что YAML, но с автодополнением.
Минус: «design review» проходит по TS-файлу, а не по YAML.

### ts-rest

**Статус: проект не поддерживается.** На главной странице документации висит объявление: релизов, багфиксов и
security-обновлений не будет, v4 не выйдет, форки приветствуются [16]. Последний релиз — 3.52.1 от 04.03.2025 [7].

**Идея:** `initContract()` + `c.router({...})` с Zod/Valibot/ArkType/чистыми типами; `@ts-rest/next` реализует
контракт на сервере, `initClient(contract, { baseUrl })` даёт типизированный клиент, `generateOpenApi(contract, info)`
— OpenAPI-документ [16], [17], [18]. Это классический contract-as-code.

**Проблемы, проверенные фактически:**

- peer `zod@^3.22.3` у всех пакетов → с `zod@4` установка падает (`ERESOLVE`); в документации для Zod 4 предлагается
  писать собственный async-transformer на `z.toJSONSchema` + `@openapi-contrib/json-schema-to-openapi-schema` [17].
- peer `next@^12 || ^13 || ^14` у `@ts-rest/next` → Next 16 формально вне диапазона.
- 3.52.1 — 986 тыс. загрузок в неделю (в основном историческая инерция), MIT [7].

**Вывод:** рассматривать только если готовы форкнуть. Для нового проекта — нет.

### oRPC

Единственный из «RPC-подобных», который действительно умеет contract-first: пакет `@orpc/contract` — «Define API
contract as the single source of truth», с документацией по contract-first, реализации контракта и генерации
контракта **из** OpenAPI [22].

**Источник правды:** TS-файл с `oc` (contract builder) и схемами Standard Schema (Zod/Valibot/ArkType); обработчиков
в нём нет, поэтому клиент импортирует только контракт [19]. **Генерируется** ничего для типов — клиент типизируется
через `RouterContractClient<typeof contract>`; опционально — **OpenAPI-документ** (`OpenAPIGenerator`) для внешних
потребителей и Scalar/Swagger UI [20]. Проверено на 1.16.3: контракт → OpenAPI 3.1.1.

**Runtime:** `@orpc/contract`, `@orpc/server`, `@orpc/client`, при нужде `@orpc/openapi` + `@orpc/zod`, плюс `zod` —
это фреймворк, а не только генератор. Валидация встроенная и двусторонняя: вход проверяется до обработчика,
выход — по `.output` [19]. Next.js 16: `RPCHandler`/`OpenAPIHandler` из `@orpc/server/fetch` вызываются из Route Handler.

**Версии и API — важный нюанс.** Стабильная ветка — 1.16.3 (18.11.2026), но на npm уже есть `2.0.0-beta.51` [31], и
**документация на orpc.dev описывает v2**: установка через `@beta`, метаданные `openapi({ method, path })`,
`OpenAPIGenerator({ converters })` [19], [20], [21]. В стабильной 1.x API другой — проверено: маршрут задаётся
`.route({ method, path })`, генератор принимает `schemaConverters`, а Zod-4-конвертер импортируется из
`@orpc/zod/zod4`:

```ts
// contract.ts (проверено на @orpc/contract@1.16.3)
import { oc } from "@orpc/contract";
import * as z from "zod";

const Call = z.object({ id: z.string(), status: z.enum(["planned", "done", "cancelled"]) });

export const contract = {
  call: {
    list: oc.route({ method: "GET", path: "/calls" }).output(z.array(Call)),
    get: oc
      .route({ method: "GET", path: "/calls/{id}" })
      .input(z.object({ id: z.string() }))
      .output(Call),
  },
};
```

**oRPC vs ts-rest по сложности:** oRPC проще в части типов (не нужно описывать `responses` по статусам — тип выводится
из `.output`), активнее (релиз в день проверки) и поддерживает Zod 4; но у него больше пакетов, свой обработчик
запросов и быстро меняющийся API (v2 в бете). ts-rest ближе к «просто HTTP», но мёртв.

**Минусы для проекта:** это не «библиотека кодогенерации», а рантайм-фреймворк; контракт не является
язык-нейтральным артефактом; документация опережает стабильный релиз; TypeScript 7 не проверялся авторами (в нашем
эксперименте пакеты установились и сгенерировали спеку, но типы контракта проверялись `tsx`, а не `tsc` 7).

### Effect Schema

`effect@4.1.4` (MIT, 71 млн/нед) включает Schema с JSON-Schema/OpenAPI-аннотациями; отдельный пакет
`@effect/schema` **deprecated** — «merged into the main effect package» [7]. Мощно (эффекты, слои, трейсинг,
кодирование), но это смена парадигмы для команды и большой рантайм; OpenAPI-генерацию Effect я не проверял
(не подтверждено). Для «простого» проекта — нет.

### TypeSpec

Язык описания API от Microsoft (`@typespec/compiler@1.18.0`): `main.tsp`, `tsp init`, `tsp compile`, эмиттер
`@typespec/openapi3` даёт `tsp-output/@typespec/openapi3/openapi.yaml` [27]. Источник правды — `.tsp`-файлы; спека —
производный артефакт, клиент генерируется из спеки любым генератором выше либо эмиттером `@typespec/http-client-js`
(0.16.4, pre-1.0). Плюсы: строгий язык с версионированием и линтом, отличная спека на выходе. Минусы: ещё один язык
и тулинг (Node ≥ 22, `tspconfig.yaml`), эмиттер TS-клиента в 0.x — для трёх-пяти эндпоинтов это оверкилл (простота 2/5).

### openapi-generator

`@openapitools/openapi-generator-cli@2.42.2` (Apache-2.0, 2,1 млн/нед) скачивает JAR и вызывает `java`; нужен JDK ≥ 11,
версия фиксируется в `openapitools.json` [28]. Генераторы `typescript-fetch`/`typescript-axios` создают классовые
клиенты с десятками файлов в стиле, далёком от современного ESM/fetch-фронтенда; кастомизация — через
`--additional-properties` и шаблоны. Загрузки в основном бэкендные (Java/Kotlin/C#/Go). Для этого проекта — нет.

### swagger-typescript-api

`13.14.0` (MIT, 714 тыс./нед, 09.11.2026): один файл `Api.ts` с классом (или `--modular`), fetch или axios,
OpenAPI 3.0/2.0 [29]. Проверенные флаги: `--path/-p`, `--output/-o`, `--name/-n`, `--http-client=fetch|axios`,
`--axios`, `--modular`, `--enum-style=enum|union|const|const-enum`, `--extract-request-body`, `--extract-response-body`,
`--extract-enums`, `--type-only-imports`, `--route-types`, `--responses`, `--unwrap-response-data`, `--clean-output` [29].

Плюсы: не требует TS API проекта (свой `typescript` в зависимостях), поэтому с TS 7 работает; один файл по умолчанию.
Минусы: классовый «свой» клиент, 95 пакетов в зависимостях (включая WASM Biome), меньше экосистема.

## Сводная таблица

Данные npm — на 18.11.2026; «TS 7» — проверено запуском при `typescript@7.0.2`; простота — оценка 1–5
(5 = «одна команда, один файл, без конфига»).

| Инструмент                       | Источник правды    | Генерирует                   | Runtime                  | Кодоген     | Next 16                  | TS 7                            | Версия / дата        | Загр./нед                  | Лицензия   | Простота |
| -------------------------------- | ------------------ | ---------------------------- | ------------------------ | ----------- | ------------------------ | ------------------------------- | -------------------- | -------------------------- | ---------- | -------- |
| `openapi-typescript`             | OpenAPI YAML/JSON  | только типы (1 `.d.ts`)      | нет                      | да          | да                       | нет (нужен TS 5)                | 7.13.0 / 11.02.2026  | 17,5 млн                   | MIT        | 5        |
| `openapi-fetch`                  | типы из генератора | клиент (6 kB)                | 1 пакет                  | нет         | да                       | да                              | 0.17.0 / 11.02.2026  | 18,6 млн                   | MIT        | 5        |
| `orval`                          | OpenAPI YAML/JSON  | клиент, хуки, zod, MSW       | нет (fetch) / +RQ / +zod | да          | да                       | да                              | 8.48.0 / 14.11.2026  | 4,0 млн                    | MIT        | 3        |
| `@hey-api/openapi-ts`            | OpenAPI            | SDK, типы, zod, RQ           | встроен в output         | да          | да                       | нет                             | 0.99.0 / 22.06.2026  | 7,9 млн                    | MIT        | 2        |
| `zod-openapi`                    | Zod-схемы          | OpenAPI-документ             | `zod`                    | да (2 шага) | да                       | да (это просто TS)              | 6.0.2 / 31.08.2026   | 2,1 млн                    | MIT        | 4        |
| `@asteasolutions/zod-to-openapi` | Zod-схемы          | OpenAPI-документ             | `zod`                    | да (2 шага) | да                       | да                              | 9.1.0 / 19.07.2026   | 8,4 млн                    | MIT        | 3        |
| `ts-rest`                        | TS-контракт        | типы, клиент, OpenAPI        | `@ts-rest/core`          | нет         | формально нет (peer ≤14) | не проверено                    | 3.52.1 / 04.03.2025  | 1,0 млн                    | MIT        | 3        |
| `oRPC`                           | TS-контракт (`oc`) | типы, клиент, OpenAPI        | `@orpc/*` + zod          | нет         | да (fetch-адаптер)       | установка ок, типы не проверены | 1.16.3 / 18.11.2026  | 3,7 млн (`@orpc/contract`) | MIT        | 3        |
| `effect`                         | TS-схемы           | типы, OpenAPI (не проверено) | `effect`                 | да          | да                       | не проверено                    | 4.1.4 / 11.11.2026   | 71 млн                     | MIT        | 1        |
| `@typespec/*`                    | `.tsp`             | OpenAPI, TS-клиент (0.x)     | нет (только артефакты)   | да          | да                       | не проверено                    | 1.18.0 / 11.11.2026  | 0,37 млн                   | MIT        | 2        |
| `openapi-generator-cli`          | OpenAPI            | клиенты/серверы (Java)       | нет                      | да          | да                       | не проверено                    | 2.42.2 / 11.11.2026  | 2,1 млн                    | Apache-2.0 | 1        |
| `swagger-typescript-api`         | OpenAPI            | клиент (класс)               | нет                      | да          | да                       | да                              | 13.14.0 / 09.11.2026 | 0,7 млн                    | MIT        | 4        |

## Runtime-валидация на сервере

Ни один генератор из OpenAPI не валидирует входящие запросы: `openapi-typescript` отдаёт типы, которые стираются
при компиляции; `openapi-fetch` типизирует только вызовы. Если сервер просто делает `await request.json() as CallInput`,
кривой запрос пройдёт и упадёт где-то в БД. Это главный практический минус чистого spec-first.

Четыре способа закрыть:

1. **Zod-схемы как источник спеки** (`zod-openapi`, `zod-to-openapi`): контракт пишется на Zod, спека генерируется,
   а те же схемы вызываются в Route Handler через `schema.safeParse(body)`. Один источник правды, дублирования нет.
2. **Генерация Zod из спеки**: `orval` с `client: 'zod'` (проверено) или плагин `zod` у `@hey-api/openapi-ts`.
   Спека остаётся единственным источником, схемы — производный артефакт (как и типы).
3. **Контракт-как-код с валидацией** (`ts-rest`, `oRPC`): схемы лежат в контракте, сервер валидирует ими же;
   у oRPC проверяется ещё и выход (`.output`) [19].
4. **Ручная Zod-схема рядом с OpenAPI** — самый простой, но появляется второй источник правды, и расхождение
   ловится только тестами.

Для «Календаря звонков» правило простое: **OpenAPI отвечает за форму API, Zod — за валидацию входа**, и одна из
этих сущностей генерируется из другой. Держать обе руками — единственный вариант, который точно разъедется.

## WebSocket и SSE

- OpenAPI описывает HTTP request/response; WebSocket в спецификации отсутствует, для событийных контрактов есть
  отдельный стандарт AsyncAPI (каналы, сообщения, протоколы MQTT/Kafka/WS) [30].
- SSE выражается как ответ с `content: text/event-stream`, но генераторы типизируют только тело, а не поток: в
  `openapi-fetch@0.17.0` нет ни `EventSource`, ни `ReadableStream` (проверено по дистрибутиву).
- Практический вывод: напоминания в реальном времени потребуют отдельного контракта (AsyncAPI или ручной TS-тип + хук).
  Исключение — oRPC: у него event iterator/SSE в рамках его контракта, но только пока клиент и сервер на oRPC [22].

## Совместимость с Next.js 16 App Router

- Route Handlers объявляются как `export async function GET/POST/...` в `route.ts`; допустимы
  `GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS`. `OPTIONS` генерируется автоматически, если не объявлен [32].
  **`params` — это `Promise`** (`await ctx.params`); для типизации есть глобальный `RouteContext<'/users/[id]'>`,
  а типы маршрутов генерируются во время `next dev`, `next build` или `next typegen` [32].
- `openapi-fetch` и orval-fetch работают в Route Handlers и Server Components без адаптеров (обычный `fetch`):
  для серверных вызовов нужен абсолютный `baseUrl` (например, `process.env.APP_URL`), для браузера — относительный.
- React 19: «хуковые» генерации (`orval` react-query, hey-api TanStack) требуют `'use client'` и `@tanstack/react-query`
  (5.108.0, peer `react@^18 || ^19`); в проекте его нет — осознанный минус к простоте.
- TypeScript 7: сгенерированные `.d.ts`/`.ts` проверяются штатным `npm run typecheck`; проверено вручную
  `tsc --noEmit --strict` на TS 7.0.2.

## Варианты для проекта

### Вариант A — «самый простой» (рекомендуется по умолчанию)

OpenAPI YAML как единственный источник правды; `openapi-typescript` генерирует типы; `openapi-fetch` — клиент.
Генератор вынесен в `tools/codegen`, потому что `openapi-typescript@7` требует TypeScript 5.

```
openapi/openapi.yaml          # источник правды, ревьюится в PR
tools/codegen/package.json    # ts@5.9.3 + openapi-typescript, изолированно
src/api/schema.d.ts           # генерируется, коммитится
src/api/client.ts             # createClient<paths>, тонкая обёртка
src/app/api/...               # Route Handlers
```

Установка:

```bash
npm i openapi-fetch
mkdir -p tools/codegen
npm --prefix tools/codegen init -y
npm --prefix tools/codegen i -D typescript@5.9.3 openapi-typescript@7.13.0
```

`tools/codegen/package.json`:

```json
{
  "name": "codegen",
  "private": true,
  "scripts": {
    "gen": "openapi-typescript ../../openapi/openapi.yaml -o ../../src/api/schema.d.ts",
    "check": "openapi-typescript ../../openapi/openapi.yaml -o ../../src/api/schema.d.ts --check"
  }
}
```

В корневом `package.json` добавьте `"api:gen": "npm --prefix tools/codegen run gen"` и
`"api:check": "npm --prefix tools/codegen run check"` — второй прогоняет генератор с флагом `--check` [2].

Контракт (фрагмент, ровно тот, на котором проверялась генерация):

```yaml
openapi: 3.1.0
info: { title: Call Calendar API, version: 1.0.0 }
paths:
  /calls:
    get:
      operationId: listCalls
      parameters:
        - { name: from, in: query, required: false, schema: { type: string, format: date-time } }
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema: { type: array, items: { $ref: "#/components/schemas/Call" } }
    post:
      operationId: createCall
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/CallInput" }
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Call" }
components:
  schemas:
    Call:
      type: object
      required: [id, title, startsAt, status]
      properties:
        id: { type: string }
        title: { type: string }
        startsAt: { type: string, format: date-time }
        status: { type: string, enum: [planned, done, cancelled] }
    CallInput:
      type: object
      required: [title, startsAt]
      properties:
        title: { type: string, minLength: 1 }
        startsAt: { type: string, format: date-time }
```

```bash
npm run api:gen
```

Клиент (сервер и клиентские компоненты используют одни типы):

```ts
// src/api/client.ts
import createClient from "openapi-fetch";

import type { paths } from "./schema";

export const api = createClient<paths>({ baseUrl: "/api" });
```

Route Handler с валидацией (Zod ставится отдельно: `npm i zod`):

```ts
// src/app/api/calls/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

import type { components, paths } from "@/api/schema";

type Call = components["schemas"]["Call"];
type CreateCall = paths["/calls"]["post"]["requestBody"]["content"]["application/json"];

const createCallSchema = z.object({
  title: z.string().min(1),
  startsAt: z.iso.datetime(),
}) satisfies z.ZodType<CreateCall>;

export async function GET(request: Request) {
  const from = new URL(request.url).searchParams.get("from");
  const calls: Call[] = await db.listCalls(from);
  return NextResponse.json(calls);
}

export async function POST(request: Request) {
  const parsed = createCallSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ issues: parsed.error.issues }, { status: 422 });
  }
  const call: Call = await db.createCall(parsed.data);
  return NextResponse.json(call, { status: 201 });
}
```

Route Handler с динамическим параметром — актуальная сигнатура Next 16:

```ts
// src/app/api/calls/[id]/route.ts
import { NextResponse } from "next/server";

export async function GET(_request: Request, ctx: RouteContext<"/api/calls/[id]">) {
  const { id } = await ctx.params;
  const call = await db.findCall(id);
  if (!call) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json(call);
}
```

```tsx
// src/components/call-list.tsx
"use client";

import { useEffect, useState } from "react";

import { api } from "@/api/client";
import type { components } from "@/api/schema";

type Call = components["schemas"]["Call"];

export function CallList() {
  const [calls, setCalls] = useState<Call[]>([]);

  useEffect(() => {
    void api.GET("/calls").then(({ data }) => data && setCalls(data));
  }, []);

  const create = async () => {
    const { data } = await api.POST("/calls", {
      body: { title: "Звонок", startsAt: new Date().toISOString() },
    });
    if (data) setCalls((prev) => [...prev, data]);
  };

  return <button onClick={create}>Добавить ({calls.length})</button>;
}
```

**Цена:** 1 рантайм-зависимость, ~33 пакета в `tools/codegen`, шаг кодогена, YAML руками. **Выигрыш:** одна правда,
типы без магии, никакого фреймворка.

### Вариант B — «с runtime-валидацией из одного источника»

Zod-схемы → `zod-openapi` → `openapi.json` → `openapi-typescript` → `openapi-fetch`. Те же схемы валидируют запросы.

```bash
npm i zod openapi-fetch
npm --prefix tools/codegen i -D typescript@5.9.3 openapi-typescript@7.13.0 tsx
```

`src/api/contract.ts` (проверено: этот код даёт валидный OpenAPI 3.1):

```ts
import * as z from "zod";
import { createDocument } from "zod-openapi";

export const Call = z
  .object({
    id: z.string(),
    title: z.string().min(1),
    startsAt: z.iso.datetime(),
    status: z.enum(["planned", "done", "cancelled"]),
  })
  .meta({ id: "Call" });

export const CallInput = Call.omit({ id: true, status: true }).meta({ id: "CallInput" });

export const document = createDocument({
  openapi: "3.1.0",
  info: { title: "Call Calendar API", version: "1.0.0" },
  paths: {
    "/calls": {
      post: {
        operationId: "createCall",
        requestBody: { content: { "application/json": { schema: CallInput } } },
        responses: {
          "201": { description: "Created", content: { "application/json": { schema: Call } } },
        },
      },
    },
  },
});
```

Скрипт генерации `tools/codegen/emit.ts`:

```ts
import { writeFileSync } from "node:fs";

import { document } from "../../src/api/contract.ts";

writeFileSync(
  new URL("../../openapi/openapi.json", import.meta.url),
  JSON.stringify(document, null, 2),
);
```

`tools/codegen/package.json` (скрипт генерации):

```json
{
  "scripts": {
    "gen": "tsx emit.ts && openapi-typescript ../../openapi/openapi.json -o ../../src/api/schema.d.ts"
  }
}
```

Сервер использует `CallInput.safeParse(await request.json())` — тот же объект, из которого построена спека.
**Плюс:** одна правда, валидация и типы не расходятся. **Минус:** спекой становится TS-код, YAML для внешних
потребителей надо генерировать и коммитить; `zod-openapi` добавляет ещё один шаг в цепочку.

### Вариант C — «TS-контракт без YAML» (oRPC)

Если YAML не нужен вообще, а хочется типизированный клиент без кодогенерации — oRPC в contract-first режиме.
Стабильная 1.16.3 (проверено) требует `.route()`, ветка v2 (бета) — `openapi({ method, path })`; ставить нужно
осознанно, зафиксировав версию.

```bash
npm i @orpc/contract @orpc/server @orpc/client @orpc/openapi @orpc/zod zod
```

Route Handler в Next 16 — через fetch-адаптер (`RPCHandler`/`OpenAPIHandler` из `@orpc/server/fetch`,
`@orpc/openapi/fetch`); клиент — `createORPCClient(new RPCLink({...}))` с типом `RouterContractClient<typeof contract>` [19].

**Плюс:** нулевая кодогенерация типов, валидация входа/выхода, OpenAPI по требованию. **Минус:** фреймворк (5+ пакетов),
контракт не язык-нейтрален, API 1.x и 2.x-beta различаются, документация описывает бету.

### Вариант D — «Zod как контракт, без YAML и без кодогена»

Если писать YAML руками не хочется, а OpenAPI-артефакт нужен только «на будущее», самая короткая цепочка —
вообще без кодогенерации: Zod-схемы лежат в одном модуле, типы выводятся из них через `z.infer`, те же схемы
валидируют вход в Route Handler и ответ на клиенте. Кодоген не нужен, потому что инференс типов не может
разойтись со схемой по построению. OpenAPI добавляется позже одним скриптом (`zod-openapi`), если появится
внешний потребитель или нужна документация.

```bash
npm i zod
```

```ts
// src/contract/calls.ts — единственный источник правды
import * as z from "zod";

export const Call = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  startsAt: z.iso.datetime(),
  status: z.enum(["planned", "done", "cancelled"]),
});

export const CallInput = Call.omit({ id: true, status: true });

export type Call = z.infer<typeof Call>;
export type CallInput = z.infer<typeof CallInput>;
```

```ts
// src/app/api/calls/route.ts
import * as z from "zod";

import { CallInput } from "@/contract/calls";

export async function POST(request: Request) {
  const body = CallInput.safeParse(await request.json());
  if (!body.success) {
    return Response.json({ error: z.treeifyError(body.error) }, { status: 400 });
  }
  // body.data уже имеет тип CallInput
}
```

```ts
// src/api/calls.ts
import { Call, type CallInput } from "@/contract/calls";

export async function createCall(input: CallInput): Promise<Call> {
  const response = await fetch("/api/calls", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`createCall: ${response.status}`);
  return Call.parse(await response.json()); // проверяется и форма ответа, не только тип
}
```

**Плюс:** одна зависимость, ноль YAML, ноль кодогена и изолированного TypeScript 5; схема и типы не расходятся.
**Минус:** нет автоматической проверки путей и методов (их держит только код клиента), нет машинно-читаемого
контракта, пока не добавлен генератор OpenAPI; для внешних клиентов спекой придётся поделиться отдельно.
Промежуточный вариант — oRPC (вариант C): он даёт типизированный клиент и OpenAPI без YAML, но ценой фреймворка.

## Итог для проекта

1. **Design-first в строгом смысле = OpenAPI-файл, не TS.** Только YAML/JSON можно отревьюить до кода, не читая
   реализацию; Zod, ts-rest и oRPC — contract-as-code с генерацией спеки «на выходе».
2. **Самая простая связка — `openapi-typescript` + `openapi-fetch`:** 17,5 и 18,6 млн загрузок в неделю, MIT,
   один `.d.ts` + 6 kB клиента, никакого фреймворка. Orval и hey-api дают больше, но платят конфигом и файлами
   (а hey-api — ещё и 0.x-нестабильностью).
3. **TypeScript 7 ломает оба топовых генератора:** `openapi-typescript@7` и `@hey-api/openapi-ts@0.99` используют
   JS API компилятора и падают при TS 7.0.2. Решение — изолированный `tools/codegen` с `typescript@5.9.3`;
   сгенерированный `.d.ts` затем проверяется TS 7 без проблем. `orval` и `swagger-typescript-api` работают с TS 7.
4. **ts-rest выбывает:** нет поддержки с 2025 года, peer-зависимости требуют Zod 3 и Next ≤ 14, с Zod 4 установка падает.
5. **Валидацию и realtime придётся решать отдельно:** Zod (порождающий спеку или сгенерированный из неё), а для
   WebSocket/SSE — AsyncAPI/ручные типы либо oRPC, если он станет основой всего API.

**Рекомендация по умолчанию:** вариант A — `openapi/openapi.yaml` + `openapi-typescript` (в `tools/codegen`) +
`openapi-fetch` + Zod только для валидации тела запроса в Route Handlers. Это минимальное число зависимостей и
церемоний, полностью совместимо с Next 16 и React 19, а единственный компромисс (второй TypeScript в dev-папке)
локализован в одном месте и не влияет на рантайм. Если позже понадобится «одна правда без YAML» — перейти на
вариант B (zod-openapi) можно без переписывания клиента: `openapi-fetch` продолжит работать с тем же
сгенерированным `schema.d.ts`.

**Если YAML руками писать не хочется:** вариант D — Zod-схемы как контракт и `z.infer` вместо кодогенерации.
Одна зависимость, ноль кодогена, те же схемы валидируют вход и выход; OpenAPI генерируется `zod-openapi` только
когда появится внешний потребитель. Вариант A остаётся правильным, только если контракт должен быть
язык-нейтральным и ревьюиться до кода (мобильный клиент, подрядчик, публичное API).

## Источники

| №   | URL                                                                                              | Что подтверждает                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | https://openapi-ts.dev/introduction                                                              | возможности и установка `openapi-typescript`, OpenAPI 3.0/3.1, генерация типов без рантайма                                                                                                                                                                                            |
| 2   | https://openapi-ts.dev/cli                                                                       | CLI-флаги, `--check`, `--path-params-as-types`, `--read-write-markers`, Redocly-валидация                                                                                                                                                                                              |
| 3   | https://openapi-ts.dev/openapi-fetch/                                                            | API `createClient`, `{ data, error, response }`, 6 kB, установка                                                                                                                                                                                                                       |
| 4   | https://github.com/openapi-ts/openapi-typescript                                                 | репозиторий и лицензия MIT                                                                                                                                                                                                                                                             |
| 5   | https://registry.npmjs.org/openapi-typescript                                                    | версия 7.13.0, дата, peer `typescript@^5.x`, зависимости                                                                                                                                                                                                                               |
| 6   | https://api.npmjs.org/downloads/point/last-week/openapi-typescript                               | недельные загрузки                                                                                                                                                                                                                                                                     |
| 7   | https://registry.npmjs.org/                                                                      | версии/даты/peer/лицензии остальных пакетов (`orval`, `@hey-api/openapi-ts`, `@ts-rest/*`, `@orpc/*`, `zod-openapi`, `@asteasolutions/zod-to-openapi`, `effect`, `@typespec/*`, `@openapitools/openapi-generator-cli`, `swagger-typescript-api`, `zod`, `@effect/schema` — deprecated) |
| 8   | https://orval.dev/docs/quick-start                                                               | `orval.config.ts`, `defineConfig`, `client: 'react-query'`, запуск без конфига                                                                                                                                                                                                         |
| 9   | https://orval.dev/docs/guides/react-query                                                        | генерация хуков TanStack Query и их зависимость от `@tanstack/react-query`                                                                                                                                                                                                             |
| 10  | https://orval.dev/docs/guides/zod                                                                | режим `client: 'zod'`, генерация Zod-схем                                                                                                                                                                                                                                              |
| 11  | https://github.com/orval-labs/orval                                                              | поддерживаемые клиенты (fetch, zod, msw, effect, valibot), Node ≥ 22.18, пример next-app-with-fetch, MIT                                                                                                                                                                               |
| 12  | https://api.npmjs.org/downloads/point/last-week/                                                 | недельные загрузки остальных пакетов                                                                                                                                                                                                                                                   |
| 13  | https://heyapi.dev/docs/openapi/typescript/get-started                                           | установка, CLI, Node 22+, статус «initial development» и просьба пинить версию                                                                                                                                                                                                         |
| 14  | https://heyapi.dev/docs/openapi/typescript/clients                                               | клиенты Fetch/Axios/Next.js/Nuxt, бандлинг клиента в output                                                                                                                                                                                                                            |
| 15  | https://heyapi.dev/docs/openapi/typescript/output                                                | структура output (`sdk.gen.ts`, `types.gen.ts`, `client.gen.ts`), плагин `zod` и `zod.gen.ts`                                                                                                                                                                                          |
| 16  | https://ts-rest.com/                                                                             | объявление о прекращении поддержки, пример контракта/сервера/клиента                                                                                                                                                                                                                   |
| 17  | https://ts-rest.com/openapi                                                                      | `generateOpenApi`, трансформеры схем, Zod 3 по умолчанию, рецепт для Zod 4                                                                                                                                                                                                             |
| 18  | https://ts-rest.com/quickstart                                                                   | базовый сценарий использования                                                                                                                                                                                                                                                         |
| 19  | https://orpc.dev/docs/contract-first                                                             | `oc`, `implement`, `RouterContractClient`, валидация входа/выхода, установка с `@beta`                                                                                                                                                                                                 |
| 20  | https://orpc.dev/docs/openapi/specification                                                      | `OpenAPIGenerator`, версии 3.0/3.1/3.2, метаданные `openapi()`                                                                                                                                                                                                                         |
| 21  | https://orpc.dev/docs/openapi/routing                                                            | `openapi({ method, path })`, path-параметры, префиксы                                                                                                                                                                                                                                  |
| 22  | https://github.com/middleapi/orpc                                                                | назначение пакетов `@orpc/contract`/`@orpc/openapi`, «without generating anything», MIT                                                                                                                                                                                                |
| 23  | https://zod.dev/                                                                                 | Zod 4, `z.iso.datetime()`                                                                                                                                                                                                                                                              |
| 24  | https://github.com/samchungy/zod-openapi                                                         | `createDocument`, `.meta()`, требования Zod 4                                                                                                                                                                                                                                          |
| 25  | https://github.com/asteasolutions/zod-to-openapi                                                 | `extendZodWithOpenApi`, реестр, судьба поддержки Zod 3                                                                                                                                                                                                                                 |
| 26  | https://standardschema.dev/                                                                      | интерфейс Standard Schema (`~standard`) и совместимость библиотек                                                                                                                                                                                                                      |
| 27  | https://typespec.io/docs/getting-started/getting-started-rest/01-setup-basic-syntax/             | `tsp init`, `tsp compile`, эмиттер `@typespec/openapi3`, Node ≥ 22                                                                                                                                                                                                                     |
| 28  | https://github.com/OpenAPITools/openapi-generator-cli                                            | требование Java (JDK ≥ 11), скачивание JAR, `openapitools.json`                                                                                                                                                                                                                        |
| 29  | https://github.com/acacode/swagger-typescript-api + локальный `--help` v13.14.0                  | CLI-флаги (`--http-client`, `--modular`, `--enum-style` и др.), MIT                                                                                                                                                                                                                    |
| 30  | https://www.asyncapi.com/docs/concepts/asyncapi-document                                         | AsyncAPI как контракт для событийных протоколов (WS/MQTT/Kafka)                                                                                                                                                                                                                        |
| 31  | https://registry.npmjs.org/@orpc%2Fcontract                                                      | `dist-tags`: `latest: 1.16.3`, `beta: 2.0.0-beta.51`                                                                                                                                                                                                                                   |
| 32  | `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` (Next 16.4.6) | Route Handlers, `params` как `Promise`, глобальный `RouteContext<...>`                                                                                                                                                                                                                 |
