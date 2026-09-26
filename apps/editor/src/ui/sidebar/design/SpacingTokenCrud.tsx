import { readTokenTree } from '@facadeur/core';
import { useMemo, useState } from 'react';
import {
  assertSpacingTokenPath,
  createDefaultSpacingToken,
  suggestSpacingPath,
  tokenPathsReferencingSpacing,
} from '../../../domain/spacing-edit.js';
import type { EditorSession, EditorSnapshot } from '../../../domain/session.js';
import { Field, TextInput } from '../../form/index.js';

export function SpacingTokenAddRow({
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
  const [newPath, setNewPath] = useState(() => suggestSpacingPath(existingPaths));

  function addSpacing() {
    try {
      const path = newPath.trim();
      assertSpacingTokenPath(path);
      const indexed = readTokenTree(snap.design.tokens);
      if (indexed.tokens.has(path)) {
        throw new Error(`Spacing "${path}" already exists`);
      }
      session.executeDesign({ type: 'setToken', path, token: createDefaultSpacingToken() });
      setNewPath(suggestSpacingPath([...existingPaths, path]));
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : 'Invalid spacing', 'error');
    }
  }

  return (
    <div className="font-add-row">
      <Field label="Path">
        <TextInput
          name="new-spacing-path"
          value={newPath}
          placeholder="space.gap.xl"
          onChange={setNewPath}
        />
      </Field>
      <button type="button" className="text-button" name="add-spacing" onClick={() => addSpacing()}>
        Add spacing
      </button>
    </div>
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
    const refs = tokenPathsReferencingSpacing(snap.design.tokens, path);
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
    <button
      type="button"
      className="text-button"
      name={`remove-spacing-${path}`}
      onClick={() => removeSpacing()}
    >
      Remove spacing
    </button>
  );
}
