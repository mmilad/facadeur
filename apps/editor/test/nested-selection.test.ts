import { describe, expect, it } from 'vitest';
import { structuralScopeFields, toFlat, type DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createEditorSession } from '../src/domain/session';
import {
  dataFieldsForNode,
  fieldPathOptions,
} from '../src/ui/controls/data/DataDirectivesEditorControl.js';
import {
  fieldContextForSelection,
  resolveNestedSelection,
  virtualLayerTree,
} from '../src/domain/nested-selection';

const input: DocumentFile = {
  version: 1,
  id: 'input',
  name: 'Input',
  kind: 'component',
  fields: [{ name: 'label', type: 'text', default: 'Default label' }],
  root: {
    id: 'root',
    type: 'frame',
    children: [{ id: 'label', type: 'text', bindings: [{ field: 'label', target: 'text' }] }],
  },
};
const form: DocumentFile = {
  version: 1,
  id: 'form',
  name: 'Form',
  kind: 'component',
  fields: [{ name: 'label', type: 'text', default: 'Form label' }],
  root: {
    id: 'root',
    type: 'frame',
    children: [
      {
        id: 'email',
        type: 'instance',
        component: 'input',
        fields: { label: 'Work' },
        fieldBindings: { label: 'label' },
      },
    ],
  },
};
const section: DocumentFile = {
  version: 1,
  id: 'section',
  name: 'Section',
  kind: 'section',
  root: {
    id: 'root',
    type: 'frame',
    children: [{ id: 'first', type: 'instance', component: 'form' }],
  },
};

const catalog = new Map([
  ['section', toFlat(section)],
  ['form', toFlat(form)],
  ['input', toFlat(input)],
]);

describe('nested selection', () => {
  it('keeps local ids separate from the composed render address', () => {
    const selected = resolveNestedSelection(
      catalog.get('section')!,
      'root/first/email',
      catalog,
      true,
    );
    expect(selected).toMatchObject({
      ownerNodeId: 'first',
      instancePath: 'email',
      renderId: 'root/first/email',
      node: { id: 'email', type: 'instance' },
      document: { id: 'form' },
      containingInstance: { id: 'email', component: 'input' },
    });
  });

  it('routes a bound leaf to its nearest nested instance contract', () => {
    const selected = resolveNestedSelection(
      catalog.get('section')!,
      'root/first/email/label',
      catalog,
      true,
    );
    expect(selected?.node).toMatchObject({ id: 'label', type: 'text' });
    const context = fieldContextForSelection({
      document: catalog.get('section')!,
      selectedNode: null,
      nestedSelection: selected,
      catalog,
      childFields: () => ({ label: 'Local label' }),
    });
    expect(context).toMatchObject({
      instancePath: 'email',
      instance: { id: 'email' },
      target: { id: 'input' },
      fields: [{ name: 'label' }],
      values: { label: 'Work' },
    });
  });

  it('resolves nested field bindings against the enclosing contract scope', () => {
    const selected = resolveNestedSelection(
      catalog.get('section')!,
      'root/first/email/label',
      catalog,
      true,
    );
    const context = fieldContextForSelection({
      document: catalog.get('section')!,
      selectedNode: null,
      nestedSelection: selected,
      catalog,
    });
    expect(context?.values).toMatchObject({ label: 'Work' });
    expect(context?.inheritedValues).toMatchObject({ label: 'Work' });
  });

  it('offers nested parent item payload fields inside a drilled structural component', () => {
    const outer: DocumentFile = {
      version: 1,
      id: 'outer-list',
      name: 'Outer list',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'outer-repeat',
            type: 'repeater',
            children: [
              {
                id: 'outer-switch',
                type: 'switch',
                children: [{ id: 'outer-card', type: 'instance', component: 'input' }],
              },
            ],
          },
        ],
      },
    };
    const inner: DocumentFile = {
      version: 1,
      id: 'inner-list',
      name: 'Inner list',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'inner-repeat',
            type: 'repeater',
            children: [{ id: 'inner-card', type: 'instance', component: 'input' }],
          },
        ],
      },
    };
    const flatDocuments = [outer, inner, input].map(toFlat);
    const documents = new Map(flatDocuments.map((document) => [document.id, document]));
    const context = { documents };
    const outerFields = structuralScopeFields(documents.get('outer-list')!, 'outer-card', context);
    const inherited = outerFields.filter((field) =>
      ['item', 'index', 'props', 'parent'].includes(field.name),
    );
    const fields = dataFieldsForNode(
      documents.get('inner-list')!,
      'inner-card',
      undefined,
      false,
      context,
      inherited,
    );

    expect(fieldPathOptions(fields).map((option) => option.value)).toContain(
      'parent.item.props.label',
    );
  });

  it('gives every virtual row a unique address and guards cycles', () => {
    const tree = virtualLayerTree(catalog.get('section')!, { catalog, paintRoot: true });
    expect(tree?.children.map((item) => item.address)).toEqual(['root/first']);
    expect(tree?.children[0]?.children.map((item) => item.address)).toEqual(['root/first/email']);
    expect(tree?.children[0]?.children[0]?.virtual).toBe(true);
  });

  it('projects the selected instance variant into the virtual tree', () => {
    const variantInput: DocumentFile = {
      ...input,
      id: 'variant-input',
      variants: [
        { name: 'default' },
        {
          name: 'compact',
          overrides: {
            insertions: [
              { parent: 'root', index: 0, node: { id: 'compact', type: 'text', text: 'Compact' } },
            ],
          },
        },
      ],
    };
    const variantHost: DocumentFile = {
      ...section,
      id: 'variant-host',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'control',
            type: 'instance',
            component: 'variant-input',
            variants: { variant: 'compact' },
          },
        ],
      },
    };
    const variantCatalog = new Map([
      ['variant-host', toFlat(variantHost)],
      ['variant-input', toFlat(variantInput)],
    ]);
    const selected = resolveNestedSelection(
      variantCatalog.get('variant-host')!,
      'root/control/compact',
      variantCatalog,
      true,
    );
    expect(selected?.node).toMatchObject({ id: 'compact', type: 'text' });
    const tree = virtualLayerTree(variantCatalog.get('variant-host')!, {
      catalog: variantCatalog,
      paintRoot: true,
    });
    expect(tree?.children[0]?.children.map((item) => item.id)).toContain('compact');
  });

  it('writes child fields to the owner instance and blocks structural edits', () => {
    if (form.root.type !== 'frame') throw new Error('fixture root must be a frame');
    const editableForm: DocumentFile = {
      ...form,
      root: {
        ...form.root,
        children: [
          { id: 'email', type: 'instance', component: 'input', fields: { label: 'Work' } },
        ],
      },
    };
    const session = createEditorSession({
      documents: [section, editableForm, input],
      design: createProjectTemplateDocument(),
    });
    session.openAsset('section');
    session.selectRendered('root/first/email');
    expect(session.getSnapshot().nestedSelection).toMatchObject({
      ownerNodeId: 'first',
      instancePath: 'email',
    });
    session.setNestedField('label', 'Personal');
    expect(session.getSnapshot().document.nodes.first).toMatchObject({
      childFields: { email: { label: 'Personal' } },
    });
    session.execute({ type: 'setProp', nodeId: 'first', prop: 'layout', value: { width: 40 } });
    expect(session.getSnapshot().document.nodes.first).not.toMatchObject({
      layout: { width: 40 },
    });
    expect(session.getSnapshot().notice?.text).toMatch(/field overrides/i);
    session.selectRendered('root/first');
    expect(session.getSnapshot().nestedSelection).toBeNull();
  });
});
