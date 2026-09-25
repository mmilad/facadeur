import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE_NAME = /^[a-z0-9][a-z0-9-]*\.json$/;
const editorRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const examplesDir = path.resolve(editorRoot, '../examples');

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { filename?: unknown; text?: unknown };
    if (typeof body.filename !== 'string' || typeof body.text !== 'string') {
      return new Response('Expected { filename, text }', { status: 400 });
    }
    if (!FILE_NAME.test(body.filename)) {
      return new Response('Invalid filename', { status: 400 });
    }
    JSON.parse(body.text);
    const target = path.resolve(examplesDir, body.filename);
    if (path.dirname(target) !== examplesDir) {
      return new Response('Invalid path', { status: 400 });
    }
    const text = body.text.endsWith('\n') ? body.text : `${body.text}\n`;
    await writeFile(target, text, 'utf8');
    return new Response(null, { status: 204 });
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
}
