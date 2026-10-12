'use client';

import { useState } from 'react';
import { Form } from '@facadeur/form';
import type { InspectorSidebarModel } from '../../../../domain/sidebar/types';

export function CatalogNodeInspector({
  model,
  onChange,
}: {
  model: InspectorSidebarModel | null;
  onChange: (nodeId: string, path: string, value: unknown) => void;
}) {
  const [activeTab, setActiveTab] = useState<'style' | 'properties' | 'previewData'>('style');
  if (!model) return <p className="inspector-empty">Select an element in the layer tree.</p>;
  const selectedTab = model.tabs.find((tab) => tab.id === activeTab) ?? model.tabs[0];
  return (
    <div key={model.formKey} className="inspector-form-stack" data-testid="catalog-node-inspector">
      <section className="inspector-element" aria-labelledby="inspector-element-title">
        <h2 id="inspector-element-title" className="inspector-element-title">
          {model.selectionKind === 'root' ? 'Asset' : 'Element'}
        </h2>
        <Form
          value={model.values}
          fields={[...model.headerFields]}
          bindOptions={model.bindOptions}
          onChange={(_, meta) => onChange(model.nodeId, meta.path, meta.next)}
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
                  value={model.values}
                  fields={[...section.fields]}
                  bindOptions={model.bindOptions}
                  onChange={(_, meta) => onChange(model.nodeId, meta.path, meta.next)}
                />
              </section>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
