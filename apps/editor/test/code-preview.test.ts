import { describe, expect, it } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { codePreview } from '../src/domain/assets/code-preview';

describe('code preview adapter', () => {
  it('shows the shared contract while excluding preview-only samples', () => {
    const document: DocumentFile = {
      version: 1,
      id: 'preview-card',
      name: 'Preview card',
      kind: 'component',
      fields: [{ name: 'label', type: 'text', required: true }],
      events: [{ name: 'commit', payload: { value: 'text' } }],
      variants: [{ name: 'default' }, { name: 'compact' }],
      previewData: {
        fields: { label: 'Base sample' },
        variants: { compact: { label: 'Compact sample' } },
      },
      root: {
        id: 'root',
        type: 'text',
        bindings: [{ field: 'label', target: 'text' }],
        eventBindings: [{ event: 'commit', name: 'change' }],
      },
    };

    const result = codePreview({ documents: [document], documentId: document.id });

    expect(result.error).toBeUndefined();
    expect(result.source).toContain('label: string;');
    expect(result.source).toContain('onCommit?: (payload: { value: string }) => void;');
    expect(result.source).toContain('onCommit?: (payload: TPayload) => void;');
    expect(result.source).toContain('context?: DataContext;');
    expect(result.source).toContain('variant?: PreviewCardVariant;');
    expect(result.source).not.toContain('Base sample');
    expect(result.source).not.toContain('Compact sample');
  });

  it('returns a useful error when the selected document has no generated component', () => {
    const result = codePreview({
      documents: [
        {
          version: 1,
          id: 'other',
          name: 'Other',
          kind: 'atom',
          root: { id: 'root', type: 'text' },
        },
      ],
      documentId: 'missing',
    });

    expect(result).toEqual({ error: 'No generated component was found for "missing".' });
  });
});
