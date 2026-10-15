import fs from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LIB_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_WORKSPACE_ROOT = path.resolve(LIB_DIR, '..', 'workspace');
const MAX_TEXT_BYTES = 1_000_000;
const IGNORED_DIRS = new Set(['.git', 'node_modules', '.next', 'dist', 'coverage']);

function isWithin(parent, child) {
  return child === parent || child.startsWith(parent + path.sep);
}

function validateRelativeInput(input) {
  if (typeof input !== 'string' || input.trim() === '') {
    throw new Error('A non-empty relative path is required. Use "." for the workspace root.');
  }
  if (input.includes('\0')) throw new Error('Path contains an invalid NUL character.');
  if (path.isAbsolute(input) || /^[a-zA-Z]:[\\/]/.test(input) || input.startsWith('\\\\')) {
    throw new Error('Absolute paths are not allowed; paths must stay inside the workspace.');
  }
  // Treat Windows separators as separators even when the server runs on POSIX.
  return input.replace(/\\/g, path.sep);
}

export class SandboxWorkspace {
  constructor(root = DEFAULT_WORKSPACE_ROOT) {
    this.root = path.resolve(root);
    this.realRoot = null;
  }

  async initialize() {
    await fs.mkdir(this.root, { recursive: true });
    this.realRoot = await fs.realpath(this.root);
    return this;
  }

