# Five-Minute Live Demonstration Guide

## Before presenting

1. Install dependencies and configure `.env` with a custom `MCP_AUTH_TOKEN`.
2. Run `npm test` and `npm run git:init`.
3. Start the server with `npm start`.
4. Start an HTTPS tunnel to port 3000 and add the tunnel hostname to `MCP_ALLOWED_HOSTS`, then restart the server.
5. Connect the instructor-approved MCP client to `https://YOUR-TUNNEL-HOST/mcp` with the Bearer token header.
6. Open two separate agent conversations/sessions connected to this same MCP server. Do not reuse the same conversation for both halves.

## Suggested timing and speaking points

### 0:00–0:40 — Introduce the project

“Our project is a sandboxed MCP file-server connector. It allows an AI client to list, read, write, search, and safely update files through tools. We restricted its file operations to a dedicated workspace instead of giving it access to the whole computer.”

### 0:40–1:30 — Show the tools

Open the MCP tool list. Show all eight tools. Call `list_files`, then `read_file` on `src/task-utils.js`. Explain that every path is relative to the workspace and the server validates it before use.

### 1:30–2:00 — Show a security control

Try `read_file` with `../package.json` or an absolute path. The server should reject the request. Explain that paths and symlink targets are checked against the workspace root. Show that `delete_file` also requires `confirm=true`.

### 2:00–3:35 — Demonstrate handoff across two agent sessions

In Agent Session 1, use a prompt such as:

> Inspect `src/task-utils.js` and its tests. Do not implement the change yet. Update `PROJECT_STATE.md`, `PLAN_LOG.md`, `CHECKPOINTS.md`, and `DECISIONS.md` so a fresh agent session can continue. The next task is to add `getOverdueTasks(tasks, today)`, excluding completed tasks and comparing `YYYY-MM-DD` dates. Keep all changes inside the workspace.

Then switch to a new, separate agent conversation and send:

> Continue the task using the MCP workspace files, not the previous conversation. Read `PROJECT_STATE.md`, `PLAN_LOG.md`, `CHECKPOINTS.md`, and `DECISIONS.md`; implement the next step; add tests; run or request the available test workflow; review `git_status` and `git_diff`; update the handoff files when finished.

Show that Session 2 reads the files written by Session 1 and continues the task. A model may ask you to run a test command manually because this project's MCP server intentionally does not expose an arbitrary shell-execution tool.

### 3:35–4:20 — Show Git and test verification

Call `git_status` and `git_diff`. In a terminal, run:

```bash
node --test workspace/tests
```

Show the test output. The automated `npm run demo` script also creates `docs/DEMO_TRANSCRIPT.md` if you need an additional reproducible record.

### 4:20–5:00 — Summarize design choices

“We chose a dedicated workspace, eight narrowly scoped tools, explicit overwrite and delete guards, bounded text reads, authenticated HTTP requests, and four persistent handoff files. The main tradeoff is that the static Bearer-token method is appropriate for a controlled class demo but is not a replacement for production OAuth, roles, and rate limiting.”

## Likely questions and short answers

**Why MCP?** It gives the AI client a standard way to discover and call tools exposed by this server.

**What stops an agent from reading files outside the folder?** The server rejects absolute paths, path traversal, and symlink targets that resolve outside the configured workspace.

**Why do you need handoff files?** A new conversation may not have the earlier conversation history. The files provide persistent state, plans, checkpoints, and decisions.

**Why separate Session 1 and Session 2?** It tests whether the second session can resume from shared files instead of relying on the first session's memory.

**Is the system production-ready?** No. This is a controlled academic demonstration. A production service needs a stronger identity system, access controls, rate limits, deployment hardening, and operational monitoring.
