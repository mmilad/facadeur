import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { validateCatalog, validateDocumentFile, type DocumentFile } from '@facadeur/core';
import { CodegenError, designFromDocument, generateReact } from '../src/index.js';
import { formatGenerated, readRepoFile } from '../src/format.js';

const examplesDir = fileURLToPath(new URL('../../../examples/', import.meta.url));

const componentFiles = [
  'button.json',
  'form-input.json',
  'card.json',
  'product-card.json',
  'input.json',
  'textarea.json',
  'sign-in.json',
  'form-text-input.json',
  'form-select.json',
  'form-toggle.json',
  'form-segmented.json',
  'form-field-row.json',
  'media.json',
  'specimen-page.json',
  'specimen-section.json',
  'form-controls-page.json',
  'form-controls-section.json',
];

function loadCatalog(): {
  documents: DocumentFile[];
  design: ReturnType<typeof designFromDocument>;
} {
  const documents = validateCatalog(
    componentFiles.map(
      (name) => JSON.parse(readFileSync(`${examplesDir}${name}`, 'utf8')) as unknown,
    ),
  );
  const design = designFromDocument(
    validateDocumentFile(
      JSON.parse(readFileSync(`${examplesDir}project-template.json`, 'utf8')) as unknown,
    ),
  );
  return { documents, design };
}

function source(files: { path: string; contents: string }[], path: string): string {
  const file = files.find((entry) => entry.path === path);
  expect(file, path).toBeDefined();
  return file?.contents ?? '';
}

function componentSource(files: { path: string; contents: string }[], name: string): string {
  return source(files, `components/${name}/component.tsx`);
}

function componentTypes(files: { path: string; contents: string }[], name: string): string {
  return source(files, `components/${name}/types.ts`);
}

function componentStyle(files: { path: string; contents: string }[], name: string): string {
  return source(files, `components/${name}/style.module.css`);
}

