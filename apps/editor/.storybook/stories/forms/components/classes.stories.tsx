import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ChipsField } from '@facadeur/form';

const meta = {
  title: 'Forms/Components/Classes',
  component: ChipsField,
  args: {
    id: 'storybook-classes',
    name: 'classes',
    label: 'CSS classes',
    suggestions: ['flex', 'grid', 'gap-4', 'p-4', 'rounded-lg', 'text-sm'],
    value: [],
    onChange: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="eu-form" style={{ maxWidth: 360, padding: 16 }}>
        <label htmlFor="storybook-classes">CSS classes</label>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChipsField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <ChipsField {...args} value={value} onChange={setValue} />;
  },
};

export const WithClasses: Story = {
  args: { value: ['flex', 'gap-4', 'rounded-lg'] },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <ChipsField {...args} value={value} onChange={setValue} />;
  },
};

export const Disabled: Story = {
  args: { value: ['grid', 'p-4'], disabled: true },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <ChipsField {...args} value={value} onChange={setValue} />;
  },
};
