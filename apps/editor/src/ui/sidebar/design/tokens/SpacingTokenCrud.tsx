import { readTokenTree } from '@facadeur/core';
import { useMemo } from 'react';
import {
  assertSpacingTokenPath,
  createDefaultSpacingToken,
  tokenPathsReferencingSpacing,
} from '../../../../domain/edits/spacing-edit.js';
import { designTokenWithLabel } from '../../../../domain/edits/token-label.js';
import {
  documentsReferencingToken,
  pathFromDesignTokenLabel,
} from '../../../../domain/component-tokens.js';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import { IconButton } from '../../../form/components/shared/IconButton.js';
import { TokenAddAction } from './TokenAddAction.js';

export function SpacingTokenAddRow({
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

  function addSpacing(labelValue: string): true | false {
    try {
      const label = labelValue.trim();
      const path = pathFromDesignTokenLabel(label, 'space', existingPaths);
      assertSpacingTokenPath(path);
      const indexed = readTokenTree(snap.design.tokens);
      if (indexed.tokens.has(path)) {
        throw new Error(`Spacing "${path}" already exists`);
      }
      session.executeDesign({
        type: 'setToken',
        path,
        token: designTokenWithLabel(createDefaultSpacingToken(), label),
      });
      return true;
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : 'Invalid spacing', 'error');
      return false;
    }
  }

  return (
    <TokenAddAction
      label="Add spacing token"
      actionName="add-spacing"
      inputName="new-spacing-label"
      inputLabel="Label"
      initialPath=""
      placeholder="Gap xl"
      onAdd={addSpacing}
    />
  );
}

export function RemoveSpacingTokenButton({
  session,
  snap,
  path,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  path: string;
}) {
  function removeSpacing() {
    const refs = [
      ...tokenPathsReferencingSpacing(snap.design.tokens, path),
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
      label={`Remove spacing ${path}`}
      name={`remove-spacing-${path}`}
      onClick={() => removeSpacing()}
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
