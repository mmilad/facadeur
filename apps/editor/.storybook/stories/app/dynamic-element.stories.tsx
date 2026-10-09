import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ElementBuildConfig } from '@facadeur/core';
import { DynamicElement } from '../../../src/domain/viewport/dynamic-element';

function DynamicElementPreview() {
  const [alternate, setAlternate] = useState(false);
  const image = (color: string, label: string) =>
    `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240"><rect width="400" height="240" fill="${color}"/><text x="200" y="128" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#35291f">${label}</text></svg>`)}`;
  const config: ElementBuildConfig = {
    tagName: 'article',
    nodeUuid: 'preview-card',
    style: { border: '1px solid #a94320', padding: '16px', width: '320px' },
    children: [
      {
        tagName: 'img',
        nodeUuid: 'preview-image',
        attributes: {
          src: alternate ? image('#ead7c5', 'Alternate') : image('#d9e7fa', 'Default'),
          alt: alternate ? 'Alternate preview' : 'Default preview',
        },
        style: { display: 'block', width: '100%' },
        children: [{ tagName: 'span', text: 'ignored by void img' }],
      },
      { tagName: 'h2', nodeUuid: 'preview-title', text: alternate ? 'Alternate' : 'Default' },
      { tagName: 'p', nodeUuid: 'preview-copy', text: 'Change props without replacing the card.' },
    ],
  };

  return (
    <div style={{ display: 'grid', gap: 12, padding: 20 }}>
      <button type="button" onClick={() => setAlternate((value) => !value)}>
        Toggle dynamic props
      </button>
      <DynamicElement config={config} />
    </div>
  );
}

const meta = {
  title: 'Editor/Preview/Dynamic element',
  component: DynamicElementPreview,
} satisfies Meta<typeof DynamicElementPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StableElementUpdates: Story = {};
