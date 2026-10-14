// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchField } from '../src';

describe('SearchField', () => {
  it('keeps a local draft, syncs external values, and commits on blur', () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    const onBlur = vi.fn();
    const { rerender } = render(
      <SearchField
        id="search"
        value="initial"
        onChange={onChange}
        onCommit={onCommit}
        onBlur={onBlur}
      />,
    );
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'draft' } });
    expect(input).toHaveProperty('value', 'draft');
    expect(onChange).toHaveBeenCalledWith('draft');

    rerender(
      <SearchField
        id="search"
        value="external"
        onChange={onChange}
        onCommit={onCommit}
        onBlur={onBlur}
      />,
    );
    expect(input).toHaveProperty('value', 'external');

    fireEvent.change(input, { target: { value: 'committed' } });
    fireEvent.blur(input);
    expect(onBlur).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenCalledWith('committed');
  });
});
