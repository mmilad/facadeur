import { readTokenTree } from '@facadeur/core';
import { useMemo, useState } from 'react';
import {
  assertShadowTokenPath,
  createDefaultShadowToken,
  suggestShadowPath,
  tokenPathsReferencingShadow,
} from '../../../domain/shadow-edit.js';
import type { EditorSession, EditorSnapshot } from '../../../domain/session.js';
import { Field, TextInput } from '../../form/index.js';

export function ShadowTokenAddRow({
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
  const [newPath, setNewPath] = useState(() => suggestShadowPath(existingPaths));

  function addShadow() {
    try {
      const path = newPath.trim();
      assertShadowTokenPath(path);
      const indexed = readTokenTree(snap.design.tokens);
      if (indexed.tokens.has(path)) {
        throw new Error(`Shadow "${path}" already exists`);
      }
      session.executeDesign({ type: 'setToken', path, token: createDefaultShadowToken() });
      setNewPath(suggestShadowPath([...existingPaths, path]));
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : 'Invalid shadow', 'error');
    }
  }

  return (
    <div className="font-add-row">
      <Field label="Path">
        <TextInput
          name="new-shadow-path"
          value={newPath}
          placeholder="shadow.elevated.md"
          onChange={setNewPath}
        />
      </Field>
      <button type="button" className="text-button" name="add-shadow" onClick={() => addShadow()}>
        Add shadow
      </button>
    </div>
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
  function removeShadow() {
    const refs = tokenPathsReferencingShadow(snap.design.tokens, path);
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
      name={`remove-shadow-${path}`}
      onClick={() => removeShadow()}
    >
      Remove shadow
    </button>
  );
}
