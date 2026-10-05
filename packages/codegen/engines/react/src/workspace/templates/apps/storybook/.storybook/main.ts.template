import type { StorybookConfig } from '@storybook/react-vite';
import type { InlineConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.stories.@(tsx|mdx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config: InlineConfig) => {
    config.resolve ??= {};
    config.resolve.dedupe = ['react', 'react-dom'];
    return config;
  },
};

export default config;
