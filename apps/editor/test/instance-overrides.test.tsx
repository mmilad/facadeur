/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
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
});
