# AGENTS.md

Календарь звонков

## Структура

Одно Next.js-приложение (App Router, React 19, Tailwind 4, shadcn/ui):

- `npm run typecheck` — это `oxlint --type-aware --type-check`: линт, type-aware-правила и типы сразу.
- `npm run check` — общая проверка: формат, линт, типы, API-тесты и браузерный e2e. Если `TEST_DATABASE_URL` не задан, команда сама поднимает тестовый Postgres из `docker-compose.test.yml`.
- ESLint, Prettier и `next lint` не используются. Форматирование — `oxfmt` (настройки в `.oxfmtrc.json`), линт — `oxlint` (`oxlint.config.mts`).
- `oxfmt` сортирует импорты и Tailwind-классы (по `src/app/globals.css`, функции `cn`/`cva`) и `package.json`. Не выравнивайте вручную — запускайте `npm run format`.

## Коммиты

- Формат — Conventional Commits (`feat`, `fix`, `docs`, `test`, `chore`, …), его проверяет commitlint.
- Коммит реализации ссылается на тикет, который он закрывает: `feat: запись на свободный слот (#12)`. GitHub превращает номер в ссылку, и по истории видно, какой коммит какую задачу делал.
- Номер тикета — в конце заголовка, после scope: `feat(booking): создать запись (#21)`.
- Если коммит относится к нескольким задачам, перечислите их: `feat(booking): создать запись и ленту (#21, #22)`.
- Тикет создаётся до коммита через `gh issue create` (см. `docs/agents/issue-tracker.md`). Опубликованную историю ради проставления номеров не переписывайте — правило действует для новых коммитов.

## Генерируемые файлы

- `CHANGELOG.md` создаёт release-please. Его не редактируют вручную и не форматируют: файл исключён из `oxfmt` в `.oxfmtrc.json`.
- Миграции в `drizzle/` создаются `drizzle-kit`; применённые миграции не переписывают.

## UI

- shadcn настроен на стиль `base-sera` с примитивами Base UI (`@base-ui/react`), а не Radix: композиция через проп `render`, не `asChild`. Различия — `.agents/skills/shadcn/rules/base-vs-radix.md`.
- Компоненты добавляйте через shadcn MCP (`opencode.json`), а не копированием из документации Radix.

## Agent skills

### Issue tracker

Задачи живут в GitHub Issues этого репозитория, работа через `gh` CLI. См. `docs/agents/issue-tracker.md`.

### Triage labels

Канонические triage-метки: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. См. `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` и `docs/adr/` в корне репозитория. См. `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
