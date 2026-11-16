# AGENTS.md

Календарь звонков

## Структура

Одно Next.js-приложение (App Router, React 19, Tailwind 4, shadcn/ui):

- `npm run typecheck` — это `oxlint --type-aware --type-check`: линт, type-aware-правила и типы сразу. Отдельный `npm run lint` для полной проверки не нужен.
- ESLint, Prettier и `next lint` не используются. Форматирование — `oxfmt` (настройки в `.oxfmtrc.json`), линт — `oxlint` (`oxlint.config.mts`).
- `oxfmt` сортирует импорты и Tailwind-классы (по `src/app/globals.css`, функции `cn`/`cva`) и `package.json`. Не выравнивайте вручную — запускайте `npm run format`.

## UI

- shadcn настроен на стиль `base-nova` с примитивами Base UI (`@base-ui/react`), а не Radix: композиция через проп `render`, не `asChild`. Различия — `.agents/skills/shadcn/rules/base-vs-radix.md`.
- Компоненты добавляйте через shadcn MCP (`opencode.json`), а не копированием из документации Radix.

## Навыки агента

### Трекер задач

Задачи ведутся в GitHub Issues репозитория `Barrierok/frontend-project-386` через CLI `gh`. Подробнее — `docs/agents/issue-tracker.md`.

### Метки триажа

Стандартный набор из пяти ролей: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Подробнее — `docs/agents/triage-labels.md`.

### Документация домена

Один контекст: `GLOSSARY.md` и `docs/adr/` в корне репозитория. Подробнее — `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
