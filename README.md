# Календарь звонков

[![hexlet-check](https://github.com/Barrierok/frontend-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/Barrierok/frontend-project-386/actions)

Разработайте совместно с ИИ сервис для бронирования календаря

Учебный проект Хекслета: https://ru.hexlet.io/programs/frontend
Как это должно работать: https://files.hexlet.app/a/2ipc5m

## Сценарий использования

1. Владелец календаря создал несколько типов встреч (15 и 30 минут).
2. Гость заходит на сайт и видит перед собой выбор между карточками типов встреч.
3. Гость нажимает на карточку "Встреча 30 минут".
4. После выбора карточки появляется календарь на 14 дней со слотами для брованирования.
5. Гость выбирает свободные дату и время. Нажимает "Продолжить"
6. Гость попадает на форму подтверждения записи, вводит Имя, email и нажимает "Подтвредить".
7. Вледелец календаря видит в списке встреч новую запись.

## Стек

- Разное

## Установка

<!-- Опишите установку: клонирование, зависимости, переменные окружения -->

```bash
git clone https://github.com/Barrierok/frontend-project-386.git
cd frontend-project-386
```

## Качество кода

Для линтинга используется [oxlint](https://oxc.rs/docs/guide/usage/linter.html), для форматирования — [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html). В oxlint подключены плагины `eslint-plugin-sonarjs` и `eslint-plugin-testing-library`; их правила берутся из `recommended`-конфигов плагинов в `oxlint.config.mts`, а не дублируются вручную. Проверка типов выполняется через `oxlint --type-aware --type-check`.

```bash
npm run lint          # проверка кода
npm run lint:fix      # автоисправление
npm run format        # форматирование
npm run format:check  # проверка форматирования
npm run typecheck     # линт + type-aware-правила + проверка типов
npm run test:run      # тесты один раз
npm run check         # линт, форматирование, typecheck и тесты
```

Перед коммитом lefthook запускает `oxlint --fix` и `oxfmt` для изменённых файлов, перед пушем — полный `npm run check`. Те же проверки выполняет workflow `.github/workflows/quality.yml`.

`oxlint --type-aware --type-check` не отключает обычные правила: команда прогоняет и линт, и type-aware-правила, и диагностику TypeScript. Поэтому `npm run check` не запускает `lint` отдельно — линт уже входит в `typecheck`.

## Использование

<!-- Добавьте примеры запуска и запись asciinema — именно это смотрит работодатель -->

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>
