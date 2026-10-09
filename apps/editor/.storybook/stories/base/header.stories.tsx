import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { KindBadge } from '../../../src/ui/shell/KindBadge';
import { EditorSubnav } from '../../../src/ui/shell/EditorSubnav';
import type { EditorSurface } from '../../../src/ui/sidebar/design/design-domain';

function HeaderPreview() {
  const [surface, setSurface] = useState<EditorSurface>('editor');

  return (
    <div>
      <header className="topbar" style={{ position: 'static' }}>
        <div className="brand">facadeur</div>
        <div className="topbar-name">Teaser</div>
        <KindBadge kind="component" />
        <div className="topbar-spacer" />
        <span className="meta">Saved</span>
      </header>
      <EditorSubnav surface={surface} onSelectSurface={setSurface} />
    </div>
  );
}

const meta = {
  title: 'Base/Header',
  component: HeaderPreview,
} satisfies Meta<typeof HeaderPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
