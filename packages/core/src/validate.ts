import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import { DocumentError } from './errors.js';
import { type FlatDocument, type FlatNode, toFlat } from './flat.js';
import { defaultNestingRules, type NestingRule } from './kinds.js';
import {
  createDocumentSchema,
  documentFileSchema,
  fieldTypes,
  type Binding,
  type DocumentFile,
  type DocumentSchemaOptions,
  type FieldDefinition,
  type FieldValue,
} from './schema.js';

export interface ValidateOptions {
  rules?: Readonly<Record<string, NestingRule>>;
  /** When set, instance targets must resolve to a kind allowed by the nesting rule. */
  resolveKind?: (componentId: string) => string | undefined;
}

const ajv = new Ajv({ allErrors: true, strict: false });
const validateFile: ValidateFunction = ajv.compile(documentFileSchema);

export function validateDocumentFile(data: unknown): DocumentFile {
  if (!validateFile(data)) {
    throw new DocumentError('schema', formatErrors(validateFile.errors));
  }
  return data as DocumentFile;
}

export function compileDocumentValidator(options: DocumentSchemaOptions = {}): ValidateFunction {
  return new Ajv({ allErrors: true, strict: false }).compile(createDocumentSchema(options));
}

/** Tree shape: reachable nodes, no cycles, and the kind's nesting rule. */
export function validateTree(doc: FlatDocument, options: ValidateOptions = {}): void {
  const rules = (options.rules ?? defaultNestingRules) as Readonly<Record<string, NestingRule>>;
  const rule = rules[doc.kind];
  if (!rule) {
    throw new DocumentError('unknown-kind', `No nesting rule for kind "${doc.kind}"`);
  }
  if (!doc.nodes[doc.rootId]) {
    throw new DocumentError('missing-node', `Missing root "${doc.rootId}"`);
  }

  const seen = new Set<string>();
  const visit = (id: string, isRoot: boolean, parentId: string | null) => {
    if (seen.has(id)) {
      throw new DocumentError('cycle', `Node "${id}" is repeated in the tree`);
    }
    const node = doc.nodes[id];
    if (!node) {
      throw new DocumentError('missing-node', `Missing node "${id}"`);
    }
    if (node.id !== id) {
      throw new DocumentError('schema', `Node key "${id}" does not match its id "${node.id}"`);
    }
    seen.add(id);
    const allowed = isRoot ? rule.rootNodeTypes : rule.nodeTypes;
    if (!allowed.includes(node.type)) {
      const where = isRoot ? 'as the root' : `under "${parentId}"`;
      throw new DocumentError(
        'nesting',
        `${doc.kind} cannot contain a ${node.type} node ${where} ("${id}")`,
      );
    }
    assertNodeData(node);
    if (node.type === 'instance' && options.resolveKind) {
      const kind = options.resolveKind(node.component);
      if (kind === undefined) {
        throw new DocumentError('unknown-component', `Unknown component "${node.component}"`);
      }
      if (!rule.instanceKinds.includes(kind)) {
        throw new DocumentError(
          'nesting',
          `${doc.kind} cannot contain an instance of ${kind} "${node.component}"`,
        );
      }
    }
    if (node.type === 'frame') {
      for (const childId of node.children) visit(childId, false, id);
    }
  };

  visit(doc.rootId, true, null);
  for (const id of Object.keys(doc.nodes)) {
    if (!seen.has(id)) {
      throw new DocumentError('orphan', `Node "${id}" is not reachable from the root`);
    }
  }
}

export function validateDefinitions(doc: FlatDocument): void {
  const names = new Set<string>();
  for (const field of doc.fields) {
    assertFieldDefinition(field);
    if (names.has(field.name)) {
      throw new DocumentError('schema', `Duplicate field "${field.name}"`);
    }
    names.add(field.name);
  }
  const axes = new Set<string>();
  for (const axis of doc.variants) {
    assertVariantAxis(axis);
    if (axes.has(axis.name)) {
      throw new DocumentError('schema', `Duplicate variant axis "${axis.name}"`);
    }
    axes.add(axis.name);
  }
  for (const node of Object.values(doc.nodes)) {
    if (node.type === 'instance') continue;
    for (const binding of node.bindings ?? []) {
      if (!names.has(binding.field)) {
        throw new DocumentError(
          'unknown-field',
          `Node "${node.id}" binds unknown field "${binding.field}"`,
        );
      }
    }
  }
}

/** Schema, nesting, and — when every file is passed together — instance targets. */
export function validateCatalog(files: readonly unknown[]): DocumentFile[] {
  const documents = files.map((file) => validateDocumentFile(file));
  const byId = new Map<string, DocumentFile>();
  for (const document of documents) {
    if (byId.has(document.id)) {
      throw new DocumentError('duplicate-id', `Duplicate document id "${document.id}"`);
    }
    byId.set(document.id, document);
  }
  for (const document of documents) {
    const flat = toFlat(document);
    validateDefinitions(flat);
    validateTree(flat, {
      resolveKind: (componentId) => byId.get(componentId)?.kind,
    });
    validateInstanceOverrides(flat, byId);
  }
  return documents;
}

