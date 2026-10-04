import {
  isVariantAxis,
  resolveChildFieldDefinition,
  resolveVariantDocument,
  toFlat,
  variantPresets,
  type DocumentFile,
  type FieldDefinition,
  type NestedNode,
} from '@facadeur/core';
import { CodegenError, componentName, propName, quote, variantTypeName } from '../names';
import { assertDefault, fieldTypeName, jsLiteral } from './catalog-fields';
import type { CatalogEntry, PropSpec, VariantTypeSpec } from './types';

export { assertDefault, jsLiteral } from './catalog-fields';

export function exposedMemberName(
  target: CatalogEntry,
  path: string,
  kind: 'field' | 'event',
): string | undefined {
  const members = kind === 'field' ? target.fields : target.events;
  if (members.has(path)) return path;
  const mappings =
    kind === 'field' ? target.document.expose?.fields : target.document.expose?.events;
  return Object.entries(mappings ?? {}).find(([, mappedPath]) => mappedPath === path)?.[0];
}

export function assignCatalog(
  documents: readonly DocumentFile[],
  contracts: ReadonlyMap<string, Map<string, FieldDefinition>>,
): Map<string, CatalogEntry> {
  const catalog = new Map<string, CatalogEntry>();
  const componentNames = new Set<string>();
  for (const document of documents) {
    const component = componentName(document.id, componentNames);
    const used = new Set<string>(['nodeId', 'className']);
    const typeNames = new Set<string>([component, `${component}Props`]);
    const fields = new Map<string, PropSpec>();
    const contractFields = contracts.get(document.id);
    if (!contractFields) throw new CodegenError(`Missing resolved contract for "${document.id}"`);
    for (const field of contractFields.values()) {
      const spec = fieldProp(document.id, field, used);
      fields.set(field.name, spec);
    }
    const variants = new Map<string, PropSpec>();
    for (const axis of (document.variants ?? []).filter(isVariantAxis)) {
      const name = propName(axis.name, used);
      const values = [...axis.values];
      const fallback = axis.default ?? values[0];
      if (fallback && !values.includes(fallback)) values.push(fallback);
      const type = variantTypeName(component, axis.name, typeNames);
      variants.set(axis.name, {
        source: axis.name,
        name,
        type,
        fieldType: 'variant',
        ...(fallback !== undefined ? { defaultExpr: quote(fallback) } : {}),
      });
    }
    const events = new Map<string, PropSpec>();
    for (const event of document.events ?? []) {
      const name = propName(`on-${event.name}`, used);
      const payload = event.payload ?? {};
      const payloadType = Object.entries(payload)
        .map(([key, type]) => `${key}: ${fieldTypeName({ name: key, type })}`)
        .join('; ');
      events.set(event.name, {
        source: event.name,
        name,
        type: payloadType ? `(payload: { ${payloadType} }) => void` : '() => void',
        fieldType: 'event',
        eventPayload: payload,
      });
    }
    const presets = variantPresets(document).filter((variant) => variant.name !== 'default');
    const namedVariant = presets.length
      ? {
          source: 'variant',
          name: propName('variant', used),
          type: variantTypeName(component, 'variant', typeNames),
          fieldType: 'variant' as const,
          defaultExpr: quote('default'),
        }
      : undefined;
    catalog.set(document.id, {
      document,
      component,
      contractFields,
      fields,
      variants,
      events,
      namedVariant,
    });
  }
  for (const document of documents) {
    const entry = catalog.get(document.id);
    if (!entry) continue;
    const used = new Set<string>([
      'nodeId',
      'className',
      ...[...entry.fields.values(), ...entry.variants.values(), ...entry.events.values()].map(
        (prop) => prop.name,
      ),
    ]);
    for (const [name, path] of Object.entries(document.expose?.events ?? {})) {
      const resolved = resolveExposedMember(document, path, catalog, 'event');
      if (entry.events.has(name)) {
        throw new CodegenError(`Exposed event "${name}" collides with a direct event`);
      }
      entry.events.set(name, {
        ...resolved,
        source: name,
        name: propName(`on-${name}`, used),
      });
    }
    if (entry.namedVariant) applyVariantDefaults(entry, entry.namedVariant.name);
  }
  assignChildFieldSupport(catalog);
  return catalog;
}

