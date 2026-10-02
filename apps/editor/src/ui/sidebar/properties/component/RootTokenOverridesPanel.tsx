import { readTokenTree } from '@facadeur/core';
import {
  rootTokenOverrideCommand,
  rootTokenTargets,
} from '../../../../domain/root-token-overrides.js';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import { TokenValueControl } from '../../../controls/fields/TokenValueControl.js';

export function RootTokenOverridesPanel({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const targets = rootTokenTargets(snap.document.id, session.boardDocuments());
  const known = new Set(targets.map((target) => target.path));
  // Preserve access to saved sets even when their component is no longer reachable.
  for (const path of Object.keys(snap.document.tokenInterface?.sets ?? {})) {
    if (!known.has(path)) targets.push({ path, label: path, fallback: '' });
  }
  if (!targets.length) return null;
  const globalTokens = [...readTokenTree(snap.design.tokens).tokens.values()];
  return (
    <section aria-label="Exposed component styles">
      <h3>Exposed component styles</h3>
      <p className="component-tokens-note">
        Set values on this root for matching components below it. Clear a value to use its default.
      </p>
      {targets.map((target) => {
        const value = snap.document.tokenInterface?.sets?.[target.path];
        return (
          <div key={target.path} data-root-token-path={target.path}>
            <TokenValueControl
              name={`root-token-${target.path}`}
              label={target.label}
              value={value ?? ''}
              placeholder={target.fallback || 'Inherited'}
              tokens={globalTokens
                .filter((token) => token.type === target.type)
                .map((token) => `{${token.path}}`)}
              color={target.type === 'color'}
              onCommit={(next) => {
                try {
                  session.execute(
                    rootTokenOverrideCommand(session.getSnapshot().document, target.path, next),
                  );
                } catch (error) {
                  session.setNotice(
                    error instanceof Error ? error.message : 'Invalid token value',
                    'error',
                  );
                }
              }}
            />
            {value !== undefined ? (
              <button
                type="button"
                className="eu-button"
                aria-label={`Reset ${target.label}`}
                onClick={() =>
                  session.execute(
                    rootTokenOverrideCommand(session.getSnapshot().document, target.path, null),
                  )
                }
              >
                Reset
              </button>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
