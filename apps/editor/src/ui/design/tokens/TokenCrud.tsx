import { readTokenTree, type DesignTokenFamily } from '@facadeur/core';
import { useMemo } from 'react';
import {
  createDesignToken,
  defaultTokenValue,
  suggestedTokenPath,
  tokenMetadataFromPath,
} from '../../../domain/edits/token-creation';
import { tokensReferencingUuid } from '../../../domain/edits/token-edit';
import { documentsReferencingToken } from '../../../domain/component-tokens';
import type { EditorSession, EditorSnapshot } from '../../../domain/session';
import { IconButton } from '../../form/components/shared/IconButton';
import { TokenAddAction } from './TokenAddAction';

const TOKEN_COPY: Record<DesignTokenFamily, { label: string; placeholder: string }> = {
  color: { label: 'color', placeholder: 'Accent default' },
  space: { label: 'spacing', placeholder: 'Space 4' },
  radius: { label: 'radius', placeholder: 'Corner lg' },
  shadow: { label: 'shadow', placeholder: 'Elevated md' },
  type: { label: 'typography', placeholder: 'Body' },
  font: { label: 'font', placeholder: 'Inter' },
};

export function TokenAddRow({
  session,
  snap,
  family,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  family: DesignTokenFamily;
}) {
  const existingPaths = useMemo(
    () => new Set([...readTokenTree(snap.design.tokens).tokens.values()].map((token) => token.path)),
    [snap.design.tokens],
  );

  function addToken(rawLabel: string): true | false {
    try {
      const path = suggestedTokenPath(rawLabel, family, existingPaths);
      const metadata = tokenMetadataFromPath(path, family);
      const definition = defaultTokenValue(family);
      session.executeDesign({
        type: 'setToken',
        family,
        token: createDesignToken(
          family,
          metadata.label,
          metadata.group,
          definition.valueType,
          definition.value,
        ),
      });
      return true;
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : `Invalid ${TOKEN_COPY[family].label}`, 'error');
      return false;
    }
  }

  const copy = TOKEN_COPY[family];
  return (
    <TokenAddAction
      label={`Add ${copy.label} token`}
      actionName={`add-${family}-token`}
      inputName={`new-${family}-label`}
      inputLabel="Label"
      initialPath=""
      placeholder={copy.placeholder}
      onAdd={addToken}
    />
  );
}

export function RemoveTokenButton({
  session,
  snap,
  family,
  uuid,
  label,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  family: DesignTokenFamily;
  uuid: string;
  label: string;
}) {
  function removeToken() {
    const refs = [
      ...tokensReferencingUuid(snap.design.tokens, uuid),
      ...documentsReferencingToken(session.boardDocuments(), uuid),
    ];
    if (refs.length) {
      session.setNotice(
        `Cannot remove "${label}": {token:${uuid}} is referenced in ${refs.join(', ')}`,
        'error',
      );
      return;
    }
    session.executeDesign({ type: 'removeToken', family, uuid });
  }

  return (
    <IconButton
      className="token-action-remove"
      label={`Remove ${TOKEN_COPY[family].label} ${label}`}
      name={`remove-${family}-${uuid}`}
      onClick={removeToken}
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
