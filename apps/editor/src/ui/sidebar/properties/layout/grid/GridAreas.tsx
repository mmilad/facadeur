import { useState } from 'react';
import { Field, Stack } from '../../../../form/index';
import '../../../../form/form.css';
import { parseGridAreas, renameGridArea, serializeGridAreas } from './areas';
import './grid-areas.css';

export interface GridAreasProps {
  value: string;
  onCommit: (value: string | null) => void;
  onRename: (oldName: string, newName: string) => void;
  overridden?: boolean;
}

const maxRasterSize = 20;

/** A new controlled source discards the previous context's unapplied draft. */
export function GridAreas(props: GridAreasProps) {
  return <GridAreasDraft key={props.value} {...props} />;
}

function GridAreasDraft({ value, onCommit, onRename, overridden }: GridAreasProps) {
  const parsed = parseGridAreas(value);
  const oversized =
    parsed.rows.length > maxRasterSize || parsed.rows.some((row) => row.length > maxRasterSize);
  const [rows, setRows] = useState(() => (parsed.rows.length ? parsed.rows : [['.']]));
  const [error, setError] = useState(parsed.error);
  const [renames, setRenames] = useState<Record<string, string>>({});
  const editCell = (y: number, x: number, next: string) => {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === y ? row.map((cell, columnIndex) => (columnIndex === x ? next : cell)) : row,
      ),
    );
    setError(undefined);
  };
  return (
    <Field label="Grid areas">
      <Stack gap={8}>
        <span className="eu-field__hint">
          Apply edits the current variant and viewport. Rename also updates directly assigned
          children in this context only; other templates are unchanged.
        </span>
        {parsed.editable && !oversized ? (
          <>
            <div className="grid-areas-raster" role="group" aria-label="Area raster">
              {rows.map((row, y) => (
                <div className="grid-areas-raster__row" key={y}>
                  {row.map((cell, x) => (
                    <input
                      key={x}
                      className="eu-control"
                      aria-label={`Area row ${y + 1} column ${x + 1}`}
                      value={cell}
                      onChange={(event) => editCell(y, x, event.target.value)}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="grid-areas-actions">
              <button
                type="button"
                className="text-button"
                disabled={rows.length >= maxRasterSize}
                onClick={() => {
                  setRows((current) => [
                    ...current,
                    Array<string>(Math.max(1, current[0]?.length ?? 1)).fill('.'),
                  ]);
                  setError(undefined);
                }}
              >
                Add area row
              </button>
              <button
                type="button"
                className="text-button"
                disabled={rows.some((row) => row.length >= maxRasterSize)}
                onClick={() => {
                  setRows((current) => current.map((row) => [...row, '.']));
                  setError(undefined);
                }}
              >
                Add area column
              </button>
              <button
                type="button"
                className="text-button"
                disabled={rows.length <= 1}
                onClick={() => {
                  setRows((current) => current.slice(0, -1));
                  setError(undefined);
                }}
              >
                Remove last area row
              </button>
              <button
                type="button"
                className="text-button"
                disabled={rows.some((row) => row.length <= 1)}
                onClick={() => {
                  setRows((current) => current.map((row) => row.slice(0, -1)));
                  setError(undefined);
                }}
              >
                Remove last area column
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  try {
                    const next = serializeGridAreas(rows);
                    setError(undefined);
                    if (next !== value) onCommit(next);
                  } catch (cause) {
                    setError((cause as Error).message);
                  }
                }}
              >
                Apply grid areas
              </button>
            </div>
            {parsed.names.map((name) => (
              <div className="grid-areas-actions" key={name}>
                <input
                  className="eu-control"
                  aria-label={`Rename area ${name}`}
                  value={renames[name] ?? name}
                  onChange={(event) =>
                    setRenames((current) => ({ ...current, [name]: event.target.value }))
                  }
                />
                <button
                  type="button"
                  className="text-button"
                  aria-label={`Rename ${name}`}
                  onClick={() => {
                    const next = renames[name] ?? name;
                    try {
                      renameGridArea(value, name, next);
                      setError(undefined);
                      if (next !== name) onRename(name, next);
                    } catch (cause) {
                      setError((cause as Error).message);
                    }
                  }}
                >
                  Rename
                </button>
              </div>
            ))}
          </>
        ) : (
          <pre className="grid-areas-raw" aria-label="Preserved grid areas CSS">
            {value}
          </pre>
        )}
        {!parsed.editable || oversized ? (
          <span className="eu-field__hint">
            {oversized ? 'The raster editor supports up to 20 rows and 20 columns. ' : ''}
            Original CSS is preserved. Edit this value in Advanced CSS.
          </span>
        ) : null}
        {error ? (
          <span role="alert" className="eu-field__hint">
            {error}
          </span>
        ) : null}
        {overridden ? (
          <button
            type="button"
            className="text-button"
            aria-label="Reset grid areas"
            onClick={() => onCommit(null)}
          >
            Reset
          </button>
        ) : null}
      </Stack>
    </Field>
  );
}
