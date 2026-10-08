import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Field } from '../../../src/ui/form/components/feedback/Field';
import { TextInput } from '../../../src/ui/form/components/input/TextInput';
import { Form } from '../../../src/ui/form/Form';

function BasicForm() {
  const [value, setValue] = useState({ name: 'Teaser', tag: 'div' });
  return (
    <Form value={value} onChange={setValue}>
      <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
        <Field label="Name">
          <TextInput name="name" />
        </Field>
        <Field label="Tag">
          <TextInput name="tag" />
        </Field>
      </div>
    </Form>
  );
}

const meta = {
  title: 'Forms/Form',
  component: BasicForm,
} satisfies Meta<typeof BasicForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
