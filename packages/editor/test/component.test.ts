import { describe, expect, it } from 'vitest';
import { fieldDefinitionFromDraft, variantAxisFromDraft } from '../src/definitions.js';
import { readStyleDeclarations, writeStyleDeclaration } from '../src/style-edit.js';

describe('component definitions', () => {
  it('builds a field and a variant axis from editor drafts', () => {
    expect(
      fieldDefinitionFromDraft({
        name: 'label',
        type: 'text',
        rawDefault: 'Go',
        optionsText: '',
        booleanDefault: false,
      }),
    ).toEqual({ name: 'label', type: 'text', default: 'Go' });
    expect(
      fieldDefinitionFromDraft({
        name: 'tone',
        type: 'enum',
        rawDefault: 'md',
        optionsText: 'sm, md',
        booleanDefault: false,
      }),
    ).toEqual({ name: 'tone', type: 'enum', options: ['sm', 'md'], default: 'md' });
    expect(variantAxisFromDraft({ name: 'size', valuesText: 'sm, md', fallback: 'md' })).toEqual({
      name: 'size',
      values: ['sm', 'md'],
      default: 'md',
    });
    expect(() =>
      fieldDefinitionFromDraft({
        name: '1bad',
        type: 'text',
        rawDefault: '',
        optionsText: '',
        booleanDefault: false,
      }),
    ).toThrow(/letter/);
  });

  it('writes variant and state declarations without dropping the rest of the block', () => {
    const next = writeStyleDeclaration(
      {
        declarations: { color: 'red' },
        breakpoints: { tablet: { declarations: { color: 'blue' } } },
      },
      'root',
      { nodeId: 'root', axis: 'tone', value: 'ghost', state: 'hover' },
      'background',
      '{color.bg.muted}',
    );
    expect(next?.declarations).toEqual({ color: 'red' });
    expect(next?.breakpoints?.tablet?.declarations).toEqual({ color: 'blue' });
    expect(
      readStyleDeclarations(next ?? undefined, 'root', {
        nodeId: 'root',
        axis: 'tone',
        value: 'ghost',
        state: 'hover',
      }),
    ).toEqual({ background: '{color.bg.muted}' });
    const cleared = writeStyleDeclaration(
      next ?? undefined,
      'root',
      { nodeId: 'root', axis: 'tone', value: 'ghost', state: 'hover' },
      'background',
      null,
    );
    expect(cleared?.variants).toBeUndefined();
    expect(cleared?.declarations).toEqual({ color: 'red' });

    const child = writeStyleDeclaration(undefined, 'root', { nodeId: 'control' }, 'resize', 'none');
    expect(child?.children?.control?.declarations).toEqual({ resize: 'none' });
  });
});
