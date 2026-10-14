import type {
  FieldExposure,
  Node,
  NodeDefinition,
  ProjectCatalog,
  StaticFieldConfig,
} from '@facadeur/domain';
import { fieldsFromJsonSchema, type JsonSchemaField } from '../../../../schema/json-schema-fields';
import { findDefinition, resolveJsonSchemaForDefinition } from '../../catalog/ops';
import { inheritableSchemaForDefinition } from '../../catalog/field-contract';

/** Config-tab fields owned by the root, followed by fields from each child instance. */
export function configFieldsForDefinition(catalog: ProjectCatalog, definition: NodeDefinition) {
  const ownFields = fieldsFromJsonSchema(
    resolveJsonSchemaForDefinition(catalog, definition) ?? {},
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
        (targetSchema ?? {}) as Parameters<typeof fieldsFromJsonSchema>[0],
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
