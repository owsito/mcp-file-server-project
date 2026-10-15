# Student MCP File-Server Connector

A complete starter implementation for the Week 6 “Build Your Own” MCP file-server connector project. It exposes sandboxed file tools over MCP Streamable HTTP, uses a Bearer token for HTTP access, includes Git-lite tools, and persists handoff state so work can continue across independent client/agent sessions.

## What is included

- **8 MCP tools:** `list_files`, `read_file`, `write_file`, `str_replace`, `delete_file`, `search_files`, `git_status`, and `git_diff`.
- **Sandbox path checks:** rejects absolute paths, `..` escapes, symlinks that resolve outside the workspace, and hard-linked files.
- **Safer writes:** file overwrites require `overwrite=true`; exact text replacement must match once; deletes require `confirm=true` and cannot delete directories.
- **HTTP authentication:** Bearer-token authentication, Host allowlist, bounded JSON request size, and a simple health route.
- **Two-session demo:** a script creates two separate MCP client connections. Session 1 reviews the task and writes a handoff; Session 2 reads it, adds the feature and test, and checks Git status/diff.
- **Handoff files:** `workspace/PROJECT_STATE.md`, `workspace/PLAN_LOG.md`, `workspace/CHECKPOINTS.md`, and `workspace/DECISIONS.md`.
- **Documentation:** mini-report and a 5-minute demonstration guide.

## Requirements

- Node.js 20 or newer
- npm
- Git installed and available as `git`
- For the HTTPS demo: ngrok or a comparable HTTPS tunnel
- For process supervision: PM2 (optional but recommended for the demo)

## 1. Install and configure

Open a terminal in this project folder:

```bash
npm install
```

Copy the environment template:

- Windows PowerShell: `Copy-Item .env.example .env`
- Windows Command Prompt: `copy .env.example .env`
- macOS/Linux: `cp .env.example .env`

Generate a random token:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Paste that value into `.env` as `MCP_AUTH_TOKEN`. Do not use the template placeholder or commit `.env`. The default listener binds to `127.0.0.1:3000` and the workspace defaults to this repository's `workspace/` directory.

## 2. Run and test locally

Terminal 1:

```bash
npm start
```

You should see a message that the MCP file server is listening on `http://127.0.0.1:3000/mcp`. Keep this terminal open.

In Terminal 2:

```bash
npm test
npm run git:init
```

The `npm run git:init` command creates a Git repository inside the sample `workspace/` folder. If it already exists, Git will report that it is initialized; that is fine.

To inspect the server with MCP Inspector:

```bash
npm run inspector
```

Open the URL printed by Inspector, select a Streamable HTTP connection, and use `http://127.0.0.1:3000/mcp`. Add this request header:

- Header name: `Authorization`
- Header value: `Bearer ` followed by the value of `MCP_AUTH_TOKEN` in `.env`

Try `list_files`, `read_file` with `src/task-utils.js`, then `search_files` for `getOpenTasks`.

## 3. Run the two-client-session handoff demo

Keep the server running in Terminal 1. In Terminal 2 run:

```bash
npm run demo
```

The script performs MCP calls through the live HTTP endpoint. It opens Client Session 1, reviews the workspace and writes handoff state, closes that connection, then opens Client Session 2. Session 2 reads the handoff files, adds `getOverdueTasks()` and a test, executes the workspace tests, and checks Git status/diff.

The script writes `docs/DEMO_TRANSCRIPT.md` with the actual tool calls and returned results from this run. The two-client script proves persistence across independent MCP client connections; for a strict “two agent sessions” grading requirement, also demonstrate the same handoff inside two separate AI-client conversations using your instructor-approved MCP client.

To reset the sample workspace for another clean demo, restore the initial sample files from the project ZIP or make a copy of `workspace/` before the first run. The demo intentionally edits the sample workspace and handoff files.

## 4. Serve it through HTTPS

The project does not terminate public TLS itself. Use a tunnel that provides HTTPS and forwards requests to `127.0.0.1:3000`.

1. Start the local server.
2. In another terminal, run `npx ngrok http 3000` (ngrok may require an account and configured authentication).
3. Copy the HTTPS host printed by ngrok, such as `example-name.ngrok-free.app`.
4. Add that hostname to `MCP_ALLOWED_HOSTS` in `.env` as a comma-separated value, for example:

   ```text
   MCP_ALLOWED_HOSTS=localhost,127.0.0.1,localhost:3000,127.0.0.1:3000,example-name.ngrok-free.app
   ```

5. Restart the MCP server so it loads the updated allowlist. Keep ngrok running.
6. Connect the MCP client to `https://example-name.ngrok-free.app/mcp` and supply the same `Authorization: Bearer <token>` header.

If the tunnel assigns a new hostname, update the allowlist. Do not use `*` for `MCP_ALLOWED_HOSTS` or expose this demo without a strong token.

## 5. Keep the process alive

PM2 is optional for local development but demonstrates a process manager for the project requirement:

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs student-mcp-file-server
```

To stop it:

```bash
pm2 stop student-mcp-file-server
```

The tunnel is a separate process and must also stay running. For the 5-minute class demo, two visible terminals (server and tunnel) are sufficient.

## Available MCP tools

| Tool | Purpose | Main guard |
|---|---|---|
| `list_files` | List workspace files/directories | Relative paths; skips `.git` and dependencies |
| `read_file` | Read UTF-8 text | 1 MB file limit; rejects binary files |
| `write_file` | Create/overwrite text | `overwrite=true` needed for existing files; 1 MB limit |
| `str_replace` | Replace exact text once | Requires exactly one match |
| `delete_file` | Delete a file | Requires `confirm=true`; directories blocked |
| `search_files` | Case-insensitive text search | Skips large/binary/ignored files; caps results |
| `git_status` | Show Git status | Runs Git with fixed arguments, not a shell command |
| `git_diff` | Show unstaged diff | Optional path is validated within the workspace |

## Important security note

This is a course/demo implementation, not a production file service. It uses a shared static Bearer token rather than OAuth, has no user roles or rate limiting, and is intended for a trusted classroom demo through an HTTPS tunnel. Do not point it at your home directory, a source-control root containing secrets, or any directory with files you do not want an AI tool to read or change. The path validation protects the sandbox in normal operation, but no application-level check fully removes time-of-check/time-of-use risks if a separate local process is actively changing symlinks at the same time.

## Project files

```text
server.js                  HTTP/stdio MCP server
lib/workspace.js           Sandboxed file operations and path validation
lib/tools.js               8 MCP tool registrations
scripts/demo-client.js      Two independent MCP-client handoff demo
ecosystem.config.cjs        PM2 process configuration
workspace/                 The sandbox and persistent handoff files
test/                      Security and file-operation tests
REPORT.md                  Short project report in Markdown
PROJECT_REPORT.docx        Formatted report suitable for submission
DEMO_GUIDE.md              Live demo flow and talking points
docs/DEMO_TRANSCRIPT.md     Generated by npm run demo
```
