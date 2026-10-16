import type { ClassCondition, Node, NodeClassDefinition, ProjectCatalog } from '@facadeur/domain';

export function layerSelectorForName(name: string) {
  return `.${classNameForNode(name)}`;
}

export function classNameForNode(name: string) {
  let className = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!className) className = 'layer';
  if (!/^[a-z_]/.test(className)) className = `layer-${className}`;
  return className;
}

export function classListFromNode(node: Node): string[] {
  return (node.classes ?? []).filter((item) => !item.generated).map((item) => item.name);
}

export function ensureGeneratedNodeClasses(catalog: ProjectCatalog): ProjectCatalog {
  const visit = (node: Node): Node => {
    const name = classNameForNode(node.name ?? 'Layer');
    const classes = [...(node.classes ?? [])];
    const generatedIndex = classes.findIndex((item) => item.generated);
    if (generatedIndex >= 0) {
      classes[generatedIndex] = { ...classes[generatedIndex]!, name, generated: true };
    } else {
      const matchingIndex = classes.findIndex((item) => item.name === name);
      if (matchingIndex >= 0)
        classes[matchingIndex] = { ...classes[matchingIndex]!, generated: true };
      else classes.push({ name, generated: true });
    }
    const children = node.dom.children?.map(visit);
    return { ...node, classes, dom: { ...node.dom, ...(children ? { children } : {}) } };
  };
  const normalizeDefinitions = (definitions: ProjectCatalog['atoms']) =>
    Object.fromEntries(
      Object.entries(definitions).map(([uuid, definition]) => [
        uuid,
        { ...definition, root: visit(definition.root) },
      ]),
    );
  return {
    ...catalog,
    atoms: normalizeDefinitions(catalog.atoms),
    components: normalizeDefinitions(catalog.components),
    pages: normalizeDefinitions(catalog.pages),
  };
}

export function patchNodeClasses(
  catalog: ProjectCatalog,
  definitionUuid: string,
  nodeUuid: string,
  names: readonly string[],
): ProjectCatalog {
  return mutateNode(catalog, definitionUuid, nodeUuid, (node) => {
    const current = node.classes ?? [];
    const generated = current.find((item) => item.generated);
    const namesToKeep = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
    const classes = namesToKeep.map(
      (name) => current.find((item) => !item.generated && item.name === name) ?? { name },
    );
    if (generated) classes.push(generated);
    (node as { classes?: NodeClassDefinition[] }).classes = classes.length ? classes : undefined;
  });
}

export function setNodeClassStyleDeclaration(
  catalog: ProjectCatalog,
  input: {
    definitionUuid: string;
    nodeUuid: string;
    className: string;
    property: string;
    value: string | null;
    breakpointUuid: string | null;
  },
): ProjectCatalog {
  return mutateNode(catalog, input.definitionUuid, input.nodeUuid, (node) => {
    const classes = [...(node.classes ?? [])];
    const index = classes.findIndex(({ name }) => name === input.className);
    if (index < 0) return;
    const current = classes[index]!;
    const style = { ...(current.style ?? {}) };
    if (input.breakpointUuid) {
      const breakpoints = { ...(style.breakpoints ?? {}) };
      const layer = { ...(breakpoints[input.breakpointUuid] ?? {}) };
      const declarations = { ...(layer.declarations ?? {}) };
      if (input.value === null) delete declarations[input.property];
      else declarations[input.property] = input.value;
      if (Object.keys(declarations).length) layer.declarations = declarations;
      else delete layer.declarations;
      if (Object.keys(layer).length) breakpoints[input.breakpointUuid] = layer;
      else delete breakpoints[input.breakpointUuid];
      if (Object.keys(breakpoints).length) style.breakpoints = breakpoints;
      else delete style.breakpoints;
    } else {
      const declarations = { ...(style.declarations ?? {}) };
      if (input.value === null) delete declarations[input.property];
      else declarations[input.property] = input.value;
      if (Object.keys(declarations).length) style.declarations = declarations;
      else delete style.declarations;
    }
    classes[index] = { ...current, style: hasStyle(style) ? style : undefined };
    (node as { classes?: NodeClassDefinition[] }).classes = classes;
  });
}

export function setNodeClassCondition(
  catalog: ProjectCatalog,
  input: {
    definitionUuid: string;
    nodeUuid: string;
    className: string;
    condition: ClassCondition | null;
  },
) {
  return mutateNode(catalog, input.definitionUuid, input.nodeUuid, (node) => {
    const classes = [...(node.classes ?? [])];
    const index = classes.findIndex(({ name }) => name === input.className);
    if (index < 0) return;
    const current = classes[index]!;
    classes[index] = { ...current, condition: input.condition ?? undefined };
    (node as { classes?: NodeClassDefinition[] }).classes = classes;
  });
}

export function setNodeClassStyleDeclarations(
  catalog: ProjectCatalog,
  input: {
    definitionUuid: string;
    nodeUuid: string;
    className: string;
    declarations: Readonly<Record<string, string | null>>;
    breakpointUuid: string | null;
  },
) {
  return Object.entries(input.declarations).reduce(
    (next, [property, value]) => setNodeClassStyleDeclaration(next, { ...input, property, value }),
    catalog,
  );
}

function mutateNode(
  catalog: ProjectCatalog,
  definitionUuid: string,
  nodeUuid: string,
  update: (node: Node) => void,
) {
  const next = structuredClone(catalog) as ProjectCatalog;
  const definitions = [next.atoms, next.components, next.pages];
  const definition = definitions.map((map) => map[definitionUuid]).find(Boolean);
  if (!definition) return catalog;
  const visit = (node: Node): Node | null => {
    if (node.uuid === nodeUuid) {
      update(node);
      return node;
    }
    for (const child of node.dom.children ?? []) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  return visit(definition.root) ? next : catalog;
}

function hasStyle(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).some((entry) =>
    entry && typeof entry === 'object' ? hasStyle(entry) : entry !== undefined,
  );
}
