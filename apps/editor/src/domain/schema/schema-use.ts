import { resolveLibrarySchema } from './schema-validation';
import type { JsonSchema, NamedSchema } from '@facadeur/core';

export const BASIC_SCHEMA_TYPES = [
  'string',
  'number',
  'integer',
  'boolean',
  'object',
  'array',
] as const;

export type BasicSchemaType = (typeof BASIC_SCHEMA_TYPES)[number];

export type SchemaTypeRef =
  { kind: 'type'; type: BasicSchemaType } | { kind: 'schema'; schemaId: string };

export interface SchemaFieldUse {
  name: string;
  type: SchemaTypeRef;
}

/** How one component uses the schema library. A string assignment is the same as a direct schema. */
export interface SchemaTypeSelection {
  direct?: SchemaTypeRef;
  fields?: SchemaFieldUse[];
}

export interface ComponentSchemaUse extends SchemaTypeSelection {
  defaults?: unknown;
}

export type { NamedSchema };
type PreviewSchema = JsonSchema;

export type PreviewKind =
  'string' | 'number' | 'integer' | 'boolean' | 'enum' | 'object' | 'array' | 'choice';

export interface PreviewControl {
  path: string;
  label: string;
  required?: boolean;
  kind: PreviewKind;
  options?: { value: string; label: string }[];
  item?: PreviewControl;
  children?: PreviewControl[];
}

const BASIC_LABEL: Record<BasicSchemaType, string> = {
  string: 'Text',
  number: 'Number',
  integer: 'Integer',
  boolean: 'Boolean',
  object: 'Object',
  array: 'Array',
};

export function basicTypeOptions(): { value: string; label: string }[] {
  return BASIC_SCHEMA_TYPES.map((type) => ({ value: `type:${type}`, label: BASIC_LABEL[type] }));
}

export function typeRefValue(ref: SchemaTypeRef): string {
  return ref.kind === 'type' ? `type:${ref.type}` : `schema:${ref.schemaId}`;
}

export function parseTypeRef(value: string): SchemaTypeRef | null {
  if (value.startsWith('type:')) {
    const type = value.slice(5);
    if (BASIC_SCHEMA_TYPES.includes(type as BasicSchemaType)) {
      return { kind: 'type', type: type as BasicSchemaType };
    }
  }
  if (value.startsWith('schema:') && value.length > 'schema:'.length) {
    return { kind: 'schema', schemaId: value.slice('schema:'.length) };
  }
  return null;
}

export {
  isSchemaFieldUse,
  isComponentSchemaUse,
  schemaUseFromAssignment,
} from '@facadeur/api/schema';

export function previewControlsForUse(
  use: ComponentSchemaUse,
  schemas: NamedSchema[],
): PreviewControl[] {
  const resolvedSchemas = schemas.flatMap((entry) => {
    const resolved = resolveLibrarySchema(entry.id, schemas);
    return resolved ? [{ ...entry, schema: resolved }] : [];
  });
  if (use.fields && use.fields.length > 0) {
    return use.fields.flatMap((field) =>
      controlsForRef(field.type, field.name, field.name, resolvedSchemas, false),
    );
  }
  if (use.direct)
    return controlsForRef(
      use.direct,
      '',
      use.direct.kind === 'schema' ? '' : 'Value',
      resolvedSchemas,
      false,
    );
  return [];
}

function controlsForRef(
  ref: SchemaTypeRef,
  path: string,
  label: string,
  schemas: NamedSchema[],
  required: boolean,
): PreviewControl[] {
  if (ref.kind === 'type') {
    return [controlForSchema({ type: ref.type }, path, label || BASIC_LABEL[ref.type], required)];
  }
  const schema = schemas.find((entry) => entry.id === ref.schemaId)?.schema;
  if (!schema) return [];
  if (label) return [controlForSchema(schema, path, label, required)];
  const control = controlForSchema(schema, path, schema.title || 'Value', required);
  return control.kind === 'object' && control.children ? control.children : [control];
}

