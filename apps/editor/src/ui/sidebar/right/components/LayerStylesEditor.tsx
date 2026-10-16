'use client';

import { useEffect, useState } from 'react';
import { AutocompleteSelectField, TransformableField } from '@facadeur/form';
import type { TransformableFieldOption } from '@facadeur/form';
import type { EditorEvent } from '../../../../domain/sidebar/events';
import { EditorEventType } from '../../../../domain/sidebar/events';
import type { InspectorSidebarModel } from '../../../../domain/sidebar/types';
import { Section, Stack } from '../../../components/layout';
import { TextInput } from '../../../controls/form-binding';
import { CSS_PROPERTY_OPTIONS } from './css-property-options';
import './layer-styles-editor.css';

export function LayerStylesEditor({
  nodeId,
  definitionId,
  layerStyles,
  valueFieldOptions,
  onEvent,
}: {
  nodeId: string;
  definitionId: string;
  layerStyles: InspectorSidebarModel['layerStyles'];
  valueFieldOptions: readonly TransformableFieldOption[];
  onEvent: (event: EditorEvent) => void;
}) {
  return (
    <Stack gap={10}>
      {layerStyles.map((layerStyle) => (
        <LayerClassStyleEditor
          key={layerStyle.className}
          nodeId={nodeId}
          definitionId={definitionId}
          layerStyle={layerStyle}
          valueFieldOptions={valueFieldOptions}
          onEvent={onEvent}
        />
      ))}
    </Stack>
  );
}

function LayerClassStyleEditor({
  nodeId,
  definitionId,
  layerStyle,
  valueFieldOptions,
  onEvent,
}: {
  nodeId: string;
  definitionId: string;
  layerStyle: InspectorSidebarModel['layerStyles'][number];
  valueFieldOptions: readonly TransformableFieldOption[];
  onEvent: (event: EditorEvent) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [property, setProperty] = useState('');
  const [value, setValue] = useState('');
  const baseId = layerStyle.breakpoints[0]?.uuid;
  const selectedViewport = layerStyle.breakpoints.find((item) => item.uuid === selectedId);
  const hasSelectedViewport = Boolean(selectedViewport);
  const writingBreakpointId =
    selectedViewport && selectedViewport.uuid !== baseId ? selectedViewport.uuid : null;
  useEffect(() => {
    if (selectedId && !hasSelectedViewport) setSelectedId(null);
  }, [selectedId, hasSelectedViewport]);
  const declarations = {
    ...(writingBreakpointId
      ? (layerStyle.overrides[writingBreakpointId] ?? {})
      : layerStyle.declarations),
  };
  const propertyOptions = [
    ...CSS_PROPERTY_OPTIONS,
    ...Object.keys(declarations)
      .filter((name) => !CSS_PROPERTY_OPTIONS.some((option) => option.value === name))
      .map((name) => ({ value: name, label: name, group: 'Used in this style' })),
  ];

  const setDeclaration = (name: string, next: string | null) =>
    onEvent({
      type: EditorEventType.DesignCommandExecute,
      data: {
        command: {
          type: 'setNodeClassStyleDeclaration',
          definitionUuid: definitionId,
          nodeUuid: nodeId,
          className: layerStyle.className,
          property: name,
          value: next,
          breakpointUuid: writingBreakpointId,
        },
      },
    });

  return (
    <Section title={layerStyle.selector} collapsible defaultOpen appearance="accordion" keepMounted>
      <Stack gap={10}>
        <div
          className="layer-style-tabs"
          role="tablist"
          aria-label={`${layerStyle.selector} viewports`}
        >
          {layerStyle.breakpoints.map((viewport, index) => {
            const base = index === 0;
            const selected = base ? selectedId === null : selectedId === viewport.uuid;
            return (
              <button
                key={viewport.uuid}
                type="button"
                role="tab"
                aria-selected={selected}
                className={selected ? 'layer-style-tab is-active' : 'layer-style-tab'}
                onClick={() => setSelectedId(base ? null : viewport.uuid)}
              >
                {base ? 'Base' : viewport.label}
              </button>
            );
          })}
          {layerStyle.breakpoints.length === 0 ? (
            <button
              type="button"
              role="tab"
              aria-selected="true"
              className="layer-style-tab is-active"
            >
              Base
            </button>
          ) : null}
        </div>
        <div className="layer-style-declarations">
          {Object.entries(declarations).map(([name, current]) => {
            return (
              <div className="layer-style-row" key={name}>
                <TextInput
                  aria-label="CSS property"
                  className="layer-style-property"
                  name={`${nodeId}-${name}-property`}
                  value={name}
                  disabled
                />
                <div className="eu-control layer-style-value-control">
                  <TransformableField
                    id={`${nodeId}-${name}-value`}
                    name={`${nodeId}-${name}-value`}
                    label={`CSS value for ${name}`}
                    value={current}
                    fieldOptions={valueFieldOptions}
                    onChange={() => {}}
                    onCommit={(next) => setDeclaration(name, next || null)}
                  />
                </div>
                <button
                  className="layer-style-remove"
                  type="button"
                  aria-label={`${writingBreakpointId ? 'Remove override for' : 'Remove'} ${name}`}
                  onClick={() => setDeclaration(name, null)}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
        <div className="layer-style-add-row">
          <div className="eu-control">
            <AutocompleteSelectField
              id={`${nodeId}-new-property`}
              name={`${nodeId}-new-property`}
              label="CSS property"
              value={property}
              options={propertyOptions}
              placeholder="property"
              onChange={setProperty}
            />
          </div>
          <div className="layer-style-value-control">
            <TransformableField
              id={`${nodeId}-new-value`}
              name={`${nodeId}-new-value`}
              label="CSS value"
              value={value}
              fieldOptions={valueFieldOptions}
              placeholder="value"
              onChange={setValue}
              onCommit={setValue}
            />
          </div>
          <button
            type="button"
            className="layer-style-add"
            aria-label="Add CSS property"
            onClick={() => {
              const name = property.trim();
              const next = value.trim();
              if (!name || !next) return;
              setDeclaration(name, next);
              setProperty('');
              setValue('');
            }}
          >
            +
          </button>
        </div>
      </Stack>
    </Section>
  );
}
