import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)', './stories/**/*.stories.@(ts|tsx)'],
  framework: '@storybook/nextjs-vite',
};

export default config;
