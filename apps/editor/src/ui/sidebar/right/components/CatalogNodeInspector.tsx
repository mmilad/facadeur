'use client';

import { useState } from 'react';
import { Form } from '@facadeur/form';
import type { FieldValue } from '@facadeur/domain';
import type { InspectorSidebarModel } from '../../../../domain/sidebar/types';
import type { EditorEvent } from '../../../../domain/sidebar/events';
import { EditorEventType } from '../../../../domain/sidebar/events';
import { LayerStylesEditor } from './LayerStylesEditor';
import { DefinitionFieldSettings } from './DefinitionFieldSettings';

export function CatalogNodeInspector({
  model,
  onEvent,
}: {
  model: InspectorSidebarModel | null;
  onEvent: (event: EditorEvent) => void;
}) {
  const [activeTab, setActiveTab] = useState<InspectorSidebarModel['tabs'][number]['id']>('style');
  if (!model) return <p className="inspector-empty">Select an element in the layer tree.</p>;
  const selectedTab = model.tabs.find((tab) => tab.id === activeTab) ?? model.tabs[0];
  const emitFieldChange = (path: string, value: unknown) => {
    if (value !== undefined && !isFieldValue(value)) return;
    onEvent({
      type: EditorEventType.InspectorFieldChange,
      data: { nodeId: model.nodeId, path, value },
    });
  };
  return (
    <div className="inspector-form-stack" data-testid="catalog-node-inspector">
      <section className="inspector-element" aria-labelledby="inspector-element-title">
        <h2 id="inspector-element-title" className="inspector-element-title">
          {model.selectionKind === 'root' ? 'Asset' : 'Element'}
        </h2>
        <Form
          key={`${model.formKey}:header`}
          value={model.values}
          fields={[...model.headerFields]}
          bindOptions={model.bindOptions}
          onChange={(_, meta) => emitFieldChange(meta.path, meta.next)}
        />
      </section>
      <div className="inspector-tabs" role="tablist" aria-label="Element settings">
        {model.tabs.map((tab) => (
          <button
            key={tab.id}
            id={`inspector-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selectedTab?.id === tab.id}
            aria-controls={`inspector-tabpanel-${tab.id}`}
            className={selectedTab?.id === tab.id ? 'inspector-tab is-active' : 'inspector-tab'}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {model.tabs.map((tab) => (
        <section
          id={`inspector-tabpanel-${tab.id}`}
          className="inspector-tabpanel"
          role="tabpanel"
          aria-labelledby={`inspector-tab-${tab.id}`}
          hidden={selectedTab?.id !== tab.id}
          key={tab.id}
        >
          <div className="inspector-form-stack">
            {tab.sections.map((section) => (
              <section className="inspector-tab-section" key={section.label}>
                <h3 className="inspector-tab-section-title">{section.label}</h3>
                <Form
                  key={`${model.formKey}:${tab.id}:${section.label}`}
                  value={model.values}
                  fields={[...section.fields]}
                  bindOptions={model.bindOptions}
                  onChange={(_, meta) => emitFieldChange(meta.path, meta.next)}
                />
              </section>
            ))}
            {tab.id === 'config'
              ? groupConfigFields(tab.configFields ?? []).map((group) => (
                  <section
                    className="inspector-tab-section"
                    aria-label={group.label}
                    key={group.id}
                  >
                    <h3 className="inspector-tab-section-title">{group.label}</h3>
                    <div className="inspector-config-fields">
                      {group.fields.map((configField) => (
                        <DefinitionFieldSettings
                          key={`${configField.instanceUuid ?? 'root'}:${configField.field.name}`}
                          configField={configField}
                          onChange={(setting, value) =>
                            emitFieldChange(
                              configField.instanceUuid
                                ? `definition.instanceFieldConfigs.${configField.instanceUuid}.${configField.field.name}.${setting}`
                                : `definition.staticFields.${configField.field.name}.${setting}`,
                              value,
                            )
                          }
                        />
                      ))}
                    </div>
                  </section>
                ))
              : null}
            {tab.id === 'style' ? (
              <LayerStylesEditor
                key={model.formKey}
                nodeId={model.nodeId}
                layerStyle={model.layerStyle}
                valueFieldOptions={model.styleValueOptions}
                onEvent={onEvent}
              />
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}

function groupConfigFields(
  fields: NonNullable<InspectorSidebarModel['tabs'][number]['configFields']>,
) {
  const groups = new Map<
    string,
    {
      id: string;
      label: string;
      fields: (typeof fields)[number][];
    }
  >();
  for (const field of fields) {
    const id = field.instanceUuid ?? 'root';
    let group = groups.get(id);
    if (!group) {
      group = {
        id,
        label: field.instanceUuid
          ? `${field.instanceLabel} (${field.instanceUuid.slice(0, 8)})`
          : 'Component fields',
        fields: [],
      };
      groups.set(id, group);
    }
    group.fields.push(field);
  }
  return [...groups.values()];
}

function isFieldValue(value: unknown): value is FieldValue {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) return value.every(isFieldValue);
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return (
    (prototype === Object.prototype || prototype === null) &&
    Object.values(value).every(isFieldValue)
  );
}
