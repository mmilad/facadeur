import { useMemo, useState } from 'react';
import {
  defaultKinds,
  defaultNestingRules,
  readTokenTree,
  type DefaultKind,
  type FieldDefinition,
  type FieldValue,
  type FlatNode,
  type FontFamily,
} from '@facadeur/core';
import { documentToJson, saveJsonFile } from '../files.js';
import type { EditorSession, EditorSnapshot } from '../session.js';
import { formatTokenValue, parseEditedValue, withTokenValue } from '../token-edit.js';
import { TextControl } from './fields.js';

const WORKSPACE_LABEL: Record<DefaultKind, string> = {
  atom: 'Atoms',
  component: 'Components',
  section: 'Sections',
  page: 'Pages',
};

export function WorkspaceTabs({
  session,
  workspace,
}: {
  session: EditorSession;
  workspace: DefaultKind;
}) {
  return (
    <nav className="workspaces" aria-label="Workspaces">
      {defaultKinds.map((kind) => (
        <button
          key={kind}
          type="button"
          className={kind === workspace ? 'workspace is-active' : 'workspace'}
          aria-pressed={kind === workspace}
          onClick={() => session.setWorkspace(kind)}
        >
          {WORKSPACE_LABEL[kind]}
        </button>
      ))}
    </nav>
  );
}

