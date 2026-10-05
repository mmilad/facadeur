import { DocumentError } from '../../document/errors.js';
import type { FlatNode } from '../../document/flat.js';
import type { FieldDefinition, FieldValue, JsonSchema, NestedNode } from '../../schema/document.js';
import { matchingSchemaIndex, matchesSchemaValue, resolveJsonSchema } from './json-schema-value.js';
import type { ContractDocument, SchemaResolverContext } from './types.js';

export { matchesSchemaValue };

export type StructuralNodeInput =
  | Extract<FlatNode, { type: 'repeater' | 'switch' }>
  | Extract<NestedNode, { type: 'repeater' | 'switch' }>;

export type StructuralInstance =
  Extract<FlatNode, { type: 'instance' }> | Extract<NestedNode, { type: 'instance' }>;

export interface StructuralChildSchema {
  node: StructuralInstance;
  caseValue: string;
  payloadSchema: JsonSchema;
  schema: JsonSchema;
  /** Node IDs between the structural owner and this instance, in tree order. */
  path: string[];
}

export interface StructuralSelection {
  index: number;
  caseValue: string;
  props: FieldValue;
  legacy: boolean;
}

export type StructuralFieldResolver = (
  document: ContractDocument,
  context: SchemaResolverContext,
  ancestors: ReadonlySet<string>,
) => Map<string, FieldDefinition>;

export function deriveStructuralNodeSchema(
  document: ContractDocument,
  nodeId: string,
  context: SchemaResolverContext,
  resolveFields: StructuralFieldResolver,
  ancestors: ReadonlySet<string>,
): JsonSchema | undefined {
  const node = findNode(document, nodeId);
  if (node?.type !== 'repeater' && node?.type !== 'switch') return undefined;
  const branches = structuralChildSchemasInternal(
    document,
    node,
    context,
    resolveFields,
    ancestors,
  ).map((entry) => entry.schema);
  if (node.type === 'repeater') {
    return {
      type: 'array',
      items: branches.length ? { anyOf: branches } : {},
    };
  }
  return branches.length ? { anyOf: branches } : {};
}

/** Build a data-object schema for an instance target without flattening field unions. */
export function componentDataSchemaInternalForTarget(
  documentId: string,
  context: SchemaResolverContext,
  resolveFields: StructuralFieldResolver,
): JsonSchema | undefined {
  return componentDataSchemaInternal(documentId, context, resolveFields, new Set());
}

export function addStructuralField(
  document: ContractDocument,
  node: StructuralNodeInput,
  fields: Map<string, FieldDefinition>,
  context: SchemaResolverContext,
  resolveFields: StructuralFieldResolver,
  ancestors: ReadonlySet<string>,
) {
  const schema = deriveStructuralNodeSchema(document, node.id, context, resolveFields, ancestors);
  if (node.type === 'repeater') {
    fields.set('items', {
      name: 'items',
      type: 'array',
      required: true,
      schema: schema ?? { type: 'array', items: {} },
      items: { type: 'object', ...(schema?.items ? { schema: schema.items } : {}) },
    });
  } else {
    fields.set('props', {
      name: 'props',
      type: 'object',
      required: true,
      schema: schema ?? {},
    });
  }
  return fields;
}

export function deriveStructuralChildSchemas(
  document: ContractDocument,
  nodeId: string,
  context: SchemaResolverContext,
  resolveFields: StructuralFieldResolver,
  ancestors: ReadonlySet<string>,
) {
  const node = findNode(document, nodeId);
  if (node?.type !== 'repeater' && node?.type !== 'switch') return [];
  return structuralChildSchemasInternal(document, node, context, resolveFields, ancestors);
}

export function deriveStructuralCaseValue(
  document: ContractDocument,
  instance: StructuralInstance,
  context: SchemaResolverContext,
  resolveFields: StructuralFieldResolver,
) {
  const alternatives = structuralNodesInDocument(document).flatMap((node) =>
    structuralChildSchemasInternal(document, node, context, resolveFields, new Set()),
  );
  return (
    alternatives.find((candidate) => candidate.node.id === instance.id)?.caseValue ??
    instance.switchCase ??
    uniqueCaseValue(defaultCaseValue(instance.component, context), new Set())
  );
}

