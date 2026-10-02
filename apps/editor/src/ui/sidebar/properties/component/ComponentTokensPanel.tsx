import {
  assertComponentTokenDefault,
  createId,
  listComponentTokens,
  type ComponentToken,
  type ListedComponentToken,
  type TokenType,
} from '@facadeur/core';
import { useMemo, useState } from 'react';
import {
  assertComponentTokenPath,
  assertComponentTokenPathAvailable,
  defaultComponentToken,
  globalTokenPaths,
  readComponentTokens,
  suggestComponentTokenPath,
} from '../../../../domain/component-tokens.js';
import {
  colorTokenRefs,
  dimensionTokenRefs,
  fontFamilyTokenRefs,
  fontWeightTokenRefs,
  numberTokenRefs,
  shadowTokenRefs,
  typographyTokenRefs,
} from '../../../../domain/editing.js';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import { ColorControl } from '../../../controls/color/index.js';
import { TextControl } from '../../../controls/fields/index.js';
import { TokenValueControl } from '../../../controls/fields/TokenValueControl.js';
import {
  projectFontRefs,
  projectFontWeightOptions,
  type TypographyCatalogs,
} from '../../../controls/typography/index.js';
import { tokenLeafLabel, tokenTitle } from '../../design/tokens/token-labels.js';
import { DesignShadowEditor, type DesignShadowInput } from '../../design/DesignShadowEditor.js';
import {
  DesignTypographyEditor,
  type DesignTypographyValue,
} from '../../design/DesignTypographyEditor.js';
import { IconButton } from '../../../form/components/shared/IconButton.js';
import { Field, Select } from '../../../form/index.js';
import { TokenAddAction } from '../../design/tokens/TokenAddAction.js';
import '../../design/token-tables.css';

const COMPONENT_TOKEN_TYPES: TokenType[] = [
  'color',
  'dimension',
  'number',
  'fontFamily',
  'fontWeight',
  'shadow',
  'typography',
];

export function ComponentTokensPanel({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const doc = snap.document;
  const entries = useMemo(() => listComponentTokens(readComponentTokens(doc)), [doc]);
  const globalPaths = useMemo(() => globalTokenPaths(snap.design.tokens), [snap.design.tokens]);
  const globalColorTokens = useMemo(() => colorTokenRefs(snap.design.tokens), [snap.design.tokens]);
  const globalShadowTokens = useMemo(
    () => shadowTokenRefs(snap.design.tokens),
    [snap.design.tokens],
  );
  const typographyCatalogs = useMemo<TypographyCatalogs>(
    () => ({
      fontRefs: projectFontRefs(snap.design.fonts),
      fontFamilyTokens: fontFamilyTokenRefs(snap.design.tokens),
      fontWeights: projectFontWeightOptions(snap.design.fonts),
      fontWeightTokens: fontWeightTokenRefs(snap.design.tokens),
      dimensionTokens: dimensionTokenRefs(snap.design.tokens),
      numberTokens: numberTokenRefs(snap.design.tokens),
    }),
    [snap.design.fonts, snap.design.tokens],
  );

  const localPaths = useMemo(() => new Set(entries.map((entry) => entry.path)), [entries]);

  function commitToken(entry: ListedComponentToken, token: Omit<ComponentToken, 'path'>) {
    try {
      assertComponentTokenDefault(token.value, globalPaths);
      session.execute({
        type: 'setComponentToken',
        id: entry.id,
        path: entry.path,
        token,
      });
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : 'Invalid token value', 'error');
    }
  }

  function removeToken(id: string) {
    session.execute({ type: 'removeComponentToken', id });
  }

  function renamePath(entry: ListedComponentToken, nextPath: string) {
    const trimmed = nextPath.trim();
    if (!trimmed || trimmed === entry.path) return;
    try {
      assertComponentTokenPath(trimmed);
      const pathsExceptCurrent = new Set(
        [...localPaths].filter((localPath) => localPath !== entry.path),
      );
      assertComponentTokenPathAvailable(trimmed, globalPaths, pathsExceptCurrent);
      session.execute({ type: 'renameComponentTokenPath', id: entry.id, path: trimmed });
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : 'Invalid token path', 'error');
    }
  }

  return (
    <section className="component-tokens-panel" aria-label="Component tokens">
      <div className="component-tokens-head">
        <p className="component-tokens-note">
          Local defaults for this {doc.kind}. Style fields reference {'{path}'} (for example{' '}
          {'{color.bg}'}).
        </p>
        <ComponentTokenAddRow
          existingPaths={localPaths}
          globalPaths={globalPaths}
          onAdd={(path, token) => {
            try {
              assertComponentTokenPath(path);
              assertComponentTokenPathAvailable(path, globalPaths, localPaths);
              assertComponentTokenDefault(token.value, globalPaths);
              const id = createId();
              session.execute({ type: 'setComponentToken', id, path, token });
              return suggestComponentTokenPath('color.custom', new Set([...localPaths, path]));
            } catch (error) {
              session.setNotice(error instanceof Error ? error.message : 'Invalid token', 'error');
              return false;
            }
          }}
        />
      </div>
      {entries.length ? (
        <ul className="component-token-list">
          {entries.map((entry) => (
            <ComponentTokenRow
              key={entry.id}
              entry={entry}
              globalColorTokens={globalColorTokens}
              globalShadowTokens={globalShadowTokens}
              typographyCatalogs={typographyCatalogs}
              globalTypographyTokens={typographyTokenRefs(snap.design.tokens)}
              globalDimensionTokens={dimensionTokenRefs(snap.design.tokens)}
              onCommit={(next) => commitToken(entry, next)}
              onRenamePath={(path) => renamePath(entry, path)}
              onRemove={() => removeToken(entry.id)}
            />
          ))}
        </ul>
      ) : (
        <p className="inspector-empty">No local tokens yet.</p>
      )}
    </section>
  );
}

