import {
  isVariantAxis,
  variantPresets,
  type DocumentFile,
  type FieldDefinition,
  type FieldValue,
  type NestedNode,
} from '@facadeur/core';
import { CodegenError, componentName, propName, quote, variantTypeName } from '../names.js';
import type { CatalogEntry, PropSpec, VariantTypeSpec } from './types.js';

export function assignCatalog(documents: readonly DocumentFile[]): Map<string, CatalogEntry> {
  const catalog = new Map<string, CatalogEntry>();
  const componentNames = new Set<string>();
  for (const document of documents) {
    const component = componentName(document.id, componentNames);
    const used = new Set<string>(['nodeId', 'className']);
    const typeNames = new Set<string>([component, `${component}Props`]);
    const fields = new Map<string, PropSpec>();
    for (const field of document.fields ?? []) {
      const spec = fieldProp(document.id, field, used);
      fields.set(field.name, spec);
    }
    const variants = new Map<string, PropSpec>();
    for (const axis of (document.variants ?? []).filter(isVariantAxis)) {
      const name = propName(axis.name, used);
      const values = [...axis.values];
      const fallback = axis.default ?? values[0];
      if (fallback && !values.includes(fallback)) values.push(fallback);
      const type = variantTypeName(component, axis.name, typeNames);
      variants.set(axis.name, {
        source: axis.name,
        name,
        type,
        fieldType: 'variant',
        ...(fallback !== undefined ? { defaultExpr: quote(fallback) } : {}),
      });
    }
    const events = new Map<string, PropSpec>();
    for (const event of document.events ?? []) {
      const name = propName(`on-${event.name}`, used);
      const payload = event.payload ?? {};
      const payloadType = Object.entries(payload)
        .map(([key, type]) => `${key}: ${fieldTypeName({ name: key, type })}`)
        .join('; ');
      events.set(event.name, {
        source: event.name,
        name,
        type: payloadType ? `(payload: { ${payloadType} }) => void` : '() => void',
        fieldType: 'event',
        eventPayload: payload,
      });
    }
    const presets = variantPresets(document).filter((variant) => variant.name !== 'default');
    const namedVariant = presets.length
      ? {
          source: 'variant',
          name: propName('variant', used),
          type: variantTypeName(component, 'variant', typeNames),
          fieldType: 'variant' as const,
          defaultExpr: quote('default'),
        }
      : undefined;
    catalog.set(document.id, { document, component, fields, variants, events, namedVariant });
  }
  for (const document of documents) {
    const entry = catalog.get(document.id);
    if (!entry) continue;
    const used = new Set<string>([
      'nodeId',
      'className',
      ...[...entry.fields.values(), ...entry.variants.values(), ...entry.events.values()].map(
        (prop) => prop.name,
      ),
    ]);
    for (const [name, path] of Object.entries(document.expose?.fields ?? {})) {
      const resolved = resolveExposedMember(document, path, catalog, 'field');
      if (entry.fields.has(name)) {
        throw new CodegenError(`Exposed field "${name}" collides with a direct field`);
      }
      entry.fields.set(name, {
        ...resolved,
        source: name,
        name: propName(name, used),
      });
    }
    for (const [name, path] of Object.entries(document.expose?.events ?? {})) {
      const resolved = resolveExposedMember(document, path, catalog, 'event');
      if (entry.events.has(name)) {
        throw new CodegenError(`Exposed event "${name}" collides with a direct event`);
      }
      entry.events.set(name, {
        ...resolved,
        source: name,
        name: propName(`on-${name}`, used),
      });
    }
    if (entry.namedVariant) applyVariantDefaults(entry, entry.namedVariant.name);
  }
  return catalog;
}

