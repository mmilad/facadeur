import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const editorRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(editorRoot, '../..');

const workspaceAlias = (pkg: string, entry = 'index.ts') =>
  path.join(repoRoot, 'packages', pkg, 'src', entry);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@facadeur/core',
    '@facadeur/renderer-dom',
    '@facadeur/store-yjs',
    '@facadeur/style-engine',
    '@facadeur/tokens',
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
      '@facadeur/store-yjs': workspaceAlias('store-yjs'),
    };
    return config;
  },
};

export default nextConfig;
