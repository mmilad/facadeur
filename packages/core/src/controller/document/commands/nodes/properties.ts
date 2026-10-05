import { DocumentError } from '../../../../document/errors.js';
import {
  findParent,
  makeFlatNode,
  type FlatDocument,
  type FlatNode,
} from '../../../../document/flat.js';
import { ID_PATTERN } from '../../../../document/ids.js';
import { isPlainObject as isRecord } from '../../../../utils.js';
import type { FieldValue, VariantRule } from '../../../../schema/document.js';
import { assertStyleNameAvailable } from '../../../style/blocks/contract.js';
import {
  assertAttributes,
  assertBindings,
  assertDisplayOn,
  assertEventBindings,
  assertFieldBindings,
  assertRepeat,
} from '../../../validation/assertions.js';
import { assertValueMatches } from '../../../validation/assertions.js';
import { structuralCaseSlug } from '../../../validation/structural-nodes.js';
import { structuralCaseValue } from '../../../validation/catalog-exposed.js';
import type { Command, NodeProp, CommandContext } from '../types.js';
import { adoptTokenReads } from '../../../style/references/adopt.js';
import {
  isFieldValue,
  requireBindings,
  requireLayout,
  requireName,
  requireNode,
  requireString,
  requireStringRecord,
  requireTag,
} from './utils.js';
import type { NodeType } from '../../../../document/kinds.js';

const PROPS: Record<NodeType, readonly NodeProp[]> = {
  frame: [
    'name',
    'styleName',
    'tag',
    'attributes',
    'displayOn',
    'layout',
    'bindings',
    'eventBindings',
    'repeat',
  ],
  text: [
    'name',
    'styleName',
    'tag',
    'text',
    'attributes',
    'displayOn',
    'layout',
    'bindings',
    'eventBindings',
  ],
  image: [
    'name',
    'styleName',
    'tag',
    'src',
    'alt',
    'attributes',
    'displayOn',
    'layout',
    'bindings',
    'eventBindings',
  ],
  instance: [
    'name',
    'styleName',
    'displayOn',
    'layout',
    'component',
    'forwardFields',
    'switchCase',
    'fieldBindings',
    'variantRules',
  ],
  repeater: ['name'],
  switch: ['name'],
};

const CHILD_FIELD_PATH = /^[A-Za-z][A-Za-z0-9_-]*(\/[A-Za-z][A-Za-z0-9_-]*)*$/;

export function setProp(
  doc: FlatDocument,
  command: Extract<Command, { type: 'setProp' }>,
  context: CommandContext,
) {
  const node = requireNode(doc, command.nodeId);
  const oldCase =
    node.type === 'instance' && command.prop === 'switchCase'
      ? (node.switchCase ?? caseValueFor(doc, node, context))
      : undefined;
  if (command.prop === 'styleName' && typeof command.value === 'string') {
    assertStyleNameAvailable(doc, command.value, node.id);
  }
  if (!PROPS[node.type].includes(command.prop)) {
    throw new DocumentError('schema', `${node.type} nodes have no "${command.prop}" property`);
  }
  if (node.type === 'instance') {
    applyInstanceProp(node, command.prop, command.value);
  } else {
    applyElementProp(node, command.prop, command.value);
  }
  if (node.type === 'instance' && command.prop === 'switchCase' && oldCase) {
    const nextCase = node.switchCase ?? caseValueFor(doc, node, context);
    if (nextCase !== oldCase) renamePreviewCase(doc, node, oldCase, nextCase);
  }
  doc.nodes[node.id] = makeFlatNode(node);
  if (command.prop === 'layout') adoptTokenReads(doc);
}

function caseValueFor(
  doc: FlatDocument,
  node: Extract<FlatNode, { type: 'instance' }>,
  context: CommandContext,
) {
  if (context.schemaResolverContext) {
    return structuralCaseValue(doc, node, context.schemaResolverContext);
  }
  return structuralCaseSlug(node.component);
}

