import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateCatalog, validateDocumentFile, type DocumentFile } from '@facadeur/core';
import { CodegenError, designFromDocument, generateReact } from '../src/index.js';
import { formatGenerated, readRepoFile } from '../src/format.js';

const examplesDir = fileURLToPath(new URL('../../../examples/', import.meta.url));

const componentFiles = [
  'button.json',
  'form-input.json',
  'card.json',
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

describe('generateReact', () => {
  const { documents, design } = loadCatalog();
  const { ui: files } = generateReact({ documents, design });

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
    expect(reversed.ui.map((file) => file.path)).toEqual(files.map((file) => file.path));
    expect(reversed.ui.map((file) => file.contents)).toEqual(files.map((file) => file.contents));
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
    expect(mediaStory).toContain("src: '/placeholder-media'");
  });

  it('generates a data-driven media switch with optional metadata', () => {
    const media = source(files, 'components/Media.tsx');
    expect(media).toContain("kind?: 'image' | 'video';");
    expect(media).toContain('src: string;');
    expect(media).toContain('alt?: string;');
    expect(media).toContain('ratio?: string;');
    expect(media).toContain("kind === 'video'");
    expect(media).toContain('<img');
    expect(media).toContain('<video');
    expect(media).toContain('src={src}');
  });

  it('keeps form control state data connected to the rendered control', () => {
    const formToggle = source(generateReact({ documents, design }).ui, 'components/FormToggle.tsx');
    expect(formToggle).toContain('value?: string;');
    expect(formToggle).toContain("data-node='state'");
    expect(formToggle).toContain('{value}');
  });

  it('generates the example form as a data-driven type switch', () => {
    const form = source(files, 'components/FormControlsSection.tsx');
    expect(form).toContain('formFields?:');
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
    const sourceText = source(generated.ui, 'components/FormInputAtom.tsx');
    expect(sourceText).toContain('value: string;');
    expect(sourceText).toContain('disabled?: boolean;');
    expect(sourceText).toContain('onCommit?: (payload: { value: string }) => void;');
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
    const sourceText = source(generated.ui, 'components/ControlWrapper.tsx');
    expect(sourceText).toContain('value?: string;');
    expect(sourceText).toContain('onCommit?: (payload: { value: string }) => void;');
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
    const sourceText = source(generated.ui, 'components/VariantDemo.tsx');
    expect(sourceText).toContain("export type VariantDemoVariant = 'default' | 'compact';");
    expect(sourceText).toContain('variant?: VariantDemoVariant;');
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
    const hostSource = source(
      generateReact({ documents: [host, component] }).ui,
      'components/VariantHost.tsx',
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

    const sourceText = source(
      generateReact({ documents: [component] }).ui,
      'components/OptionalVariantDefault.tsx',
    );
    expect(sourceText).toContain("title = variant === 'empty' ? undefined : 'Title'");
    expect(sourceText).toContain('title?: string;');
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
    const sourceText = source(generated.ui, 'components/RepeatDemo.tsx');
    expect(sourceText).toContain('{(items ?? []).map((item, itemIndex) => (');
    expect(sourceText).toContain('key={item?.id}');
    expect(sourceText).toContain("item?.kind === 'input'");
    expect(sourceText).toContain("import { RepeatRow } from './RepeatRow';");
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

    const sourceText = source(
      generateReact({ documents: [component] }).ui,
      'components/EnumArrayProps.tsx',
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

    const sourceText = source(
      generateReact({ documents: [component] }).ui,
      'components/NestedDefaultProps.tsx',
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
    const sourceText = source(
      generateReact({ documents: [component, row] }).ui,
      'components/NestedRepeatDemo.tsx',
    );
    expect(sourceText).toContain('{(sections ?? []).map((section, sectionIndex) => (');
    expect(sourceText).toContain('{(section?.rows ?? []).map((row, rowIndex) => (');
    expect(sourceText).toContain('key={row?.label}');
    expect(sourceText).toContain('label={row?.label}');
  });
});
