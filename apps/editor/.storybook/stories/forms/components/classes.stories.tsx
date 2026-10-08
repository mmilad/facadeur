import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ClassListInput } from '../../../../src/ui/form/components/selection/ClassListInput';

const meta = {
  title: 'Forms/Components/Classes',
  component: ClassListInput,
  args: {
    label: 'CSS classes',
    suggestions: ['flex', 'grid', 'gap-4', 'p-4', 'rounded-lg', 'text-sm'],
    value: [],
    onChange: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="eu-form" style={{ maxWidth: 360, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ClassListInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <ClassListInput {...args} value={value} onChange={setValue} />;
  },
};

export const WithClasses: Story = {
  args: { value: ['flex', 'gap-4', 'rounded-lg'] },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <ClassListInput {...args} value={value} onChange={setValue} />;
  },
};

export const Disabled: Story = {
  args: { value: ['grid', 'p-4'], disabled: true },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <ClassListInput {...args} value={value} onChange={setValue} />;
  },
};
