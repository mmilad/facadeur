import type { FieldValue, ProjectCatalog } from '@facadeur/domain';
import { componentPropsForSchema } from '../../catalog/field-ids';
import { readTokenTree } from '../../../style/tokens/global/tree';
import { tokenReference } from '../../../style/tokens/syntax';

export type RepeaterReferenceScope = {
  readonly nodeUuid: string;
  readonly indexName: string;
  readonly index: number;
  readonly itemPath?: string;
  readonly item: FieldValue;
  readonly itemSchema: Record<string, unknown> | null;
};

export type ReferenceResolutionContext = {
  readonly catalog: ProjectCatalog;
  readonly componentProps?: Readonly<Record<string, FieldValue>>;
  readonly repeaterScopes?: readonly RepeaterReferenceScope[];
  /** Compatibility for callers that only provide the previous single-item context. */
  readonly item?: FieldValue;
};

const DESIGN_PROP_REF = /^\{prop:([^}]+)\}$/;
const COMPONENT_PROP_REF = /^\{props:([^}]+)\}$/;
const ITEM_FIELD_REF = /^\{item:([^}]+)\}$/;
const ITEM_PROP_REF = /^\{item-prop:([^:}]+):([^}]+)\}$/;
const INDEX_REF = /^\{index:([^}]+)\}$/;
const TOKEN_REF = /^\{token:([^}]+)\}$/;

export function computedIndexName(depth: number) {
  return depth === 0 ? 'index' : `index${depth}`;
}

/** Resolve legacy and scoped reference encodings against one explicit context. */
export function resolveReferenceValue(
  reference: string,
  context: ReferenceResolutionContext,
): unknown {
  return resolveReference(reference, context, new Set());
}

function resolveReference(
  reference: string,
  context: ReferenceResolutionContext,
  activeReferences: ReadonlySet<string>,
): unknown {
  const designProp = reference.match(DESIGN_PROP_REF);
  if (designProp?.[1]) {
    const activeKey = `prop:${designProp[1]}`;
    if (activeReferences.has(activeKey)) return undefined;
    const value = context.catalog.props?.[designProp[1]]?.value;
    if (value === undefined) return undefined;
    return resolveReference(value, context, new Set(activeReferences).add(activeKey));
  }

  const componentProp = reference.match(COMPONENT_PROP_REF);
  if (componentProp?.[1]) {
    const activeKey = `component:${componentProp[1]}`;
    if (activeReferences.has(activeKey)) return undefined;
    let value = context.componentProps?.[componentProp[1]];
    if (value === undefined) {
      for (const scope of [...(context.repeaterScopes ?? [])].reverse()) {
        const scopedProp = componentPropsForSchema(scope.itemSchema).find(
          (candidate) => candidate.uuid === componentProp[1] && !candidate.name.includes('[].'),
        );
        if (!scopedProp) continue;
        value = fieldAtPath(scope.item, scopedProp.path);
        if (
          value === undefined &&
          scopedProp.valueType === 'boolean' &&
          hasParentObject(scope.item, scopedProp.path)
        ) {
          value = false;
        }
        break;
      }
    }
    if (typeof value !== 'string' || !isSupportedReference(value)) return value;
    return resolveReference(value, context, new Set(activeReferences).add(activeKey));
  }

  const itemField = reference.match(ITEM_FIELD_REF);
  if (itemField?.[1]) return fieldAtPath(lastScope(context)?.item ?? context.item, itemField[1]);

  const itemProp = reference.match(ITEM_PROP_REF);
  if (itemProp?.[1] && itemProp[2]) {
    const scope = findScope(context, itemProp[1]);
    if (!scope) return undefined;
    const prop = componentPropsForSchema(scope.itemSchema).find(
      (candidate) => candidate.uuid === itemProp[2],
    );
    return prop ? fieldAtPath(scope.item, prop.path) : undefined;
  }

  const index = reference.match(INDEX_REF);
  if (index?.[1]) return findScope(context, index[1])?.index;

  const token = reference.match(TOKEN_REF);
  if (token?.[1]) {
    const activeKey = `token:${token[1]}`;
    if (activeReferences.has(activeKey)) return undefined;
    const record = readTokenTree(context.catalog.tokens ?? {}).tokens.get(token[1]);
    if (!record) return undefined;
    const nextActive = new Set(activeReferences).add(activeKey);
    if (typeof record.value === 'string') {
      const alias = tokenReference(record.value);
      if (alias) return resolveReference(`{token:${alias}}`, context, nextActive);
    }
    return record.value;
  }

  return undefined;
}

