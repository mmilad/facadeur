import { ID_PATTERN, type Expose } from '@facadeur/core';
import { useState } from 'react';
import { Field, Section, Select, Stack, TextInput } from '../../form/index.js';
import '../../form/form.css';

const EXPOSE_PATH = /^[A-Za-z][A-Za-z0-9_-]*(\.[A-Za-z][A-Za-z0-9_-]*)*$/;
type ExposeKind = 'fields' | 'events';

export function ExposeEditorControl({
  expose,
  onChange,
  onInvalid,
}: {
  expose?: Expose;
  onChange: (value: Expose | null) => void;
  onInvalid?: (message: string) => void;
}) {
  const entries = [
    ...Object.entries(expose?.fields ?? {}).map(([name, path]) => ({
      kind: 'fields' as const,
      name,
      path,
    })),
    ...Object.entries(expose?.events ?? {}).map(([name, path]) => ({
      kind: 'events' as const,
      name,
      path,
    })),
  ];

  function updateEntry(kind: ExposeKind, oldName: string, name: string, path: string) {
    const nextName = name.trim();
    const nextPath = path.trim();
    if (!ID_PATTERN.test(nextName)) {
      onInvalid?.('Public names start with a letter and use letters, numbers, _ or -');
      return;
    }
    if (!EXPOSE_PATH.test(nextPath)) {
      onInvalid?.('Expose paths use dot notation, for example control.value');
      return;
    }
    if (
      entries.some(
        (entry) => entry.name === nextName && !(entry.kind === kind && entry.name === oldName),
      )
    ) {
      onInvalid?.(`Public name "${nextName}" is already used`);
      return;
    }
    const next = cloneExpose(expose);
    delete next[kind][oldName];
    next[kind][nextName] = nextPath;
    onChange(cleanExpose(next));
  }

  function removeEntry(kind: ExposeKind, name: string) {
    const next = cloneExpose(expose);
    delete next[kind][name];
    onChange(cleanExpose(next));
  }

  return (
    <Section title="Public contract" collapsible defaultOpen>
      <Stack gap={10}>
        {entries.length ? (
          entries.map((entry) => (
            <ExposeEntry
              key={`${entry.kind}-${entry.name}`}
              kind={entry.kind}
              name={entry.name}
              path={entry.path}
              onCommit={(name, path) => updateEntry(entry.kind, entry.name, name, path)}
              onRemove={() => removeEntry(entry.kind, entry.name)}
            />
          ))
        ) : (
          <p className="meta">Expose child fields or events as this component&apos;s public API.</p>
        )}
        <AddExposeEntry
          onAdd={(kind, name, path) => updateEntry(kind, '', name, path)}
          onInvalid={onInvalid}
        />
        {entries.length ? (
          <button
            type="button"
            className="text-button"
            name="clear-expose"
            onClick={() => onChange(null)}
          >
            Clear public contract
          </button>
        ) : null}
      </Stack>
    </Section>
  );
}

function ExposeEntry({
  kind,
  name,
  path,
  onCommit,
  onRemove,
}: {
  kind: ExposeKind;
  name: string;
  path: string;
  onCommit: (name: string, path: string) => void;
  onRemove: () => void;
}) {
  const [draftName, setDraftName] = useState(name);
  const [draftPath, setDraftPath] = useState(path);
  return (
    <Stack gap={6} className="binding-row">
      <Field label={kind === 'fields' ? 'Field name' : 'Event name'}>
        <TextInput
          name={`expose-${kind}-name-${name}`}
          value={draftName}
          onChange={setDraftName}
          onCommit={(next) => {
            setDraftName(next);
            onCommit(next, draftPath);
          }}
        />
      </Field>
      <Field label="Path">
        <TextInput
          name={`expose-${kind}-path-${name}`}
          value={draftPath}
          onChange={setDraftPath}
          onCommit={(next) => {
            setDraftPath(next);
            onCommit(draftName, next);
          }}
        />
      </Field>
      <button type="button" className="text-button" onClick={onRemove}>
        Remove mapping
      </button>
    </Stack>
  );
}

function AddExposeEntry({
  onAdd,
  onInvalid,
}: {
  onAdd: (kind: ExposeKind, name: string, path: string) => void;
  onInvalid?: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ExposeKind>('fields');
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  if (!open) {
    return (
      <button
        type="button"
        className="text-button"
        name="open-add-expose"
        onClick={() => setOpen(true)}
      >
        Add public mapping
      </button>
    );
  }
  return (
    <Section
      title="Add public mapping"
      action={
        <button type="button" className="text-button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      }
    >
      <Field label="Kind">
        <Select
          name="new-expose-kind"
          value={kind}
          options={[
            { value: 'fields', label: 'Field' },
            { value: 'events', label: 'Event' },
          ]}
          onCommit={(next) => setKind(next as ExposeKind)}
        />
      </Field>
      <Field label="Public name">
        <TextInput name="new-expose-name" value={name} onChange={setName} placeholder="value" />
      </Field>
      <Field label="Child path">
        <TextInput
          name="new-expose-path"
          value={path}
          onChange={setPath}
          placeholder="control.value"
        />
      </Field>
      <button
        type="button"
        className="text-button"
        name="add-expose"
        onClick={() => {
          if (!ID_PATTERN.test(name.trim())) {
            onInvalid?.('Public names start with a letter and use letters, numbers, _ or -');
            return;
          }
          if (!EXPOSE_PATH.test(path.trim())) {
            onInvalid?.('Expose paths use dot notation, for example control.value');
            return;
          }
          onAdd(kind, name, path);
          setName('');
          setPath('');
          setOpen(false);
        }}
      >
        Add mapping
      </button>
    </Section>
  );
}

function cloneExpose(expose?: Expose): {
  fields: Record<string, string>;
  events: Record<string, string>;
} {
  return {
    fields: { ...(expose?.fields ?? {}) },
    events: { ...(expose?.events ?? {}) },
  };
}

function cleanExpose(expose: {
  fields: Record<string, string>;
  events: Record<string, string>;
}): Expose | null {
  if (!Object.keys(expose.fields).length && !Object.keys(expose.events).length) return null;
  return {
    ...(Object.keys(expose.fields).length ? { fields: expose.fields } : {}),
    ...(Object.keys(expose.events).length ? { events: expose.events } : {}),
  };
}
