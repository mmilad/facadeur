import type { DocumentFile, NestedNode, NodeDefinitionModel, NodeModel } from '@facadeur/core';

/** Adapts the current typed example model for tests of the legacy DocumentFile style engine. */
export function documentFromExample(definition: NodeDefinitionModel): DocumentFile {
  return {
    version: 1,
    id: definition.uuid,
    name: definition.name,
    kind: definition.kind,
    root: nestedNodeFromExample(definition.root),
  };
}

function nestedNodeFromExample(node: NodeModel): NestedNode {
  const children = node.dom.children?.map(nestedNodeFromExample);
  const text =
    node.dom.text ??
    (typeof node.dom.properties?.textContent === 'string'
      ? node.dom.properties.textContent
      : undefined);
  const shared = {
    id: node.uuid,
    ...(node.name ? { name: node.name } : {}),
    tag: node.dom.tagName,
    ...(node.dom.attributes ? { attributes: { ...node.dom.attributes } } : {}),
    ...(node.style ? { style: { ...node.style } } : {}),
  };

  if (node.dom.tagName.toLowerCase() === 'img') {
    return {
      ...shared,
      type: 'image',
      ...(node.dom.attributes?.src ? { src: node.dom.attributes.src } : {}),
      ...(node.dom.attributes?.alt ? { alt: node.dom.attributes.alt } : {}),
    };
  }
  if (children?.length) return { ...shared, type: 'frame', children };
  if (text !== undefined) return { ...shared, type: 'text', text };
  return { ...shared, type: 'frame', children: [] };
}
