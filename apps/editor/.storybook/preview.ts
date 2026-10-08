import '../src/app/globals.css';
import type { Preview } from '@storybook/nextjs-vite';

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
  },
};

export default preview;