export function deriveStructuralScopeFields(
  document: ContractDocument,
  nodeId: string,
  context: SchemaResolverContext,
  resolveFields: StructuralFieldResolver,
  inheritedFields: readonly FieldDefinition[],
) {
  const fields = resolveFields(document, context, new Set());
  for (const field of inheritedFields) fields.set(field.name, field);
  const owners = structuralNodesInDocument(document);
  let entersRepeater = false;
  let hasLocalBranch = false;
  for (const owner of owners) {
    const candidate = structuralChildSchemasInternal(
      document,
      owner,
      context,
      resolveFields,
      new Set(),
    ).find((entry) => entry.node.id === nodeId);
    if (!candidate) continue;
    hasLocalBranch = true;
    const item = objectField('item', candidate.schema);
    const index: FieldDefinition = {
      name: 'index',
      type: 'number',
      required: true,
      schema: { type: 'integer' },
    };
    if (owner.type === 'repeater') {
      entersRepeater = true;
      fields.set('item', item);
      fields.set('index', index);
      fields.set('props', objectField('props', candidate.payloadSchema));
    } else {
      fields.set('props', objectField('props', candidate.payloadSchema));
    }
    break;
  }
  if (!hasLocalBranch) {
    const props = componentDataSchemaInternal(document.id, context, resolveFields, new Set());
    if (props) fields.set('props', objectField('props', props));
  }
  const parentFields = inheritedFields.filter((field) =>
    ['item', 'index', 'parent'].includes(field.name),
  );
  if (
    entersRepeater &&
    parentFields.some((field) => field.name === 'item' || field.name === 'index')
  ) {
    fields.set(
      'parent',
      objectField(
        'parent',
        {
          type: 'object',
          properties: Object.fromEntries(
            parentFields.map((field) => [
              field.name,
              fieldJsonSchema(field, context.schemaCatalog),
            ]),
          ),
          required: parentFields.filter((field) => field.required).map((field) => field.name),
          additionalProperties: false,
        },
        parentFields,
      ),
    );
  }
  return [...fields.values()];
}

export function structuralSelection(
  value: unknown,
  candidates: readonly Pick<StructuralChildSchema, 'caseValue' | 'payloadSchema' | 'schema'>[],
): StructuralSelection | undefined {
  if (isObject(value) && Object.hasOwn(value, 'type') && Object.hasOwn(value, 'props')) {
    const index = candidates.findIndex((candidate) => candidate.caseValue === value.type);
    if (index < 0) return undefined;
    const candidate = candidates[index]!;
    return isFieldValue(value.props) && matchesSchemaValue(value.props, candidate.payloadSchema)
      ? { index, caseValue: candidate.caseValue, props: value.props, legacy: false }
      : undefined;
  }
  const index = matchingSchemaIndex(
    value,
    candidates.map((candidate) => candidate.payloadSchema),
  );
  return index < 0 || !isFieldValue(value)
    ? undefined
    : {
        index,
        caseValue: candidates[index]!.caseValue,
        props: value,
        legacy: true,
      };
}

export function structuralNodesForContract(document: ContractDocument) {
  if ('root' in document) {
    const structural: Extract<NestedNode, { type: 'repeater' | 'switch' }>[] = [];
    const visit = (node: NestedNode) => {
      if (node.type === 'repeater' || node.type === 'switch') {
        structural.push(node);
      } else if (node.type === 'frame') {
        for (const child of node.children ?? []) visit(child);
      }
    };
    visit(document.root);
    return structural;
  }
  const structural: Extract<FlatNode, { type: 'repeater' | 'switch' }>[] = [];
  const visit = (id: string) => {
    const node = document.nodes[id];
    if (!node) return;
    if (node.type === 'repeater' || node.type === 'switch') {
      structural.push(node);
    } else if (node.type === 'frame') {
      for (const childId of node.children) visit(childId);
    }
  };
  visit(document.rootId);
  return structural;
}