  async resolveSafePath(userPath, { mustExist = false, allowRoot = true } = {}) {
    if (!this.realRoot) await this.initialize();
    const relative = validateRelativeInput(userPath);
    const candidate = path.resolve(this.root, relative);

    if (!isWithin(this.root, candidate)) {
      throw new Error('Path escape rejected: the requested path is outside the workspace.');
    }
    if (!allowRoot && candidate === this.root) {
      throw new Error('The workspace root itself cannot be used for this operation.');
    }

    let exists = true;
    try {
      await fs.lstat(candidate);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') exists = false;
      else throw error;
    }

    if (mustExist && !exists) throw new Error(`Path does not exist: ${userPath}`);

    if (exists) {
      const physical = await fs.realpath(candidate);
      if (!isWithin(this.realRoot, physical)) {
        throw new Error('Symlink escape rejected: the requested path resolves outside the workspace.');
      }
      return candidate;
    }

    // For new files, resolve the nearest existing ancestor to catch symlinked parent folders.
    let ancestor = path.dirname(candidate);
    const missingParts = [path.basename(candidate)];
    while (true) {
      try {
        await fs.lstat(ancestor);
        break;
      } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
        const parent = path.dirname(ancestor);
        if (parent === ancestor) throw new Error('Unable to resolve a safe parent directory.');
        missingParts.unshift(path.basename(ancestor));
        ancestor = parent;
      }
    }
    const physicalAncestor = await fs.realpath(ancestor);
    const projected = path.resolve(physicalAncestor, ...missingParts);
    if (!isWithin(this.realRoot, physicalAncestor) || !isWithin(this.realRoot, projected)) {
      throw new Error('Symlink escape rejected: the requested path would resolve outside the workspace.');
    }
    return candidate;
  }

  async listFiles(userPath = '.', { maxEntries = 300 } = {}) {
    const start = await this.resolveSafePath(userPath, { mustExist: true });
    const stat = await fs.stat(start);
    if (!stat.isDirectory()) throw new Error(`Not a directory: ${userPath}`);
    const results = [];

    const visit = async (directory) => {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        const absolute = path.join(directory, entry.name);
        const relative = path.relative(this.root, absolute).split(path.sep).join('/');
        results.push({ path: relative, type: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other' });
        if (results.length >= maxEntries) return;
        if (entry.isDirectory()) await visit(absolute);
        if (results.length >= maxEntries) return;
      }
    };

    await visit(start);
    return { root: this.realRoot, truncated: results.length >= maxEntries, entries: results };
  }

  async readFile(userPath) {
    const absolute = await this.resolveSafePath(userPath, { mustExist: true, allowRoot: false });
    const stat = await fs.stat(absolute);
    if (!stat.isFile()) throw new Error(`Not a regular file: ${userPath}`);
    if (stat.nlink > 1) throw new Error('Hard-linked files are not supported by the sandbox.');
    if (stat.size > MAX_TEXT_BYTES) throw new Error(`File is larger than the ${MAX_TEXT_BYTES} byte text limit.`);
    const content = await fs.readFile(absolute, 'utf8');
    if (content.includes('\0')) throw new Error('Binary files are not supported by read_file.');
    return { path: path.relative(this.root, absolute).split(path.sep).join('/'), bytes: stat.size, content };
  }

  async writeFile(userPath, content, { overwrite = false } = {}) {
    if (typeof content !== 'string') throw new Error('content must be a string.');
    if (Buffer.byteLength(content, 'utf8') > MAX_TEXT_BYTES) throw new Error(`Content exceeds ${MAX_TEXT_BYTES} bytes.`);
    let absolute = await this.resolveSafePath(userPath, { allowRoot: false });
    try {
      const stat = await fs.stat(absolute);
      if (stat.isDirectory()) throw new Error(`Cannot write to a directory: ${userPath}`);
      if (stat.nlink > 1) throw new Error('Hard-linked files cannot be overwritten inside the sandbox.');
      if (!overwrite) throw new Error(`File already exists: ${userPath}. Set overwrite=true to replace it.`);
    } catch (error) {
      if (error.code !== 'ENOENT' && !String(error.message).startsWith('File already exists:') && !String(error.message).startsWith('Cannot write')) throw error;
      if (String(error.message).startsWith('File already exists:') || String(error.message).startsWith('Cannot write')) throw error;
    }
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    // Re-check after creating parents, immediately before writing.
    absolute = await this.resolveSafePath(userPath, { allowRoot: false });
    await fs.writeFile(absolute, content, { encoding: 'utf8', flag: overwrite ? 'w' : 'wx' });
    return { path: path.relative(this.root, absolute).split(path.sep).join('/'), bytes: Buffer.byteLength(content, 'utf8') };
  }

  async replaceText(userPath, oldText, newText) {
    if (!oldText) throw new Error('oldText cannot be empty.');
    const file = await this.readFile(userPath);
    const first = file.content.indexOf(oldText);
    if (first < 0) throw new Error('The exact oldText was not found; no changes were made.');
    if (file.content.indexOf(oldText, first + oldText.length) >= 0) {
      throw new Error('oldText appears more than once. Use a more specific text fragment; no changes were made.');
    }
    const updated = file.content.slice(0, first) + newText + file.content.slice(first + oldText.length);
    const absolute = await this.resolveSafePath(userPath, { mustExist: true, allowRoot: false });
    await fs.writeFile(absolute, updated, 'utf8');
    return { path: file.path, replacements: 1, bytes: Buffer.byteLength(updated, 'utf8') };
  }

  async deleteFile(userPath, { confirm = false } = {}) {
    if (confirm !== true) throw new Error('Deletion is disabled unless confirm=true is explicitly provided.');
    const absolute = await this.resolveSafePath(userPath, { mustExist: true, allowRoot: false });
    const stat = await fs.lstat(absolute);
    if (!stat.isFile() && !stat.isSymbolicLink()) throw new Error('Only files can be deleted; directories are not allowed.');
    await fs.unlink(absolute);
    return { path: path.relative(this.root, absolute).split(path.sep).join('/'), deleted: true };
  }

  async searchFiles(query, userPath = '.', maxResults = 30) {
    if (typeof query !== 'string' || query.trim() === '') throw new Error('query must be non-empty.');
    const start = await this.resolveSafePath(userPath, { mustExist: true });
    const startStat = await fs.stat(start);
    const needle = query.toLowerCase();
    const results = [];
    let truncated = false;

    const inspectFile = async (absolute) => {
      if (results.length >= maxResults) { truncated = true; return; }
      try {
        const stat = await fs.stat(absolute);
        if (!stat.isFile() || stat.size > MAX_TEXT_BYTES) return;
        const content = await fs.readFile(absolute, 'utf8');
        if (content.includes('\0')) return;
        const index = content.toLowerCase().indexOf(needle);
        if (index >= 0) {
          const line = content.slice(0, index).split('\n').length;
          const lines = content.split('\n');
          results.push({
            path: path.relative(this.root, absolute).split(path.sep).join('/'),
            line,
            snippet: (lines[line - 1] ?? '').trim().slice(0, 240)
          });
        }
      } catch (error) {
        if (!['EACCES', 'EISDIR', 'ENOENT'].includes(error.code)) throw error;
      }
    };

    const visit = async (directory) => {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        const absolute = path.join(directory, entry.name);
        if (entry.isSymbolicLink()) continue;
        const safe = await this.resolveSafePath(path.relative(this.root, absolute).split(path.sep).join('/'), { mustExist: true });
        if (entry.isDirectory()) await visit(safe);
        else if (entry.isFile()) await inspectFile(safe);
        if (results.length >= maxResults) { truncated = true; return; }
      }
    };

    if (startStat.isDirectory()) await visit(start);
    else await inspectFile(start);
    return { query, truncated, matches: results };
  }
}

export async function appendAudit(root, event) {
  const logPath = path.join(root, 'TOOL_AUDIT.log');
  const line = JSON.stringify({ at: new Date().toISOString(), ...event }) + '\n';
  const flags = fsConstants.O_WRONLY | fsConstants.O_APPEND | fsConstants.O_CREAT | (fsConstants.O_NOFOLLOW || 0);
  const handle = await fs.open(logPath, flags, 0o600);
  try {
    await handle.writeFile(line, 'utf8');
  } finally {
    await handle.close();
  }
}
