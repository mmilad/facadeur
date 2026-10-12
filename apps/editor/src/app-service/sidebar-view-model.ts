import {
  getPath,
  type AutocompleteOption,
  type FormFieldConfig,
  type TransformableFieldOption,
} from '@facadeur/form';
import type { InspectorViewModel } from './inspector';
import { mapInspectorFormFields } from './map-inspector-form';
import { transformableFieldOptions } from './transformable-field-options';
import type { InspectorSidebarModel } from '../domain/sidebar/types';

export type InspectorLayerStyle = InspectorSidebarModel['layerStyle'];

export function buildInspectorSidebarViewModel(
  model: InspectorViewModel,
  formKey: string,
  layerStyle: InspectorLayerStyle,
): InspectorSidebarModel {
  const propOptions = propBindingOptions(model);
  const fieldOptions = (_path: string, _label: string, color = false) =>
    transformableFieldOptions({
      props: propOptions,
      tokens: model.styleSuggestions.options,
      color,
    });
  const isRoot = model.selectionKind === 'root';
  const headerFields =
    sectionFields(model, isRoot ? 'Asset' : 'Element', undefined, propOptions, fieldOptions)
      ?.fields ?? [];
  const contentSection = sectionFields(model, 'Content', undefined, propOptions, fieldOptions);
  const rawStyleSection = sectionFields(
    model,
    'Layout & style',
    undefined,
    propOptions,
    fieldOptions,
  );
  const styleSection = rawStyleSection
    ? { ...rawStyleSection, fields: filterNodeStyle(rawStyleSection.fields) }
    : null;
  const nodeDataSection = sectionFields(
    model,
    'Properties',
    'Node data',
    propOptions,
    fieldOptions,
  );
  const propertySections = [
    ...(contentSection ? [contentSection] : []),
    {
      label: 'HTML attributes',
      fields: [
        {
          type: 'record' as const,
          name: 'node.attributes',
          label: 'Attributes',
          keyLabel: 'Attribute',
          valueLabel: 'Value',
          valueField: {
            type: 'transformable' as const,
            fieldOptions: fieldOptions('node.attributes', 'Value'),
          },
        },
      ],
    },
    ...(model.selectionKind === 'element' && nodeDataSection ? [nodeDataSection] : []),
  ];
  const componentDefaults = nodeDataSection
    ? { ...nodeDataSection, label: 'Component defaults' }
    : null;
  const previewSections =
    model.selectionKind !== 'element' && componentDefaults ? [componentDefaults] : [];
  const tabs = [
    { id: 'style' as const, label: 'Style', sections: styleSection ? [styleSection] : [] },
    { id: 'properties' as const, label: 'Properties', sections: propertySections },
    ...(model.previewDataVisible && previewSections.length
      ? [{ id: 'previewData' as const, label: 'Preview data', sections: previewSections }]
      : []),
  ];
  const allFields = [
    ...headerFields,
    ...tabs.flatMap((tab) => tab.sections.flatMap((section) => section.fields)),
  ];
  const names = flattenFields(allFields).map((field) => field.name);
  return {
    nodeId: model.nodeUuid,
    formKey,
    selectionKind: model.selectionKind,
    layerStyle,
    headerFields,
    tabs,
    values: Object.fromEntries(names.map((name) => [name, getPath(model.formValue, name)])),
    bindOptions: propOptions,
  };
}

function filterNodeStyle(fields: readonly FormFieldConfig[]): FormFieldConfig[] {
  const result: FormFieldConfig[] = [];
  for (const field of fields) {
    if (field.type !== 'layout') {
      if (field.name !== 'node.style') result.push(field);
      continue;
    }
    const children = filterNodeStyle(field.fields);
    if (children.length) result.push({ ...field, fields: children });
  }
  return result;
}

function previewDefaultForProp(model: InspectorViewModel, name: string) {
  if (!name.startsWith('props.')) return undefined;
  const value = getPath(model.formValue.previewData, name.slice('props.'.length));
  if (value === undefined || value === null) return undefined;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function propBindingOptions(model: InspectorViewModel): AutocompleteOption[] {
  return model.propOptions.map((option) => ({
    value: option.ref,
    label: option.name,
    description: previewDefaultForProp(model, option.name),
    group: option.kind === 'component' ? 'Component props' : 'Design props',
  }));
}

function flattenFields(
  fields: readonly FormFieldConfig[],
): Exclude<FormFieldConfig, { type: 'layout' }>[] {
  return fields.flatMap((field) =>
    field.type === 'layout' ? flattenFields(field.fields) : [field],
  );
}

function sectionFields(
  model: InspectorViewModel,
  title: string,
  label = title,
  componentOptions: readonly AutocompleteOption[] = [],
  fieldOptions: (
    path: string,
    label: string,
    color?: boolean,
  ) => readonly TransformableFieldOption[],
) {
  const section = model.fields.find((field) => field.type === 'section' && field.title === title);
  return section?.type === 'section'
    ? {
        label,
        fields: mapInspectorFormFields(
          section.fields,
          model.styleSuggestions,
          componentOptions,
          fieldOptions,
        ),
      }
    : null;
}
