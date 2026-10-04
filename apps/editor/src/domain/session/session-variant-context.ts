import {
  applyCommand,
  deriveVariantPreset,
  resolveChildFieldDefinition,
  resolveVariantDocument,
  toFlat,
  toNested,
  withPreviewData,
  type Command,
  type CommandContext,
  type FlatDocument,
  type SchemaCatalog,
} from '@facadeur/core';
import type { ControllerDocumentStore } from '@facadeur/core';
import { overlaySchemaDefaults } from '../schema/schema-defaults.js';
import { publicFieldsFor } from '../schema/component-contract.js';

export function variantEditableCommand(command: Command): boolean {
  switch (command.type) {
    case 'insert':
    case 'remove':
    case 'move':
    case 'wrap':
    case 'setProp':
    case 'setStyle':
    case 'setField':
    case 'setVariant':
    case 'setChildField':
      return true;
    default:
      return false;
  }
}

export function prepareNestedDocument(
  document: FlatDocument,
  variant?: string,
  catalog?: ReadonlyMap<string, FlatDocument>,
  schemaCatalog?: SchemaCatalog,
): FlatDocument {
  const fields = catalog ? publicFieldsFor(document, catalog, schemaCatalog) : document.fields;
  const prepared = overlaySchemaDefaults(toNested(document), fields);
  return toFlat(withPreviewData(prepared, variant, fields));
}

export function applyActiveVariantCommand(options: {
  store: ControllerDocumentStore;
  activeStore: ControllerDocumentStore | undefined;
  variantName: string | null | undefined;
  command: Command;
  resolveKind: (componentId: string) => string | undefined;
  catalogNestedDocuments: () => Map<string, ReturnType<typeof toNested>>;
  getSchemaCatalog: () => SchemaCatalog | undefined;
  commandContext?: CommandContext;
}): Command {
  const {
    store,
    activeStore,
    variantName,
    command,
    resolveKind,
    catalogNestedDocuments,
    getSchemaCatalog,
  } = options;
  if (store !== activeStore || !variantName || !variantEditableCommand(command)) {
    return command;
  }
  const base = toNested(store.getDocument());
  const active = resolveVariantDocument(base, variantName);
  const edited = toNested(
    applyCommand(toFlat(active), command, {
      ...options.commandContext,
      resolveKind,
      resolveChildField: (node, path, field) =>
        resolveChildFieldDefinition(
          node,
          path,
          field,
          catalogNestedDocuments(),
          getSchemaCatalog(),
        ),
    }),
  );
  const preset = deriveVariantPreset(base, edited, variantName);
  return { type: 'setVariantPreset', preset };
}