function resolveExposedMember(
  document: DocumentFile,
  path: string,
  catalog: Map<string, CatalogEntry>,
  kind: 'field' | 'event',
  seen = new Set<string>(),
): Omit<PropSpec, 'source' | 'name'> {
  const key = `${document.id}:${kind}:${path}`;
  if (seen.has(key)) throw new CodegenError(`Cyclic expose path "${path}"`);
  seen.add(key);
  const [nodeId, ...rest] = path.split('.');
  const node = findNode(document.root, nodeId);
  if (!node || node.type !== 'instance' || rest.length === 0) {
    throw new CodegenError(`Expose path "${path}" on "${document.id}" does not target a child contract`);
  }
  const child = catalog.get(node.component);
  if (!child) throw new CodegenError(`Expose path "${path}" references unknown component "${node.component}"`);
  const member = rest.join('.');
  const direct = kind === 'field' ? child.fields.get(member) : child.events.get(member);
  if (direct) {
    return {
      type: direct.type,
      fieldType: direct.fieldType,
      ...(direct.defaultExpr !== undefined ? { defaultExpr: direct.defaultExpr } : {}),
      ...(direct.required ? { required: true } : {}),
      ...(direct.eventPayload ? { eventPayload: direct.eventPayload } : {}),
    };
  }
  const nestedPath = kind === 'field' ? child.document.expose?.fields?.[member] : child.document.expose?.events?.[member];
  if (!nestedPath) {
    throw new CodegenError(`Expose path "${path}" does not resolve ${kind} "${member}"`);
  }
  return resolveExposedMember(child.document, nestedPath, catalog, kind, seen);
}

function findNode(node: NestedNode, id: string | undefined): NestedNode | undefined {
  if (!id) return undefined;
  if (node.id === id) return node;
  if (node.type !== 'frame') return undefined;
  for (const child of node.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return undefined;
}

export function variantTypeSpecs(document: DocumentFile, entry: CatalogEntry): VariantTypeSpec[] {
  const specs: VariantTypeSpec[] = [];
  for (const axis of (document.variants ?? []).filter(isVariantAxis)) {
    const prop = entry.variants.get(axis.name);
    if (!prop) continue;
    const values = [...axis.values];
    const fallback = axis.default ?? values[0];
    if (fallback && !values.includes(fallback)) values.push(fallback);
    specs.push({ name: prop.type, union: values.map((value) => quote(value)).join(' | ') });
  }
  if (entry.namedVariant) {
    const values = ['default', ...variantPresets(document).map((variant) => variant.name)];
    specs.push({ name: entry.namedVariant.type, union: [...new Set(values)].map(quote).join(' | ') });
  }
  return specs;
}

function applyVariantDefaults(entry: CatalogEntry, variantProp: string): void {
  const variants = variantPresets(entry.document).filter((variant) => variant.name !== 'default');
  for (const [fieldName, prop] of entry.fields) {
    const field = entry.document.fields?.find((candidate) => candidate.name === fieldName);
    if (!field) continue;
    const overrides = variants.flatMap((variant) => {
      const value = variant.overrides?.fields?.[fieldName];
      if (value === undefined) return [];
      assertDefault(entry.document.id, field, value);
      return [{ name: variant.name, value: jsLiteral(value) }];
    });
    if (!overrides.length) continue;
    let expression = prop.defaultExpr ?? 'undefined';
    for (const override of [...overrides].reverse()) {
      expression = `${variantProp} === ${quote(override.name)} ? ${override.value} : ${expression}`;
    }
    prop.variantDefaultExpr = expression;
  }
}

function fieldProp(documentId: string, field: FieldDefinition, used: Set<string>): PropSpec {
  if (field.default !== undefined) assertDefault(documentId, field, field.default);
  return {
    source: field.name,
    name: propName(field.name, used),
    type: fieldTypeName(field),
    fieldType: field.type,
    ...(field.required === true && field.default === undefined ? { required: true } : {}),
    ...(field.default !== undefined ? { defaultExpr: jsLiteral(field.default) } : {}),
  };
}

export function assertDefault(documentId: string, field: FieldDefinition, value: FieldValue): void {
  const matches =
    field.type === 'boolean'
      ? typeof value === 'boolean'
      : field.type === 'number'
        ? typeof value === 'number' && Number.isFinite(value)
        : typeof value === 'string';
  if (!matches) {
    throw new CodegenError(
      `Field "${field.name}" on "${documentId}" has a default that is not a ${field.type}`,
    );
  }
  if (field.type === 'enum' && typeof value === 'string' && !field.options?.includes(value)) {
    throw new CodegenError(
      `Field "${field.name}" on "${documentId}" defaults to "${value}", which is not one of its options`,
    );
  }
}

function fieldTypeName(field: FieldDefinition): string {
  if (field.type === 'boolean') return 'boolean';
  if (field.type === 'number') return 'number';
  if (field.type === 'enum') {
    const options = field.options ?? [];
    if (!options.length) return 'string';
    return options.map((option) => quote(option)).join(' | ');
  }
  return 'string';
}

/** JS expression literal for field defaults and instance prop values. */
export function jsLiteral(value: FieldValue): string {
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number') return Object.is(value, -0) ? '-0' : String(value);
  return value ? 'true' : 'false';
}