function renamePreviewCase(
  doc: FlatDocument,
  node: Extract<FlatNode, { type: 'instance' }>,
  previous: string,
  next: string,
) {
  const parent = findParent(doc, node.id);
  const structuralParent =
    parent?.type === 'switch' && findParent(doc, parent.id)?.type === 'repeater'
      ? findParent(doc, parent.id)
      : parent;
  const field =
    structuralParent?.type === 'repeater'
      ? 'items'
      : structuralParent?.type === 'switch'
        ? 'props'
        : undefined;
  if (!field || !doc.previewData) return;
  const renameValue = (value: FieldValue): FieldValue => {
    if (Array.isArray(value)) return value.map(renameValue);
    if (!isRecord(value)) return value;
    if (value.type === previous && Object.hasOwn(value, 'props')) {
      return { ...value, type: next } as FieldValue;
    }
    return value;
  };
  const fields = doc.previewData.fields;
  if (fields && Object.hasOwn(fields, field)) fields[field] = renameValue(fields[field]!);
  for (const values of Object.values(doc.previewData.variants ?? {})) {
    if (Object.hasOwn(values, field)) values[field] = renameValue(values[field]!);
  }
}

export function setField(doc: FlatDocument, command: Extract<Command, { type: 'setField' }>) {
  const node = requireNode(doc, command.nodeId);
  if (node.type !== 'instance') {
    throw new DocumentError('schema', 'Only instances can override fields');
  }
  if (!ID_PATTERN.test(command.field)) {
    throw new DocumentError('schema', `Invalid field name "${command.field}"`);
  }
  const fields = { ...(node.fields ?? {}) };
  if (command.value === null) {
    delete fields[command.field];
  } else if (isFieldValue(command.value)) {
    fields[command.field] = command.value;
  } else {
    throw new DocumentError('schema', 'Field values must be a string, number, or boolean');
  }
  node.fields = fields;
  doc.nodes[node.id] = makeFlatNode(node);
}

export function setChildField(
  doc: FlatDocument,
  command: Extract<Command, { type: 'setChildField' }>,
  ctx: CommandContext = {},
) {
  const node = requireNode(doc, command.nodeId);
  if (node.type !== 'instance') {
    throw new DocumentError('schema', 'Only instances can override child fields');
  }
  if (!CHILD_FIELD_PATH.test(command.path)) {
    throw new DocumentError('schema', `Invalid child instance path "${command.path}"`);
  }
  if (!ID_PATTERN.test(command.field)) {
    throw new DocumentError('schema', `Invalid field name "${command.field}"`);
  }
  const childFields = structuredClone(node.childFields ?? {});
  const fields = { ...(childFields[command.path] ?? {}) };
  if (command.value === null) delete fields[command.field];
  else {
    if (!isFieldValue(command.value))
      throw new DocumentError('schema', 'Field values must be a string, number, or boolean');
    const definition = ctx.resolveChildField?.(node, command.path, command.field);
    if (ctx.resolveChildField && !definition) {
      throw new DocumentError(
        'unknown-field',
        `Instance "${node.id}" sets unknown child field "${command.path}.${command.field}"`,
      );
    }
    if (definition) assertValueMatches(definition, command.value);
    fields[command.field] = structuredClone(command.value);
  }
  if (Object.keys(fields).length) childFields[command.path] = fields;
  else delete childFields[command.path];
  node.childFields = childFields;
  doc.nodes[node.id] = makeFlatNode(node);
}

export function setVariant(doc: FlatDocument, command: Extract<Command, { type: 'setVariant' }>) {
  const node = requireNode(doc, command.nodeId);
  if (node.type !== 'instance') {
    throw new DocumentError('schema', 'Only instances can override variants');
  }
  if (!ID_PATTERN.test(command.axis)) {
    throw new DocumentError('schema', `Invalid variant axis "${command.axis}"`);
  }
  const variants = { ...(node.variants ?? {}) };
  if (command.value === null) {
    delete variants[command.axis];
  } else if (typeof command.value === 'string' && command.value.length > 0) {
    variants[command.axis] = command.value;
  } else {
    throw new DocumentError('schema', 'Variant values must be non-empty strings');
  }
  node.variants = variants;
  doc.nodes[node.id] = makeFlatNode(node);
}

