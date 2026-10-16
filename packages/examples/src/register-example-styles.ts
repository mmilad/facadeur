import type { Node } from '@facadeur/domain';

const nodeStyles = new Map<string, Readonly<Record<string, string>>>();
export type ExampleStyleMap = Readonly<Record<string, Readonly<Record<string, string>>>>;

/** Collect style declarations during fixture construction for attachment to their owning Nodes. */
export function registerExampleStyles(root: Node, styles: ExampleStyleMap) {
  const nodesByUuid = new Map<string, Node>();
  const visit = (node: Node) => {
    nodesByUuid.set(node.uuid, node);
    for (const child of node.dom.children ?? []) visit(child);
  };
  visit(root);

  for (const [nodeUuid, declarations] of Object.entries(styles)) {
    if (!Object.keys(declarations).length) continue;
    const node = nodesByUuid.get(nodeUuid);
    if (!node) throw new Error(`Example style target "${nodeUuid}" does not exist`);
    nodeStyles.set(nodeUuid, declarations);
  }
}

export function registeredExampleNodeStyles() {
  return [...nodeStyles.entries()].map(([nodeUuid, declarations]) => ({
    nodeUuid,
    declarations,
  }));
}
