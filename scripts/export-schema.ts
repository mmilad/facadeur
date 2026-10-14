import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { projectCatalogJsonSchema } from '../packages/core/src/index.ts';

const schemaDir = fileURLToPath(new URL('../schema/', import.meta.url));
writeFileSync(
  `${schemaDir}catalog.schema.json`,
  `${JSON.stringify(projectCatalogJsonSchema(), null, 2)}\n`,
);