function ComponentTokenRow({
  entry,
  globalColorTokens,
  globalShadowTokens,
  typographyCatalogs,
  globalTypographyTokens,
  globalDimensionTokens,
  onCommit,
  onRenamePath,
  onRemove,
}: {
  entry: ListedComponentToken;
  globalColorTokens: readonly string[];
  globalShadowTokens: readonly string[];
  typographyCatalogs: TypographyCatalogs;
  globalTypographyTokens: readonly string[];
  globalDimensionTokens: readonly string[];
  onCommit: (token: Omit<ComponentToken, 'path'>) => void;
  onRenamePath: (path: string) => void;
  onRemove: () => void;
}) {
  const { id, path, type, value, label } = entry;
  const displayLabel = label ?? tokenLeafLabel(path);
  const controlLabel = `${tokenTitle(path)} · ${type}`;
  const commitValue = (nextValue: string) => onCommit({ type, value: nextValue, ...(label ? { label } : {}) });
  const commitLabel = (nextLabel: string) => {
    const trimmed = nextLabel.trim();
    onCommit({
      type,
      value,
      ...(trimmed ? { label: trimmed } : {}),
    });
  };

  return (
    <li className="component-token-row" data-component-token-id={id} data-component-token-path={path}>
      <div className="component-token-row-head token-table-name">
        <input
          className="token-table-label-input"
          aria-label={`Label for ${path}`}
          defaultValue={displayLabel}
          onBlur={(event) => commitLabel(event.currentTarget.value)}
        />
        <input
          className="token-table-path-input"
          aria-label={`Path for ${displayLabel}`}
          defaultValue={path}
          onBlur={(event) => onRenamePath(event.currentTarget.value)}
        />
        <span className="component-token-type">{type}</span>
        <IconButton
          className="token-action-remove"
          label={`Remove local token ${path}`}
          name={`remove-component-token-${id}`}
          onClick={onRemove}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path
              d="M3 5h10m-8 0v8h6V5m-5-2h4l1 2H5l1-2Z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconButton>
      </div>
      <div className="component-token-row-value">
        {type === 'color' ? (
          <ColorControl
            name={`component-token-${id}`}
            label={controlLabel}
            value={value}
            colorTokens={globalColorTokens}
            onCommit={(next) => commitValue(next ?? '')}
          />
        ) : type === 'shadow' ? (
          <DesignShadowEditor
            namePrefix={`component-token-${id}`}
            label={controlLabel}
            value={value as DesignShadowInput}
            shadowTokens={globalShadowTokens}
            dimensionTokens={typographyCatalogs.dimensionTokens}
            colorTokens={globalColorTokens}
            onCommit={(next) => {
              if (next === null) return;
              commitValue(typeof next === 'string' ? next : JSON.stringify(next));
            }}
          />
        ) : type === 'typography' ? (
          <DesignTypographyEditor
            namePrefix={`component-token-${id}`}
            label={controlLabel}
            value={value as DesignTypographyValue}
            catalogs={typographyCatalogs}
            typographyTokens={globalTypographyTokens}
            onCommit={(next) => {
              if (next === null) return;
              commitValue(typeof next === 'string' ? next : JSON.stringify(next));
            }}
          />
        ) : type === 'dimension' ||
          type === 'number' ||
          type === 'fontFamily' ||
          type === 'fontWeight' ? (
          <TokenValueControl
            name={`component-token-${id}`}
            label={controlLabel}
            value={value}
            tokens={scalarGlobalRefs(type, {
              dimension: globalDimensionTokens,
              number: typographyCatalogs.numberTokens,
              fontFamily: typographyCatalogs.fontFamilyTokens,
              fontWeight: typographyCatalogs.fontWeightTokens,
            })}
            onCommit={(next) => commitValue(next ?? '')}
          />
        ) : (
          <TextControl
            name={`component-token-${id}`}
            label={controlLabel}
            value={value}
            onCommit={commitValue}
          />
        )}
      </div>
    </li>
  );
}

function scalarGlobalRefs(
  type: TokenType,
  catalogs: {
    dimension: readonly string[];
    number: readonly string[];
    fontFamily: readonly string[];
    fontWeight: readonly string[];
  },
): readonly string[] {
  switch (type) {
    case 'dimension':
      return catalogs.dimension;
    case 'number':
      return catalogs.number;
    case 'fontFamily':
      return catalogs.fontFamily;
    case 'fontWeight':
      return catalogs.fontWeight;
    default:
      return [];
  }
}

function ComponentTokenAddRow({
  existingPaths,
  globalPaths: _globalPaths,
  onAdd,
}: {
  existingPaths: ReadonlySet<string>;
  globalPaths: ReadonlySet<string>;
  onAdd: (path: string, token: Omit<ComponentToken, 'path'>) => string | false;
}) {
  const [type, setType] = useState<TokenType>('color');
  const initialPath = suggestComponentTokenPath('color.custom', existingPaths);

  function add(pathValue: string): string | false {
    const path = pathValue.trim();
    return onAdd(path, defaultComponentToken(type));
  }

  return (
    <TokenAddAction
      label="Add local token"
      actionName="add-component-token"
      inputName="new-component-token-path"
      initialPath={initialPath}
      placeholder="color.bg"
      onAdd={add}
      fields={
        <Field label="Type">
          <Select
            name="new-component-token-type"
            value={type}
            options={COMPONENT_TOKEN_TYPES.map((item) => ({ value: item, label: item }))}
            onChange={(value) => setType(value as TokenType)}
          />
        </Field>
      }
    />
  );
}
