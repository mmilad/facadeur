import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));

/** Run editor dev via pnpm so Next resolves from the workspace install (not a hardcoded .next path). */
const child = spawn('pnpm', ['--filter', '@facadeur/editor', 'dev'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

let stopping = false;
function stop(code: number) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  child.kill();
}

child.on('error', (error) => {
  console.error(error);
  stop(1);
});
child.on('exit', (code) => stop(code ?? 1));
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
