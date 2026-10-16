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

## Completion update
- Added and exported `getOverdueTasks(tasks, today)` with an ISO date-string comparison, a current UTC date default, and exclusion of tasks marked `done`.
- Added a focused test for overdue open/in-progress tasks, due-today and future tasks, and completed overdue tasks.
- Reviewed the Git status and diff after the implementation and handoff updates.
- The agent had no test runner, so the user ran npm test

## Latest completion update
- User confirmed `getOverdueTasks` and its focused test are done and ran `npm test`: 6 passed, 0 failed, 1 skipped.
- The skipped symlink test is unsupported in the user's Windows environment.
- Documented the UTC-default behavior: in the 00:00–08:00 UTC+8 window, the UTC date is the prior local calendar date; callers may pass `today` explicitly.
