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
  globalTokenUuids,
  pathFromComponentTokenLabel,
  previewComponentTokenCssVar,
  readComponentTokens,
} from '../../../../domain/component-tokens';
import {
  colorTokenRefs,
  dimensionTokenRefs,
  fontFamilyTokenRefs,
  fontWeightTokenRefs,
  numberTokenRefs,
  shadowTokenRefs,
  typographyTokenRefs,
  fontFamilies,
} from '../../../../domain/editing';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session';
import { ColorControl } from '../../../controls/color/index';
import { TextControl } from '../../../controls/fields/index';
import { TokenValueControl } from '../../../controls/fields/TokenValueControl';
import {
  projectFontRefs,
  projectFontWeightOptions,
  type TypographyCatalogs,
} from '../../../controls/typography/index';
import { tokenLeafLabel } from '../../../design/tokens/token-labels';
import { DesignShadowEditor, type DesignShadowInput } from '../../../design/DesignShadowEditor';
import {
  DesignTypographyEditor,
  type DesignTypographyValue,
} from '../../../design/DesignTypographyEditor';
import { IconButton } from '../../../form/components/shared/IconButton';
import { Field, Select } from '../../../form/index';
import { TextInput } from '../../../form/components/input/TextInput';
import { TokenAddAction } from '../../../design/tokens/TokenAddAction';
import '../../../design/token-tables.css';
import { RootTokenOverridesPanel } from './RootTokenOverridesPanel';

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
  const globalUuids = useMemo(() => globalTokenUuids(snap.design.tokens), [snap.design.tokens]);
  const globalColorTokens = useMemo(() => colorTokenRefs(snap.design.tokens), [snap.design.tokens]);
  const globalShadowTokens = useMemo(
    () => shadowTokenRefs(snap.design.tokens),
    [snap.design.tokens],
  );
  const fonts = useMemo(() => fontFamilies(snap.design.tokens), [snap.design.tokens]);
  const typographyCatalogs = useMemo<TypographyCatalogs>(
    () => ({
      fontRefs: projectFontRefs(fonts),
      fontFamilyTokens: fontFamilyTokenRefs(snap.design.tokens),
      fontWeights: projectFontWeightOptions(fonts),
      fontWeightTokens: fontWeightTokenRefs(snap.design.tokens),
      dimensionTokens: dimensionTokenRefs(snap.design.tokens),
      numberTokens: numberTokenRefs(snap.design.tokens),
    }),
    [fonts, snap.design.tokens],
  );

  const localPaths = useMemo(() => new Set(entries.map((entry) => entry.path)), [entries]);

  function commitToken(entry: ListedComponentToken, token: Omit<ComponentToken, 'path'>) {
    try {
      assertComponentTokenDefault(token.value, globalUuids);
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

  return (
    <section className="component-tokens-panel" aria-label="Component tokens">
      <div className="component-tokens-head">
        <p className="component-tokens-note">
          Local defaults for this {doc.kind}. Pick theme values; each token maps to a CSS variable
          (for example {previewComponentTokenCssVar(doc.id, 'color.bg')}).
        </p>
        <ComponentTokenAddRow
          onAdd={(label, type) => {
            try {
              const path = pathFromComponentTokenLabel(label, type, localPaths);
              assertComponentTokenPath(path);
              assertComponentTokenPathAvailable(path, localPaths);
              const token = defaultComponentToken(type);
              assertComponentTokenDefault(token.value, globalUuids);
              const trimmedLabel = label.trim();
              session.execute({
                type: 'setComponentToken',
                id: createId(),
                path,
                token: { ...token, label: trimmedLabel },
              });
              return true;
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
              documentId={doc.id}
              entry={entry}
              globalColorTokens={globalColorTokens}
              globalShadowTokens={globalShadowTokens}
              typographyCatalogs={typographyCatalogs}
              globalTypographyTokens={typographyTokenRefs(snap.design.tokens)}
              globalDimensionTokens={dimensionTokenRefs(snap.design.tokens)}
              onCommit={(next) => commitToken(entry, next)}
              onRemove={() => removeToken(entry.id)}
            />
          ))}
        </ul>
      ) : (
        <p className="inspector-empty">No local tokens yet.</p>
      )}
      <RootTokenOverridesPanel session={session} snap={snap} />
    </section>
  );
}

function ComponentTokenRow({
  documentId,
  entry,
  globalColorTokens,
  globalShadowTokens,
  typographyCatalogs,
  globalTypographyTokens,
  globalDimensionTokens,
  onCommit,
  onRemove,
}: {
  documentId: string;
  entry: ListedComponentToken;
  globalColorTokens: readonly string[];
  globalShadowTokens: readonly string[];
  typographyCatalogs: TypographyCatalogs;
  globalTypographyTokens: readonly string[];
  globalDimensionTokens: readonly string[];
  onCommit: (token: Omit<ComponentToken, 'path'>) => void;
  onRemove: () => void;
}) {
  const { id, path, type, value, label } = entry;
  const displayLabel = label ?? tokenLeafLabel(path);
  const commitValue = (nextValue: string) =>
    onCommit({ type, value: nextValue, ...(label ? { label } : {}) });
  const commitLabel = (nextLabel: string) => {
    const trimmed = nextLabel.trim();
    if (trimmed === displayLabel) return;
    onCommit({
      type,
      value,
      ...(trimmed ? { label: trimmed } : {}),
    });
  };

  return (
    <li
      className="component-token-row"
      data-component-token-id={id}
      data-component-token-path={path}
    >
      <IconButton
        className="component-token-row-remove token-action-remove"
        label={`Remove ${displayLabel}`}
        name={`remove-component-token-${id}`}
        onClick={onRemove}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M4 4l8 8m0-8-8 8" fill="none" stroke="currentColor" strokeLinecap="round" />
        </svg>
      </IconButton>
      <div className="component-token-row-main">
        <div className="component-token-row-ident">
          <TextInput
            key={label ?? ''}
            className="token-table-label-input component-token-row-label"
            aria-label={`Label for ${previewComponentTokenCssVar(documentId, path)}`}
            value={displayLabel}
            onCommit={commitLabel}
          />
          <span className="component-token-row-var">
            {previewComponentTokenCssVar(documentId, path)}
          </span>
        </div>
        <div className="component-token-row-value">
          {type === 'color' ? (
            <ColorControl
              name={`component-token-${id}`}
              label=""
              value={value}
              colorTokens={globalColorTokens}
              onCommit={(next) => commitValue(next ?? '')}
            />
          ) : type === 'shadow' ? (
            <DesignShadowEditor
              namePrefix={`component-token-${id}`}
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
              label=""
              value={value}
              onCommit={commitValue}
            />
          )}
        </div>
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
  onAdd,
}: {
  onAdd: (label: string, type: TokenType) => true | false;
}) {
  const [type, setType] = useState<TokenType>('color');

  function add(labelValue: string): true | false {
    return onAdd(labelValue.trim(), type);
  }

  return (
    <TokenAddAction
      label="Add local token"
      actionName="add-component-token"
      inputName="new-component-token-label"
      inputLabel="Label"
      initialPath=""
      placeholder="Font color"
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