export function resolveReferenceText(reference: string, context: ReferenceResolutionContext) {
  const isReference =
    DESIGN_PROP_REF.test(reference) ||
    COMPONENT_PROP_REF.test(reference) ||
    ITEM_FIELD_REF.test(reference) ||
    ITEM_PROP_REF.test(reference) ||
    INDEX_REF.test(reference) ||
    TOKEN_REF.test(reference);
  if (!isReference) return reference;

  const value = resolveReferenceValue(reference, context);
  if (value === undefined) {
    return DESIGN_PROP_REF.test(reference) ? reference : '';
  }
  if (value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (!DESIGN_PROP_REF.test(reference) && !TOKEN_REF.test(reference)) return reference;
  return JSON.stringify(value) ?? '';
}

export function componentPropValues(
  schema: Record<string, unknown> | null,
  fields: Readonly<Record<string, FieldValue>>,
) {
  const values: Record<string, FieldValue> = {};
  for (const prop of componentPropsForSchema(schema)) {
    const value = fieldAtPath(fields, prop.path);
    if (value !== undefined) {
      values[prop.uuid] = value;
    } else if (prop.valueType === 'boolean' && hasParentObject(fields, prop.path)) {
      values[prop.uuid] = false;
    }
  }
  return values;
}

function hasParentObject(value: FieldValue | undefined, path: string) {
  const segments = path.split('.');
  if (segments.length === 1) return true;
  const parent = fieldAtPath(value, segments.slice(0, -1).join('.'));
  return parent !== null && typeof parent === 'object' && !Array.isArray(parent);
}

export function isSupportedReference(reference: string) {
  return (
    DESIGN_PROP_REF.test(reference) ||
    COMPONENT_PROP_REF.test(reference) ||
    ITEM_FIELD_REF.test(reference) ||
    ITEM_PROP_REF.test(reference) ||
    INDEX_REF.test(reference) ||
    TOKEN_REF.test(reference)
  );
}

export function referenceOptionsForScopes(scopes: readonly RepeaterReferenceScope[]) {
  return scopes.flatMap((scope) => [
    {
      uuid: `index:${scope.nodeUuid}`,
      name: scope.indexName,
      ref: `{index:${scope.nodeUuid}}`,
      kind: 'index' as const,
      valueType: 'integer',
    },
    ...componentPropsForSchema(scope.itemSchema)
      .filter((prop) => !prop.name.includes('[].'))
      .map((prop) => ({
        uuid: `item:${scope.nodeUuid}:${prop.uuid}`,
        name: `${scope.itemPath ?? scope.indexName}.${prop.name.replace(/^props\./, '').replace(/\[\]$/, '')}`,
        ref: `{item-prop:${scope.nodeUuid}:${prop.uuid}}`,
        kind: 'item' as const,
        ...(prop.valueType ? { valueType: prop.valueType } : {}),
      })),
  ]);
}

export function repeaterItemSchema(
  source: { kind: 'prop'; uuid: string } | { kind: 'item'; path: string } | undefined,
  componentSchema: unknown,
  repeaterScopes: readonly RepeaterReferenceScope[],
  catalog: ProjectCatalog,
) {
  const sourceSchema =
    source?.kind === 'prop'
      ? schemaPropertyById(componentSchema, source.uuid)
      : source?.kind === 'item'
        ? schemaAtPath(repeaterScopes.at(-1)?.itemSchema, source.path)
        : undefined;
  const items = sourceSchema?.items;
  const resolvedItems = resolveCatalogSchemaReferences(items, catalog);
  return resolvedItems && typeof resolvedItems === 'object' && !Array.isArray(resolvedItems)
    ? (resolvedItems as Record<string, unknown>)
    : null;
}

export function repeaterItemPath(
  source: { kind: 'prop'; uuid: string } | { kind: 'item'; path: string } | undefined,
  componentSchema: unknown,
  repeaterScopes: readonly RepeaterReferenceScope[],
) {
  if (source?.kind === 'prop') {
    const propName =
      componentPropsForSchema(componentSchema).find((prop) => prop.uuid === source.uuid)?.name ??
      'props.item[]';
    const parentScope = repeaterScopes.at(-1);
    return parentScope
      ? `${parentScope.itemPath ?? parentScope.indexName}.${propName.replace(/^props\./, '')}`
      : propName;
  }
  if (source?.kind === 'item') {
    const parentScope = repeaterScopes.at(-1);
    const itemProp = componentPropsForSchema(parentScope?.itemSchema).find(
      (prop) => prop.path === source.path,
    );
    const itemName = itemProp?.name.replace(/^props\./, '') ?? source.path;
    return parentScope
      ? `${parentScope.itemPath ?? parentScope.indexName}.${itemName}`
      : `props.${itemName}`;
  }
  return 'item[]';
}

/** Match direct component fields to the same stable property IDs in the active Repeater item. */
export function repeaterItemPropBindings(
  schema: unknown,
  repeaterScopes: readonly RepeaterReferenceScope[],
) {
  return componentPropsForSchema(schema)
    .filter((prop) => !prop.path.includes('.') && !prop.name.includes('[].'))
    .flatMap((prop) => {
      const scope = [...repeaterScopes]
        .reverse()
        .find((candidate) =>
          componentPropsForSchema(candidate.itemSchema).some(
            (itemProp) => itemProp.uuid === prop.uuid,
          ),
        );
      return scope ? [{ path: prop.path, ref: `{item-prop:${scope.nodeUuid}:${prop.uuid}}` }] : [];
    });
}

export function fieldAtPath(value: FieldValue | undefined, path: string): FieldValue | undefined {
  let current = value;
  for (const segment of path.split('.')) {
    current =
      current && typeof current === 'object' && !Array.isArray(current)
        ? current[segment]
        : undefined;
  }
  return current;
}

function findScope(context: ReferenceResolutionContext, nodeUuid: string) {
  return [...(context.repeaterScopes ?? [])].reverse().find((scope) => scope.nodeUuid === nodeUuid);
}

function lastScope(context: ReferenceResolutionContext) {
  return context.repeaterScopes?.at(-1);
}

function schemaPropertyById(schema: unknown, uuid: string): Record<string, unknown> | undefined {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return undefined;
  const record = schema as Record<string, unknown>;
  if (record.properties && typeof record.properties === 'object') {
    for (const value of Object.values(record.properties as Record<string, unknown>)) {
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        (value as Record<string, unknown>)['x-facadeur-prop-id'] === uuid
      )
        return value as Record<string, unknown>;
      const nested = schemaPropertyById(value, uuid);
      if (nested) return nested;
    }
  }
  return undefined;
}

