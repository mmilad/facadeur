const RESERVED = new Set([
  'arguments',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'eval',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);

/** Props every generated component owns, besides the document's fields and variants. */
export const builtinProps = ['nodeId', 'className'] as const;

export class CodegenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CodegenError';
  }
}

export function componentName(id: string, used: Set<string>): string {
  return unique(pascal(id) || 'Component', used);
}

export function variantTypeName(component: string, axis: string, used: Set<string>): string {
  return unique(`${component}${pascal(axis) || 'Variant'}`, used);
}

/**
 * A prop name that is a legal binding identifier.
 * Hyphenated field names become camelCase. Names that collide with a reserved
 * word, a built-in prop, or an earlier prop gain a numeric suffix.
 */
export function propName(name: string, used: Set<string>): string {
  const parts = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  let camel = parts
    .map((part, index) =>
      index === 0 ? lowerFirst(part) : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join('');
  if (!/^[A-Za-z_$]/.test(camel)) camel = `_${camel}`;
  if (RESERVED.has(camel) || builtinProps.includes(camel as (typeof builtinProps)[number])) {
    camel = `${camel}Field`;
  }
  return unique(camel, used);
}

export function pascal(value: string): string {
  return value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function unique(base: string, used: Set<string>): string {
  let name = base;
  let suffix = 2;
  while (used.has(name)) {
    name = `${base}${suffix}`;
    suffix += 1;
  }
  used.add(name);
  return name;
}

/** Quote a string the way Prettier does with `singleQuote: true`. */
export function quote(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const preferDouble = value.includes("'") && !value.includes('"');
  if (preferDouble) return `"${escaped.replace(/"/g, '\\"')}"`;
  return `'${escaped.replace(/'/g, "\\'")}'`;
}
