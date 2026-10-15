import type { GlobalStyleRule, Node } from '@facadeur/domain';

const styleRules = new Map<string, GlobalStyleRule>();
export type ExampleStyleMap = Readonly<Record<string, Readonly<Record<string, string>>>>;

/** Register fixture appearance as UUID-bound catalog rules while keeping nodes data-only. */
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
    const className = `layer-${nodeUuid}`;
    styleRules.set(nodeUuid, {
      id: `layer-${nodeUuid}`,
      selector: `.${className}`,
      bindings: { [className]: nodeUuid },
      declarations,
    });
  }
}

export function registeredExampleStyleRules() {
  return [...styleRules.values()];
}
