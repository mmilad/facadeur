import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Form } from '../../../../src/ui/form/Form';
import { SchemaForm } from '../../../../src/ui/form/schema/SchemaForm';
import type { FieldConfig } from '../../../../src/ui/form/schema/field-config';

const fields: FieldConfig[] = [
  { type: 'text', name: 'title', label: 'Title', placeholder: 'Card title' },
  { type: 'textarea', name: 'description', label: 'Description' },
  {
    type: 'select',
    name: 'tone',
    label: 'Tone',
    options: [
      { value: 'neutral', label: 'Neutral' },
      { value: 'accent', label: 'Accent' },
    ],
  },
];

function PropertyFields() {
  const [value, setValue] = useState({
    title: 'A flexible teaser',
    description: 'Edit these fields to preview the property form.',
    tone: 'accent',
  });
  return (
    <Form value={value} onChange={setValue}>
      <div className="inspector" style={{ maxWidth: 420, padding: 16 }}>
        <SchemaForm fields={fields} />
      </div>
    </Form>
  );
}

const meta = {
  title: 'Forms/Components/Properties',
  component: PropertyFields,
} satisfies Meta<typeof PropertyFields>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SchemaFields: Story = {};
