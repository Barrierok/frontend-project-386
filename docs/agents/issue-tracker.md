# Трекер задач: GitHub

Задачи и спецификации этого репозитория живут в GitHub Issues. Все операции выполняются через CLI `gh`.

## Соглашения

- **Создать задачу**: `gh issue create --title "..." --body "..."`. Для многострочного тела используй heredoc.
- **Прочитать задачу**: `gh issue view <number> --json number,title,body,labels,comments`.
- **Список задач**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` с нужными фильтрами `--label` и `--state`.
- **Сделать задачу подзадачей родительской**: `gh issue create --parent <parent> ...` либо позже `gh issue edit <parent> --add-sub-issue <child>` (`gh` 2.94+). На старых версиях `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>` (database id, см. **Блокировки** ниже). Если подзадачи недоступны, добавь `Part of #<parent>` в начало тела подзадачи.
- **Блокировки**: нативные зависимости задач GitHub — каноничное и видимое в интерфейсе представление. Связь добавляется через `gh issue create --blocked-by <n>,<n> ...` или `gh issue edit <child> --add-blocked-by <blocker>` (`gh` 2.94+). На старых версиях `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, где `<blocker-db-id>` — числовой **database id** блокирующей задачи (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _не_ `#number` и не `node_id`). Там, где зависимости недоступны, используй строку `Blocked by: #<n>, #<n>` в начале тела подзадачи. Задача разблокирована, когда закрыты все блокирующие.
- **Посчитать открытые блокировки**: `gh api repos/<owner>/<repo>/issues/<n> --jq .issue_dependencies_summary.blocked_by` (только открытые; 0 означает, что можно начинать). `gh issue view <n> --json blockedBy` возвращает и закрытые блокирующие, поэтому фильтруй: `--jq '[.blockedBy.nodes[] | select(.state == "OPEN")] | length'`.
- **Прокомментировать задачу**: `gh issue comment <number> --body "..."`
- **Навесить / снять метку**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Закрыть**: опубликуй объяснение через `gh issue comment <number> --body "..."`, затем `gh issue close <number>`. На уже закрытой задаче `gh issue close --comment` теряет комментарий, но всё равно завершается с кодом 0.

Репозиторий определяется из `git remote -v`; внутри клона `gh` делает это автоматически.

Заводи задачи только в собственный репозиторий пользователя. Никогда не заводи их в `mattpocock/skills` (репозиторий, откуда пришли эти навыки), если он не принадлежит пользователю. В форке `gh` может по умолчанию выбрать upstream-родителя, поэтому перед первым `gh issue create` в сессии проверь цель командой `gh repo view --json nameWithOwner` и, если это не репозиторий пользователя, подтверди её у него.

## Pull request как поверхность триажа

**PR как запрос: нет.** _(Поставь `да`, если репозиторий рассматривает внешние PR как запросы на фичи; `/triage` читает этот флаг.)_

Если стоит `да`, PR проходят те же метки и состояния, что и задачи, через аналоги `gh pr`:

- **Прочитать PR**: `gh pr view <number>`, затем `gh pr view <number> --comments` (вне TTY `--comments` печатает только комментарии, без тела) и `gh pr diff <number>` для диффа.
- **Список внешних PR для триажа**: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- **Комментарий / метка / закрытие**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub использует единое пространство номеров для задач и PR, поэтому голый `#42` может означать и то и другое: проверяй через `gh pr view 42` и при неудаче переходи к `gh issue view 42`.

## Когда навык говорит «опубликуй в трекере задач»

Создай задачу на GitHub.

## Когда навык говорит «получи нужный тикет»

Читай его согласно разделу **Прочитать задачу** выше.

## Операции wayfinder

Используются навыком `/wayfinder`. **Карта** — это одна задача, а **тикеты** — её дочерние задачи.

- **Карта**: одна задача с меткой `wayfinder:map`, содержащая тело с разделами Notes / Decisions-so-far / Fog. `gh issue create --label wayfinder:map`.
- **Дочерний тикет**: задача, привязанная к карте как подзадача GitHub (см. **Сделать задачу подзадачей родительской**). Если подзадачи недоступны, добавь дочернюю задачу в список задач в теле карты и строку `Part of #<map>` в начало тела дочерней задачи. Метки: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). После взятия в работу тикет назначается на ведущего разработчика.
- **Блокировки**: см. **Блокировки** в разделе «Соглашения».
- **Запрос фронтира**: перечисли открытые дочерние задачи карты (`gh issue list --state open`, в пределах подзадач карты / списка задач), отбрось все с открытой блокировкой (см. **Посчитать открытые блокировки** или открытую задачу в строке `Blocked by`) или с исполнителем; выигрывает первая по порядку в карте.
- **Взять в работу**: `gh issue edit <n> --add-assignee @me` — первая запись в сессии.
- **Завершить**: `gh issue comment <n> --body "<answer>"`, затем `gh issue close <n>`, затем добавь указатель на контекст (gist + ссылка) в раздел Decisions-so-far карты.
