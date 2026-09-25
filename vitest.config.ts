import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@facadeur/core': `${root}packages/core/src/index.ts`,
      '@facadeur/store-yjs': `${root}packages/store-yjs/src/index.ts`,
      '@facadeur/renderer-dom': `${root}packages/renderer-dom/src/index.ts`,
      '@facadeur/tokens': `${root}packages/tokens/src/index.ts`,
      '@facadeur/style-engine': `${root}packages/style-engine/src/index.ts`,
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts', 'packages/*/test/**/*.test.tsx'],
    environment: 'node',
  },
});
