// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { DefinitionFieldSettings } from '../src/ui/sidebar/right/components/DefinitionFieldSettings';

afterEach(cleanup);

it('uses the referenced catalog choices for a static value instead of transformable input', () => {
  const configField = {
    field: {
      name: 'icon',
      type: 'text',
      schema: {
        type: 'string',
        enum: ['save', 'menu'],
        'x-facadeur-reference': { target: 'icon' },
      },
    },
    label: 'Icon preset ID',
    isStatic: true,
    value: 'menu',
    exposed: false,
    valueOptions: [{ type: 'text', label: 'Text' }],
  } satisfies Parameters<typeof DefinitionFieldSettings>[0]['configField'];

  render(<DefinitionFieldSettings configField={configField} onChange={() => undefined} />);

  const select = screen.getByRole('combobox');
  expect(select).toHaveValue('menu');
  expect(select).toHaveDisplayValue('menu');
  expect(screen.getByRole('option', { name: 'save' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'menu' })).toBeInTheDocument();
});
