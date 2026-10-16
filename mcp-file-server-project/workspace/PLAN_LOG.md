# Plan Log

## Planned work
1. Add and export `getOverdueTasks(tasks, today)` in `src/task-utils.js`, defaulting `today` to the current date in `YYYY-MM-DD` form.
2. Add a focused test in `tests/task-utils.test.js` covering overdue non-completed tasks, tasks not yet due, and completed tasks excluded from results.
3. Run the Node.js test runner and inspect the Git diff.
4. Update all handoff files with final status and any limitation.

## Work log
- Read `PROJECT_STATE.md`, `PLAN_LOG.md`, `CHECKPOINTS.md`, and `DECISIONS.md`.
- Used `list_files` and targeted `search_files` queries to inspect the task utility and test surfaces. Confirmed the utility currently exports `isComplete`, no overdue helper or `dueDate` handling exists, and tests use Node's built-in runner with strict assertions.
- Updated the handoff documents with the current task and exact next implementation action. No source code was changed.
