import type { Node, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import { definitions as atoms } from './catalog/atoms';
import { definitions as components } from './catalog/components';
import { definitions as pages } from './catalog/pages';
import { fonts } from './catalog/fonts';
import { globalStyles } from './catalog/global-styles';
import { schemas } from './catalog/schemas';
import { tokens } from './catalog/tokens';

export const exampleCatalog = {
  atoms: nameDefinitions(atoms),
  components: nameDefinitions(components),
  pages: nameDefinitions(pages),
  schemas,
  tokens,
  fonts,
  globalStyles,
} satisfies ProjectCatalog;

export function createExampleCatalog(): ProjectCatalog {
  return structuredClone(exampleCatalog);
}

export function exampleCatalogDefinitions(): NodeDefinition[] {
  return [
    ...Object.values(exampleCatalog.atoms),
    ...Object.values(exampleCatalog.components),
    ...Object.values(exampleCatalog.pages),
  ];
}

export function exampleCatalogLayers(definition: NodeDefinition) {
  const layers: { uuid: string; label: string }[] = [];
  const visit = (current: Node, parent = '') => {
    const rawName = current.name ?? current.data?.name ?? current.dom.data?.name;
    const name = typeof rawName === 'string' && rawName.trim() ? rawName : current.dom.tagName;
    const label = parent ? `${parent} / ${name}` : name;
    layers.push({ uuid: current.uuid, label });
    for (const child of current.dom.children ?? []) visit(child, label);
  };
  visit(nameDefinition(definition).root);
  return layers;
}

function nameDefinitions(definitions: Record<string, NodeDefinition>) {
  return Object.fromEntries(
    Object.entries(definitions).map(([uuid, definition]) => [uuid, nameDefinition(definition)]),
  );
}

function nameDefinition(definition: NodeDefinition): NodeDefinition {
  return { ...definition, root: nameNode(definition.root, true) };
}

function nameNode(node: Node, isRoot: boolean): Node {
  const children = node.dom.children?.map((child) => nameNode(child, false));
  return {
    ...node,
    name: isRoot ? 'root' : node.name?.trim() || nameForNode(node),
    dom: {
      ...node.dom,
      ...(children ? { children } : {}),
    },
  };
}

function nameForNode(node: Node): string {
  const tag = node.dom.tagName.toLowerCase();
  const attrs = node.dom.attributes ?? {};
  const classes = attrs.class?.split(/\s+/).filter(Boolean) ?? [];
  const content = node.dom.text ?? node.dom.properties?.textContent;
  const hint = [
    node.dom.data?.name,
    node.data?.name,
    attrs['aria-label'],
    attrs.name,
    attrs.id,
    attrs.placeholder,
    attrs.alt,
    classes[0],
    typeof content === 'string' ? content : undefined,
  ].find((value) => typeof value === 'string' && value.trim());

  if (typeof hint === 'string') {
    const slug = readableName(hint);
    if (slug) return slug;
  }
  if (tag === 'div') return 'container';
  if (tag === 'img') return 'image';
  if (tag === 'input') return 'input';
  if (/^h[1-6]$/.test(tag)) return 'heading';
  if (tag === 'p') return 'paragraph';
  if (tag === 'button') return 'button';
  return tag;
}

function readableName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .split('-')
    .slice(0, 4)
    .join('-');
}
