import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ResizableLeftRail } from '../../../src/ui/shell/ResizableLeftRail';

function LeftSidebarPreview() {
  return (
    <div style={{ height: 560, width: 280, border: '1px solid var(--border-subtle, #ddd)' }}>
      <ResizableLeftRail
        layers={
          <section style={{ padding: 12 }}>
            <h3>Layers</h3>
            <p>Hero</p>
            <p>Teaser</p>
          </section>
        }
        project={
          <section style={{ padding: 12 }}>
            <h3>Project</h3>
            <p>Pages</p>
            <p>Components</p>
          </section>
        }
      />
    </div>
  );
}

const meta = {
  title: 'Base/Left Sidebar',
  component: LeftSidebarPreview,
} satisfies Meta<typeof LeftSidebarPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
