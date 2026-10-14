import type { FieldValue, ProjectCatalog, StaticFieldConfig } from '@facadeur/domain';
import { isFieldValue } from '../../../schema/fields';
import { effectiveSchemaForDefinition } from './field-contract';
import {
  findDefinition,
  findNodeByUuid,
  patchDefinitionInstanceField,
  patchDefinitionStaticField,
  resolveJsonSchemaForDefinition,
} from './ops';

type StaticFieldSetting = 'isStatic' | 'value' | 'expose';

export function updateDefinitionStaticField(
  catalog: ProjectCatalog,
  definitionUuid: string,
  field: string,
  setting: StaticFieldSetting,
  value: boolean | FieldValue,
) {
  const located = findDefinition(catalog, definitionUuid);
  if (!located) return catalog;
  const current = located.definition.config?.staticFields?.[field];
  if (setting === 'isStatic') {
    if (value !== true)
      return patchDefinitionStaticField(catalog, definitionUuid, field, undefined);
    const schema = resolveJsonSchemaForDefinition(catalog, located.definition);
    const properties = schema?.properties as Record<string, unknown> | undefined;
    const property = properties?.[field];
    const schemaDefault =
      property && typeof property === 'object' && 'default' in property
        ? property.default
        : undefined;
    const previewValue = located.definition.config?.previewData?.fields?.[field];
    const staticValue = previewValue ?? (isFieldValue(schemaDefault) ? schemaDefault : undefined);
    return patchDefinitionStaticField(
      catalog,
      definitionUuid,
      field,
      {
        isStatic: true,
        expose: false,
        ...(staticValue !== undefined ? { value: staticValue } : {}),
      },
      true,
    );
  }
  if (!current?.isStatic) return catalog;
  return patchDefinitionStaticField(
    catalog,
    definitionUuid,
    field,
    nextStaticConfig(current, setting, value),
  );
}

export function updateDefinitionInstanceField(
  catalog: ProjectCatalog,
  definitionUuid: string,
  instanceUuid: string,
  field: string,
  setting: StaticFieldSetting,
  value: boolean | FieldValue,
) {
  const located = findDefinition(catalog, definitionUuid);
  const instance = located ? findNodeByUuid(located.definition.root, instanceUuid) : null;
  const target = instance?.config?.definitionRef
    ? findDefinition(catalog, instance.config.definitionRef)?.definition
    : undefined;
  if (!located || !target) return catalog;
  const current = located.definition.config?.instanceFieldConfigs?.[instanceUuid]?.[field];
  if (setting === 'isStatic') {
    if (value !== true) {
      return patchDefinitionInstanceField(catalog, definitionUuid, instanceUuid, field, undefined);
    }
    const effective = effectiveSchemaForDefinition(catalog, target);
    const properties = effective.schema?.properties as Record<string, unknown> | undefined;
    const property = properties?.[field];
    const schemaDefault =
      property && typeof property === 'object' && 'default' in property
        ? property.default
        : undefined;
    const defaultValue =
      effective.previewDefaults[field] ?? (isFieldValue(schemaDefault) ? schemaDefault : undefined);
    return patchDefinitionInstanceField(
      catalog,
      definitionUuid,
      instanceUuid,
      field,
      {
        isStatic: true,
        expose: false,
        ...(defaultValue !== undefined ? { value: defaultValue } : {}),
      },
      true,
    );
  }
  if (!current?.isStatic) return catalog;
  return patchDefinitionInstanceField(
    catalog,
    definitionUuid,
    instanceUuid,
    field,
    nextStaticConfig(current, setting, value),
  );
}

function nextStaticConfig(
  current: StaticFieldConfig,
  setting: StaticFieldSetting,
  value: boolean | FieldValue,
): StaticFieldConfig {
  return {
    ...current,
    ...(setting === 'value' && isFieldValue(value) ? { value } : {}),
    ...(setting === 'expose' && typeof value === 'boolean' ? { expose: value } : {}),
  };
}
