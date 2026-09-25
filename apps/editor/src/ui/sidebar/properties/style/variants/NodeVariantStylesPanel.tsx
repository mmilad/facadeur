import type { EditorSession, EditorSnapshot } from '../../../../../domain/session.js';
import { styleStateNames } from '../../../../../domain/style-edit.js';
import { VariantStyleLayers } from '../../../../controls/variants/index.js';
import { ownsComponentFeatures } from '../../content/owns-component-features.js';
import { DeclarationEditor } from '../declarations/declaration-editor.js';

export function NodeVariantStylesPanel({
  session,
  snap,
  nodeId,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  nodeId: string;
}) {
  if (!ownsComponentFeatures(snap.document.kind) || !snap.document.variants.length) return null;
  return (
    <div className="stack">
      <h3>Variant styles</h3>
      <p className="meta">These override this layer for one variant value.</p>
      {snap.document.variants.map((axis) => (
        <VariantStyleLayers
          key={axis.name}
          axis={axis}
          stateNames={styleStateNames}
          renderDeclarations={(value) => (
            <DeclarationEditor
              session={session}
              snap={snap}
              target={{ nodeId, axis: axis.name, value }}
            />
          )}
          renderStateDeclarations={(value, state) => (
            <DeclarationEditor
              session={session}
              snap={snap}
              target={{
                nodeId,
                axis: axis.name,
                value,
                state: state as (typeof styleStateNames)[number],
              }}
            />
          )}
        />
      ))}
    </div>
  );
}
