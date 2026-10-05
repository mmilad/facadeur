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
    expect(output).toContain("eventName: 'change'");
    expect(output).toContain('event: reactEvent.nativeEvent');
    expect(output).toContain('native: reactEvent.nativeEvent.type');
    expect(output).toContain("'value': reactEvent.currentTarget.valueAsNumber");
    expect(output).toContain("'valid': reactEvent.currentTarget.checked");

    const explicit = generateReact({
      documents: [eventDocument({ value: 'number' }, 'valueAsNumber')],
    }).ui.find((file) => file.path === 'components/EventSource/component.tsx')?.contents;
    expect(explicit).toContain("'value': reactEvent.currentTarget.valueAsNumber");
  });

  it('rejects payload sources that do not match the declared type', () => {
    expect(() =>
      generateReact({ documents: [eventDocument({ value: 'number' }, 'checked')] }),
    ).toThrow(CodegenError);
    expect(() =>
      generateReact({ documents: [eventDocument({ value: 'number' }, 'checked')] }),
    ).toThrow(/incompatible/);
  });

  it('validates whole-value native mappings and constrained nested destinations', () => {
    const wholeValue: DocumentFile = {
      version: 1,
      id: 'whole-value',
      name: 'Whole value',
      kind: 'component',
      events: [{ name: 'input', data: { direct: { kind: 'type', type: 'string' } } }],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'button',
        eventBindings: [
          {
            event: 'input',
            name: 'keydown',
            data: [{ path: '', source: { kind: 'native', path: 'currentTarget.value' } }],
          },
        ],
      },
    };
    const output = generateReact({ documents: [wholeValue] }).ui;
    expect(
      output.find((file) => file.path === 'components/WholeValue/component.tsx')?.contents,
    ).toContain('onKeyDown');

    expect(() =>
      generateReact({
        documents: [
          {
            ...wholeValue,
            root: { ...wholeValue.root, tag: 'span' },
          },
        ],
      }),
    ).toThrow(/unsupported <span>/);

    const constrained: DocumentFile = {
      ...wholeValue,
      id: 'constrained-value',
      name: 'Constrained value',
      events: [{ name: 'input', data: { direct: { kind: 'schema', schemaId: 'choice' } } }],
      root: {
        ...wholeValue.root,
        eventBindings: [
          {
            event: 'input',
            name: 'input',
            data: [{ path: '', source: { kind: 'native', path: 'currentTarget.value' } }],
          },
        ],
      },
    };
    expect(() =>
      generateReact({
        documents: [constrained],
        schemaCatalog: {
          schemas: [{ id: 'choice', name: 'Choice', schema: { type: 'string', enum: ['a', 'b'] } }],
        },
      }),
    ).toThrow(/constrained data ".*whole value/);
  });

  it('allows nested mappings to satisfy required object fields', () => {
    const document: DocumentFile = {
      version: 1,
      id: 'nested-event-data',
      name: 'Nested event data',
      kind: 'component',
      events: [{ name: 'submit', data: { direct: { kind: 'schema', schemaId: 'form-data' } } }],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'input',
        eventBindings: [
          {
            event: 'submit',
            name: 'submit',
            data: [
              {
                path: 'profile.city',
                source: { kind: 'native', path: 'currentTarget.value' },
              },
            ],
          },
        ],
      },
    };
    expect(() =>
      generateReact({
        documents: [document],
        schemaCatalog: {
          schemas: [
            {
              id: 'form-data',
              name: 'Form data',
              schema: {
                type: 'object',
                properties: {
                  profile: {
                    type: 'object',
                    properties: { city: { type: 'string' } },
                    required: ['city'],
                  },
                },
                required: ['profile'],
              },
            },
          ],
        },
      }),
    ).not.toThrow();
  });
});
