import type { EditorSession, EditorSnapshot } from '../../../../../domain/session';
import { styleStateNames } from '../../../../../domain/edits/style-edit';
import { VariantStyleLayers, VariantsEditorControl } from '../../../../controls/variants/index';
import { DeclarationEditor } from '../../style/declarations/declaration-editor';
import { ownsComponentFeatures } from './owns-component-features';

export function ComponentVariants({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  if (!ownsComponentFeatures(snap.document.kind)) return null;
  return (
    <div className="stack">
      <h3>Variants</h3>
      <VariantsEditorControl
        variants={snap.document.variants}
        onDefineVariant={(axis) => session.execute({ type: 'defineVariant', axis })}
        onRemoveVariant={(name) => session.execute({ type: 'removeVariant', name })}
        onInvalid={(message) => session.setNotice(message, 'error')}
        renderAxisExtras={(axis) => (
          <VariantStyleLayers
            axis={axis}
            stateNames={styleStateNames}
            renderDeclarations={(value) => (
              <DeclarationEditor
                session={session}
                snap={snap}
                target={{ nodeId: snap.document.rootId, axis: axis.name, value }}
              />
            )}
            renderStateDeclarations={(value, state) => (
              <DeclarationEditor
                session={session}
                snap={snap}
                target={{
                  nodeId: snap.document.rootId,
                  axis: axis.name,
                  value,
                  state: state as (typeof styleStateNames)[number],
                }}
              />
            )}
          />
        )}
      />
      <p className="meta">States live on the style block, above node style overrides.</p>
      {styleStateNames.map((state) => (
        <details key={state} className="fold">
          <summary>{state}</summary>
          <DeclarationEditor
            session={session}
            snap={snap}
            target={{ nodeId: snap.document.rootId, state }}
          />
        </details>
      ))}
    </div>
  );
}
