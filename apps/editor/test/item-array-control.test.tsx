// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import type { FieldValue, JsonSchema } from '@facadeur/core';
import { ItemArrayControl } from '../src/ui/controls/data/ItemArrayControl';
import { SchemaValueForm } from '../src/ui/controls/data/SchemaValueForm';
import type { ItemChoice } from '../src/ui/controls/data/item-array-schema';

afterEach(cleanup);

const cardSchema: JsonSchema = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['card'] },
    title: { type: 'string' },
    active: { type: 'boolean' },
  },
  required: ['kind', 'title', 'active'],
};
const bannerSchema: JsonSchema = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['banner'] },
    text: { type: 'string' },
  },
  required: ['kind', 'text'],
};
const choices = [
  { id: 'card', label: 'Card', schema: cardSchema },
  { id: 'banner', label: 'Banner', schema: bannerSchema },
];
const typedChoices: ItemChoice[] = [
  caseChoice('card', 'Card', 'title'),
  caseChoice('textarea', 'Textarea', 'title'),
];

it('adds the only available alternative directly and displays a schema-driven nested form', () => {
  const onCommit = vi.fn();
  render(<ItemArrayControl label="Items" value={[]} choices={[choices[0]!]} onCommit={onCommit} />);

  fireEvent.click(screen.getByRole('button', { name: 'Add item' }));

  expect(onCommit).toHaveBeenCalledWith([{ kind: 'card', title: '', active: false }]);
  expect(screen.getByRole('group', { name: 'Card item 1' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Title' })).toBeInTheDocument();
  expect(screen.getByRole('switch', { name: 'Active' })).toBeInTheDocument();
});

it('offers all alternatives, then commits nested edits and removal', () => {
  const value: FieldValue[] = [{ kind: 'card', title: 'Intro', active: false }];
  const onCommit = vi.fn();
  render(<ItemArrayControl label="Items" value={value} choices={choices} onCommit={onCommit} />);

  fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Banner' }));
  expect(onCommit).toHaveBeenLastCalledWith([...value, { kind: 'banner', text: '' }]);
  expect(screen.getByRole('group', { name: 'Banner item 2' })).toBeInTheDocument();

  fireEvent.change(screen.getByRole('textbox', { name: 'Text' }), { target: { value: 'Welcome' } });
  expect(onCommit).toHaveBeenLastCalledWith([value[0], { kind: 'banner', text: 'Welcome' }]);

  fireEvent.click(screen.getByRole('button', { name: 'Remove item 1' }));
  expect(onCommit).toHaveBeenLastCalledWith([{ kind: 'banner', text: 'Welcome' }]);
  expect(screen.queryByRole('group', { name: 'Card item 1' })).not.toBeInTheDocument();
  expect(
    within(screen.getByRole('group', { name: 'Banner item 1' })).getByRole('textbox', {
      name: 'Text',
    }),
  ).toHaveValue('Welcome');
});

it('keeps edits local and surfaces validation errors when a value no longer matches an alternative', () => {
  const onCommit = vi.fn();
  render(
    <ItemArrayControl
      label="Items"
      value={[{ kind: 'card', title: 'Intro', active: false }]}
      choices={[choices[0]!]}
      onCommit={onCommit}
    />,
  );

  fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
    target: { value: 'Changed' },
  });
  expect(onCommit).toHaveBeenCalledWith([{ kind: 'card', title: 'Changed', active: false }]);

  fireEvent.click(screen.getByRole('switch', { name: 'Active' }));
  expect(onCommit).toHaveBeenLastCalledWith([{ kind: 'card', title: 'Changed', active: true }]);
});

it('adds constrained required fields as editable drafts and keeps the chosen schema while invalid', () => {
  const constrained: ItemChoice = {
    id: 'promo',
    label: 'Promo',
    schema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['promo'] },
        code: { type: 'string', minLength: 2, pattern: '^ok' },
      },
      required: ['kind', 'code'],
    },
  };
  const onCommit = vi.fn();
  render(<ItemArrayControl label="Items" value={[]} choices={[constrained]} onCommit={onCommit} />);

  fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
  expect(onCommit).not.toHaveBeenCalled();
  expect(screen.getByRole('textbox', { name: 'Code' })).toHaveValue('aa');
  expect(screen.getByRole('alert')).toHaveTextContent(/does not match/i);

  fireEvent.change(screen.getByRole('textbox', { name: 'Code' }), { target: { value: 'no' } });
  expect(onCommit).not.toHaveBeenCalled();
  expect(screen.getByRole('textbox', { name: 'Code' })).toHaveValue('no');

  fireEvent.change(screen.getByRole('textbox', { name: 'Code' }), { target: { value: 'okay' } });
  expect(onCommit).toHaveBeenCalledWith([{ kind: 'promo', code: 'okay' }]);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

function caseChoice(caseValue: string, label: string, field: string): ItemChoice {
  const payloadSchema: JsonSchema = {
    type: 'object',
    properties: { [field]: { type: 'string' } },
    additionalProperties: true,
  };
  return {
    id: caseValue,
    label,
    caseValue,
    payloadSchema,
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', const: caseValue },
        props: payloadSchema,
      },
      required: ['type', 'props'],
      additionalProperties: false,
    },
  };
}

