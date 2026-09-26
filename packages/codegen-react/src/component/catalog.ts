import type { DocumentFile, FieldDefinition, FieldValue } from '@facadeur/core';
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
    for (const axis of document.variants ?? []) {
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
    catalog.set(document.id, { document, component, fields, variants });
  }
  return catalog;
}

export function variantTypeSpecs(document: DocumentFile, entry: CatalogEntry): VariantTypeSpec[] {
  const specs: VariantTypeSpec[] = [];
  for (const axis of document.variants ?? []) {
    const prop = entry.variants.get(axis.name);
    if (!prop) continue;
    const values = [...axis.values];
    const fallback = axis.default ?? values[0];
    if (fallback && !values.includes(fallback)) values.push(fallback);
    specs.push({ name: prop.type, union: values.map((value) => quote(value)).join(' | ') });
  }
  return specs;
}

function fieldProp(documentId: string, field: FieldDefinition, used: Set<string>): PropSpec {
  if (field.default !== undefined) assertDefault(documentId, field, field.default);
  return {
    source: field.name,
    name: propName(field.name, used),
    type: fieldTypeName(field),
    fieldType: field.type,
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
