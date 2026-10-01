import { readTokenTree } from '@facadeur/core';
import { useMemo } from 'react';
import {
  assertTypographyTokenPath,
  createDefaultTypographyToken,
  suggestTypographyPath,
  tokenPathsReferencingTypography,
} from '../../../../domain/edits/typography-edit.js';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import { IconButton } from '../../../form/components/shared/IconButton.js';
import { TokenAddAction } from './TokenAddAction.js';

export function TypographyTokenAddRow({
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
  const newPath = suggestTypographyPath(existingPaths);

  function addTypography(pathValue: string): string | false {
    try {
      const path = pathValue.trim();
      assertTypographyTokenPath(path);
      const indexed = readTokenTree(snap.design.tokens);
      if (indexed.tokens.has(path)) {
        throw new Error(`Typography "${path}" already exists`);
      }
      session.executeDesign({ type: 'setToken', path, token: createDefaultTypographyToken() });
      return suggestTypographyPath([...existingPaths, path]);
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : 'Invalid typography', 'error');
      return false;
    }
  }

  return (
    <TokenAddAction
      label="Add typography token"
      actionName="add-typography"
      inputName="new-typography-path"
      initialPath={newPath}
      placeholder="type.hero"
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
  function removeTypography() {
    const refs = tokenPathsReferencingTypography(snap.design.tokens, path);
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
      label={`Remove typography ${path}`}
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
