import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  ProjectController,
  toFlat,
  type CommandContext,
  type DocumentFile,
  type SchemaCatalog,
} from '../src/index';
const testUuid20 = globalThis.crypto.randomUUID();
const testUuid21 = globalThis.crypto.randomUUID();

const schemaCatalog: SchemaCatalog = {
  schemas: [
    {
      id: 'input',
      name: 'Input',
      schema: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          placeholder: { type: 'string' },
          disabled: { type: 'boolean' },
        },
      },
    },
  ],
};

const input: DocumentFile = {
  version: 1,
  id: 'form-input',
  name: 'Form Input',
  kind: 'atom',
  schemaUse: { direct: { kind: 'schema', schemaId: 'input' } },
  root: { id: 'root', type: 'text' },
};

const formInput: DocumentFile = {
  version: 1,
  id: 'input',
  name: 'Input',
  kind: 'component',
  schemaUse: {
    fields: [{ name: 'label', type: { kind: 'type', type: 'string' } }],
  },
  root: {
    id: 'root',
    type: 'frame',
    children: [{ id: 'control', type: 'instance', component: input.id }],
  },
};

const design: DocumentFile = {
  version: 1,
  id: 'design',
  name: 'Design',
  kind: 'page',
  schemaCatalog,
  root: { id: 'root', type: 'frame', children: [] },
};

