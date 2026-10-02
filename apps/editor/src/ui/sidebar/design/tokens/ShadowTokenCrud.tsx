import { readTokenTree } from '@facadeur/core';
import { useMemo } from 'react';
import {
  assertShadowTokenPath,
  createDefaultShadowToken,
  tokenPathsReferencingShadow,
} from '../../../../domain/edits/shadow-edit.js';
import { designTokenWithLabel } from '../../../../domain/edits/token-label.js';
import {
  documentsReferencingToken,
  pathFromDesignTokenLabel,
} from '../../../../domain/component-tokens.js';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import { IconButton } from '../../../form/components/shared/IconButton.js';
import { TokenAddAction } from './TokenAddAction.js';
import { useTokenLabel } from '../../../controls/fields/TokenPreviewContext.js';

export function ShadowTokenAddRow({
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

  function addShadow(labelValue: string): true | false {
    try {
      const label = labelValue.trim();
      const path = pathFromDesignTokenLabel(label, 'shadow', existingPaths);
      assertShadowTokenPath(path);
      const indexed = readTokenTree(snap.design.tokens);
      if (indexed.tokens.has(path)) {
        throw new Error(`Shadow "${path}" already exists`);
      }
      session.executeDesign({
        type: 'setToken',
        path,
        token: designTokenWithLabel(createDefaultShadowToken(), label),
      });
      return true;
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : 'Invalid shadow', 'error');
      return false;
    }
  }

  return (
    <TokenAddAction
      label="Add shadow token"
      actionName="add-shadow"
      inputName="new-shadow-label"
      inputLabel="Label"
      initialPath=""
      placeholder="Elevated md"
      onAdd={addShadow}
    />
  );
}

export function RemoveShadowTokenButton({
  session,
  snap,
  path,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  path: string;
}) {
  const labelFor = useTokenLabel();
  function removeShadow() {
    const refs = [
      ...tokenPathsReferencingShadow(snap.design.tokens, path),
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
      label={`Remove shadow ${labelFor(path)}`}
      name={`remove-shadow-${path}`}
      onClick={() => removeShadow()}
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
