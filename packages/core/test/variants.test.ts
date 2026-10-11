import { describe, expect, it } from 'vitest';
import { validateCatalog, type DocumentFile, type NestedNode } from '../src/index';
import { resolveVariantDocument } from '../src/legacy/flat/variants/resolve';
import { exampleIds as fixtureIds, tokenRef as fixtureTokenRef } from '@facadeur/examples';
const testUuid29 = globalThis.crypto.randomUUID();

const tabletBreakpointUuid = fixtureIds.catalog.breakpoints.tablet;
const desktopBreakpointUuid = fixtureIds.catalog.breakpoints.desktop;
const spaceInsetMdRef = fixtureTokenRef(fixtureIds.tokens.space.inset.md);
const spaceGapLgRef = fixtureTokenRef(fixtureIds.tokens.space.gap.lg);
const spaceGapMdRef = fixtureTokenRef(fixtureIds.tokens.space.gap.md);
const spaceGapSmRef = fixtureTokenRef(fixtureIds.tokens.space.gap.sm);
const spaceStackSmRef = fixtureTokenRef(fixtureIds.tokens.space.stack.sm);
const spaceGapXlRef = fixtureTokenRef(testUuid29);

const specimen: DocumentFile = {
  version: 1,
  id: 'variant-specimen',
  name: 'Variant specimen',
  kind: 'component',
  fields: [{ name: 'label', type: 'text', default: 'Base' }],
  variants: [
    { name: 'default' },
    {
      name: 'compact',
      overrides: {
        fields: { label: 'Compact' },
        nodes: { lede: { text: 'Short' } },
        removed: ['body'],
        insertions: [
          {
            parent: 'root',
            index: 0,
            node: { id: 'badge', type: 'text', text: 'New' },
          },
        ],
      },
    },
  ],
  root: {
    id: 'root',
    type: 'frame',
    children: [
      { id: 'lede', type: 'text', text: 'Long' },
      { id: 'body', type: 'text', text: 'Body' },
    ],
  },
};

