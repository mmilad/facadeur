import { DocumentError } from '../../document/errors';
import { type FlatDocument, toFlat } from '../../document/flat';
import {
  type DocumentFile,
  isVariantAxis,
  type FieldDefinition,
  type FieldValue,
  type NestedNode,
  type SchemaCatalog,
} from '../../schema/document';
import { resolveVariantDocument, variantPresets } from '../../legacy/flat/variants/resolve';
import { assertValueMatches } from './assertions';
import { validateDataContracts } from './data-contracts';
import { validateDefinitions } from './definitions';
import { exposedFields, validateExposedContracts } from './catalog-exposed';
import type { SchemaResolverContext } from './types';
import { readTokenTree } from '../style/tokens/global/tree';
import { validateLibraries, validateTree } from './tree';
import { type ValidateOptions } from './types';
import { validateDocumentFile } from './schema';

function catalogValidateOptions(byId: Map<string, DocumentFile>): ValidateOptions {
  const globalTokenPaths = new Set<string>();
  for (const file of byId.values()) {
    if (!file.tokens || !Object.keys(file.tokens).length) continue;
    for (const token of readTokenTree(file.tokens).tokens.values()) {
      globalTokenPaths.add(token.path);
    }
  }
  return {
    resolveKind: (componentId) => byId.get(componentId)?.kind,
    globalTokenPaths,
    resolveComponentTokenPaths: (documentId) => {
      const tokens = byId.get(documentId)?.componentTokens;
      if (!tokens) return undefined;
      return new Set(Object.values(tokens).map((token) => token.path));
    },
    resolveNestedStyleTarget: (documentId, path) => {
      const owner = byId.get(documentId);
      if (!owner) return false;
      return Boolean(resolveRenderedStyleTarget(owner, path, byId));
    },
  };
}

/** Schema, nesting, and — when every file is passed together — instance targets. */
export interface ValidateCatalogOptions {
  /** The project-owned schema library. When omitted, the single embedded owner is used. */
  schemaCatalog?: SchemaCatalog;
}

/**
 * @deprecated Legacy document catalog validation. New projects should use `validateProjectCatalog`.
 */
export function validateCatalog(
  files: readonly unknown[],
  options: ValidateCatalogOptions = {},
): DocumentFile[] {
  const documents = files.map((file) => validateDocumentFile(file));
  const byId = new Map<string, DocumentFile>();
  const identifiers = new Set<string>();
  for (const document of documents) {
    if (byId.has(document.id)) {
      throw new DocumentError('duplicate-id', `Duplicate document id "${document.id}"`);
    }
    const identifier = document.slug ?? document.id;
    if (identifiers.has(identifier)) {
      throw new DocumentError('duplicate-id', 'Duplicate document identifier "' + identifier + '"');
    }
    identifiers.add(identifier);
    byId.set(document.id, document);
  }
  const owners = documents.filter((document) => document.schemaCatalog !== undefined);
  if (owners.length > 1) {
    throw new DocumentError('schema', 'A catalog can have only one schemaCatalog owner');
  }
  const schemaCatalog = options.schemaCatalog ?? owners[0]?.schemaCatalog;
  validateSchemaCatalogUse(documents, schemaCatalog);
  const resolverContext: SchemaResolverContext = {
    documents: byId,
    ...(schemaCatalog ? { schemaCatalog } : {}),
  };
  const catalogOptions = catalogValidateOptions(byId);
  for (const document of documents) {
    try {
      const flat = toFlat(document);
      validateDefinitions(flat, resolverContext);
      validateLibraries(flat, catalogOptions);
      validateTree(flat, catalogOptions);
      validateExposedContracts(document, byId, schemaCatalog);
      validateDataContracts(flat, resolverContext);
      validateVariantContracts(document, byId, resolverContext);
      validateInstanceOverrides(flat, byId, resolverContext);
    } catch (error) {
      annotateCatalogValidationError(document.id, error);
    }
  }
  return documents;
}

function annotateCatalogValidationError(documentId: string, error: unknown): never {
  if (error instanceof DocumentError) {
    const prefix = `Document "${documentId}": `;
    if (!error.message.startsWith(prefix)) {
      throw new DocumentError(error.code, prefix + error.message);
    }
  }
  throw error;
}