export function AssetList({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  const rule = defaultNestingRules[snap.workspace];
  const instances = rule.instanceKinds.length
    ? `Instances of ${rule.instanceKinds.join(' and ')}.`
    : 'No instances.';
  return (
    <section className="side-block" aria-label="Assets">
      <h2>Assets</h2>
      <p className="side-note">
        {rule.nodeTypes.join(', ')}. {instances}
      </p>
      <div className="side-scroll">
        {snap.assets.length === 0 ? (
          <p className="inspector-empty">No {WORKSPACE_LABEL[snap.workspace].toLowerCase()} yet.</p>
        ) : (
          <ul className="asset-list">
            {snap.assets.map((asset) => (
              <li key={asset.id}>
                <button
                  type="button"
                  className={asset.id === snap.openId ? 'asset is-active' : 'asset'}
                  aria-current={asset.id === snap.openId ? 'true' : undefined}
                  onClick={() => session.openAsset(asset.id)}
                >
                  <span className="asset-name">{asset.name}</span>
                  <span className="asset-id">{asset.id}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function LayersPanel({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  return (
    <section className="side-block side-block-grow" aria-label="Layers">
      <h2>Layers</h2>
      <div className="side-scroll">
        {snap.layers ? (
          <LayerRows
            item={snap.layers}
            depth={0}
            selectedId={snap.selectedNodeId}
            onSelect={(id) => session.selectNode(id)}
          />
        ) : (
          <p className="inspector-empty">This document has no nodes.</p>
        )}
      </div>
    </section>
  );
}

function LayerRows({
  item,
  depth,
  selectedId,
  onSelect,
}: {
  item: NonNullable<EditorSnapshot['layers']>;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <button
        type="button"
        className={item.id === selectedId ? 'layer is-active' : 'layer'}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => onSelect(item.id)}
      >
        <span className="layer-type">{item.type}</span>
        <span className="layer-name">{item.name}</span>
      </button>
      {item.children.map((child) => (
        <LayerRows
          key={child.id}
          item={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

export function Inspector({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  const [tab, setTab] = useState<'properties' | 'tokens' | 'fonts'>('properties');
  return (
    <section className="side-block side-block-grow inspector" aria-label="Inspector">
      <div className="tabs" role="tablist">
        {(
          [
            ['properties', 'Properties'],
            ['tokens', 'Tokens'],
            ['fonts', 'Fonts'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={tab === id ? 'tab is-active' : 'tab'}
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="side-scroll">
        {tab === 'properties' ? <Properties session={session} snap={snap} /> : null}
        {tab === 'tokens' ? <TokensPanel session={session} snap={snap} /> : null}
        {tab === 'fonts' ? <FontsPanel session={session} snap={snap} /> : null}
      </div>
    </section>
  );
}

function Properties({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  const node = snap.selectedNode;
  if (!node) {
    return <p className="inspector-empty">Select a layer or an element on the stage.</p>;
  }
  return (
    <div className="properties">
      <p className="inspector-id">{node.id}</p>
      <dl className="kv">
        <dt>Type</dt>
        <dd>{node.type}</dd>
        <dt>Document</dt>
        <dd>{snap.document.name}</dd>
      </dl>
      <TextControl
        label="Name"
        name="name"
        value={node.name ?? ''}
        onCommit={(value) =>
          session.execute({
            type: 'setProp',
            nodeId: node.id,
            prop: 'name',
            value: value.trim() ? value.trim() : null,
          })
        }
      />
      {node.type !== 'instance' ? (
        <TextControl
          label="Tag"
          name="tag"
          value={node.tag ?? ''}
          onCommit={(value) =>
            session.execute({
              type: 'setProp',
              nodeId: node.id,
              prop: 'tag',
              value: value.trim() ? value.trim() : null,
            })
          }
        />
      ) : (
        <p className="meta">Component · {node.component}</p>
      )}
      {node.type === 'text' ? (
        <TextControl
          label="Text"
          name="text"
          value={node.text ?? ''}
          multiline
          onCommit={(value) =>
            session.execute({ type: 'setProp', nodeId: node.id, prop: 'text', value })
          }
        />
      ) : null}
      {node.type === 'image' ? (
        <>
          <TextControl
            label="Source"
            name="src"
            value={node.src ?? ''}
            onCommit={(value) =>
              session.execute({
                type: 'setProp',
                nodeId: node.id,
                prop: 'src',
                value: value.trim() ? value : null,
              })
            }
          />
          <TextControl
            label="Alt"
            name="alt"
            value={node.alt ?? ''}
            onCommit={(value) =>
              session.execute({ type: 'setProp', nodeId: node.id, prop: 'alt', value })
            }
          />
        </>
      ) : null}
      {node.type !== 'instance' && node.attributes
        ? Object.entries(node.attributes).map(([key, value]) => (
            <TextControl
              key={key}
              label={key}
              name={`attr-${key}`}
              value={value}
              onCommit={(next) => commitAttribute(session, node, key, next)}
            />
          ))
        : null}
      {node.type !== 'instance' ? <StyleFields session={session} node={node} /> : null}
      {node.type === 'instance' ? (
        <InstanceFields session={session} node={node} snap={snap} />
      ) : null}
      {node.id === snap.document.rootId && snap.document.fields.length ? (
        <DocumentFields session={session} snap={snap} />
      ) : null}
    </div>
  );
}

function commitAttribute(
  session: EditorSession,
  node: Exclude<FlatNode, { type: 'instance' }>,
  key: string,
  value: string,
) {
  const attributes = { ...(node.attributes ?? {}) };
  if (value === '') delete attributes[key];
  else attributes[key] = value;
  session.execute({
    type: 'setProp',
    nodeId: node.id,
    prop: 'attributes',
    value: Object.keys(attributes).length ? attributes : null,
  });
}

function StyleFields({
  session,
  node,
}: {
  session: EditorSession;
  node: Exclude<FlatNode, { type: 'instance' }>;
}) {
  const [property, setProperty] = useState('');
  const [value, setValue] = useState('');
  const entries = Object.entries(node.style ?? {});
  return (
    <div className="stack">
      <h3>Style</h3>
      {entries.length === 0 ? <p className="meta">No style overrides.</p> : null}
      {entries.map(([key, current]) => (
        <TextControl
          key={key}
          label={key}
          value={current}
          onCommit={(next) =>
            session.execute({
              type: 'setStyle',
              nodeId: node.id,
              property: key,
              value: next.trim() ? next : null,
            })
          }
        />
      ))}
      <label className="field">
        <span>Add property</span>
        <span className="pair">
          <input
            name="style-property"
            value={property}
            placeholder="property"
            onChange={(event) => setProperty(event.target.value)}
          />
          <input
            name="style-value"
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
          session.execute({
            type: 'setStyle',
            nodeId: node.id,
            property: name,
            value: value.trim(),
          });
          setProperty('');
          setValue('');
        }}
      >
        Add style
      </button>
    </div>
  );
}

function InstanceFields({
  session,
  node,
  snap,
}: {
  session: EditorSession;
  node: Extract<FlatNode, { type: 'instance' }>;
  snap: EditorSnapshot;
}) {
  const target = snap.componentTarget;
  if (!target) {
    return <p className="meta">Unknown component {node.component}.</p>;
  }
  return (
    <div className="stack">
      {target.fields.length ? <h3>Fields</h3> : null}
      {target.fields.map((field) => (
        <FieldOverride key={field.name} session={session} node={node} field={field} />
      ))}
      {target.variants.length ? <h3>Variants</h3> : null}
      {target.variants.map((axis) => {
        const current = node.variants?.[axis.name] ?? '';
        return (
          <label key={axis.name} className="field">
            <span>{axis.name}</span>
            <select
              name={`variant-${axis.name}`}
              value={current}
              onChange={(event) =>
                session.execute({
                  type: 'setVariant',
                  nodeId: node.id,
                  axis: axis.name,
                  value: event.target.value || null,
                })
              }
            >
              <option value="">Default ({axis.default ?? axis.values[0]})</option>
              {axis.values.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </div>
  );
}

function FieldOverride({
  session,
  node,
  field,
}: {
  session: EditorSession;
  node: Extract<FlatNode, { type: 'instance' }>;
  field: FieldDefinition;
}) {
  const override = node.fields?.[field.name];
  if (field.type === 'boolean') {
    const checked = typeof override === 'boolean' ? override : field.default === true;
    return (
      <label className="field field-check">
        <span>{field.name}</span>
        <input
          type="checkbox"
          name={`field-${field.name}`}
          checked={checked}
          onChange={(event) =>
            session.execute({
              type: 'setField',
              nodeId: node.id,
              field: field.name,
              value: event.target.checked,
            })
          }
        />
      </label>
    );
  }
  const shown = override === undefined || override === null ? '' : String(override);
  const placeholder = field.default === undefined ? undefined : String(field.default);
  return (
    <TextControl
      label={field.name}
      name={`field-${field.name}`}
      value={shown}
      placeholder={placeholder}
      onCommit={(raw) => {
        try {
          session.execute({
            type: 'setField',
            nodeId: node.id,
            field: field.name,
            value: raw === '' ? null : parseField(field, raw),
          });
        } catch (error) {
          session.setNotice(error instanceof Error ? error.message : 'Invalid field', 'error');
        }
      }}
    />
  );
}

function DocumentFields({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  return (
    <div className="stack">
      <h3>Fields</h3>
      {snap.document.fields.map((field) => (
        <TextControl
          key={field.name}
          label={`${field.name} default`}
          name={`default-${field.name}`}
          value={field.default === undefined ? '' : String(field.default)}
          onCommit={(raw) => {
            try {
              const value = raw === '' ? undefined : parseField(field, raw);
              session.execute({
                type: 'defineField',
                field: {
                  name: field.name,
                  type: field.type,
                  ...(field.options ? { options: [...field.options] } : {}),
                  ...(value !== undefined ? { default: value } : {}),
                },
              });
            } catch (error) {
              session.setNotice(error instanceof Error ? error.message : 'Invalid field', 'error');
            }
          }}
        />
      ))}
    </div>
  );
}

function parseField(field: FieldDefinition, raw: string): FieldValue {
  if (field.type === 'number') {
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`${field.name} must be a number`);
    return value;
  }
  if (field.type === 'boolean') return raw === 'true';
  return raw;
}

function TokensPanel({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  const [query, setQuery] = useState('');
  const tokens = useMemo(() => {
    const indexed = readTokenTree(snap.design.tokens);
    return [...indexed.tokens.values()].sort((left, right) => left.path.localeCompare(right.path));
  }, [snap.design]);
  const needle = query.trim().toLowerCase();
  const visible = needle ? tokens.filter((token) => token.path.includes(needle)) : tokens;
  let group = '';
  return (
    <div className="stack">
      <div className="panel-head">
        <p className="meta">Project tokens. Edits update every viewport.</p>
        <button
          type="button"
          className="text-button"
          onClick={() => void saveDesign(session, snap)}
        >
          Save design
        </button>
      </div>
      <label className="field">
        <span>Filter</span>
        <input
          name="token-filter"
          value={query}
          placeholder="color.accent"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {visible.map((token) => {
        const nextGroup = token.path.split('.')[0] ?? '';
        const heading = nextGroup !== group;
        group = nextGroup;
        const text = formatTokenValue(token.value);
        const hex = typeof token.value === 'string' && /^#[0-9a-fA-F]{6}$/.test(token.value);
        return (
          <div key={token.path}>
            {heading ? <h3>{nextGroup}</h3> : null}
            <div className="token-row">
              {hex ? (
                <input
                  className="swatch"
                  type="color"
                  aria-label={`${token.path} color`}
                  value={token.value as string}
                  onChange={(event) =>
                    commitToken(session, snap, token.path, token.value, event.target.value)
                  }
                />
              ) : null}
              <TextControl
                label={`${token.path} · ${token.type}`}
                name={`token-${token.path}`}
                value={text}
                multiline={typeof token.value === 'object' && token.value !== null}
                onCommit={(next) => commitToken(session, snap, token.path, token.value, next)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function commitToken(
  session: EditorSession,
  snap: EditorSnapshot,
  path: string,
  previous: Parameters<typeof parseEditedValue>[1],
  text: string,
) {
  try {
    const value = parseEditedValue(text, previous);
    session.executeDesign({
      type: 'setToken',
      path,
      token: withTokenValue(snap.design.tokens, path, value),
    });
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : 'Invalid token', 'error');
  }
}

function FontsPanel({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  return (
    <div className="stack">
      <div className="panel-head">
        <p className="meta">Project fonts. The last fallback must be a generic family.</p>
        <button
          type="button"
          className="text-button"
          onClick={() => void saveDesign(session, snap)}
        >
          Save design
        </button>
      </div>
      {snap.design.fonts.length === 0 ? <p className="inspector-empty">No fonts yet.</p> : null}
      {snap.design.fonts.map((font) => (
        <fieldset key={font.id} className="font-card">
          <legend>{font.id}</legend>
          <TextControl
            label="Family"
            name={`font-${font.id}-family`}
            value={font.family}
            onCommit={(family) => {
              const trimmed = family.trim();
              if (!trimmed || trimmed === font.family) return;
              session.executeDesign({
                type: 'setFont',
                font: editedFont(font, { family: trimmed }),
              });
            }}
          />
          <TextControl
            label="Fallbacks"
            name={`font-${font.id}-fallbacks`}
            value={font.fallbacks.join(', ')}
            onCommit={(text) => {
              const fallbacks = text
                .split(',')
                .map((part) => part.trim())
                .filter((part) => part.length > 0);
              session.executeDesign({ type: 'setFont', font: editedFont(font, { fallbacks }) });
            }}
          />
          <p className="meta">
            {font.source.type === 'google' ? `Google · ${font.source.family}` : 'File'} ·{' '}
            {font.weights.join(', ')}
          </p>
        </fieldset>
      ))}
    </div>
  );
}

function editedFont(
  font: FontFamily,
  patch: { family?: string; fallbacks?: string[] },
): FontFamily {
  const family = patch.family ?? font.family;
  return {
    id: font.id,
    family,
    weights: [...font.weights],
    ...(font.styles ? { styles: [...font.styles] } : {}),
    source:
      font.source.type === 'google'
        ? { type: 'google', family: patch.family ?? font.source.family }
        : { type: 'file', files: font.source.files.map((file) => ({ ...file })) },
    fallbacks: patch.fallbacks ? [...patch.fallbacks] : [...font.fallbacks],
  };
}

async function saveDesign(session: EditorSession, snap: EditorSnapshot) {
  const id = snap.design.id;
  try {
    const result = await saveJsonFile({
      filename: session.filenameFor(id),
      text: documentToJson(snap.design),
      handle: session.fileHandle(id),
    });
    if (result.handle) session.rememberHandle(id, result.handle);
    const verb = result.via === 'download' ? 'Downloaded' : 'Saved';
    session.setNotice(`${verb} ${session.filenameFor(id)}`);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    session.setNotice(error instanceof Error ? error.message : 'Could not save', 'error');
  }
}
