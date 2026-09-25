import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateCatalog, validateDocumentFile, type DocumentFile } from '@facadeur/core';
import { CodegenError, designFromDocument, generateReact } from '../src/index.js';
import { formatGenerated, readRepoFile } from '../src/format.js';

const examplesDir = fileURLToPath(new URL('../../../examples/', import.meta.url));

const componentFiles = [
  'button.json',
  'card.json',
  'input.json',
  'sign-in.json',
  'specimen-page.json',
  'specimen-section.json',
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

describe('generateReact', () => {
  const { documents, design } = loadCatalog();
  const files = generateReact({ documents, design });

  it('types button fields and variants and paints the instance selectors', () => {
    const button = source(files, 'components/Button.tsx');
    expect(button).toContain("export type ButtonTone = 'primary' | 'secondary' | 'ghost';");
    expect(button).toContain("export type ButtonSize = 'sm' | 'md';");
    expect(button).toContain('label?: string;');
    expect(button).toContain("label = 'Button'");
    expect(button).toContain("tone = 'primary'");
    expect(button).toContain("size = 'md'");
    expect(button).toContain("data-component='button'");
    expect(button).toContain('data-variant-tone={tone}');
    expect(button).toContain('data-variant-size={size}');
    expect(button).toContain("type='button'");
    expect(button).toContain('{label}');
  });

  it('binds input fields onto the control', () => {
    const input = source(files, 'components/Input.tsx');
    expect(input).toContain("data-component='input'");
    expect(input).toContain("data-node='label'");
    expect(input).toContain("data-node='control'");
    expect(input).toContain('readOnly');
    expect(input).toContain('tabIndex={-1}');
    expect(input).toContain("autoComplete='off'");
    expect(input).toContain('value={value}');
    expect(input).toContain('placeholder={placeholder}');
    expect(input).toContain('name={name}');
    expect(input).toContain('{label}');
  });

  it('composes sign-in from input and button overrides', () => {
    const signIn = source(files, 'components/SignIn.tsx');
    expect(signIn).toContain("from './Input'");
    expect(signIn).toContain("from './Button'");
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
    const page = source(files, 'components/Specimen.tsx');
    expect(page).toContain("data-component='specimen'");
    expect(page).toContain('<SpecimenSection');
    expect(page).toContain("nodeId='specimen-section'");
    const section = source(files, 'components/SpecimenSection.tsx');
    expect(section).toContain("tone='ghost'");
    expect(section).toContain('>Specimen<');
    expect(section).toContain("nodeId='card-signin'");
  });

  it('compiles tokens, fonts, and style blocks to CSS', () => {
    const tokens = source(files, 'styles/tokens.css');
    expect(tokens).toContain('--color-blue-500:');
    expect(tokens).toContain('--font-sans:');
    expect(tokens).toContain('@import url("https://fonts.googleapis.com');
    const css = source(files, 'styles/components.css');
    expect(css).toContain('[data-component="button"]');
    expect(css).toContain('background: var(--button-color-bg)');
    expect(css).toContain('font-family: var(--type-label--font-family)');
    expect(css).toContain('[data-component="button"][data-variant-tone="ghost"]');
    expect(css).toContain('[data-component="button"]:hover');
    expect(css).toContain('[data-component="button"]:focus-visible');
    expect(css).toContain('[data-component="button"]:disabled');
    expect(css).toContain('@media (min-width: 768px)');
    expect(css).not.toContain('min-width: 375px');
    expect(css).toContain('[data-component="input"] [data-node="control"]');
    expect(css).toContain('--input-color-border: var(--color-accent-default)');
    expect(css.indexOf('[data-component="button"]')).toBeLessThan(
      css.indexOf('@media (min-width: 768px)'),
    );
  });

  it('sorts documents by id so the same catalog always matches', () => {
    const reversed = generateReact({ documents: [...documents].reverse(), design });
    expect(reversed.map((file) => file.path)).toEqual(files.map((file) => file.path));
    expect(reversed.map((file) => file.contents)).toEqual(files.map((file) => file.contents));
  });

  it('matches the committed Next.js example', async () => {
    for (const file of files) {
      const formatted = await formatGenerated(file.path, file.contents);
      expect(readRepoFile(`examples/next/generated/${file.path}`)).toBe(formatted);
    }
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

  const files = generateReact({ documents: [host, note] });

  it('emits typed props, style bindings, and instance overrides', () => {
    const component = source(files, 'components/Note.tsx');
    expect(component).toContain("export type NoteDensity = 'compact' | 'comfy';");
    expect(component).toContain('workEmail?: string;');
    expect(component).toContain("workEmail = 'ada@example.com'");
    expect(component).toContain('count?: number;');
    expect(component).toContain('count = 2');
    expect(component).toContain('open?: boolean;');
    expect(component).toContain("tone?: 'info' | 'warn';");
    expect(component).toContain('classField?: string;');
    expect(component).toContain('data-variant-density={density}');
    expect(component).toContain('{workEmail}');
    expect(component).toContain('{count}');
    expect(component).toContain('hidden={open === false}');
    expect(component).toContain('src={photo}');
    expect(component).toContain('alt={tone}');
    expect(component).toContain('href={href}');
    expect(component).toContain('hidden={open}');
    expect(component).toContain("import type { CSSProperties } from 'react';");
    expect(component).toContain("'--tint': href");
    expect(component).toContain('as CSSProperties');
    expect(component).toContain("['card', className].filter(Boolean).join(' ')");

    const wrapper = source(files, 'components/Host.tsx');
    expect(wrapper).toContain("nodeId='note'");
    expect(wrapper).toContain("workEmail='bea@example.com'");
    expect(wrapper).toContain('open={false}');
    expect(wrapper).toContain("density='compact'");
    expect(wrapper).toContain("data-component='missing'");
    expect(wrapper).toContain("className='ds-unknown'");
    expect(wrapper).toContain('Unknown component: missing');
    expect(files.map((file) => file.path)[2]).toBe('components/Host.tsx');
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
});
