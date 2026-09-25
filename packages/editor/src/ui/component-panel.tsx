import { useState } from 'react';
import {
  bindingTargets,
  type Binding,
  type BindingTarget,
  type FieldDefinition,
  type FieldType,
  type FlatNode,
  type VariantAxis,
} from '@facadeur/core';
import {
  creatableFieldTypes,
  fieldDefinitionFromDraft,
  replaceFieldDefault,
  replaceFieldOptions,
  retargetField,
  variantAxisFromDraft,
} from '../definitions.js';
import type { EditorSession, EditorSnapshot } from '../session.js';
import {
  readStyleDeclarations,
  styleStateNames,
  writeStyleDeclaration,
  type StyleEditTarget,
} from '../style-edit.js';
import { TextControl } from './fields.js';

const TARGET_LABEL: Record<BindingTarget, string> = {
  text: 'Text',
  attribute: 'Attribute',
  style: 'Style',
  visible: 'Visibility',
  src: 'Image source',
  alt: 'Alt text',
};

export function ownsComponentFeatures(kind: string): boolean {
  return kind === 'atom' || kind === 'component';
}

export function ComponentFields({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  if (!ownsComponentFeatures(snap.document.kind)) return null;
  return <FieldDefinitions session={session} snap={snap} />;
}

export function ComponentVariants({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  if (!ownsComponentFeatures(snap.document.kind)) return null;
  return (
    <div className="stack">
      <VariantDefinitions session={session} snap={snap} />
      <p className="meta">States live on the style block, above node style overrides.</p>
      {styleStateNames.map((state) => (
        <details key={state} className="fold">
          <summary>{state}</summary>
          <DeclarationEditor
            session={session}
            snap={snap}
            target={{ nodeId: snap.document.rootId, state }}
          />
        </details>
      ))}
    </div>
  );
}

export function NodeBindings({
  session,
  snap,
  node,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  node: Exclude<FlatNode, { type: 'instance' }>;
}) {
  if (!ownsComponentFeatures(snap.document.kind)) return null;
  return <BindingEditor session={session} node={node} fields={snap.document.fields} />;
}

export function NodeVariantStyles({
  session,
  snap,
  nodeId,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  nodeId: string;
}) {
  if (!ownsComponentFeatures(snap.document.kind) || !snap.document.variants.length) return null;
  return (
    <div className="stack">
      <h3>Variant styles</h3>
      <p className="meta">These override this layer for one variant value.</p>
      {snap.document.variants.map((axis) => (
        <VariantStyleGroup
          key={axis.name}
          session={session}
          snap={snap}
          axis={axis}
          nodeId={nodeId}
        />
      ))}
    </div>
  );
}

function FieldDefinitions({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  return (
    <div className="stack">
      <h3>Fields</h3>
      {snap.document.fields.length === 0 ? (
        <p className="meta">No fields yet. Instances will override the values you define here.</p>
      ) : null}
      {snap.document.fields.map((field) => (
        <FieldCard key={field.name} session={session} field={field} />
      ))}
      <AddField session={session} />
    </div>
  );
}

function FieldCard({ session, field }: { session: EditorSession; field: FieldDefinition }) {
  const types: FieldType[] = creatableFieldTypes.includes(
    field.type as (typeof creatableFieldTypes)[number],
  )
    ? [...creatableFieldTypes]
    : [field.type, ...creatableFieldTypes];
  return (
    <fieldset className="font-card">
      <legend>{field.name}</legend>
      <label className="field">
        <span>Type</span>
        <select
          name={`field-type-${field.name}`}
          value={field.type}
          onChange={(event) => {
            try {
              session.execute({
                type: 'defineField',
                field: retargetField(field, event.target.value as FieldType),
              });
            } catch (error) {
              session.setNotice(error instanceof Error ? error.message : 'Invalid field', 'error');
            }
          }}
        >
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      {field.type === 'enum' ? (
        <TextControl
          label="Options"
          name={`field-options-${field.name}`}
          value={(field.options ?? []).join(', ')}
          onCommit={(text) => {
            try {
              session.execute({ type: 'defineField', field: replaceFieldOptions(field, text) });
            } catch (error) {
              session.setNotice(error instanceof Error ? error.message : 'Invalid field', 'error');
            }
          }}
        />
      ) : null}
      <FieldDefault session={session} field={field} />
      <button
        type="button"
        className="text-button"
        name={`remove-field-${field.name}`}
        onClick={() => session.execute({ type: 'removeField', name: field.name })}
      >
        Remove field
      </button>
    </fieldset>
  );
}

function FieldDefault({ session, field }: { session: EditorSession; field: FieldDefinition }) {
  if (field.type === 'boolean') {
    return (
      <label className="field field-check">
        <span>Default</span>
        <input
          type="checkbox"
          name={`default-${field.name}`}
          checked={field.default === true}
          onChange={(event) =>
            session.execute({
              type: 'defineField',
              field: { ...field, default: event.target.checked },
            })
          }
        />
      </label>
    );
  }
  if (field.type === 'enum') {
    return (
      <label className="field">
        <span>Default</span>
        <select
          name={`default-${field.name}`}
          value={typeof field.default === 'string' ? field.default : ''}
          onChange={(event) => {
            const next = { ...field, ...(field.options ? { options: [...field.options] } : {}) };
            if (event.target.value) next.default = event.target.value;
            else delete next.default;
            session.execute({ type: 'defineField', field: next });
          }}
        >
          <option value="">None</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <TextControl
      label="Default"
      name={`default-${field.name}`}
      value={field.default === undefined ? '' : String(field.default)}
      onCommit={(raw) => {
        try {
          session.execute({ type: 'defineField', field: replaceFieldDefault(field, raw) });
        } catch (error) {
          session.setNotice(error instanceof Error ? error.message : 'Invalid field', 'error');
        }
      }}
    />
  );
}

function AddField({ session }: { session: EditorSession }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<FieldType>('text');
  const [rawDefault, setRawDefault] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [booleanDefault, setBooleanDefault] = useState(false);
  return (
    <div className="stack">
      <h3>Add field</h3>
      <label className="field">
        <span>Name</span>
        <input
          name="new-field-name"
          value={name}
          placeholder="label"
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="field">
        <span>Type</span>
        <select
          name="new-field-type"
          value={type}
          onChange={(event) => setType(event.target.value as FieldType)}
        >
          {creatableFieldTypes.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      {type === 'enum' ? (
        <label className="field">
          <span>Options</span>
          <input
            name="new-field-options"
            value={optionsText}
            placeholder="sm, md, lg"
            onChange={(event) => setOptionsText(event.target.value)}
          />
        </label>
      ) : null}
      {type === 'boolean' ? (
        <label className="field field-check">
          <span>Default</span>
          <input
            type="checkbox"
            name="new-field-default"
            checked={booleanDefault}
            onChange={(event) => setBooleanDefault(event.target.checked)}
          />
        </label>
      ) : (
        <label className="field">
          <span>Default</span>
          <input
            name="new-field-default"
            value={rawDefault}
            onChange={(event) => setRawDefault(event.target.value)}
          />
        </label>
      )}
      <button
        type="button"
        className="text-button"
        name="add-field"
        onClick={() => {
          try {
            session.execute({
              type: 'defineField',
              field: fieldDefinitionFromDraft({
                name,
                type,
                rawDefault,
                optionsText,
                booleanDefault,
              }),
            });
            if (session.getSnapshot().notice?.tone === 'error') return;
            setName('');
            setRawDefault('');
            setOptionsText('');
            setBooleanDefault(false);
          } catch (error) {
            session.setNotice(error instanceof Error ? error.message : 'Invalid field', 'error');
          }
        }}
      >
        Add field
      </button>
    </div>
  );
}

function VariantDefinitions({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  return (
    <div className="stack">
      <h3>Variants</h3>
      <p className="meta">Each value can override the style block, including states.</p>
      {snap.document.variants.map((axis) => (
        <fieldset key={axis.name} className="font-card">
          <legend>{axis.name}</legend>
          <TextControl
            label="Values"
            name={`axis-values-${axis.name}`}
            value={axis.values.join(', ')}
            onCommit={(text) => {
              try {
                const fallback =
                  axis.default && text.split(',').some((part) => part.trim() === axis.default)
                    ? axis.default
                    : undefined;
                session.execute({
                  type: 'defineVariant',
                  axis: variantAxisFromDraft({ name: axis.name, valuesText: text, fallback }),
                });
              } catch (error) {
                session.setNotice(
                  error instanceof Error ? error.message : 'Invalid variant',
                  'error',
                );
              }
            }}
          />
          <label className="field">
            <span>Default</span>
            <select
              name={`axis-default-${axis.name}`}
              value={axis.default ?? ''}
              onChange={(event) => {
                const axisNext: VariantAxis = {
                  name: axis.name,
                  values: [...axis.values],
                  ...(event.target.value ? { default: event.target.value } : {}),
                };
                session.execute({ type: 'defineVariant', axis: axisNext });
              }}
            >
              <option value="">First value</option>
              {axis.values.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <VariantStyleGroup
            session={session}
            snap={snap}
            axis={axis}
            nodeId={snap.document.rootId}
          />
          <button
            type="button"
            className="text-button"
            name={`remove-axis-${axis.name}`}
            onClick={() => session.execute({ type: 'removeVariant', name: axis.name })}
          >
            Remove axis
          </button>
        </fieldset>
      ))}
      <AddAxis session={session} />
    </div>
  );
}

function VariantStyleGroup({
  session,
  snap,
  axis,
  nodeId,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  axis: VariantAxis;
  nodeId: string;
}) {
  return (
    <div className="stack">
      {axis.values.map((value) => (
        <details key={value} className="fold" open>
          <summary>
            {axis.name} = {value}
          </summary>
          <DeclarationEditor
            session={session}
            snap={snap}
            target={{ nodeId, axis: axis.name, value }}
          />
          {styleStateNames.map((state) => (
            <details key={state} className="fold">
              <summary>{state}</summary>
              <DeclarationEditor
                session={session}
                snap={snap}
                target={{ nodeId, axis: axis.name, value, state }}
              />
            </details>
          ))}
        </details>
      ))}
    </div>
  );
}

function AddAxis({ session }: { session: EditorSession }) {
  const [name, setName] = useState('');
  const [valuesText, setValuesText] = useState('');
  return (
    <div className="stack">
      <h3>Add variant axis</h3>
      <label className="field">
        <span>Name</span>
        <input
          name="new-axis-name"
          value={name}
          placeholder="size"
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="field">
        <span>Values</span>
        <input
          name="new-axis-values"
          value={valuesText}
          placeholder="sm, md, lg"
          onChange={(event) => setValuesText(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="text-button"
        name="add-axis"
        onClick={() => {
          try {
            session.execute({
              type: 'defineVariant',
              axis: variantAxisFromDraft({ name, valuesText }),
            });
            if (session.getSnapshot().notice?.tone === 'error') return;
            setName('');
            setValuesText('');
          } catch (error) {
            session.setNotice(error instanceof Error ? error.message : 'Invalid variant', 'error');
          }
        }}
      >
        Add axis
      </button>
    </div>
  );
}

function DeclarationEditor({
  session,
  snap,
  target,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  target: StyleEditTarget;
}) {
  const [property, setProperty] = useState('');
  const [value, setValue] = useState('');
  const entries = readStyleDeclarations(snap.document.styles, snap.document.rootId, target);
  const listed = Object.entries(entries);
  return (
    <div className="stack">
      {listed.length === 0 ? <p className="meta">No declarations.</p> : null}
      {listed.map(([key, current]) => (
        <TextControl
          key={key}
          label={key}
          name={declarationName(target, key)}
          value={current}
          onCommit={(next) =>
            commitDeclaration(session, snap, target, key, next.trim() ? next : null)
          }
        />
      ))}
      <label className="field">
        <span>Add property</span>
        <span className="pair">
          <input
            name={declarationName(target, 'property')}
            value={property}
            placeholder="property"
            onChange={(event) => setProperty(event.target.value)}
          />
          <input
            name={declarationName(target, 'value')}
            value={value}
            placeholder="value"
            onChange={(event) => setValue(event.target.value)}
          />
        </span>
      </label>
      <button
        type="button"
        className="text-button"
        onClick={() => {
          const name = property.trim();
          if (!name || !value.trim()) return;
          commitDeclaration(session, snap, target, name, value.trim());
          if (session.getSnapshot().notice?.tone === 'error') return;
          setProperty('');
          setValue('');
        }}
      >
        Add style
      </button>
    </div>
  );
}

function BindingEditor({
  session,
  node,
  fields,
}: {
  session: EditorSession;
  node: Exclude<FlatNode, { type: 'instance' }>;
  fields: FieldDefinition[];
}) {
  const bindings = node.bindings ?? [];
  return (
    <div className="stack">
      <h3>Bindings</h3>
      {fields.length === 0 ? (
        <p className="meta">Define a field on this component before binding it.</p>
      ) : null}
      {bindings.map((binding, index) => (
        <BindingRow
          key={`${binding.field}-${binding.target}-${binding.name ?? ''}-${index}`}
          session={session}
          node={node}
          fields={fields}
          binding={binding}
          index={index}
        />
      ))}
      <button
        type="button"
        className="text-button"
        name="add-binding"
        disabled={fields.length === 0}
        onClick={() => {
          const field = fields[0];
          if (!field) return;
          writeBindings(session, node, [...bindings, { field: field.name, target: 'text' }]);
        }}
      >
        Add binding
      </button>
    </div>
  );
}

function BindingRow({
  session,
  node,
  fields,
  binding,
  index,
}: {
  session: EditorSession;
  node: Exclude<FlatNode, { type: 'instance' }>;
  fields: FieldDefinition[];
  binding: Binding;
  index: number;
}) {
  const needsName = binding.target === 'attribute' || binding.target === 'style';
  const options = fields.some((field) => field.name === binding.field)
    ? fields
    : [{ name: binding.field, type: 'text' as const }, ...fields];
  function commit(next: Binding | null) {
    const list = [...(node.bindings ?? [])];
    if (next === null) list.splice(index, 1);
    else list[index] = next;
    writeBindings(session, node, list);
  }
  return (
    <div className="stack binding-row">
      <label className="field">
        <span>Field</span>
        <select
          name={`binding-field-${index}`}
          value={binding.field}
          onChange={(event) => commit({ ...binding, field: event.target.value })}
        >
          {options.map((field) => (
            <option key={field.name} value={field.name}>
              {field.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Target</span>
        <select
          name={`binding-target-${index}`}
          value={binding.target}
          onChange={(event) => {
            const target = event.target.value as BindingTarget;
            const name =
              target === 'attribute' || target === 'style' ? (binding.name ?? 'name') : undefined;
            commit({ field: binding.field, target, ...(name ? { name } : {}) });
          }}
        >
          {bindingTargets.map((target) => (
            <option key={target} value={target}>
              {TARGET_LABEL[target]}
            </option>
          ))}
        </select>
      </label>
      {needsName ? (
        <TextControl
          label={binding.target === 'attribute' ? 'Attribute' : 'Property'}
          name={`binding-name-${index}`}
          value={binding.name ?? ''}
          onCommit={(raw) => {
            const name = raw.trim();
            if (!name) {
              session.setNotice(`A ${binding.target} binding needs a name`, 'error');
              return;
            }
            commit({ field: binding.field, target: binding.target, name });
          }}
        />
      ) : null}
      <button type="button" className="text-button" onClick={() => commit(null)}>
        Remove binding
      </button>
    </div>
  );
}

function writeBindings(
  session: EditorSession,
  node: Exclude<FlatNode, { type: 'instance' }>,
  bindings: Binding[],
) {
  session.execute({
    type: 'setProp',
    nodeId: node.id,
    prop: 'bindings',
    value: bindings.length ? bindings : null,
  });
}

function commitDeclaration(
  session: EditorSession,
  snap: EditorSnapshot,
  target: StyleEditTarget,
  property: string,
  value: string | null,
) {
  const style = writeStyleDeclaration(
    snap.document.styles,
    snap.document.rootId,
    target,
    property,
    value,
  );
  session.execute({ type: 'setStyleBlock', style });
}

function declarationName(target: StyleEditTarget, property: string): string {
  const state = target.state ?? 'base';
  const axis = target.axis ? `${target.axis}-${target.value}` : 'base';
  return `style-${target.nodeId}-${axis}-${state}-${property}`;
}
