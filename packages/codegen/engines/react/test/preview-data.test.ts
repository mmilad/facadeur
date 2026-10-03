import { describe, expect, it } from 'vitest';
import { type DocumentFile } from '@facadeur/core';
import { generateReact } from '../src/index';

describe('preview values stay outside runtime code', () => {
  it('keeps required props required and excludes base and variant samples', () => {
    const document: DocumentFile = {
      version: 1,
      id: 'sample',
      name: 'Sample',
      kind: 'atom',
      fields: [{ name: 'value', type: 'text', required: true }],
      variants: [{ name: 'compact' }],
      previewData: {
        fields: { value: 'PREVIEW_BASE' },
        variants: { compact: { value: 'PREVIEW_COMPACT' } },
      },
      root: { id: 'root', type: 'text', bindings: [{ field: 'value', target: 'text' }] },
    };
    const output = generateReact({ documents: [document] });
    const code =
      output.ui.find((file) => file.path === 'components/Sample/component.tsx')?.contents ?? '';
    const types =
      output.ui.find((file) => file.path === 'components/Sample/types.ts')?.contents ?? '';
    expect(types).toContain('value: string;');
    for (const generated of [code, types]) {
      expect(generated).not.toContain('PREVIEW_BASE');
      expect(generated).not.toContain('PREVIEW_COMPACT');
    }
    expect(output.stories[0]?.contents).toContain('PREVIEW_BASE');
    expect(output.stories[0]?.contents).toContain('PREVIEW_COMPACT');
    expect(output.stories[0]?.contents).toContain('export const Compact: Story');
  });
});
