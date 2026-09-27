import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import { DocumentError } from './errors.js';
import { type FlatDocument, type FlatNode, toFlat } from './flat.js';
import { defaultNestingRules, type NestingRule } from './kinds.js';
import { assertBreakpoints, assertFonts } from './libraries.js';
import { parseLayout } from './layout.js';
import {
  createDocumentSchema,
  documentFileSchema,
  fieldTypes,
  type Binding,
  type DocumentFile,
  type DocumentSchemaOptions,
  type EventDefinition,
  type Expose,
  type FieldDefinition,
  type FieldValue,
  type NestedNode,
  type VariantPreset,
  isVariantAxis,
} from './schema.js';
import { variantPresets } from './variants.js';
import { readTokenTree } from './token-tree.js';
import { assertStyleContract } from './style-block.js';

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

/** Fonts, breakpoints, and the DTCG tree. Reference targets are resolved by `@facadeur/tokens`. */
export function validateLibraries(doc: FlatDocument): void {
  assertFonts(doc.fonts);
  assertBreakpoints(doc.settings.breakpoints);
  readTokenTree(doc.tokens);
  assertStyleContract(doc);
}

/** Sections and pages do not own component properties. Atoms and components do. */
export function assertDefinitionKind(doc: FlatDocument): void {
  if (doc.kind !== 'section' && doc.kind !== 'page') return;
  if (doc.fields.length) {
    throw new DocumentError('schema', `${doc.kind} documents cannot define fields`);
  }
  if (doc.variants.length) {
    throw new DocumentError('schema', `${doc.kind} documents cannot define variants`);
  }
  if (doc.variantPresets?.length) {
    throw new DocumentError('schema', `${doc.kind} documents cannot define variants`);
  }
}

