import React from 'react';
import { addons, types } from 'storybook/manager-api';
import { SchemaFormPanel } from './panel';
import { STORYBOOK_SCHEMA_FORM_PARAMETER } from './types';

export function registerSchemaFormPanel({
  addonId,
  panelId,
  title,
  parameterKey = STORYBOOK_SCHEMA_FORM_PARAMETER,
}: {
  readonly addonId: string;
  readonly panelId: string;
  readonly title: string;
  readonly parameterKey?: string;
}) {
  addons.register(addonId, () => {
    addons.add(panelId, {
      type: types.PANEL,
      title,
      render: ({ active }) => <SchemaFormPanel active={active} parameterKey={parameterKey} />,
    });
    movePanelToFront(panelId);
  });
}

function movePanelToFront(panelId: string) {
  const panels = addons.getElements(types.PANEL);
  const panel = panels[panelId];
  if (!panel) return;

  const remaining = Object.entries(panels).filter(([id]) => id !== panelId);
  for (const id of Object.keys(panels)) delete panels[id];
  panels[panelId] = panel;
  for (const [id, entry] of remaining) panels[id] = entry;
}
