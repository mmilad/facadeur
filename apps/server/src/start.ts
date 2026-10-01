import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProjectServer } from './http.js';
import { openProject } from './project/index.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const project = openProject({
  directory: process.env.FACADEUR_PROJECT_DIR ?? path.join(root, 'examples'),
  stateDirectory: process.env.FACADEUR_STATE_DIR ?? path.join(root, '.facadeur', 'default'),
});
const port = Number(process.env.FACADEUR_SERVER_PORT ?? 3002);
const runtime = createProjectServer(project, {
  editorPort: Number(process.env.FACADEUR_EDITOR_PORT ?? 3001),
});
runtime.server.listen(port, '127.0.0.1', () =>
  console.log(`Facadeur project API: http://127.0.0.1:${port}`),
);
runtime.server.on('error', (error) => {
  console.error(error);
  void stop();
  process.exitCode = 1;
});
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await runtime.close();
  project.destroy();
}
process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());
