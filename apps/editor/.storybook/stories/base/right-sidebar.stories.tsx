import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ResizableInspector } from '../../../src/ui/shell/ResizableInspector';

function RightSidebarPreview() {
  return (
    <div style={{ height: 560, display: 'flex', justifyContent: 'flex-end' }}>
      <ResizableInspector>
        <section className="side-block side-block-grow inspector eu-form" aria-label="Inspector">
          <div className="side-scroll">
            <div className="inspector-context">
              <span className="inspector-context-kicker">Inspector</span>
              <strong className="inspector-context-title">Teaser</strong>
              <span className="inspector-context-meta">Selected node</span>
            </div>
          </div>
        </section>
      </ResizableInspector>
    </div>
  );
}

const meta = {
  title: 'Base/Right Sidebar',
  component: RightSidebarPreview,
} satisfies Meta<typeof RightSidebarPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inspector: Story = {};
