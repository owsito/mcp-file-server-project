# Project State

## Project
Task Utils extension — MCP multi-session handoff demonstration.

## Current status
Planning review complete. The task utility exports `isComplete`; no `getOverdueTasks` or `dueDate` handling exists in `src/task-utils.js`. The existing tests use Node's built-in test runner and strict assertions.

## Goal
Add `getOverdueTasks(tasks, today)` to `src/task-utils.js`. It should return tasks whose `dueDate` is earlier than `today` and whose status is not `done`. The date comparison should use the `YYYY-MM-DD` format.

## Exact next action
Add and export `getOverdueTasks(tasks, today)` in `src/task-utils.js`, then add a focused test in `tests/task-utils.test.js` covering overdue non-completed tasks, tasks not yet due, and completed tasks excluded from results.

## Constraints
Only edit files inside this MCP workspace. Do not use absolute paths. Preserve completed tasks even if their due date is in the past.
