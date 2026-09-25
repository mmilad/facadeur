import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { facadeurExamplesPlugin } from './vite.files.js';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react(), facadeurExamplesPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: `${rootDir}/index.html`,
        formDemo: `${rootDir}/form-demo.html`,
      },
    },
  },
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
      '@facadeur/style-engine': fileURLToPath(
        new URL('../style-engine/src/index.ts', import.meta.url),
      ),
      '@facadeur/store-yjs': fileURLToPath(new URL('../store-yjs/src/index.ts', import.meta.url)),
    },
  },
});