function expectGeneratedTypecheck(files: { path: string; contents: string }[]): void {
  const root = mkdtempSync(join(tmpdir(), 'facadeur-codegen-'));
  try {
    const roots: string[] = [];
    for (const file of files.filter(
      (entry) => entry.path.endsWith('.tsx') || entry.path.endsWith('.ts'),
    )) {
      const path = join(root, file.path);
      mkdirSync(join(path, '..'), { recursive: true });
      writeFileSync(path, file.contents, 'utf8');
      roots.push(path);
    }
    writeFileSync(
      join(root, 'react.d.ts'),
      "declare module 'react' { export type CSSProperties = Record<string, string | number>; }\ndeclare module 'react/jsx-runtime' { export const Fragment: unknown; export function jsx(...args: unknown[]): unknown; export function jsxs(...args: unknown[]): unknown; }\ntype TestChangeEvent = { currentTarget: { value: string } };\ndeclare namespace JSX { interface IntrinsicElements { [element: string]: any; input: { [key: string]: any; onChange?: (event: TestChangeEvent) => void }; textarea: { [key: string]: any; onChange?: (event: TestChangeEvent) => void }; } }\n",
      'utf8',
    );
    roots.push(join(root, 'react.d.ts'));
    const program = ts.createProgram(roots, {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2022,
      strict: true,
      skipLibCheck: true,
      types: [],
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    expect(
      diagnostics.map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      ),
    ).toEqual([]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('generateReact', () => {
  const { documents, design } = loadCatalog();
  const { ui: files } = generateReact({ documents, design });

  it('types button fields and variants and paints the instance selectors', () => {
    const button = componentSource(files, 'Button');
    const types = componentTypes(files, 'Button');
    expect(types).toContain("export type ButtonTone = 'primary' | 'secondary' | 'ghost';");
    expect(types).toContain("export type ButtonSize = 'sm' | 'md';");
    expect(types).toContain('label?: string;');
    expect(button).not.toContain("label = 'Button'");
    expect(button).toContain("tone = 'primary'");
    expect(button).toContain("size = 'md'");
    expect(button).toContain("data-component='button'");
    expect(button).toContain('data-variant-tone={tone}');
    expect(button).toContain('data-variant-size={size}');
    expect(button).toContain("type='button'");
    expect(button).toContain('{label}');
  });

  it('binds input fields onto the control', () => {
    const input = componentSource(files, 'Input');
    expect(input).toContain("'use client';");
    expect(input).toContain("data-component='input'");
    expect(input).toContain("data-node='label'");
    expect(input).toContain("from '../FormInput'");
    expect(input).toContain("nodeId='control'");
    expect(input).toContain('value={value}');
    expect(input).toContain('placeholder={placeholder}');
    expect(input).toContain('name={name}');
    expect(input).toContain('{label}');
  });

  it('composes sign-in from input and button overrides', () => {
    const signIn = componentSource(files, 'SignIn');
    expect(signIn).toContain("from '../Input'");
    expect(signIn).toContain("from '../Button'");
    expect(signIn).toContain("nodeId='email'");
    expect(signIn).toContain("label='Work email'");
    expect(signIn).toContain("value='ada@atelier.test'");
    expect(signIn).toContain("name='work-email'");
    expect(signIn).toContain("nodeId='continue'");
    expect(signIn).toContain("label='Continue'");
    expect(signIn).toContain("tone='primary'");
    expect(signIn).toContain("size='sm'");
    expect(signIn).not.toContain('placeholder=');
  });

  it('renders a page as its section instance', () => {
    const page = componentSource(files, 'Specimen');
    expect(page).toContain("data-component='specimen'");
    expect(page).toContain('<SpecimenSection');
    expect(page).toContain("nodeId='specimen-section'");
    const section = componentSource(files, 'SpecimenSection');
    expect(section).toContain("tone='ghost'");
    expect(section).toContain('>Specimen<');
    expect(section).toContain("nodeId='card-signin'");
  });

  it('compiles tokens, fonts, and style blocks to CSS', () => {
    const tokens = source(files, 'styles/tokens.css');
    expect(tokens).toContain('--color-blue-500:');
    expect(tokens).toContain('--font-sans:');
    expect(tokens).toContain('@import url("https://fonts.googleapis.com');
    const css = componentStyle(files, 'Button');
    expect(css).toMatch(/\.f_root_[a-z0-9]+ \{/);
    expect(css).toContain('background: var(--button-color-bg, var(--color-accent-default))');
    expect(css).toContain('font-family: var(--type-label--font-family)');
    expect(css).toMatch(/\.f_root_[a-z0-9]+\[data-variant-tone="ghost"\]/);
    expect(css).toMatch(/\.f_root_[a-z0-9]+:hover/);
    expect(css).toMatch(/\.f_root_[a-z0-9]+:focus-visible/);
    expect(css).toMatch(/\.f_root_[a-z0-9]+:disabled/);
    expect(css).toContain('@media (min-width: 768px)');
    expect(css).not.toContain('min-width: 375px');
    const formInputCss = componentStyle(files, 'FormInput');
    expect(formInputCss).toMatch(/\.f_root_[a-z0-9]+ \{/);
    const signInCss = componentStyle(files, 'SignIn');
    expect(signInCss).toContain('--input-color-border: var(--color-accent-default)');
    expect(css.indexOf('.f_root_')).toBeLessThan(css.indexOf('@media (min-width: 768px)'));
  });

  it('sorts documents by id so the same catalog always matches', () => {
    const reversed = generateReact({ documents: [...documents].reverse(), design });
    expect(reversed.ui.map((file) => file.path)).toEqual(files.map((file) => file.path));
    expect(reversed.ui.map((file) => file.contents)).toEqual(files.map((file) => file.contents));
  });

  it('emits CSS Modules per component and imports them from the implementation', () => {
    const generated = generateReact({ documents: [documents[0]!] });
    expect(generated.ui.some((file) => file.path === 'styles/components.css')).toBe(false);
    expect(componentStyle(generated.ui, 'Button')).toMatch(/\.f_root_[a-z0-9]+ \{/);
    expect(componentSource(generated.ui, 'Button')).toContain(
      "import styles from './style.module.css'",
    );
    expect(source(generated.ui, 'components/Button/index.ts')).toContain(
      "export { Button } from './component'",
    );
    expect(componentStyle(generated.ui, 'Button')).not.toContain('data-component="card"');
    const rootIndex = source(generated.ui, 'index.ts');
    expect(rootIndex).toContain("export * from './components/Button';");
    expect(rootIndex).not.toContain('import ');
  });

  it('prunes unreachable documents from components, styles, and stories', () => {
    const generated = generateReact({ documents, entries: ['button'] });
    expect(generated.ui.map((file) => file.path)).toEqual([
      'styles/tokens.css',
      'components/Button/component.tsx',
      'components/Button/types.ts',
      'components/Button/style.module.css',
      'components/Button/index.ts',
      'css-modules.d.ts',
      'index.ts',
    ]);
    expect(generated.stories.map((file) => file.path)).toEqual([
      'src/stories/generated/Button.stories.tsx',
    ]);
  });

  it('includes recursive instance dependencies for an entry', () => {
    const generated = generateReact({ documents, entries: ['sign-in'] });
    const componentDirectories = generated.ui
      .filter((file) => file.path.endsWith('/component.tsx'))
      .map((file) => file.path.split('/')[1]);
    expect(componentDirectories).toEqual(['Button', 'FormInput', 'Input', 'SignIn']);
    expect(generated.stories.map((file) => file.path)).toEqual([
      'src/stories/generated/Button.stories.tsx',
      'src/stories/generated/FormInput.stories.tsx',
      'src/stories/generated/Input.stories.tsx',
      'src/stories/generated/SignIn.stories.tsx',
    ]);
  });

  it('gives elements and nested component roots classes from the owning module', () => {
    const generated = generateReact({ documents, entries: ['sign-in'] });
    const sourceText = generated.ui
      .filter((file) => file.path.endsWith('.tsx'))
      .map((file) => file.contents)
      .join('\n');
    expect(sourceText).toContain('className={styles.');
    expect(sourceText).toMatch(/<Input[\s\S]*?className=\{styles\./);
    expect(generated.ui.some((file) => file.path === 'css-modules.d.ts')).toBe(true);
  });

  it('typechecks the complete split component graph', () => {
    expectGeneratedTypecheck(files);
  });

  it('matches the committed UI package', async () => {
    for (const file of files) {
      const formatted = await formatGenerated(file.path, file.contents);
      expect(readRepoFile(`packages/ui/${file.path}`)).toBe(formatted);
    }
  });

  it('emits a CSF3 story per component', () => {
    const { stories } = generateReact({ documents, design });
    expect(stories.map((file) => file.path)).toEqual([
      'src/stories/generated/Button.stories.tsx',
      'src/stories/generated/Card.stories.tsx',
      'src/stories/generated/FormControls.stories.tsx',
      'src/stories/generated/FormControlsSection.stories.tsx',
      'src/stories/generated/FormFieldRow.stories.tsx',
      'src/stories/generated/FormInput.stories.tsx',
      'src/stories/generated/FormSegmented.stories.tsx',
      'src/stories/generated/FormSelect.stories.tsx',
      'src/stories/generated/FormTextInput.stories.tsx',
      'src/stories/generated/FormToggle.stories.tsx',
      'src/stories/generated/Input.stories.tsx',
      'src/stories/generated/Media.stories.tsx',
      'src/stories/generated/ProductCard.stories.tsx',
      'src/stories/generated/SignIn.stories.tsx',
      'src/stories/generated/Specimen.stories.tsx',
      'src/stories/generated/SpecimenSection.stories.tsx',
      'src/stories/generated/Textarea.stories.tsx',
    ]);
    const button = source(stories, 'src/stories/generated/Button.stories.tsx');
    expect(button).toContain("title: 'Atoms/Button'");
    expect(button).toContain('tone:');
    expect(button).toContain('export const Default: Story = {};');
    const mediaStory = source(stories, 'src/stories/generated/Media.stories.tsx');
    const mediaPreview = documents.find((document) => document.id === 'media')?.previewData;
    expect(mediaStory).toContain(`src: ${JSON.stringify(mediaPreview?.fields?.src)}`);
    const productStory = source(stories, 'src/stories/generated/ProductCard.stories.tsx');
    expect(productStory).toContain('export const Compact: Story = {');
    expect(productStory).toContain('variant: "compact"');
    expect(productStory).toContain('Everyday ceramic mug');
  });

  it('generates a data-driven media switch with optional metadata', () => {
    const media = componentSource(files, 'Media');
    const types = componentTypes(files, 'Media');
    expect(types).toContain("kind?: 'image' | 'video';");
    expect(types).toContain('src: string;');
    expect(types).toContain('alt?: string;');
    expect(types).toContain('ratio?: string;');
    expect(media).toContain("kind === 'video'");
    expect(media).toContain('<img');
    expect(media).toContain('<video');
    expect(media).toContain('src={src}');
  });

  it('keeps form control state data connected to the rendered control', () => {
    const generated = generateReact({ documents, design }).ui;
    const formToggle = componentSource(generated, 'FormToggle');
    expect(componentTypes(generated, 'FormToggle')).toContain('value?: string;');
    expect(formToggle).toContain("data-node='state'");
    expect(formToggle).toContain('{value}');
  });

  it('generates the example form as a data-driven type switch', () => {
    const form = componentSource(files, 'FormControlsSection');
    expect(componentTypes(files, 'FormControlsSection')).toContain('formFields?:');
    expect(form).toContain('{(formFields ?? []).map((field, fieldIndex) => (');
    expect(form).toContain("field?.kind === 'input'");
    expect(form).toContain("field?.kind === 'textarea'");
    expect(form).toContain("field?.kind === 'select'");
    expect(form).toContain("field?.kind === 'toggle'");
    expect(form).toContain('label={field?.label}');
  });
});

describe('bindings outside the examples', () => {
  const note: DocumentFile = {
    version: 1,
    id: 'note',
    name: 'Note',
    kind: 'atom',
    fields: [
      { name: 'work-email', type: 'text', default: 'ada@example.com' },
      { name: 'count', type: 'number', default: 2 },
      { name: 'open', type: 'boolean', default: true },
      { name: 'tone', type: 'enum', options: ['info', 'warn'], default: 'info' },
      { name: 'photo', type: 'image', default: 'a.png' },
      { name: 'href', type: 'link', default: 'https://example.com' },
      { name: 'class', type: 'text', default: 'note' },
    ],
    variants: [{ name: 'density', values: ['compact', 'comfy'], default: 'comfy' }],
    root: {
      id: 'root',
      type: 'frame',
      tag: 'section',
      attributes: { class: 'card' },
      children: [
        {
          id: 'title',
          type: 'text',
          tag: 'h2',
          text: 'Fallback',
          bindings: [{ field: 'work-email', target: 'text' }],
        },
        {
          id: 'count',
          type: 'text',
          tag: 'span',
          bindings: [{ field: 'count', target: 'text' }],
        },
        {
          id: 'body',
          type: 'text',
          tag: 'p',
          text: 'Shown',
          bindings: [{ field: 'open', target: 'visible' }],
        },
        {
          id: 'photo',
          type: 'image',
          tag: 'img',
          bindings: [
            { field: 'photo', target: 'src' },
            { field: 'tone', target: 'alt' },
          ],
        },
        {
          id: 'link',
          type: 'frame',
          tag: 'a',
          bindings: [
            { field: 'href', target: 'attribute', name: 'href' },
            { field: 'open', target: 'attribute', name: 'hidden' },
            { field: 'tone', target: 'style', name: 'color' },
            { field: 'href', target: 'style', name: '--tint' },
          ],
        },
      ],
    },
  };

  const host: DocumentFile = {
    version: 1,
    id: 'host',
    name: 'Host',
    kind: 'component',
    root: {
      id: 'root',
      type: 'frame',
      tag: 'div',
      children: [
        {
          id: 'note',
          type: 'instance',
          component: 'note',
          fields: { 'work-email': 'bea@example.com', open: false },
          variants: { density: 'compact' },
        },
        { id: 'missing', type: 'instance', component: 'missing' },
      ],
    },
  };

  const { ui: files } = generateReact({ documents: [host, note] });

  it('emits typed props, style bindings, and instance overrides', () => {
    const component = componentSource(files, 'Note');
    const types = componentTypes(files, 'Note');
    expect(types).toContain("export type NoteDensity = 'compact' | 'comfy';");
    expect(types).toContain('workEmail?: string;');
    expect(component).toContain("workEmail = 'ada@example.com'");
    expect(types).toContain('count?: number;');
    expect(component).toContain('count = 2');
    expect(types).toContain('open?: boolean;');
    expect(types).toContain("tone?: 'info' | 'warn';");
    expect(types).toContain('classField?: string;');
    expect(component).toContain('data-variant-density={density}');
    expect(component).toContain('{workEmail}');
    expect(component).toContain('{count}');
    expect(component).toContain('hidden={open === false}');
    expect(component).toContain('src={photo}');
    expect(component).toContain('alt={tone}');
    expect(component).toContain('href={href}');
    expect(component).toContain('hidden={open}');
    expect(component).toContain("import type { CSSProperties } from 'react';");
    expect(types).toContain("import type { CSSProperties } from 'react';");
    expect(component).toContain("'--tint': href");
    expect(component).toContain('as CSSProperties');
    expect(component).toMatch(
      /\[styles\.f_root_[a-z0-9]+, 'card', className\]\.filter\(Boolean\)\.join\(' '\)/,
    );

    const wrapper = componentSource(files, 'Host');
    expect(wrapper).toContain("nodeId='note'");
    expect(wrapper).toContain("workEmail='bea@example.com'");
    expect(wrapper).toContain('open={false}');
    expect(wrapper).toContain("density='compact'");
    expect(wrapper).toContain("data-component='missing'");
    expect(wrapper).toContain("'ds-unknown'].join(' ')");
    expect(wrapper).toContain('className={styles.');
    expect(wrapper).toContain('Unknown component: missing');
    expect(files.map((file) => file.path)[1]).toBe('components/Host/component.tsx');
  });

  it('rejects a default whose type does not match the field', () => {
    const bad: DocumentFile = {
      version: 1,
      id: 'bad',
      name: 'Bad',
      kind: 'atom',
      fields: [{ name: 'label', type: 'text', default: 1 }],
      root: { id: 'root', type: 'frame', tag: 'div' },
    };
    expect(() => generateReact({ documents: [bad] })).toThrow(CodegenError);
    expect(() => generateReact({ documents: [bad] })).toThrow(/not a text/);
  });

  it('rejects missing required instance fields during codegen', () => {
    const control: DocumentFile = {
      version: 1,
      id: 'required-codegen-control',
      name: 'Required codegen control',
      kind: 'atom',
      fields: [{ name: 'value', type: 'text', required: true }],
      root: { id: 'root', type: 'text', text: 'Control' },
    };
    const host: DocumentFile = {
      version: 1,
      id: 'missing-codegen-field-host',
      name: 'Missing codegen field host',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'control', type: 'instance', component: control.id }],
      },
    };

    expect(() => generateReact({ documents: [host, control] })).toThrow(
      /missing required field "value"/,
    );
  });

  it('rejects invalid nested array defaults during codegen', () => {
    const bad: DocumentFile = {
      version: 1,
      id: 'bad-array-default',
      name: 'Bad array default',
      kind: 'component',
      fields: [
        {
          name: 'scores',
          type: 'array',
          items: { type: 'number' },
          default: ['wrong'],
        },
      ],
      root: { id: 'root', type: 'text', text: 'Scores' },
    };

    expect(() => generateReact({ documents: [bad] })).toThrow(/scores\[\].*number/);
  });

  it('rejects structured and non-boolean bindings during codegen', () => {
    const structured: DocumentFile = {
      version: 1,
      id: 'structured-binding-codegen',
      name: 'Structured binding codegen',
      kind: 'component',
      fields: [
        {
          name: 'settings',
          type: 'object',
          items: { type: 'object', fields: [{ name: 'label', type: 'text' }] },
        },
      ],
      root: {
        id: 'root',
        type: 'text',
        bindings: [{ field: 'settings', target: 'text' }],
      },
    };
    expect(() => generateReact({ documents: [structured] })).toThrow(/structured field type/);

    const visibleText: DocumentFile = {
      version: 1,
      id: 'text-visibility-codegen',
      name: 'Text visibility codegen',
      kind: 'component',
      fields: [{ name: 'visible', type: 'text' }],
      root: {
        id: 'root',
        type: 'text',
        bindings: [{ field: 'visible', target: 'visible' }],
      },
    };
    expect(() => generateReact({ documents: [visibleText] })).toThrow(/boolean field/);
  });
});

describe('nested child field codegen', () => {
  it('forwards local and deep overrides across generated instance calls', () => {
    const input: DocumentFile = {
      version: 1,
      id: 'nested-input',
      name: 'Nested input',
      kind: 'atom',
      fields: [
        { name: 'value', type: 'text', default: 'Master value' },
        { name: 'placeholder', type: 'text', default: 'Master placeholder' },
      ],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          { id: 'value', type: 'text', bindings: [{ field: 'value', target: 'text' }] },
          {
            id: 'placeholder',
            type: 'text',
            bindings: [{ field: 'placeholder', target: 'text' }],
          },
        ],
      },
    };
    const field: DocumentFile = {
      version: 1,
      id: 'nested-field',
      name: 'Nested field',
      kind: 'component',
      fields: [{ name: 'title', type: 'text', default: 'Master title' }],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'section-part',
            type: 'instance',
            component: 'nested-section',
            fields: { title: 'Master section title' },
            childFields: { control: { placeholder: 'Inner placeholder' } },
          },
        ],
      },
    };
    const section: DocumentFile = {
      version: 1,
      id: 'nested-section',
      name: 'Nested section',
      kind: 'component',
      fields: [
        { name: 'title', type: 'text', default: 'Master section' },
        { name: 'childFields', type: 'text', default: 'Reserved field' },
      ],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'control',
            type: 'instance',
            component: input.id,
            fields: { value: 'Master field value', placeholder: 'Master field placeholder' },
          },
        ],
      },
    };
    const host: DocumentFile = {
      version: 1,
      id: 'nested-host',
      name: 'Nested host',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'sign-in',
            type: 'instance',
            component: field.id,
            childFields: {
              'section-part': { title: 'Local title' },
              'section-part/control': { value: 'Deep value' },
            },
          },
        ],
      },
    };

    const { ui: files } = generateReact({ documents: [host, field, section, input] });
    const hostSource = componentSource(files, 'NestedHost');
    const fieldSource = componentSource(files, 'NestedField');
    const fieldTypes = componentTypes(files, 'NestedField');
    const sectionSource = componentSource(files, 'NestedSection');
    const sectionTypes = componentTypes(files, 'NestedSection');

    expect(hostSource).toContain(
      "childFields={{ 'section-part': { 'title': 'Local title' }, 'section-part/control': { 'value': 'Deep value' } }}",
    );
    expect(fieldTypes).toContain('childFields?: Record<string, Record<string, unknown>>;');
    expect(fieldSource).toContain("childFields?.['section-part']?.title");
    expect(fieldSource).toContain('childFields2={{ ...');
    expect(sectionSource).toContain('childFields2?.control?.value');
    expect(sectionTypes).toContain('childFields?: string;');
    expect(sectionTypes).toContain('childFields2?: Record<string, Record<string, unknown>>;');
    expectGeneratedTypecheck(files);
  });
});

