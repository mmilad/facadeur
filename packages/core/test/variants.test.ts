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
