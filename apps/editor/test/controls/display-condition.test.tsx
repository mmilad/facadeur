// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DisplayConditionEditor } from '../../src/ui/controls/data/DisplayConditionEditor';
import { fieldPathOptions } from '../../src/ui/controls/data/field-paths';

afterEach(cleanup);
describe('render conditions', () => {
  it('offers enum choices and writes the selected typed equality', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <DisplayConditionEditor
        condition={{ path: 'kind', equals: 'input' }}
        paths={fieldPathOptions([{ name: 'kind', type: 'enum', options: ['input', 'checkbox'] }])}
        onChange={onChange}
      />,
    );
    await user.selectOptions(
      container.querySelector('select[name="display-condition-value"]')!,
      'checkbox',
    );
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ path: 'kind', equals: 'checkbox' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('allows removing a condition whose schema field was removed', async () => {
    const onChange = vi.fn();
    render(
      <DisplayConditionEditor
        condition={{ path: 'gone', truthy: true }}
        paths={[]}
        onChange={onChange}
      />,
    );
    expect(screen.getByText(/refers to a missing field/)).toBeVisible();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Remove condition' }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith(null);
  });
});
