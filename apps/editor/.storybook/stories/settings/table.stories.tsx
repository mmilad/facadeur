import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Table, type TableGroup, type TableRowData } from '../../../src/ui/settings/Table';

const columns = [
  { id: 'name', label: 'Name', width: '30%' },
  { id: 'value', label: 'Value', width: '45%' },
  { id: 'status', label: 'Status', width: '25%' },
] as const;

const tokens = [
  { group: 'Color', name: 'Accent default', value: '#2563eb', status: 'Base' },
  { group: 'Color', name: 'Accent hover', value: '#1d4ed8', status: 'Base' },
  { group: 'Spacing', name: 'Space 2', value: '8px', status: 'Base' },
  { group: 'Spacing', name: 'Space 4', value: '16px', status: 'Base' },
];

function SettingsTableStory({ grouped }: { grouped: boolean }) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set(['Spacing']));
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tokens.filter((token) =>
      [token.group, token.name, token.value, token.status].some((value) =>
        value.toLowerCase().includes(needle),
      ),
    );
  }, [query]);
  const renderRow = (token: (typeof tokens)[number]): TableRowData => ({
    id: `${token.group}-${token.name}`,
    cells: [token.name, token.value, token.status],
  });
  const groups: TableGroup[] = [...new Set(visible.map((token) => token.group))].map((group) => ({
    id: group,
    label: group,
    open: !collapsed.has(group),
    onToggle: () =>
      setCollapsed((current) => {
        const next = new Set(current);
        if (next.has(group)) next.delete(group);
        else next.add(group);
        return next;
      }),
    rows: visible.filter((token) => token.group === group).map(renderRow),
  }));

  return (
    <div className="eu-form" style={{ maxWidth: 920, padding: 20 }}>
      <Table
        id="settings-table-search"
        query={query}
        onQueryChange={setQuery}
        searchLabel="Search tokens"
        searchPlaceholder="Search names or values"
        count={`${visible.length} of ${tokens.length} tokens`}
        columns={columns}
        context="Base viewport"
        addAction={<button type="button">Add token</button>}
        emptyState={visible.length === 0 ? <p>No tokens match.</p> : undefined}
        rows={!grouped ? visible.map(renderRow) : undefined}
        groups={grouped ? groups : undefined}
      />
    </div>
  );
}

const meta = {
  title: 'Settings/Table',
  component: Table,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rows: Story = {
  render: () => <SettingsTableStory grouped={false} />,
};

export const Groups: Story = {
  render: () => <SettingsTableStory grouped />,
};
