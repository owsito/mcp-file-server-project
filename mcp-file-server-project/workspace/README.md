# Sample workspace: Task Utils

This small JavaScript module is included as the safe, repeatable target for the two-session handoff demonstration. The demo's follow-up task is to add a helper that returns unfinished tasks whose due date is before a supplied date, then test it.

Run the baseline workspace tests from the project root with:

```bash
node --test workspace/tests
```

The four handoff files in this directory are shared persistent state for any agent that connects to the MCP file server:

- `PROJECT_STATE.md` — current state and next action
- `PLAN_LOG.md` — ordered work log
- `CHECKPOINTS.md` — verified checkpoints
- `DECISIONS.md` — decisions and reasons
