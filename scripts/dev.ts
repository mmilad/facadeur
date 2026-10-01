import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const children = [
  spawn(
    process.execPath,
    [path.join(root, 'node_modules/tsx/dist/cli.mjs'), 'apps/server/src/start.ts'],
    { cwd: root, stdio: 'inherit' },
  ),
  spawn(
    process.execPath,
    [path.join(root, 'apps/editor/node_modules/next/dist/bin/next'), 'dev', '--port', '3001'],
    { cwd: path.join(root, 'apps/editor'), stdio: 'inherit' },
  ),
];
let stopping = false;
function stop(code: number) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill();
}
for (const child of children) {
  child.on('error', (error) => {
    console.error(error);
    stop(1);
  });
  child.on('exit', (code) => stop(code ?? 1));
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
