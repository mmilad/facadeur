'use client';

import { useEffect, useState } from 'react';
import type { EditorEvent } from '../../../../domain/sidebar/events';
import { EditorEventType } from '../../../../domain/sidebar/events';
import type { InspectorSidebarModel } from '../../../../domain/sidebar/types';
import { Section, Stack } from '../../../components/layout';
import { TextInput } from '../../../controls/form-binding';
import './layer-styles-editor.css';

export function LayerStylesEditor({
  nodeId,
  layerStyle,
  onEvent,
}: {
  nodeId: string;
  layerStyle: InspectorSidebarModel['layerStyle'];
  onEvent: (event: EditorEvent) => void;
}) {
  const baseId = layerStyle.breakpoints[0]?.uuid ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [property, setProperty] = useState('');
  const [value, setValue] = useState('');
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

  const setDeclaration = (name: string, next: string | null) =>
    onEvent({
      type: EditorEventType.DesignCommandExecute,
      data: {
        command: {
          type: 'setLayerStyleDeclaration',
          nodeUuid: nodeId,
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
                <TextInput
                  aria-label={`CSS value for ${name}`}
                  className="layer-style-value"
                  name={`${nodeId}-${name}-value`}
                  value={current}
                  onCommit={(next) => setDeclaration(name, next || null)}
                />
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
          <TextInput
            aria-label="CSS property"
            name={`${nodeId}-new-property`}
            value={property}
            placeholder="property"
            onChange={setProperty}
          />
          <TextInput
            aria-label="CSS value"
            name={`${nodeId}-new-value`}
            value={value}
            placeholder="value"
            onChange={setValue}
          />
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
