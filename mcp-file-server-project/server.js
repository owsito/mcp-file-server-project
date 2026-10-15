import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DEFAULT_WORKSPACE_ROOT, SandboxWorkspace } from './lib/workspace.js';
import { registerTools } from './lib/tools.js';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || '';
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT
  ? path.resolve(process.cwd(), process.env.WORKSPACE_ROOT)
  : DEFAULT_WORKSPACE_ROOT;
const ALLOWED_HOSTS = new Set((process.env.MCP_ALLOWED_HOSTS || 'localhost,127.0.0.1,localhost:3000,127.0.0.1:3000')
  .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean));

function makeMcpServer(workspace) {
  const server = new McpServer({ name: 'student-mcp-file-server', version: '1.0.0' });
  registerTools(server, workspace);
  return server;
}

function timingSafeTokenMatch(providedHeader) {
  if (!AUTH_TOKEN) return false;
  const provided = (providedHeader || '').replace(/^Bearer\s+/i, '');
  const expectedBuffer = Buffer.from(AUTH_TOKEN);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

async function startStdio() {
  const workspace = await new SandboxWorkspace(WORKSPACE_ROOT).initialize();
  const server = makeMcpServer(workspace);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`MCP file server running over stdio; sandbox: ${workspace.root}`);
}

async function startHttp() {
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT must be a valid TCP port.');
  if (AUTH_TOKEN.length < 24 || AUTH_TOKEN.startsWith('replace-this')) {
    throw new Error('HTTP mode requires a custom MCP_AUTH_TOKEN with at least 24 characters. Copy .env.example to .env and replace the placeholder with a long random token.');
  }
  const workspace = await new SandboxWorkspace(WORKSPACE_ROOT).initialize();
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const hostHeader = String(req.headers.host || '').toLowerCase();
    if (!ALLOWED_HOSTS.has(hostHeader)) return res.status(403).json({ error: 'Host header is not allowed. Add the host to MCP_ALLOWED_HOSTS if it is your HTTPS tunnel host.' });
    next();
  });
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'student-mcp-file-server' }));
  app.use('/mcp', express.json({ limit: '1mb', strict: true }));
  app.use('/mcp', (req, res, next) => {
    if (!timingSafeTokenMatch(req.headers.authorization)) {
      res.setHeader('WWW-Authenticate', 'Bearer');
      return res.status(401).json({ error: 'Unauthorized. Supply a valid Bearer token.' });
    }
    next();
  });

  app.post('/mcp', async (req, res) => {
    const server = makeMcpServer(workspace);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    let disposed = false;
    const dispose = async () => {
      if (disposed) return;
      disposed = true;
      try { await transport.close(); } catch {}
      try { await server.close(); } catch {}
    };
    res.on('close', () => { void dispose(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('MCP request error:', error?.message || error);
      if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
      await dispose();
    }
  });

  app.all('/mcp', (_req, res) => res.status(405).json({ error: 'Use Streamable HTTP POST requests on /mcp.' }));
  app.listen(PORT, HOST, () => {
    console.log(`MCP file server listening on http://${HOST}:${PORT}/mcp`);
    console.log(`Sandbox workspace: ${workspace.root}`);
    console.log(`Allowed Host values: ${[...ALLOWED_HOSTS].join(', ')}`);
    console.log('For remote access, expose this local port through HTTPS and add the tunnel host to MCP_ALLOWED_HOSTS.');
  });
}

const isStdio = process.argv.includes('--stdio') || process.env.MCP_TRANSPORT === 'stdio';
try {
  if (isStdio) await startStdio();
  else await startHttp();
} catch (error) {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
}
