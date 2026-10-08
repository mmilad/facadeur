import { readTokenTree } from '@facadeur/core';
import { useMemo } from 'react';
import {
  assertTypographyTokenPath,
  createDefaultTypographyToken,
  tokenPathsReferencingTypography,
} from '../../../../domain/edits/typography-edit';
import { designTokenWithLabel } from '../../../../domain/edits/token-label';
import {
  documentsReferencingToken,
  pathFromDesignTokenLabel,
} from '../../../../domain/component-tokens';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session';
import { IconButton } from '../../../form/components/shared/IconButton';
import { TokenAddAction } from './TokenAddAction';
import { useTokenLabel } from '../../../controls/fields/TokenPreviewContext';

export function TypographyTokenAddRow({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const existingPaths = useMemo(() => {
    const indexed = readTokenTree(snap.design.tokens);
    return new Set(indexed.tokens.keys());
  }, [snap.design.tokens]);

  function addTypography(labelValue: string): true | false {
    try {
      const label = labelValue.trim();
      const path = pathFromDesignTokenLabel(label, 'type', existingPaths);
      assertTypographyTokenPath(path);
      const indexed = readTokenTree(snap.design.tokens);
      if (indexed.tokens.has(path)) {
        throw new Error(`Typography "${path}" already exists`);
      }
      session.executeDesign({
        type: 'setToken',
        path,
        token: designTokenWithLabel(createDefaultTypographyToken(), label),
      });
      return true;
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : 'Invalid typography', 'error');
      return false;
    }
  }

  return (
    <TokenAddAction
      label="Add typography token"
      actionName="add-typography"
      inputName="new-typography-label"
      inputLabel="Label"
      initialPath=""
      placeholder="Hero"
      onAdd={addTypography}
    />
  );
}

export function RemoveTypographyTokenButton({
  session,
  snap,
  path,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  path: string;
}) {
  const labelFor = useTokenLabel();
  function removeTypography() {
    const refs = [
      ...tokenPathsReferencingTypography(snap.design.tokens, path),
      ...documentsReferencingToken(session.boardDocuments(), path),
    ];
    if (refs.length) {
      session.setNotice(
        `Cannot remove "${path}": {${path}} is referenced in ${refs.join(', ')}`,
        'error',
      );
      return;
    }
    session.executeDesign({ type: 'removeToken', path });
  }

  return (
    <IconButton
      className="token-action-remove"
      label={`Remove typography ${labelFor(path)}`}
      name={`remove-typography-${path}`}
      onClick={() => removeTypography()}
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
  );
}
