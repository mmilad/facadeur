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

export type InspectorLayerStyles = InspectorSidebarModel['layerStyles'];

export function buildInspectorSidebarViewModel(
  model: InspectorViewModel,
  formKey: string,
  definitionId: string,
  layerStyles: InspectorLayerStyles,
  icons: readonly AutocompleteOption[] = [],
): InspectorSidebarModel {
  const propOptions = propBindingOptions(model);
  const iconOptions = model.formValue.node.tagName?.toLowerCase() === 'svg' ? icons : [];
  const fieldOptions = (path: string, _label: string, color = false) =>
    transformableFieldOptions({
      props: propOptions,
      tokens: model.styleSuggestions.options,
      icons: path === 'node.attributes' ? iconOptions : [],
      color,
    });
  const styleValueOptions = fieldOptions('layerStyle', 'CSS value', true);
  const isRoot = model.selectionKind === 'root';
  const headerFields =
    sectionFields(model, isRoot ? 'Asset' : 'Element', undefined, propOptions, fieldOptions)
      ?.fields ?? [];
  const contentSection = sectionFields(model, 'Content', undefined, propOptions, fieldOptions);
  const hasDomTag = model.formValue.node.tagName !== undefined;
  const rawStyleSection = sectionFields(
    model,
    'Layout & style',
    undefined,
    propOptions,
    fieldOptions,
  );
  const styleSection = rawStyleSection;
  const nodeDataSection = sectionFields(
    model,
    'Properties',
    model.selectionKind === 'instance' ? 'Component properties' : 'Node data',
    propOptions,
    fieldOptions,
  );
  const previewDefaultsSection = sectionFields(
    model,
    'Preview defaults',
    'Component defaults',
    propOptions,
    fieldOptions,
  );
  const propertySections = [
    ...(contentSection ? [contentSection] : []),
    ...(hasDomTag
      ? [
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
        ]
      : []),
    ...(model.selectionKind !== 'root' && nodeDataSection ? [nodeDataSection] : []),
  ];
  const componentDefaults = model.selectionKind === 'root' ? previewDefaultsSection : null;
  const previewSections = componentDefaults ? [componentDefaults] : [];
  const staticFieldNames = new Set(
    model.configFields.filter(({ config }) => config?.isStatic).map(({ field }) => field.name),
  );
  const tabs = [
    { id: 'style' as const, label: 'Style', sections: styleSection ? [styleSection] : [] },
    { id: 'properties' as const, label: 'Properties', sections: propertySections },
    ...(model.previewDataVisible && previewSections.length
      ? [
          {
            id: 'previewData' as const,
            label: 'Preview data',
            sections: previewSections.map((section) => ({
              ...section,
              fields: section.fields.map((field) => {
                if (field.type === 'layout') return field;
                const name = field.name.startsWith('previewData.')
                  ? field.name.slice('previewData.'.length)
                  : field.name.startsWith('props.')
                    ? field.name.slice('props.'.length)
                    : '';
                return name && staticFieldNames.has(name) ? { ...field, disabled: true } : field;
              }),
            })),
          },
        ]
      : []),
    ...(isRoot
      ? [
          {
            id: 'config' as const,
            label: 'Config',
            sections: [],
            configFields: model.configFields.map(
              ({ field, config, instanceUuid, instanceLabel, exposure }) => ({
                field,
                label: field.schema.title?.trim() || field.name,
                instanceUuid,
                instanceLabel,
                exposure,
                isStatic: config?.isStatic === true,
                value: config?.value,
                exposed: config?.expose === true,
                valueOptions: transformableFieldOptions({
                  props: [],
                  tokens: model.styleSuggestions.options,
                  color: /color|colour|background/i.test(
                    `${field.name} ${field.schema.title ?? ''}`,
                  ),
                }),
                iconOptions: isIconReference(field.schema) ? icons : [],
              }),
            ),
          },
        ]
      : []),
  ];
  const allFields = [
    ...headerFields,
    ...tabs.flatMap((tab) => tab.sections.flatMap((section) => section.fields)),
  ];
  const names = flattenFields(allFields).map((field) => field.name);
  return {
    nodeId: model.nodeUuid,
    definitionId,
    formKey,
    selectionKind: model.selectionKind,
    layerStyles,
    headerFields,
    tabs,
    values: Object.fromEntries(names.map((name) => [name, getPath(model.formValue, name)])),
    bindOptions: propOptions,
    styleValueOptions,
  };
}

function isIconReference(schema: { readonly [key: string]: unknown }) {
  const reference = schema['x-facadeur-reference'];
  return (
    typeof reference === 'object' &&
    reference !== null &&
    'target' in reference &&
    reference.target === 'icon'
  );
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
    group:
      option.kind === 'component'
        ? 'Component props'
        : option.kind === 'item'
          ? 'Repeater item props'
          : option.kind === 'index'
            ? 'Repeater indices'
            : 'Design props',
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
        fields: mapInspectorFormFields(section.fields, componentOptions, fieldOptions),
      }
    : null;
}
