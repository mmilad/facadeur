import { useMemo, useState } from 'react';
import type { FlatNode } from '@facadeur/core';
import {
  colorTokenRefs,
  dimensionTokenRefs,
  fontFamilyTokenRefs,
  fontWeightTokenRefs,
  numberTokenRefs,
  shadowTokenRefs,
} from '../../../../../domain/editing.js';
import type { EditorSession, EditorSnapshot } from '../../../../../domain/session.js';
import { ColorControl, isColorStyleProperty } from '../../../../controls/color/index.js';
import { TextControl } from '../../../../controls/fields/index.js';
import { ShadowControl, isShadowStyleProperty } from '../../../../controls/shadow/index.js';
import {
  isTypographyStyleProperty,
  projectFontRefs,
  TypographyStyleControl,
  type TypographyCatalogs,
} from '../../../../controls/typography/index.js';

export function StyleOverridesPanel({
  session,
  snap,
  node,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  node: Exclude<FlatNode, { type: 'instance' }>;
}) {
  const [property, setProperty] = useState('');
  const [value, setValue] = useState('');
  const colorTokens = useMemo(() => colorTokenRefs(snap.design.tokens), [snap.design.tokens]);
  const shadowTokens = useMemo(() => shadowTokenRefs(snap.design.tokens), [snap.design.tokens]);
  const typographyCatalogs = useMemo<TypographyCatalogs>(
    () => ({
      fontRefs: projectFontRefs(snap.design.fonts),
      fontFamilyTokens: fontFamilyTokenRefs(snap.design.tokens),
      fontWeightTokens: fontWeightTokenRefs(snap.design.tokens),
      dimensionTokens: dimensionTokenRefs(snap.design.tokens),
      numberTokens: numberTokenRefs(snap.design.tokens),
    }),
    [snap.design.fonts, snap.design.tokens],
  );
  const entries = Object.entries(node.style ?? {});
  const addingColor = isColorStyleProperty(property);
  const addingTypography = isTypographyStyleProperty(property);
  const addingShadow = isShadowStyleProperty(property);
  const addingSpecial = addingColor || addingTypography || addingShadow;
  return (
    <div className="stack">
      <h3>Node style</h3>
      <p className="meta">
        Always Base. It overrides the style block, and breakpoint rules stay above it.
      </p>
      {entries.length === 0 ? <p className="meta">No style overrides.</p> : null}
      {entries.map(([key, current]) => {
        const commitStyle = (next: string | null) =>
          session.execute({
            type: 'setStyle',
            nodeId: node.id,
            property: key,
            value: next?.trim() ? next.trim() : null,
          });
        if (isColorStyleProperty(key)) {
          return (
            <ColorControl
              key={key}
              name={`style-${key}`}
              label={key}
              value={current}
              colorTokens={colorTokens}
              onCommit={commitStyle}
            />
          );
        }
        if (isShadowStyleProperty(key)) {
          return (
            <ShadowControl
              key={key}
              name={`style-${key}`}
              label={key}
              value={current}
              shadowTokens={shadowTokens}
              onCommit={commitStyle}
            />
          );
        }
        if (isTypographyStyleProperty(key)) {
          return (
            <TypographyStyleControl
              key={key}
              name={`style-${key}`}
              label={key}
              property={key}
              value={current}
              catalogs={typographyCatalogs}
              onCommit={commitStyle}
            />
          );
        }
        return (
          <TextControl
            key={key}
            label={key}
            value={current}
            onCommit={(next) => commitStyle(next.trim() ? next : null)}
          />
        );
      })}
      <label className="field">
        <span>Add property</span>
        <span className="pair">
          <input
            name="style-property"
            value={property}
            placeholder="property"
            onChange={(event) => setProperty(event.target.value)}
          />
          {!addingSpecial ? (
            <input
              name="style-value"
              value={value}
              placeholder="value"
              onChange={(event) => setValue(event.target.value)}
            />
          ) : null}
        </span>
      </label>
      {addingColor ? (
        <ColorControl
          name="style-add-value"
          label="Value"
          value={value}
          colorTokens={colorTokens}
          onCommit={(next) => setValue(next ?? '')}
        />
      ) : null}
      {addingShadow ? (
        <ShadowControl
          name="style-add-value"
          label="Value"
          value={value}
          shadowTokens={shadowTokens}
          onCommit={(next) => setValue(next ?? '')}
        />
      ) : null}
      {addingTypography ? (
        <TypographyStyleControl
          name="style-add-value"
          label="Value"
          property={property}
          value={value}
          catalogs={typographyCatalogs}
          onCommit={(next) => setValue(next ?? '')}
        />
      ) : null}
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
