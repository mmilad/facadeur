import { DocumentError } from '../document/errors.js';
import { type FlatDocument, toFlat } from '../document/flat.js';
import { type DocumentFile, isVariantAxis } from '../document/schema.js';
import { resolveVariantDocument, variantPresets } from '../variants/resolve.js';
import { assertValueMatches } from './assertions.js';
import { validateDataContracts } from './data-contracts.js';
import { validateDefinitions } from './definitions.js';
import { exposedFields, validateExposedContracts } from './catalog-exposed.js';
import { validateLibraries, validateTree } from './tree.js';
import { validateDocumentFile } from './schema.js';

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
  for (const document of documents) {
    const flat = toFlat(document);
    validateDefinitions(flat);
    validateLibraries(flat);
    validateTree(flat, {
      resolveKind: (componentId) => byId.get(componentId)?.kind,
    });
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
    validateLibraries(validationDoc);
    validateTree(validationDoc, {
      resolveKind: (componentId) => catalog.get(componentId)?.kind,
    });
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
