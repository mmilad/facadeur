import { DocumentError } from '../document/errors.js';
import { type FlatDocument, toFlat } from '../document/flat.js';
import {
  type DocumentFile,
  isVariantAxis,
  type FieldDefinition,
  type FieldValue,
  type NestedNode,
} from '../document/schema.js';
import { resolveVariantDocument, variantPresets } from '../variants/resolve.js';
import { assertValueMatches } from './assertions.js';
import { validateDataContracts } from './data-contracts.js';
import { validateDefinitions } from './definitions.js';
import { exposedFields, validateExposedContracts } from './catalog-exposed.js';
import { readTokenTree } from '../token-tree.js';
import { validateLibraries, validateTree, type ValidateOptions } from './tree.js';
import { validateDocumentFile } from './schema.js';

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
export function validateCatalog(files: readonly unknown[]): DocumentFile[] {
  const documents = files.map((file) => validateDocumentFile(file));
  const byId = new Map<string, DocumentFile>();
  for (const document of documents) {
    if (byId.has(document.id)) {
      throw new DocumentError('duplicate-id', `Duplicate document id "${document.id}"`);
    }
    byId.set(document.id, document);
  }
  const catalogOptions = catalogValidateOptions(byId);
  for (const document of documents) {
    const flat = toFlat(document);
    validateDefinitions(flat);
    validateLibraries(flat, catalogOptions);
    validateTree(flat, catalogOptions);
    validateExposedContracts(document, byId);
    validateDataContracts(flat, byId);
    validateVariantContracts(document, byId);
    validateInstanceOverrides(flat, byId);
  }
  return documents;
}

function validateVariantContracts(
  document: DocumentFile,
  catalog: Map<string, DocumentFile>,
): void {
  // `default` is the source document itself. Its style block may contain
  // sparse named-variant layers, so validating it after stripping the variant
  // contract would incorrectly report the reserved `variant` axis as unknown.
  for (const variant of variantPresets(document).filter((item) => item.name !== 'default')) {
    const resolvedFile = resolveVariantDocument(document, variant.name);
    validateExposedContracts(resolvedFile, catalog);

    // A resolved variant is a complete document contract. Validate it without
    // re-validating the source presets, whose targets may intentionally point
    // at nodes removed by this variant.
    const resolved = toFlat(resolvedFile);
    const validationDoc: FlatDocument = { ...resolved, variants: [] };
    delete validationDoc.variantPresets;
    // Editor metadata is validated on the source, whose preset identifiers exist.
    delete validationDoc.variantLabels;
    delete validationDoc.previewData;
    validateDefinitions(validationDoc);
    validateLibraries(validationDoc, catalogValidateOptions(catalog));
    validateTree(validationDoc, catalogValidateOptions(catalog));
    validateDataContracts(validationDoc, catalog);
    validateInstanceOverrides(validationDoc, catalog);
  }
}

function validateInstanceOverrides(doc: FlatDocument, catalog: Map<string, DocumentFile>): void {
  for (const node of Object.values(doc.nodes)) {
    if (node.type !== 'instance') continue;
    const target = catalog.get(node.component);
    if (!target) continue;
    const fields = exposedFields(target, catalog);
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
    validateChildFieldOverrides(node, target, catalog);
    const staticFields = new Set(Object.keys(node.fields ?? {}));
    const boundFields = Object.keys(node.fieldBindings ?? {});
    for (const name of boundFields) {
      if (!fields.has(name)) {
        throw new DocumentError(
          'unknown-field',
          `Instance "${node.id}" binds unknown field "${name}" on "${node.component}"`,
        );
      }
      if (staticFields.has(name)) {
        throw new DocumentError(
          'schema',
          `Instance "${node.id}" cannot set and bind field "${name}" on "${node.component}" together`,
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
): void {
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
      const field = resolveChildFieldDefinition(node, path, name, catalog);
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
      catalog,
    ).get(field);
    if (definition) return definition;
  }
  return undefined;
}

/** Enumerate explicit/default target variants when a variant rule leaves the active value data-driven. */
function activeVariantDocuments(
  document: DocumentFile,
  selected: string | undefined,
): DocumentFile[] {
  const names = selected
    ? [selected]
    : ['default', ...variantPresets(document).map((variant) => variant.name)];
  return [...new Set(names)].map((name) => resolveVariantDocument(document, name));
}

function resolveChildInstance(
  document: DocumentFile,
  path: string,
  catalog: Map<string, DocumentFile>,
): Extract<NestedNode, { type: 'instance' }> | undefined {
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
): Extract<NestedNode, { type: 'instance' }> | undefined {
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
