import { DocumentError } from '../document/errors.js';
import { type FlatDocument, type FlatNode } from '../document/flat.js';
import { defaultNestingRules, type NestingRule } from '../document/kinds.js';
import { assertBreakpoints, assertFonts } from '../styles/libraries.js';
import { assertStyleContract } from '../styles/style-block.js';
import { readTokenTree } from '../token-tree.js';
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
import { ID_PATTERN } from '../document/ids.js';

export interface ValidateOptions {
  rules?: Readonly<Record<string, NestingRule>>;
  /** When set, instance targets must resolve to a kind allowed by the nesting rule. */
  resolveKind?: (componentId: string) => string | undefined;
  /** Paths of global DTCG tokens; validates component token defaults when set. */
  globalTokenPaths?: ReadonlySet<string>;
  /** Local component token paths for a catalog document id; validates tokenInterface.sets keys. */
  resolveComponentTokenPaths?: (documentId: string) => ReadonlySet<string> | undefined;
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
export function validateLibraries(doc: FlatDocument, options: ValidateOptions = {}): void {
  assertFonts(doc.fonts);
  assertBreakpoints(doc.settings.breakpoints);
  readTokenTree(doc.tokens);
  assertStyleContract(doc, options);
}

export function assertNodeData(node: FlatNode): void {
  if (node.type !== 'instance') {
    assertAttributes(node.attributes);
    assertBindings(node.bindings);
    assertEventBindings(node.eventBindings);
  }
  if (node.displayOn) assertDisplayOn(node.displayOn);
  if (node.type === 'frame' && node.repeat) assertRepeat(node.repeat);
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
