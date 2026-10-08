import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { KindBadge } from '../../../src/ui/shell/KindBadge';

function HeaderPreview() {
  return (
    <header className="topbar" style={{ position: 'static' }}>
      <div className="brand">facadeur</div>
      <div className="topbar-name">Teaser</div>
      <KindBadge kind="component" />
      <div className="topbar-spacer" />
      <span className="meta">Saved</span>
    </header>
  );
}

const meta = {
  title: 'Base/Header',
  component: HeaderPreview,
} satisfies Meta<typeof HeaderPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
