import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@facadeur/api-client': `${root}packages/api-client/src/index.ts`,
      '@facadeur/api/server': `${root}packages/api/src/server/index.ts`,
      '@facadeur/api/schema': `${root}packages/api/src/schema/index.ts`,
      '@facadeur/api': `${root}packages/api/src/index.ts`,
      '@facadeur/core': `${root}packages/core/src/index.ts`,
      '@facadeur/store-yjs': `${root}packages/store-yjs/src/index.ts`,
      '@facadeur/renderer-dom': `${root}packages/renderer-dom/src/index.ts`,
      '@facadeur/tokens': `${root}packages/tokens/src/index.ts`,
      '@facadeur/style-engine': `${root}packages/style-engine/src/index.ts`,
      '@facadeur/codegen': `${root}packages/codegen/src/index.ts`,
      '@facadeur/codegen/engines/react': `${root}packages/codegen/engines/react/src/index.ts`,
    },
  },
  test: {
    include: [
      'packages/*/test/**/*.test.ts',
      'packages/*/test/**/*.test.tsx',
      'packages/codegen/engines/**/test/**/*.test.ts',
      'packages/codegen/engines/**/test/**/*.test.tsx',
      'apps/*/test/**/*.test.ts',
      'apps/*/test/**/*.test.tsx',
    ],
    environment: 'node',
    setupFiles: ['apps/editor/test/setup-next-mock.ts'],
  },
});