/**
 * Validate sparse paths once and mark the generated components that need the
 * internal transport prop. Paths are resolved through instance boundaries;
 * frames and roots never participate in the path.
 */
function assignChildFieldSupport(catalog: Map<string, CatalogEntry>): void {
  const supported = new Set<string>();
  const documents = new Map<string, DocumentFile>(
    [...catalog.values()].map((entry) => [entry.document.id, entry.document]),
  );
  for (const owner of catalog.values()) {
    for (const ownerDocument of variantDocuments(owner.document)) {
      const flat = toFlat(ownerDocument);
      visitNodes(ownerDocument.root, (node) => {
        if (node.type !== 'instance' || !node.childFields) return;
        const target = catalog.get(node.component);
        if (!target) return;
        const flatNode = flat.nodes[node.id];
        if (!flatNode || flatNode.type !== 'instance') return;
        supported.add(target.document.id);
        for (const [path, fields] of Object.entries(node.childFields)) {
          const segments = path.split('/');
          let candidates = childVariantDocuments(target.document, node.variants?.variant);
          for (let index = 0; index < segments.length; index += 1) {
            const segment = segments[index];
            if (!segment) continue;
            const matches = candidates
              .map((candidate) => findNode(candidate.root, segment))
              .filter(
                (candidate): candidate is Extract<NestedNode, { type: 'instance' }> =>
                  candidate?.type === 'instance',
              );
            if (!matches.length) {
              throw new CodegenError(
                `Child field path "${path}" on instance "${node.id}" does not resolve instance "${segment}" in "${target.document.id}"`,
              );
            }
            const nextEntries = [
              ...new Map(
                matches
                  .map((match) => [match.component, catalog.get(match.component)] as const)
                  .filter(
                    (entry): entry is readonly [string, CatalogEntry] => entry[1] !== undefined,
                  ),
              ).values(),
            ];
            if (!nextEntries.length) {
              throw new CodegenError(
                `Child field path "${path}" on instance "${node.id}" references an unknown component`,
              );
            }
            if (index === segments.length - 1) {
              for (const fieldName of Object.keys(fields)) {
                const field = resolveChildFieldDefinition(flatNode, path, fieldName, documents);
                if (!field) {
                  throw new CodegenError(
                    `Child field path "${path}" on instance "${node.id}" sets unknown field "${fieldName}"`,
                  );
                }
                assertDefault(node.component, field, fields[fieldName]!);
              }
            } else {
              for (const next of nextEntries) supported.add(next.document.id);
              candidates = nextEntries.flatMap((next) =>
                matches
                  .filter((match) => match.component === next.document.id)
                  .flatMap((match) =>
                    childVariantDocuments(next.document, match.variants?.variant),
                  ),
              );
            }
          }
        }
      });
    }
  }
  for (const entry of catalog.values()) {
    entry.acceptsChildFields = supported.has(entry.document.id);
    if (entry.acceptsChildFields) {
      const used = new Set([
        'nodeId',
        'className',
        ...[...entry.fields.values(), ...entry.variants.values(), ...entry.events.values()].map(
          (prop) => prop.name,
        ),
      ]);
      entry.childFieldsProp = propName('childFields', used);
    }
  }
}

function variantDocuments(document: DocumentFile): DocumentFile[] {
  const names = ['default', ...variantPresets(document).map((variant) => variant.name)];
  return names.map((name) => resolveVariantDocument(document, name));
}

function childVariantDocuments(
  document: DocumentFile,
  variant: string | undefined,
): DocumentFile[] {
  return variant && variantPresets(document).some((preset) => preset.name === variant)
    ? [resolveVariantDocument(document, variant)]
    : variantDocuments(document);
}

function visitNodes(node: NestedNode, visit: (node: NestedNode) => void): void {
  visit(node);
  if (node.type !== 'frame') return;
  for (const child of node.children ?? []) visitNodes(child, visit);
}