describe('ProjectController', () => {
  it('supplies the current shared context to an injected executor and resolves child fields', () => {
    const contexts: CommandContext[] = [];
    const project = new ProjectController({
      designDocumentId: design.id,
      documents: [design, input, formInput].map(toFlat),
      executeCommand(document, command, context) {
        contexts.push(context);
        return applyCommand(document, command, context);
      },
    });
    const tokenUuid = testUuid20;
    project.updateTokens({
      type: 'setToken',
      family: 'color',
      token: {
        uuid: tokenUuid,
        label: 'Primary',
        group: '',
        valueType: 'color',
        value: '#123456',
      },
    });
    project.updateDocument(formInput.id, { type: 'setPreviewData', previewData: null });
    const context = contexts.at(-1)!;
    expect(context.globalTokenUuids).toEqual(new Set([tokenUuid]));
    expect(context.schemaResolverContext?.schemaCatalog).toEqual(schemaCatalog);
    const node = { id: 'nested', type: 'instance' as const, component: formInput.id };
    if (node.type !== 'instance') throw new Error('Expected instance fixture');
    expect(context.resolveChildField?.(node, 'control', 'value')).toMatchObject({
      name: 'value',
      type: 'text',
    });
  });

  it('keeps live document views consistent across style and variant commands and failed batches', () => {
    const project = new ProjectController({
      designDocumentId: design.id,
      documents: [design, input, formInput].map(toFlat),
    });
    const document = project.document(input.id);
    project.updateDocument(input.id, {
      type: 'batch',
      commands: [
        { type: 'setStyleBlock', style: { declarations: { color: 'red' } } },
        { type: 'createVariantPreset', name: 'compact', label: 'Compact' },
        {
          type: 'setVariantStyleBlock',
          name: 'compact',
          style: { declarations: { color: 'blue' } },
        },
      ],
    });
    expect(document.styles).toEqual({ declarations: { color: 'red' } });
    expect(document.manifest.variantPresets).toEqual([
      { name: 'compact', overrides: { styles: { declarations: { color: 'blue' } } } },
    ]);
    const before = document.manifest;
    expect(() =>
      project.updateDocument(input.id, {
        type: 'batch',
        commands: [
          { type: 'setStyleBlock', style: { declarations: { color: 'green' } } },
          { type: 'removeVariantPreset', name: 'missing' },
        ],
      }),
    ).toThrow();
    expect(document.manifest).toEqual(before);
    expect(project.document(input.id)).toBe(document);
    project.updateDocument(input.id, { type: 'removeVariantPreset', name: 'compact' });
    expect(document.manifest.variantPresets).toBeUndefined();
  });

  it('rejects executor identity changes without replacing the stored document', () => {
    const project = new ProjectController({
      designDocumentId: design.id,
      documents: [design, input].map(toFlat),
      executeCommand(document) {
        document.id = 'other';
        return document;
      },
    });
    const document = project.document(input.id);
    const before = document.manifest;
    expect(() =>
      project.updateDocument(input.id, {
        type: 'setPreviewData',
        previewData: null,
      }),
    ).toThrow('A command changed document id');
    expect(document.manifest).toEqual(before);
    expect(project.document(input.id)).toBe(document);
  });

  it('initializes document views and resolves local and public fields', () => {
    const project = new ProjectController({
      designDocumentId: design.id,
      documents: [design, input, formInput].map(toFlat),
    });
    const atom = project.document(input.id);
    const component = project.document(formInput.id);

    expect(atom.id).toBe(input.id);
    expect(atom.root).toMatchObject({ id: 'root', type: 'text' });
    expect([...atom.fields.keys()]).toEqual(['value', 'placeholder', 'disabled']);
    expect(atom.localFields).toEqual(atom.fields);

    expect([...component.localFields.keys()]).toEqual(['label']);
    expect([...component.fields.keys()]).toEqual(['label', 'value', 'placeholder', 'disabled']);
    expect(component.globalTokens).toEqual(project.globalTokens);
  });

  it('is owned by a project context and resolves shared schemas for component contracts', () => {
    const project = new ProjectController({
      designDocumentId: design.id,
      documents: [design, input, formInput].map(toFlat),
    });
    const atom = project.document(input.id);
    const component = project.document(formInput.id);

    expect(project.documents).toHaveLength(3);
    expect([...component.fields.keys()]).toEqual(['label', 'value', 'placeholder', 'disabled']);
    expect(atom.fields.get('disabled')).toMatchObject({ name: 'disabled', type: 'boolean' });
  });

  it('keeps document models live when document and shared schema commands update the project', () => {
    const project = new ProjectController({
      designDocumentId: design.id,
      documents: [design, input, formInput].map(toFlat),
    });
    const atom = project.document(input.id);
    const component = project.document(formInput.id);
    const nextPreview = { fields: { value: 'hello' } };

    project.updateDocument(input.id, { type: 'setPreviewData', previewData: nextPreview });
    expect(atom.previewData).toEqual(nextPreview);
    expect(project.document(input.id)).toBe(atom);

    const updatedCatalog: SchemaCatalog = {
      schemas: [
        {
          ...schemaCatalog.schemas[0]!,
          schema: {
            type: 'object',
            properties: {
              value: { type: 'string' },
              placeholder: { type: 'string' },
              disabled: { type: 'boolean' },
              required: { type: 'boolean' },
            },
          },
        },
      ],
    };
    project.updateSchemas(updatedCatalog);

    expect([...atom.fields.keys()]).toEqual(['value', 'placeholder', 'disabled', 'required']);
    expect([...component.fields.keys()]).toEqual([
      'label',
      'value',
      'placeholder',
      'disabled',
      'required',
    ]);
    expect(project.schemaCatalog).toEqual(updatedCatalog);
  });

  it('routes shared token updates through document commands', () => {
    const project = new ProjectController({
      designDocumentId: design.id,
      documents: [design, input, formInput].map(toFlat),
    });

    const tokenUuid = testUuid21;
    project.updateTokens({
      type: 'setToken',
      family: 'color',
      token: {
        uuid: tokenUuid,
        label: 'Primary',
        group: 'text',
        valueType: 'color',
        value: '#000000',
      },
    });

    expect(project.globalTokens).toMatchObject({
      color: { [tokenUuid]: { uuid: tokenUuid, label: 'Primary', group: 'text', value: '#000000' } },
    });
    expect(project.document(input.id).globalTokens).toEqual(project.globalTokens);
  });
});
