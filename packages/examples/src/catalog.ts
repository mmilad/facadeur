import type { Node, NodeClassDefinition, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import { layerSelectorForName } from '@facadeur/core';
import { definitions as atoms } from './catalog/atoms';
import { definitions as components } from './catalog/components';
import { definitions as pages } from './catalog/pages';
import { globalStyles } from './catalog/global-styles';
import { facadeurEditorNodeClasses } from './facadeur-editor/shared';
import { registeredExampleNodeStyles } from './register-example-styles';
import { schemas } from './catalog/schemas';
import { tokens } from './catalog/tokens';
import { defaultIcons } from './catalog/icons';

export const exampleCatalog = {
  atoms: definitionsWithNodeClasses(nameDefinitions(atoms)),
  components: definitionsWithNodeClasses(nameDefinitions(components)),
  pages: definitionsWithNodeClasses(nameDefinitions(pages)),
  schemas,
  tokens,
  icons: defaultIcons,
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
    const name =
      typeof rawName === 'string' && rawName.trim() ? rawName : (current.dom.tagName ?? 'layer');
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

function definitionsWithNodeClasses(definitions: Record<string, NodeDefinition>) {
  const deferredClasses = new Map<string, NodeClassDefinition>(
    facadeurEditorNodeClasses().map(({ nodeUuid, nodeClass }) => [nodeUuid, nodeClass]),
  );
  for (const { nodeUuid, declarations } of registeredExampleNodeStyles()) {
    const previous = deferredClasses.get(nodeUuid);
    deferredClasses.set(nodeUuid, {
      name: previous?.name ?? 'layer',
      generated: true,
      style: {
        ...(previous?.style ?? {}),
        declarations: { ...(previous?.style?.declarations ?? {}), ...declarations },
      },
    });
  }
  return Object.fromEntries(
    Object.entries(definitions).map(([uuid, definition]) => [
      uuid,
      { ...definition, root: nodeClasses(definition.root, deferredClasses) },
    ]),
  );
}

function nodeClasses(node: Node, deferred: ReadonlyMap<string, NodeClassDefinition>): Node {
  const uuid = node.uuid;
  const classes: NodeClassDefinition[] = [
    ...(node.classes ?? []),
    ...(node.dom.attributes?.class ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((name) => ({ name })),
  ];
  const generatedName = layerSelectorForName(node.name ?? 'Layer').slice(1);
  const generatedIndex = classes.findIndex((item) => item.generated);
  if (generatedIndex >= 0)
    classes[generatedIndex] = { ...classes[generatedIndex]!, name: generatedName, generated: true };
  else {
    const matchingIndex = classes.findIndex((item) => item.name === generatedName);
    if (matchingIndex < 0) classes.push({ name: generatedName, generated: true });
    else classes[matchingIndex] = { ...classes[matchingIndex]!, generated: true };
  }
  const extra = deferred.get(uuid);
  if (extra) {
    const resolvedExtra = { ...extra, name: extra.name === 'layer' ? generatedName : extra.name };
    const index = classes.findIndex((item) => item.name === resolvedExtra.name);
    if (index < 0) classes.push(resolvedExtra);
    else
      classes[index] = {
        ...classes[index]!,
        ...resolvedExtra,
        style: { ...(classes[index]!.style ?? {}), ...(resolvedExtra.style ?? {}) },
      };
  }
  const { attributes: oldAttributes, ...domBase } = node.dom;
  const attributes = { ...(oldAttributes ?? {}) };
  delete attributes.class;
  const children = node.dom.children?.map((child) => nodeClasses(child, deferred));
  return {
    ...node,
    classes,
    dom: {
      ...domBase,
      ...(Object.keys(attributes).length ? { attributes } : {}),
      ...(children ? { children } : {}),
    },
  };
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
  const tag = node.dom.tagName?.toLowerCase() ?? 'div';
  const attrs = node.dom.attributes ?? {};
  const classes = attrs.class?.split(/\s+/).filter(Boolean) ?? [];
  const content = node.dom.text;
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
