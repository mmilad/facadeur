import { rm } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';

const apiDocsDirectory = new URL('../docs/api/core/', import.meta.url);
await rm(fileURLToPath(apiDocsDirectory), { recursive: true, force: true });
