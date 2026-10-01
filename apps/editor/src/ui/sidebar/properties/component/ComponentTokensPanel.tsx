import {
  assertComponentTokenDefault,
  type ComponentToken,
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
import { tokenTitle } from '../../design/tokens/token-labels.js';
import { DesignShadowEditor, type DesignShadowInput } from '../../design/DesignShadowEditor.js';
import {
  DesignTypographyEditor,
  type DesignTypographyValue,
} from '../../design/DesignTypographyEditor.js';
import { IconButton } from '../../../form/components/shared/IconButton.js';
import { Field, Select } from '../../../form/index.js';
import { TokenAddAction } from '../../design/tokens/TokenAddAction.js';

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
  const entries = useMemo(() => {
    const tokens = readComponentTokens(doc);
    if (!tokens) return [];
    return Object.entries(tokens).sort(([left], [right]) => left.localeCompare(right));
  }, [doc]);
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

  function commitToken(path: string, token: ComponentToken) {
    try {
      assertComponentTokenDefault(token.value, globalPaths);
      session.execute({ type: 'setComponentToken', path, token });
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : 'Invalid token value', 'error');
    }
  }

  function removeToken(path: string) {
    session.execute({ type: 'removeComponentToken', path });
  }

  const localPaths = useMemo(
    () => new Set(entries.map(([path]) => path)),
    [entries],
  );

  return (
    <section className="component-tokens-panel eu-section" aria-label="Component tokens">
      <h3 className="eu-section__title">Tokens</h3>
      <p className="side-note">
        Local defaults for this {doc.kind}. Style fields reference them as {'{path}'} (for example{' '}
        {'{color.bg}'}).
      </p>
      {entries.length ? (
        <ul className="component-token-list">
          {entries.map(([path, token]) => (
            <ComponentTokenRow
              key={path}
              path={path}
              token={token}
              globalColorTokens={globalColorTokens}
              globalShadowTokens={globalShadowTokens}
              typographyCatalogs={typographyCatalogs}
              globalTypographyTokens={typographyTokenRefs(snap.design.tokens)}
              globalDimensionTokens={dimensionTokenRefs(snap.design.tokens)}
              onCommit={(next) => commitToken(path, next)}
              onRemove={() => removeToken(path)}
            />
          ))}
        </ul>
      ) : (
        <p className="inspector-empty">No local tokens yet.</p>
      )}
      <ComponentTokenAddRow
        existingPaths={localPaths}
        globalPaths={globalPaths}
        onAdd={(path, token) => {
          try {
            assertComponentTokenPath(path);
            assertComponentTokenPathAvailable(path, globalPaths, localPaths);
            assertComponentTokenDefault(token.value, globalPaths);
            session.execute({ type: 'setComponentToken', path, token });
            return suggestComponentTokenPath('color.custom', new Set([...localPaths, path]));
          } catch (error) {
            session.setNotice(error instanceof Error ? error.message : 'Invalid token', 'error');
            return false;
          }
        }}
      />
    </section>
  );
}

function ComponentTokenRow({
  path,
  token,
  globalColorTokens,
  globalShadowTokens,
  typographyCatalogs,
  globalTypographyTokens,
  globalDimensionTokens,
  onCommit,
  onRemove,
}: {
  path: string;
  token: ComponentToken;
  globalColorTokens: readonly string[];
  globalShadowTokens: readonly string[];
  typographyCatalogs: TypographyCatalogs;
  globalTypographyTokens: readonly string[];
  globalDimensionTokens: readonly string[];
  onCommit: (token: ComponentToken) => void;
  onRemove: () => void;
}) {
  const label = `${tokenTitle(path)} · ${token.type}`;
  const commitValue = (value: string) => onCommit({ ...token, value });

  return (
    <li className="component-token-row" data-component-token-path={path}>
      <div className="component-token-row-head">
        <strong>{tokenTitle(path)}</strong>
        <span className="token-path-id">{path}</span>
        <span>{token.type}</span>
        <IconButton
          className="token-action-remove"
          label={`Remove local token ${path}`}
          name={`remove-component-token-${path}`}
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
        {token.type === 'color' ? (
          <ColorControl
            name={`component-token-${path}`}
            label={label}
            value={token.value}
            colorTokens={globalColorTokens}
            onCommit={(next) => commitValue(next ?? '')}
          />
        ) : token.type === 'shadow' ? (
          <DesignShadowEditor
            namePrefix={`component-token-${path}`}
            label={label}
            value={token.value as DesignShadowInput}
            shadowTokens={globalShadowTokens}
            dimensionTokens={typographyCatalogs.dimensionTokens}
            colorTokens={globalColorTokens}
            onCommit={(next) => {
              if (next === null) return;
              commitValue(typeof next === 'string' ? next : JSON.stringify(next));
            }}
          />
        ) : token.type === 'typography' ? (
          <DesignTypographyEditor
            namePrefix={`component-token-${path}`}
            label={label}
            value={token.value as DesignTypographyValue}
            catalogs={typographyCatalogs}
            typographyTokens={globalTypographyTokens}
            onCommit={(next) => {
              if (next === null) return;
              commitValue(typeof next === 'string' ? next : JSON.stringify(next));
            }}
          />
        ) : token.type === 'dimension' || token.type === 'number' || token.type === 'fontFamily' ||
          token.type === 'fontWeight' ? (
          <TokenValueControl
            name={`component-token-${path}`}
            label={label}
            value={token.value}
            tokens={scalarGlobalRefs(token.type, {
              dimension: globalDimensionTokens,
              number: typographyCatalogs.numberTokens,
              fontFamily: typographyCatalogs.fontFamilyTokens,
              fontWeight: typographyCatalogs.fontWeightTokens,
            })}
            onCommit={(next) => commitValue(next ?? '')}
          />
        ) : (
          <TextControl
            name={`component-token-${path}`}
            label={label}
            value={token.value}
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
  globalPaths,
  onAdd,
}: {
  existingPaths: ReadonlySet<string>;
  globalPaths: ReadonlySet<string>;
  onAdd: (path: string, token: ComponentToken) => string | false;
}) {
  const [type, setType] = useState<TokenType>('color');
  const initialPath = suggestComponentTokenPath('color.custom', existingPaths);

  function add(pathValue: string): string | false {
    const path = pathValue.trim();
    return onAdd(path, defaultComponentToken(type));
  }

  return (
    <div className="component-token-add">
      <Field label="Type">
        <Select
          name="new-component-token-type"
          value={type}
          options={COMPONENT_TOKEN_TYPES.map((item) => ({ value: item, label: item }))}
          onChange={(value) => setType(value as TokenType)}
        />
      </Field>
      <TokenAddAction
        label="Add local token"
        actionName="add-component-token"
        inputName="new-component-token-path"
        initialPath={initialPath}
        placeholder="color.bg"
        onAdd={add}
      />
    </div>
  );
}
