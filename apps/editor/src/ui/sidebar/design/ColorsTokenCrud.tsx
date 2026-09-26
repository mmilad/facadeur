import { readTokenTree } from '@facadeur/core';
import { useMemo, useState } from 'react';
import {
  assertColorTokenPath,
  createDefaultColorToken,
  suggestColorPath,
  tokenPathsReferencingColor,
} from '../../../domain/color-edit.js';
import type { EditorSession, EditorSnapshot } from '../../../domain/session.js';
import { Field, TextInput } from '../../form/index.js';

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
  const [newPath, setNewPath] = useState(() => suggestColorPath(existingPaths));

  function addColor() {
    try {
      const path = newPath.trim();
      assertColorTokenPath(path);
      const indexed = readTokenTree(snap.design.tokens);
      if (indexed.tokens.has(path)) {
        throw new Error(`Color "${path}" already exists`);
      }
      session.executeDesign({ type: 'setToken', path, token: createDefaultColorToken() });
      setNewPath(suggestColorPath([...existingPaths, path]));
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : 'Invalid color', 'error');
    }
  }

  return (
    <div className="font-add-row">
      <Field label="Path">
        <TextInput
          name="new-color-path"
          value={newPath}
          placeholder="color.accent.default"
          onChange={setNewPath}
        />
      </Field>
      <button type="button" className="text-button" name="add-color" onClick={() => addColor()}>
        Add color
      </button>
    </div>
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
    const refs = tokenPathsReferencingColor(snap.design.tokens, path);
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
      name={`remove-color-${path}`}
      onClick={() => removeColor()}
    >
      Remove color
    </button>
  );
}