export function validateDefinitions(doc: FlatDocument): void {
  assertDefinitionKind(doc);
  const names = new Set<string>();
  for (const field of doc.fields) {
    assertFieldDefinition(field);
    if (names.has(field.name)) {
      throw new DocumentError('schema', `Duplicate field "${field.name}"`);
    }
    names.add(field.name);
  }
  const events = doc.events ?? [];
  const eventNames = new Set<string>();
  for (const event of events) {
    assertEventDefinition(event);
    if (eventNames.has(event.name)) {
      throw new DocumentError('schema', `Duplicate event "${event.name}"`);
    }
    eventNames.add(event.name);
  }
  if (doc.expose) assertExpose(doc.expose);
  const variantNames = new Set<string>();
  for (const axis of doc.variants) {
    assertVariantAxis(axis);
    if (variantNames.has(axis.name)) {
      throw new DocumentError('schema', `Duplicate variant "${axis.name}"`);
    }
    variantNames.add(axis.name);
  }
  for (const variant of doc.variantPresets ?? []) {
    assertVariantPreset(variant);
    assertVariantTargets(doc, variant);
    if (variantNames.has(variant.name)) {
      throw new DocumentError('schema', `Duplicate variant "${variant.name}"`);
    }
    variantNames.add(variant.name);
    for (const [name, value] of Object.entries(variant.overrides?.fields ?? {})) {
      const field = doc.fields.find((entry) => entry.name === name);
      if (!field) {
        throw new DocumentError(
          'unknown-field',
          `Variant "${variant.name}" overrides unknown field "${name}"`,
        );
      }
      assertValueMatches(field, value);
    }
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
    for (const binding of node.eventBindings ?? []) {
      if (!eventNames.has(binding.event)) {
        throw new DocumentError(
          'unknown-event',
          `Node "${node.id}" binds unknown event "${binding.event}"`,
        );
      }
      if (!binding.name.trim()) {
        throw new DocumentError('schema', `Event binding "${binding.event}" needs a native event`);
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
    validateLibraries(flat);
    validateTree(flat, {
      resolveKind: (componentId) => byId.get(componentId)?.kind,
    });
    validateExposedContracts(document, byId);
    validateInstanceOverrides(flat, byId);
  }
  return documents;
}

function validateExposedContracts(
  document: DocumentFile,
  catalog: Map<string, DocumentFile>,
): void {
  for (const [name, path] of Object.entries(document.expose?.fields ?? {})) {
    const field = resolveExposedField(document, path, catalog, new Set());
    if (!field) {
      throw new DocumentError(
        'unknown-field',
        `Exposed field "${name}" on "${document.id}" does not resolve a child field`,
      );
    }
  }
  for (const [name, path] of Object.entries(document.expose?.events ?? {})) {
    const event = resolveExposedEvent(document, path, catalog, new Set());
    if (!event) {
      throw new DocumentError(
        'unknown-event',
        `Exposed event "${name}" on "${document.id}" does not resolve a child event`,
      );
    }
  }
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
  if (field.items && field.type !== 'array' && field.type !== 'object') {
    throw new DocumentError(
      'schema',
      `Only array and object fields can define items ("${field.name}")`,
    );
  }
  if ((field.type === 'array' || field.type === 'object') && field.items) {
    if (field.type === 'array' && field.items.type === 'object' && !field.items.fields?.length) {
      throw new DocumentError('schema', `Object array field "${field.name}" needs item fields`);
    }
    for (const item of field.items.fields ?? []) assertFieldDefinition(item);
  }
  if (field.default !== undefined) {
    assertValueMatches(field, field.default);
  }
}

export function assertEventDefinition(event: EventDefinition): void {
  if (!event.name.trim()) {
    throw new DocumentError('schema', 'Event names must not be empty');
  }
  for (const [name, type] of Object.entries(event.payload ?? {})) {
    if (!name.trim() || !fieldTypes.includes(type)) {
      throw new DocumentError('schema', `Event "${event.name}" has an invalid payload`);
    }
  }
}

export function assertExpose(expose: Expose): void {
  const names = new Set<string>();
  for (const [kind, paths] of [
    ['field', expose.fields ?? {}],
    ['event', expose.events ?? {}],
  ] as const) {
    for (const [name, path] of Object.entries(paths)) {
      if (names.has(name)) {
        throw new DocumentError('schema', `Expose name "${name}" is used more than once`);
      }
      names.add(name);
      if (!path.trim()) {
        throw new DocumentError('schema', `Exposed ${kind} "${name}" needs a path`);
      }
    }
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

export function assertVariantPreset(variant: VariantPreset): void {
  const overrides = variant.overrides;
  if (!overrides) return;
  for (const node of Object.values(overrides.nodes ?? {})) {
    if (!node.displayOn) continue;
    const hasEquals = node.displayOn.equals !== undefined;
    const hasTruthy = node.displayOn.truthy !== undefined;
    if (hasEquals === hasTruthy) {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" displayOn needs exactly one of equals or truthy`,
      );
    }
  }
  for (const insertion of overrides.insertions ?? []) {
    if (!insertion.node || typeof insertion.node !== 'object') {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" contains an invalid insertion node`,
      );
    }
  }
}

function assertVariantTargets(doc: FlatDocument, variant: VariantPreset): void {
  const overrides = variant.overrides;
  if (!overrides) return;
  for (const target of Object.keys(overrides.nodes ?? {})) {
    if (!hasNodeTarget(doc, target)) {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" targets unknown node "${target}" on "${doc.id}"`,
      );
    }
  }
  for (const target of overrides.removed ?? []) {
    if (!hasNodeTarget(doc, target)) {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" removes unknown node "${target}" on "${doc.id}"`,
      );
    }
    if (isRootTarget(doc, target)) {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" cannot remove the root node "${doc.rootId}"`,
      );
    }
  }
  for (const insertion of overrides.insertions ?? []) {
    if (!hasNodeTarget(doc, insertion.parent)) {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" inserts under unknown node "${insertion.parent}" on "${doc.id}"`,
      );
    }
    const parent = nodeForTarget(doc, insertion.parent);
    if (parent?.type !== 'frame') {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" can only insert under a frame ("${insertion.parent}")`,
      );
    }
  }
}

function hasNodeTarget(doc: FlatDocument, target: string): boolean {
  return Boolean(nodeForTarget(doc, target));
}

function isRootTarget(doc: FlatDocument, target: string): boolean {
  return target === doc.rootId || target === `${doc.rootId}`;
}