it('creates typed envelopes, lets the Type selector reset payload safely, and keeps legacy reads quiet', () => {
  const onCommit = vi.fn();
  const { rerender } = render(
    <ItemArrayControl label="Items" value={[]} choices={typedChoices} onCommit={onCommit} />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Card' }));
  expect(onCommit).toHaveBeenLastCalledWith([{ type: 'card', props: { title: '' } }]);
  fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
    target: { value: 'Hello' },
  });
  expect(onCommit).toHaveBeenLastCalledWith([{ type: 'card', props: { title: 'Hello' } }]);
  fireEvent.change(screen.getByRole('combobox', { name: 'Type' }), {
    target: { value: 'textarea' },
  });
  expect(onCommit).toHaveBeenLastCalledWith([{ type: 'textarea', props: { title: 'Hello' } }]);

  onCommit.mockClear();
  rerender(
    <ItemArrayControl
      label="Items"
      value={[{ title: 'Legacy' }]}
      choices={typedChoices}
      onCommit={onCommit}
    />,
  );
  expect(onCommit).not.toHaveBeenCalled();
  expect(screen.getByRole('combobox', { name: 'Type' })).toHaveValue('card');
  fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
    target: { value: 'Migrated by edit' },
  });
  expect(onCommit).toHaveBeenCalledWith([{ type: 'card', props: { title: 'Migrated by edit' } }]);
});

it('keeps an unknown explicit case intact until the user chooses a repair type', () => {
  const onCommit = vi.fn();
  render(
    <ItemArrayControl
      label="Items"
      value={[{ type: 'removed-case', props: { title: 'Keep me' } }]}
      choices={typedChoices}
      onCommit={onCommit}
    />,
  );
  expect(screen.getByRole('combobox', { name: 'Type' })).toHaveValue('removed-case');
  expect(screen.getByText(/Unknown case/)).toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Title' })).not.toBeInTheDocument();
  expect(onCommit).not.toHaveBeenCalled();

  fireEvent.change(screen.getByRole('combobox', { name: 'Type' }), {
    target: { value: 'textarea' },
  });
  expect(onCommit).toHaveBeenCalledWith([{ type: 'textarea', props: { title: 'Keep me' } }]);
});

it('keeps an optional Input contract distinct from an earlier optional Card contract', () => {
  const optionalChoices: ItemChoice[] = [
    {
      id: 'card',
      label: 'Card',
      schema: {
        type: 'object',
        properties: { title: { type: 'string' }, body: { type: 'string' } },
        additionalProperties: true,
      },
    },
    {
      id: 'input',
      label: 'Input',
      schema: {
        type: 'object',
        properties: { label: { type: 'string' }, placeholder: { type: 'string' } },
        additionalProperties: true,
      },
    },
  ];
  const onCommit = vi.fn();
  const { rerender } = render(
    <ItemArrayControl label="Items" value={[]} choices={optionalChoices} onCommit={onCommit} />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Input' }));
  expect(onCommit).toHaveBeenLastCalledWith([{ label: '', placeholder: '' }]);
  expect(screen.getByRole('group', { name: 'Input item 1' })).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Label' }), { target: { value: 'Email' } });
  expect(onCommit).toHaveBeenLastCalledWith([{ label: 'Email', placeholder: '' }]);
  rerender(
    <ItemArrayControl
      label="Items"
      value={[{ label: 'Email', placeholder: '' }]}
      choices={optionalChoices}
      onCommit={onCommit}
    />,
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'Label' }), { target: { value: '' } });
  expect(screen.getByRole('group', { name: 'Input item 1' })).toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Title' })).not.toBeInTheDocument();
});

it('retains an existing alternative form while a required field is cleared and corrected', () => {
  const onCommit = vi.fn();
  const constrainedChoices = [
    choices[0]!,
    {
      ...choices[1]!,
      schema: {
        ...bannerSchema,
        properties: { ...bannerSchema.properties, text: { type: 'string' as const, minLength: 1 } },
      },
    },
  ];
  render(
    <ItemArrayControl
      label="Items"
      value={[{ kind: 'banner', text: 'Welcome' }]}
      choices={constrainedChoices}
      onCommit={onCommit}
    />,
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'Text' }), { target: { value: '' } });
  expect(onCommit).not.toHaveBeenCalled();
  expect(screen.getByRole('group', { name: 'Banner item 1' })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Text' }), { target: { value: 'Fixed' } });
  expect(onCommit).toHaveBeenLastCalledWith([{ kind: 'banner', text: 'Fixed' }]);
});

it('creates optional nested arrays on first insertion and edits their entries', () => {
  const schema: JsonSchema = {
    type: 'object',
    properties: { tags: { type: 'array', items: { type: 'string' } } },
  };
  function ControlledItems() {
    const [value, setValue] = useState<FieldValue[]>([{}]);
    return (
      <ItemArrayControl
        label="Items"
        value={value}
        choices={[{ id: 'tagged', label: 'Tagged', schema }]}
        onCommit={setValue}
      />
    );
  }
  render(<ControlledItems />);
  fireEvent.click(screen.getByRole('button', { name: 'Add Tags item' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Item' }), { target: { value: 'News' } });
  expect(screen.getByRole('textbox', { name: 'Item' })).toHaveValue('News');
});

it('offers and edits each typed case in a nested schema array', () => {
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
