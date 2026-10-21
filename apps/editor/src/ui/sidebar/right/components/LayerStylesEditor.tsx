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
import { ClassConditionEditor } from './ClassConditionEditor';
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
  const optionalClasses = layerStyles.filter((item) => !item.generated);
  const optionalClassIndex = (className: string) =>
    optionalClasses.findIndex((item) => item.className === className);
  const reorderClasses = (from: number, to: number) => {
    if (to < 0 || to >= optionalClasses.length) return;
    const names = optionalClasses.map((item) => item.className);
    const [moved] = names.splice(from, 1);
    if (!moved) return;
    names.splice(to, 0, moved);
    onEvent({
      type: EditorEventType.DesignCommandExecute,
      data: {
        command: {
          type: 'setNodeClassOrder',
          definitionUuid: definitionId,
          nodeUuid: nodeId,
          classNames: names,
        },
      },
    });
  };
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
          orderAction={
            layerStyle.generated
              ? undefined
              : {
                  onMoveUp: () =>
                    reorderClasses(
                      optionalClassIndex(layerStyle.className),
                      optionalClassIndex(layerStyle.className) - 1,
                    ),
                  onMoveDown: () =>
                    reorderClasses(
                      optionalClassIndex(layerStyle.className),
                      optionalClassIndex(layerStyle.className) + 1,
                    ),
                  canMoveUp: optionalClassIndex(layerStyle.className) > 0,
                  canMoveDown:
                    optionalClassIndex(layerStyle.className) < optionalClasses.length - 1,
                }
          }
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
  orderAction,
}: {
  nodeId: string;
  definitionId: string;
  layerStyle: InspectorSidebarModel['layerStyles'][number];
  valueFieldOptions: readonly TransformableFieldOption[];
  onEvent: (event: EditorEvent) => void;
  orderAction?: {
    onMoveUp: () => void;
    onMoveDown: () => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
  };
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
    <Section
      title={layerStyle.selector}
      action={
        orderAction ? (
          <span className="layer-style-order" aria-label={`Order ${layerStyle.selector}`}>
            <button
              type="button"
              aria-label={`Move ${layerStyle.selector} up`}
              disabled={!orderAction.canMoveUp}
              onClick={orderAction.onMoveUp}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Move ${layerStyle.selector} down`}
              disabled={!orderAction.canMoveDown}
              onClick={orderAction.onMoveDown}
            >
              ↓
            </button>
          </span>
        ) : undefined
      }
      collapsible
      defaultOpen
      appearance="accordion"
      keepMounted
    >
      <Stack gap={10}>
        <ClassConditionEditor
          condition={layerStyle.condition}
          options={layerStyle.conditionOptions}
          onChange={(condition) =>
            onEvent({
              type: EditorEventType.DesignCommandExecute,
              data: {
                command: {
                  type: 'setNodeClassCondition',
                  definitionUuid: definitionId,
                  nodeUuid: nodeId,
                  className: layerStyle.className,
                  condition,
                },
              },
            })
          }
        />
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
