import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
  },
  resolve: {
    alias: {
      '@facadeur/core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
      '@facadeur/renderer-dom': fileURLToPath(
        new URL('../renderer-dom/src/index.ts', import.meta.url),
      ),
      '@facadeur/tokens': fileURLToPath(new URL('../tokens/src/index.ts', import.meta.url)),
    },
  },
});
