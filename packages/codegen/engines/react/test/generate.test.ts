import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  validateCatalog,
  validateDocumentFile,
  type DocumentFile,
  type NestedNode,
  type SchemaCatalog,
} from '@facadeur/core';
import { CodegenError, designFromDocument, generateReact } from '../src/index';
import { formatGenerated, readRepoFile } from '../src/format';
import { generatedRuntime } from './generated-runtime';

const examplesDir = fileURLToPath(new URL('../../../../../examples/', import.meta.url));

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
  'new-section.json',
];

function loadCatalog(): {
  documents: DocumentFile[];
  design: ReturnType<typeof designFromDocument>;
} {
  const designDocument = validateDocumentFile(
    JSON.parse(readFileSync(`${examplesDir}project-template.json`, 'utf8')) as unknown,
  );
  const schemaLibrary = JSON.parse(readFileSync(`${examplesDir}schemas.json`, 'utf8')) as {
    schemas: SchemaCatalog['schemas'];
  };
  const schemaCatalog: SchemaCatalog = { schemas: schemaLibrary.schemas };
  const design = { ...designFromDocument(designDocument), schemaCatalog };
  const documents = validateCatalog(
    componentFiles.map(
      (name) => JSON.parse(readFileSync(`${examplesDir}${name}`, 'utf8')) as unknown,
    ),
    { schemaCatalog },
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
      "declare module 'react' { export type CSSProperties = Record<string, string | number>; export const Fragment: (props: any) => any; }\ndeclare module 'react/jsx-runtime' { export const Fragment: unknown; export function jsx(...args: unknown[]): unknown; export function jsxs(...args: unknown[]): unknown; }\ntype TestChangeEvent = { currentTarget: { value: string } };\ndeclare namespace JSX { interface IntrinsicElements { [element: string]: any; input: { [key: string]: any; onChange?: (event: TestChangeEvent) => void }; textarea: { [key: string]: any; onChange?: (event: TestChangeEvent) => void }; } }\n",
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
  const { ui: files } = generateReact({ documents, design, schemaCatalog: design.schemaCatalog });

  it('separates authored data contracts from transport without forwarding unused context', () => {
    const shared = source(files, 'contracts.ts');
    expect(shared).toContain('export interface ComponentProps');
    expect(shared).toContain('context?: DataContext;');
    expect(shared).toContain('export interface CommitProps<TPayload>');
    expect(componentTypes(files, 'FormInput')).toContain('extends ComponentProps, FormInputData');
    expect(componentTypes(files, 'Input')).toContain('label?: string;');
    expect(componentTypes(files, 'Card')).not.toContain('value?: string;');
    for (const name of ['FormInput', 'Input', 'Card', 'SignIn']) {
      expect(componentSource(files, name)).not.toMatch(/\bcontext\b/);
      expect(componentTypes(files, name)).not.toContain('FacadeurRepeatScope');
    }
    expectGeneratedTypecheck([
      ...files,
      {
        path: 'contract-check.ts',
        contents: `import type { FormInputProps, InputProps, CardProps } from './index';
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
export type ValueCheck = Assert<Equal<FormInputProps['value'], string | undefined>>;
export type LabelCheck = Assert<Equal<InputProps['label'], string | undefined>>;
export type CommitCheck = Assert<Equal<Parameters<NonNullable<FormInputProps['onCommit']>>[0], { value: string }>>;
export type CardCheck = Assert<Equal<'value' extends keyof CardProps ? true : false, false>>;
`,
      },
    ]);
  });

  it('emits schema references, composition and component-owned extensions', () => {
    const schemaCatalog: SchemaCatalog = {
      schemas: [
        {
          id: 'shared',
          name: 'Shared',
          schema: {
            type: 'object',
            properties: { title: { type: 'string' }, count: { type: 'integer', default: 2 } },
            required: ['title', 'count'],
            additionalProperties: false,
          },
        },
        {
          id: 'choice',
          name: 'Choice',
          schema: {
            type: 'object',
            properties: { enabled: { type: 'boolean' } },
            required: ['enabled'],
            oneOf: [
              { $ref: 'facadeur://schema/shared' },
              { type: 'object', properties: { value: { type: 'string' } }, required: ['value'] },
            ],
          },
        },
      ],
    };
    const shared: DocumentFile = {
      version: 1,
      id: 'assigned',
      name: 'Assigned',
      kind: 'component',
      schemaUse: { direct: { kind: 'schema', schemaId: 'shared' } },
      root: { id: 'root', type: 'text', bindings: [{ field: 'title', target: 'text' }] },
    };
    const extended: DocumentFile = {
      version: 1,
      id: 'extended',
      name: 'Extended',
      kind: 'component',
      schemaUse: {
        fields: [
          { name: 'payload', type: { kind: 'schema', schemaId: 'choice' } },
          { name: 'label', type: { kind: 'type', type: 'string' } },
        ],
      },
      root: { id: 'root', type: 'text', bindings: [{ field: 'label', target: 'text' }] },
    };
    const { ui } = generateReact({ documents: [shared, extended], schemaCatalog });
    expect(source(ui, 'types/ChoiceSchema.ts')).toContain('import type { SharedSchema }');
    expect(source(ui, 'types/ChoiceSchema.ts')).toContain("'enabled': boolean");
    expect(source(ui, 'types/ChoiceSchema.ts')).toContain('& (SharedSchema |');
    expect(componentTypes(ui, 'Assigned')).toContain("extends Pick<SharedSchema, 'title'>");
    expect(componentTypes(ui, 'Assigned')).toContain('count?: number;');
    expect(componentTypes(ui, 'Extended')).toContain('payload?: ChoiceSchema;');
    expect(componentTypes(ui, 'Extended')).toContain('label?: string;');
    expectGeneratedTypecheck([
      ...ui,
      {
        path: 'schema-check.ts',
        contents: `
import type { ChoiceSchema, AssignedProps, ExtendedData } from './index';
const choice: ChoiceSchema = { enabled: true, title: 'Title', count: 2 };
const assigned: AssignedProps = { title: 'Default count' };
const extended: ExtendedData = { label: 'Local field', payload: choice };
// @ts-expect-error shared required field must stay required
const invalid: AssignedProps = {};
// @ts-expect-error composition must retain root requirements
const invalidChoice: ChoiceSchema = { title: 'Title', count: 2 };
export { assigned, extended, invalid, invalidChoice };
`,
      },
    ]);
  });

  it('keeps root Switch case and payload types correlated', () => {
    const card: DocumentFile = {
      version: 1,
      id: 'case-card',
      name: 'Card',
      kind: 'component',
      fields: [{ name: 'title', type: 'text', required: true }],
      root: { id: 'root', type: 'text', bindings: [{ field: 'title', target: 'text' }] },
    };
    const textarea: DocumentFile = {
      version: 1,
      id: 'case-textarea',
      name: 'Textarea',
      kind: 'component',
      fields: [{ name: 'value', type: 'text', required: true }],
      root: { id: 'root', type: 'text', bindings: [{ field: 'value', target: 'text' }] },
    };
    const document: DocumentFile = {
      version: 1,
      id: 'case-switch',
      name: 'Case switch',
      kind: 'component',
      root: {
        id: 'root',
        type: 'switch',
        children: [
          { id: 'card', type: 'instance', component: card.id, switchCase: 'A' },
          { id: 'textarea', type: 'instance', component: textarea.id, switchCase: 'B' },
        ],
      },
    };
    const { ui } = generateReact({ documents: [document, card, textarea] });
    expect(componentTypes(ui, 'CaseSwitch')).toContain('CaseCardItem | CaseTextareaItem');
    expectGeneratedTypecheck([
      ...ui,
      {
        path: 'case-check.ts',
        contents: `
import type { CaseSwitchData } from './index';
const card: CaseSwitchData = { props: { type: 'A', props: { title: 'Card' } } };
const textarea: CaseSwitchData = { props: { type: 'B', props: { value: 'Textarea' } } };
// @ts-expect-error case A requires the Card payload
const invalid: CaseSwitchData = { props: { type: 'A', props: { value: 'Textarea' } } };
export { card, textarea, invalid };
`,
      },
    ]);
    const runtime = generatedRuntime(ui);
    const component = runtime.load('components/CaseSwitch').CaseSwitch;
    const cardHtml: string = runtime.server.renderToStaticMarkup(
      runtime.react.createElement(component, { props: { type: 'A', props: { title: 'Card' } } }),
    );
    const textareaHtml: string = runtime.server.renderToStaticMarkup(
      runtime.react.createElement(component, {
        props: { type: 'B', props: { value: 'Textarea' } },
      }),
    );
    expect(cardHtml).toContain('data-component="case-card"');
    expect(cardHtml).not.toContain('data-component="case-textarea"');
    expect(textareaHtml).toContain('data-component="case-textarea"');
    expect(textareaHtml).not.toContain('data-component="case-card"');
  });

  it('preserves value types, required fields and authored fields named context', () => {
    const control: DocumentFile = {
      version: 1,
      id: 'shared-control',
      name: 'Shared control',
      kind: 'component',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'value', type: 'boolean' },
        { name: 'context', type: 'text' },
      ],
      events: [{ name: 'commit', payload: { value: 'boolean' } }],
      root: { id: 'root', type: 'text', bindings: [{ field: 'context', target: 'text' }] },
    };
    const { ui } = generateReact({ documents: [control] });
    expect(componentTypes(ui, 'SharedControl')).toContain('value?: boolean;');
    expect(componentTypes(ui, 'SharedControl')).toContain('label: string;');
    expect(componentSource(ui, 'SharedControl')).toContain('{contextField}');
    expectGeneratedTypecheck([
      ...ui,
      {
        path: 'contract-check.ts',
        contents: `import type { SharedControlProps } from './index';
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
export type ValueCheck = Assert<Equal<SharedControlProps['value'], boolean | undefined>>;
export type RequiredCheck = Assert<Equal<SharedControlProps['label'], string>>;
export type FieldCheck = Assert<Equal<SharedControlProps['contextField'], string | undefined>>;
export type CommitCheck = Assert<Equal<Parameters<NonNullable<SharedControlProps['onCommit']>>[0], { value: boolean }>>;
`,
      },
    ]);
  });

  it('passes context through wrappers and nested repeaters only to consumers', () => {
    const leaf: DocumentFile = {
      version: 1,
      id: 'context-leaf',
      name: 'Context leaf',
      kind: 'component',
      fields: [{ name: 'title', type: 'text' }],
      root: {
        id: 'root',
        type: 'text',
        bindings: [{ field: 'title', target: 'text' }],
        displayOn: { path: 'parent.item.props.title', truthy: true },
      },
    };
    const wrapper: DocumentFile = {
      version: 1,
      id: 'context-wrapper',
      name: 'Context wrapper',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'leaf', type: 'instance', component: leaf.id }],
      },
    };
    const group: DocumentFile = {
      version: 1,
      id: 'context-group',
      name: 'Context group',
      kind: 'component',
      root: {
        id: 'root',
        type: 'repeater',
        children: [{ id: 'wrapper', type: 'instance', component: wrapper.id }],
      },
    };
    const list: DocumentFile = {
      version: 1,
      id: 'context-list',
      name: 'Context list',
      kind: 'section',
      root: {
        id: 'root',
        type: 'repeater',
        children: [{ id: 'group', type: 'instance', component: group.id }],
      },
    };
    const { ui } = generateReact({ documents: [list, group, wrapper, leaf] });
    expect(componentSource(ui, 'ContextLeaf')).toContain('(context?.parent as any)');
    expect(componentSource(ui, 'ContextWrapper')).toContain('context={context}');
    expect(componentSource(ui, 'ContextGroup')).toContain('parent: context');
    expect(componentSource(ui, 'ContextList')).toContain('parent: context');
    expect(componentSource(ui, 'ContextList')).not.toContain('items={items}');
    expect(ui.some((file) => file.contents.includes('__facadeurRepeatScope'))).toBe(false);
    expectGeneratedTypecheck(ui);
  });

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
    expect(input).not.toContain('data-node');
    expect(input).toContain("from '../FormInput'");
    expect(input).toContain("className='Input__control'");
    expect(input).toContain('value={value}');
    expect(input).toContain('placeholder={placeholder}');
    expect(input).toContain('name={name}');
    expect(input).toContain('{label}');
  });

  it('composes sign-in from input and button overrides', () => {
    const signIn = componentSource(files, 'SignIn');
    expect(signIn).toContain("from '../Input'");
    expect(signIn).toContain("from '../Button'");
    expect(signIn).toContain("className='SignIn__email'");
    expect(signIn).toContain("label='Work email'");
    expect(signIn).toContain("value='ada@atelier.test'");
    expect(signIn).toContain("name='work-email'");
    expect(signIn).toContain("className='SignIn__continue'");
    expect(signIn).toContain("label='Continue'");
    expect(signIn).toContain("tone='primary'");
    expect(signIn).toContain("size='sm'");
    expect(signIn).toContain('placeholder={placeholder}');
  });

  it('renders a page as its section instance', () => {
    const page = componentSource(files, 'Specimen');
    expect(page).toContain("data-component='specimen'");
    expect(page).toContain('<SpecimenSection');
    expect(page).toContain("className='Specimen__specimen-section'");
    const section = componentSource(files, 'SpecimenSection');
    expect(section).toContain("tone='ghost'");
    expect(section).toContain('>Specimen<');
    expect(section).toContain("className='SpecimenSection__card-signin'");
  });

  it('compiles tokens, fonts, and style blocks to CSS', () => {
    const tokens = source(files, 'styles/tokens.css');
    expect(tokens).toContain('--color-blue-500:');
    expect(tokens).toContain('--font-sans:');
    expect(tokens).toContain('@import url("https://fonts.googleapis.com');
    const css = componentStyle(files, 'Button');
    expect(css).toContain('.root {');
    expect(css).toContain('background: var(--button-color-bg, var(--color-accent-default))');
    expect(css).toContain('font-family: var(--type-label--font-family)');
    expect(css).toContain('.root[data-variant-tone="ghost"]');
    expect(css).toContain('.root:hover');
    expect(css).toContain('.root:focus-visible');
    expect(css).toContain('.root:disabled');
    expect(css).toContain('@media (min-width: 768px)');
    expect(css).not.toContain('min-width: 375px');
    const formInputCss = componentStyle(files, 'FormInput');
    expect(formInputCss).toContain('.root {');
    const signInCss = componentStyle(files, 'SignIn');
    expect(signInCss).toContain('--input-color-border: var(--color-accent-default)');
    expect(css.indexOf('.root')).toBeLessThan(css.indexOf('@media (min-width: 768px)'));
  });

  it('sorts documents by id so the same catalog always matches', () => {
    const reversed = generateReact({
      documents: [...documents].reverse(),
      design,
      schemaCatalog: design.schemaCatalog,
    });
    expect(reversed.ui.map((file) => file.path)).toEqual(files.map((file) => file.path));
    expect(reversed.ui.map((file) => file.contents)).toEqual(files.map((file) => file.contents));
  });

  it('emits CSS Modules per component and imports them from the implementation', () => {
    const generated = generateReact({ documents: [documents[0]!] });
    expect(generated.ui.some((file) => file.path === 'styles/components.css')).toBe(false);
    expect(componentStyle(generated.ui, 'Button')).toContain('.root {');
    expect(componentSource(generated.ui, 'Button')).toContain(
      "import styles from './style.module.css'",
    );
    expect(source(generated.ui, 'components/Button/index.ts')).toContain(
      "export { Button } from './component'",
    );
    expect(componentStyle(generated.ui, 'Button')).not.toContain('data-component="card"');
    const rootIndex = source(generated.ui, 'index.ts');
    expect(rootIndex).toContain('/// <reference path="./css-modules.d.ts" />');
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
      'contracts.ts',
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
    expect(sourceText).toContain('className={styles[');
    expect(sourceText).toMatch(/<Input[\s\S]*?className='SignIn__email'/);
    expect(sourceText).not.toContain('data-node');
    expect(sourceText).not.toContain('nodeId');
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
    const { stories } = generateReact({ documents, design, schemaCatalog: design.schemaCatalog });
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
      'src/stories/generated/NewSection.stories.tsx',
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

  it('renders the new-section story with typed mixed items and no Facadeur runtime', () => {
    const section = documents.find((document) => document.id === 'new-section')!;
    const original = structuredClone(section);
    const generated = generateReact({ documents, design, schemaCatalog: design.schemaCatalog });
    const runtime = generatedRuntime([...generated.ui, ...generated.stories]);
    const meta = runtime.load('src/stories/generated/NewSection.stories.tsx').default as {
      component: unknown;
      args: { items: { type: string; props: unknown }[] };
    };
    expect(meta.args.items.map((item) => item.type)).toEqual(['textarea', 'card', 'textarea']);
    expect(meta.args.items.map((item) => item.props)).toEqual(section.previewData?.fields?.items);
    const html: string = runtime.server.renderToStaticMarkup(
      runtime.react.createElement(meta.component, meta.args),
    );
    expect(html.match(/data-component="textarea"/g)).toHaveLength(2);
    expect(html.match(/data-component="card"/g)).toHaveLength(1);
    expect(html).toContain('33333333333');
    expect(html).toContain('rows="5"');
    expect(html).toContain('>111</textarea>');
    expect(section).toEqual(original);
    expect(componentStyle(generated.ui, 'NewSection')).not.toMatch(/\.[\w-]+\s*\{\s*\}/);
    const empty: string = runtime.server.renderToStaticMarkup(
      runtime.react.createElement(meta.component, { items: [] }),
    );
    expect(empty).not.toContain('data-component="card"');
    const unknown: string = runtime.server.renderToStaticMarkup(
      runtime.react.createElement(meta.component, { items: [{ type: 'unknown', props: {} }] }),
    );
    expect(unknown).not.toContain('data-component="card"');
    expect(unknown).not.toContain('data-component="textarea"');
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
    const generated = generateReact({ documents, design, schemaCatalog: design.schemaCatalog }).ui;
    const formToggle = componentSource(generated, 'FormToggle');
    expect(componentTypes(generated, 'FormToggle')).toContain('value?: string;');
    expect(formToggle).not.toContain('data-node');
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
      /\[styles\["root"\], 'card', className\]\.filter\(Boolean\)\.join\(' '\)/,
    );

    const wrapper = componentSource(files, 'Host');
    expect(wrapper).toContain("className='Host__note'");
    expect(wrapper).toContain("workEmail='bea@example.com'");
    expect(wrapper).toContain('open={false}');
    expect(wrapper).toContain("density='compact'");
    expect(wrapper).toContain("data-component='missing'");
    expect(wrapper).toContain("'ds-unknown'].join(' ')");
    expect(wrapper).not.toContain('nodeId');
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
        children: [
          {
            id: 'control',
            type: 'instance',
            component: control.id,
            forwardFields: false,
          },
        ],
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

describe('structural node output', () => {
  it('generates transparent mixed-component repeaters with typed union items', () => {
    const repeater: DocumentFile = {
      version: 1,
      id: 'mixed-repeater',
      name: 'Mixed repeater',
      kind: 'component',
      root: {
        id: 'root',
        type: 'repeater',
        children: [
          {
            id: 'choice',
            type: 'switch',
            children: [
              {
                id: 'card',
                type: 'instance',
                component: 'mixed-card',
                switchCase: 'primary',
              },
              { id: 'badge', type: 'instance', component: 'mixed-badge' },
              {
                id: 'card-copy',
                type: 'instance',
                component: 'mixed-card-copy',
                switchCase: 'secondary',
              },
            ],
          },
        ],
      },
    };
    const card: DocumentFile = {
      version: 1,
      id: 'mixed-card',
      name: 'Mixed card',
      kind: 'component',
      schemaUse: { direct: { kind: 'schema', schemaId: 'CardData' } },
      root: {
        id: 'root',
        type: 'text',
        tag: 'article',
        bindings: [{ field: 'title', target: 'text' }],
      },
    };
    const badge: DocumentFile = {
      version: 1,
      id: 'mixed-badge',
      name: 'Mixed badge',
      kind: 'section',
      schemaUse: { direct: { kind: 'schema', schemaId: 'BadgeData' } },
      root: {
        id: 'root',
        type: 'text',
        tag: 'strong',
        bindings: [{ field: 'label', target: 'text' }],
      },
    };
    const cardCopy: DocumentFile = {
      ...card,
      id: 'mixed-card-copy',
      name: 'Mixed card copy',
    };
    const schemaCatalog = {
      schemas: [
        {
          id: 'CardData',
          name: 'Card data',
          schema: {
            type: 'object',
            properties: { type: { type: 'string', enum: ['card'] }, title: { type: 'string' } },
            required: ['type', 'title'],
            additionalProperties: false,
          },
        },
        {
          id: 'BadgeData',
          name: 'Badge data',
          schema: {
            type: 'object',
            properties: { type: { type: 'string', enum: ['badge'] }, label: { type: 'string' } },
            required: ['type', 'label'],
            additionalProperties: false,
          },
        },
      ],
    } as const;
    const files = generateReact({ documents: [repeater, card, cardCopy, badge], schemaCatalog }).ui;
    const types = componentTypes(files, 'MixedRepeater');
    const component = componentSource(files, 'MixedRepeater');

    expect(types).toContain('items: (');
    expect(types).toContain('props: MixedCardData;');
    expect(types).toContain('props: MixedBadgeData;');
    expect(types).toContain('items: (MixedCardItem | MixedBadgeItem | MixedCardCopyItem)[];');
    expect(componentTypes(files, 'MixedCard')).toContain('Pick<CardDataSchema');
    expect(component).not.toMatch(/from ['"]@facadeur\//);
    expect(component).toContain('<Fragment key={itemIndex}>');
    expect(component).toContain('switch (item.type)');
    expect(component).toContain("case 'primary':");
    expect(component).toContain("case 'secondary':");
    expect(component).toContain('default:');
    expect(component).toContain('return null;');
    expect(component).toContain('{...item.props}');
    expect(component).not.toContain('payloadSchema');
    expect(component).not.toContain('nodeId');
    expectGeneratedTypecheck(files);
  });

  it('preserves nested repeat parent scopes through generated component calls', () => {
    const page: DocumentFile = {
      version: 1,
      id: 'nested-repeat-codegen-page',
      name: 'Nested repeat codegen page',
      kind: 'page',
      fields: [
        {
          name: 'sections',
          type: 'array',
          items: {
            type: 'object',
            fields: [
              {
                name: 'props',
                type: 'object',
                items: { type: 'object', fields: [{ name: 'title', type: 'text' }] },
              },
              {
                name: 'rows',
                type: 'array',
                items: {
                  type: 'object',
                  fields: [
                    {
                      name: 'props',
                      type: 'object',
                      items: { type: 'object', fields: [{ name: 'title', type: 'text' }] },
                    },
                    {
                      name: 'values',
                      type: 'array',
                      items: {
                        type: 'object',
                        fields: [
                          {
                            name: 'props',
                            type: 'object',
                            items: { type: 'object', fields: [{ name: 'title', type: 'text' }] },
                          },
                        ],
                      },
                    },
                  ],
                },
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
            id: 'sections',
            type: 'frame',
            repeat: { path: 'sections', as: 'section' },
            children: [
              {
                id: 'rows',
                type: 'frame',
                repeat: { path: 'section.rows', as: 'row' },
                children: [
                  {
                    id: 'values',
                    type: 'frame',
                    repeat: { path: 'row.values', as: 'value' },
                    children: [
                      {
                        id: 'probe',
                        type: 'instance',
                        component: 'nested-repeat-codegen-probe',
                        fields: { title: 'Nested local title' },
                        fieldBindings: {
                          currentTitle: 'value.props.title',
                          rowTitle: 'parent.item.props.title',
                          sectionTitle: 'parent.parent.item.props.title',
                          currentIndex: 'index',
                          rowIndex: 'parent.index',
                          sectionIndex: 'parent.parent.index',
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const probe: DocumentFile = {
      version: 1,
      id: 'nested-repeat-codegen-probe',
      name: 'Nested repeat codegen probe',
      kind: 'component',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'currentTitle', type: 'text' },
        { name: 'rowTitle', type: 'text' },
        { name: 'sectionTitle', type: 'text' },
        { name: 'currentIndex', type: 'number' },
        { name: 'rowIndex', type: 'number' },
        { name: 'sectionIndex', type: 'number' },
      ],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'nested-props',
            type: 'instance',
            component: 'nested-repeat-codegen-probe-leaf',
            fieldBindings: { observed: 'props.title' },
          },
        ],
      },
    };
    const probeLeaf: DocumentFile = {
      version: 1,
      id: 'nested-repeat-codegen-probe-leaf',
      name: 'Nested repeat codegen probe leaf',
      kind: 'atom',
      fields: [{ name: 'observed', type: 'text' }],
      root: {
        id: 'root',
        type: 'text',
        bindings: [{ field: 'observed', target: 'text' }],
      },
    };

    const { ui: files } = generateReact({ documents: [page, probe, probeLeaf] });
    const source = componentSource(files, 'NestedRepeatCodegenPage');
    const probeSource = componentSource(files, 'NestedRepeatCodegenProbe');

    expect(source).toContain(')?.parent?.item?.props?.title');
    expect(source).toContain('parent: { item: section, index: sectionIndex');
    expect(source).toContain('item?.props?.title');
    expect(source).toContain('currentIndex={valueIndex}');
    expect(probeSource).toContain('observed={title}');
    expect(probeSource).toContain('  title,');
    expect(probeSource).not.toContain('  currentTitle,');
    expectGeneratedTypecheck(files);
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
      "childFields2={{ 'section-part': { 'title': 'Local title' }, 'section-part/control': { 'value': 'Deep value' } }}",
    );
    expect(fieldTypes).toContain('childFields?: string;');
    expect(fieldTypes).toContain('childFields2?: Record<string, Record<string, unknown>>;');
    expect(fieldSource).toContain("childFields2?.['section-part']?.title");
    expect(fieldSource).toContain('childFields2={{ ...');
    expect(sectionSource).toContain('childFields2?.control?.value');
    expect(sectionTypes).toContain('childFields?: string;');
    expect(sectionTypes).toContain('childFields2?: Record<string, Record<string, unknown>>;');
    expectGeneratedTypecheck(files);
  });
});

describe('nested component field forwarding', () => {
  const child: DocumentFile = {
    version: 1,
    id: 'forwarded-child',
    name: 'Forwarded child',
    kind: 'component',
    fields: [{ name: 'label', type: 'text', default: 'Child default' }],
    root: { id: 'root', type: 'text', bindings: [{ field: 'label', target: 'text' }] },
  };

  function generateParent(
    instance: Extract<NestedNode, { type: 'instance' }>,
    fields: NonNullable<DocumentFile['fields']> = [],
    childDocument: DocumentFile = child,
  ): { source: string; types: string } {
    const parent: DocumentFile = {
      version: 1,
      id: 'forwarding-parent',
      name: 'Forwarding parent',
      kind: 'component',
      fields,
      root: { id: 'root', type: 'frame', children: [instance] },
    };
    const generated = generateReact({ documents: [parent, childDocument] });
    return {
      source: componentSource(generated.ui, 'ForwardingParent'),
      types: componentTypes(generated.ui, 'ForwardingParent'),
    };
  }

  it('forwards matching public fields by default', () => {
    const generated = generateParent({
      id: 'child-instance',
      type: 'instance',
      component: child.id,
    });

    expect(generated.source).toContain('label={label}');
    expect(generated.types).toContain('label?: string;');
  });

  it('does not implicitly forward matching fields when disabled', () => {
    const generated = generateParent({
      id: 'child-instance',
      type: 'instance',
      component: child.id,
      forwardFields: false,
    });

    expect(generated.source).not.toContain('label={label}');
    expect(generated.types).not.toContain('label?: string;');
  });

  it('provides required child fields through the generated parent contract by default', () => {
    const requiredChild: DocumentFile = {
      ...child,
      id: 'required-forwarded-child',
      name: 'Required forwarded child',
      fields: [{ name: 'label', type: 'text', required: true }],
    };
    const generated = generateParent(
      { id: 'child-instance', type: 'instance', component: requiredChild.id },
      [],
      requiredChild,
    );

    expect(generated.source).toContain('label={label}');
    expect(generated.types).toContain('label: string;');
  });

  it('keeps explicit field bindings ahead of same-name forwarding', () => {
    const generated = generateParent(
      {
        id: 'child-instance',
        type: 'instance',
        component: child.id,
        fieldBindings: { label: 'source' },
      },
      [
        { name: 'label', type: 'boolean' },
        { name: 'source', type: 'text' },
      ],
    );

    expect(generated.source).toContain('label={source}');
    expect(generated.source).not.toContain('label={label}');
    expect(generated.types).toContain('label?: string;');
    expect(generated.types).not.toContain('label?: boolean;');
  });

  it('keeps an explicit instance value ahead of same-name forwarding', () => {
    const generated = generateParent(
      {
        id: 'child-instance',
        type: 'instance',
        component: child.id,
        fields: { label: 'Local label' },
      },
      [{ name: 'label', type: 'boolean' }],
    );

    expect(generated.source).toContain("label='Local label'");
    expect(generated.source).not.toContain('label={label}');
    expect(generated.types).toContain('label?: string;');
    expect(generated.types).not.toContain('label?: boolean;');
  });

  it('places an auto-forwarded duplicate after local fields and uses the child spec', () => {
    const childWithShared: DocumentFile = {
      ...child,
      id: 'forwarded-shared-child',
      name: 'Forwarded shared child',
      fields: [{ name: 'shared', type: 'text', default: 'Child value' }],
      root: {
        id: 'root',
        type: 'text',
        bindings: [{ field: 'shared', target: 'text' }],
      },
    };
    const generated = generateParent(
      { id: 'child-instance', type: 'instance', component: childWithShared.id },
      [
        { name: 'shared', type: 'boolean', default: false },
        { name: 'local', type: 'text', default: 'Local value' },
      ],
      childWithShared,
    );

    expect(generated.types).toContain('shared?: string;');
    expect(generated.types).not.toContain('shared?: boolean;');
    expect(generated.types.indexOf('local?: string;')).toBeLessThan(
      generated.types.indexOf('shared?: string;'),
    );
  });

  it('uses the latest auto-forwarded spec when child extensions share a field name', () => {
    const firstChild: DocumentFile = {
      ...child,
      id: 'first-shared-child',
      name: 'First shared child',
      fields: [{ name: 'shared', type: 'boolean', default: false }],
      root: {
        id: 'root',
        type: 'text',
        bindings: [{ field: 'shared', target: 'text' }],
      },
    };
    const lastChild: DocumentFile = {
      ...child,
      id: 'last-shared-child',
      name: 'Last shared child',
      fields: [{ name: 'shared', type: 'text', default: 'Last value' }],
      root: {
        id: 'root',
        type: 'text',
        bindings: [{ field: 'shared', target: 'text' }],
      },
    };
    const parent: DocumentFile = {
      version: 1,
      id: 'ordered-extension-parent',
      name: 'Ordered extension parent',
      kind: 'component',
      fields: [{ name: 'local', type: 'text', default: 'Local value' }],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          { id: 'first', type: 'instance', component: firstChild.id },
          { id: 'last', type: 'instance', component: lastChild.id },
        ],
      },
    };
    const generated = generateReact({ documents: [parent, firstChild, lastChild] });
    const types = componentTypes(generated.ui, 'OrderedExtensionParent');

    expect(types).toContain('shared?: string;');
    expect(types).not.toContain('shared?: boolean;');
    expect(types.indexOf('local?: string;')).toBeLessThan(types.indexOf('shared?: string;'));
  });

  it('propagates inherited fields through nested component contracts', () => {
    const leaf: DocumentFile = {
      ...child,
      id: 'forwarded-leaf',
      name: 'Forwarded leaf',
    };
    const middle: DocumentFile = {
      version: 1,
      id: 'forwarded-middle',
      name: 'Forwarded middle',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'leaf', type: 'instance', component: leaf.id }],
      },
    };
    const parent: DocumentFile = {
      version: 1,
      id: 'forwarded-outer',
      name: 'Forwarded outer',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'middle', type: 'instance', component: middle.id }],
      },
    };
    const generated = generateReact({ documents: [parent, middle, leaf] });

    expect(componentTypes(generated.ui, 'ForwardedMiddle')).toContain('label?: string;');
    expect(componentTypes(generated.ui, 'ForwardedOuter')).toContain('label?: string;');
    expect(componentSource(generated.ui, 'ForwardedMiddle')).toContain('label={label}');
    expect(componentSource(generated.ui, 'ForwardedOuter')).toContain('label={label}');
  });

  it('propagates explicitly exposed child fields through auto-forwarding contracts', () => {
    const middle: DocumentFile = {
      version: 1,
      id: 'forwarded-exposed-middle',
      name: 'Forwarded exposed middle',
      kind: 'component',
      expose: { fields: { caption: 'leaf.label' } },
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'leaf', type: 'instance', component: child.id }],
      },
    };
    const parent: DocumentFile = {
      version: 1,
      id: 'forwarded-exposed-outer',
      name: 'Forwarded exposed outer',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'middle', type: 'instance', component: middle.id }],
      },
    };
    const generated = generateReact({ documents: [parent, middle, child] });

    expect(componentTypes(generated.ui, 'ForwardedExposedMiddle')).toContain('caption?: string;');
    expect(componentTypes(generated.ui, 'ForwardedExposedOuter')).toContain('caption?: string;');
  });
});

