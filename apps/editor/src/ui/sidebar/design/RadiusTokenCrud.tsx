import { readTokenTree } from '@facadeur/core';
import { useMemo, useState } from 'react';
import {
  assertRadiusTokenPath,
  createDefaultRadiusToken,
  suggestRadiusPath,
  tokenPathsReferencingRadius,
} from '../../../domain/radius-edit.js';
import type { EditorSession, EditorSnapshot } from '../../../domain/session.js';
import { Field, TextInput } from '../../form/index.js';

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
  const [newPath, setNewPath] = useState(() => suggestRadiusPath(existingPaths));

  function addRadius() {
    try {
      const path = newPath.trim();
      assertRadiusTokenPath(path);
      const indexed = readTokenTree(snap.design.tokens);
      if (indexed.tokens.has(path)) {
        throw new Error(`Radius "${path}" already exists`);
      }
      session.executeDesign({ type: 'setToken', path, token: createDefaultRadiusToken() });
      setNewPath(suggestRadiusPath([...existingPaths, path]));
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : 'Invalid radius', 'error');
    }
  }

  return (
    <div className="font-add-row">
      <Field label="Path">
        <TextInput
          name="new-radius-path"
          value={newPath}
          placeholder="radius.corner.lg"
          onChange={setNewPath}
        />
      </Field>
      <button type="button" className="text-button" name="add-radius" onClick={() => addRadius()}>
        Add radius
      </button>
    </div>
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
    const refs = tokenPathsReferencingRadius(snap.design.tokens, path);
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
      name={`remove-radius-${path}`}
      onClick={() => removeRadius()}
    >
      Remove radius
    </button>
  );
}