function schemaAtPath(schema: unknown, path: string) {
  let current = schema;
  for (const segment of path.split('.').filter(Boolean)) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    const properties = (current as Record<string, unknown>).properties;
    if (!properties || typeof properties !== 'object' || Array.isArray(properties))
      return undefined;
    current = (properties as Record<string, unknown>)[segment];
  }
  return current && typeof current === 'object' && !Array.isArray(current)
    ? (current as Record<string, unknown>)
    : undefined;
}

export function resolveCatalogSchemaReferences(
  value: unknown,
  catalog: ProjectCatalog,
  activeSchemaIds: ReadonlySet<string> = new Set(),
): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => resolveCatalogSchemaReferences(entry, catalog, activeSchemaIds));
  }
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  const reference = typeof record.$ref === 'string' ? record.$ref : undefined;
  const match = reference?.match(/^urn:facadeur:schema:([^#]+)$/);
  const target = match?.[1] ? catalog.schemas?.[match[1]] : undefined;
  if (target && match?.[1] && !activeSchemaIds.has(match[1])) {
    const nextActiveIds = new Set(activeSchemaIds).add(match[1]);
    const resolvedTarget = resolveCatalogSchemaReferences(target, catalog, nextActiveIds);
    if (resolvedTarget && typeof resolvedTarget === 'object' && !Array.isArray(resolvedTarget)) {
      return {
        ...(resolvedTarget as Record<string, unknown>),
        ...Object.fromEntries(
          Object.entries(record)
            .filter(([key]) => key !== '$ref')
            .map(([key, entry]) => [
              key,
              resolveCatalogSchemaReferences(entry, catalog, activeSchemaIds),
            ]),
        ),
      };
    }
  }
  return Object.fromEntries(
    Object.entries(record).map(([key, entry]) => [
      key,
      resolveCatalogSchemaReferences(entry, catalog, activeSchemaIds),
    ]),
  );
}
