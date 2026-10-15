import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const WORKSPACE = path.join(PROJECT_ROOT, 'workspace');

function git(args) {
  return execFileSync('git', ['-C', WORKSPACE, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

try {
  try {
    git(['rev-parse', '--is-inside-work-tree']);
    console.log('Git repository already exists in workspace/.');
  } catch {
    git(['init']);
    console.log('Initialized Git repository in workspace/.');
  }

  try {
    git(['rev-parse', '--verify', 'HEAD']);
    console.log('A baseline commit already exists.');
  } catch {
    git(['add', '--all']);
    git(['-c', 'user.name=Student Demo', '-c', 'user.email=student-demo@example.invalid', 'commit', '-m', 'Baseline Task Utils workspace']);
    console.log('Created a local baseline commit for the live diff demonstration.');
  }
} catch (error) {
  console.error('Could not initialize the demo Git repository. Confirm that Git is installed.');
  console.error(error.stderr?.toString() || error.message);
  process.exit(1);
}
