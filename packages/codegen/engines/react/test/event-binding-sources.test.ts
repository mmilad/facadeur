import { describe, expect, it } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { CodegenError, generateReact } from '../src/index';

function eventDocument(
  payload: Record<string, 'number' | 'boolean' | 'text'>,
  source?: string,
): DocumentFile {
  return {
    version: 1,
    id: 'event-source',
    name: 'Event source',
    kind: 'component',
    events: [{ name: 'change', payload }],
    root: {
      id: 'root',
      type: 'frame',
      tag: 'input',
      eventBindings: [
        {
          event: 'change',
          name: 'change',
          ...(source
            ? { payload: { value: source as 'value' | 'checked' | 'valueAsNumber' } }
            : {}),
        },
      ],
    },
  };
}

describe('React event binding payload sources', () => {
  it('keeps type-based defaults and supports explicit value sources', () => {
    const output = generateReact({
      documents: [eventDocument({ value: 'number', valid: 'boolean' })],
    }).ui.find((file) => file.path === 'components/EventSource/component.tsx')?.contents;
    expect(output).toContain('value: Number(event.currentTarget.value)');
    expect(output).toContain('valid: event.currentTarget.checked');

    const explicit = generateReact({
      documents: [eventDocument({ value: 'number' }, 'valueAsNumber')],
    }).ui.find((file) => file.path === 'components/EventSource/component.tsx')?.contents;
    expect(explicit).toContain('value: event.currentTarget.valueAsNumber');
  });

  it('rejects payload sources that do not match the declared type', () => {
    expect(() =>
      generateReact({ documents: [eventDocument({ value: 'number' }, 'checked')] }),
    ).toThrow(CodegenError);
    expect(() =>
      generateReact({ documents: [eventDocument({ value: 'number' }, 'checked')] }),
    ).toThrow(/uses checked/);
  });
});
