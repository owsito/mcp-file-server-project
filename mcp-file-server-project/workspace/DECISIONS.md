# Decisions

- **Date format:** compare ISO-style `YYYY-MM-DD` strings so the helper stays simple and deterministic when callers provide the same format.
- **Completed tasks:** exclude tasks with `status === "done"` even when their due date is in the past.
- **Safe workspace:** all file changes go through the MCP server's relative-path tools and sandbox path checks.
- **Test strategy:** use Node's built-in test runner to avoid an extra testing dependency.

## Implementation update
- The optional `today` parameter defaults to `new Date().toISOString().slice(0, 10)`, giving a deterministic `YYYY-MM-DD` UTC date string for the comparison.
- The new test passes `today` explicitly and confirms tasks due exactly today are not overdue.

## Latest verification and behavior note
- User ran `npm test`: 6 passed, 0 failed, and 1 skipped because the symlink test is unsupported in this Windows environment.
- Keep the UTC date default. Between 00:00 and 08:00 in UTC+8, its calendar date is yesterday relative to local time; callers needing local-day semantics can pass `today` explicitly.
