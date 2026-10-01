import { readTokenTree } from '@facadeur/core';
import { useMemo } from 'react';
import {
  assertColorTokenPath,
  createDefaultColorToken,
  suggestColorPath,
  tokenPathsReferencingColor,
} from '../../../../domain/edits/color-edit.js';
import { documentsReferencingToken } from '../../../../domain/component-tokens.js';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import { IconButton } from '../../../form/components/shared/IconButton.js';
import { TokenAddAction } from './TokenAddAction.js';

export function ColorTokenAddRow({
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
  const newPath = suggestColorPath(existingPaths);

  function addColor(pathValue: string): string | false {
    try {
      const path = pathValue.trim();
      assertColorTokenPath(path);
      const indexed = readTokenTree(snap.design.tokens);
      if (indexed.tokens.has(path)) {
        throw new Error(`Color "${path}" already exists`);
      }
      session.executeDesign({ type: 'setToken', path, token: createDefaultColorToken() });
      return suggestColorPath([...existingPaths, path]);
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : 'Invalid color', 'error');
      return false;
    }
  }

  return (
    <TokenAddAction
      label="Add color token"
      actionName="add-color"
      inputName="new-color-path"
      initialPath={newPath}
      placeholder="color.accent.default"
      onAdd={addColor}
    />
  );
}

export function RemoveColorTokenButton({
  session,
  snap,
  path,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  path: string;
}) {
  function removeColor() {
    const refs = [
      ...tokenPathsReferencingColor(snap.design.tokens, path),
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
      label={`Remove color ${path}`}
      name={`remove-color-${path}`}
      onClick={() => removeColor()}
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
