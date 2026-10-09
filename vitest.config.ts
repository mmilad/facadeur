import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

/** Tests paused during v2 catalog reset — see docs/node-model-refactor.md */
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
      '@facadeur/domain': `${root}packages/domain/src/index.ts`,
      '@facadeur/core': `${root}packages/core/src/index.ts`,
      '@facadeur/store-yjs': `${root}packages/store-yjs/src/index.ts`,
      '@facadeur/renderer-dom': `${root}packages/renderer-dom/src/index.ts`,
      '@facadeur/tokens': `${root}packages/tokens/src/index.ts`,
      '@facadeur/style-engine': `${root}packages/style-engine/src/index.ts`,
      '@facadeur/codegen': `${root}packages/codegen/src/index.ts`,
      '@facadeur/codegen/engines/react': `${root}packages/codegen/engines/react/src/index.ts`,
    },
    dedupe: ['@sinclair/typebox'],
  },
  ssr: {
    noExternal: ['@sinclair/typebox'],
  },
  test: {
    include: [
      'packages/core/test/node-model.test.ts',
      'packages/core/test/project-catalog.test.ts',
      'packages/core/test/catalog-field-exposure.test.ts',
      'packages/core/test/core-controller.test.ts',
      'packages/api/test/catalog.test.ts',
      'packages/api/test/project-storage.test.ts',
      'packages/renderer-dom/test/render-node.test.ts',
      'packages/core/test/catalog-design.test.ts',
      'packages/core/test/catalog-tree-ops.test.ts',
      'packages/core/test/prop-ref.test.ts',
      'packages/core/test/design-props.test.ts',
      'packages/core/test/insert-image-node.test.ts',
      'apps/editor/test/catalog/asset-list.test.ts',
    ],
    passWithNoTests: true,
    environment: 'node',
    setupFiles: ['apps/editor/test/setup-next-mock.ts'],
  },
});
