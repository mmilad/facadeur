import {
  applyCommand,
  deriveVariantPreset,
  resolveChildFieldDefinition,
  resolveVariantDocument,
  toFlat,
  toNested,
  withPreviewData,
  type Command,
  type FlatDocument,
} from '@facadeur/core';
import type { YjsDocumentStore } from '@facadeur/store-yjs';
import { overlaySchemaDefaults } from '../schema/schema-defaults.js';

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

export function prepareNestedDocument(document: FlatDocument, variant?: string): FlatDocument {
  return toFlat(withPreviewData(overlaySchemaDefaults(toNested(document)), variant));
}

export function applyActiveVariantCommand(options: {
  store: YjsDocumentStore;
  activeStore: YjsDocumentStore | undefined;
  variantName: string | null | undefined;
  command: Command;
  resolveKind: (componentId: string) => string | undefined;
  catalogNestedDocuments: () => Map<string, ReturnType<typeof toNested>>;
}): Command {
  const { store, activeStore, variantName, command, resolveKind, catalogNestedDocuments } = options;
  if (store !== activeStore || !variantName || !variantEditableCommand(command)) {
    return command;
  }
  const base = toNested(store.getDocument());
  const active = resolveVariantDocument(base, variantName);
  const edited = toNested(
    applyCommand(toFlat(active), command, {
      resolveKind,
      resolveChildField: (node, path, field) =>
        resolveChildFieldDefinition(node, path, field, catalogNestedDocuments()),
    }),
  );
  const preset = deriveVariantPreset(base, edited, variantName);
  return { type: 'setVariantPreset', preset };
}
