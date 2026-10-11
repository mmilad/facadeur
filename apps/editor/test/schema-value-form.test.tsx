// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it } from 'vitest';
import type { FieldValue, JsonSchema } from '@facadeur/core';
import { SchemaValueForm } from '../src/ui/controls/data/schema/SchemaValueForm';

afterEach(cleanup);

it('edits typed cases inside a nested structural schema array', () => {
  const schema: JsonSchema = {
    type: 'object',
    properties: {
      entries: {
        type: 'array',
        items: {
          anyOf: [
            {
              type: 'object',
              properties: {
                type: { type: 'string', const: 'card' },
                props: {
                  type: 'object',
                  properties: { title: { type: 'string' } },
                  additionalProperties: true,
                },
              },
              required: ['type', 'props'],
              additionalProperties: false,
            },
            {
              type: 'object',
              properties: {
                type: { type: 'string', const: 'textarea' },
                props: {
                  type: 'object',
                  properties: { title: { type: 'string' } },
                  additionalProperties: true,
                },
              },
              required: ['type', 'props'],
              additionalProperties: false,
            },
          ],
        },
      },
    },
  };
  const changes: FieldValue[] = [];
  function ControlledForm() {
    const [value, setValue] = useState<FieldValue | undefined>(undefined);
    return (
      <SchemaValueForm
        schema={schema}
        value={value}
        label="Settings"
        onChange={(next) => {
          changes.push(next);
          setValue(next);
        }}
      />
    );
  }

  render(<ControlledForm />);
  fireEvent.click(screen.getByRole('button', { name: 'Add entries item' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'textarea' }));
  expect(changes.at(-1)).toEqual({ entries: [{ type: 'textarea', props: { title: '' } }] });
  expect(screen.getByRole('textbox', { name: 'title' })).toBeInTheDocument();

  fireEvent.change(screen.getByRole('combobox', { name: 'Type' }), {
    target: { value: 'card' },
  });
  expect(changes.at(-1)).toEqual({ entries: [{ type: 'card', props: { title: '' } }] });
  expect(screen.getByRole('combobox', { name: 'Type' })).toHaveValue('card');
  expect(screen.getByRole('textbox', { name: 'title' })).toBeInTheDocument();
});
