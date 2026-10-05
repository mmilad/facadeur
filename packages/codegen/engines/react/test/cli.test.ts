import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { runReactCli } from '../src/cli';

describe('React codegen CLI', () => {
  it('generates an independent workspace and preserves custom files on regeneration', async () => {
    const root = mkdtempSync(join(tmpdir(), 'facadeur-workspace-'));
    try {
      const component = join(root, 'button.json');
      const output = join(root, 'output');
      writeFileSync(
        component,
        JSON.stringify({
          version: 1,
          id: 'button',
          name: 'Button',
          kind: 'atom',
          root: { id: 'root', type: 'text', text: 'Hello' },
        }),
      );
      await runReactCli(['--workspace', output, '--next-example', component]);
      expect(existsSync(join(output, 'apps/next/package.json'))).toBe(true);
      writeFileSync(join(output, 'custom.txt'), 'keep me');
      writeFileSync(join(output, 'pnpm-lock.yaml'), 'custom lock');
      await runReactCli(['--workspace', output, component]);
      const manifest = JSON.parse(readFileSync(join(output, 'package.json'), 'utf8'));
      expect(manifest.private).toBe(true);
      expect(manifest.scripts.next).toBeUndefined();
      expect(existsSync(join(output, 'apps/next/package.json'))).toBe(false);
      expect(readFileSync(join(output, 'custom.txt'), 'utf8')).toBe('keep me');
      expect(readFileSync(join(output, 'pnpm-lock.yaml'), 'utf8')).toBe('custom lock');
      expect(readFileSync(join(output, 'pnpm-workspace.yaml'), 'utf8')).toContain('packages/*');
      const storybook = JSON.parse(
        readFileSync(join(output, 'apps/storybook/package.json'), 'utf8'),
      );
      expect(storybook.dependencies['@facadeur/ui']).toBe('workspace:*');
      expect(
        readFileSync(join(output, 'packages/ui/components/Button/component.tsx'), 'utf8'),
      ).toContain('Hello');
      expect(
        existsSync(join(output, 'apps/storybook/src/stories/generated/Button.stories.tsx')),
      ).toBe(true);
      expect(readFileSync(join(output, 'packages/ui/tsconfig.json'), 'utf8')).toContain(
        '../../tsconfig.base.json',
      );
      await expect(
        runReactCli(['--workspace', output, '--out', output, component]),
      ).rejects.toThrow('cannot be combined');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
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