export function assertFieldDefinition(field: FieldDefinition): void {
  if (!fieldTypes.includes(field.type)) {
    throw new DocumentError('schema', `Unknown field type "${field.type}"`);
  }
  if (field.type === 'enum') {
    if (!field.options?.length) {
      throw new DocumentError('schema', `Enum field "${field.name}" needs options`);
    }
    if (new Set(field.options).size !== field.options.length) {
      throw new DocumentError('schema', `Enum field "${field.name}" has duplicate options`);
    }
  } else if (field.options) {
    throw new DocumentError('schema', `Only enum fields can have options ("${field.name}")`);
  }
  if (field.default !== undefined) {
    assertValueMatches(field, field.default);
  }
}

export function assertVariantAxis(axis: {
  name: string;
  values: string[];
  default?: string;
}): void {
  if (!axis.values.length) {
    throw new DocumentError('schema', `Variant "${axis.name}" needs at least one value`);
  }
  if (new Set(axis.values).size !== axis.values.length) {
    throw new DocumentError('schema', `Variant "${axis.name}" has duplicate values`);
  }
  if (axis.default !== undefined && !axis.values.includes(axis.default)) {
    throw new DocumentError(
      'schema',
      `Variant default "${axis.default}" is not a value of "${axis.name}"`,
    );
  }
}

export function assertValueMatches(field: FieldDefinition, value: FieldValue): void {
  const label = `Field "${field.name}"`;
  switch (field.type) {
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new DocumentError('schema', `${label} expects a boolean`);
      }
      return;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new DocumentError('schema', `${label} expects a finite number`);
      }
      return;
    case 'enum':
      if (typeof value !== 'string' || !field.options?.includes(value)) {
        throw new DocumentError('schema', `${label} must be one of ${field.options?.join(', ')}`);
      }
      return;
    default:
      if (typeof value !== 'string') {
        throw new DocumentError('schema', `${label} expects a string`);
      }
  }
}

function validateInstanceOverrides(doc: FlatDocument, catalog: Map<string, DocumentFile>): void {
  for (const node of Object.values(doc.nodes)) {
    if (node.type !== 'instance') continue;
    const target = catalog.get(node.component);
    if (!target) continue;
    const fields = new Map((target.fields ?? []).map((field) => [field.name, field]));
    for (const [name, value] of Object.entries(node.fields ?? {})) {
      const field = fields.get(name);
      if (!field) {
        throw new DocumentError(
          'unknown-field',
          `Instance "${node.id}" sets unknown field "${name}" on "${node.component}"`,
        );
      }
      assertValueMatches(field, value);
    }
    const axes = new Map((target.variants ?? []).map((axis) => [axis.name, axis]));
    for (const [name, value] of Object.entries(node.variants ?? {})) {
      const axis = axes.get(name);
      if (!axis) {
        throw new DocumentError(
          'unknown-variant',
          `Instance "${node.id}" sets unknown variant "${name}" on "${node.component}"`,
        );
      }
      if (!axis.values.includes(value)) {
        throw new DocumentError(
          'unknown-variant',
          `Instance "${node.id}" uses "${value}" for "${name}", expected ${axis.values.join(', ')}`,
        );
      }
    }
  }
}

function assertNodeData(node: FlatNode): void {
  if (node.type !== 'instance') {
    assertAttributes(node.attributes);
    assertBindings(node.bindings);
  }
  if (node.layout) assertLayout(node.layout);
  if (node.type === 'frame') {
    const children = new Set<string>();
    for (const childId of node.children) {
      if (children.has(childId)) {
        throw new DocumentError('duplicate-id', `Duplicate child "${childId}" under "${node.id}"`);
      }
      children.add(childId);
    }
  }
  if (node.type === 'instance' && node.fields) {
    for (const value of Object.values(node.fields)) {
      if (typeof value === 'number' && !Number.isFinite(value)) {
        throw new DocumentError('schema', `Instance "${node.id}" has a non-finite field value`);
      }
    }
  }
}

const EVENT_ATTRIBUTE = /^on/i;

export function assertAttributes(attributes: Record<string, string> | undefined): void {
  if (!attributes) return;
  for (const key of Object.keys(attributes)) {
    if (EVENT_ATTRIBUTE.test(key)) {
      throw new DocumentError('schema', `Attribute "${key}" is not allowed`);
    }
  }
}

export function assertBindings(bindings: Binding[] | undefined): void {
  for (const binding of bindings ?? []) {
    if ((binding.target === 'attribute' || binding.target === 'style') && !binding.name) {
      throw new DocumentError(
        'schema',
        `Binding "${binding.field}" targeting ${binding.target} needs a name`,
      );
    }
    if (binding.target === 'attribute' && binding.name && EVENT_ATTRIBUTE.test(binding.name)) {
      throw new DocumentError('schema', `Binding attribute "${binding.name}" is not allowed`);
    }
  }
}

export function assertLayout(layout: NonNullable<FlatNode['layout']>): void {
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    const value = layout[key];
    if (value === undefined) continue;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new DocumentError('schema', `Layout ${key} must be a finite number`);
    }
  }
  if (layout.width !== undefined && layout.width <= 0) {
    throw new DocumentError('schema', 'Layout width must be greater than 0');
  }
  if (layout.height !== undefined && layout.height <= 0) {
    throw new DocumentError('schema', 'Layout height must be greater than 0');
  }
}

function formatErrors(errors: ErrorObject[] | null | undefined): string {
  if (!errors?.length) return 'Document does not match the schema';
  return errors
    .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`.trim())
    .join('; ');
}
