# Decisions

- **Date format:** compare ISO-style `YYYY-MM-DD` strings so the helper stays simple and deterministic when callers provide the same format.
- **Completed tasks:** exclude tasks with `status === "done"` even when their due date is in the past.
- **Safe workspace:** all file changes go through the MCP server's relative-path tools and sandbox path checks.
- **Test strategy:** use Node's built-in test runner to avoid an extra testing dependency.
