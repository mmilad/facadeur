import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Form } from '@facadeur/form';
import type { FormFieldConfig } from '@facadeur/form';
import styles from './form.stories.module.css';

const textFields = [
  { type: 'text', name: 'name', label: 'Name', placeholder: 'Enter a name' },
  { type: 'textarea', name: 'description', label: 'Description', rows: 4 },
] satisfies readonly FormFieldConfig[];

function TextForm() {
  const [value, setValue] = useState({ name: 'Teaser', description: 'A short description.' });

  return <FormPlayground value={value} fields={textFields} onChange={setValue} />;
}

const fieldTypeFields = [
  { type: 'text', name: 'title', label: 'Title', placeholder: 'A card title' },
  { type: 'number', name: 'columns', label: 'Columns', min: 1, max: 12 },
  { type: 'boolean', name: 'featured', label: 'Featured' },
  {
    type: 'select',
    name: 'category',
    label: 'Category',
    options: [
      { value: 'layout', label: 'Layout' },
      { value: 'content', label: 'Content' },
    ],
  },
  {
    type: 'select',
    name: 'variant',
    label: 'Variant',
    optionsFrom: {
      arg: 'category',
      values: {
        layout: [
          { value: 'grid', label: 'Grid' },
          { value: 'stack', label: 'Stack' },
        ],
        content: [
          { value: 'article', label: 'Article' },
          { value: 'teaser', label: 'Teaser' },
        ],
      },
    },
  },
  {
    type: 'combobox',
    name: 'font',
    label: 'Font',
    options: [
      { value: 'sans', label: 'Sans serif' },
      { value: 'serif', label: 'Serif' },
      { value: 'mono', label: 'Monospace' },
    ],
  },
  { type: 'search', name: 'query', label: 'Search', placeholder: 'Search items' },
  {
    type: 'chips',
    name: 'classes',
    label: 'CSS classes',
    suggestions: ['flex', 'grid', 'gap-4', 'p-4', 'rounded-lg', 'text-sm'],
  },
  { type: 'color', name: 'accent', label: 'Accent color' },
] satisfies readonly FormFieldConfig[];

function FieldTypesForm() {
  const [value, setValue] = useState({
    title: 'Design with confidence',
    columns: 3,
    featured: true,
    category: 'layout',
    variant: 'grid',
    font: 'sans',
    query: '',
    classes: ['flex', 'gap-4'],
    accent: '#a64020',
  });

  return <FormPlayground value={value} fields={fieldTypeFields} onChange={setValue} />;
}

const nestedFields = [
  {
    type: 'object',
    name: 'author',
    label: 'Author',
    fields: [
      { type: 'text', name: 'name', label: 'Name' },
      { type: 'search', name: 'email', label: 'Email' },
    ],
  },
  {
    type: 'repeater',
    name: 'links',
    label: 'Links',
    itemLabel: 'Link',
    createItem: { label: '', url: '' },
    itemFields: [
      { type: 'text', name: 'label', label: 'Label' },
      { type: 'text', name: 'url', label: 'URL', placeholder: 'https://' },
    ],
  },
] satisfies readonly FormFieldConfig[];

function NestedForm() {
  const [value, setValue] = useState({
    author: { name: 'Avery Chen', email: 'avery@example.com' },
    links: [{ label: 'Documentation', url: 'https://example.com/docs' }],
  });

  return <FormPlayground value={value} fields={nestedFields} onChange={setValue} />;
}

const visualLayoutFields = [
  { type: 'text', name: 'title', label: 'Title' },
  {
    type: 'layout',
    fields: [
      { type: 'text', name: 'firstName', label: 'First name' },
      { type: 'text', name: 'lastName', label: 'Last name' },
    ],
  },
  { type: 'textarea', name: 'summary', label: 'Summary', rows: 3 },
] satisfies readonly FormFieldConfig[];

function VisualLayoutForm() {
  const [value, setValue] = useState({
    title: 'Profile',
    firstName: 'Avery',
    lastName: 'Chen',
    summary: 'The layout groups fields visually while keeping their values flat.',
  });

  return <FormPlayground value={value} fields={visualLayoutFields} onChange={setValue} />;
}

function FormPlayground<T extends Record<string, unknown>>({
  value,
  fields,
  onChange,
}: {
  value: T;
  fields: readonly FormFieldConfig[];
  onChange: (next: T) => void;
}) {
  return (
    <div className={styles.playground}>
      <section className={styles.panel}>
        <h2 className={styles.heading}>Fields</h2>
        <Form<T> value={value} fields={fields} onChange={(next) => onChange(next)} />
      </section>
      <section className={styles.panel}>
        <h2 className={styles.heading}>Value</h2>
        <pre className={styles.value}>{JSON.stringify(value, null, 2)}</pre>
      </section>
    </div>
  );
}

const meta = {
  title: 'Forms/Form',
  component: TextForm,
} satisfies Meta<typeof TextForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = {};
export const FieldTypes: Story = { render: () => <FieldTypesForm /> };
export const NestedFields: Story = { render: () => <NestedForm /> };
export const Layout: Story = { render: () => <VisualLayoutForm /> };
