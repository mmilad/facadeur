import { DocumentError } from '../../../document/errors';
import { UUID_PATTERN } from '../../../document/ids';
import { isPlainObject as isRecord } from '../../../utils';
import type {
  StyleBlock,
  StyleChild,
  StyleDeclarations,
  StyleLayer,
  StyleRule,
  StyleStates,
  TokenInterface,
} from '../../../schema/document';
import { assertStyleSelector, selectorClassNames } from '../selectors';
import { tokenReference } from '../tokens/syntax';

export const CSS_PROPERTY = /^(--)?[A-Za-z_][\w-]*$/;
const TOKEN_PATH = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+)+$/;
export const BREAKPOINT_ID = UUID_PATTERN;
const STATE_NAMES = ['hover', 'focus-visible', 'disabled'] as const;

/**
 * Gap, padding, and margin accept only a token reference. Longhands included.
 * Checked on the style block and on `node.style`, whatever letter case the key uses.
 */
const SPACING_PROPERTY =
  /^(gap|row-gap|column-gap|padding|margin|padding-(top|right|bottom|left|inline|block)|margin-(top|right|bottom|left|inline|block))$/;

export function assertSpacingValue(property: string, value: string) {
  if (!SPACING_PROPERTY.test(toKebab(property))) return;
  if (!tokenReference(value)) {
    throw new DocumentError(
      'schema',
      `${property} must be a spacing token reference, not "${value}"`,
    );
  }
}

export function parseStyleBlock(value: unknown): StyleBlock {
  const record = requireRecord(value, 'Style block');
  const block: StyleBlock = parseChild(record, 'Style block');
  if (record.rules !== undefined) {
    if (!Array.isArray(record.rules)) {
      throw new DocumentError('schema', 'Style block rules must be an array');
    }
    block.rules = record.rules.map((rule, index) => parseStyleRule(rule, index));
    const ids = new Set<string>();
    for (const rule of block.rules) {
      if (ids.has(rule.id))
        throw new DocumentError('schema', `Duplicate style rule id "${rule.id}"`);
      ids.add(rule.id);
    }
  }
  if (record.children !== undefined) {
    if (!isRecord(record.children)) {
      throw new DocumentError('schema', 'Style block children must be an object');
    }
    const children: Record<string, StyleChild> = {};
    for (const id of Object.keys(record.children).sort()) {
      if (!/^[A-Za-z][A-Za-z0-9_-]*(?:\/[A-Za-z][A-Za-z0-9_-]*)*$/.test(id)) {
        throw new DocumentError('schema', `Invalid style child path "${id}"`);
      }
      const child = record.children[id];
      if (!isRecord(child)) {
        throw new DocumentError('schema', `Style child "${id}" must be an object`);
      }
      if ('children' in child) {
        throw new DocumentError('schema', `Style child "${id}" cannot contain children`);
      }
      children[id] = parseChild(child, `Style child "${id}"`);
    }
    if (Object.keys(children).length) block.children = children;
  }
  assertKnown(
    record,
    ['declarations', 'states', 'variants', 'breakpoints', 'children', 'rules'],
    'Style block',
  );
  return block;
}

