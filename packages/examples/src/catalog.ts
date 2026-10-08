import type { Node, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import { definitions as atoms } from './catalog/atoms';
import { definitions as components } from './catalog/components';
import { definitions as pages } from './catalog/pages';
import { fonts } from './catalog/fonts';
import { globalStyles } from './catalog/global-styles';
import { schemas } from './catalog/schemas';
import { tokens } from './catalog/tokens';

export const exampleCatalog = {
  atoms,
  components,
  pages,
  schemas,
  tokens,
  fonts,
  globalStyles,
} satisfies ProjectCatalog;

export function createExampleCatalog(): ProjectCatalog {
  return structuredClone(exampleCatalog);
}

export function exampleCatalogDefinitions(): NodeDefinition[] {
  return [...Object.values(atoms), ...Object.values(components), ...Object.values(pages)];
}

export function exampleCatalogLayers(definition: NodeDefinition) {
  const layers: { uuid: string; label: string }[] = [];
  const visit = (current: Node, parent = '') => {
    const rawName = current.data?.name;
    const name = typeof rawName === 'string' && rawName.trim() ? rawName : current.dom.tagName;
    const label = parent ? `${parent} / ${name}` : name;
    layers.push({ uuid: current.uuid, label });
    for (const child of current.dom.children ?? []) visit(child, label);
  };
  visit(definition.root);
  return layers;
}
