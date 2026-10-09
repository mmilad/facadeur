import '../src/app/globals.css';
import type { Preview } from '@storybook/nextjs-vite';

const preview: Preview = {
  parameters: {
    controls: { disable: true },
  },
};

export default preview;
