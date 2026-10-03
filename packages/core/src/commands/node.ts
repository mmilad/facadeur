import { DocumentError } from '../document/errors.js';
import { makeFlatNode, type FlatDocument, type FlatNode } from '../document/flat.js';
import { ID_PATTERN } from '../document/ids.js';
import type { VariantRule } from '../document/schema.js';
import { assertStyleMap, assertStyleNameAvailable } from '../styles/style-block.js';
import {
  assertAttributes,
  assertBindings,
  assertDisplayOn,
  assertEventBindings,
  assertFieldBindings,
  assertRepeat,
} from '../validation/assertions.js';
import { assertValueMatches } from '../validation/assertions.js';
import { isRecord } from './value-utils.js';
import type { Command, NodeProp } from './types.js';
import type { CommandContext } from './types.js';
import { adoptTokenReads } from './token-reads.js';
import {
  isFieldValue,
  requireBindings,
  requireLayout,
  requireName,
  requireNode,
  requireString,
  requireStringRecord,
  requireTag,
} from './node-utils.js';
import type { NodeType } from '../document/kinds.js';

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
    'fieldBindings',
    'variantRules',
  ],
};

const STYLE_PROPERTY = /^(--)?[A-Za-z_][\w-]*$/;
const CHILD_FIELD_PATH = /^[A-Za-z][A-Za-z0-9_-]*(\/[A-Za-z][A-Za-z0-9_-]*)*$/;

export function setProp(doc: FlatDocument, command: Extract<Command, { type: 'setProp' }>): void {
  const node = requireNode(doc, command.nodeId);
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
  doc.nodes[node.id] = makeFlatNode(node);
  if (command.prop === 'layout') adoptTokenReads(doc);
}

export function setStyle(doc: FlatDocument, command: Extract<Command, { type: 'setStyle' }>): void {
  const node = requireNode(doc, command.nodeId);
  if (node.type === 'instance') {
    throw new DocumentError('nesting', 'Instances cannot carry style overrides');
  }
  if (!STYLE_PROPERTY.test(command.property)) {
    throw new DocumentError('schema', `Invalid style property "${command.property}"`);
  }
  const style = { ...(node.style ?? {}) };
  if (command.value === null) {
    delete style[command.property];
  } else if (typeof command.value === 'string') {
    style[command.property] = command.value;
  } else {
    throw new DocumentError('schema', 'Style values must be strings');
  }
  if (Object.keys(style).length) assertStyleMap(style);
  node.style = style;
  doc.nodes[node.id] = makeFlatNode(node);
  adoptTokenReads(doc);
}

export function setField(doc: FlatDocument, command: Extract<Command, { type: 'setField' }>): void {
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
): void {
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

export function setVariant(
  doc: FlatDocument,
  command: Extract<Command, { type: 'setVariant' }>,
): void {
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
): void {
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
        node.eventBindings = value.map((binding) => ({ ...binding }));
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
      break;
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
): void {
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
    default:
      throw new DocumentError('schema', `Instances have no "${prop}" property`);
  }
}

function assignName(node: { name?: string }, value: unknown): void {
  if (value === null) delete node.name;
  else node.name = requireName(value);
}
