import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const FILE_NAME = /^[a-z0-9][a-z0-9-]*\.json$/;

/**
 * Dev-only writer for browsers without the File System Access API.
 * `PUT /__facadeur/examples` with `{ filename, text }` writes `examples/<filename>`.
 */
export function facadeurExamplesPlugin(): Plugin {
  const examplesDir = path.resolve(fileURLToPath(new URL('../../../examples', import.meta.url)));
  return {
    name: 'facadeur-examples',
    configureServer(server) {
      server.middlewares.use('/__facadeur/examples', (req, res) => {
        if (req.method !== 'PUT') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        req.on('end', () => {
          void (async () => {
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
                filename?: unknown;
                text?: unknown;
              };
              if (typeof body.filename !== 'string' || typeof body.text !== 'string') {
                res.statusCode = 400;
                res.end('Expected { filename, text }');
                return;
              }
              if (!FILE_NAME.test(body.filename)) {
                res.statusCode = 400;
                res.end('Invalid filename');
                return;
              }
              JSON.parse(body.text);
              const target = path.resolve(examplesDir, body.filename);
              if (path.dirname(target) !== examplesDir) {
                res.statusCode = 400;
                res.end('Invalid path');
                return;
              }
              const text = body.text.endsWith('\n') ? body.text : `${body.text}\n`;
              await writeFile(target, text, 'utf8');
              res.statusCode = 204;
              res.end();
            } catch {
              res.statusCode = 400;
              res.end('Invalid JSON');
            }
          })();
        });
      });
    },
  };
}
