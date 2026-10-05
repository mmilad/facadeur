import type {
  Binding,
  ChildFieldOverrides,
  EventBinding,
  EventDefinition,
  Expose,
  FieldDefinition,
  FieldValue,
  VariantAxis,
  VariantPreset,
} from '../../schema/document.js';

export function sortStringRecord(record: Record<string, string> | undefined) {
  if (!record) return undefined;
  const keys = Object.keys(record).sort();
  if (!keys.length) return undefined;
  const next: Record<string, string> = {};
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined) next[key] = value;
  }
  return Object.keys(next).length ? next : undefined;
}

export function sortFieldValues(record: Record<string, FieldValue> | undefined) {
  if (!record) return undefined;
  const keys = Object.keys(record).sort();
  if (!keys.length) return undefined;
  const next: Record<string, FieldValue> = {};
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined) next[key] = value;
  }
  return Object.keys(next).length ? next : undefined;
}

export function cloneChildFields(value: ChildFieldOverrides | undefined) {
  if (!value) return undefined;
  const next: ChildFieldOverrides = {};
  for (const path of Object.keys(value).sort()) {
    const fields = value[path];
    if (!fields) continue;
    const sorted: Record<string, FieldValue> = {};
    for (const name of Object.keys(fields).sort()) {
      const field = fields[name];
      if (field !== undefined) sorted[name] = structuredClone(field);
    }
    if (Object.keys(sorted).length) next[path] = sorted;
  }
  return Object.keys(next).length ? next : undefined;
}

export function cloneBinding(binding: Binding) {
  return {
    field: binding.field,
    target: binding.target,
    ...(binding.name !== undefined ? { name: binding.name } : {}),
  };
}

export function cloneEventBindings(bindings: EventBinding[]) {
  return bindings.map((binding) => ({
    event: binding.event,
    name: binding.name,
    ...(binding.payload ? { payload: { ...binding.payload } } : {}),
    ...(binding.data ? { data: structuredClone(binding.data) } : {}),
  }));
}

export function cloneField(field: FieldDefinition): FieldDefinition {
  return {
    name: field.name,
    type: field.type,
    ...(field.schema ? { schema: structuredClone(field.schema) } : {}),
    ...(field.required !== undefined ? { required: field.required } : {}),
    ...(field.default !== undefined ? { default: field.default } : {}),
    ...(field.options ? { options: [...field.options] } : {}),
    ...(field.items
      ? {
          items: {
            type: field.items.type,
            ...(field.items.schema ? { schema: structuredClone(field.items.schema) } : {}),
            ...(field.items.options ? { options: [...field.items.options] } : {}),
            ...(field.items.fields ? { fields: field.items.fields.map(cloneField) } : {}),
          },
        }
      : {}),
  };
}

export function cloneEvent(event: EventDefinition) {
  return {
    name: event.name,
    ...(event.payload ? { payload: { ...event.payload } } : {}),
    ...(event.data ? { data: structuredClone(event.data) } : {}),
  };
}

export function cloneExpose(expose: Expose) {
  return {
    ...(expose.fields ? { fields: { ...expose.fields } } : {}),
    ...(expose.events ? { events: { ...expose.events } } : {}),
  };
}

export function cloneVariant(variant: VariantAxis) {
  return {
    name: variant.name,
    values: [...variant.values],
    ...(variant.default !== undefined ? { default: variant.default } : {}),
  };
}

export function clonePreset(variant: VariantPreset) {
  return {
    name: variant.name,
    ...(variant.overrides
      ? {
          overrides: {
            ...(variant.overrides.fields ? { fields: { ...variant.overrides.fields } } : {}),
            ...(variant.overrides.styles
              ? { styles: structuredClone(variant.overrides.styles) }
              : {}),
            ...(variant.overrides.unsetFields
              ? { unsetFields: [...variant.overrides.unsetFields] }
              : {}),
            ...(variant.overrides.nodes ? { nodes: structuredClone(variant.overrides.nodes) } : {}),
            ...(variant.overrides.removed ? { removed: [...variant.overrides.removed] } : {}),
            ...(variant.overrides.insertions
              ? { insertions: structuredClone(variant.overrides.insertions) }
              : {}),
          },
        }
      : {}),
  };
}
