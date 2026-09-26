import { readTokenTree } from '@facadeur/core';
import { useMemo, useState } from 'react';
import {
  assertTypographyTokenPath,
  createDefaultTypographyToken,
  suggestTypographyPath,
  tokenPathsReferencingTypography,
} from '../../../domain/typography-edit.js';
import type { EditorSession, EditorSnapshot } from '../../../domain/session.js';
import { Field, TextInput } from '../../form/index.js';

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
  const [newPath, setNewPath] = useState(() => suggestTypographyPath(existingPaths));

  function addTypography() {
    try {
      const path = newPath.trim();
      assertTypographyTokenPath(path);
      const indexed = readTokenTree(snap.design.tokens);
      if (indexed.tokens.has(path)) {
        throw new Error(`Typography "${path}" already exists`);
      }
      session.executeDesign({ type: 'setToken', path, token: createDefaultTypographyToken() });
      setNewPath(suggestTypographyPath([...existingPaths, path]));
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : 'Invalid typography', 'error');
    }
  }

  return (
    <div className="font-add-row">
      <Field label="Path">
        <TextInput
          name="new-typography-path"
          value={newPath}
          placeholder="type.lead"
          onChange={setNewPath}
        />
      </Field>
      <button
        type="button"
        className="text-button"
        name="add-typography"
        onClick={() => addTypography()}
      >
        Add typography
      </button>
    </div>
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
    <button
      type="button"
      className="text-button"
      name={`remove-typography-${path}`}
      onClick={() => removeTypography()}
    >
      Remove typography
    </button>
  );
}
