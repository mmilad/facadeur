import {
  resolveVariantDocument,
  publicFieldsFor as resolvePublicFields,
  automaticFieldGroupsFor as resolveAutomaticFieldGroups,
  toFlat,
  toNested,
  variantPresets,
  type EventDefinition,
  type AutomaticFieldGroup,
  type FieldDefinition,
  type FlatDocument,
  type SchemaCatalog,
  type VariantPreset,
} from '@facadeur/core';

export type { AutomaticFieldGroup } from '@facadeur/core';

export interface ComponentVariantContract {
  /** The stable name used by instances and generated components. */
  name: string;
  /** True only for the immutable base contract. */
  isDefault: boolean;
  /** Sparse changes authored for this variant, if any. */
  overrides?: VariantPreset['overrides'];
  /** The default document resolved with this variant's overlay applied. */
  document: FlatDocument;
}

/**
 * Return the fields a component makes public to its instances.
 *
 * Local fields and explicit exposes form the component's authored contract.
 * Public fields from embedded components are appended in document order when
 * the instance has not opted out. Later extensions replace earlier names.
 */
export function publicFieldsFor(
  document: FlatDocument,
  catalog: ReadonlyMap<string, FlatDocument>,
  schemaCatalog?: SchemaCatalog,
): FieldDefinition[] {
  return [
    ...resolvePublicFields(document, {
      documents: catalog,
      ...(schemaCatalog ? { schemaCatalog } : {}),
    }).values(),
  ];
}

/** Describe component instances that can contribute fields to this contract. */
export function automaticFieldGroupsFor(
  document: FlatDocument,
  catalog: ReadonlyMap<string, FlatDocument>,
  schemaCatalog?: SchemaCatalog,
): AutomaticFieldGroup[] {
  return resolveAutomaticFieldGroups(document, {
    documents: catalog,
    ...(schemaCatalog ? { schemaCatalog } : {}),
  });
}

/**
 * Return the events a component makes public to its instances.
 *
 * Direct events stay unchanged. Exposed events are resolved through the
 * nested component catalog and copied under their public name, matching the
 * field contract above and the codegen contract.
 */
export function publicEventsFor(
  document: FlatDocument,
  catalog: ReadonlyMap<string, FlatDocument>,
): EventDefinition[] {
  const events = new Map((document.events ?? []).map((event) => [event.name, event]));
  for (const [name, path] of Object.entries(document.expose?.events ?? {})) {
    if (events.has(name)) continue;
    const resolved = resolveEvent(document, path, catalog);
    if (resolved) events.set(name, { ...resolved, name });
  }
  return [...events.values()];
}

/**
 * Return the named variants available on a component.
 *
 * A default entry is always present. Presets retain their sparse overrides,
 * while `document` gives editor consumers a ready-to-render resolved view.
 * The source document remains untouched.
 */
export function componentVariantsFor(document: FlatDocument): ComponentVariantContract[] {
  const nested = toNested(document);
  const presets = variantPresets(nested);
  const names = [
    'default',
    ...presets.filter((preset) => preset.name !== 'default').map((preset) => preset.name),
  ];
  return names.map((name) => {
    const preset = presets.find((candidate) => candidate.name === name);
    return {
      name,
      isDefault: name === 'default',
      ...(preset?.overrides ? { overrides: preset.overrides } : {}),
      document: toFlat(resolveVariantDocument(nested, name)),
    };
  });
}

function resolveEvent(
  document: FlatDocument,
  path: string,
  catalog: ReadonlyMap<string, FlatDocument>,
  seen = new Set<string>(),
): EventDefinition | undefined {
  const key = `${document.id}:${path}`;
  if (seen.has(key)) return undefined;
  const nextSeen = new Set(seen).add(key);
  const [nodeId, ...rest] = path.split('.');
  const node = nodeId ? document.nodes[nodeId] : undefined;
  if (!node || node.type !== 'instance' || rest.length === 0) return undefined;

  const child = catalog.get(node.component);
  if (!child) return undefined;
  const member = rest.join('.');
  const direct = child.events?.find((event) => event.name === member);
  if (direct) return direct;

  const nestedPath = child.expose?.events?.[member];
  return nestedPath ? resolveEvent(child, nestedPath, catalog, nextSeen) : undefined;
}
