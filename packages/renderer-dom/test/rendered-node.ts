/** Test query for the renderer's stable DOM address marker. */
export function renderedNode(root: ParentNode, id: string): Element | null {
  return root.querySelector(`[data-id="${escapeAttributeValue(id)}"]`);
}

export function renderedNodes(root: ParentNode, id: string): NodeListOf<Element> {
  return root.querySelectorAll(`[data-id="${escapeAttributeValue(id)}"]`);
}

function escapeAttributeValue(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}
