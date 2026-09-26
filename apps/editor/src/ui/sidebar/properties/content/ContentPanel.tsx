import type { FlatNode } from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import { HtmlTagSelect } from '../../../controls/html/index.js';
import { InstanceOverridesControl } from '../../../controls/instance/index.js';
import { TextControl } from '../../../controls/fields/index.js';
import '../../../form/form.css';
import { ComponentFields } from './ComponentFields.js';
import { NodeAttributeFields } from './NodeAttributeFields.js';
import { partitionNodeAttributes } from './preview-attribute-keys.js';
import { PreviewOptionsDisclosure } from './PreviewOptionsDisclosure.js';

export function ContentPanel({
  session,
  snap,
  node,
  showDefinitions,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  node: FlatNode;
  showDefinitions: boolean;
}) {
  return (
    <>
      <p className="inspector-id">{node.id}</p>
      <dl className="kv">
        <dt>Type</dt>
        <dd>{node.type}</dd>
        <dt>Document</dt>
        <dd>{snap.document.name}</dd>
      </dl>
      <TextControl
        label="Name"
        name="name"
        value={node.name ?? ''}
        onCommit={(value) =>
          session.execute({
            type: 'setProp',
            nodeId: node.id,
            prop: 'name',
            value: value.trim() ? value.trim() : null,
          })
        }
      />
      {node.type !== 'instance' ? (
        <HtmlTagSelect
          name="tag"
          value={node.tag ?? ''}
          onCommit={(value) =>
            session.execute({
              type: 'setProp',
              nodeId: node.id,
              prop: 'tag',
              value: value.trim() ? value.trim() : null,
            })
          }
        />
      ) : null}
      {node.type === 'text' ? (
        <TextControl
          label="Text"
          name="text"
          value={node.text ?? ''}
          multiline
          onCommit={(value) =>
            session.execute({ type: 'setProp', nodeId: node.id, prop: 'text', value })
          }
        />
      ) : null}
      {node.type === 'image' ? (
        <>
          <TextControl
            label="Source"
            name="src"
            value={node.src ?? ''}
            onCommit={(value) =>
              session.execute({
                type: 'setProp',
                nodeId: node.id,
                prop: 'src',
                value: value.trim() ? value : null,
              })
            }
          />
          <TextControl
            label="Alt"
            name="alt"
            value={node.alt ?? ''}
            onCommit={(value) =>
              session.execute({ type: 'setProp', nodeId: node.id, prop: 'alt', value })
            }
          />
        </>
      ) : null}
      {node.type !== 'instance' && node.attributes ? (
        <AttributeSections session={session} node={node} attributes={node.attributes} />
      ) : null}
      {node.type === 'instance' ? (
        <InstanceFields session={session} node={node} snap={snap} />
      ) : null}
      {showDefinitions ? <ComponentFields session={session} snap={snap} /> : null}
    </>
  );
}

function AttributeSections({
  session,
  node,
  attributes,
}: {
  session: EditorSession;
  node: Exclude<FlatNode, { type: 'instance' }>;
  attributes: Record<string, string>;
}) {
  const { main, preview } = partitionNodeAttributes(attributes);
  return (
    <>
      <NodeAttributeFields session={session} node={node} entries={main} />
      <PreviewOptionsDisclosure session={session} node={node} entries={preview} />
    </>
  );
}

function InstanceFields({
  session,
  node,
  snap,
}: {
  session: EditorSession;
  node: Extract<FlatNode, { type: 'instance' }>;
  snap: EditorSnapshot;
}) {
  const target = snap.componentTarget;
  if (!target) {
    return <p className="meta">Unknown component {node.component}.</p>;
  }
  return (
    <InstanceOverridesControl
      masterName={target.name}
      fields={target.fields}
      variants={target.variants}
      fieldOverrides={node.fields}
      variantOverrides={node.variants}
      onOpenMaster={() => session.openAsset(node.component, 'root')}
      onSetField={(field, value) =>
        session.execute({ type: 'setField', nodeId: node.id, field, value })
      }
      onSetVariant={(axis, value) =>
        session.execute({ type: 'setVariant', nodeId: node.id, axis, value })
      }
      onInvalid={(message) => session.setNotice(message, 'error')}
    />
  );
}
