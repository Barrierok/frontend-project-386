# Issue tracker: GitHub

Задачи и спецификации этого репозитория живут в GitHub Issues. Для всех операций используйте `gh` CLI.

## Соглашения

- **Создать issue**: `gh issue create --title "..." --body "..."`. Для многострочного тела используйте heredoc.
- **Прочитать issue**: `gh issue view <number> --json number,title,body,labels,comments`.
- **Список issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` с нужными фильтрами `--label` и `--state`.
- **Сделать issue подзадачей родителя**: `gh issue create --parent <parent> ...` или позже `gh issue edit <parent> --add-sub-issue <child>` (`gh` 2.94+). На более старом `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>` (database id, см. **Блокировки** ниже). Если подзадачи недоступны, поставьте `Part of #<parent>` в начало тела дочерней задачи.
- **Блокировки**: нативные зависимости GitHub issues — каноничное и видимое в UI представление. Добавить ребро: `gh issue create --blocked-by <n>,<n> ...` или `gh issue edit <child> --add-blocked-by <blocker>` (`gh` 2.94+). На более старом `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, где `<blocker-db-id>` — численный **database id** блокера (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, а не `#number` и не `node_id`). Если зависимости недоступны, используйте строку `Blocked by: #<n>, #<n>` в начале тела дочерней задачи. Тикет разблокирован, когда все блокеры закрыты.
- **Посчитать открытые блокеры**: `gh api repos/<owner>/<repo>/issues/<n> --jq .issue_dependencies_summary.blocked_by` (только открытые; 0 — можно начинать). `gh issue view <n> --json blockedBy` тоже показывает закрытые блокеры, поэтому фильтруйте: `--jq '[.blockedBy.nodes[] | select(.state == "OPEN")] | length'`.
- **Прокомментировать issue**: `gh issue comment <number> --body "..."`
- **Навесить / снять метки**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Закрыть**: опубликуйте объяснение через `gh issue comment <number> --body "..."`, затем `gh issue close <number>`. На уже закрытой задаче `gh issue close --comment` теряет комментарий, но завершается с кодом 0.

Репозиторий `gh` определяет по `git remote -v` автоматически, если запускать команды внутри клона.

Заводите задачи только в собственный репозиторий пользователя. Никогда не заводите их в `mattpocock/skills` (репозиторий, откуда пришли эти скиллы), если он не принадлежит пользователю. В форке `gh` может по умолчанию выбрать upstream-родителя, поэтому перед первым `gh issue create` за сессию проверьте цель через `gh repo view --json nameWithOwner` и уточните у пользователя, если это не его репозиторий.

## PR как поверхность triage

**PR как поверхность запросов: нет.** _(Поставьте `yes`, если репозиторий считает внешние PR запросами на фичу; `/triage` читает этот флаг.)_

Если флаг `yes`, PR проходят те же метки и состояния, что и issues, через аналоги `gh pr`:

- **Прочитать PR**: `gh pr view <number>`, затем `gh pr view <number> --comments` (вне TTY `--comments` печатает только комментарии, не тело), и `gh pr diff <number>` для диффа.
- **Список внешних PR для triage**: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- **Комментарий / метка / закрытие**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

У GitHub единое пространство номеров для issues и PR, поэтому голый `#42` может быть и тем и другим: проверьте через `gh pr view 42`, при неудаче — `gh issue view 42`.

## Когда скилл говорит «опубликуй в трекере»

Создайте GitHub issue.

## Когда скилл говорит «получи соответствующий тикет»

Прочитайте его, как описано в разделе **Прочитать issue**.

## Операции wayfinder

Используются `/wayfinder`. **Карта** — это одна issue, а **тикеты** — её дочерние issues.

- **Карта**: одна issue с меткой `wayfinder:map`, в теле — Notes / Decisions-so-far / Fog. `gh issue create --label wayfinder:map`.
- **Дочерний тикет**: issue, привязанная к карте как GitHub sub-issue (см. **Сделать issue подзадачей родителя**). Там, где подзадачи не включены, добавьте ребёнка в task list тела карты и поставьте `Part of #<map>` в начало тела дочерней задачи. Метки: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). После взятия в работу тикет назначается на ведущего разработчика.
- **Блокировки**: см. **Блокировки** в разделе «Соглашения».
- **Запрос фронта**: перечислите открытых детей карты (`gh issue list --state open` в рамках sub-issues карты / task list), отбросьте тех, у кого есть открытый блокер (см. **Посчитать открытые блокеры**, либо открытая issue в строке `Blocked by`) или назначенный исполнитель; побеждает первый по порядку в карте.
- **Claim**: `gh issue edit <n> --add-assignee @me` — первая запись в сессии.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, затем `gh issue close <n>`, затем добавьте указатель на контекст (суть + ссылка) в Decisions-so-far карты.
