/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InstanceOverridesControl } from '../src/ui/controls/instance/InstanceOverridesControl.js';

describe('instance override editor', () => {
  afterEach(() => cleanup());

  it('edits array overrides as structured JSON instead of a string', () => {
    const onSetField = vi.fn();
    const { container } = render(
      <InstanceOverridesControl
        masterName="Form"
        fields={[{ name: 'items', type: 'array', items: { type: 'object', fields: [] } }]}
        variants={[]}
        fieldOverrides={undefined}
        variantOverrides={undefined}
        onOpenMaster={() => undefined}
        onSetField={onSetField}
        onSetVariant={() => undefined}
      />,
    );

    const textarea = container.querySelector<HTMLTextAreaElement>('textarea[name="field-items"]');
    expect(textarea).not.toBeNull();
    fireEvent.change(textarea!, { target: { value: '[{"kind":"input"}]' } });
    fireEvent.blur(textarea!);

    expect(onSetField).toHaveBeenCalledWith('items', [{ kind: 'input' }]);
  });

  it('treats a bound field as read-only and clears its static override', async () => {
    const onSetField = vi.fn();
    const onSetFieldBindings = vi.fn();
    const { container } = render(
      <InstanceOverridesControl
        masterName="Form"
        fields={[{ name: 'label', type: 'text' }]}
        variants={[]}
        fieldOverrides={{ label: 'Static label' }}
        fieldBindings={{}}
        dataFields={[{ name: 'title', type: 'text' }]}
        variantOverrides={undefined}
        onOpenMaster={() => undefined}
        onSetField={onSetField}
        onSetFieldBindings={onSetFieldBindings}
        onSetVariant={() => undefined}
      />,
    );

    const select = container.querySelector<HTMLSelectElement>('select[name="field-binding-label"]');
    expect(select).not.toBeNull();
    const user = userEvent.setup();
    await user.selectOptions(select!, 'title');

    expect(onSetField).toHaveBeenCalledWith('label', null);
    expect(onSetFieldBindings).toHaveBeenCalledWith({ label: 'title' });
  });

  it('disables the static editor while a field is bound', () => {
    const { container } = render(
      <InstanceOverridesControl
        masterName="Form"
        fields={[{ name: 'label', type: 'text' }]}
        variants={[]}
        fieldOverrides={undefined}
        fieldBindings={{ label: 'title' }}
        dataFields={[{ name: 'title', type: 'text' }]}
        variantOverrides={undefined}
        onOpenMaster={() => undefined}
        onSetField={() => undefined}
        onSetFieldBindings={() => undefined}
        onSetVariant={() => undefined}
      />,
    );

    expect(container.querySelector('input[name="field-label"]')).toBeDisabled();
    expect(container.textContent).toContain('bound to title');
  });
});