function validateSchemaCatalogUse(
  documents: readonly DocumentFile[],
  catalog: SchemaCatalog | undefined,
) {
  const schemas = catalog?.schemas ?? [];
  const byId = new Map(schemas.map((schema) => [schema.id, schema]));
  if (byId.size !== schemas.length) {
    throw new DocumentError('schema', 'Schema catalog contains duplicate schema ids');
  }
  const references = new Map<string, string[]>();
  for (const schema of schemas) {
    const refs = schemaReferences(schema.schema);
    for (const ref of refs) {
      if (!byId.has(ref)) {
        throw new DocumentError(
          'schema',
          `Schema "${schema.id}" references missing schema "${ref}"`,
        );
      }
    }
    references.set(schema.id, refs);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string, chain: string[]) => {
    if (visiting.has(id)) {
      throw new DocumentError('schema', `Schema composition cycle: ${[...chain, id].join(' → ')}`);
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const ref of references.get(id) ?? []) visit(ref, [...chain, id]);
    visiting.delete(id);
    visited.add(id);
  };
  for (const schema of schemas) visit(schema.id, []);

  for (const document of documents) {
    const use = document.schemaUse;
    if (!use) continue;
    const fieldNames = new Set<string>();
    for (const field of use.fields ?? []) {
      if (fieldNames.has(field.name)) {
        throw new DocumentError(
          'schema',
          `Schema use on "${document.id}" repeats field "${field.name}"`,
        );
      }
      fieldNames.add(field.name);
      if (field.type.kind === 'schema' && !byId.has(field.type.schemaId)) {
        throw new DocumentError(
          'schema',
          `Schema use on "${document.id}" references missing schema "${field.type.schemaId}"`,
        );
      }
    }
    if (use.direct?.kind === 'schema' && !byId.has(use.direct.schemaId)) {
      throw new DocumentError(
        'schema',
        `Schema use on "${document.id}" references missing schema "${use.direct.schemaId}"`,
      );
    }
  }
}

function schemaReferences(value: unknown) {
  const references: string[] = [];
  const visit = (schema: unknown) => {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return;
    const record = schema as Record<string, unknown>;
    if (typeof record.$ref === 'string') {
      const prefix = 'facadeur://schema/';
      if (!record.$ref.startsWith(prefix)) {
        throw new DocumentError('schema', `Unsupported schema reference "${record.$ref}"`);
      }
      let id: string;
      try {
        id = decodeURIComponent(record.$ref.slice(prefix.length));
      } catch {
        throw new DocumentError('schema', `Invalid schema reference "${record.$ref}"`);
      }
      if (!id || `${prefix}${encodeURIComponent(id)}` !== record.$ref) {
        throw new DocumentError('schema', `Invalid schema reference "${record.$ref}"`);
      }
      references.push(id);
    }
    if (record.properties && typeof record.properties === 'object') {
      Object.values(record.properties).forEach(visit);
    }
    for (const keyword of ['allOf', 'anyOf', 'oneOf'] as const) {
      if (Array.isArray(record[keyword])) (record[keyword] as unknown[]).forEach(visit);
    }
    if (record.items) visit(record.items);
    if (record.additionalProperties && typeof record.additionalProperties === 'object') {
      visit(record.additionalProperties);
    }
  };
  visit(value);
  return references;
}

function validateVariantContracts(
  document: DocumentFile,
  catalog: Map<string, DocumentFile>,
  resolverContext: SchemaResolverContext,
) {
  // `default` is the source document itself. Its style block may contain
  // sparse named-variant layers, so validating it after stripping the variant
  // contract would incorrectly report the reserved `variant` axis as unknown.
  for (const variant of variantPresets(document).filter((item) => item.name !== 'default')) {
    const resolvedFile = resolveVariantDocument(document, variant.name);
    validateExposedContracts(resolvedFile, catalog, resolverContext.schemaCatalog);

    // A resolved variant is a complete document contract. Validate it without
    // re-validating the source presets, whose targets may intentionally point
    // at nodes removed by this variant.
    const resolved = toFlat(resolvedFile);
    const validationDoc: FlatDocument = { ...resolved, variants: [] };
    delete validationDoc.variantPresets;
    // Editor metadata is validated on the source, whose preset identifiers exist.
    delete validationDoc.variantLabels;
    delete validationDoc.previewData;
    validateDefinitions(validationDoc, resolverContext);
    validateLibraries(validationDoc, catalogValidateOptions(catalog));
    validateTree(validationDoc, catalogValidateOptions(catalog));
    validateDataContracts(validationDoc, resolverContext);
    validateInstanceOverrides(validationDoc, catalog, resolverContext);
  }
}