describe('atom contracts', () => {
  it('uses data bindings for generated inputs while keeping static values preview-only', () => {
    const child: DocumentFile = {
      version: 1,
      id: 'bound-preview-child',
      name: 'Bound preview child',
      kind: 'atom',
      fields: [{ name: 'label', type: 'text' }],
      root: {
        id: 'root',
        type: 'text',
        bindings: [{ field: 'label', target: 'text' }],
      },
    };
    const parent: DocumentFile = {
      version: 1,
      id: 'bound-preview-parent',
      name: 'Bound preview parent',
      kind: 'component',
      fields: [{ name: 'source', type: 'text' }],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'child',
            type: 'instance',
            component: child.id,
            fields: { label: 'Local preview' },
            fieldBindings: { label: 'source' },
          },
        ],
      },
    };

    const generated = generateReact({ documents: [parent, child] });
    const sourceText = componentSource(generated.ui, 'BoundPreviewParent');
    expect(sourceText).toContain('label={source}');
    expect(sourceText).not.toContain('label="Local preview"');
  });

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
    expect(sourceText).toContain('styles["badge"]');
    expect(sourceText).toContain('styles["label"]');
    expect(sourceText.match(/styles\["body"\]/g)).toHaveLength(1);

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
              { name: 'label', type: 'text', required: true },
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
    expect(sourceText).toContain('(items ?? []).map((item, itemIndex) => (');
    expect(sourceText).toContain('key={item?.id ?? itemIndex}');
    expect(sourceText).toContain("item?.kind === 'input'");
    expect(sourceText).toContain("import { RepeatRow } from '../RepeatRow';");
    expect(sourceText).toContain('label={item?.label}');
    expectGeneratedTypecheck(generated.ui);
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
    const generated = generateReact({ documents: [component, row] });
    const sourceText = componentSource(generated.ui, 'NestedRepeatDemo');
    expect(sourceText).toContain('(sections ?? []).map((section, sectionIndex) => (');
    expect(sourceText).toContain('{(section?.rows ?? []).map((row, rowIndex) => (');
    expect(sourceText).toContain('key={row?.label ?? rowIndex}');
    expect(sourceText).toContain('label={row?.label}');
    expectGeneratedTypecheck(generated.ui);
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

    const generated = generateReact({ documents: [component, row] });
    const sourceText = componentSource(generated.ui, 'HyphenatedRepeatDemo');
    expect(sourceText).toContain('(formFields ?? []).map((formField, formFieldIndex) => (');
    expect(sourceText).toContain("key={formField?.['field-id'] ?? formFieldIndex}");
    expect(sourceText).toContain("formField?.kind === 'input'");
    expect(sourceText).toContain("label={formField?.['field-id']}");
    expectGeneratedTypecheck(generated.ui);
  });
});
