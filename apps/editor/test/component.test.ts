import { describe, expect, it } from 'vitest';
import {
  fieldDefinitionFromDraft,
  replaceFieldDefault,
  replaceFieldItems,
  retargetField,
  variantAxisFromDraft,
} from '../src/domain/definitions';
import {
  readStyleDeclarations,
  shownDeclarations,
  variantStyleBlock,
  writeStyleDeclaration,
} from '../src/domain/edits/style-edit';
import { exampleIds as fixtureIds, tokenRef as fixtureTokenRef } from '@facadeur/examples';

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

  it('preserves required fields while changing their type or default', () => {
    const field = fieldDefinitionFromDraft({
      name: 'email',
      type: 'text',
      rawDefault: '',
      optionsText: '',
      booleanDefault: false,
      required: true,
    });
    expect(field).toEqual({ name: 'email', type: 'text', required: true });
    expect(retargetField(field, 'number')).toEqual({
      name: 'email',
      type: 'number',
      required: true,
    });
    expect(replaceFieldDefault(field, 'hello')).toEqual({
      name: 'email',
      type: 'text',
      required: true,
      default: 'hello',
    });
  });

  it('creates and clones nested collection schemas without sharing item arrays', () => {
    const field = fieldDefinitionFromDraft({
      name: 'fields',
      type: 'array',
      rawDefault: '',
      optionsText: '',
      booleanDefault: false,
    });
    expect(field).toEqual({ name: 'fields', type: 'array', items: { type: 'text' } });

    const source = replaceFieldItems(field, {
      type: 'object',
      fields: [{ name: 'kind', type: 'text', required: true }],
    });
    const next = replaceFieldItems(source, {
      type: 'object',
      fields: [{ name: 'kind', type: 'text', required: true }],
    });
    expect(next).toEqual({
      name: 'fields',
      type: 'array',
      items: {
        type: 'object',
        fields: [{ name: 'kind', type: 'text', required: true }],
      },
    });
    expect(next.items?.fields).not.toBe(source.items?.fields);
  });

  it('writes variant and state declarations without dropping the rest of the block', () => {
    const next = writeStyleDeclaration(
      {
        declarations: { color: 'red' },
        breakpoints: {
          [fixtureIds.catalog.breakpoints.tablet]: { declarations: { color: 'blue' } },
        },
      },
      'root',
      { nodeId: 'root', axis: 'tone', value: 'ghost', state: 'hover' },
      'background',
      fixtureTokenRef(fixtureIds.tokens.color.bg.muted),
    );
    expect(next?.declarations).toEqual({ color: 'red' });
    expect(next?.breakpoints?.[fixtureIds.catalog.breakpoints.tablet]?.declarations).toEqual({
      color: 'blue',
    });
    expect(
      readStyleDeclarations(next ?? undefined, 'root', {
        nodeId: 'root',
        axis: 'tone',
        value: 'ghost',
        state: 'hover',
      }),
    ).toEqual({ background: fixtureTokenRef(fixtureIds.tokens.color.bg.muted) });
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

  it('reads direct variant styles and legacy layers through one editor adapter', () => {
    const direct = variantStyleBlock(
      {
        variantPresets: [
          { name: 'compact', overrides: { styles: { declarations: { color: 'navy' } } } },
        ],
        styles: { declarations: { color: 'black' } },
      },
      'compact',
    );
    expect(direct).toEqual({ declarations: { color: 'navy' } });

    const legacy = variantStyleBlock(
      {
        variantPresets: [{ name: 'compact' }],
        styles: {
          declarations: { color: 'black' },
          variants: { variant: { compact: { declarations: { color: 'navy' } } } },
          children: {
            label: {
              variants: { variant: { compact: { states: { hover: { color: 'white' } } } } },
            },
          },
        },
      },
      'compact',
    );
    expect(legacy).toEqual({
      declarations: { color: 'navy' },
      children: { label: { states: { hover: { color: 'white' } } } },
    });
  });

  it('writes one breakpoint override and leaves base and other breakpoints alone', () => {
    const source = {
      declarations: {
        color: 'red',
        paddingInline: fixtureTokenRef(fixtureIds.tokens.space.scale.step3),
      },
      breakpoints: {
        [fixtureIds.catalog.breakpoints.tablet]: {
          declarations: { paddingInline: fixtureTokenRef(fixtureIds.tokens.space.scale.step5) },
        },
        [fixtureIds.catalog.breakpoints.desktop]: { declarations: { color: 'black' } },
      },
    };
    const next = writeStyleDeclaration(
      source,
      'root',
      { nodeId: 'root', breakpointId: fixtureIds.catalog.breakpoints.tablet },
      'color',
      'blue',
    );
    expect(next?.declarations).toEqual(source.declarations);
    expect(next?.breakpoints?.[fixtureIds.catalog.breakpoints.tablet]?.declarations).toEqual({
      paddingInline: fixtureTokenRef(fixtureIds.tokens.space.scale.step5),
      color: 'blue',
    });
    expect(next?.breakpoints?.[fixtureIds.catalog.breakpoints.desktop]?.declarations).toEqual({
      color: 'black',
    });
    expect(
      shownDeclarations(
        next?.declarations ?? {},
        next?.breakpoints?.[fixtureIds.catalog.breakpoints.tablet]?.declarations ?? {},
        false,
      ),
    ).toEqual([
      { property: 'color', value: 'red', overridden: true },
      {
        property: 'paddingInline',
        value: fixtureTokenRef(fixtureIds.tokens.space.scale.step3),
        overridden: true,
      },
    ]);
    expect(
      shownDeclarations(
        next?.declarations ?? {},
        next?.breakpoints?.[fixtureIds.catalog.breakpoints.tablet]?.declarations ?? {},
        true,
      ).find((item) => item.property === 'color'),
    ).toEqual({ property: 'color', value: 'blue', overridden: true });

    const cleared = writeStyleDeclaration(
      next ?? undefined,
      'root',
      { nodeId: 'root', breakpointId: fixtureIds.catalog.breakpoints.tablet },
      'paddingInline',
      null,
    );
    expect(cleared?.declarations?.paddingInline).toBe(
      fixtureTokenRef(fixtureIds.tokens.space.scale.step3),
    );
    expect(cleared?.breakpoints?.[fixtureIds.catalog.breakpoints.tablet]?.declarations).toEqual({
      color: 'blue',
    });

    const gone = writeStyleDeclaration(
      cleared ?? undefined,
      'root',
      { nodeId: 'root', breakpointId: fixtureIds.catalog.breakpoints.tablet },
      'color',
      null,
    );
    expect(gone?.breakpoints?.[fixtureIds.catalog.breakpoints.tablet]).toBeUndefined();
    expect(gone?.breakpoints?.[fixtureIds.catalog.breakpoints.desktop]?.declarations).toEqual({
      color: 'black',
    });
    expect(gone?.declarations).toEqual(source.declarations);
  });

  it('keeps a variant edit off the breakpoint layer and writes child overrides beside the base', () => {
    const variant = writeStyleDeclaration(
      {
        breakpoints: {
          [fixtureIds.catalog.breakpoints.tablet]: { declarations: { color: 'blue' } },
        },
      },
      'root',
      {
        nodeId: 'root',
        axis: 'tone',
        value: 'ghost',
        breakpointId: fixtureIds.catalog.breakpoints.tablet,
      },
      'color',
      'white',
    );
    expect(variant?.breakpoints?.[fixtureIds.catalog.breakpoints.tablet]?.declarations).toEqual({
      color: 'blue',
    });
    expect(variant?.variants?.tone?.ghost?.declarations).toEqual({ color: 'white' });

    const child = writeStyleDeclaration(
      { declarations: { color: 'red' } },
      'root',
      { nodeId: 'label', breakpointId: fixtureIds.catalog.breakpoints.desktop },
      'fontSize',
      '18px',
    );
    expect(child?.declarations).toEqual({ color: 'red' });
    expect(child?.children?.label?.declarations).toBeUndefined();
    expect(
      child?.children?.label?.breakpoints?.[fixtureIds.catalog.breakpoints.desktop]?.declarations,
    ).toEqual({
      'font-size': '18px',
    });

    const hover = writeStyleDeclaration(
      { states: { hover: { color: 'red' } } },
      'root',
      { nodeId: 'root', state: 'hover', breakpointId: fixtureIds.catalog.breakpoints.tablet },
      'color',
      'blue',
    );
    expect(hover?.states?.hover).toEqual({ color: 'red' });
    expect(hover?.breakpoints?.[fixtureIds.catalog.breakpoints.tablet]?.states?.hover).toEqual({
      color: 'blue',
    });
    expect(
      hover?.breakpoints?.[fixtureIds.catalog.breakpoints.tablet]?.declarations,
    ).toBeUndefined();
  });
});
