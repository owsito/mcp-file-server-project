# Demo transcript — not yet captured

This file is intentionally a placeholder until the connector is run locally. It must not be presented as a record of completed tool calls.

After installing the dependencies and starting the authenticated MCP server, run `npm run demo`. The script opens two independent MCP client connections, performs the handoff task through the live `/mcp` endpoint, runs the workspace tests, and replaces this file with a timestamped transcript of the actual MCP tool arguments and results.

Environment note: during artifact preparation, `npm install` could not reach the npm registry because the network lookup failed (`EAI_AGAIN`). The built-in file-sandbox and sample-workspace tests were still executed separately and passed. The MCP transport/client transcript therefore has not been run or fabricated in this environment.
