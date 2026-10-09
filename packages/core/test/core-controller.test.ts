import { describe, expect, it } from 'vitest';
import {
  CoreController,
  definitionToElementBuildConfig,
  previewFieldsForNode,
  inspectorInputsForNode,
  type InspectorFormField,
} from '../src/index';
const testUuid17 = globalThis.crypto.randomUUID();
const testUuid18 = globalThis.crypto.randomUUID();
const testUuid19 = globalThis.crypto.randomUUID();

const schemaUuid = testUuid17;
const atomUuid = testUuid18;
const rootUuid = testUuid19;

const catalog = {
  atoms: {
    [atomUuid]: {
      uuid: atomUuid,
      name: 'Image',
      kind: 'atom' as const,
      schema: { kind: 'ref' as const, uuid: schemaUuid },
      config: {
        previewData: {
          fields: { src: 'https://example.test/a.png', alt: 'A', ratio: '1 / 1' },
        },
      },
      root: {
        uuid: rootUuid,
        dom: { tagName: 'img', attributes: { src: '', alt: '' } },
      },
    },
  },
  components: {},
  pages: {},
  schemas: {
    [schemaUuid]: {
      type: 'object',
      required: ['src'],
      properties: {
        src: { type: 'string' },
        alt: { type: 'string' },
        ratio: { type: 'string' },
      },
    },
  },
};

describe('CoreController', () => {
  it('opens a definition and resolves preview fields', () => {
    const core = new CoreController(catalog);
    core.openDefinition(atomUuid);
    expect(core.getSnapshot().openDefinition?.name).toBe('Image');
    expect(core.node.config.previewFields(rootUuid).src).toBe('https://example.test/a.png');
    expect(core.node.schema.resolveForOpenDefinition()?.properties).toBeTruthy();
  });

  it('builds declarative element config for preview render', () => {
    const core = new CoreController(catalog);
    core.openDefinition(atomUuid);
    const config = core.node.element.buildOpenDefinition();
    expect(config?.tagName).toBe('img');
    expect(config?.attributes?.src).toBe('https://example.test/a.png');
    expect(config?.attributes?.alt).toBe('A');
  });

  it('patches instance data on the open definition', () => {
    const core = new CoreController(catalog);
    core.openDefinition(atomUuid);
    core.patchNodeField('src', 'https://example.test/b.png');
    expect(previewFieldsForNode(core.getSnapshot().openDefinition!, rootUuid).src).toBe(
      'https://example.test/b.png',
    );
    expect(definitionToElementBuildConfig(core.getSnapshot().openDefinition!).attributes?.src).toBe(
      'https://example.test/b.png',
    );
  });

  it('calculates inspector field defs and merged values', () => {
    const core = new CoreController(catalog);
    core.openDefinition(atomUuid);
    const inputs = inspectorInputsForNode(catalog, core.getSnapshot().openDefinition!, rootUuid);
    expect(inputs.fields.map((field) => field.name)).toEqual(['src', 'alt', 'ratio']);
    expect(inputs.values.src).toBe('https://example.test/a.png');
    expect(inputs.values.alt).toBe('A');
    expect(inputs.values.ratio).toBe('1 / 1');
    expect(core.node.config.inspectorInputs(rootUuid).values.src).toBe(
      'https://example.test/a.png',
    );
  });

  it('builds a schema-driven inspector form model with presets', () => {
    const core = new CoreController(catalog);
    core.openDefinition(atomUuid);
    const model = core.node.preview.inspectorForm(rootUuid);
    expect(model).not.toBeNull();
    expect(model!.formValue.definition.name).toBe('Image');
    expect(model!.formValue.node.tagName).toBe('img');
    const flat = flattenInspectorFields(model!.fields);
    expect(flat.some((field) => field.type === 'select' && field.path === 'node.tagName')).toBe(true);
    expect(flat.some((field) => field.type === 'classList')).toBe(true);
    expect(flat.some((field) => field.type === 'schemaField' && field.path === 'nodeData.src')).toBe(
      true,
    );
  });

  it('notifies subscribers after mutations', () => {
    const core = new CoreController(catalog);
    let count = 0;
    core.subscribe(() => {
      count += 1;
    });
    core.openDefinition(atomUuid);
    core.patchNodeField('alt', 'B');
    expect(count).toBe(2);
  });
});

function flattenInspectorFields(fields: InspectorFormField[]): InspectorFormField[] {
  return fields.flatMap((field) =>
    field.type === 'section' ? flattenInspectorFields(field.fields) : [field],
  );
}
