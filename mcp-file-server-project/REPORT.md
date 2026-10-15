# Project Report: Student MCP File-Server Connector

## 1. Objective

The objective of this project is to build a working Model Context Protocol (MCP) file-server connector that lets an AI client discover and use controlled file operations. The server must keep file actions inside a sandbox, expose at least eight useful tools, support a remote HTTPS endpoint, and preserve project state so a second agent session can continue earlier work.

## 2. Technology Stack

The implementation uses Node.js, JavaScript ES modules, the official MCP TypeScript/JavaScript SDK's v1 package, Express, Zod schemas, dotenv, Git, and Node's built-in test runner. MCP tools are served over Streamable HTTP for remote clients. A stdio transport is also available for clients that launch local MCP processes. The official SDK documentation describes Streamable HTTP as the recommended transport for remote servers and stdio as a fit for local process-spawned integrations.

For deployment, an HTTPS tunnel such as ngrok forwards traffic to the local HTTP port, while PM2 can keep the Node process running and restart it if it stops. The application requires a configured Bearer token in HTTP mode.

## 3. Tool Design

The server exposes eight tools:

1. `list_files` — list files and directories in the workspace.
2. `read_file` — read a bounded UTF-8 text file.
3. `write_file` — create a file or explicitly overwrite an existing file.
4. `str_replace` — replace one exact text fragment when the fragment matches exactly once.
5. `delete_file` — delete a file only after explicit confirmation.
6. `search_files` — search text in workspace files and return paths, line numbers, and snippets.
7. `git_status` — inspect Git status.
8. `git_diff` — inspect unstaged changes, optionally for one workspace-relative path.

All tool inputs use defined schemas. Tool results are returned as readable text or structured JSON text, and failed operations produce an MCP tool error rather than silently pretending to succeed. File-writing and deletion actions are added to `TOOL_AUDIT.log`.

## 4. Architecture and Handoff

The HTTP layer authenticates requests, checks the Host header against a configured allowlist, and serves MCP requests at `/mcp`. A workspace layer resolves user paths against one configured root directory. Tool registration is separated from the transport code so the same tools are available over HTTP and stdio.

The persistent handoff protocol consists of four Markdown files:

- `PROJECT_STATE.md` records the current task and the next action.
- `PLAN_LOG.md` records planned and completed work.
- `CHECKPOINTS.md` records verification milestones.
- `DECISIONS.md` records choices and their reasons.

The sample demonstration asks Session 1 to inspect a small task utility and save the next task. Session 2 opens a new client connection, reads the shared handoff files, adds `getOverdueTasks()`, writes a test, and checks the result. This shows that continuation depends on durable files rather than earlier conversation history.

## 5. Security Controls and Tradeoffs

The sandbox rejects absolute paths and paths that resolve outside the workspace, including detected symlinks pointing outward. Hard-linked files are rejected for reads and overwrites. Reads reject binary files and files larger than 1 MB. Writes have a 1 MB limit and default to refusing to overwrite an existing file. Text replacement must match exactly once so a broad or ambiguous replacement does not proceed. Deletion requires `confirm=true` and is limited to files. Git operations use fixed argument arrays instead of running user-supplied shell commands.

HTTP requests require a random Bearer token, and hostnames must be allowlisted. The HTTPS tunnel supplies encryption between the client and the tunnel endpoint; the Node server remains local behind the tunnel. This design is intentionally simple enough for a course project. Its tradeoffs are a shared static token instead of OAuth, no role-based access control or rate limiting, and possible time-of-check/time-of-use risk if another local process modifies symlinks during an operation. Those limitations are documented in the README.

## 6. Testing and Demonstration

The repository includes tests for normal file operations, blocked traversal, blocked external symlinks, and the sample Task Utils functions. The two-client demonstration script records MCP tool calls and returned results in `docs/DEMO_TRANSCRIPT.md`. The demo also runs the workspace tests and checks Git status/diff after the second client has made its change.

The generated transcript records two independent MCP client connections. Because these clients are not themselves language-model agents, the in-class presentation should also show two actual AI-client conversations connected to the same server if the instructor interprets the requirement strictly as two agent sessions.

## 7. Conclusion

The project provides a working foundation for a sandboxed MCP file server with eight tools, path safety checks, authenticated HTTP access, Git-lite inspection, persistent handoff files, and an executable multi-connection demonstration. The most important design principle is that agent convenience does not replace server-side security: the tools validate file paths and destructive actions before touching the workspace.

## Reference

Model Context Protocol, *MCP TypeScript SDK (v1), Server Guide*, https://ts.sdk.modelcontextprotocol.io/server. Accessed October 15, 2026.
