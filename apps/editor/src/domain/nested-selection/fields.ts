import { publicFieldsFor } from '../schema/component-contract.js';
import type { FieldValue, FlatDocument, FlatNode } from '@facadeur/core';
import { findParent } from '@facadeur/core';
import type { NestedFieldContext, NestedSelection } from './types.js';
export function fieldContextForSelection(input: {
  document: FlatDocument;
  selectedNode: FlatNode | null;
  nestedSelection: NestedSelection | null;
  catalog: ReadonlyMap<string, FlatDocument>;
  childFields?: (
    ownerNodeId: string,
    instancePath: string,
  ) => Record<string, FieldValue> | undefined;
}): NestedFieldContext | null {
  const { document, selectedNode, nestedSelection, catalog, childFields } = input;
  const source = nestedSelection?.document ?? document;
  const selected = nestedSelection?.node ?? selectedNode;
  if (!selected) return null;

  const ownerNodeId = nestedSelection?.ownerNodeId ?? selected.id;
  let instancePath = nestedSelection?.instancePath ?? '';
  let instance: Extract<FlatNode, { type: 'instance' }> | undefined;

  if (selected.type === 'instance') {
    instance = selected;
  } else if (nestedSelection) {
    instance = nestedSelection.containingInstance;
    if (!instance) {
      const nearest = nearestInstance(source, selected.id);
      if (!nearest) return null;
      instance = nearest.instance;
      instancePath = nearest.path;
    }
  }
  if (!instance) return null;

  const target = nestedSelection?.target ?? catalog.get(instance.component);
  if (!target) return null;
  const allFields = publicFieldsFor(target, catalog);
  const fields =
    selected.type === 'instance'
      ? allFields
      : allFields.filter((field) =>
          (selected.bindings ?? []).some(
            (binding) => binding.field === field.name || binding.field.split('.')[0] === field.name,
          ),
        );
  const localOverrides = instance.fields;
  const nestedOverrides = childFields?.(ownerNodeId, instancePath);
  const inheritedValues: Record<string, FieldValue> = nestedSelection?.inheritedFields
    ? { ...nestedSelection.inheritedFields }
    : {};
  for (const field of fields) {
    if (field.default !== undefined && inheritedValues[field.name] === undefined) {
      inheritedValues[field.name] = field.default;
    }
  }
  if (!nestedSelection?.inheritedFields) Object.assign(inheritedValues, localOverrides ?? {});
  const values: Record<string, FieldValue> = {
    ...inheritedValues,
    ...(nestedOverrides ?? {}),
    ...(nestedSelection?.resolvedFields ?? {}),
  };
  const boundFields = Object.keys(instance.fieldBindings ?? {});
  return {
    instancePath,
    instance,
    target,
    fields,
    values,
    inheritedValues,
    ...(nestedOverrides || (instancePath === '' ? localOverrides : undefined)
      ? { overrides: nestedOverrides ?? localOverrides }
      : {}),
    boundFields,
  };
}

function nearestInstance(
  doc: FlatDocument,
  nodeId: string,
): { instance: Extract<FlatNode, { type: 'instance' }>; path: string } | null {
  let current = doc.nodes[nodeId];
  if (!current) return null;
  const path: string[] = [];
  while (current) {
    if (current.type === 'instance') return { instance: current, path: path.join('/') };
    const parent = findParent(doc, current.id);
    if (!parent) return null;
    current = parent;
    path.unshift(parent.id);
  }
  return null;
}
