export const nodeTypes = ['frame', 'text', 'image', 'instance'] as const;
export type NodeType = (typeof nodeTypes)[number];

/** Default document kinds. The list is data: pass a different rule map to replace it. */
export const defaultKinds = ['atom', 'component', 'section', 'page'] as const;
export type DefaultKind = (typeof defaultKinds)[number];

/**
 * What a document of one kind may contain.
 * The root is the canvas for that document. Rules for `nodeTypes` apply to every
 * other node. Instance targets are document kinds, not node types.
 */
export interface NestingRule {
  rootNodeTypes: readonly NodeType[];
  nodeTypes: readonly NodeType[];
  instanceKinds: readonly string[];
}

/**
 * Atoms contain only primitives. Components and sections may also instance atoms
 * and components. A page canvas holds only instances of sections.
 */
export const defaultNestingRules: Record<DefaultKind, NestingRule> = {
  atom: {
    rootNodeTypes: ['frame', 'text', 'image'],
    nodeTypes: ['frame', 'text', 'image'],
    instanceKinds: [],
  },
  component: {
    rootNodeTypes: ['frame', 'text', 'image'],
    nodeTypes: ['frame', 'text', 'image', 'instance'],
    instanceKinds: ['atom', 'component'],
  },
  section: {
    rootNodeTypes: ['frame', 'text', 'image'],
    nodeTypes: ['frame', 'text', 'image', 'instance'],
    instanceKinds: ['atom', 'component'],
  },
  page: {
    rootNodeTypes: ['frame'],
    nodeTypes: ['instance'],
    instanceKinds: ['section'],
  },
};
