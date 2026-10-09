'use client';

import { useState } from 'react';
import type { AutocompleteOption } from '@facadeur/form';
import type { AppService } from '../../../app-service';
import { Form } from '@facadeur/form';
import type { FormFieldConfig } from '@facadeur/form';
import { mapInspectorFormFields } from './map-inspector-form';

export function CatalogNodeInspector({
  app,
  nodeUuid,
  formKey,
}: {
  app: AppService;
  nodeUuid: string;
  formKey: string;
}) {
  const model = app.inspector.getModel(nodeUuid);
  const [activeTab, setActiveTab] = useState<'style' | 'properties' | 'previewData'>('style');
  if (!model) {
    return <p className="inspector-empty">Select an element in the layer tree.</p>;
  }
  const componentOptions = componentDataOptions(model);
  const isRoot = model.selectionKind === 'root';
  const headerFields =
    sectionFields(model, isRoot ? 'Asset' : 'Element', undefined, componentOptions)?.fields ?? [];
  const styleSection = sectionFields(model, 'Layout & style', undefined, componentOptions);
  const nodeDataSection = sectionFields(model, 'Properties', 'Node data', componentOptions);
  const propertySections: InspectorSection[] = [
    {
      label: 'HTML attributes',
      fields: [
        {
          type: 'record',
          name: 'node.attributes',
          label: 'Attributes',
          keyLabel: 'Attribute',
          valueLabel: 'Value',
          bindable: true,
          suggestions: { options: componentOptions },
        },
      ],
    },
    ...(model.selectionKind === 'element' && nodeDataSection ? [nodeDataSection] : []),
  ];
  const componentDefaultsSection = nodeDataSection
    ? { ...nodeDataSection, label: 'Component defaults' }
    : null;
  const previewSections =
    model.selectionKind !== 'element' && componentDefaultsSection ? [componentDefaultsSection] : [];
  const tabs = [
    {
      id: 'style' as const,
      label: 'Style',
      sections: styleSection ? [styleSection] : [],
    },
    { id: 'properties' as const, label: 'Properties', sections: propertySections },
    ...(model.previewDataVisible && previewSections.length
      ? [{ id: 'previewData' as const, label: 'Preview data', sections: previewSections }]
      : []),
  ];
  const selectedTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0]!;

  return (
    <div key={formKey} className="inspector-form-stack" data-testid="catalog-node-inspector">
      <section className="inspector-element" aria-labelledby="inspector-element-title">
        <h2 id="inspector-element-title" className="inspector-element-title">
          {isRoot ? 'Asset' : 'Element'}
        </h2>
        <InspectorFields app={app} model={model} fields={headerFields} />
      </section>
      <div className="inspector-tabs" role="tablist" aria-label="Element settings">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`inspector-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selectedTab.id === tab.id}
            aria-controls="inspector-tabpanel"
            className={selectedTab.id === tab.id ? 'inspector-tab is-active' : 'inspector-tab'}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <section
        id="inspector-tabpanel"
        className="inspector-tabpanel"
        role="tabpanel"
        aria-labelledby={`inspector-tab-${selectedTab.id}`}
      >
        <div className="inspector-form-stack">
          {selectedTab.sections.map((section) => (
            <section className="inspector-tab-section" key={section.label}>
              <h3 className="inspector-tab-section-title">{section.label}</h3>
              <InspectorFields app={app} model={model} fields={section.fields} />
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}

interface InspectorSection {
  label: string;
  fields: FormFieldConfig[];
}

function InspectorFields({
  app,
  model,
  fields,
}: {
  app: AppService;
  model: NonNullable<ReturnType<AppService['inspector']['getModel']>>;
  fields: FormFieldConfig[];
}) {
  const value = Object.fromEntries(
    flattenFields(fields).map((field) => [field.name, valueAtPath(model.formValue, field.name)]),
  );
  return (
    <Form
      value={value}
      fields={fields}
      bindOptions={model.propOptions.map((option) => ({ value: option.ref, label: option.name }))}
      onChange={(_, meta) =>
        app.inspector.updateField({ nodeUuid: model.nodeUuid, path: meta.path, value: meta.next })
      }
    />
  );
}

function flattenFields(
  fields: readonly FormFieldConfig[],
): Exclude<FormFieldConfig, { type: 'layout' }>[] {
  return fields.flatMap((field) =>
    field.type === 'layout' ? flattenFields(field.fields) : [field],
  );
}

function valueAtPath(value: unknown, path: string) {
  return path.split('.').reduce<unknown>((current, key) => {
    if (typeof current !== 'object' || current === null) return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}

function sectionFields(
  model: NonNullable<ReturnType<AppService['inspector']['getModel']>>,
  title: string,
  label = title,
  componentOptions: readonly AutocompleteOption[] = [],
): InspectorSection | null {
  const section = model.fields.find((field) => field.type === 'section' && field.title === title);
  return section?.type === 'section'
    ? {
        label,
        fields: mapInspectorFormFields(section.fields, model.styleSuggestions, componentOptions),
      }
    : null;
}

type InspectorModel = NonNullable<ReturnType<AppService['inspector']['getModel']>>;

function componentDataOptions(model: InspectorModel): AutocompleteOption[] {
  const labels = new Map<string, string>();
  const collectLabels = (fields: InspectorModel['fields']) => {
    for (const field of fields) {
      if (field.type === 'section') collectLabels(field.fields);
      else if (field.type === 'schemaField' && field.path.startsWith('nodeData.')) {
        labels.set(field.path.slice('nodeData.'.length), field.label);
      }
    }
  };
  collectLabels(model.fields);

  const seenValues = new Set<string>();
  return Object.entries(model.formValue.nodeData).flatMap(([name, value]) => {
    if (typeof value !== 'string' || !value.trim() || seenValues.has(value)) return [];
    seenValues.add(value);
    return [
      {
        value,
        label: labels.get(name) ?? name,
        description: value,
        group: 'Component defaults',
      },
    ];
  });
}
