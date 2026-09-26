import type { FlatNode } from '@facadeur/core';
import type { EditorSession } from '../../../../domain/session.js';
import { NodeAttributeFields } from './NodeAttributeFields.js';

export function PreviewOptionsDisclosure({
  session,
  node,
  entries,
}: {
  session: EditorSession;
  node: Exclude<FlatNode, { type: 'instance' }>;
  entries: [string, string][];
}) {
  if (entries.length === 0) return null;

  return (
    <details className="fold" data-testid="preview-options-disclosure">
      <summary>Preview options</summary>
      <NodeAttributeFields session={session} node={node} entries={entries} />
    </details>
  );
}
