import { DocumentError } from '../../../document/errors';
import type {
  ChildFieldOverrides,
  FieldValue,
  NestedNode,
  VariantNodeOverride,
} from '../../../schema/document';

export function deriveNodeOverride(base: NestedNode, edited: NestedNode, variantName: string) {
  if (base.type !== edited.type) {
    throw new DocumentError(
      'schema',
      `Variant "${variantName}" cannot change node type "${base.id}"`,
    );
  }
  if (base.type === 'instance') {
    const editedInstance = edited as Extract<NestedNode, { type: 'instance' }>;
    if (base.name !== editedInstance.name) {
      throw new DocumentError(
        'schema',
        `Variant "${variantName}" cannot override name on node "${base.id}"`,
      );
    }
    if (base.component !== editedInstance.component) {
      throw new DocumentError(
        'schema',
        `Variant "${variantName}" cannot change component on node "${base.id}"`,
      );
    }
    if (!sameValue(base.expose, editedInstance.expose)) {
      throw new DocumentError(
        'schema',
        `Variant "${variantName}" cannot change instance contracts on node "${base.id}"`,
      );
    }
    const override: VariantNodeOverride = {};
    const fields = mapDelta(
      override,
      'fields',
      base.fields as Record<string, unknown> | undefined,
      editedInstance.fields as Record<string, unknown> | undefined,
      variantName,
      base.id,
    );
    if (fields) override.fields = fields as VariantNodeOverride['fields'];
    const childFields = childFieldsDelta(override, base.childFields, editedInstance.childFields);
    if (childFields) override.childFields = childFields;
    const fieldBindings = mapDelta(
      override,
      'fieldBindings',
      base.fieldBindings as Record<string, unknown> | undefined,
      editedInstance.fieldBindings as Record<string, unknown> | undefined,
      variantName,
      base.id,
    );
    if (fieldBindings) {
      override.fieldBindings = fieldBindings as VariantNodeOverride['fieldBindings'];
    }
    const variants = mapDelta(
      override,
      'variants',
      base.variants as Record<string, unknown> | undefined,
      editedInstance.variants as Record<string, unknown> | undefined,
      variantName,
      base.id,
    );
    if (variants) override.variants = variants as Record<string, string>;
    assignObject(
      override,
      'variantRules',
      base.variantRules,
      editedInstance.variantRules,
      variantName,
      base.id,
    );
    const layout = objectDelta(
      override,
      'layout',
      base.layout as Record<string, unknown> | undefined,
      editedInstance.layout as Record<string, unknown> | undefined,
      variantName,
      base.id,
    );
    if (layout) override.layout = layout as VariantNodeOverride['layout'];
    assignObject(
      override,
      'displayOn',
      base.displayOn,
      editedInstance.displayOn,
      variantName,
      base.id,
    );
    return Object.keys(override).length ? override : undefined;
  }

  const baseElement = base as Exclude<NestedNode, { type: 'instance' }>;
  const editedElement = edited as Exclude<NestedNode, { type: 'instance' }>;
  if (baseElement.name !== editedElement.name) {
    throw new DocumentError(
      'schema',
      `Variant "${variantName}" cannot override name on node "${base.id}"`,
    );
  }
  if (baseElement.tag !== editedElement.tag) {
    throw new DocumentError(
      'schema',
      `Variant "${variantName}" cannot override tag on node "${base.id}"`,
    );
  }
  const override: VariantNodeOverride = {};
  assignScalar(
    override,
    'text',
    baseElement.type === 'text' ? baseElement.text : undefined,
    editedElement.type === 'text' ? editedElement.text : undefined,
    variantName,
    base.id,
  );
  assignScalar(
    override,
    'src',
    baseElement.type === 'image' ? baseElement.src : undefined,
    editedElement.type === 'image' ? editedElement.src : undefined,
    variantName,
    base.id,
  );
  assignScalar(
    override,
    'alt',
    baseElement.type === 'image' ? baseElement.alt : undefined,
    editedElement.type === 'image' ? editedElement.alt : undefined,
    variantName,
    base.id,
  );
  if (baseElement.type === 'frame' && editedElement.type === 'frame') {
    assignObject(
      override,
      'repeat',
      baseElement.repeat,
      editedElement.repeat,
      variantName,
      base.id,
    );
  }
  const attributes = mapDelta(
    override,
    'attributes',
    baseElement.attributes as Record<string, unknown> | undefined,
    editedElement.attributes as Record<string, unknown> | undefined,
    variantName,
    base.id,
  );
  if (attributes) override.attributes = attributes as Record<string, string>;
  const layout = objectDelta(
    override,
    'layout',
    baseElement.layout as Record<string, unknown> | undefined,
    editedElement.layout as Record<string, unknown> | undefined,
    variantName,
    base.id,
  );
  if (layout) override.layout = layout as VariantNodeOverride['layout'];
  assignObject(
    override,
    'bindings',
    baseElement.bindings,
    editedElement.bindings,
    variantName,
    base.id,
  );
  assignObject(
    override,
    'eventBindings',
    baseElement.eventBindings,
    editedElement.eventBindings,
    variantName,
    base.id,
  );
  const style = mapDelta(
    override,
    'style',
    baseElement.style as Record<string, unknown> | undefined,
    editedElement.style as Record<string, unknown> | undefined,
    variantName,
    base.id,
  );
  if (style) override.style = style as Record<string, string>;
  assignObject(
    override,
    'displayOn',
    baseElement.displayOn,
    editedElement.displayOn,
    variantName,
    base.id,
  );
  return Object.keys(override).length ? override : undefined;
}