function controlForSchema(
  schema: PreviewSchema,
  path: string,
  label: string,
  required: boolean,
): PreviewControl {
  const branches = schema.oneOf ?? schema.anyOf;
  if (Array.isArray(branches) && branches.length > 0) {
    return {
      path,
      label,
      required,
      kind: 'choice',
      options: branches.map((branch, index) => ({
        value: String(index),
        label: branch.title || `Option ${index + 1}`,
      })),
      children: branches.map((branch) =>
        controlForSchema(branch, path, branch.title || label, required),
      ),
    };
  }
  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    const requiredNames = new Set(schema.required ?? []);
    return {
      path,
      label,
      required,
      kind: 'object',
      children: [
        ...Object.entries(schema.properties ?? {}).map(([name, property]) =>
          controlForSchema(
            property,
            joinPath(path, name),
            property.title || name,
            requiredNames.has(name),
          ),
        ),
        ...schema.allOf.flatMap((branch) => {
          const control = controlForSchema(branch, path, label, required);
          return control.children ?? [control];
        }),
      ],
    };
  }
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return {
      path,
      label,
      required,
      kind: 'enum',
      options: schema.enum.map((value) => ({ value: String(value), label: String(value) })),
    };
  }
  const type = Array.isArray(schema.type)
    ? schema.type.find((item) => item !== 'null')
    : schema.type;
  if (type === 'object' || schema.properties) {
    const requiredNames = new Set(schema.required ?? []);
    return {
      path,
      label,
      required,
      kind: 'object',
      children: Object.entries(schema.properties ?? {}).map(([name, property]) =>
        controlForSchema(
          property,
          joinPath(path, name),
          property.title || name,
          requiredNames.has(name),
        ),
      ),
    };
  }
  if (type === 'array' || schema.items) {
    const item = controlForSchema(
      schema.items ?? { type: 'string' },
      joinPath(path, '0'),
      'Item',
      false,
    );
    return { path, label, required, kind: 'array', item };
  }
  if (type === 'number') return { path, label, required, kind: 'number' };
  if (type === 'integer') return { path, label, required, kind: 'integer' };
  if (type === 'boolean') return { path, label, required, kind: 'boolean' };
  return { path, label, required, kind: 'string' };
}

function joinPath(parent: string, name: string): string {
  return parent ? `${parent}.${name}` : name;
}

export function getAt(value: unknown, path: string): unknown {
  if (!path) return value;
  let current = value;
  for (const part of path.split('.')) {
    if (Array.isArray(current)) current = current[Number(part)];
    else if (current && typeof current === 'object')
      current = (current as Record<string, unknown>)[part];
    else return undefined;
  }
  return current;
}

export function setAt(value: unknown, path: string, next: unknown): unknown {
  if (!path) return next;
  const parts = path.split('.');
  const root = Array.isArray(value)
    ? [...value]
    : { ...(value as Record<string, unknown> | undefined) };
  let current: unknown = root;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index] ?? '';
    const follow = parts[index + 1] ?? '';
    const container = Array.isArray(current) ? current : (current as Record<string, unknown>);
    const existing = Array.isArray(container) ? container[Number(part)] : container[part];
    const child = Array.isArray(existing)
      ? [...existing]
      : existing && typeof existing === 'object'
        ? { ...(existing as Record<string, unknown>) }
        : follow && Number.isInteger(Number(follow))
          ? []
          : {};
    if (Array.isArray(container)) container[Number(part)] = child;
    else container[part] = child;
    current = child;
  }
  const last = parts[parts.length - 1] ?? '';
  if (Array.isArray(current)) current[Number(last)] = next;
  else (current as Record<string, unknown>)[last] = next;
  return root;
}

export function matchingChoice(control: PreviewControl, value: unknown): string {
  const options = control.options ?? [];
  const record =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const keys = new Set(Object.keys(record));
  let bestIndex = -1;
  let bestScore = 0;
  (control.children ?? []).forEach((branch, index) => {
    let score = 0;
    for (const name of propertyNames(branch)) {
      if (keys.has(name)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  if (bestIndex >= 0) return String(bestIndex);
  return options[0]?.value ?? '0';
}

function propertyNames(control: PreviewControl): string[] {
  return (control.children ?? [])
    .map((child) => child.path.split('.').pop() ?? '')
    .filter((name) => name.length > 0);
}

/** Point a control tree at another path, including nested array items. */
export function retargetControl(control: PreviewControl, path: string): PreviewControl {
  const from = control.path;
  const mapPath = (entryPath: string) => {
    if (entryPath === from) return path;
    const prefix = `${from}.`;
    if (from && entryPath.startsWith(prefix)) return path + entryPath.slice(from.length);
    return entryPath;
  };
  const rewrite = (entry: PreviewControl): PreviewControl => ({
    ...entry,
    path: mapPath(entry.path),
    ...(entry.item ? { item: rewrite(entry.item) } : {}),
    ...(entry.children ? { children: entry.children.map(rewrite) } : {}),
  });
  return rewrite(control);
}
