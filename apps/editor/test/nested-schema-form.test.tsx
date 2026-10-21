// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import type { JsonSchema } from '@facadeur/core';
import { Form } from '../src/ui/controls/form-binding/Form';
import { PathPrefixProvider } from '../src/ui/controls/form-binding/FormContext';
import { SchemaForm } from '../src/ui/controls/data/schema/form/SchemaForm';
import { fieldConfigForSchema } from '../src/ui/schema/json-schema-form-config';

afterEach(cleanup);

it('edits object fields at the active Repeater row path without changing array shape', () => {
  const changes: unknown[] = [];
  const declarationsSchema: JsonSchema = {
    type: 'object',
    properties: { display: { type: 'string' }, padding: { type: 'string' } },
  };
  const fields = [fieldConfigForSchema(declarationsSchema, 'declarations', 'Declarations')];
  const value = {
    rules: [{ selector: '.is-open', declarations: { display: 'none', padding: '12px' } }],
  };

  render(
    <Form value={value} onChange={(next) => changes.push(next)}>
      <PathPrefixProvider prefix="rules.0">
        <SchemaForm fields={fields} />
      </PathPrefixProvider>
    </Form>,
  );

  fireEvent.change(screen.getByRole('textbox', { name: 'display' }), {
    target: { value: 'block' },
  });

  expect(changes.at(-1)).toEqual({
    rules: [{ selector: '.is-open', declarations: { display: 'block', padding: '12px' } }],
  });
});
