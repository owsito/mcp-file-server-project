# Project State

## Project
Task Utils extension — MCP multi-session handoff demonstration.

## Current status
getOverdueTasks is done and tested (6 passed, 1 skipped).

## Goal
Add `getOverdueTasks(tasks, today)` to `src/task-utils.js`. It should return tasks whose `dueDate` is earlier than `today` and whose status is not `done`. The date comparison should use the `YYYY-MM-DD` format.

## No required work remains
Add and export `getOverdueTasks(tasks, today)` in `src/task-utils.js`, then add a focused test in `tests/task-utils.test.js` covering overdue non-completed tasks, tasks not yet due, and completed tasks excluded from results.

## Constraints
Only edit files inside this MCP workspace. Do not use absolute paths. Preserve completed tasks even if their due date is in the past.

## Final status
Implemented and exported `getOverdueTasks(tasks, today)` in `src/task-utils.js`; added a focused test covering overdue non-completed tasks, due-today and future tasks, and completed overdue tasks. The helper defaults `today` to the current UTC date in `YYYY-MM-DD` form. The agent had no test runner, so the user ran npm test.

## Latest final status
`getOverdueTasks` and its focused test are done. The user ran `npm test`: 6 passed, 0 failed, and 1 skipped because the symlink test is unsupported in this Windows environment. The default `today` is UTC; from 00:00 to 08:00 UTC+8 it therefore uses the previous local calendar date. Callers can pass `today` explicitly to control the comparison date.
