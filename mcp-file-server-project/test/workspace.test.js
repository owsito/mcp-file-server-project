import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SandboxWorkspace } from '../lib/workspace.js';

async function temporaryWorkspace() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-workspace-test-'));
  const workspace = await new SandboxWorkspace(root).initialize();
  return { root, workspace };
}

test('workspace can write, read, replace, list, search, and guarded-delete files', async (t) => {
  const { root, workspace } = await temporaryWorkspace();
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  await workspace.writeFile('sample.txt', 'hello task', { overwrite: false });
  assert.equal((await workspace.readFile('sample.txt')).content, 'hello task');
  await workspace.replaceText('sample.txt', 'hello', 'welcome');
  assert.equal((await workspace.readFile('sample.txt')).content, 'welcome task');
  assert.equal((await workspace.searchFiles('welcome')).matches.length, 1);
  assert.equal((await workspace.listFiles('.')).entries.some((entry) => entry.path === 'sample.txt'), true);
  await assert.rejects(() => workspace.deleteFile('sample.txt'), /confirm=true/);
  await workspace.deleteFile('sample.txt', { confirm: true });
  await assert.rejects(() => workspace.readFile('sample.txt'), /does not exist/);
});

test('workspace rejects lexical path traversal and absolute paths', async (t) => {
  const { root, workspace } = await temporaryWorkspace();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await assert.rejects(() => workspace.resolveSafePath('../outside.txt'), /outside the workspace/);
  await assert.rejects(() => workspace.resolveSafePath(path.join(root, 'outside.txt')), /Absolute paths/);
});

test('workspace rejects symlinks that point outside the sandbox', async (t) => {
  const { root, workspace } = await temporaryWorkspace();
  const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-outside-test-'));
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(outsideDir, { recursive: true, force: true });
  });
  await fs.writeFile(path.join(outsideDir, 'secret.txt'), 'private');
  try {
    await fs.symlink(outsideDir, path.join(root, 'escape'), 'dir');
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) {
      t.skip('Symbolic links are not supported in this environment.');
      return;
    }
    throw error;
  }
  await assert.rejects(() => workspace.readFile('escape/secret.txt'), /Symlink escape rejected/);
  await assert.rejects(() => workspace.resolveSafePath('escape/new.txt'), /Symlink escape rejected/);
});
