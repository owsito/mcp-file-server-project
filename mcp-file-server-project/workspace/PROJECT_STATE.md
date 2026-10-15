# Project State

## Project
Task Utils extension — MCP multi-session handoff demonstration.

## Current status
Ready for the demo task. The baseline utility functions and tests exist. No overdue-task helper has been implemented yet.

## Goal
Add `getOverdueTasks(tasks, today)` to `src/task-utils.js`. It should return tasks whose `dueDate` is earlier than `today` and whose status is not `done`. The date comparison should use the `YYYY-MM-DD` format.

## Next actions
1. Session 1 reviews the utility module and tests, then records a plan.
2. Session 2 reads this file and the plan, implements the helper, and adds a test.
3. Run the tests and record the verified result.

## Constraints
Only edit files inside this MCP workspace. Do not use absolute paths. Preserve completed tasks even if their due date is in the past.
