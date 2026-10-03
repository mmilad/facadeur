import { describe, expect, it } from 'vitest';
import { toFlat, toNested, type DocumentFile } from '@facadeur/core';
import { generateReact } from '../src/index';

describe('token label metadata', () => {
  it('keeps generated React and CSS identical when only saved labels change', () => {
    const document: DocumentFile = {
      version: 1,
      id: 'badge',
      name: 'Badge',
      kind: 'atom',
      root: { id: 'root', type: 'frame', tag: 'span' },
      componentTokens: {
        n_surface: {
          path: 'color.surface',
          type: 'color',
          value: '{color.brand.primary}',
          label: 'Surface',
        },
      },
      tokenInterface: { reads: ['color.brand.primary'] },
      styles: { declarations: { background: '{color.surface}' } },
    };
    const design = {
      tokens: {
        color: {
          brand: {
            primary: {
              $type: 'color',
              $value: '#123456',
              $extensions: { facadeur: { label: 'Brand' } },
            },
          },
        },
      },
    };
    const before = generateReact({ documents: [document], design });
    const renamed = structuredClone(document);
    renamed.componentTokens!.n_surface!.label = 'Badge background';
    const renamedDesign = structuredClone(design);
    renamedDesign.tokens.color.brand.primary.$extensions.facadeur.label = 'Accent';

    expect(generateReact({ documents: [renamed], design: renamedDesign })).toEqual(before);
    expect(toNested(toFlat(renamed)).styles).toEqual(document.styles);
    expect(
      before.ui.find((file) => file.path === 'components/Badge/style.module.css')?.contents,
    ).toContain('var(--badge-color-surface, var(--color-brand-primary))');
  });
});
