import { describe, expect, it } from 'vitest';
import {
  deriveVariantPreset,
  resolveVariantDocument,
  validateCatalog,
  type DocumentFile,
} from '../src/index.js';

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
              breakpoints: { tablet: { declarations: { backgroundColor: 'gainsboro' } } },
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
      breakpoints: { tablet: { declarations: { backgroundColor: 'gainsboro' } } },
      children: { lede: { declarations: { fontWeight: '700' } } },
    });
  });

  it('keeps sibling layout breakpoint values when a variant changes one value', () => {
    const laidOut: DocumentFile = {
      ...specimen,
      id: 'laid-out-variant-specimen',
      root: {
        ...specimen.root,
        layout: {
          direction: 'column',
          padding: '{space.inset.md}',
          breakpoints: {
            tablet: { direction: 'row', gap: '{space.gap.sm}' },
            desktop: { direction: 'row', gap: '{space.gap.lg}' },
          },
        },
      },
      variants: [
        {
          name: 'compact',
          overrides: {
            nodes: {
              root: {
                layout: { breakpoints: { tablet: { direction: 'column' } } },
              },
            },
          },
        },
      ],
    };

    const compact = resolveVariantDocument(laidOut, 'compact');
    expect(compact.root.layout).toEqual({
      direction: 'column',
      padding: '{space.inset.md}',
      breakpoints: {
        tablet: { direction: 'column', gap: '{space.gap.sm}' },
        desktop: { direction: 'row', gap: '{space.gap.lg}' },
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
                  gap: '{space.gap.lg}',
                  breakpoints: { tablet: { direction: 'row' } },
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
              gap: '{space.gap.sm}',
              margin: '{space.stack.sm}',
              width: { mode: 'fixed', size: 100 },
              breakpoints: {
                tablet: {
                  direction: 'column',
                  gap: '{space.gap.md}',
                  width: { mode: 'fixed', size: 120 },
                },
                desktop: { gap: '{space.gap.xl}' },
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
      gap: '{space.gap.lg}',
      margin: '{space.stack.sm}',
      width: { mode: 'fixed', size: 100 },
      breakpoints: {
        tablet: {
          direction: 'row',
          gap: '{space.gap.md}',
          width: { mode: 'fixed', size: 120 },
        },
        desktop: { gap: '{space.gap.xl}' },
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

  it('derives a sparse preset that round-trips the resolved variant', () => {
    const compact = resolveVariantDocument(specimen, 'compact');
    const derived = deriveVariantPreset(specimen, compact, 'compact');
    expect(derived.overrides).toMatchObject({
      fields: { label: 'Compact' },
      nodes: { 'root.lede': { text: 'Short' } },
      removed: ['root.body'],
      insertions: [{ parent: 'root', index: 0, node: { id: 'badge' } }],
    });

    const roundTrip = resolveVariantDocument({ ...specimen, variants: [derived] }, 'compact');
    expect(roundTrip.fields).toEqual(compact.fields);
    expect(roundTrip.root).toEqual(compact.root);
  });

  it('derives sparse style overrides from a resolved named variant', () => {
    const base: DocumentFile = {
      version: 1,
      id: 'style-variant',
      name: 'Style variant',
      kind: 'component',
      variants: [
        { name: 'tone', values: ['quiet', 'loud'] },
        { name: 'size', values: ['compact'] },
        { name: 'default' },
        { name: 'compact' },
      ],
      styles: {
        declarations: { color: 'black', padding: '8px' },
        states: { hover: { color: 'gray' } },
        variants: { tone: { loud: { declarations: { color: 'blue' } } } },
        breakpoints: { tablet: { declarations: { padding: '12px' } } },
        children: { label: { declarations: { fontSize: '16px' } } },
      },
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'label', type: 'text', text: 'Label' }],
      },
    };
    const edited = structuredClone(base);
    edited.styles = {
      declarations: { color: 'navy', padding: '8px' },
      states: { hover: { color: 'white' } },
      variants: {
        tone: { loud: { declarations: { color: 'purple' } } },
        size: { compact: { declarations: { letterSpacing: '0.02em' } } },
      },
      breakpoints: { tablet: { declarations: { padding: '16px' } } },
      children: {
        label: { declarations: { fontSize: '18px' } },
      },
    };

    const derived = deriveVariantPreset(base, edited, 'compact');
    expect(derived.overrides?.styles).toEqual({
      declarations: { color: 'navy' },
      states: { hover: { color: 'white' } },
      variants: {
        tone: { loud: { declarations: { color: 'purple' } } },
        size: { compact: { declarations: { letterSpacing: '0.02em' } } },
      },
      breakpoints: { tablet: { declarations: { padding: '16px' } } },
      children: { label: { declarations: { fontSize: '18px' } } },
    });

    const roundTrip = resolveVariantDocument({ ...base, variants: [derived] }, 'compact');
    expect(roundTrip.styles).toEqual(edited.styles);
  });

  it('derives legacy named style layers into direct overrides', () => {
    const base: DocumentFile = {
      version: 1,
      id: 'legacy-style-variant',
      name: 'Legacy style variant',
      kind: 'component',
      variants: [{ name: 'default' }, { name: 'compact' }],
      styles: {
        declarations: { color: 'black' },
        variants: { variant: { compact: { declarations: { color: 'navy' } } } },
      },
      root: { id: 'root', type: 'text', text: 'Label' },
    };
    const edited = resolveVariantDocument(base, 'compact');
    const derived = deriveVariantPreset(base, edited, 'compact');
    expect(derived.overrides?.styles).toEqual({ declarations: { color: 'navy' } });
    expect(resolveVariantDocument({ ...base, variants: [derived] }, 'compact').styles).toEqual(
      edited.styles,
    );
  });

  it('represents a reordered base child as remove plus insertion', () => {
    const edited = structuredClone(specimen);
    if (edited.root.type !== 'frame' || !edited.root.children) throw new Error('expected frame');
    edited.root.children.reverse();
    const derived = deriveVariantPreset(specimen, edited, 'reordered');
    expect(derived.overrides?.removed).toEqual(['root.lede', 'root.body']);
    expect(derived.overrides?.insertions?.map((item) => item.node)).toMatchObject([
      { id: 'body' },
      { id: 'lede' },
    ]);

    const roundTrip = resolveVariantDocument({ ...specimen, variants: [derived] }, 'reordered');
    expect(roundTrip.root).toEqual(edited.root);
  });

  it('derives explicit unsets for optional node properties and map entries', () => {
    const base: DocumentFile = {
      version: 1,
      id: 'optional-variant',
      name: 'Optional variant',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        displayOn: { path: 'visible', truthy: true },
        style: { color: 'red', padding: '8px' },
        children: [
          {
            id: 'label',
            type: 'text',
            text: 'Label',
            attributes: { title: 'Tooltip', 'data-kind': 'label' },
            style: { color: 'blue' },
          },
        ],
      },
    };
    const edited = structuredClone(base);
    if (edited.root.type !== 'frame') throw new Error('expected frame');
    delete edited.root.displayOn;
    delete edited.root.style?.color;
    const label = edited.root.children?.[0];
    if (!label || label.type !== 'text') throw new Error('expected text child');
    delete label.text;
    delete label.attributes?.title;
    delete label.style?.color;
    if (label.style && Object.keys(label.style).length === 0) delete label.style;

    const derived = deriveVariantPreset(base, edited, 'minimal');
    expect(derived.overrides?.nodes).toMatchObject({
      root: { unset: ['displayOn', 'style.color'] },
      'root.label': { unset: ['attributes.title', 'style', 'text'] },
    });

    const roundTrip = resolveVariantDocument({ ...base, variants: [derived] }, 'minimal');
    expect(roundTrip.root).toEqual(edited.root);
  });

  it('derives and resolves variant-specific instance field bindings', () => {
    const base: DocumentFile = {
      version: 1,
      id: 'binding-variant',
      name: 'Binding variant',
      kind: 'component',
      variants: [{ name: 'default' }],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'control',
            type: 'instance',
            component: 'form-input',
            fieldBindings: { value: 'item.value' },
          },
        ],
      },
    };
    const edited = structuredClone(base);
    const control = edited.root.type === 'frame' ? edited.root.children?.[0] : undefined;
    if (!control || control.type !== 'instance') throw new Error('expected instance');
    control.fieldBindings = { value: 'item.label' };

    const derived = deriveVariantPreset(base, edited, 'label-mode');
    expect(derived.overrides?.nodes).toMatchObject({
      'root.control': { fieldBindings: { value: 'item.label' } },
    });
    const resolved = resolveVariantDocument({ ...base, variants: [derived] }, 'label-mode');
    expect(resolved.root).toMatchObject({
      children: [{ fieldBindings: { value: 'item.label' } }],
    });
  });

  it('merges sparse nested instance fields and derives field-level resets', () => {
    const base: DocumentFile = {
      version: 1,
      id: 'nested-fields-variant',
      name: 'Nested fields variant',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'signIn',
            type: 'instance',
            component: 'sign-in',
            childFields: {
              email: { label: 'Email', value: 'base@example.test' },
              'email/control': { placeholder: 'Base placeholder' },
            },
          },
        ],
      },
    };
    const edited = structuredClone(base);
    const signIn = edited.root.type === 'frame' ? edited.root.children?.[0] : undefined;
    if (!signIn || signIn.type !== 'instance') throw new Error('expected sign-in instance');
    signIn.childFields = {
      email: { placeholder: 'Variant placeholder' },
      'email/control': { placeholder: 'Variant control placeholder' },
    };

    const derived = deriveVariantPreset(base, edited, 'compact');
    expect(derived.overrides?.nodes).toMatchObject({
      'root.signIn': {
        childFields: {
          email: { placeholder: 'Variant placeholder' },
          'email/control': { placeholder: 'Variant control placeholder' },
        },
        unset: ['childFields.email.label', 'childFields.email.value'],
      },
    });

    const resolved = resolveVariantDocument({ ...base, variants: [derived] }, 'compact');
    expect(resolved.root).toEqual(edited.root);
  });

  it('derives and resolves removed optional field defaults without copying the definition', () => {
    const base: DocumentFile = {
      version: 1,
      id: 'optional-field-variant',
      name: 'Optional field variant',
      kind: 'component',
      fields: [
        { name: 'title', type: 'text', default: 'Title' },
        { name: 'description', type: 'text' },
      ],
      root: {
        id: 'root',
        type: 'text',
        bindings: [{ field: 'title', target: 'text' }],
      },
    };
    const edited = structuredClone(base);
    delete edited.fields?.[0]?.default;

    const derived = deriveVariantPreset(base, edited, 'untitled');
    expect(derived.overrides).toEqual({ unsetFields: ['title'] });
    expect(() => validateCatalog([{ ...base, variants: [derived] }])).not.toThrow();

    const resolved = resolveVariantDocument({ ...base, variants: [derived] }, 'untitled');
    expect(resolved.fields?.map(({ name, default: value }) => ({ name, default: value }))).toEqual([
      { name: 'title', default: undefined },
      { name: 'description', default: undefined },
    ]);
    expect(resolved.fields).toHaveLength(2);
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
});