function applyElementProp(
  node: Exclude<FlatNode, { type: 'instance' }>,
  prop: NodeProp,
  value: unknown,
) {
  switch (prop) {
    case 'name':
      assignName(node, value);
      return;
    case 'styleName':
      if (value === null) delete node.styleName;
      else if (typeof value === 'string' && /^[A-Za-z_][A-Za-z0-9_-]*$/.test(value))
        node.styleName = value;
      else
        throw new DocumentError('schema', 'CSS class names must start with a letter or underscore');
      return;
    case 'tag':
      if (value === null) delete node.tag;
      else node.tag = requireTag(value);
      return;
    case 'text':
      if (node.type !== 'text') break;
      if (value === null) delete node.text;
      else node.text = requireString(value, 'text');
      return;
    case 'src':
      if (node.type !== 'image') break;
      if (value === null) delete node.src;
      else node.src = requireString(value, 'src');
      return;
    case 'alt':
      if (node.type !== 'image') break;
      if (value === null) delete node.alt;
      else node.alt = requireString(value, 'alt');
      return;
    case 'attributes':
      if (value === null) delete node.attributes;
      else {
        const attributes = requireStringRecord(value, 'attributes');
        assertAttributes(attributes);
        node.attributes = attributes;
      }
      return;
    case 'displayOn':
      if (value === null) delete node.displayOn;
      else {
        assertDisplayOn(value);
        node.displayOn = { ...value };
      }
      return;
    case 'layout':
      if (value === null) delete node.layout;
      else node.layout = requireLayout(value);
      return;
    case 'bindings':
      if (value === null) delete node.bindings;
      else {
        const bindings = requireBindings(value);
        assertBindings(bindings);
        node.bindings = bindings;
      }
      return;
    case 'eventBindings':
      if (value === null) delete node.eventBindings;
      else {
        assertEventBindings(value);
        node.eventBindings = value.map((binding) => structuredClone(binding));
      }
      return;
    case 'repeat':
      if (node.type !== 'frame') break;
      if (value === null) delete node.repeat;
      else {
        assertRepeat(value);
        node.repeat = { ...value };
      }
      return;
    case 'variantRules':
    case 'component':
    case 'switchCase':
      break;
    case 'forwardFields':
    case 'fieldBindings':
      break;
    default: {
      const unreachable: never = prop;
      throw new DocumentError('schema', `Unknown property ${String(unreachable)}`);
    }
  }
  throw new DocumentError('schema', `${node.type} nodes have no "${prop}" property`);
}

function applyInstanceProp(
  node: Extract<FlatNode, { type: 'instance' }>,
  prop: NodeProp,
  value: unknown,
) {
  switch (prop) {
    case 'styleName':
      if (value === null) delete node.styleName;
      else if (typeof value === 'string' && /^[A-Za-z_][A-Za-z0-9_-]*$/.test(value))
        node.styleName = value;
      else
        throw new DocumentError('schema', 'CSS class names must start with a letter or underscore');
      return;
    case 'variantRules':
      if (value === null) delete node.variantRules;
      else {
        if (!Array.isArray(value))
          throw new DocumentError('schema', 'Variant rules must be a list');
        for (const rule of value) {
          if (!isRecord(rule) || typeof rule.variant !== 'string' || !ID_PATTERN.test(rule.variant))
            throw new DocumentError('schema', 'Variant rule needs a valid variant');
          assertDisplayOn(rule.when);
        }
        node.variantRules = structuredClone(value) as VariantRule[];
      }
      return;
    case 'name':
      assignName(node, value);
      return;
    case 'layout':
      if (value === null) delete node.layout;
      else node.layout = requireLayout(value);
      return;
    case 'displayOn':
      if (value === null) delete node.displayOn;
      else {
        assertDisplayOn(value);
        node.displayOn = { ...value };
      }
      return;
    case 'component':
      if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
        throw new DocumentError('schema', 'Instances require a component id');
      }
      node.component = value;
      return;
    case 'fieldBindings':
      if (value === null) delete node.fieldBindings;
      else {
        assertFieldBindings(value);
        node.fieldBindings = { ...value };
      }
      return;
    case 'forwardFields':
      if (value === null) delete node.forwardFields;
      else if (typeof value === 'boolean') node.forwardFields = value;
      else throw new DocumentError('schema', 'forwardFields must be a boolean');
      return;
    case 'switchCase':
      if (value === null) delete node.switchCase;
      else if (typeof value === 'string' && value.trim()) node.switchCase = value.trim();
      else throw new DocumentError('schema', 'Switch cases must be non-empty strings');
      return;
    default:
      throw new DocumentError('schema', `Instances have no "${prop}" property`);
  }
}

function assignName(node: { name?: string }, value: unknown) {
  if (value === null) delete node.name;
  else node.name = requireName(value);
}
