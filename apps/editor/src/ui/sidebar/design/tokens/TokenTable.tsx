import type { ReactNode } from 'react';

export interface TokenTableItem {
  path: string;
  valueText: string;
}

export function naturalTokenCompare(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

export function tokenMatchesQuery(item: TokenTableItem, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return `${item.path}\n${item.valueText}`.toLocaleLowerCase().includes(needle);
}

export function TokenTableToolbar({
  query,
  onQueryChange,
  count,
  total,
  context,
  addAction,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  count: number;
  total: number;
  context?: string;
  addAction: ReactNode;
}) {
  return (
    <div className="token-table-toolbar">
      {context ? <span className="token-table-context">{context}</span> : null}
      <label className="token-table-search">
        <span>Search tokens</span>
        <input
          name="token-filter"
          type="search"
          value={query}
          placeholder="Search names or values"
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <span className="token-table-count" role="status">
        {count} of {total} tokens
      </span>
      {addAction}
    </div>
  );
}

export function TokenTable({ children }: { children: ReactNode }) {
  return (
    <div className="token-table-scroll">
      <table className="token-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Preview</th>
            <th scope="col">Value / reference</th>
            <th scope="col">Status</th>
            <th scope="col" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function TokenTableGroup({
  path,
  label,
  count,
  open,
  onToggle,
  children,
}: {
  path: string;
  label?: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <tr className="token-table-group">
        <th colSpan={5} scope="rowgroup">
          <button
            type="button"
            className="token-table-group-toggle"
            aria-expanded={open}
            onClick={onToggle}
          >
            <span aria-hidden="true">{open ? '▾' : '▸'}</span>
            <span>{label ?? path}</span>
            <small>{count}</small>
          </button>
        </th>
      </tr>
      {open ? children : null}
    </>
  );
}
