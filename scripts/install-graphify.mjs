import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const venvDir = path.join(root, '.venv');
const venvPython = process.platform === 'win32'
  ? path.join(venvDir, 'Scripts', 'python.exe')
  : path.join(venvDir, 'bin', 'python');
const requirementsFile = path.join(root, 'requirements-graphify.txt');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }
}

if (!existsSync(venvPython)) {
  run('python', ['-m', 'venv', '.venv']);
}

run(venvPython, ['-m', 'pip', 'install', '-r', requirementsFile]);
