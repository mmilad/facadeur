import type { ChildFieldOverrides } from '@facadeur/core';
import { jsLiteral } from './catalog.js';
import type { Attr, PropSpec } from './types.js';
import { quote } from '../names.js';

/** Internal prop used to carry sparse field overrides across component boundaries. */
export const childFieldsPropName = 'childFields';

/** Keep the transport type broad; each target field is narrowed at its JSX boundary. */
export const childFieldsPropType = 'Record<string, Record<string, unknown>>';

export function childFieldsLiteral(value: ChildFieldOverrides | undefined): string | undefined {
  if (!value || !Object.keys(value).length) return undefined;
  const entries = Object.entries(value).map(([path, fields]) => {
    const members = Object.entries(fields)
      .map(([name, field]) => `${quote(name)}: ${jsLiteral(field)}`)
      .join(', ');
    return `${quote(path)}: { ${members} }`;
  });
  return `{ ${entries.join(', ')} }`;
}

/** Remove the current instance id before forwarding overrides to its target component. */
export function childFieldsForInstance(
  source: string | undefined,
  instanceId: string,
  local: ChildFieldOverrides | undefined,
): string | undefined {
  const literal = childFieldsLiteral(local);
  const inherited = source ? childFieldsTail(source, instanceId) : undefined;
  if (!literal) return inherited;
  if (!inherited) return literal;
  const typedLiteral = `(${literal} as ${childFieldsPropType})`;
  return `{ ...${literal}, ...Object.fromEntries(Object.entries((${inherited}) ?? {}).map(([path, fields]) => [path, { ...${typedLiteral}[path], ...fields }])) }`;
}

/** Read the direct field override for the current instance. */
export function childFieldValue(
  source: string | undefined,
  instanceId: string,
  fieldName: string,
): string | undefined {
  if (!source) return undefined;
  return `${source}${optionalAccess(instanceId)}${optionalAccess(fieldName)}`;
}

/** Merge a sparse override ahead of the authored value while retaining field binding precedence. */
export function withChildFieldOverride(
  base: Attr['value'] | undefined,
  override: string | undefined,
  prop: PropSpec,
): Attr['value'] | undefined {
  if (!override) return base;
  const fallback = base === undefined ? 'undefined' : attrValueCode(base);
  return {
    kind: 'expr',
    code: `${override} !== undefined ? (${override} as ${prop.type}) : ${fallback}`,
  };
}

function childFieldsTail(source: string, instanceId: string): string {
  const prefix = `${quote(instanceId)} + '/'`;
  const length = instanceId.length + 1;
  return `${source} ? Object.fromEntries(Object.entries(${source}).flatMap(([path, fields]) => path.startsWith(${prefix}) ? [[path.slice(${length}), fields]] : [])) : undefined`;
}

function optionalAccess(value: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value) ? `?.${value}` : `?.[${quote(value)}]`;
}

function attrValueCode(value: Attr['value']): string {
  if (value.kind === 'literal') return quote(value.value);
  if (value.kind === 'bool') return value.value ? 'true' : 'false';
  return value.code;
}