describe('atom contracts', () => {
  it('generates required inputs and semantic native events', () => {
    const field: DocumentFile = {
      version: 1,
      id: 'form-input-atom',
      name: 'Form input atom',
      kind: 'atom',
      fields: [
        { name: 'value', type: 'text', required: true },
        { name: 'disabled', type: 'boolean', default: false },
      ],
      events: [{ name: 'commit', payload: { value: 'text' } }],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'input',
        attributes: { type: 'text' },
        bindings: [{ field: 'value', target: 'attribute', name: 'value' }],
        eventBindings: [{ event: 'commit', name: 'change' }],
      },
    };

    const generated = generateReact({ documents: [field] });
    const sourceText = componentSource(generated.ui, 'FormInputAtom');
    const types = componentTypes(generated.ui, 'FormInputAtom');
    expect(types).toContain('value: string;');
    expect(types).toContain('disabled?: boolean;');
    expect(types).toContain('onCommit?: (payload: { value: string }) => void;');
    expect(sourceText).toContain(
      'onChange={(event) => onCommit?.({ value: event.currentTarget.value })}',
    );
  });

  it('rejects structured payloads when an event is mapped to a native handler', () => {
    const invalid: DocumentFile = {
      version: 1,
      id: 'structured-event-atom',
      name: 'Structured event atom',
      kind: 'atom',
      events: [{ name: 'commit', payload: { record: 'object' } }],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'input',
        eventBindings: [{ event: 'commit', name: 'change' }],
      },
    };

    expect(() => generateReact({ documents: [invalid] })).toThrow(CodegenError);
    expect(() => generateReact({ documents: [invalid] })).toThrow(/structured payload/);
  });

  it('forwards exposed inputs and events through a composed component', () => {
    const atom: DocumentFile = {
      version: 1,
      id: 'control-atom',
      name: 'Control atom',
      kind: 'atom',
      fields: [{ name: 'value', type: 'text', default: '' }],
      events: [{ name: 'commit', payload: { value: 'text' } }],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'input',
        eventBindings: [{ event: 'commit', name: 'change' }],
      },
    };
    const wrapper: DocumentFile = {
      version: 1,
      id: 'control-wrapper',
      name: 'Control wrapper',
      kind: 'component',
      expose: {
        fields: { value: 'control.value' },
        events: { commit: 'control.commit' },
      },
      root: {
        id: 'root',
        type: 'frame',
        tag: 'label',
        children: [{ id: 'control', type: 'instance', component: 'control-atom' }],
      },
    };
    const generated = generateReact({ documents: [wrapper, atom] });
    const sourceText = componentSource(generated.ui, 'ControlWrapper');
    const types = componentTypes(generated.ui, 'ControlWrapper');
    expect(types).toContain('value?: string;');
    expect(types).toContain('onCommit?: (payload: { value: string }) => void;');
    expect(sourceText).toContain('<ControlAtom');
    expect(sourceText).toContain('value={value}');
    expect(sourceText).toContain('onCommit={onCommit}');
  });

  it('generates named variant branches from overlay overrides', () => {
    const component: DocumentFile = {
      version: 1,
      id: 'variant-demo',
      name: 'Variant demo',
      kind: 'component',
      fields: [{ name: 'label', type: 'text', default: 'Base' }],
      variants: [
        { name: 'default' },
        {
          name: 'compact',
          overrides: {
            fields: { label: 'Compact' },
            removed: ['body'],
            insertions: [
              {
                parent: 'root',
                node: { id: 'badge', type: 'text', tag: 'span', text: 'Compact' },
              },
            ],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'section',
        children: [
          { id: 'body', type: 'text', tag: 'p', text: 'Body' },
          { id: 'label', type: 'text', tag: 'h2', bindings: [{ field: 'label', target: 'text' }] },
        ],
      },
    };

    const generated = generateReact({ documents: [component] });
    const sourceText = componentSource(generated.ui, 'VariantDemo');
    const types = componentTypes(generated.ui, 'VariantDemo');
    expect(types).toContain("export type VariantDemoVariant = 'default' | 'compact';");
    expect(types).toContain('variant?: VariantDemoVariant;');
    expect(sourceText).toContain("variant === 'compact'");
    expect(sourceText).toContain('data-variant={variant}');
    expect(sourceText).toContain('Compact');
    expect(sourceText).toContain("data-node='badge'");
    expect(sourceText).toContain("data-node='label'");
    expect(sourceText.match(/data-node='body'/g)).toHaveLength(1);

    const host: DocumentFile = {
      version: 1,
      id: 'variant-host',
      name: 'Variant host',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        tag: 'div',
        children: [
          {
            id: 'demo',
            type: 'instance',
            component: 'variant-demo',
            variants: { variant: 'compact' },
          },
        ],
      },
    };
    const hostSource = componentSource(
      generateReact({ documents: [host, component] }).ui,
      'VariantHost',
    );
    expect(hostSource).toContain("variant='compact'");
  });

  it('generates an undefined default when a named variant unsets an optional field', () => {
    const component: DocumentFile = {
      version: 1,
      id: 'optional-variant-default',
      name: 'Optional variant default',
      kind: 'component',
      fields: [{ name: 'title', type: 'text', default: 'Title' }],
      variants: [{ name: 'default' }, { name: 'empty', overrides: { unsetFields: ['title'] } }],
      root: {
        id: 'root',
        type: 'text',
        bindings: [{ field: 'title', target: 'text' }],
      },
    };

    const generated = generateReact({ documents: [component] }).ui;
    const sourceText = componentSource(generated, 'OptionalVariantDefault');
    const types = componentTypes(generated, 'OptionalVariantDefault');
    expect(sourceText).toContain("title = variant === 'empty' ? undefined : 'Title'");
    expect(types).toContain('title?: string;');
  });

  it('generates repeat maps and item display conditions', () => {
    const component: DocumentFile = {
      version: 1,
      id: 'repeat-demo',
      name: 'Repeat demo',
      kind: 'component',
      fields: [
        {
          name: 'items',
          type: 'array',
          items: {
            type: 'object',
            fields: [
              { name: 'id', type: 'text', required: true },
              { name: 'kind', type: 'text', required: true },
            ],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'ul',
        repeat: { path: 'items', as: 'item', key: 'id' },
        children: [
          {
            id: 'input',
            type: 'instance',
            component: 'repeat-row',
            fieldBindings: { label: 'item.label' },
            displayOn: { path: 'item.kind', equals: 'input' },
          },
        ],
      },
    };
    const row: DocumentFile = {
      version: 1,
      id: 'repeat-row',
      name: 'Repeat row',
      kind: 'atom',
      fields: [{ name: 'label', type: 'text', required: true }],
      root: { id: 'root', type: 'text', tag: 'li', bindings: [{ field: 'label', target: 'text' }] },
    };
    const generated = generateReact({ documents: [component, row] });
    const sourceText = componentSource(generated.ui, 'RepeatDemo');
    expect(sourceText).toContain('{(items ?? []).map((item, itemIndex) => (');
    expect(sourceText).toContain('key={item?.id ?? itemIndex}');
    expect(sourceText).toContain("item?.kind === 'input'");
    expect(sourceText).toContain("import { RepeatRow } from '../RepeatRow';");
    expect(sourceText).toContain('label={item?.label}');
  });

  it('preserves enum options in array item prop types', () => {
    const component: DocumentFile = {
      version: 1,
      id: 'enum-array-props',
      name: 'Enum array props',
      kind: 'component',
      fields: [
        {
          name: 'kinds',
          type: 'array',
          items: { type: 'enum', options: ['input', 'textarea'] },
        },
      ],
      root: { id: 'root', type: 'text', text: 'Kinds' },
    };

    const sourceText = componentTypes(
      generateReact({ documents: [component] }).ui,
      'EnumArrayProps',
    );
    expect(sourceText).toContain("kinds?: ('input' | 'textarea')[];");
  });

  it('keeps nested fields with defaults optional in generated object types', () => {
    const component: DocumentFile = {
      version: 1,
      id: 'nested-default-props',
      name: 'Nested default props',
      kind: 'component',
      fields: [
        {
          name: 'settings',
          type: 'object',
          items: {
            type: 'object',
            fields: [
              { name: 'mode', type: 'text', required: true, default: 'comfortable' },
              { name: 'label', type: 'text', required: true },
            ],
          },
        },
      ],
      root: { id: 'root', type: 'text', text: 'Settings' },
    };

    const sourceText = componentTypes(
      generateReact({ documents: [component] }).ui,
      'NestedDefaultProps',
    );
    expect(sourceText).toContain("settings?: { 'mode'?: string; 'label': string };");
  });

  it('nests repeat contexts for section data and child rows', () => {
    const component: DocumentFile = {
      version: 1,
      id: 'nested-repeat-demo',
      name: 'Nested repeat demo',
      kind: 'component',
      fields: [
        {
          name: 'sections',
          type: 'array',
          items: {
            type: 'object',
            fields: [
              {
                name: 'rows',
                type: 'array',
                items: {
                  type: 'object',
                  fields: [{ name: 'label', type: 'text', required: true }],
                },
              },
            ],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'main',
        repeat: { path: 'sections', as: 'section' },
        children: [
          {
            id: 'rows',
            type: 'frame',
            tag: 'ul',
            repeat: { path: 'section.rows', as: 'row', key: 'label' },
            children: [
              {
                id: 'label',
                type: 'instance',
                component: 'nested-row',
                fieldBindings: { label: 'row.label' },
              },
            ],
          },
        ],
      },
    };
    const row: DocumentFile = {
      version: 1,
      id: 'nested-row',
      name: 'Nested row',
      kind: 'atom',
      fields: [{ name: 'label', type: 'text', required: true }],
      root: { id: 'root', type: 'text', tag: 'li', bindings: [{ field: 'label', target: 'text' }] },
    };
    const sourceText = componentSource(
      generateReact({ documents: [component, row] }).ui,
      'NestedRepeatDemo',
    );
    expect(sourceText).toContain('{(sections ?? []).map((section, sectionIndex) => (');
    expect(sourceText).toContain('{(section?.rows ?? []).map((row, rowIndex) => (');
    expect(sourceText).toContain('key={row?.label ?? rowIndex}');
    expect(sourceText).toContain('label={row?.label}');
  });

  it('quotes hyphenated data paths and sanitizes repeat aliases', () => {
    const component: DocumentFile = {
      version: 1,
      id: 'hyphenated-repeat-demo',
      name: 'Hyphenated repeat demo',
      kind: 'component',
      fields: [
        {
          name: 'form-fields',
          type: 'array',
          items: {
            type: 'object',
            fields: [
              { name: 'field-id', type: 'text', required: true },
              { name: 'kind', type: 'text', required: true },
            ],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'ul',
        repeat: { path: 'form-fields', as: 'form-field', key: 'field-id' },
        children: [
          {
            id: 'row',
            type: 'instance',
            component: 'hyphenated-row',
            displayOn: { path: 'form-field.kind', equals: 'input' },
            fieldBindings: { label: 'form-field.field-id' },
          },
        ],
      },
    };
    const row: DocumentFile = {
      version: 1,
      id: 'hyphenated-row',
      name: 'Hyphenated row',
      kind: 'atom',
      fields: [{ name: 'label', type: 'text', required: true }],
      root: { id: 'root', type: 'text', tag: 'li', bindings: [{ field: 'label', target: 'text' }] },
    };

    const sourceText = componentSource(
      generateReact({ documents: [component, row] }).ui,
      'HyphenatedRepeatDemo',
    );
    expect(sourceText).toContain('{(formFields ?? []).map((formField, formFieldIndex) => (');
    expect(sourceText).toContain("key={formField?.['field-id'] ?? formFieldIndex}");
    expect(sourceText).toContain("formField?.kind === 'input'");
    expect(sourceText).toContain("label={formField?.['field-id']}");
  });
});