function resolveExposedMember(
  document: DocumentFile,
  path: string,
  catalog: Map<string, CatalogEntry>,
  kind: 'field' | 'event',
  seen = new Set<string>(),
): Omit<PropSpec, 'source' | 'name'> {
  const key = `${document.id}:${kind}:${path}`;
  if (seen.has(key)) throw new CodegenError(`Cyclic expose path "${path}"`);
  seen.add(key);
  const [nodeId, ...rest] = path.split('.');
  const node = findNode(document.root, nodeId);
  if (!node || node.type !== 'instance' || rest.length === 0) {
    throw new CodegenError(
      `Expose path "${path}" on "${document.id}" does not target a child contract`,
    );
  }
  const child = catalog.get(node.component);
  if (!child)
    throw new CodegenError(
      `Expose path "${path}" references unknown component "${node.component}"`,
    );
  const member = rest.join('.');
  const direct = kind === 'field' ? child.fields.get(member) : child.events.get(member);
  if (direct) {
    return {
      type: direct.type,
      fieldType: direct.fieldType,
      ...(direct.defaultExpr !== undefined ? { defaultExpr: direct.defaultExpr } : {}),
      ...(direct.required ? { required: true } : {}),
      ...(direct.eventPayload ? { eventPayload: direct.eventPayload } : {}),
    };
  }
  const nestedPath =
    kind === 'field'
      ? child.document.expose?.fields?.[member]
      : child.document.expose?.events?.[member];
  if (!nestedPath) {
    throw new CodegenError(`Expose path "${path}" does not resolve ${kind} "${member}"`);
  }
  return resolveExposedMember(child.document, nestedPath, catalog, kind, seen);
}

function findNode(node: NestedNode, id: string | undefined): NestedNode | undefined {
  if (!id) return undefined;
  if (node.id === id) return node;
  if (node.type !== 'frame') return undefined;
  for (const child of node.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return undefined;
}

export function variantTypeSpecs(document: DocumentFile, entry: CatalogEntry): VariantTypeSpec[] {
  const specs: VariantTypeSpec[] = [];
  for (const axis of (document.variants ?? []).filter(isVariantAxis)) {
    const prop = entry.variants.get(axis.name);
    if (!prop) continue;
    const values = [...axis.values];
    const fallback = axis.default ?? values[0];
    if (fallback && !values.includes(fallback)) values.push(fallback);
    specs.push({ name: prop.type, union: values.map((value) => quote(value)).join(' | ') });
  }
  if (entry.namedVariant) {
    const values = ['default', ...variantPresets(document).map((variant) => variant.name)];
    specs.push({
      name: entry.namedVariant.type,
      union: [...new Set(values)].map(quote).join(' | '),
    });
  }
  return specs;
}

function applyVariantDefaults(entry: CatalogEntry, variantProp: string): void {
  const variants = variantPresets(entry.document).filter((variant) => variant.name !== 'default');
  for (const [fieldName, prop] of entry.fields) {
    const field = entry.contractFields.get(fieldName);
    if (!field) continue;
    const overrides = variants.flatMap((variant) => {
      if (variant.overrides?.unsetFields?.includes(fieldName)) {
        return [{ name: variant.name, value: 'undefined' }];
      }
      const values = variant.overrides?.fields;
      if (!values || !Object.prototype.hasOwnProperty.call(values, fieldName)) return [];
      const value = values[fieldName];
      if (value === undefined) return [];
      assertDefault(entry.document.id, field, value);
      return [{ name: variant.name, value: jsLiteral(value) }];
    });
    if (!overrides.length) continue;
    let expression = prop.defaultExpr ?? 'undefined';
    for (const override of [...overrides].reverse()) {
      expression = `${variantProp} === ${quote(override.name)} ? ${override.value} : ${expression}`;
    }
    prop.variantDefaultExpr = expression;
  }
}

function fieldProp(documentId: string, field: FieldDefinition, used: Set<string>): PropSpec {
  if (field.default !== undefined) assertDefault(documentId, field, field.default);
  return {
    source: field.name,
    name: propName(field.name, used),
    type: fieldTypeName(field),
    fieldType: field.type,
    ...(field.required === true && field.default === undefined ? { required: true } : {}),
    ...(field.default !== undefined ? { defaultExpr: jsLiteral(field.default) } : {}),
  };
}