function structuralChildSchemasInternal(
  document: ContractDocument,
  node: StructuralNodeInput,
  context: SchemaResolverContext,
  resolveFields: StructuralFieldResolver,
  ancestors: ReadonlySet<string>,
): StructuralChildSchema[] {
  const payloads: Array<{ node: StructuralInstance; payloadSchema: JsonSchema; path: string[] }> =
    [];
  for (const child of childrenOf(document, node)) {
    const currentPath = [child.node.id];
    if (child.node.type === 'instance') {
      const schema = componentDataSchemaInternal(
        child.node.component,
        context,
        resolveFields,
        ancestors,
      );
      if (schema) payloads.push({ node: child.node, payloadSchema: schema, path: currentPath });
      continue;
    }
    if (child.node.type === 'switch') {
      for (const alternative of childrenOf(document, child.node)) {
        if (alternative.node.type !== 'instance') continue;
        const schema = componentDataSchemaInternal(
          alternative.node.component,
          context,
          resolveFields,
          ancestors,
        );
        if (schema) {
          payloads.push({
            node: alternative.node,
            payloadSchema: schema,
            path: [child.node.id, alternative.node.id],
          });
        }
      }
    }
  }
  const explicitCases = new Map<string, string>();
  for (const candidate of payloads) {
    const value = candidate.node.switchCase?.trim();
    if (!value) continue;
    const previous = explicitCases.get(value);
    if (previous) {
      throw new DocumentError(
        'schema',
        `Structural case "${value}" is duplicated by instances "${previous}" and "${candidate.node.id}"`,
      );
    }
    explicitCases.set(value, candidate.node.id);
  }
  const used = new Set(explicitCases.keys());
  return payloads.map(({ node: instance, payloadSchema, path }) => {
    const caseValue =
      instance.switchCase?.trim() ||
      uniqueCaseValue(defaultCaseValue(instance.component, context), used);
    used.add(caseValue);
    return {
      node: instance,
      caseValue,
      payloadSchema,
      schema: {
        type: 'object',
        properties: {
          type: { type: 'string', const: caseValue },
          props: payloadSchema,
        },
        required: ['type', 'props'],
        additionalProperties: false,
      },
      path,
    };
  });
}

function structuralNodesInDocument(document: ContractDocument): StructuralNodeInput[] {
  const nodes: StructuralNodeInput[] = [];
  if ('root' in document) {
    const visit = (node: NestedNode) => {
      if (node.type === 'repeater' || node.type === 'switch') nodes.push(node);
      else if (node.type === 'frame') for (const child of node.children ?? []) visit(child);
    };
    visit(document.root);
    return nodes;
  }
  const visit = (id: string) => {
    const node = document.nodes[id];
    if (!node) return;
    if (node.type === 'repeater' || node.type === 'switch') nodes.push(node);
    else if (node.type === 'frame') for (const childId of node.children) visit(childId);
  };
  visit(document.rootId);
  return nodes;
}

function defaultCaseValue(componentId: string, context: SchemaResolverContext) {
  const target = context.documents.get(componentId);
  return structuralCaseSlug(target?.name || componentId);
}

export function structuralCaseSlug(value: string) {
  const slug = value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'case';
}

function uniqueCaseValue(base: string, used: ReadonlySet<string>) {
  let value = base;
  let suffix = 2;
  while (used.has(value)) value = `${base}-${suffix++}`;
  return value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFieldValue(value: unknown): value is FieldValue {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) return value.every(isFieldValue);
  return isObject(value) && Object.values(value).every(isFieldValue);
}

function objectField(
  name: string,
  schema: JsonSchema,
  fields: readonly FieldDefinition[] = fieldsForObjectSchema(schema),
): FieldDefinition {
  return {
    name,
    type: 'object',
    required: true,
    schema,
    ...(fields.length ? { items: { type: 'object', fields: [...fields] } } : {}),
  };
}

function fieldsForObjectSchema(schema: JsonSchema): FieldDefinition[] {
  const branches = schema.anyOf ?? schema.oneOf ?? schema.allOf ?? [schema];
  const branchProperties = branches.map((branch) => branch.properties ?? {});
  const names = [...new Set(branchProperties.flatMap((properties) => Object.keys(properties)))];
  return names.map((name) => {
    const schemas = branchProperties.flatMap((properties) =>
      properties[name] ? [properties[name]!] : [],
    );
    const propertySchema = schemas.length === 1 ? schemas[0]! : { anyOf: schemas };
    const required = branches.every((branch) => branch.required?.includes(name));
    return fieldFromSchema(name, propertySchema, required);
  });
}

function fieldFromSchema(name: string, schema: JsonSchema, required: boolean): FieldDefinition {
  const branches = schema.anyOf ?? schema.oneOf ?? schema.allOf ?? [schema];
  const types = branches.map((branch) => branch.type);
  const type = branches.every((branch) => typeof branch.const === 'string')
    ? 'text'
    : types.every((value) => value === 'number' || value === 'integer')
      ? 'number'
      : types.every((value) => value === 'boolean')
        ? 'boolean'
        : types.every((value) => value === 'array')
          ? 'array'
          : types.every((value) => value === 'object' || value === undefined) ||
              branches.every((branch) => Boolean(branch.properties))
            ? 'object'
            : 'text';
  return {
    name,
    type,
    ...(required ? { required: true } : {}),
    schema,
    ...(type === 'object'
      ? { items: { type: 'object', fields: fieldsForObjectSchema(schema) } }
      : {}),
  };
}

