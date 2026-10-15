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
import { inheritableSchemaForDefinition } from '../../catalog/field-contract';

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
  const visit = (node: Node) => {
    const target = node.config?.definitionRef
      ? findDefinition(catalog, node.config.definitionRef)?.definition
      : undefined;
    if (target) {
      const targetSchema = inheritableSchemaForDefinition(catalog, target);
      for (const field of fieldsFromJsonSchema(
        schemaWithReferenceOptions((targetSchema ?? {}) as JsonSchemaObject, catalog),
      )) {
        instanceFields.push({
          field,
          config: definition.config?.instanceFieldConfigs?.[node.uuid]?.[field.name],
          instanceUuid: node.uuid,
          instanceLabel: node.name?.trim() || target.name,
          exposure: definition.config?.fieldExposure?.[node.uuid] ?? { mode: 'flat' },
        });
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
