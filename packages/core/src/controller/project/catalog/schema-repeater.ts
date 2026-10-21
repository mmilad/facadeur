import type { Node, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import { effectiveSchemaForDefinition } from './field-contract';
import { componentPropsForSchema } from './field-ids';
import { findDefinition } from './ops';

/** Keep Repeater layers while migrating their property bindings to a changed schema. */
export function reconcileDefinitionBindingsForSchemaChange(
  previousCatalog: ProjectCatalog,
  nextCatalog: ProjectCatalog,
  definitionUuid: string,
) {
  const previous = findDefinition(previousCatalog, definitionUuid);
  const next = findDefinition(nextCatalog, definitionUuid);
  if (!previous || !next) return nextCatalog;
  const previousSchema = effectiveSchemaForDefinition(previousCatalog, previous.definition).schema;
  const nextSchema = effectiveSchemaForDefinition(nextCatalog, next.definition).schema;
  if (!previousSchema || !nextSchema) return nextCatalog;

  const previousProps = componentPropsForSchema(previousSchema);
  const nextProps = componentPropsForSchema(nextSchema);
  const nextPropByPath = new Map(nextProps.map((prop) => [prop.path, prop]));
  const remappedProps = new Map<string, string>();
  for (const prop of previousProps) {
    const nextProp = nextPropByPath.get(prop.path);
    if (nextProp) remappedProps.set(prop.uuid, nextProp.uuid);
  }

  const clone = structuredClone(nextCatalog) as ProjectCatalog;
  const definition = clone[next.kind][definitionUuid]!;
  const visit = (node: Node, itemSchema: Record<string, unknown> | null) => {
    remapNodeBindings(node, remappedProps);
    const composition = node.config?.composition;
    if (!composition || composition.kind === 'slot') {
      for (const child of node.dom.children ?? []) visit(child, itemSchema);
      return;
    }

    let sourceSchema: Record<string, unknown> | null = null;
    if (composition.source?.kind === 'prop') {
      const uuid = remappedProps.get(composition.source.uuid);
      const nextComposition = { ...composition };
      const config = { ...node.config };
      if (uuid) {
        sourceSchema = schemaForProp(nextSchema, uuid);
        if (composition.kind === 'repeater' && sourceSchema?.type !== 'array') {
          delete nextComposition.source;
        } else {
          nextComposition.source = { kind: 'prop', uuid };
        }
      } else {
        delete nextComposition.source;
      }
      config.composition = nextComposition;
      (node as { config?: Node['config'] }).config = config;
    } else if (composition.source?.kind === 'item') {
      sourceSchema = itemSchema ? schemaAtPath(itemSchema, composition.source.path) : null;
      if (composition.kind === 'repeater' && sourceSchema?.type !== 'array') {
        const nextComposition = { ...composition };
        delete nextComposition.source;
        (node as { config?: Node['config'] }).config = {
          ...node.config,
          composition: nextComposition,
        };
      }
    }

    const childItemSchema =
      composition.kind === 'repeater' && sourceSchema?.type === 'array'
        ? asSchemaRecord(sourceSchema.items)
        : null;
    for (const child of node.dom.children ?? []) visit(child, childItemSchema);
  };
  visit(definition.root, null);
  (clone[next.kind] as Record<string, NodeDefinition>)[definitionUuid] = definition;
  return clone;
}

function remapNodeBindings(node: Node, remappedProps: ReadonlyMap<string, string>) {
  const remapValue = (value: unknown): unknown => {
    if (typeof value === 'string') {
      const match = /^\{props:([^}]+)\}$/.exec(value);
      if (!match) return value;
      const nextUuid = remappedProps.get(match[1]!);
      return nextUuid ? `{props:${nextUuid}}` : '';
    }
    if (Array.isArray(value)) return value.map(remapValue);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        remapValue(entry),
      ]),
    );
  };
  const { children, ...domFields } = node.dom;
  const dom = {
    ...(remapValue(domFields) as Record<string, unknown>),
    ...(children ? { children } : {}),
  } as Node['dom'];
  const classes = remapValue(node.classes) as Node['classes'];
  const data = remapValue(node.data) as Node['data'];
  (node as { dom: Node['dom'] }).dom = dom;
  if (classes) (node as { classes?: Node['classes'] }).classes = classes;
  if (data) (node as { data?: Node['data'] }).data = data;
}

function schemaForProp(schema: unknown, uuid: string) {
  const prop = componentPropsForSchema(schema).find((entry) => entry.uuid === uuid);
  return prop ? schemaAtPath(schema, prop.path) : null;
}

function schemaAtPath(schema: unknown, path: string) {
  let current = schema;
  for (const segment of path.split('.')) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return null;
    const properties = (current as Record<string, unknown>).properties;
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return null;
    current = (properties as Record<string, unknown>)[segment];
  }
  return current && typeof current === 'object' && !Array.isArray(current)
    ? (current as Record<string, unknown>)
    : null;
}

function asSchemaRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