function parseStyleRule(value: unknown, index: number) {
  const label = `Style rule ${index + 1}`;
  if (!isRecord(value)) throw new DocumentError('schema', `${label} must be an object`);
  if (typeof value.id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(value.id)) {
    throw new DocumentError('schema', `${label} has an invalid id`);
  }
  if (typeof value.selector !== 'string') {
    throw new DocumentError('schema', `${label} needs a selector`);
  }
  assertStyleSelector(value.selector);
  if (!isRecord(value.bindings)) {
    throw new DocumentError('schema', `${label} bindings must be an object`);
  }
  const classes = selectorClassNames(value.selector);
  const bindings = Object.create(null) as Record<string, string>;
  for (const name of Object.keys(value.bindings).sort()) {
    if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(name) || !classes.includes(name)) {
      throw new DocumentError('schema', `${label} has an unused or invalid binding ".${name}"`);
    }
    const nodeId = value.bindings[name];
    if (typeof nodeId !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(nodeId)) {
      throw new DocumentError('schema', `${label} binding ".${name}" must target a node id`);
    }
    Object.defineProperty(bindings, name, {
      value: nodeId,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  for (const name of classes) {
    if (!(name in bindings)) throw new DocumentError('schema', `${label} does not bind ".${name}"`);
  }
  const layer = parseChild(value, label);
  const rule: StyleRule = {
    id: value.id,
    selector: value.selector,
    bindings,
    ...layer,
  };
  assertKnown(
    value,
    ['id', 'selector', 'bindings', 'declarations', 'states', 'variants', 'breakpoints'],
    label,
  );
  return rule;
}

export function parseTokenInterface(value: unknown): TokenInterface {
  const record = requireRecord(value, 'Token interface');
  const next: TokenInterface = {};
  if (record.reads !== undefined) {
    if (!Array.isArray(record.reads) || record.reads.length === 0) {
      throw new DocumentError('schema', 'tokenInterface.reads must be a non-empty array');
    }
    const reads = record.reads.map((item) => {
      if (typeof item !== 'string' || !UUID_PATTERN.test(item)) {
        throw new DocumentError('schema', `Invalid token UUID "${String(item)}" in reads`);
      }
      return item;
    });
    if (new Set(reads).size !== reads.length) {
      throw new DocumentError('schema', 'tokenInterface.reads contains a duplicate');
    }
    next.reads = [...reads].sort();
  }
  if (record.sets !== undefined) {
    if (!isRecord(record.sets)) {
      throw new DocumentError('schema', 'tokenInterface.sets must be an object');
    }
    const sets: Record<string, string> = {};
    for (const path of Object.keys(record.sets).sort()) {
      if (!UUID_PATTERN.test(path) && !TOKEN_PATH.test(path)) {
        throw new DocumentError(
          'schema',
          `Invalid token UUID or component-token path "${path}" in sets`,
        );
      }
      const item = record.sets[path];
      if (typeof item !== 'string' || item.length === 0) {
        throw new DocumentError('schema', `Token set "${path}" must be a string`);
      }
      sets[path] = item;
    }
    if (!Object.keys(sets).length) {
      throw new DocumentError('schema', 'tokenInterface.sets must not be empty');
    }
    next.sets = sets;
  }
  assertKnown(record, ['reads', 'sets'], 'Token interface');
  if (!next.reads && !next.sets) {
    throw new DocumentError('schema', 'Token interface needs reads or sets');
  }
  return next;
}

function parseChild(record: Record<string, unknown>, label: string) {
  const child: StyleChild = {};
  if (record.declarations !== undefined)
    child.declarations = parseDeclarations(record.declarations, label);
  if (record.states !== undefined) child.states = parseStates(record.states, label);
  if (record.variants !== undefined) child.variants = parseVariants(record.variants, label);
  if (record.breakpoints !== undefined) {
    child.breakpoints = parseBreakpointLayers(record.breakpoints, label);
  }
  return child;
}

function parseDeclarations(value: unknown, label: string) {
  if (!isRecord(value))
    throw new DocumentError('schema', `${label} declarations must be an object`);
  const declarations: StyleDeclarations = {};
  for (const key of Object.keys(value).sort()) {
    if (!CSS_PROPERTY.test(key)) {
      throw new DocumentError('schema', `${label} has invalid property "${key}"`);
    }
    const item = value[key];
    if (typeof item !== 'string') {
      throw new DocumentError('schema', `${label} property "${key}" must be a string`);
    }
    assertSpacingValue(key, item);
    declarations[key] = item;
  }
  if (!Object.keys(declarations).length) {
    throw new DocumentError('schema', `${label} declarations must not be empty`);
  }
  return declarations;
}

function parseStates(value: unknown, label: string) {
  if (!isRecord(value)) throw new DocumentError('schema', `${label} states must be an object`);
  const states: StyleStates = {};
  for (const name of STATE_NAMES) {
    if (value[name] !== undefined)
      states[name] = parseDeclarations(value[name], `${label} :${name}`);
  }
  assertKnown(value, [...STATE_NAMES], `${label} states`);
  if (!Object.keys(states).length)
    throw new DocumentError('schema', `${label} states must not be empty`);
  return states;
}

function parseVariants(value: unknown, label: string) {
  if (!isRecord(value)) throw new DocumentError('schema', `${label} variants must be an object`);
  const variants: NonNullable<StyleChild['variants']> = {};
  for (const axis of Object.keys(value).sort()) {
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(axis)) {
      throw new DocumentError('schema', `${label} has invalid variant axis "${axis}"`);
    }
    const values = value[axis];
    if (!isRecord(values)) {
      throw new DocumentError('schema', `${label} variant "${axis}" must be an object`);
    }
    const parsed: Record<string, StyleLayer> = {};
    for (const name of Object.keys(values).sort()) {
      if (!name) throw new DocumentError('schema', `${label} variant "${axis}" has an empty value`);
      const layer = values[name];
      if (!isRecord(layer)) {
        throw new DocumentError('schema', `${label} variant ${axis}=${name} must be an object`);
      }
      if ('variants' in layer || 'breakpoints' in layer || 'children' in layer) {
        throw new DocumentError(
          'schema',
          `${label} variant ${axis}=${name} only supports declarations and states`,
        );
      }
      const next = parseLayer(layer, `${label} variant ${axis}=${name}`);
      parsed[name] = next;
    }
    if (!Object.keys(parsed).length) {
      throw new DocumentError('schema', `${label} variant "${axis}" must not be empty`);
    }
    variants[axis] = parsed;
  }
  if (!Object.keys(variants).length) {
    throw new DocumentError('schema', `${label} variants must not be empty`);
  }
  return variants;
}

function parseBreakpointLayers(value: unknown, label: string) {
  if (!isRecord(value)) throw new DocumentError('schema', `${label} breakpoints must be an object`);
  const breakpoints: NonNullable<StyleChild['breakpoints']> = {};
  for (const id of Object.keys(value).sort()) {
    if (!BREAKPOINT_ID.test(id)) {
      throw new DocumentError('schema', `${label} has invalid breakpoint "${id}"`);
    }
    const layer = value[id];
    if (!isRecord(layer)) {
      throw new DocumentError('schema', `${label} breakpoint "${id}" must be an object`);
    }
    if ('variants' in layer || 'breakpoints' in layer || 'children' in layer) {
      throw new DocumentError(
        'schema',
        `${label} breakpoint "${id}" only supports declarations and states`,
      );
    }
    breakpoints[id] = parseLayer(layer, `${label} breakpoint "${id}"`);
  }
  if (!Object.keys(breakpoints).length) {
    throw new DocumentError('schema', `${label} breakpoints must not be empty`);
  }
  return breakpoints;
}

function parseLayer(record: Record<string, unknown>, label: string) {
  const layer: StyleLayer = {};
  if (record.declarations !== undefined)
    layer.declarations = parseDeclarations(record.declarations, label);
  if (record.states !== undefined) layer.states = parseStates(record.states, label);
  assertKnown(record, ['declarations', 'states'], label);
  if (!layer.declarations && !layer.states) {
    throw new DocumentError('schema', `${label} must set declarations or states`);
  }
  return layer;
}

function toKebab(property: string) {
  if (property.startsWith('--')) return property;
  return property.replace(/[A-Z]+(?![a-z])|[A-Z]/g, (letters, offset) => {
    return (offset ? '-' : '') + letters.toLowerCase();
  });
}

function assertKnown(value: Record<string, unknown>, keys: readonly string[], label: string) {
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key))
      throw new DocumentError('schema', `${label} has unknown property "${key}"`);
  }
}

function requireRecord(value: unknown, label: string) {
  if (!isRecord(value)) throw new DocumentError('schema', `${label} must be an object`);
  return value;
}
