export interface ParsedGridAreas {
  rows: string[][];
  names: string[];
  error?: string;
  editable: boolean;
}

const reserved = new Set([
  'none',
  'auto',
  'span',
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
  'default',
]);

function validateName(name: string): void {
  if (
    !/^(?:--[A-Za-z0-9_-]+|-?[A-Za-z_][A-Za-z0-9_-]*)$/.test(name) ||
    reserved.has(name.toLowerCase())
  ) {
    throw new Error(
      `Invalid area name: ${name || '(empty)'}. Use a simple CSS identifier or . for an empty cell.`,
    );
  }
}

function validateRows(rows: string[][]): string[] {
  if (!rows.length) return [];
  const width = rows[0]!.length;
  if (!width || rows.some((row) => row.length !== width)) {
    throw new Error('Every area row must have the same nonzero number of cells.');
  }
  const bounds = new Map<string, { top: number; bottom: number; left: number; right: number }>();
  rows.forEach((row, y) =>
    row.forEach((name, x) => {
      if (name === '.') return;
      validateName(name);
      const box = bounds.get(name);
      if (box) {
        box.bottom = y;
        box.left = Math.min(box.left, x);
        box.right = Math.max(box.right, x);
      } else bounds.set(name, { top: y, bottom: y, left: x, right: x });
    }),
  );
  for (const [name, box] of bounds) {
    for (let y = box.top; y <= box.bottom; y++) {
      for (let x = box.left; x <= box.right; x++) {
        if (rows[y]![x] !== name)
          throw new Error(`Area ${name} must form one rectangle without holes.`);
      }
    }
  }
  return [...bounds.keys()];
}

export function parseGridAreas(value: string): ParsedGridAreas {
  const source = value.trim();
  if (!source || source.toLowerCase() === 'none') return { rows: [], names: [], editable: true };
  const rows: string[][] = [];
  let offset = 0;
  while (offset < source.length) {
    const match = /^(?:"([^"\\\r\n]*)"|'([^'\\\r\n]*)')\s*/.exec(source.slice(offset));
    if (!match)
      return {
        rows: [],
        names: [],
        editable: false,
        error: 'This CSS is not supported by the area raster. Its original value is preserved.',
      };
    const text = (match[1] ?? match[2] ?? '').trim();
    rows.push(text ? text.split(/\s+/).map((cell) => (/^\.+$/.test(cell) ? '.' : cell)) : []);
    offset += match[0].length;
  }
  try {
    return { rows, names: validateRows(rows), editable: true };
  } catch (error) {
    return { rows, names: [], editable: true, error: (error as Error).message };
  }
}

export function serializeGridAreas(rows: string[][]): string {
  validateRows(rows);
  return rows.length ? rows.map((row) => `"${row.join(' ')}"`).join(' ') : 'none';
}

export function renameGridArea(value: string, oldName: string, newName: string): string {
  const parsed = parseGridAreas(value);
  if (!parsed.editable || parsed.error) throw new Error(parsed.error ?? 'Unsupported grid areas.');
  validateName(oldName);
  validateName(newName);
  if (!parsed.names.includes(oldName)) throw new Error(`Area ${oldName} does not exist.`);
  if (oldName !== newName && parsed.names.includes(newName))
    throw new Error(`Area ${newName} already exists.`);
  return serializeGridAreas(
    parsed.rows.map((row) => row.map((cell) => (cell === oldName ? newName : cell))),
  );
}
