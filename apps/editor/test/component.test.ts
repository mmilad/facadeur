import { describe, expect, it } from 'vitest';
import { fieldDefinitionFromDraft, variantAxisFromDraft } from '../src/definitions.js';
import {
  readStyleDeclarations,
  shownDeclarations,
  writeStyleDeclaration,
} from '../src/style-edit.js';

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

  it('writes one breakpoint override and leaves base and other breakpoints alone', () => {
    const source = {
      declarations: { color: 'red', paddingInline: '{space.3}' },
      breakpoints: {
        tablet: { declarations: { paddingInline: '{space.5}' } },
        desktop: { declarations: { color: 'black' } },
      },
    };
    const next = writeStyleDeclaration(
      source,
      'root',
      { nodeId: 'root', breakpointId: 'tablet' },
      'color',
      'blue',
    );
    expect(next?.declarations).toEqual(source.declarations);
    expect(next?.breakpoints?.tablet?.declarations).toEqual({
      paddingInline: '{space.5}',
      color: 'blue',
    });
    expect(next?.breakpoints?.desktop?.declarations).toEqual({ color: 'black' });
    expect(
      shownDeclarations(
        next?.declarations ?? {},
        next?.breakpoints?.tablet?.declarations ?? {},
        false,
      ),
    ).toEqual([
      { property: 'color', value: 'red', overridden: true },
      { property: 'paddingInline', value: '{space.3}', overridden: true },
    ]);
    expect(
      shownDeclarations(
        next?.declarations ?? {},
        next?.breakpoints?.tablet?.declarations ?? {},
        true,
      ).find((item) => item.property === 'color'),
    ).toEqual({ property: 'color', value: 'blue', overridden: true });

    const cleared = writeStyleDeclaration(
      next ?? undefined,
      'root',
      { nodeId: 'root', breakpointId: 'tablet' },
      'paddingInline',
      null,
    );
    expect(cleared?.declarations?.paddingInline).toBe('{space.3}');
    expect(cleared?.breakpoints?.tablet?.declarations).toEqual({ color: 'blue' });

    const gone = writeStyleDeclaration(
      cleared ?? undefined,
      'root',
      { nodeId: 'root', breakpointId: 'tablet' },
      'color',
      null,
    );
    expect(gone?.breakpoints?.tablet).toBeUndefined();
    expect(gone?.breakpoints?.desktop?.declarations).toEqual({ color: 'black' });
    expect(gone?.declarations).toEqual(source.declarations);
  });

  it('keeps a variant edit off the breakpoint layer and writes child overrides beside the base', () => {
    const variant = writeStyleDeclaration(
      { breakpoints: { tablet: { declarations: { color: 'blue' } } } },
      'root',
      { nodeId: 'root', axis: 'tone', value: 'ghost', breakpointId: 'tablet' },
      'color',
      'white',
    );
    expect(variant?.breakpoints?.tablet?.declarations).toEqual({ color: 'blue' });
    expect(variant?.variants?.tone?.ghost?.declarations).toEqual({ color: 'white' });

    const child = writeStyleDeclaration(
      { declarations: { color: 'red' } },
      'root',
      { nodeId: 'label', breakpointId: 'desktop' },
      'fontSize',
      '18px',
    );
    expect(child?.declarations).toEqual({ color: 'red' });
    expect(child?.children?.label?.declarations).toBeUndefined();
    expect(child?.children?.label?.breakpoints?.desktop?.declarations).toEqual({
      fontSize: '18px',
    });

    const hover = writeStyleDeclaration(
      { states: { hover: { color: 'red' } } },
      'root',
      { nodeId: 'root', state: 'hover', breakpointId: 'tablet' },
      'color',
      'blue',
    );
    expect(hover?.states?.hover).toEqual({ color: 'red' });
    expect(hover?.breakpoints?.tablet?.states?.hover).toEqual({ color: 'blue' });
    expect(hover?.breakpoints?.tablet?.declarations).toBeUndefined();
  });
});