function nodeForTarget(doc: FlatDocument, target: string): FlatNode | undefined {
  const direct = doc.nodes[target];
  if (direct) return direct;
  const parts = target.split('.');
  if (parts[0] !== doc.rootId) return undefined;
  let current = doc.nodes[doc.rootId];
  for (const id of parts.slice(1)) {
    if (!current || current.type !== 'frame' || !current.children.includes(id)) return undefined;
    current = doc.nodes[id];
  }
  return current;
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
    case 'array':
      if (!Array.isArray(value)) throw new DocumentError('schema', `${label} expects an array`);
      if (field.items?.type === 'object') {
        for (const item of value) {
          if (!isRecord(item)) throw new DocumentError('schema', `${label} expects object items`);
          for (const definition of field.items.fields ?? []) {
            const nested = item[definition.name];
            if (nested !== undefined) assertValueMatches(definition, nested);
            else if (definition.required) {
              throw new DocumentError('schema', `${label} item is missing "${definition.name}"`);
            }
          }
        }
      }
      return;
    case 'object':
      if (!isRecord(value)) throw new DocumentError('schema', `${label} expects an object`);
      for (const definition of field.items?.fields ?? []) {
        const nested = value[definition.name];
        if (nested !== undefined) assertValueMatches(definition, nested);
        else if (definition.required) {
          throw new DocumentError('schema', `${label} is missing "${definition.name}"`);
        }
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
    const fields = exposedFields(target, catalog);
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
    for (const name of Object.keys(node.fieldBindings ?? {})) {
      if (!fields.has(name)) {
        throw new DocumentError(
          'unknown-field',
          `Instance "${node.id}" binds unknown field "${name}" on "${node.component}"`,
        );
      }
    }
    const axes = new Map(
      (target.variants ?? []).filter(isVariantAxis).map((axis) => [axis.name, axis]),
    );
    const presets = variantPresets(target);
    for (const [name, value] of Object.entries(node.variants ?? {})) {
      if (name === 'variant' && presets.length > 0) {
        if (!presets.some((preset) => preset.name === value)) {
          throw new DocumentError(
            'unknown-variant',
            `Instance "${node.id}" uses "${value}" for variant on "${node.component}", expected ${presets.map((preset) => preset.name).join(', ')}`,
          );
        }
        continue;
      }
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

function exposedFields(
  document: DocumentFile,
  catalog: Map<string, DocumentFile>,
  seen = new Set<string>(),
): Map<string, FieldDefinition> {
  const fields = new Map((document.fields ?? []).map((field) => [field.name, field]));
  for (const [name, path] of Object.entries(document.expose?.fields ?? {})) {
    const field = resolveExposedField(document, path, catalog, new Set(seen));
    if (field) fields.set(name, field);
  }
  return fields;
}

function resolveExposedField(
  document: DocumentFile,
  path: string,
  catalog: Map<string, DocumentFile>,
  seen: Set<string>,
): FieldDefinition | undefined {
  const key = `${document.id}:${path}`;
  if (seen.has(key)) throw new DocumentError('schema', `Cyclic expose path "${path}"`);
  seen.add(key);
  const [nodeId, ...rest] = path.split('.');
  const node = findNestedNode(document.root, nodeId);
  if (!node || node.type !== 'instance' || rest.length === 0) {
    throw new DocumentError('schema', `Expose path "${path}" on "${document.id}" is invalid`);
  }
  const child = catalog.get(node.component);
  if (!child) return undefined;
  const member = rest.join('.');
  const direct = child.fields?.find((field) => field.name === member);
  if (direct) return direct;
  const nested = child.expose?.fields?.[member];
  return nested ? resolveExposedField(child, nested, catalog, seen) : undefined;
}

function resolveExposedEvent(
  document: DocumentFile,
  path: string,
  catalog: Map<string, DocumentFile>,
  seen: Set<string>,
): EventDefinition | undefined {
  const key = `${document.id}:${path}`;
  if (seen.has(key)) throw new DocumentError('schema', `Cyclic expose path "${path}"`);
  seen.add(key);
  const [nodeId, ...rest] = path.split('.');
  const node = findNestedNode(document.root, nodeId);
  if (!node || node.type !== 'instance' || rest.length === 0) {
    throw new DocumentError('schema', `Expose path "${path}" on "${document.id}" is invalid`);
  }
  const child = catalog.get(node.component);
  if (!child) return undefined;
  const member = rest.join('.');
  const direct = child.events?.find((event) => event.name === member);
  if (direct) return direct;
  const nested = child.expose?.events?.[member];
  return nested ? resolveExposedEvent(child, nested, catalog, seen) : undefined;
}

function findNestedNode(node: NestedNode, id: string | undefined): NestedNode | undefined {
  if (!id) return undefined;
  if (node.id === id) return node;
  if (node.type !== 'frame') return undefined;
  for (const child of node.children ?? []) {
    const found = findNestedNode(child, id);
    if (found) return found;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, FieldValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
  if (node.type === 'instance' && node.expose) assertExpose(node.expose);
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
  parseLayout(layout);
}

function formatErrors(errors: ErrorObject[] | null | undefined): string {
  if (!errors?.length) return 'Document does not match the schema';
  return errors
    .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`.trim())
    .join('; ');
}
