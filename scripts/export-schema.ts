import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { documentJsonSchema } from '../packages/core/src/index.ts';

const target = fileURLToPath(new URL('../schema/document.schema.json', import.meta.url));
writeFileSync(target, `${JSON.stringify(documentJsonSchema(), null, 2)}\n`);
