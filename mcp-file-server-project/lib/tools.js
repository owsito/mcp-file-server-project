import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';
import { appendAudit } from './workspace.js';

const execFileAsync = promisify(execFile);
const textResult = (value) => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] });
const errorResult = (error) => ({ content: [{ type: 'text', text: `Error: ${error?.message ?? String(error)}` }], isError: true });
const safe = (handler) => async (args) => {
  try {
    return textResult(await handler(args));
  } catch (error) {
    return errorResult(error);
  }
};

async function gitCommand(workspace, args) {
  try {
    const result = await execFileAsync('git', ['-C', workspace.root, ...args], {
      timeout: 10_000,
      maxBuffer: 1_000_000,
      windowsHide: true
    });
    return result.stdout.trimEnd() || '(no output)';
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('Git was not found. Install Git and restart the server.');
    const detail = (error.stderr || error.message || '').trim();
    if (detail.includes('not a git repository')) throw new Error('The workspace is not a Git repository. Run `npm run git:init` from the project folder.');
    throw new Error(`Git command failed: ${detail}`);
  }
}

async function protectAuditLog(workspace, userPath) {
  const absolute = await workspace.resolveSafePath(userPath, { allowRoot: false });
  if (absolute === path.join(workspace.root, 'TOOL_AUDIT.log')) {
    throw new Error('TOOL_AUDIT.log is reserved for automatic tool-operation auditing.');
  }
}

export function registerTools(server, workspace) {
  server.registerTool('list_files', {
    title: 'List workspace files',
    description: 'List files and directories under a relative path inside the sandboxed workspace. Hidden Git and dependency folders are skipped.',
    inputSchema: { path: z.string().default('.').describe('Relative folder path; use . for the workspace root.') }
  }, safe(async ({ path: userPath }) => workspace.listFiles(userPath)));

  server.registerTool('read_file', {
    title: 'Read a text file',
    description: 'Read a UTF-8 text file inside the sandbox. Files larger than 1 MB and binary files are rejected.',
    inputSchema: { path: z.string().min(1).describe('Relative file path inside the workspace.') }
  }, safe(async ({ path: userPath }) => workspace.readFile(userPath)));

  server.registerTool('write_file', {
    title: 'Write a text file',
    description: 'Create a UTF-8 text file in the workspace. Replacing an existing file requires overwrite=true.',
    inputSchema: {
      path: z.string().min(1).describe('Relative destination file path.'),
      content: z.string().max(1_000_000).describe('Text content to write; maximum 1 MB.'),
      overwrite: z.boolean().default(false).describe('Must be true to replace an existing file.')
    }
  }, safe(async ({ path: userPath, content, overwrite }) => {
    await protectAuditLog(workspace, userPath);
    const result = await workspace.writeFile(userPath, content, { overwrite });
    await appendAudit(workspace.root, { action: 'write_file', path: result.path, bytes: result.bytes });
    return result;
  }));

  server.registerTool('str_replace', {
    title: 'Replace exact text',
    description: 'Replace one exact text occurrence in a text file. It makes no changes if the old text is absent or ambiguous.',
    inputSchema: {
      path: z.string().min(1).describe('Relative file path.'),
      oldText: z.string().min(1).max(200_000).describe('Exact text that must appear exactly once.'),
      newText: z.string().max(200_000).describe('Replacement text.')
    }
  }, safe(async ({ path: userPath, oldText, newText }) => {
    await protectAuditLog(workspace, userPath);
    const result = await workspace.replaceText(userPath, oldText, newText);
    await appendAudit(workspace.root, { action: 'str_replace', path: result.path, replacements: result.replacements });
    return result;
  }));

  server.registerTool('delete_file', {
    title: 'Delete a file',
    description: 'Delete a file in the workspace only when confirm=true is explicitly supplied. Directories cannot be deleted.',
    inputSchema: {
      path: z.string().min(1).describe('Relative path to a file.'),
      confirm: z.boolean().default(false).describe('Must be true to authorize deletion.')
    }
  }, safe(async ({ path: userPath, confirm }) => {
    await protectAuditLog(workspace, userPath);
    const result = await workspace.deleteFile(userPath, { confirm });
    await appendAudit(workspace.root, { action: 'delete_file', path: result.path });
    return result;
  }));

  server.registerTool('search_files', {
    title: 'Search workspace text',
    description: 'Case-insensitive substring search across UTF-8 text files in the workspace, returning matching file paths, line numbers, and snippets.',
    inputSchema: {
      query: z.string().min(1).max(500).describe('Text to find.'),
      path: z.string().default('.').describe('Relative file or folder to search.'),
      maxResults: z.number().int().min(1).max(100).default(30).describe('Maximum number of matches, from 1 to 100.')
    }
  }, safe(async ({ query, path: userPath, maxResults }) => workspace.searchFiles(query, userPath, maxResults)));

  server.registerTool('git_status', {
    title: 'Git status',
    description: 'Run Git status in the sandbox workspace. Does not execute arbitrary shell commands.',
    inputSchema: {}
  }, safe(async () => gitCommand(workspace, ['status', '--short', '--branch'])));

  server.registerTool('git_diff', {
    title: 'Git diff',
    description: 'Show unstaged Git changes in the workspace, optionally limited to one relative file path.',
    inputSchema: { path: z.string().min(1).optional().describe('Optional relative file path to diff.') }
  }, safe(async ({ path: userPath }) => {
    if (userPath) await workspace.resolveSafePath(userPath, { allowRoot: false });
    const args = ['diff', '--no-ext-diff', '--'];
    if (userPath) args.push(userPath.replace(/\\/g, '/'));
    return gitCommand(workspace, args);
  }));
}
