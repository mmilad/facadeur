import { ClassListInput, Field } from '../../../form/index';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session';

const UTILITY_CLASSES = [
  'block',
  'inline-block',
  'flex',
  'inline-flex',
  'grid',
  'hidden',
  'items-center',
  'justify-center',
  'justify-between',
  'flex-col',
  'flex-wrap',
  'gap-2',
  'gap-4',
  'p-2',
  'p-4',
  'px-4',
  'py-2',
  'w-full',
  'h-full',
  'rounded',
  'rounded-lg',
  'border',
  'shadow',
  'text-sm',
  'font-medium',
  'font-bold',
];

export function ClassNamesEditor({
  session,
  snap,
  nodeId,
  className,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  nodeId: string;
  className: string;
}) {
  const node = snap.activeDocument.nodes[nodeId] ?? snap.document.nodes[nodeId];
  const suggestions = [...new Set([...UTILITY_CLASSES])];
  return (
    <div className="style-name-editor">
      <p className="meta">
        Style class: <code>.{className}</code>
      </p>
      <Field label="CSS classes">
        <ClassListInput
          key={nodeId}
          label={`CSS classes for ${node?.name ?? nodeId}`}
          value={node?.classes ?? []}
          suggestions={suggestions}
          disabled={Boolean(snap.activeVariantName)}
          onChange={(classes) =>
            session.execute({ type: 'setProp', nodeId, prop: 'classes', value: classes })
          }
        />
      </Field>
    </div>
  );
}
