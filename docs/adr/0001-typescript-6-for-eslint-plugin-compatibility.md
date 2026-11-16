# ADR-0001: TypeScript 7 для oxlint и изолированный TypeScript 6 для ESLint-плагинов

## Контекст

В проекте два требования к TypeScript:

- oxlint в режиме `--type-aware --type-check` использует `oxlint-tsgolint`, которому нужен TypeScript 7+.
- JS-плагины `eslint-plugin-sonarjs` и `eslint-plugin-testing-library` (и их общая зависимость `ts-api-utils`) загружают TypeScript как JavaScript-библиотеку и обращаются к её API (`TypeFlags`, `SyntaxKind` и т. п.).

В TypeScript 7 этот JS API практически пуст: `require("typescript")` возвращает объект только с `version` и `versionMajorMinor`. Если плагины разрешают `typescript` из корня проекта, их загрузка падает с `TypeError`.

## Решение

Оставить в корне `typescript@^7.0.2`, а для ESLint-плагинов поставить изолированный TypeScript 6 через npm overrides:

```json
{
  "overrides": {
    "eslint-plugin-sonarjs": { "typescript": "npm:@typescript/typescript6@^6.0.2" },
    "ts-api-utils": { "typescript": "npm:@typescript/typescript6@^6.0.2" }
  }
}
```

npm кладёт `ts-api-utils` и TypeScript 6 внутрь `eslint-plugin-sonarjs` и `eslint-plugin-testing-library`, поэтому плагины не видят корневой TypeScript 7. Код приложения, Next.js и `oxlint-tsgolint` при этом используют TypeScript 7.

## Последствия

- `npm run lint` остаётся быстрым, а `npm run typecheck` запускает `oxlint --type-aware --type-check`.
- Overrides нельзя удалять, пока `eslint-plugin-sonarjs` и `ts-api-utils` не начнут поддерживать JS API TypeScript 7.
- После изменения зависимостей нужна чистая установка (`rm -rf node_modules package-lock.json && npm install`), иначе npm может оставить `ts-api-utils` в корне и плагины снова упадут.
- При обновлении TypeScript стоит прогнать `npm run check`, чтобы убедиться, что плагины загружаются.
