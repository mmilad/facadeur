import { readTokenTree, type DesignTokenFamily } from '@facadeur/core';
import { useMemo } from 'react';
import {
  createDesignToken,
  defaultTokenValue,
  suggestedTokenPath,
  tokenMetadataFromPath,
} from '../../../domain/edits/token-creation';
import type { EditorSnapshot } from '../../../domain/session';
import type { EditorEvent } from '../../../domain/sidebar/events';
import { EditorEventType } from '../../../domain/sidebar/events';
import { IconButton } from '../../components/IconButton';
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
  snap,
  family,
  onEvent,
}: {
  snap: EditorSnapshot;
  family: DesignTokenFamily;
  onEvent: (event: EditorEvent) => void;
}) {
  const existingPaths = useMemo(
    () =>
      new Set([...readTokenTree(snap.design.tokens).tokens.values()].map((token) => token.path)),
    [snap.design.tokens],
  );

  function addToken(rawLabel: string): true | false {
    try {
      const path = suggestedTokenPath(rawLabel, family, existingPaths);
      const metadata = tokenMetadataFromPath(path);
      const definition = defaultTokenValue(family);
      onEvent({
        type: EditorEventType.DesignCommandExecute,
        data: {
          command: {
            type: 'setToken',
            family,
            token: createDesignToken(
              family,
              metadata.label,
              metadata.group,
              definition.valueType,
              definition.value,
            ),
          },
        },
      });
      return true;
    } catch (error) {
      onEvent({
        type: EditorEventType.NoticeSet,
        data: {
          text: error instanceof Error ? error.message : `Invalid ${TOKEN_COPY[family].label}`,
          tone: 'error',
        },
      });
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
  family,
  uuid,
  label,
  onEvent,
}: {
  family: DesignTokenFamily;
  uuid: string;
  label: string;
  onEvent: (event: EditorEvent) => void;
}) {
  function removeToken() {
    onEvent({ type: EditorEventType.DesignTokenRemove, data: { family, uuid, label } });
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
