import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { runReactCli } from '../src/cli';

describe('React codegen CLI', () => {
  it('loads an explicit schema library before validating component assignments', async () => {
    const root = mkdtempSync(join(tmpdir(), 'facadeur-codegen-library-'));
    try {
      const schemasPath = join(root, 'schemas.json');
      const componentPath = join(root, 'textarea.json');
      const outPath = join(root, 'out');
      writeFileSync(
        schemasPath,
        JSON.stringify({
          schemas: [
            {
              id: 'textarea',
              name: 'Textarea',
              schema: {
                type: 'object',
                properties: { value: { type: 'string' } },
              },
            },
          ],
          assignments: { textarea: 'textarea' },
        }),
      );
      writeFileSync(
        componentPath,
        JSON.stringify({
          version: 1,
          id: 'textarea',
          name: 'Textarea',
          kind: 'component',
          schemaUse: { direct: { kind: 'schema', schemaId: 'textarea' } },
          root: { id: 'root', type: 'text', bindings: [{ field: 'value', target: 'text' }] },
        }),
      );
      await expect(runReactCli(['--out', outPath, componentPath])).rejects.toThrow(
        'missing schema "textarea"',
      );
      await runReactCli(['--schemas', schemasPath, '--out', outPath, componentPath]);
      expect(readFileSync(join(outPath, 'types/TextareaSchema.ts'), 'utf8')).toContain(
        'value?: string;',
      );
      expect(readFileSync(join(outPath, 'components/Textarea/types.ts'), 'utf8')).toContain(
        'TextareaSchema',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('loads component schemas from the project design document', async () => {
    const root = mkdtempSync(join(tmpdir(), 'facadeur-codegen-cli-'));
    try {
      const designPath = join(root, 'design.json');
      const componentPath = join(root, 'component.json');
      const outPath = join(root, 'out');
      writeFileSync(
        designPath,
        JSON.stringify({
          version: 1,
          id: 'design',
          name: 'Design',
          kind: 'atom',
          schemaCatalog: {
            schemas: [
              {
                id: 'label',
                name: 'Label',
                schema: { type: 'string', default: 'Schema label' },
              },
            ],
          },
          root: { id: 'root', type: 'frame', tag: 'div' },
        }),
        'utf8',
      );
      writeFileSync(
        componentPath,
        JSON.stringify({
          version: 1,
          id: 'schema-component',
          name: 'Schema component',
          kind: 'atom',
          schemaUse: {
            fields: [{ name: 'label', type: { kind: 'schema', schemaId: 'label' } }],
          },
          root: { id: 'root', type: 'text', text: 'Schema-backed field' },
        }),
        'utf8',
      );

      await runReactCli(['--design', designPath, '--out', outPath, componentPath]);

      const component = readFileSync(
        join(outPath, 'components/SchemaComponent/component.tsx'),
        'utf8',
      );
      const types = readFileSync(join(outPath, 'components/SchemaComponent/types.ts'), 'utf8');
      expect(types).toContain('label?: LabelSchema;');
      expect(readFileSync(join(outPath, 'types/LabelSchema.ts'), 'utf8')).toContain(
        'LabelSchema = string;',
      );
      expect(component).toContain('data-component="schema-component"');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
