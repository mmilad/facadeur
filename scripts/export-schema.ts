import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { documentJsonSchema, projectCatalogJsonSchema } from '../packages/core/src/index.ts';

const schemaDir = fileURLToPath(new URL('../schema/', import.meta.url));
writeFileSync(
  `${schemaDir}document.schema.json`,
  `${JSON.stringify(documentJsonSchema(), null, 2)}\n`,
);
writeFileSync(
  `${schemaDir}project-catalog.schema.json`,
  `${JSON.stringify(projectCatalogJsonSchema(), null, 2)}\n`,
);
