import type { GeneratedComponent, GeneratedFile } from './types';

/** Assemble a standalone pnpm workspace from generated Catalog components and stories. */
export function workspaceFiles(
  ui: readonly GeneratedFile[],
  stories: readonly GeneratedFile[],
  nextExample = false,
  components: readonly GeneratedComponent[] = [],
): GeneratedFile[] {
  const rootPackage = {
    name: 'facadeur-catalog-project',
    private: true,
    scripts: {
      ...(nextExample ? { next: 'pnpm --filter @facadeur/example-next dev' } : {}),
      storybook: 'pnpm --filter @facadeur/storybook storybook',
      'build-storybook': 'pnpm --filter @facadeur/storybook build-storybook',
      typecheck: 'pnpm --filter @facadeur/ui typecheck',
    },
    devDependencies: { typescript: '^5.9.2' },
  };
  const files: GeneratedFile[] = [
    {
      path: '.gitignore',
      contents: 'node_modules/\n.next/\nstorybook-static/\n*.tsbuildinfo\n',
    },
    { path: 'README.md', contents: workspaceReadme(nextExample) },
    {
      path: 'package.json',
      contents: `${JSON.stringify(rootPackage, null, 2)}\n`,
    },
    {
      path: 'pnpm-workspace.yaml',
      contents: `packages:\n  - packages/*\n  - apps/storybook\n${nextExample ? '  - apps/next\n' : ''}`,
    },
    { path: 'tsconfig.base.json', contents: baseTsconfig },
    {
      path: 'packages/ui/package.json',
      contents: `${JSON.stringify(
        {
          name: '@facadeur/ui',
          version: '0.0.0',
          private: true,
          type: 'module',
          exports: { '.': './index.ts' },
          scripts: { typecheck: 'tsc --noEmit' },
          peerDependencies: { react: '^19.1.1' },
          devDependencies: { '@types/react': '^19.1.12' },
        },
        null,
        2,
      )}\n`,
    },
    {
      path: 'packages/ui/tsconfig.json',
      contents: `{
  "extends": "../../tsconfig.base.json",
  "include": ["**/*.ts", "**/*.tsx"]
}\n`,
    },
    { path: 'packages/ui/styles.d.ts', contents: `declare module '*.css';\n` },
    {
      path: 'apps/storybook/package.json',
      contents: `${JSON.stringify(
        {
          name: '@facadeur/storybook',
          private: true,
          type: 'module',
          scripts: { storybook: 'storybook dev -p 6006', 'build-storybook': 'storybook build' },
          dependencies: { '@facadeur/ui': 'workspace:*', react: '^19.1.1', 'react-dom': '^19.1.1' },
          devDependencies: {
            '@storybook/react': '10.6.1',
            '@storybook/react-vite': '10.6.1',
            '@types/react': '^19.1.12',
            '@types/react-dom': '^19.1.9',
            storybook: '10.6.1',
            vite: '^7.1.5',
          },
        },
        null,
        2,
      )}\n`,
    },
    {
      path: 'apps/storybook/.storybook/main.ts',
      contents: `import type { StorybookConfig } from '@storybook/react-vite';\n\nconst config: StorybookConfig = {\n  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],\n  framework: { name: '@storybook/react-vite', options: {} },\n};\n\nexport default config;\n`,
    },
    {
      path: 'apps/storybook/.storybook/preview.ts',
      contents: `import type { Preview } from '@storybook/react-vite';\n\nconst preview: Preview = {};\n\nexport default preview;\n`,
    },
    {
      path: 'apps/storybook/tsconfig.json',
      contents: `{
  "extends": "../../tsconfig.base.json",
  "include": ["**/*.ts", "**/*.tsx"]
}\n`,
    },
    ...ui.map((file) => ({ ...file, path: `packages/ui/${file.path}` })),
    ...stories.map((file) => ({ ...file, path: `apps/storybook/${file.path}` })),
  ];
  if (nextExample) files.push(...nextExampleFiles(components));
  return files;
}

function nextExampleFiles(components: readonly GeneratedComponent[]): GeneratedFile[] {
  return [
    {
      path: 'apps/next/package.json',
      contents: `${JSON.stringify(
        {
          name: '@facadeur/example-next',
          private: true,
          scripts: { dev: 'next dev' },
          dependencies: {
            '@facadeur/ui': 'workspace:*',
            next: '^15.5.3',
            react: '^19.1.1',
            'react-dom': '^19.1.1',
          },
          devDependencies: {
            '@types/react': '^19.1.12',
            '@types/react-dom': '^19.1.9',
          },
        },
        null,
        2,
      )}\n`,
    },
    {
      path: 'apps/next/next.config.ts',
      contents: `import type { NextConfig } from 'next';\n\nconst nextConfig: NextConfig = {};\n\nexport default nextConfig;\n`,
    },
    {
      path: 'apps/next/tsconfig.json',
      contents: `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "jsx": "preserve", "plugins": [{ "name": "next" }] },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
}\n`,
    },
    {
      path: 'apps/next/next-env.d.ts',
      contents: `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n\n// NOTE: This file should not be edited\n// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.\n`,
    },
    {
      path: 'apps/next/app/layout.tsx',
      contents: `import type { ReactNode } from 'react';\n\nexport default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {\n  return <html lang="en"><body>{children}</body></html>;\n}\n`,
    },
    {
      path: 'apps/next/app/page.tsx',
      contents: nextExamplePage(components),
    },
  ];
}

function nextExamplePage(components: readonly GeneratedComponent[]) {
  const imports = components
    .map(({ exportName }) => `${exportName}, type ${exportName}Props`)
    .join(', ');
  const previews = components
    .map(
      ({ exportName, title, props }) =>
        `      <section><h2>{${JSON.stringify(title)}}</h2><${exportName} {...(${JSON.stringify(props)} as ${exportName}Props)} /></section>`,
    )
    .join('\n');
  return `import { ${imports} } from '@facadeur/ui';\n\nexport default function Home() {\n  return (\n    <main>\n      <h1>Catalog components</h1>\n${previews}\n    </main>\n  );\n}\n`;
}

const baseTsconfig = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Preserve",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  }
}\n`;

function workspaceReadme(nextExample: boolean) {
  return `# Generated Catalog project\n\nInstall dependencies with \`pnpm install\`, then start Storybook with \`pnpm storybook\`. Generated React components live in \`packages/ui\`.${nextExample ? ' Start the optional Next.js example with `pnpm next`.' : ''}\n`;
}