function validateInstanceOverrides(
  doc: FlatDocument,
  catalog: Map<string, DocumentFile>,
  resolverContext: SchemaResolverContext,
) {
  const structuralInstances = new Set<string>();
  for (const structural of Object.values(doc.nodes)) {
    if (structural.type !== 'repeater' && structural.type !== 'switch') continue;
    for (const childId of structural.children) {
      const child = doc.nodes[childId];
      if (child?.type === 'instance') structuralInstances.add(child.id);
    }
  }
  for (const node of Object.values(doc.nodes)) {
    if (node.type !== 'instance') continue;
    const target = catalog.get(node.component);
    if (!target) continue;
    const fields = exposedFields(target, resolverContext);
    for (const [name, value] of Object.entries(node.fields ?? {})) {
      const field = fields.get(name);
      if (!field) {
        throw new DocumentError(
          'unknown-field',
          `Instance "${node.id}" sets unknown field "${name}" on "${node.component}"`,
        );
      }
      assertValueMatches(field, value);
    }
    validateChildFieldOverrides(node, target, catalog, resolverContext.schemaCatalog);
    const staticFields = Object.keys(node.fields ?? {});
    const boundFields = Object.keys(node.fieldBindings ?? {});
    for (const name of boundFields) {
      if (!fields.has(name)) {
        throw new DocumentError(
          'unknown-field',
          `Instance "${node.id}" binds unknown field "${name}" on "${node.component}"`,
        );
      }
    }
    const axes = new Map(
      (target.variants ?? []).filter(isVariantAxis).map((axis) => [axis.name, axis]),
    );
    const presets = variantPresets(target);
    const namedPresets = presets.filter((preset) => preset.name !== 'default');
    for (const [name, value] of Object.entries(node.variants ?? {})) {
      if (name === 'variant' && namedPresets.length > 0) {
        if (value !== 'default' && !namedPresets.some((preset) => preset.name === value)) {
          throw new DocumentError(
            'unknown-variant',
            `Instance "${node.id}" uses "${value}" for variant on "${node.component}", expected ${namedPresets.map((preset) => preset.name).join(', ')}`,
          );
        }
        continue;
      }
      const axis = axes.get(name);
      if (!axis) {
        throw new DocumentError(
          'unknown-variant',
          `Instance "${node.id}" sets unknown variant "${name}" on "${node.component}"`,
        );
      }
      if (!axis.values.includes(value)) {
        throw new DocumentError(
          'unknown-variant',
          `Instance "${node.id}" uses "${value}" for "${name}", expected ${axis.values.join(', ')}`,
        );
      }
    }
    const providedFields = new Set([...staticFields, ...boundFields]);
    for (const [name, field] of fields) {
      if (structuralInstances.has(node.id)) continue;
      if (field.required === true && field.default === undefined && !providedFields.has(name)) {
        throw new DocumentError(
          'schema',
          `Instance "${node.id}" is missing required field "${name}" on "${node.component}"`,
        );
      }
    }
  }
}

