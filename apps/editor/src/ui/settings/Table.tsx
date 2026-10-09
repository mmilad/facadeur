import type { CSSProperties, ReactNode } from 'react';
import { SearchField } from '@facadeur/form';
import './table.css';

export interface TableColumn {
  id: string;
  label?: ReactNode;
  ariaLabel?: string;
  visuallyHidden?: boolean;
  width?: string;
}

export interface TableGroup {
  id: string;
  label: ReactNode;
  rows: readonly TableRowData[];
  open: boolean;
  onToggle: () => void;
}

export interface TableRowData {
  id: string;
  cells: readonly ReactNode[];
  className?: string;
  cellClassNames?: readonly (string | undefined)[];
  dataAttributes?: Readonly<Record<string, string>>;
  details?: ReactNode;
  detailsClassName?: string;
  expanded?: boolean;
  toggleName?: string;
  onToggle?: () => void;
}

export interface TableProps {
  id: string;
  query: string;
  onQueryChange: (query: string) => void;
  searchLabel: string;
  searchPlaceholder: string;
  count: ReactNode;
  columns: readonly TableColumn[];
  rows?: readonly TableRowData[];
  groups?: readonly TableGroup[];
  context?: ReactNode;
  addAction?: ReactNode;
  emptyState?: ReactNode;
  tableClassName?: string;
}

export function Table({
  id,
  query,
  onQueryChange,
  searchLabel,
  searchPlaceholder,
  count,
  columns,
  rows,
  groups,
  context,
  addAction,
  emptyState,
  tableClassName,
}: TableProps) {
  console.log('Table', rows, groups);
  return (
    <section className="settings-table">
      <div className="settings-table-toolbar">
        {context ? <span className="settings-table-context">{context}</span> : null}
        <label className="settings-table-search">
          <span>{searchLabel}</span>
          <SearchField
            id={id}
            name={id}
            className="eu-control"
            value={query}
            placeholder={searchPlaceholder}
            onChange={onQueryChange}
          />
        </label>
        <span className="settings-table-count" role="status">
          {count}
        </span>
        {addAction}
      </div>
      {emptyState ? (
        emptyState
      ) : (
        <div className="settings-table-scroll">
          <table className={classNames('settings-table-table', tableClassName)}>
            <thead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    as="th"
                    className="settings-table-column-header"
                    scope="col"
                    aria-label={column.ariaLabel}
                    style={column.width ? { width: column.width } : undefined}
                  >
                    {column.visuallyHidden ? (
                      <span className="visually-hidden">{column.label}</span>
                    ) : (
                      column.label
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </thead>
            <tbody>
              {rows?.map((row) => (
                <TableDataRows key={row.id} row={row} columnCount={columns.length} />
              ))}
              {groups?.map((group) => (
                <TableGroupRow key={group.id} group={group} columnCount={columns.length} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TableGroupRow({ group, columnCount }: { group: TableGroup; columnCount: number }) {
  return (
    <>
      <TableRow className="settings-table-group">
        <TableCell
          as="th"
          className="settings-table-group-cell"
          colSpan={columnCount}
          scope="rowgroup"
        >
          <button
            type="button"
            className="settings-table-group-toggle"
            aria-expanded={group.open}
            onClick={group.onToggle}
          >
            <span aria-hidden="true">{group.open ? '▾' : '▸'}</span>
            <span>{group.label}</span>
          </button>
        </TableCell>
      </TableRow>
      {group.open
        ? group.rows.map((row) => (
            <TableDataRows key={row.id} row={row} columnCount={columnCount} />
          ))
        : null}
    </>
  );
}

function TableDataRows({ row, columnCount }: { row: TableRowData; columnCount: number }) {
  const hasDetails = row.details !== undefined;
  return (
    <>
      <TableRow className={row.className} dataAttributes={row.dataAttributes}>
        {row.cells.map((cell, index) => {
          const className = row.cellClassNames?.[index];
          if (index === 0) {
            return (
              <TableCell key={index} as="th" scope="row" className={className}>
                {hasDetails && row.onToggle ? (
                  <button
                    type="button"
                    className="settings-table-row-toggle"
                    name={row.toggleName}
                    aria-expanded={row.expanded}
                    onClick={row.onToggle}
                  >
                    <span aria-hidden="true">{row.expanded ? '▾' : '▸'}</span>
                    {cell}
                  </button>
                ) : (
                  cell
                )}
              </TableCell>
            );
          }
          return (
            <TableCell key={index} className={className}>
              {cell}
            </TableCell>
          );
        })}
      </TableRow>
      {hasDetails && row.expanded ? (
        <TableRow className={classNames('settings-table-details', row.detailsClassName)}>
          <TableCell colSpan={columnCount}>
            <div className="settings-table-details-content">{row.details}</div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

interface TableRowElementProps {
  children: ReactNode;
  className?: string;
  dataAttributes?: Readonly<Record<string, string>>;
}

function TableRow({ children, className, dataAttributes }: TableRowElementProps) {
  return (
    <tr className={classNames('settings-table-row', className)} {...dataAttributes}>
      {children}
    </tr>
  );
}

interface TableCellProps {
  as?: 'td' | 'th';
  children: ReactNode;
  className?: string;
  scope?: 'col' | 'row' | 'rowgroup';
  colSpan?: number;
  ariaLabel?: string;
  style?: CSSProperties;
}

function TableCell({
  as = 'td',
  children,
  className,
  scope,
  colSpan,
  ariaLabel,
  style,
}: TableCellProps) {
  const cellClassName = classNames('settings-table-cell', className);
  if (as === 'th') {
    return (
      <th
        className={cellClassName}
        scope={scope}
        colSpan={colSpan}
        aria-label={ariaLabel}
        style={style}
      >
        {children}
      </th>
    );
  }
  return (
    <td className={cellClassName} colSpan={colSpan} aria-label={ariaLabel} style={style}>
      {children}
    </td>
  );
}

function classNames(...names: (string | undefined)[]) {
  return names.filter(Boolean).join(' ');
}