function componentDataSchemaInternal(
  documentId: string,
  context: SchemaResolverContext,
  resolveFields: StructuralFieldResolver,
  ancestors: ReadonlySet<string>,
): JsonSchema | undefined {
  const document = context.documents.get(documentId);
  if (!document) return undefined;
  if (ancestors.has(documentId)) {
    throw new DocumentError('schema', `Structural contract cycle through "${documentId}"`);
  }
  const fields = resolveFields(document, context, ancestors);
  const direct = directComponentSchema(document, context.schemaCatalog);
  const contributedFields = direct
    ? [...fields].filter(
        ([name]) => name !== 'value' && !Object.hasOwn(direct.properties ?? {}, name),
      )
    : [...fields];
  const properties = Object.fromEntries(
    contributedFields.map(([name, field]) => [name, fieldJsonSchema(field, context.schemaCatalog)]),
  );
  const required = contributedFields
    .map(([, field]) => field)
    .filter((field) => field.required === true && field.default === undefined)
    .map((field) => field.name);
  const generated: JsonSchema = {
    type: 'object',
    properties,
    ...(required.length ? { required } : {}),
    additionalProperties: true,
  };
  return direct ? extendDirectSchema(direct, generated) : generated;
}

function directComponentSchema(
  document: ContractDocument,
  schemaCatalog?: SchemaResolverContext['schemaCatalog'],
): JsonSchema | undefined {
  const direct = document.schemaUse?.direct;
  if (direct?.kind !== 'schema') return undefined;
  const schema = schemaCatalog?.schemas.find((entry) => entry.id === direct.schemaId)?.schema;
  return schema ? resolveJsonSchema(schema, schemaCatalog) : undefined;
}

function extendDirectSchema(source: JsonSchema, generated: JsonSchema): JsonSchema {
  if (source.oneOf || source.anyOf) {
    const keyword = source.oneOf ? 'oneOf' : 'anyOf';
    return {
      ...source,
      [keyword]: (source[keyword] ?? []).map((branch) => extendDirectSchema(branch, generated)),
    };
  }
  if (source.type !== 'object' && !source.properties) return source;
  return {
    ...source,
    ...generated,
    properties: { ...(source.properties ?? {}), ...(generated.properties ?? {}) },
    ...(source.required || generated.required
      ? { required: [...new Set([...(source.required ?? []), ...(generated.required ?? [])])] }
      : {}),
    additionalProperties: source.additionalProperties,
  };
}

function fieldJsonSchema(
  field: FieldDefinition,
  schemaCatalog?: SchemaResolverContext['schemaCatalog'],
): JsonSchema {
  if (field.schema) return resolveJsonSchema(field.schema, schemaCatalog);
  if (field.type === 'array') {
    return {
      type: 'array',
      ...(field.items?.schema
        ? { items: resolveJsonSchema(field.items.schema, schemaCatalog) }
        : field.items
          ? {
              items: fieldJsonSchema(
                {
                  name: `${field.name}[]`,
                  type: field.items.type,
                  ...(field.items.options ? { options: field.items.options } : {}),
                  ...(field.items.fields
                    ? { items: { type: field.items.type, fields: field.items.fields } }
                    : {}),
                },
                schemaCatalog,
              ),
            }
          : {}),
    };
  }
  if (field.type === 'object') {
    return {
      type: 'object',
      ...(field.items?.fields?.length
        ? {
            properties: Object.fromEntries(
              field.items.fields.map((item) => [item.name, fieldJsonSchema(item, schemaCatalog)]),
            ),
            required: field.items.fields.filter((item) => item.required).map((item) => item.name),
          }
        : {}),
    };
  }
  if (field.type === 'number') return { type: 'number' };
  if (field.type === 'boolean') return { type: 'boolean' };
  if (field.type === 'enum') return { type: 'string', enum: field.options };
  return { type: 'string' };
}

function findNode(document: ContractDocument, id: string) {
  if (!('root' in document)) return document.nodes[id];
  const visit = (node: NestedNode): NestedNode | undefined => {
    if (node.id === id) return node;
    if (!('children' in node)) return undefined;
    for (const child of node.children ?? []) {
      const found = visit(child);
      if (found) return found;
    }
    return undefined;
  };
  return visit(document.root);
}

function childrenOf(document: ContractDocument, node: StructuralNodeInput) {
  if ('root' in document) {
    const nested = node as Extract<NestedNode, { type: 'repeater' | 'switch' }>;
    return (nested.children ?? []).map((child) => ({ node: child }));
  }
  const flat = node as Extract<FlatNode, { type: 'repeater' | 'switch' }>;
  return flat.children.flatMap((id) => {
    const child = document.nodes[id];
    return child ? [{ node: child }] : [];
  });
}