function assignScalar<T extends keyof VariantNodeOverride>(
  target: VariantNodeOverride,
  key: T,
  base: unknown,
  edited: unknown,
  _variantName: string,
  _nodeId: string,
) {
  if (sameValue(base, edited)) return;
  if (edited === undefined) {
    addUnset(target, String(key));
    return;
  }
  (target as Record<string, unknown>)[key] = structuredClone(edited);
}

function assignObject<T extends keyof VariantNodeOverride>(
  target: VariantNodeOverride,
  key: T,
  base: unknown,
  edited: unknown,
  _variantName: string,
  _nodeId: string,
) {
  if (sameValue(base, edited)) return;
  if (edited === undefined) {
    addUnset(target, String(key));
    return;
  }
  (target as Record<string, unknown>)[key] = structuredClone(edited);
}

function objectDelta(
  target: VariantNodeOverride,
  property: string,
  base: Record<string, unknown> | undefined,
  edited: Record<string, unknown> | undefined,
  _variantName: string,
  _nodeId: string,
) {
  if (sameValue(base, edited)) return undefined;
  if (edited === undefined) {
    addUnset(target, property);
    return undefined;
  }
  const delta: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(edited)) {
    if (!sameValue(base?.[key], value)) delta[key] = structuredClone(value);
  }
  for (const key of Object.keys(base ?? {})) {
    if (edited[key] === undefined) {
      addUnset(target, `${property}.${key}`);
    }
  }
  return Object.keys(delta).length ? delta : undefined;
}

function mapDelta(
  target: VariantNodeOverride,
  property: string,
  base: Record<string, unknown> | undefined,
  edited: Record<string, unknown> | undefined,
  _variantName: string,
  _nodeId: string,
) {
  if (sameValue(base, edited)) return undefined;
  if (edited === undefined) {
    if (base === undefined) return undefined;
    addUnset(target, property);
    return undefined;
  }
  const delta: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(edited)) {
    if (!sameValue(base?.[key], value)) delta[key] = structuredClone(value);
  }
  for (const key of Object.keys(base ?? {})) {
    if (edited[key] === undefined) {
      addUnset(target, `${property}.${key}`);
    }
  }
  return Object.keys(delta).length ? delta : undefined;
}

/** Derive nested instance fields as a sparse path/field map. */
function childFieldsDelta(
  target: VariantNodeOverride,
  base: ChildFieldOverrides | undefined,
  edited: ChildFieldOverrides | undefined,
) {
  if (sameValue(base, edited)) return undefined;
  if (edited === undefined) {
    if (base === undefined) return undefined;
    addUnset(target, 'childFields');
    return undefined;
  }

  const delta: ChildFieldOverrides = {};
  const paths = new Set([...Object.keys(base ?? {}), ...Object.keys(edited)]);
  for (const path of paths) {
    const baseFields = base?.[path];
    const editedFields = edited[path];
    if (!editedFields) {
      for (const field of Object.keys(baseFields ?? {})) {
        addUnset(target, `childFields.${path}.${field}`);
      }
      continue;
    }
    for (const [field, value] of Object.entries(editedFields)) {
      if (!sameValue(baseFields?.[field], value)) {
        (delta[path] ??= {})[field] = structuredClone(value) as FieldValue;
      }
    }
    for (const field of Object.keys(baseFields ?? {})) {
      if (editedFields[field] === undefined) {
        addUnset(target, `childFields.${path}.${field}`);
      }
    }
  }
  return Object.keys(delta).length ? delta : undefined;
}

function addUnset(target: VariantNodeOverride, path: string) {
  const unset = new Set(target.unset ?? []);
  unset.add(path);
  target.unset = [...unset].sort();
}

export function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}
