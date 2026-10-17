import type {
  FieldExposure,
  Node,
  NodeDefinition,
  ProjectCatalog,
  JsonSchemaObject,
  StaticFieldConfig,
} from '@facadeur/domain';
import { fieldsFromJsonSchema, type JsonSchemaField } from '../../../../schema/json-schema-fields';
import { findDefinition, resolveJsonSchemaForDefinition } from '../../catalog/ops';
import { defaultFieldExposure, inheritableSchemaForDefinition } from '../../catalog/field-contract';

/** Config-tab fields owned by the root, followed by fields from each child instance. */
export function configFieldsForDefinition(catalog: ProjectCatalog, definition: NodeDefinition) {
  const ownFields = fieldsFromJsonSchema(
    schemaWithReferenceOptions(resolveJsonSchemaForDefinition(catalog, definition) ?? {}, catalog),
  ).map((field) => ({
    field,
    config: definition.config?.staticFields?.[field.name],
  }));
  const instanceFields: {
    field: JsonSchemaField;
    config?: StaticFieldConfig;
    instanceUuid: string;
    instanceLabel: string;
    exposure: FieldExposure;
  }[] = [];
  const ownSchema = resolveJsonSchemaForDefinition(catalog, definition);
  const occupiedNames = new Set(Object.keys(ownSchema?.properties ?? {}));
  const visit = (node: Node) => {
    const target = node.config?.definitionRef
      ? findDefinition(catalog, node.config.definitionRef)?.definition
      : undefined;
    if (target) {
      const targetSchema = inheritableSchemaForDefinition(catalog, target);
      const childProperties = targetSchema?.properties ?? {};
      const instanceLabel = node.name?.trim() || target.name;
      const exposure =
        definition.config?.fieldExposure?.[node.uuid] ??
        defaultFieldExposure(occupiedNames, childProperties, instanceLabel);
      for (const field of fieldsFromJsonSchema(
        schemaWithReferenceOptions((targetSchema ?? {}) as JsonSchemaObject, catalog),
      )) {
        instanceFields.push({
          field,
          config: definition.config?.instanceFieldConfigs?.[node.uuid]?.[field.name],
          instanceUuid: node.uuid,
          instanceLabel,
          exposure,
        });
      }
      if (exposure.mode === 'flat') {
        Object.keys(childProperties).forEach((name) => occupiedNames.add(name));
      } else if (exposure.mode === 'grouped') {
        occupiedNames.add(exposure.groupName || instanceLabel);
      } else {
        Object.values(exposure.fields).forEach((name) => occupiedNames.add(name));
      }
      return;
    }
    for (const child of node.dom.children ?? []) visit(child);
  };
  visit(definition.root);
  return [...ownFields, ...instanceFields];
}

/** Add registered catalog choices as enum values for schema-backed inspector controls. */
export function schemaWithReferenceOptions(schema: JsonSchemaObject, catalog: ProjectCatalog) {
  return mapSchemaReferences(schema, (target) => {
    if (target === 'icon') return (catalog.icons ?? []).map((icon) => icon.id);
    if (target === 'component') return Object.keys(catalog.components);
    return [];
  }) as JsonSchemaObject;
}

function mapSchemaReferences(
  value: unknown,
  optionsForTarget: (target: string) => string[],
): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => mapSchemaReferences(entry, optionsForTarget));
  }
  if (!value || typeof value !== 'object') return value;
  const result = Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      mapSchemaReferences(entry, optionsForTarget),
    ]),
  );
  const reference = result['x-facadeur-reference'];
  if (reference && typeof reference === 'object' && 'target' in reference) {
    result.enum = optionsForTarget(String(reference.target));
  }
  return result;
}
