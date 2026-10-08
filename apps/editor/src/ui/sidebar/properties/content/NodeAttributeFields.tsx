import type { FlatNode } from '@facadeur/core';
import type { EditorSession } from '../../../../domain/session';
import { attributeEnumOptions } from '../../../controls/html/index';
import { TextControl } from '../../../controls/fields/index';
import { Field, Select } from '../../../form/index';

export function NodeAttributeFields({
  session,
  node,
  entries,
}: {
  session: EditorSession;
  node: Extract<FlatNode, { type: 'frame' | 'text' | 'image' }>;
  entries: [string, string][];
}) {
  return entries.map(([key, value]) => {
    const enumOptions = attributeEnumOptions(key);
    if (enumOptions) {
      return (
        <Field key={key} label={key}>
          <Select
            name={`attr-${key}`}
            value={value}
            options={enumOptions.map((option) => ({ value: option, label: option }))}
            onCommit={(next) => commitAttribute(session, node, key, next)}
          />
        </Field>
      );
    }
    return (
      <TextControl
        key={key}
        label={key}
        name={`attr-${key}`}
        value={value}
        onCommit={(next) => commitAttribute(session, node, key, next)}
      />
    );
  });
}

function commitAttribute(
  session: EditorSession,
  node: Extract<FlatNode, { type: 'frame' | 'text' | 'image' }>,
  key: string,
  value: string,
) {
  const attributes = { ...(node.attributes ?? {}) };
  if (value === '') delete attributes[key];
  else attributes[key] = value;
  session.execute({
    type: 'setProp',
    nodeId: node.id,
    prop: 'attributes',
    value: Object.keys(attributes).length ? attributes : null,
  });
}
