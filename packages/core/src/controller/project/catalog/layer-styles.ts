import type { Node, ProjectCatalog } from '@facadeur/domain';
import { replaceSelectorClasses } from '../../style/selectors';

/** Stable CSS class derived from the user-facing layer name. */
export function layerSelectorForName(name: string) {
  let className = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!className) className = 'layer';
  if (!/^[a-z_]/.test(className)) className = `layer-${className}`;
  return `.${className}`;
}

export function setLayerStyleDeclaration(
  catalog: ProjectCatalog,
  input: {
    nodeUuid: string;
    property: string;
    value: string | null;
    breakpointUuid: string | null;
  },
): ProjectCatalog {
  return setLayerStyleDeclarations(catalog, {
    nodeUuid: input.nodeUuid,
    declarations: { [input.property]: input.value },
    breakpointUuid: input.breakpointUuid,
  });
}

export function setLayerStyleDeclarations(
  catalog: ProjectCatalog,
  input: {
    nodeUuid: string;
    declarations: Readonly<Record<string, string | null>>;
    breakpointUuid: string | null;
  },
): ProjectCatalog {
  const sourceNode = findCatalogNode(catalog, input.nodeUuid);
  if (!sourceNode) return catalog;
  const nextCatalog = structuredClone(catalog) as ProjectCatalog;
  const node = findCatalogNode(nextCatalog, input.nodeUuid);
  if (!node) return catalog;
  const selector = layerSelectorForName(node.name ?? 'Layer');
  const className = selector.slice(1);
  const ruleId = `layer-${input.nodeUuid}`;
  const currentBlock = nextCatalog.globalStyles?.block;
  const rules = [...(currentBlock?.rules ?? [])];
  let index = rules.findIndex(
    (rule) => rule.id === ruleId && Object.values(rule.bindings ?? {}).includes(input.nodeUuid),
  );
  if (index < 0 && Object.values(input.declarations).every((value) => value === null)) return catalog;
  if (index < 0) {
    rules.push({ id: ruleId, selector, bindings: { [className]: input.nodeUuid } });
    index = rules.length - 1;
  }

  const rule = { ...rules[index]! };
  if (input.breakpointUuid) {
    const breakpoints = { ...(rule.breakpoints ?? {}) };
    const layer = { ...(breakpoints[input.breakpointUuid] ?? {}) };
    const declarations = { ...(layer.declarations ?? {}) };
    for (const [property, value] of Object.entries(input.declarations)) {
      if (value === null) delete declarations[property];
      else declarations[property] = value;
    }
    if (Object.keys(declarations).length) layer.declarations = declarations;
    else delete layer.declarations;
    if (Object.keys(layer).length) breakpoints[input.breakpointUuid] = layer;
    else delete breakpoints[input.breakpointUuid];
    if (Object.keys(breakpoints).length) rule.breakpoints = breakpoints;
    else delete rule.breakpoints;
  } else {
    const declarations = { ...(rule.declarations ?? {}) };
    for (const [property, value] of Object.entries(input.declarations)) {
      if (value === null) delete declarations[property];
      else declarations[property] = value;
    }
    if (Object.keys(declarations).length) rule.declarations = declarations;
    else delete rule.declarations;
  }

  const hasContent = Boolean(rule.declarations || rule.states || rule.variants || rule.breakpoints);
  if (hasContent) rules[index] = rule;
  else rules.splice(index, 1);
  const block = { ...(currentBlock ?? {}) };
  if (rules.length) block.rules = rules;
  else delete block.rules;
  const globalStyles = { ...(catalog.globalStyles ?? {}) };
  if (Object.keys(block).length) globalStyles.block = block;
  else delete globalStyles.block;
  return { ...nextCatalog, globalStyles };
}

export function syncLayerStyleSelector(
  catalog: ProjectCatalog,
  nodeUuid: string,
  name: string,
): ProjectCatalog {
  const rules = catalog.globalStyles?.block?.rules;
  if (!rules?.some((rule) => rule.id === `layer-${nodeUuid}`)) return catalog;
  const nextClassName = layerSelectorForName(name).slice(1);
  const block = {
    ...catalog.globalStyles?.block,
    rules: rules.map((rule) => {
      if (rule.id !== `layer-${nodeUuid}`) return rule;
      const currentClassName = Object.entries(rule.bindings ?? {}).find(
        ([, uuid]) => uuid === nodeUuid,
      )?.[0];
      if (!currentClassName) return rule;
      const selector = replaceSelectorClasses(rule.selector, (className) =>
        className === currentClassName ? nextClassName : className,
      );
      const bindings = { ...rule.bindings, [nextClassName]: nodeUuid };
      if (currentClassName !== nextClassName) delete bindings[currentClassName];
      return { ...rule, selector, bindings };
    }),
  };
  return { ...catalog, globalStyles: { ...catalog.globalStyles, block } };
}

function findCatalogNode(catalog: ProjectCatalog, nodeUuid: string): Node | null {
  const find = (node: Node): Node | null => {
    if (node.uuid === nodeUuid) return node;
    for (const child of node.dom.children ?? []) {
      const found = find(child);
      if (found) return found;
    }
    return null;
  };
  for (const definition of [
    ...Object.values(catalog.atoms),
    ...Object.values(catalog.components),
    ...Object.values(catalog.pages),
  ]) {
    const node = find(definition.root);
    if (node) return node;
  }
  return null;
}
