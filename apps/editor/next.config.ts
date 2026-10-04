import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const editorRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(editorRoot, '../..');

const workspaceAlias = (pkg: string, entry = 'index.ts') =>
  path.join(repoRoot, 'packages', pkg, 'src', entry);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(process.env.FACADEUR_EDITOR_DIST_DIR
    ? { distDir: process.env.FACADEUR_EDITOR_DIST_DIR }
    : {}),
  outputFileTracingRoot: repoRoot,
  transpilePackages: [
    '@facadeur/core',
    '@facadeur/renderer-dom',
    '@facadeur/style-engine',
    '@facadeur/tokens',
    'jsonjoy-builder',
  ],
  async rewrites() {
    return [{ source: '/__facadeur/examples', destination: '/api/facadeur/examples' }];
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      '@facadeur/core': workspaceAlias('core'),
      '@facadeur/renderer-dom': workspaceAlias('renderer-dom'),
      '@facadeur/tokens': workspaceAlias('tokens'),
      '@facadeur/style-engine': workspaceAlias('style-engine'),
    };
    return config;
  },
};

export default nextConfig;
