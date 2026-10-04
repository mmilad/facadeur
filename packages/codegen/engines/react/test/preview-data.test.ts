import { describe, expect, it } from 'vitest';
import { type DocumentFile } from '@facadeur/core';
import { generateReact } from '../src/index';

describe('preview values stay outside runtime code', () => {
  it('keeps required props required and excludes base and variant samples', () => {
    const document: DocumentFile = {
      version: 1,
      id: 'sample',
      name: 'Sample',
      kind: 'atom',
      fields: [{ name: 'value', type: 'text', required: true }],
      variants: [{ name: 'compact' }],
      previewData: {
        fields: { value: 'PREVIEW_BASE' },
        variants: { compact: { value: 'PREVIEW_COMPACT' } },
      },
      root: { id: 'root', type: 'text', bindings: [{ field: 'value', target: 'text' }] },
    };
    const output = generateReact({ documents: [document] });
    const code =
      output.ui.find((file) => file.path === 'components/Sample/component.tsx')?.contents ?? '';
    const types =
      output.ui.find((file) => file.path === 'components/Sample/types.ts')?.contents ?? '';
    expect(types).toContain('value: string;');
    for (const generated of [code, types]) {
      expect(generated).not.toContain('PREVIEW_BASE');
      expect(generated).not.toContain('PREVIEW_COMPACT');
    }
    expect(output.stories[0]?.contents).toContain('PREVIEW_BASE');
    expect(output.stories[0]?.contents).toContain('PREVIEW_COMPACT');
    expect(output.stories[0]?.contents).toContain('export const Compact: Story');
  });

  it('uses schema defaults for runtime props and schema-use defaults for story samples', () => {
    const document: DocumentFile = {
      version: 1,
      id: 'schema-sample',
      name: 'Schema sample',
      kind: 'atom',
      schemaUse: {
        fields: [{ name: 'value', type: { kind: 'schema', schemaId: 'text-field' } }],
        defaults: { value: 'STORY_SAMPLE' },
      },
      root: { id: 'root', type: 'text', bindings: [{ field: 'value', target: 'text' }] },
    };
    const schemaCatalog = {
      schemas: [
        {
          id: 'text-field',
          name: 'Text field',
          schema: { type: 'string', default: 'RUNTIME_DEFAULT' },
        },
      ],
    };
    const output = generateReact({ documents: [document], schemaCatalog });
    const component =
      output.ui.find((file) => file.path === 'components/SchemaSample/component.tsx')?.contents ??
      '';
    const types =
      output.ui.find((file) => file.path === 'components/SchemaSample/types.ts')?.contents ?? '';
    expect(types).toContain('value?: string;');
    expect(component).toContain("value = 'RUNTIME_DEFAULT'");
    expect(output.stories[0]?.contents).toContain('value: "STORY_SAMPLE"');
    expect(output.stories[0]?.contents).not.toContain('RUNTIME_DEFAULT');
  });

  it('validates static instance values against the Core-resolved schema fields', () => {
    const child: DocumentFile = {
      version: 1,
      id: 'schema-child',
      name: 'Schema child',
      kind: 'atom',
      schemaUse: {
        fields: [{ name: 'label', type: { kind: 'schema', schemaId: 'text-field' } }],
      },
      root: { id: 'root', type: 'text', text: 'Child' },
    };
    const host: DocumentFile = {
      version: 1,
      id: 'schema-host',
      name: 'Schema host',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        tag: 'div',
        children: [{ id: 'child', type: 'instance', component: child.id, fields: { label: 42 } }],
      },
    };
    const schemaCatalog = {
      schemas: [{ id: 'text-field', name: 'Text field', schema: { type: 'string' } }],
    };
    expect(() => generateReact({ documents: [host, child], schemaCatalog })).toThrow(/not a text/);
  });
});
