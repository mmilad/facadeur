import type { FlatNode } from '@facadeur/core';
import type { EditorSession } from '../../../../domain/session';
import { NodeAttributeFields } from './NodeAttributeFields';

export function PreviewOptionsDisclosure({
  session,
  node,
  entries,
}: {
  session: EditorSession;
  node: Extract<FlatNode, { type: 'frame' | 'text' | 'image' }>;
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
