import { readTokenTree } from '@facadeur/core';
import { useMemo } from 'react';
import {
  assertRadiusTokenPath,
  createDefaultRadiusToken,
  suggestRadiusPath,
  tokenPathsReferencingRadius,
} from '../../../../domain/edits/radius-edit.js';
import { documentsReferencingToken } from '../../../../domain/component-tokens.js';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import { IconButton } from '../../../form/components/shared/IconButton.js';
import { TokenAddAction } from './TokenAddAction.js';

export function RadiusTokenAddRow({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const existingPaths = useMemo(() => {
    const indexed = readTokenTree(snap.design.tokens);
    return [...indexed.tokens.keys()];
  }, [snap.design.tokens]);
  const newPath = suggestRadiusPath(existingPaths);

  function addRadius(pathValue: string): string | false {
    try {
      const path = pathValue.trim();
      assertRadiusTokenPath(path);
      const indexed = readTokenTree(snap.design.tokens);
      if (indexed.tokens.has(path)) {
        throw new Error(`Radius "${path}" already exists`);
      }
      session.executeDesign({ type: 'setToken', path, token: createDefaultRadiusToken() });
      return suggestRadiusPath([...existingPaths, path]);
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : 'Invalid radius', 'error');
      return false;
    }
  }

  return (
    <TokenAddAction
      label="Add radius token"
      actionName="add-radius"
      inputName="new-radius-path"
      initialPath={newPath}
      placeholder="radius.corner.lg"
      onAdd={addRadius}
    />
  );
}

export function RemoveRadiusTokenButton({
  session,
  snap,
  path,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  path: string;
}) {
  function removeRadius() {
    const refs = [
      ...tokenPathsReferencingRadius(snap.design.tokens, path),
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
      label={`Remove radius ${path}`}
      name={`remove-radius-${path}`}
      onClick={() => removeRadius()}
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