function validateChildFieldOverrides(
  node: Extract<FlatDocument['nodes'][string], { type: 'instance' }>,
  target: DocumentFile,
  catalog: Map<string, DocumentFile>,
  schemaCatalog?: SchemaCatalog,
) {
  if (!node.childFields) return;
  for (const [path, values] of Object.entries(node.childFields)) {
    const child = activeVariantDocuments(target, node.variants?.variant)
      .map((owner) => resolveChildInstance(owner, path, catalog))
      .find((candidate): candidate is Extract<NestedNode, { type: 'instance' }> =>
        Boolean(candidate),
      );
    if (!child) {
      throw new DocumentError(
        'unknown-field',
        `Instance "${node.id}" targets unknown child instance path "${path}" on "${node.component}"`,
      );
    }
    for (const [name, value] of Object.entries(values)) {
      const field = resolveChildFieldDefinition(node, path, name, catalog, schemaCatalog);
      if (!field) {
        throw new DocumentError(
          'unknown-field',
          `Instance "${node.id}" sets unknown child field "${path}.${name}" on "${child.component}"`,
        );
      }
      assertValueMatches(field, value as FieldValue);
    }
  }
}

/** Resolve a sparse child override against the active nested component contracts. */
export function resolveChildFieldDefinition(
  node: Extract<FlatDocument['nodes'][string], { type: 'instance' }>,
  path: string,
  field: string,
  catalog: Map<string, DocumentFile>,
  schemaCatalog?: SchemaCatalog,
): FieldDefinition | undefined {
  const target = catalog.get(node.component);
  if (!target) return undefined;
  for (const owner of activeVariantDocuments(target, node.variants?.variant)) {
    const child = resolveChildInstance(owner, path, catalog);
    if (!child) continue;
    const childDocument = catalog.get(child.component);
    if (!childDocument) continue;
    const definition = exposedFields(
      resolveVariantDocument(childDocument, child.variants?.variant ?? 'default'),
      { documents: catalog, ...(schemaCatalog ? { schemaCatalog } : {}) },
    ).get(field);
    if (definition) return definition;
  }
  return undefined;
}

/** Enumerate explicit/default target variants when a variant rule leaves the active value data-driven. */
function activeVariantDocuments(document: DocumentFile, selected: string | undefined) {
  const names = selected
    ? [selected]
    : ['default', ...variantPresets(document).map((variant) => variant.name)];
  return [...new Set(names)].map((name) => resolveVariantDocument(document, name));
}

function resolveChildInstance(
  document: DocumentFile,
  path: string,
  catalog: Map<string, DocumentFile>,
) {
  let currentDocuments = [document];
  const segments = path.split('/');
  for (const [index, segment] of segments.entries()) {
    const nextDocuments: DocumentFile[] = [];
    for (const current of currentDocuments) {
      const instance = findNestedInstance(current.root, segment);
      if (!instance) continue;
      if (index === segments.length - 1) return instance;
      const target = catalog.get(instance.component);
      if (!target) continue;
      nextDocuments.push(...activeVariantDocuments(target, instance.variants?.variant));
    }
    currentDocuments = nextDocuments;
    if (!currentDocuments.length) return undefined;
  }
  return undefined;
}

function findNestedInstance(
  node: NestedNode,
  id: string,
): Extract<NestedNode, { type: 'instance' }> | undefined {
  if (node.type === 'instance') return node.id === id ? node : undefined;
  if (node.type !== 'frame') return undefined;
  for (const child of node.children ?? []) {
    const found = findNestedInstance(child, id);
    if (found) return found;
  }
  return undefined;
}

function resolveRenderedStyleTarget(
  owner: DocumentFile,
  path: readonly string[],
  catalog: Map<string, DocumentFile>,
) {
  return visit(owner.root, 0, false);

  function visit(
    current: NestedNode,
    index: number,
    crossedInstance: boolean,
  ): Extract<NestedNode, { type: 'instance' }> | undefined {
    if (index === path.length) {
      return crossedInstance && current.type === 'instance' ? current : undefined;
    }
    const segment = path[index];
    if (!segment) return undefined;
    if (current.type === 'frame') {
      const child = (current.children ?? []).find((node) => node.id === segment);
      return child ? visit(child, index + 1, crossedInstance) : undefined;
    }
    if (current.type !== 'instance') return undefined;
    const target = catalog.get(current.component);
    if (!target) return undefined;
    for (const candidate of activeVariantDocuments(target, current.variants?.variant)) {
      const children = candidate.root.type === 'frame' ? (candidate.root.children ?? []) : [];
      const child = children.find((node) => node.id === segment);
      const found = child ? visit(child, index + 1, true) : undefined;
      if (found) return found;
    }
    return undefined;
  }
}
