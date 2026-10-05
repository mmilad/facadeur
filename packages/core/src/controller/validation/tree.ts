import { DocumentError } from '../../document/errors.js';
import { type FlatDocument, type FlatNode } from '../../document/flat.js';
import { defaultNestingRules, type NestingRule } from '../../document/kinds.js';
import { assertBreakpoints } from '../style/breakpoints.js';
import { assertFonts } from '../style/fonts.js';
import { assertStyleContract } from '../style/blocks/contract.js';
import { readTokenTree } from '../style/tokens/global/tree.js';
import {
  assertAttributes,
  assertBindings,
  assertChildFields,
  assertDisplayOn,
  assertEventBindings,
  assertExpose,
  assertRepeat,
  assertLayout,
} from './assertions.js';
import { ID_PATTERN } from '../../document/ids.js';

import type { ValidateOptions } from './types.js';

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
    const parent = parentId ? doc.nodes[parentId] : undefined;
    const structuralChild = parent?.type === 'repeater' || parent?.type === 'switch';
    const allowed = isRoot
      ? rule.rootNodeTypes
      : structuralChild && parent?.type === 'repeater'
        ? (['instance', 'switch'] as const)
        : structuralChild && parent?.type === 'switch'
          ? (['instance'] as const)
          : rule.nodeTypes;
    if (!allowed.includes(node.type)) {
      const where = isRoot ? 'as the root' : `under "${parentId}"`;
      throw new DocumentError(
        'nesting',
        `${doc.kind} cannot contain a ${node.type} node ${where} ("${id}")`,
      );
    }
    if (
      !isRoot &&
      (node.type === 'repeater' || node.type === 'switch') &&
      !structuralChild &&
      doc.kind !== 'component' &&
      doc.kind !== 'section'
    ) {
      throw new DocumentError(
        'nesting',
        `Structural ${node.type} nodes belong to components and sections`,
      );
    }
    assertNodeData(node);
    if (node.type === 'instance' && options.resolveKind) {
      const kind = options.resolveKind(node.component);
      if (kind === undefined) {
        throw new DocumentError('unknown-component', `Unknown component "${node.component}"`);
      }
      const structuralTarget = structuralChild && (kind === 'component' || kind === 'section');
      if (!rule.instanceKinds.includes(kind) && !structuralTarget) {
        throw new DocumentError(
          'nesting',
          `${doc.kind} cannot contain an instance of ${kind} "${node.component}"`,
        );
      }
    }
    if (node.type === 'frame' || node.type === 'repeater' || node.type === 'switch') {
      if (node.type === 'repeater') {
        const switchCount = node.children.filter(
          (childId) => doc.nodes[childId]?.type === 'switch',
        ).length;
        if (switchCount > 1 || (switchCount === 1 && node.children.length > 1)) {
          throw new DocumentError(
            'nesting',
            `Repeater "${node.id}" accepts direct alternatives or one switch`,
          );
        }
        for (const childId of node.children) {
          const child = doc.nodes[childId];
          if (child && child.type !== 'instance' && child.type !== 'switch') {
            throw new DocumentError(
              'nesting',
              `Repeater "${node.id}" can contain only instances or switches`,
            );
          }
        }
      }
      if (node.type === 'switch') {
        for (const childId of node.children) {
          const child = doc.nodes[childId];
          if (child && child.type !== 'instance') {
            throw new DocumentError(
              'nesting',
              `Switch "${node.id}" can contain only component instances`,
            );
          }
        }
      }
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
export function validateLibraries(doc: FlatDocument, options: ValidateOptions = {}): void {
  assertFonts(doc.fonts);
  assertBreakpoints(doc.settings.breakpoints);
  readTokenTree(doc.tokens);
  assertStyleContract(doc, options);
}

export function assertNodeData(node: FlatNode) {
  if (node.type !== 'instance') {
    assertAttributes(node.attributes);
    assertBindings(node.bindings);
    assertEventBindings(node.eventBindings);
  }
  if (node.displayOn) assertDisplayOn(node.displayOn);
  if (node.type === 'frame' && node.repeat) assertRepeat(node.repeat);
  if (node.layout) assertLayout(node.layout);
  if (node.type === 'instance' && node.expose) assertExpose(node.expose);
  if (node.type === 'instance' && node.childFields) assertChildFields(node.childFields);
  if (node.type === 'instance') {
    for (const rule of node.variantRules ?? []) {
      assertDisplayOn(rule.when);
      if (!ID_PATTERN.test(rule.variant)) throw new DocumentError('schema', 'Invalid rule variant');
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
