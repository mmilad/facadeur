import { DocumentError } from '../../document/errors.js';
import type { DocumentFile, NestedNode } from '../../document/schema.js';
import type { FlatDocument } from '../../document/flat.js';

const STYLE_NAME = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/** Stable local class names for every node in the base tree and variant insertions. */
export function documentClassNames(document: DocumentFile) {
  const nodes: ClassNameEntry[] = [];
  collectNested(document.root, nodes, true);
  for (const variant of document.variants ?? []) {
    if ('values' in variant) continue;
    for (const insertion of variant.overrides?.insertions ?? []) {
      collectNested(insertion.node, nodes, false);
    }
  }
  return assignClassNames(nodes);
}

/** Internal counterpart used by flat-document validation. */
export function flatDocumentClassNames(document: FlatDocument) {
  const nodes: ClassNameEntry[] = [];
  const visit = (id: string, isRoot: boolean) => {
    const node = document.nodes[id];
    if (!node) return;
    nodes.push({
      id,
      ...(node.styleName ? { explicit: node.styleName } : {}),
      readable: isRoot ? 'root' : node.name?.trim() || id,
    });
    if (node.type === 'frame') for (const child of node.children) visit(child, false);
  };
  visit(document.rootId, true);
  for (const variant of document.variantPresets ?? []) {
    for (const insertion of variant.overrides?.insertions ?? []) {
      collectNested(insertion.node, nodes, false);
    }
  }
  return assignClassNames(nodes);
}

interface ClassNameEntry {
  id: string;
  explicit?: string;
  readable: string;
}

function assignClassNames(nodes: readonly ClassNameEntry[]) {
  const byId = new Map<string, ClassNameEntry>();
  for (const node of nodes) {
    const previous = byId.get(node.id);
    if (previous && previous.explicit !== node.explicit && (previous.explicit || node.explicit)) {
      throw new DocumentError('schema', `Node "${node.id}" has conflicting CSS class names`);
    }
    if (!previous) byId.set(node.id, node);
  }
  const explicitOwners = new Map<string, string>();
  for (const [id, node] of byId) {
    if (!node.explicit) continue;
    if (!STYLE_NAME.test(node.explicit)) {
      throw new DocumentError(
        'schema',
        `Invalid CSS class name "${node.explicit}" on node "${id}"`,
      );
    }
    const owner = explicitOwners.get(node.explicit);
    if (owner && owner !== id) {
      throw new DocumentError(
        'schema',
        `CSS class name "${node.explicit}" is used by multiple nodes`,
      );
    }
    explicitOwners.set(node.explicit, id);
  }

  const names = new Map<string, string>();
  const used = new Set(explicitOwners.keys());
  for (const [id, node] of byId) if (node.explicit) names.set(id, node.explicit);
  for (const [id, node] of byId) {
    if (names.has(id)) continue;
    const base = readableClass(node.readable || id);
    let candidate = base;
    let suffix = 2;
    while (used.has(candidate)) candidate = `${base}_${suffix++}`;
    used.add(candidate);
    names.set(id, candidate);
  }
  return names;
}

function collectNested(node: NestedNode, nodes: ClassNameEntry[], isRoot: boolean): void {
  nodes.push({
    id: node.id,
    ...(node.styleName ? { explicit: node.styleName } : {}),
    readable: isRoot ? 'root' : node.name?.trim() || node.id,
  });
  if (node.type === 'frame') {
    for (const child of node.children ?? []) collectNested(child, nodes, false);
  }
}

function readableClass(value: string) {
  let name = value.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!name || !/^[A-Za-z_]/.test(name)) name = `node-${name || 'item'}`;
  return name;
}