describe('variant overlays', () => {
  it('keep the base tree and resolve removed, changed, and inserted nodes', () => {
    expect(() => validateCatalog([specimen])).not.toThrow();

    const compact = resolveVariantDocument(specimen, 'compact');
    expect(specimen.root).toMatchObject({
      children: [{ id: 'lede' }, { id: 'body' }],
    });
    expect(compact.fields?.[0]?.default).toBe('Compact');
    expect(compact.root).toMatchObject({
      children: [
        { id: 'badge', type: 'text', text: 'New' },
        { id: 'lede', type: 'text', text: 'Short' },
      ],
    });
  });

  it('falls back to the base document for unknown or default variants', () => {
    expect(resolveVariantDocument(specimen, 'missing')).toEqual(specimen);
    expect(resolveVariantDocument(specimen, 'default')).toEqual(specimen);
  });

  it('merges sparse styles declared inside a preset override', () => {
    const styled: DocumentFile = {
      ...specimen,
      id: 'styled-variant-specimen',
      styles: {
        declarations: { color: 'black', backgroundColor: 'white' },
        states: { hover: { color: 'gray' } },
        children: { lede: { declarations: { fontWeight: '400' } } },
      },
      variants: [
        { name: 'default' },
        {
          name: 'compact',
          overrides: {
            styles: {
              declarations: { color: 'navy' },
              states: { hover: { color: 'blue' } },
              breakpoints: {
                [tabletBreakpointUuid]: { declarations: { backgroundColor: 'gainsboro' } },
              },
              children: { lede: { declarations: { fontWeight: '700' } } },
            },
          },
        },
      ],
    };

    expect(() => validateCatalog([styled])).not.toThrow();
    const compact = resolveVariantDocument(styled, 'compact');
    expect(compact.styles).toMatchObject({
      declarations: { color: 'navy', backgroundColor: 'white' },
      states: { hover: { color: 'blue' } },
      breakpoints: {
        [tabletBreakpointUuid]: { declarations: { backgroundColor: 'gainsboro' } },
      },
      children: { lede: { declarations: { fontWeight: '700' } } },
    });
  });

  it('keeps sibling layout breakpoint values when a variant changes one value', () => {
    const laidOut: DocumentFile = {
      ...specimen,
      id: 'laid-out-variant-specimen',
      root: {
        ...(specimen.root as Extract<NestedNode, { type: 'frame' }>),
        layout: {
          direction: 'column',
          padding: spaceInsetMdRef,
          breakpoints: {
            [tabletBreakpointUuid]: { direction: 'row', gap: spaceGapSmRef },
            [desktopBreakpointUuid]: { direction: 'row', gap: spaceGapLgRef },
          },
        },
      },
      variants: [
        {
          name: 'compact',
          overrides: {
            nodes: {
              root: {
                layout: { breakpoints: { [tabletBreakpointUuid]: { direction: 'column' } } },
              },
            },
          },
        },
      ],
    };

    const compact = resolveVariantDocument(laidOut, 'compact');
    expect(compact.root.layout).toEqual({
      direction: 'column',
      padding: spaceInsetMdRef,
      breakpoints: {
        [tabletBreakpointUuid]: { direction: 'column', gap: spaceGapSmRef },
        [desktopBreakpointUuid]: { direction: 'row', gap: spaceGapLgRef },
      },
    });
  });

  it('merges sparse layout overrides on nested instances without dropping base siblings', () => {
    const nestedInstance: DocumentFile = {
      ...specimen,
      id: 'nested-instance-layout',
      variants: [
        { name: 'default' },
        {
          name: 'compact',
          overrides: {
            nodes: {
              'root.control': {
                layout: {
                  gap: spaceGapLgRef,
                  breakpoints: { [tabletBreakpointUuid]: { direction: 'row' } },
                },
              },
            },
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'control',
            type: 'instance',
            component: 'child',
            layout: {
              direction: 'column',
              gap: spaceGapSmRef,
              margin: spaceStackSmRef,
              width: { mode: 'fixed', size: 100 },
              breakpoints: {
                [tabletBreakpointUuid]: {
                  direction: 'column',
                  gap: spaceGapMdRef,
                  width: { mode: 'fixed', size: 120 },
                },
                [desktopBreakpointUuid]: { gap: spaceGapXlRef },
              },
            },
          },
        ],
      },
    };

    const compact = resolveVariantDocument(nestedInstance, 'compact');
    const control = compact.root.type === 'frame' ? compact.root.children?.[0] : undefined;
    expect(control?.type).toBe('instance');
    expect(control?.layout).toMatchObject({
      direction: 'column',
      gap: spaceGapLgRef,
      margin: spaceStackSmRef,
      width: { mode: 'fixed', size: 100 },
      breakpoints: {
        [tabletBreakpointUuid]: {
          direction: 'row',
          gap: spaceGapMdRef,
          width: { mode: 'fixed', size: 120 },
        },
        [desktopBreakpointUuid]: { gap: spaceGapXlRef },
      },
    });
  });

  it('keeps default as the immutable base and rejects default overrides', () => {
    const invalid = {
      ...specimen,
      id: 'invalid-default-variant',
      variants: [{ name: 'default', overrides: { fields: { label: 'Not base' } } }],
    } satisfies DocumentFile;
    expect(() => validateCatalog([invalid])).toThrow(/default variant.*base.*overrides/i);
    expect(resolveVariantDocument(invalid, 'default')).toEqual(invalid);
  });

  it('resolves dotted node paths while keeping id targets backwards compatible', () => {
    const nested: DocumentFile = {
      ...specimen,
      id: 'nested-variant-specimen',
      variants: [
        { name: 'default' },
        {
          name: 'path-based',
          overrides: {
            nodes: { 'root.header.lede': { text: 'Path override' } },
            removed: ['root.header.body'],
            insertions: [
              {
                parent: 'root.header',
                index: 0,
                node: { id: 'badge', type: 'text', text: 'New' },
              },
            ],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'header',
            type: 'frame',
            children: [
              { id: 'lede', type: 'text', text: 'Long' },
              { id: 'body', type: 'text', text: 'Body' },
            ],
          },
        ],
      },
    };

    expect(() => validateCatalog([nested])).not.toThrow();
    const resolved = resolveVariantDocument(nested, 'path-based');
    expect(resolved.root).toMatchObject({
      children: [
        {
          id: 'header',
          children: [
            { id: 'badge', text: 'New' },
            { id: 'lede', text: 'Path override' },
          ],
        },
      ],
    });
  });

  it('rejects unknown and conflicting optional field unsets', () => {
    const unknown = {
      ...specimen,
      id: 'unknown-field-unset',
      variants: [{ name: 'broken', overrides: { unsetFields: ['missing'] } }],
    } satisfies DocumentFile;
    expect(() => validateCatalog([unknown])).toThrow(/unsets unknown field/);

    const conflict = {
      ...specimen,
      id: 'conflicting-field-unset',
      variants: [
        {
          name: 'broken',
          overrides: { fields: { label: 'Changed' }, unsetFields: ['label'] },
        },
      ],
    } satisfies DocumentFile;
    expect(() => validateCatalog([conflict])).toThrow(/set and unset field/);
  });

  it('rejects unknown targets and root removal during catalog validation', () => {
    const invalid = {
      ...specimen,
      id: 'invalid-variant-targets',
      variants: [
        {
          name: 'broken',
          overrides: {
            nodes: { 'root.missing': { text: 'Nope' } },
          },
        },
      ],
    } satisfies DocumentFile;
    expect(() => validateCatalog([invalid])).toThrow(/targets unknown node/);

    const removesRoot = {
      ...specimen,
      id: 'invalid-root-removal',
      variants: [{ name: 'broken', overrides: { removed: ['root'] } }],
    } satisfies DocumentFile;
    expect(() => validateCatalog([removesRoot])).toThrow(/cannot remove the root/);
  });

  it('rejects insertions whose parent is removed by the same variant', () => {
    const invalid = {
      ...specimen,
      id: 'invalid-insertion-parent',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'group',
            type: 'frame',
            children: [{ id: 'body', type: 'text', text: 'Body' }],
          },
        ],
      },
      variants: [
        {
          name: 'broken',
          overrides: {
            removed: ['root.group'],
            insertions: [{ parent: 'root.group', node: { id: 'badge', type: 'text' } }],
          },
        },
      ],
    } satisfies DocumentFile;
    expect(() => validateCatalog([invalid])).toThrow(/cannot insert under removed node/);
  });

  it('rejects conflicting variant set and unset paths', () => {
    const invalid = {
      ...specimen,
      id: 'conflicting-unset',
      variants: [
        {
          name: 'broken',
          overrides: { nodes: { lede: { text: 'Changed', unset: ['text'] } } },
        },
      ],
    } satisfies DocumentFile;
    expect(() => validateCatalog([invalid])).toThrow(/set and unset/);
  });

  it('rejects malformed variant insertion nodes at the document boundary', () => {
    const invalid = {
      ...specimen,
      id: 'invalid-insertion-shape',
      variants: [
        {
          name: 'broken',
          overrides: {
            insertions: [{ parent: 'root', node: { id: 'bad', type: 'unknown' } }],
          },
        },
      ],
    };
    expect(() => validateCatalog([invalid])).toThrow(/schema/i);
  });

  it('validates inserted nodes against the resolved variant tree and catalog', () => {
    const invalid = {
      ...specimen,
      id: 'invalid-inserted-component',
      variants: [
        {
          name: 'broken',
          overrides: {
            insertions: [
              {
                parent: 'root',
                node: { id: 'missing-instance', type: 'instance', component: 'missing-component' },
              },
            ],
          },
        },
      ],
    } satisfies DocumentFile;
    expect(() => validateCatalog([invalid])).toThrow(/Unknown component "missing-component"/);
  });

  it('validates nested style paths against local instance roots in the catalog', () => {
    const button: DocumentFile = {
      version: 1,
      id: 'style-button',
      name: 'Button',
      kind: 'atom',
      root: { id: 'button-root', type: 'frame' },
    };
    const template: DocumentFile = {
      version: 1,
      id: 'style-template',
      name: 'Template',
      kind: 'component',
      root: {
        id: 'template-root',
        type: 'frame',
        children: [{ id: 'continue', type: 'instance', component: button.id }],
      },
    };
    const owner: DocumentFile = {
      version: 1,
      id: 'style-owner',
      name: 'Owner',
      kind: 'section',
      styles: { children: { 'group/sign-in/continue': { declarations: { color: 'red' } } } },
      root: {
        id: 'owner-root',
        type: 'frame',
        children: [
          {
            id: 'group',
            type: 'frame',
            children: [{ id: 'sign-in', type: 'instance', component: template.id }],
          },
        ],
      },
    };
    expect(() => validateCatalog([button, template, owner])).not.toThrow();
    expect(() =>
      validateCatalog([
        button,
        template,
        {
          ...owner,
          styles: { children: { 'group/sign-in/missing': { declarations: { color: 'red' } } } },
        },
      ]),
    ).toThrow(/does not target a local instance root/);
    expect(() =>
      validateCatalog([
        button,
        template,
        {
          ...owner,
          styles: {
            children: { 'group/sign-in/template-root': { declarations: { color: 'red' } } },
          },
        },
      ]),
    ).toThrow(/does not target a local instance root/);
  });
});
