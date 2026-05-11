import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const localBinary = process.platform === 'win32'
  ? path.join(root, '.venv', 'Scripts', 'graphify.exe')
  : path.join(root, '.venv', 'bin', 'graphify');
const command = existsSync(localBinary) ? localBinary : 'graphify';

const result = spawnSync(command, process.argv.slice(2), {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, PYTHONUNBUFFERED: '1' },
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);
