/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VariantRule } from '@facadeur/core';
import { VariantRulesEditor } from '../../src/ui/sidebar/properties/content/VariantRulesEditor';

const fields = [{ name: 'kind', type: 'enum' as const, options: ['compact', 'wide'] }];
const presets = [{ name: 'compact' }, { name: 'wide' }];

function node(variantRules: VariantRule[] = []) {
  return { id: 'instance', type: 'instance' as const, component: 'button', variantRules };
}

describe('variant rules editor', () => {
  afterEach(() => cleanup());

  it('does not author variant rules for a component without named variants', () => {
    render(
      <VariantRulesEditor node={node()} fields={fields} presets={[]} onChange={() => undefined} />,
    );
    expect(screen.getByRole('button', { name: 'Add variant rule' })).toBeDisabled();
    expect(screen.getByText(/Create a named variant/)).toBeVisible();
  });

  it('adds a rule with the first condition and default variant', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onClearSelection = vi.fn();
    const { rerender } = render(
      <VariantRulesEditor
        node={{ ...node(), variants: { variant: 'wide' } }}
        fields={fields}
        presets={presets}
        variantLabels={{ default: 'Base', compact: 'Compact', wide: 'Wide' }}
        onChange={onChange}
        onClearSelection={onClearSelection}
      />,
    );

    expect(
      screen.getByText('Explicit selection takes priority; clear it to use rules.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Use variant rules' }));
    expect(onClearSelection).toHaveBeenCalledExactlyOnceWith();

    await user.click(screen.getByRole('button', { name: 'Add variant rule' }));

    rerender(
      <VariantRulesEditor
        node={node([{ when: { path: 'kind', truthy: true }, variant: 'default' }])}
        fields={fields}
        presets={presets}
        variantLabels={{ default: 'Base', compact: 'Compact', wide: 'Wide' }}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('option', { name: 'Base' })).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith([
      { when: { path: 'kind', truthy: true }, variant: 'default' },
    ]);
  });

  it('changes a rule target and condition, preserving ordered siblings', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const rules = [
      { when: { path: 'kind', equals: 'compact' as const }, variant: 'compact' },
      { when: { path: 'kind', equals: 'wide' as const }, variant: 'wide' },
    ];
    const { rerender } = render(
      <VariantRulesEditor
        node={node(rules)}
        fields={fields}
        presets={presets}
        onChange={onChange}
      />,
    );

    await user.selectOptions(
      document.querySelector('select[name="variant-rule-0-variant"]')!,
      'wide',
    );
    expect(onChange).toHaveBeenLastCalledWith([{ ...rules[0], variant: 'wide' }, rules[1]]);
    expect(onChange.mock.lastCall?.[0][0].variant).toBe('wide');

    rerender(
      <VariantRulesEditor
        node={node(rules)}
        fields={fields}
        presets={presets}
        onChange={onChange}
      />,
    );
    await user.click(document.querySelector('button[name="move-variant-rule-down-0"]')!);
    expect(onChange).toHaveBeenLastCalledWith([rules[1], rules[0]]);
  });

  it('removes the last rule with a sparse null write', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <VariantRulesEditor
        node={node([{ when: { path: 'kind', truthy: true }, variant: 'compact' }])}
        fields={fields}
        presets={presets}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Remove rule' }));

    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
