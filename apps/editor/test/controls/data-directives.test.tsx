/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toFlat } from '@facadeur/core';
import {
  DataDirectivesEditorControl,
  dataFieldsForNode,
} from '../../src/ui/controls/data/DataDirectivesEditorControl.js';

describe('data directives editor', () => {
  afterEach(() => cleanup());

  it('adds and removes a repeat with nested object keys', async () => {
    const user = userEvent.setup();
    const onChangeRepeat = vi.fn();
    const fields = [
      {
        name: 'sections',
        type: 'array' as const,
        items: {
          type: 'object' as const,
          fields: [{ name: 'rows', type: 'array' as const }],
        },
      },
    ];
    const { rerender } = render(
      <DataDirectivesEditorControl
        node={{ id: 'root', type: 'frame', children: [] }}
        fields={fields}
        onChangeDisplayOn={() => undefined}
        onChangeRepeat={onChangeRepeat}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add repeat' }));
    expect(onChangeRepeat).toHaveBeenCalledWith({ path: 'sections' });

    rerender(
      <DataDirectivesEditorControl
        node={{
          id: 'root',
          type: 'frame',
          children: [],
          repeat: { path: 'sections', as: 'section' },
        }}
        fields={fields}
        onChangeDisplayOn={() => undefined}
        onChangeRepeat={onChangeRepeat}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Remove repeat' }));
    expect(onChangeRepeat).toHaveBeenLastCalledWith(null);
  });

  it('adds a truthy display condition for a nested field', async () => {
    const user = userEvent.setup();
    const onChangeDisplayOn = vi.fn();
    render(
      <DataDirectivesEditorControl
        node={{ id: 'root', type: 'text', text: 'Row' }}
        fields={[
          {
            name: 'items',
            type: 'array',
            items: { type: 'object', fields: [{ name: 'visible', type: 'boolean' }] },
          },
        ]}
        onChangeDisplayOn={onChangeDisplayOn}
        onChangeRepeat={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add condition' }));
    expect(onChangeDisplayOn).toHaveBeenCalledWith({ path: 'items', truthy: true });
  });

  it('exposes repeat aliases to descendant directive editors', () => {
    const document = toFlat({
      version: 1,
      id: 'repeat-scope',
      name: 'Repeat scope',
      kind: 'component',
      fields: [
        {
          name: 'sections',
          type: 'array',
          items: { type: 'object', fields: [{ name: 'title', type: 'text' }] },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        repeat: { path: 'sections', as: 'section' },
        children: [{ id: 'title', type: 'text', text: 'Title' }],
      },
    });

    const fields = dataFieldsForNode(document, 'title');
    expect(fields.find((field) => field.name === 'section')).toMatchObject({
      type: 'object',
      items: { fields: [{ name: 'title' }] },
    });
  });
});
